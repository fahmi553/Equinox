import 'dotenv/config';
import bcrypt from 'bcryptjs';
import cors from 'cors';
import express from 'express';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import path from 'node:path';
import { mkdir, unlink } from 'node:fs/promises';
import { PrismaClient } from '@prisma/client';

const app = express();
const prisma = new PrismaClient();
const port = process.env.PORT || 3000;
const jwtSecret = process.env.JWT_SECRET || 'dev-only-secret';
const uploadDir = process.env.UPLOAD_DIR || 'storage/uploads';

await mkdir(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const userUploadDir = path.join(uploadDir, req.user.id);
    mkdir(userUploadDir, { recursive: true })
      .then(() => cb(null, userUploadDir))
      .catch((err) => cb(err));
  },
  filename: (_req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const uniquePart = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${uniquePart}-${safeName}`);
  }
});

const upload = multer({ storage });

app.use(cors({ origin: process.env.FRONTEND_URL || true }));
app.use(express.json());

function signToken(user) {
  return jwt.sign({ id: user.id, role: user.role }, jwtSecret, { expiresIn: '7d' });
}

function publicUser(user) {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    role: user.role,
    createdAt: user.createdAt
  };
}

async function logActivity(action, userId, metadata = undefined) {
  await prisma.activityLog.create({ data: { action, userId, metadata } });
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: 'Missing authorization token.' });
  }

  try {
    req.user = jwt.verify(token, jwtSecret);
    return next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token.' });
  }
}

function requireAdmin(req, res, next) {
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({ message: 'Admin access required.' });
  }

  return next();
}

function accessibleContentWhere(user) {
  if (user.role === 'ADMIN') {
    return {};
  }

  return {
    OR: [
      { ownerId: user.id },
      { isShared: true }
    ]
  };
}

function ownedContentWhere(user) {
  if (user.role === 'ADMIN') {
    return {};
  }

  return { ownerId: user.id };
}

async function getAccessibleFolder(folderId, user) {
  if (!folderId) {
    return null;
  }

  return prisma.folder.findFirst({
    where: {
      id: folderId,
      ...accessibleContentWhere(user)
    }
  });
}

async function getEditableFolder(folderId, user) {
  if (!folderId) {
    return null;
  }

  return prisma.folder.findFirst({
    where: {
      id: folderId,
      ...ownedContentWhere(user)
    }
  });
}

async function storageBreadcrumb(folder, user) {
  const breadcrumb = [];
  let current = folder;

  while (current) {
    breadcrumb.unshift({ id: current.id, name: current.name });
    current = current.parentId ? await getAccessibleFolder(current.parentId, user) : null;
  }

  return breadcrumb;
}

async function collectFolderIds(folderId) {
  const ids = [folderId];
  const children = await prisma.folder.findMany({
    where: { parentId: folderId },
    select: { id: true }
  });

  for (const child of children) {
    ids.push(...await collectFolderIds(child.id));
  }

  return ids;
}

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'equinox-api' });
});

app.post('/auth/register', async (req, res) => {
  const { username, password, displayName } = req.body;

  if (!username || !password || !displayName) {
    return res.status(400).json({ message: 'Username, password, and display name are required.' });
  }

  const userCount = await prisma.user.count();
  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: {
      username,
      displayName,
      passwordHash,
      role: userCount === 0 ? 'ADMIN' : 'FAMILY'
    }
  });

  await logActivity('user.registered', user.id, { username: user.username });
  res.status(201).json({ token: signToken(user), user: publicUser(user) });
});

app.post('/auth/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await prisma.user.findUnique({ where: { username } });

  if (!user || !(await bcrypt.compare(password || '', user.passwordHash))) {
    return res.status(401).json({ message: 'Invalid username or password.' });
  }

  await logActivity('user.login', user.id);
  res.json({ token: signToken(user), user: publicUser(user) });
});

app.get('/dashboard', requireAuth, async (req, res) => {
  const [notes, reminders, files, storageUsage, users, activity] = await Promise.all([
    prisma.note.count({ where: { ownerId: req.user.id } }),
    prisma.reminder.count({ where: { ownerId: req.user.id, isCompleted: false } }),
    prisma.fileAsset.count({ where: accessibleContentWhere(req.user) }),
    prisma.fileAsset.aggregate({
      where: accessibleContentWhere(req.user),
      _sum: { size: true }
    }),
    prisma.user.count(),
    prisma.activityLog.findMany({ orderBy: { createdAt: 'desc' }, take: 8, include: { user: true } })
  ]);

  res.json({
    totals: { notes, reminders, files, users, storageBytes: storageUsage._sum.size || 0 },
    activity: activity.map((item) => ({
      id: item.id,
      action: item.action,
      createdAt: item.createdAt,
      user: item.user ? publicUser(item.user) : null
    }))
  });
});

app.get('/users', requireAuth, requireAdmin, async (_req, res) => {
  const users = await prisma.user.findMany({ orderBy: { createdAt: 'desc' } });
  res.json(users.map(publicUser));
});

app.post('/users', requireAuth, requireAdmin, async (req, res) => {
  const { username, password, displayName, role = 'FAMILY' } = req.body;

  if (!username || !password || !displayName) {
    return res.status(400).json({ message: 'Username, password, and display name are required.' });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({ data: { username, displayName, passwordHash, role } });
  await logActivity('user.created', req.user.id, { createdUserId: user.id });
  res.status(201).json(publicUser(user));
});

app.get('/notes', requireAuth, async (req, res) => {
  const notes = await prisma.note.findMany({
    where: { ownerId: req.user.id },
    orderBy: { updatedAt: 'desc' }
  });
  res.json(notes);
});

app.post('/notes', requireAuth, async (req, res) => {
  const { title, body = '' } = req.body;

  if (!title) {
    return res.status(400).json({ message: 'Title is required.' });
  }

  const note = await prisma.note.create({ data: { title, body, ownerId: req.user.id } });
  await logActivity('note.created', req.user.id, { noteId: note.id });
  res.status(201).json(note);
});

app.get('/reminders', requireAuth, async (req, res) => {
  const reminders = await prisma.reminder.findMany({
    where: { ownerId: req.user.id },
    orderBy: [{ isCompleted: 'asc' }, { dueAt: 'asc' }]
  });
  res.json(reminders);
});

app.post('/reminders', requireAuth, async (req, res) => {
  const { title, dueAt } = req.body;

  if (!title) {
    return res.status(400).json({ message: 'Title is required.' });
  }

  const reminder = await prisma.reminder.create({
    data: { title, dueAt: dueAt ? new Date(dueAt) : null, ownerId: req.user.id }
  });
  await logActivity('reminder.created', req.user.id, { reminderId: reminder.id });
  res.status(201).json(reminder);
});

app.patch('/reminders/:id', requireAuth, async (req, res) => {
  const result = await prisma.reminder.updateMany({
    where: { id: req.params.id, ownerId: req.user.id },
    data: { isCompleted: Boolean(req.body.isCompleted) }
  });

  if (result.count === 0) {
    return res.status(404).json({ message: 'Reminder not found.' });
  }

  const reminder = await prisma.reminder.findFirst({
    where: { id: req.params.id, ownerId: req.user.id }
  });

  await logActivity('reminder.updated', req.user.id, { reminderId: reminder.id });
  res.json(reminder);
});

app.get('/files', requireAuth, async (req, res) => {
  const files = await prisma.fileAsset.findMany({
    where: {
      ...accessibleContentWhere(req.user),
      folderId: req.query.folderId || null
    },
    orderBy: { uploadedAt: 'desc' }
  });
  res.json(files);
});

app.get('/storage', requireAuth, async (req, res) => {
  const folderId = req.query.folderId || null;
  const folder = await getAccessibleFolder(folderId, req.user);

  if (folderId && !folder) {
    return res.status(404).json({ message: 'Folder not found.' });
  }

  const [folders, files] = await Promise.all([
    prisma.folder.findMany({
      where: {
        ...accessibleContentWhere(req.user),
        parentId: folderId
      },
      orderBy: { name: 'asc' },
      include: { owner: true }
    }),
    prisma.fileAsset.findMany({
      where: {
        ...accessibleContentWhere(req.user),
        folderId
      },
      orderBy: { uploadedAt: 'desc' },
      include: { owner: true }
    })
  ]);

  res.json({
    currentFolder: folder,
    breadcrumb: await storageBreadcrumb(folder, req.user),
    folders: folders.map((item) => ({ ...item, owner: publicUser(item.owner) })),
    files: files.map((item) => ({ ...item, owner: publicUser(item.owner) }))
  });
});

app.post('/folders', requireAuth, async (req, res) => {
  const { name, parentId = null, isShared = false } = req.body;
  const cleanName = String(name || '').trim();

  if (!cleanName) {
    return res.status(400).json({ message: 'Folder name is required.' });
  }

  if (parentId && !(await getEditableFolder(parentId, req.user))) {
    return res.status(404).json({ message: 'Parent folder not found.' });
  }

  const folder = await prisma.folder.create({
    data: {
      name: cleanName,
      isShared: Boolean(isShared),
      parentId,
      ownerId: req.user.id
    }
  });

  await logActivity('folder.created', req.user.id, { folderId: folder.id, name: folder.name });
  res.status(201).json(folder);
});

app.patch('/folders/:id', requireAuth, async (req, res) => {
  const folder = await getEditableFolder(req.params.id, req.user);

  if (!folder) {
    return res.status(404).json({ message: 'Folder not found.' });
  }

  const data = {};
  if (typeof req.body.name === 'string' && req.body.name.trim()) {
    data.name = req.body.name.trim();
  }
  if (typeof req.body.isShared === 'boolean') {
    data.isShared = req.body.isShared;
  }

  const updated = await prisma.folder.update({ where: { id: folder.id }, data });
  await logActivity('folder.updated', req.user.id, { folderId: updated.id });
  res.json(updated);
});

app.delete('/folders/:id', requireAuth, async (req, res) => {
  const folder = await getEditableFolder(req.params.id, req.user);

  if (!folder) {
    return res.status(404).json({ message: 'Folder not found.' });
  }

  const folderIds = await collectFolderIds(folder.id);
  const files = await prisma.fileAsset.findMany({
    where: {
      folderId: { in: folderIds },
      ...ownedContentWhere(req.user)
    }
  });

  await prisma.folder.delete({ where: { id: folder.id } });
  await Promise.all(files.map((file) => unlink(file.path).catch(() => undefined)));
  await logActivity('folder.deleted', req.user.id, { folderId: folder.id, name: folder.name });
  res.status(204).end();
});

app.post('/files', requireAuth, upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'A file upload is required.' });
  }

  const folderId = req.body.folderId || null;

  if (folderId && !(await getEditableFolder(folderId, req.user))) {
    await unlink(req.file.path).catch(() => undefined);
    return res.status(404).json({ message: 'Folder not found.' });
  }

  const asset = await prisma.fileAsset.create({
    data: {
      originalName: req.file.originalname,
      storedName: req.file.filename,
      mimeType: req.file.mimetype,
      size: req.file.size,
      path: req.file.path,
      isShared: req.body.isShared === 'true',
      folderId,
      ownerId: req.user.id
    }
  });
  await logActivity('file.uploaded', req.user.id, { fileId: asset.id });
  res.status(201).json(asset);
});

app.patch('/files/:id', requireAuth, async (req, res) => {
  const file = await prisma.fileAsset.findFirst({
    where: { id: req.params.id, ...ownedContentWhere(req.user) }
  });

  if (!file) {
    return res.status(404).json({ message: 'File not found.' });
  }

  const data = {};
  if (typeof req.body.isShared === 'boolean') {
    data.isShared = req.body.isShared;
  }
  if (Object.hasOwn(req.body, 'folderId')) {
    if (req.body.folderId && !(await getEditableFolder(req.body.folderId, req.user))) {
      return res.status(404).json({ message: 'Folder not found.' });
    }
    data.folderId = req.body.folderId || null;
  }

  const updated = await prisma.fileAsset.update({ where: { id: file.id }, data });
  await logActivity('file.updated', req.user.id, { fileId: updated.id });
  res.json(updated);
});

app.get('/files/:id/download', requireAuth, async (req, res) => {
  const file = await prisma.fileAsset.findFirst({
    where: { id: req.params.id, ...accessibleContentWhere(req.user) }
  });

  if (!file) {
    return res.status(404).json({ message: 'File not found.' });
  }

  await logActivity('file.downloaded', req.user.id, { fileId: file.id });
  res.download(path.resolve(file.path), file.originalName);
});

app.delete('/files/:id', requireAuth, async (req, res) => {
  const file = await prisma.fileAsset.findFirst({
    where: { id: req.params.id, ...ownedContentWhere(req.user) }
  });

  if (!file) {
    return res.status(404).json({ message: 'File not found.' });
  }

  await prisma.fileAsset.delete({ where: { id: file.id } });
  await unlink(file.path).catch(() => undefined);
  await logActivity('file.deleted', req.user.id, { fileId: file.id, name: file.originalName });
  res.status(204).end();
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ message: 'Something went wrong.' });
});

app.listen(port, () => {
  console.log(`Equinox API listening on http://localhost:${port}`);
});

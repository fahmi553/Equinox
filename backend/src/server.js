import 'dotenv/config';
import bcrypt from 'bcryptjs';
import cors from 'cors';
import express from 'express';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import path from 'node:path';
import { mkdir, stat, unlink } from 'node:fs/promises';
import { PrismaClient } from '@prisma/client';

const app = express();
const prisma = new PrismaClient();
const port = process.env.PORT || 3000;
const jwtSecret = process.env.JWT_SECRET || 'dev-only-secret';
const uploadDir = path.resolve(process.env.UPLOAD_DIR || 'storage/uploads');

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
const permissionKeys = [
  'canCreateNotes',
  'canCreateTasks',
  'canCreateTags',
  'canCreateBookmarks',
  'canViewAnnouncements'
];
const defaultPermissions = Object.fromEntries(permissionKeys.map((key) => [key, false]));
const rolePermissionSeeds = {
  ADMIN: Object.fromEntries(permissionKeys.map((key) => [key, true])),
  FAMILY: Object.fromEntries(permissionKeys.map((key) => [key, true])),
  GUEST: {
    canCreateNotes: false,
    canCreateTasks: false,
    canCreateTags: false,
    canCreateBookmarks: false,
    canViewAnnouncements: true
  },
  CHILD: {
    canCreateNotes: true,
    canCreateTasks: true,
    canCreateTags: false,
    canCreateBookmarks: true,
    canViewAnnouncements: true
  }
};
const roleNames = Object.keys(rolePermissionSeeds);
let rolePermissionDefaults = Object.fromEntries(roleNames.map((role) => [role, { ...rolePermissionSeeds[role] }]));

app.use(cors({ origin: process.env.FRONTEND_URL || true }));
app.use(express.json());

function signToken(user) {
  return jwt.sign({ id: user.id, role: user.role }, jwtSecret, { expiresIn: '7d' });
}

function permissionsFor(user) {
  const roleDefaults = rolePermissionDefaults[user.role] || defaultPermissions;
  return Object.fromEntries(permissionKeys.map((key) => [key, user[key] ?? roleDefaults[key] ?? false]));
}

function permissionOverridesFor(user) {
  return Object.fromEntries(permissionKeys.map((key) => [key, user[key] ?? null]));
}

function publicUser(user) {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    role: user.role,
    permissions: permissionsFor(user),
    permissionOverrides: permissionOverridesFor(user),
    rolePermissions: rolePermissionDefaults[user.role] || defaultPermissions,
    createdAt: user.createdAt
  };
}

function permissionData(source = {}) {
  const incoming = source.permissions && typeof source.permissions === 'object' ? source.permissions : source;
  return Object.fromEntries(
    permissionKeys
      .filter((key) => typeof incoming[key] === 'boolean' || incoming[key] === null)
      .map((key) => [key, incoming[key]])
  );
}

function rolePermissionData(source = {}) {
  return Object.fromEntries(
    permissionKeys
      .filter((key) => typeof source[key] === 'boolean')
      .map((key) => [key, source[key]])
  );
}

function normalizePermissions(source = {}) {
  return Object.fromEntries(permissionKeys.map((key) => [key, source[key] ?? false]));
}

async function loadRolePermissionDefaults() {
  const rows = await prisma.rolePermission.findMany();
  rolePermissionDefaults = {
    ...Object.fromEntries(roleNames.map((role) => [role, { ...rolePermissionSeeds[role] }])),
    ...Object.fromEntries(rows.map((row) => [row.role, normalizePermissions(row)]))
  };
}

async function ensureRolePermissions() {
  await Promise.all(roleNames.map((role) => prisma.rolePermission.upsert({
    where: { role },
    create: { role, ...rolePermissionSeeds[role] },
    update: {}
  })));
  await loadRolePermissionDefaults();
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

async function wouldRemoveLastAdmin(targetUser, nextRole) {
  if (targetUser.role !== 'ADMIN' || nextRole === 'ADMIN') {
    return false;
  }

  const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } });
  return adminCount <= 1;
}

function requireCapability(permission) {
  return async (req, res, next) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: Object.fromEntries(['id', 'role', ...permissionKeys].map((key) => [key, true]))
    });

    if (!user) {
      return res.status(401).json({ message: 'User not found.' });
    }

    if (permissionsFor(user)[permission]) {
      return next();
    }

    return res.status(403).json({ message: 'This account does not have permission for that action.' });
  };
}

function ownedContentWhere(user) {
  if (user.role === 'ADMIN') {
    return {};
  }

  return { ownerId: user.id };
}

function canEditContent(item, user) {
  return user.role === 'ADMIN' || item.ownerId === user.id;
}

async function sharedFolderTreeIds() {
  const sharedFolders = await prisma.folder.findMany({
    where: { isShared: true },
    select: { id: true }
  });
  const ids = new Set();

  for (const folder of sharedFolders) {
    const folderIds = await collectFolderIds(folder.id);
    folderIds.forEach((id) => ids.add(id));
  }

  return ids;
}

async function accessibleFolderWhere(user) {
  if (user.role === 'ADMIN') {
    return {};
  }

  const sharedIds = [...await sharedFolderTreeIds()];

  return {
    OR: [
      { ownerId: user.id },
      ...(sharedIds.length ? [{ id: { in: sharedIds } }] : [])
    ]
  };
}

async function accessibleFileWhere(user) {
  if (user.role === 'ADMIN') {
    return {};
  }

  const sharedIds = [...await sharedFolderTreeIds()];

  return {
    OR: [
      { ownerId: user.id },
      { isShared: true },
      ...(sharedIds.length ? [{ folderId: { in: sharedIds } }] : [])
    ]
  };
}

async function getAccessibleFolder(folderId, user) {
  if (!folderId) {
    return null;
  }

  return prisma.folder.findFirst({
    where: {
      id: folderId,
      ...await accessibleFolderWhere(user)
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

async function folderPath(folder) {
  if (!folder) {
    return 'Root';
  }

  const parts = [folder.name];
  let current = folder;

  while (current.parentId) {
    current = await prisma.folder.findUnique({ where: { id: current.parentId } });
    if (current) {
      parts.unshift(current.name);
    }
  }

  return parts.join(' / ');
}

function folderShareState(folder, sharedFolderIds) {
  if (folder.isShared) {
    return 'shared';
  }

  if (sharedFolderIds.has(folder.id)) {
    return 'inherited';
  }

  return 'private';
}

function fileShareState(file, sharedFolderIds) {
  if (file.isShared) {
    return 'shared';
  }

  if (file.folderId && sharedFolderIds.has(file.folderId)) {
    return 'inherited';
  }

  return 'private';
}

async function userStorageStats(userId) {
  const [files, storageUsage, folders] = await Promise.all([
    prisma.fileAsset.count({ where: { ownerId: userId } }),
    prisma.fileAsset.aggregate({
      where: { ownerId: userId },
      _sum: { size: true }
    }),
    prisma.folder.count({ where: { ownerId: userId } })
  ]);

  return {
    files,
    folders,
    storageBytes: storageUsage._sum.size || 0
  };
}

function accessibleNoteWhere(user) {
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

function accessibleReminderWhere(user) {
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

function accessibleTaskWhere(user) {
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

function accessibleTagWhere(user) {
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

function accessibleBookmarkWhere(user) {
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

async function editableTagConnections(tagIds, user) {
  if (!Array.isArray(tagIds)) {
    return undefined;
  }

  const tags = await prisma.tag.findMany({
    where: {
      id: { in: tagIds },
      ...ownedContentWhere(user)
    },
    select: { id: true }
  });

  return { set: tags.map((tag) => ({ id: tag.id })) };
}

function serializeTag(tag, user) {
  return {
    ...tag,
    canEdit: canEditContent(tag, user)
  };
}

function cleanUrl(value) {
  const url = String(value || '').trim();
  if (!url) return '';
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

function previewType(file) {
  const mimeType = file.mimeType || '';
  const extension = path.extname(file.originalName || '').toLowerCase();

  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType === 'application/pdf') return 'pdf';
  if (mimeType.startsWith('text/')) return 'text';
  if (['.csv', '.json', '.md', '.log', '.txt'].includes(extension)) return 'text';

  return null;
}

async function resolveStoredFilePath(file) {
  const candidates = [
    path.resolve(file.path),
    path.join(uploadDir, path.basename(path.dirname(file.path || '')), path.basename(file.path || ''))
  ];

  for (const candidate of [...new Set(candidates)]) {
    try {
      await stat(candidate);
      return candidate;
    } catch {
      // Try the next possible path. Older rows may contain paths from before the Docker volume was normalized.
    }
  }

  return null;
}

async function serializeDocumentRecord(record, user, sharedFolderIds) {
  return {
    ...record,
    canEdit: canEditContent(record, user),
    owner: publicUser(record.owner),
    file: record.file ? {
      ...record.file,
      canEdit: canEditContent(record.file, user),
      owner: publicUser(record.file.owner),
      folderPath: await folderPath(record.file.folder),
      shareState: fileShareState(record.file, sharedFolderIds)
    } : null
  };
}

function optionalAmount(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function activeAnnouncementWhere() {
  return {
    OR: [
      { expiresAt: null },
      { expiresAt: { gte: new Date() } }
    ]
  };
}

function serializeAnnouncement(item) {
  return {
    ...item,
    author: publicUser(item.author)
  };
}

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'equinox-api' });
});

app.get('/auth/status', async (_req, res) => {
  const userCount = await prisma.user.count();
  res.json({
    hasOwner: userCount > 0,
    setupRequired: userCount === 0,
    roles: roleNames
  });
});

app.get('/auth/me', requireAuth, async (req, res) => {
  const currentUser = await prisma.user.findUnique({ where: { id: req.user.id } });

  if (!currentUser) {
    return res.status(401).json({ message: 'User not found.' });
  }

  res.json({ user: publicUser(currentUser) });
});

app.post('/auth/setup', async (req, res) => {
  const { username, password, displayName } = req.body;
  const cleanUsername = String(username || '').trim();
  const cleanDisplayName = String(displayName || '').trim();

  if (!cleanUsername || !password || !cleanDisplayName) {
    return res.status(400).json({ message: 'Username, password, and display name are required.' });
  }

  if (String(password).length < 8) {
    return res.status(400).json({ message: 'Password must be at least 8 characters.' });
  }

  const userCount = await prisma.user.count();
  if (userCount > 0) {
    return res.status(409).json({ message: 'Equinox is already set up. Ask an admin to create your account.' });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  try {
    const user = await prisma.user.create({
      data: {
        username: cleanUsername,
        displayName: cleanDisplayName,
        passwordHash,
        role: 'ADMIN'
      }
    });

    await logActivity('auth.owner_setup', user.id, { username: user.username });
    res.status(201).json({ token: signToken(user), user: publicUser(user) });
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(409).json({ message: 'Username is already taken.' });
    }

    throw err;
  }
});

app.post('/auth/register', async (_req, res) => {
  const userCount = await prisma.user.count();

  if (userCount === 0) {
    return res.status(410).json({ message: 'Use first-run setup to create the owner account.' });
  }

  return res.status(403).json({ message: 'Public registration is disabled. Ask an admin to create your account.' });
});

app.post('/auth/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await prisma.user.findUnique({ where: { username: String(username || '').trim() } });

  if (!user || !(await bcrypt.compare(password || '', user.passwordHash))) {
    return res.status(401).json({ message: 'Invalid username or password.' });
  }

  await logActivity('user.login', user.id);
  res.json({ token: signToken(user), user: publicUser(user) });
});

app.post('/auth/change-password', requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword || String(newPassword).length < 8) {
    return res.status(400).json({ message: 'Current password and a new password of at least 8 characters are required.' });
  }

  const currentUser = await prisma.user.findUnique({ where: { id: req.user.id } });

  if (!currentUser || !(await bcrypt.compare(currentPassword, currentUser.passwordHash))) {
    return res.status(401).json({ message: 'Current password is incorrect.' });
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({ where: { id: currentUser.id }, data: { passwordHash } });
  await logActivity('auth.password_changed', currentUser.id);
  res.status(204).end();
});

app.get('/dashboard', requireAuth, async (req, res) => {
  const [profileUser, notes, tasks, bookmarks, users, activity] = await Promise.all([
    prisma.user.findUnique({ where: { id: req.user.id } }),
    prisma.note.count({ where: accessibleNoteWhere(req.user) }),
    prisma.task.count({ where: { ...accessibleTaskWhere(req.user), status: { not: 'DONE' } } }),
    prisma.bookmark.count({ where: accessibleBookmarkWhere(req.user) }),
    prisma.user.count(),
    prisma.activityLog.findMany({ orderBy: { createdAt: 'desc' }, take: 8, include: { user: true } })
  ]);

  res.json({
    user: profileUser ? publicUser(profileUser) : null,
    totals: { notes, tasks, bookmarks, users },
    activity: activity.map((item) => ({
      id: item.id,
      action: item.action,
      createdAt: item.createdAt,
      user: item.user ? publicUser(item.user) : null
    }))
  });
});

app.get('/profile', requireAuth, async (req, res) => {
  const [profileUser, notes, sharedNotes, tasks, sharedTasks, bookmarks, sharedBookmarks] = await Promise.all([
    prisma.user.findUnique({ where: { id: req.user.id } }),
    prisma.note.count({ where: { ownerId: req.user.id } }),
    prisma.note.count({
      where: {
        ...accessibleNoteWhere(req.user),
        ownerId: { not: req.user.id }
      }
    }),
    prisma.task.count({ where: { ownerId: req.user.id, status: { not: 'DONE' } } }),
    prisma.task.count({
      where: {
        ...accessibleTaskWhere(req.user),
        ownerId: { not: req.user.id },
        status: { not: 'DONE' }
      }
    }),
    prisma.bookmark.count({ where: { ownerId: req.user.id } }),
    prisma.bookmark.count({
      where: {
        ...accessibleBookmarkWhere(req.user),
        ownerId: { not: req.user.id }
      }
    })
  ]);

  if (!profileUser) {
    return res.status(404).json({ message: 'User not found.' });
  }

  res.json({
    user: publicUser(profileUser),
    own: {
      notes,
      sharedNotes,
      activeTasks: tasks,
      sharedTasks,
      bookmarks,
      sharedBookmarks
    },
    visible: {
      sharedTotal: sharedNotes + sharedTasks + sharedBookmarks
    }
  });
});

app.patch('/profile', requireAuth, async (req, res) => {
  const currentUser = await prisma.user.findUnique({ where: { id: req.user.id } });

  if (!currentUser) {
    return res.status(401).json({ message: 'User not found.' });
  }

  const data = {};
  if (typeof req.body.displayName === 'string' && req.body.displayName.trim()) {
    data.displayName = req.body.displayName.trim();
  }
  if (typeof req.body.username === 'string' && req.body.username.trim()) {
    data.username = req.body.username.trim();
  }

  if (!Object.keys(data).length) {
    return res.status(400).json({ message: 'Display name or username is required.' });
  }

  try {
    const updated = await prisma.user.update({ where: { id: currentUser.id }, data });
    await logActivity('user.profile_updated', currentUser.id);
    res.json({ user: publicUser(updated) });
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(409).json({ message: 'Username is already taken.' });
    }

    throw err;
  }
});

app.get('/users', requireAuth, requireAdmin, async (_req, res) => {
  const users = await prisma.user.findMany({ orderBy: { createdAt: 'desc' } });
  res.json(users.map(publicUser));
});

app.get('/roles/permissions', requireAuth, requireAdmin, async (_req, res) => {
  res.json(roleNames.map((role) => ({
    role,
    permissions: rolePermissionDefaults[role] || defaultPermissions
  })));
});

app.patch('/roles/:role/permissions', requireAuth, requireAdmin, async (req, res) => {
  const role = String(req.params.role || '').toUpperCase();

  if (!roleNames.includes(role)) {
    return res.status(404).json({ message: 'Role not found.' });
  }

  const data = rolePermissionData(req.body);
  if (!Object.keys(data).length) {
    return res.status(400).json({ message: 'At least one permission value is required.' });
  }

  const updated = await prisma.rolePermission.update({ where: { role }, data });
  await loadRolePermissionDefaults();
  await logActivity('role.permissions_updated', req.user.id, { role });
  res.json({ role: updated.role, permissions: rolePermissionDefaults[updated.role] });
});

app.get('/announcements', requireAuth, async (req, res) => {
  const viewer = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: Object.fromEntries(['id', 'role', ...permissionKeys].map((key) => [key, true]))
  });

  if (!viewer || !permissionsFor(viewer).canViewAnnouncements) {
    return res.status(403).json({ message: 'This account cannot view family announcements.' });
  }

  const includeExpired = req.user.role === 'ADMIN' && req.query.includeExpired === 'true';
  const announcements = await prisma.announcement.findMany({
    where: includeExpired ? {} : activeAnnouncementWhere(),
    orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
    include: { author: true }
  });

  res.json(announcements.map(serializeAnnouncement));
});

app.post('/announcements', requireAuth, requireAdmin, async (req, res) => {
  const { title, body = '', isPinned = false, expiresAt = null } = req.body;
  const cleanTitle = String(title || '').trim();
  const cleanBody = String(body || '').trim();

  if (!cleanTitle || !cleanBody) {
    return res.status(400).json({ message: 'Title and message are required.' });
  }

  const announcement = await prisma.announcement.create({
    data: {
      title: cleanTitle,
      body: cleanBody,
      isPinned: Boolean(isPinned),
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      authorId: req.user.id
    }
  });

  await logActivity('announcement.created', req.user.id, { announcementId: announcement.id, title: announcement.title });
  res.status(201).json(announcement);
});

app.patch('/announcements/:id', requireAuth, requireAdmin, async (req, res) => {
  const announcement = await prisma.announcement.findUnique({ where: { id: req.params.id } });

  if (!announcement) {
    return res.status(404).json({ message: 'Announcement not found.' });
  }

  const data = {};
  if (typeof req.body.title === 'string' && req.body.title.trim()) {
    data.title = req.body.title.trim();
  }
  if (typeof req.body.body === 'string' && req.body.body.trim()) {
    data.body = req.body.body.trim();
  }
  if (typeof req.body.isPinned === 'boolean') {
    data.isPinned = req.body.isPinned;
  }
  if (Object.hasOwn(req.body, 'expiresAt')) {
    data.expiresAt = req.body.expiresAt ? new Date(req.body.expiresAt) : null;
  }

  const updated = await prisma.announcement.update({ where: { id: announcement.id }, data });
  await logActivity('announcement.updated', req.user.id, { announcementId: updated.id, title: updated.title });
  res.json(updated);
});

app.delete('/announcements/:id', requireAuth, requireAdmin, async (req, res) => {
  const announcement = await prisma.announcement.findUnique({ where: { id: req.params.id } });

  if (!announcement) {
    return res.status(404).json({ message: 'Announcement not found.' });
  }

  await prisma.announcement.delete({ where: { id: announcement.id } });
  await logActivity('announcement.deleted', req.user.id, { announcementId: announcement.id, title: announcement.title });
  res.status(204).end();
});

app.post('/users', requireAuth, requireAdmin, async (req, res) => {
  const { username, password, displayName, role = 'FAMILY' } = req.body;
  const cleanUsername = String(username || '').trim();
  const cleanDisplayName = String(displayName || '').trim();
  const cleanRole = String(role || 'FAMILY').toUpperCase();

  if (!cleanUsername || !password || !cleanDisplayName) {
    return res.status(400).json({ message: 'Username, password, and display name are required.' });
  }

  if (String(password).length < 8) {
    return res.status(400).json({ message: 'Temporary password must be at least 8 characters.' });
  }

  if (!roleNames.includes(cleanRole)) {
    return res.status(400).json({ message: `Role must be one of: ${roleNames.join(', ')}.` });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  try {
    const user = await prisma.user.create({
      data: {
        username: cleanUsername,
        displayName: cleanDisplayName,
        passwordHash,
        role: cleanRole,
        ...permissionData(req.body)
      }
    });
    await logActivity('user.created', req.user.id, { createdUserId: user.id });
    res.status(201).json(publicUser(user));
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(409).json({ message: 'Username is already taken.' });
    }

    throw err;
  }
});

app.patch('/users/:id', requireAuth, requireAdmin, async (req, res) => {
  const target = await prisma.user.findUnique({ where: { id: req.params.id } });

  if (!target) {
    return res.status(404).json({ message: 'User not found.' });
  }

  const data = {};
  if (typeof req.body.displayName === 'string' && req.body.displayName.trim()) {
    data.displayName = req.body.displayName.trim();
  }
  if (typeof req.body.username === 'string' && req.body.username.trim()) {
    data.username = req.body.username.trim();
  }
  if (typeof req.body.role === 'string') {
    const role = req.body.role.toUpperCase();
    if (!roleNames.includes(role)) {
      return res.status(400).json({ message: `Role must be one of: ${roleNames.join(', ')}.` });
    }
    if (target.id === req.user.id && role !== 'ADMIN') {
      return res.status(400).json({ message: 'You cannot remove your own admin role.' });
    }
    if (await wouldRemoveLastAdmin(target, role)) {
      return res.status(400).json({ message: 'At least one admin account is required.' });
    }
    data.role = role;
  }

  if (!Object.keys(data).length) {
    return res.status(400).json({ message: 'Nothing to update.' });
  }

  try {
    const updated = await prisma.user.update({ where: { id: target.id }, data });
    await logActivity('user.updated', req.user.id, { updatedUserId: updated.id });
    res.json(publicUser(updated));
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(409).json({ message: 'Username is already taken.' });
    }

    throw err;
  }
});

app.post('/users/:id/password', requireAuth, requireAdmin, async (req, res) => {
  const { password } = req.body;

  if (!password || String(password).length < 8) {
    return res.status(400).json({ message: 'Temporary password must be at least 8 characters.' });
  }

  const target = await prisma.user.findUnique({ where: { id: req.params.id } });

  if (!target) {
    return res.status(404).json({ message: 'User not found.' });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.update({ where: { id: target.id }, data: { passwordHash } });
  await logActivity('user.password_reset', req.user.id, { updatedUserId: target.id });
  res.status(204).end();
});

app.patch('/users/:id/permissions', requireAuth, requireAdmin, async (req, res) => {
  const target = await prisma.user.findUnique({ where: { id: req.params.id } });

  if (!target) {
    return res.status(404).json({ message: 'User not found.' });
  }

  const data = permissionData(req.body);
  if (!Object.keys(data).length) {
    return res.status(400).json({ message: 'At least one permission value is required.' });
  }

  const updated = await prisma.user.update({ where: { id: target.id }, data });
  await logActivity('user.permissions_updated', req.user.id, { updatedUserId: updated.id });
  res.json(publicUser(updated));
});

app.get('/tags', requireAuth, async (req, res) => {
  const tags = await prisma.tag.findMany({
    where: accessibleTagWhere(req.user),
    orderBy: { name: 'asc' },
    include: { owner: true }
  });

  res.json(tags.map((tag) => ({
    ...serializeTag(tag, req.user),
    owner: publicUser(tag.owner)
  })));
});

app.post('/tags', requireAuth, requireCapability('canCreateTags'), async (req, res) => {
  const name = String(req.body.name || '').trim();
  const color = String(req.body.color || '#7c3aed').trim() || '#7c3aed';

  if (!name) {
    return res.status(400).json({ message: 'Tag name is required.' });
  }

  try {
    const tag = await prisma.tag.create({
      data: {
        name,
        color,
        isShared: Boolean(req.body.isShared),
        ownerId: req.user.id
      }
    });
    await logActivity('tag.created', req.user.id, { tagId: tag.id, name: tag.name });
    res.status(201).json(serializeTag(tag, req.user));
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(409).json({ message: 'A tag with that name already exists.' });
    }

    throw err;
  }
});

app.patch('/tags/:id', requireAuth, async (req, res) => {
  const tag = await prisma.tag.findFirst({
    where: { id: req.params.id, ...ownedContentWhere(req.user) }
  });

  if (!tag) {
    return res.status(404).json({ message: 'Tag not found.' });
  }

  const data = {};
  if (typeof req.body.name === 'string' && req.body.name.trim()) {
    data.name = req.body.name.trim();
  }
  if (typeof req.body.color === 'string' && req.body.color.trim()) {
    data.color = req.body.color.trim();
  }
  if (typeof req.body.isShared === 'boolean') {
    data.isShared = req.body.isShared;
  }

  const updated = await prisma.tag.update({ where: { id: tag.id }, data });
  await logActivity('tag.updated', req.user.id, { tagId: updated.id, name: updated.name });
  res.json(serializeTag(updated, req.user));
});

app.delete('/tags/:id', requireAuth, async (req, res) => {
  const tag = await prisma.tag.findFirst({
    where: { id: req.params.id, ...ownedContentWhere(req.user) }
  });

  if (!tag) {
    return res.status(404).json({ message: 'Tag not found.' });
  }

  await prisma.tag.delete({ where: { id: tag.id } });
  await logActivity('tag.deleted', req.user.id, { tagId: tag.id, name: tag.name });
  res.status(204).end();
});

app.get('/bookmarks', requireAuth, async (req, res) => {
  const bookmarks = await prisma.bookmark.findMany({
    where: accessibleBookmarkWhere(req.user),
    orderBy: { updatedAt: 'desc' },
    include: { owner: true, tags: true }
  });

  res.json(bookmarks.map((item) => ({
    ...item,
    canEdit: canEditContent(item, req.user),
    owner: publicUser(item.owner)
  })));
});

app.post('/bookmarks', requireAuth, requireCapability('canCreateBookmarks'), async (req, res) => {
  const title = String(req.body.title || '').trim();
  const url = cleanUrl(req.body.url);

  if (!title || !url) {
    return res.status(400).json({ message: 'Title and URL are required.' });
  }

  const bookmark = await prisma.bookmark.create({
    data: {
      title,
      url,
      notes: String(req.body.notes || ''),
      isShared: Boolean(req.body.isShared),
      ownerId: req.user.id,
      tags: await editableTagConnections(req.body.tagIds, req.user)
    }
  });
  await logActivity('bookmark.created', req.user.id, { bookmarkId: bookmark.id, title: bookmark.title });
  res.status(201).json(bookmark);
});

app.patch('/bookmarks/:id', requireAuth, async (req, res) => {
  const bookmark = await prisma.bookmark.findFirst({
    where: { id: req.params.id, ...ownedContentWhere(req.user) }
  });

  if (!bookmark) {
    return res.status(404).json({ message: 'Bookmark not found.' });
  }

  const data = {};
  if (typeof req.body.title === 'string' && req.body.title.trim()) {
    data.title = req.body.title.trim();
  }
  if (Object.hasOwn(req.body, 'url')) {
    const url = cleanUrl(req.body.url);
    if (!url) {
      return res.status(400).json({ message: 'URL is required.' });
    }
    data.url = url;
  }
  if (typeof req.body.notes === 'string') {
    data.notes = req.body.notes;
  }
  if (typeof req.body.isShared === 'boolean') {
    data.isShared = req.body.isShared;
  }
  const tags = await editableTagConnections(req.body.tagIds, req.user);
  if (tags) {
    data.tags = tags;
  }

  const updated = await prisma.bookmark.update({ where: { id: bookmark.id }, data });
  await logActivity('bookmark.updated', req.user.id, { bookmarkId: updated.id, title: updated.title });
  res.json(updated);
});

app.delete('/bookmarks/:id', requireAuth, async (req, res) => {
  const bookmark = await prisma.bookmark.findFirst({
    where: { id: req.params.id, ...ownedContentWhere(req.user) }
  });

  if (!bookmark) {
    return res.status(404).json({ message: 'Bookmark not found.' });
  }

  await prisma.bookmark.delete({ where: { id: bookmark.id } });
  await logActivity('bookmark.deleted', req.user.id, { bookmarkId: bookmark.id, title: bookmark.title });
  res.status(204).end();
});

app.get('/search', requireAuth, async (req, res) => {
  const query = String(req.query.q || '').trim();

  if (!query) {
    return res.json({ query, notes: [], tasks: [], bookmarks: [] });
  }

  const noteMatch = {
    OR: [
      { title: { contains: query, mode: 'insensitive' } },
      { body: { contains: query, mode: 'insensitive' } },
      { tags: { some: { name: { contains: query, mode: 'insensitive' } } } }
    ]
  };
  const taskMatch = {
    OR: [
      { title: { contains: query, mode: 'insensitive' } },
      { details: { contains: query, mode: 'insensitive' } },
      { priority: { contains: query, mode: 'insensitive' } },
      { status: { contains: query, mode: 'insensitive' } },
      { tags: { some: { name: { contains: query, mode: 'insensitive' } } } }
    ]
  };
  const bookmarkMatch = {
    OR: [
      { title: { contains: query, mode: 'insensitive' } },
      { url: { contains: query, mode: 'insensitive' } },
      { notes: { contains: query, mode: 'insensitive' } },
      { tags: { some: { name: { contains: query, mode: 'insensitive' } } } }
    ]
  };

  const [notes, tasks, bookmarks] = await Promise.all([
    prisma.note.findMany({
      where: { AND: [accessibleNoteWhere(req.user), noteMatch] },
      orderBy: { updatedAt: 'desc' },
      take: 12,
      include: { owner: true, tags: true }
    }),
    prisma.task.findMany({
      where: { AND: [accessibleTaskWhere(req.user), taskMatch] },
      orderBy: [{ status: 'asc' }, { dueAt: 'asc' }],
      take: 12,
      include: { owner: true, tags: true }
    }),
    prisma.bookmark.findMany({
      where: { AND: [accessibleBookmarkWhere(req.user), bookmarkMatch] },
      orderBy: { updatedAt: 'desc' },
      take: 12,
      include: { owner: true, tags: true }
    })
  ]);

  res.json({
    query,
    notes: notes.map((item) => ({
      ...item,
      canEdit: canEditContent(item, req.user),
      owner: publicUser(item.owner)
    })),
    tasks: tasks.map((item) => ({
      ...item,
      canEdit: canEditContent(item, req.user),
      owner: publicUser(item.owner)
    })),
    bookmarks: bookmarks.map((item) => ({
      ...item,
      canEdit: canEditContent(item, req.user),
      owner: publicUser(item.owner)
    }))
  });
});

app.use(['/reminders', '/files', '/storage', '/folders', '/documents', '/document-records'], requireAuth, (_req, res) => {
  res.status(410).json({ message: 'This legacy Equinox 1.x feature is disabled in Equinox 2.0.' });
});

app.get('/notes', requireAuth, async (req, res) => {
  const notes = await prisma.note.findMany({
    where: accessibleNoteWhere(req.user),
    orderBy: { updatedAt: 'desc' },
    include: { owner: true, tags: true }
  });
  res.json(notes.map((item) => ({
    ...item,
    canEdit: canEditContent(item, req.user),
    owner: publicUser(item.owner)
  })));
});

app.post('/notes', requireAuth, requireCapability('canCreateNotes'), async (req, res) => {
  const { title, body = '', isShared = false } = req.body;

  if (!title) {
    return res.status(400).json({ message: 'Title is required.' });
  }

  const note = await prisma.note.create({
    data: {
      title,
      body,
      isShared: Boolean(isShared),
      ownerId: req.user.id,
      tags: await editableTagConnections(req.body.tagIds, req.user)
    }
  });
  await logActivity('note.created', req.user.id, { noteId: note.id });
  res.status(201).json(note);
});

app.patch('/notes/:id', requireAuth, async (req, res) => {
  const note = await prisma.note.findFirst({
    where: { id: req.params.id, ...ownedContentWhere(req.user) }
  });

  if (!note) {
    return res.status(404).json({ message: 'Note not found.' });
  }

  const data = {};
  if (typeof req.body.title === 'string' && req.body.title.trim()) {
    data.title = req.body.title.trim();
  }
  if (typeof req.body.body === 'string') {
    data.body = req.body.body;
  }
  if (typeof req.body.isShared === 'boolean') {
    data.isShared = req.body.isShared;
  }
  const tags = await editableTagConnections(req.body.tagIds, req.user);
  if (tags) {
    data.tags = tags;
  }

  const updated = await prisma.note.update({ where: { id: note.id }, data });
  await logActivity('note.updated', req.user.id, { noteId: updated.id, title: updated.title });
  res.json(updated);
});

app.delete('/notes/:id', requireAuth, async (req, res) => {
  const note = await prisma.note.findFirst({
    where: { id: req.params.id, ...ownedContentWhere(req.user) }
  });

  if (!note) {
    return res.status(404).json({ message: 'Note not found.' });
  }

  await prisma.note.delete({ where: { id: note.id } });
  await logActivity('note.deleted', req.user.id, { noteId: note.id, title: note.title });
  res.status(204).end();
});

app.get('/reminders', requireAuth, async (req, res) => {
  const reminders = await prisma.reminder.findMany({
    where: accessibleReminderWhere(req.user),
    orderBy: [{ isCompleted: 'asc' }, { dueAt: 'asc' }, { createdAt: 'desc' }],
    include: { owner: true }
  });
  res.json(reminders.map((item) => ({
    ...item,
    canEdit: canEditContent(item, req.user),
    owner: publicUser(item.owner)
  })));
});

app.post('/reminders', requireAuth, requireCapability('canCreateReminders'), async (req, res) => {
  const { title, dueAt, isShared = false } = req.body;

  if (!title) {
    return res.status(400).json({ message: 'Title is required.' });
  }

  const reminder = await prisma.reminder.create({
    data: {
      title,
      dueAt: dueAt ? new Date(dueAt) : null,
      isShared: Boolean(isShared),
      ownerId: req.user.id
    }
  });
  await logActivity('reminder.created', req.user.id, { reminderId: reminder.id });
  res.status(201).json(reminder);
});

app.patch('/reminders/:id', requireAuth, async (req, res) => {
  const reminder = await prisma.reminder.findFirst({
    where: { id: req.params.id, ...ownedContentWhere(req.user) }
  });

  if (!reminder) {
    return res.status(404).json({ message: 'Reminder not found.' });
  }

  const data = {};
  if (typeof req.body.title === 'string' && req.body.title.trim()) {
    data.title = req.body.title.trim();
  }
  if (Object.hasOwn(req.body, 'dueAt')) {
    data.dueAt = req.body.dueAt ? new Date(req.body.dueAt) : null;
  }
  if (typeof req.body.isCompleted === 'boolean') {
    data.isCompleted = req.body.isCompleted;
  }
  if (typeof req.body.isShared === 'boolean') {
    data.isShared = req.body.isShared;
  }

  const updated = await prisma.reminder.update({ where: { id: reminder.id }, data });
  await logActivity('reminder.updated', req.user.id, { reminderId: updated.id, title: updated.title });
  res.json(updated);
});

app.delete('/reminders/:id', requireAuth, async (req, res) => {
  const reminder = await prisma.reminder.findFirst({
    where: { id: req.params.id, ...ownedContentWhere(req.user) }
  });

  if (!reminder) {
    return res.status(404).json({ message: 'Reminder not found.' });
  }

  await prisma.reminder.delete({ where: { id: reminder.id } });
  await logActivity('reminder.deleted', req.user.id, { reminderId: reminder.id, title: reminder.title });
  res.status(204).end();
});

app.get('/tasks', requireAuth, async (req, res) => {
  const tasks = await prisma.task.findMany({
    where: accessibleTaskWhere(req.user),
    orderBy: [{ status: 'asc' }, { dueAt: 'asc' }, { updatedAt: 'desc' }],
    include: { owner: true, tags: true }
  });
  res.json(tasks.map((item) => ({
    ...item,
    canEdit: canEditContent(item, req.user),
    owner: publicUser(item.owner)
  })));
});

app.post('/tasks', requireAuth, requireCapability('canCreateTasks'), async (req, res) => {
  const { title, details = '', priority = 'NORMAL', status = 'OPEN', dueAt = null, isShared = false } = req.body;
  const cleanTitle = String(title || '').trim();

  if (!cleanTitle) {
    return res.status(400).json({ message: 'Title is required.' });
  }

  const task = await prisma.task.create({
    data: {
      title: cleanTitle,
      details: String(details || ''),
      priority: String(priority || 'NORMAL').trim() || 'NORMAL',
      status: String(status || 'OPEN').trim() || 'OPEN',
      dueAt: dueAt ? new Date(dueAt) : null,
      isShared: Boolean(isShared),
      ownerId: req.user.id,
      tags: await editableTagConnections(req.body.tagIds, req.user)
    }
  });
  await logActivity('task.created', req.user.id, { taskId: task.id, title: task.title });
  res.status(201).json(task);
});

app.patch('/tasks/:id', requireAuth, async (req, res) => {
  const task = await prisma.task.findFirst({
    where: { id: req.params.id, ...ownedContentWhere(req.user) }
  });

  if (!task) {
    return res.status(404).json({ message: 'Task not found.' });
  }

  const data = {};
  if (typeof req.body.title === 'string' && req.body.title.trim()) {
    data.title = req.body.title.trim();
  }
  if (typeof req.body.details === 'string') {
    data.details = req.body.details;
  }
  if (typeof req.body.priority === 'string') {
    data.priority = req.body.priority.trim() || 'NORMAL';
  }
  if (typeof req.body.status === 'string') {
    data.status = req.body.status.trim() || 'OPEN';
  }
  if (Object.hasOwn(req.body, 'dueAt')) {
    data.dueAt = req.body.dueAt ? new Date(req.body.dueAt) : null;
  }
  if (typeof req.body.isShared === 'boolean') {
    data.isShared = req.body.isShared;
  }
  const tags = await editableTagConnections(req.body.tagIds, req.user);
  if (tags) {
    data.tags = tags;
  }

  const updated = await prisma.task.update({ where: { id: task.id }, data });
  await logActivity('task.updated', req.user.id, { taskId: updated.id, title: updated.title });
  res.json(updated);
});

app.delete('/tasks/:id', requireAuth, async (req, res) => {
  const task = await prisma.task.findFirst({
    where: { id: req.params.id, ...ownedContentWhere(req.user) }
  });

  if (!task) {
    return res.status(404).json({ message: 'Task not found.' });
  }

  await prisma.task.delete({ where: { id: task.id } });
  await logActivity('task.deleted', req.user.id, { taskId: task.id, title: task.title });
  res.status(204).end();
});

app.get('/files', requireAuth, async (req, res) => {
  const files = await prisma.fileAsset.findMany({
    where: {
      ...await accessibleFileWhere(req.user),
      folderId: req.query.folderId || null
    },
    orderBy: { uploadedAt: 'desc' },
    include: { tags: true }
  });
  res.json(files);
});

app.get('/storage', requireAuth, async (req, res) => {
  const folderId = req.query.folderId || null;
  const search = String(req.query.q || '').trim();
  const folder = await getAccessibleFolder(folderId, req.user);
  const [folderWhere, fileWhere, inheritedSharedFolderIds] = await Promise.all([
    accessibleFolderWhere(req.user),
    accessibleFileWhere(req.user),
    sharedFolderTreeIds()
  ]);

  if (folderId && !folder && !search) {
    return res.status(404).json({ message: 'Folder not found.' });
  }

  const [folders, files, storageUsage, allFiles, allFolders] = await Promise.all([
    prisma.folder.findMany({
      where: {
        ...folderWhere,
        ...(search
          ? { name: { contains: search, mode: 'insensitive' } }
          : { parentId: folderId })
      },
      orderBy: { name: 'asc' },
      include: { owner: true }
    }),
    prisma.fileAsset.findMany({
      where: {
        ...fileWhere,
        ...(search
          ? { originalName: { contains: search, mode: 'insensitive' } }
          : { folderId })
      },
      orderBy: { uploadedAt: 'desc' },
      include: { owner: true, folder: true, tags: true }
    }),
    prisma.fileAsset.aggregate({
      where: fileWhere,
      _sum: { size: true },
      _count: { id: true }
    }),
    prisma.fileAsset.findMany({
      where: fileWhere,
      select: { folderId: true, isShared: true, isImportant: true, ownerId: true, size: true }
    }),
    prisma.folder.count({ where: folderWhere })
  ]);

  res.json({
    currentFolder: search || !folder ? null : {
      ...folder,
      canEdit: canEditContent(folder, req.user),
      shareState: folderShareState(folder, inheritedSharedFolderIds)
    },
    breadcrumb: search ? [] : await storageBreadcrumb(folder, req.user),
    summary: {
      folders: allFolders,
      files: storageUsage._count.id,
      storageBytes: storageUsage._sum.size || 0,
      sharedFiles: allFiles.filter((item) => fileShareState(item, inheritedSharedFolderIds) !== 'private').length,
      privateFiles: allFiles.filter((item) => fileShareState(item, inheritedSharedFolderIds) === 'private').length,
      importantFiles: allFiles.filter((item) => item.isImportant).length,
      owners: Object.values(allFiles.reduce((owners, item) => {
        owners[item.ownerId] ||= { ownerId: item.ownerId, files: 0, storageBytes: 0 };
        owners[item.ownerId].files += 1;
        owners[item.ownerId].storageBytes += item.size;
        return owners;
      }, {}))
    },
    folders: folders.map((item) => ({
      ...item,
      canEdit: canEditContent(item, req.user),
      owner: publicUser(item.owner),
      shareState: folderShareState(item, inheritedSharedFolderIds)
    })),
    files: await Promise.all(files.map(async (item) => ({
      ...item,
      canEdit: canEditContent(item, req.user),
      owner: publicUser(item.owner),
      folderPath: await folderPath(item.folder),
      shareState: fileShareState(item, inheritedSharedFolderIds)
    })))
  });
});

app.get('/folders', requireAuth, async (req, res) => {
  const folders = await prisma.folder.findMany({
    where: ownedContentWhere(req.user),
    orderBy: { name: 'asc' },
    include: { owner: true, parent: true }
  });

  res.json(await Promise.all(folders.map(async (item) => ({
    ...item,
    owner: publicUser(item.owner),
    path: await folderPath(item)
  }))));
});

app.get('/documents', requireAuth, async (req, res) => {
  const [fileWhere, inheritedSharedFolderIds] = await Promise.all([
    accessibleFileWhere(req.user),
    sharedFolderTreeIds()
  ]);

  const documents = await prisma.fileAsset.findMany({
    where: {
      ...fileWhere,
      isImportant: true
    },
    orderBy: { uploadedAt: 'desc' },
    include: { owner: true, folder: true, tags: true }
  });

  res.json(await Promise.all(documents.map(async (item) => ({
    ...item,
    canEdit: canEditContent(item, req.user),
    owner: publicUser(item.owner),
    folderPath: await folderPath(item.folder),
    shareState: fileShareState(item, inheritedSharedFolderIds)
  }))));
});

app.get('/document-records', requireAuth, async (req, res) => {
  const sharedFolderIds = await sharedFolderTreeIds();
  const records = await prisma.documentRecord.findMany({
    where: ownedContentWhere(req.user),
    orderBy: [{ status: 'asc' }, { dueAt: 'asc' }, { createdAt: 'desc' }],
    include: { owner: true, file: { include: { owner: true, folder: true, tags: true } } }
  });

  res.json(await Promise.all(records.map((record) => serializeDocumentRecord(record, req.user, sharedFolderIds))));
});

app.post('/document-records', requireAuth, requireCapability('canCreateDocumentRecords'), async (req, res) => {
  const { title, category = 'GENERAL', status = 'OPEN', amount = null, notes = '', dueAt = null, fileId = null } = req.body;
  const cleanTitle = String(title || '').trim();

  if (!cleanTitle) {
    return res.status(400).json({ message: 'Title is required.' });
  }

  if (fileId) {
    const file = await prisma.fileAsset.findFirst({
      where: { id: fileId, ...await accessibleFileWhere(req.user) }
    });

    if (!file) {
      return res.status(404).json({ message: 'Linked file not found.' });
    }
  }

  const record = await prisma.documentRecord.create({
    data: {
      title: cleanTitle,
      category: String(category || 'GENERAL').trim() || 'GENERAL',
      status: String(status || 'OPEN').trim() || 'OPEN',
      amount: optionalAmount(amount),
      notes: String(notes || ''),
      dueAt: dueAt ? new Date(dueAt) : null,
      fileId: fileId || null,
      ownerId: req.user.id
    }
  });

  await logActivity('document_record.created', req.user.id, { recordId: record.id, title: record.title });
  res.status(201).json(record);
});

app.patch('/document-records/:id', requireAuth, async (req, res) => {
  const record = await prisma.documentRecord.findFirst({
    where: { id: req.params.id, ...ownedContentWhere(req.user) }
  });

  if (!record) {
    return res.status(404).json({ message: 'Document tracker item not found.' });
  }

  const data = {};
  if (typeof req.body.title === 'string' && req.body.title.trim()) {
    data.title = req.body.title.trim();
  }
  if (typeof req.body.category === 'string') {
    data.category = req.body.category.trim() || 'GENERAL';
  }
  if (typeof req.body.status === 'string') {
    data.status = req.body.status.trim() || 'OPEN';
  }
  if (Object.hasOwn(req.body, 'amount')) {
    data.amount = optionalAmount(req.body.amount);
  }
  if (typeof req.body.notes === 'string') {
    data.notes = req.body.notes;
  }
  if (Object.hasOwn(req.body, 'dueAt')) {
    data.dueAt = req.body.dueAt ? new Date(req.body.dueAt) : null;
  }
  if (Object.hasOwn(req.body, 'fileId')) {
    if (req.body.fileId) {
      const file = await prisma.fileAsset.findFirst({
        where: { id: req.body.fileId, ...await accessibleFileWhere(req.user) }
      });

      if (!file) {
        return res.status(404).json({ message: 'Linked file not found.' });
      }
    }
    data.fileId = req.body.fileId || null;
  }

  const updated = await prisma.documentRecord.update({ where: { id: record.id }, data });
  await logActivity('document_record.updated', req.user.id, { recordId: updated.id, title: updated.title });
  res.json(updated);
});

app.delete('/document-records/:id', requireAuth, async (req, res) => {
  const record = await prisma.documentRecord.findFirst({
    where: { id: req.params.id, ...ownedContentWhere(req.user) }
  });

  if (!record) {
    return res.status(404).json({ message: 'Document tracker item not found.' });
  }

  await prisma.documentRecord.delete({ where: { id: record.id } });
  await logActivity('document_record.deleted', req.user.id, { recordId: record.id, title: record.title });
  res.status(204).end();
});

app.post('/folders', requireAuth, requireCapability('canCreateFolders'), async (req, res) => {
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
  await logActivity('folder.updated', req.user.id, { folderId: updated.id, name: updated.name });
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

app.post('/files', requireAuth, requireCapability('canUploadFiles'), upload.single('file'), async (req, res) => {
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
  if (typeof req.body.isImportant === 'boolean') {
    data.isImportant = req.body.isImportant;
  }
  if (typeof req.body.originalName === 'string' && req.body.originalName.trim()) {
    data.originalName = req.body.originalName.trim();
  }
  if (Object.hasOwn(req.body, 'folderId')) {
    if (req.body.folderId && !(await getEditableFolder(req.body.folderId, req.user))) {
      return res.status(404).json({ message: 'Folder not found.' });
    }
    data.folderId = req.body.folderId || null;
  }
  const tags = await editableTagConnections(req.body.tagIds, req.user);
  if (tags) {
    data.tags = tags;
  }

  const updated = await prisma.fileAsset.update({ where: { id: file.id }, data });
  await logActivity('file.updated', req.user.id, { fileId: updated.id, name: updated.originalName });
  res.json(updated);
});

app.get('/files/:id/download', requireAuth, async (req, res) => {
  const file = await prisma.fileAsset.findFirst({
    where: { id: req.params.id, ...await accessibleFileWhere(req.user) }
  });

  if (!file) {
    return res.status(404).json({ message: 'File not found.' });
  }

  const storedPath = await resolveStoredFilePath(file);
  if (!storedPath) {
    return res.status(404).json({ message: 'Stored file is missing. Please upload it again.' });
  }

  await logActivity('file.downloaded', req.user.id, { fileId: file.id });
  res.download(storedPath, file.originalName);
});

app.get('/files/:id/preview', requireAuth, async (req, res) => {
  const file = await prisma.fileAsset.findFirst({
    where: { id: req.params.id, ...await accessibleFileWhere(req.user) }
  });

  if (!file) {
    return res.status(404).json({ message: 'File not found.' });
  }

  if (!previewType(file)) {
    return res.status(415).json({ message: 'Preview is not available for this file type.' });
  }

  const storedPath = await resolveStoredFilePath(file);
  if (!storedPath) {
    return res.status(404).json({ message: 'Stored file is missing. Please upload it again.' });
  }

  await logActivity('file.previewed', req.user.id, { fileId: file.id });
  res.setHeader('Content-Disposition', `inline; filename="${file.originalName.replace(/"/g, '')}"`);
  res.type(file.mimeType || 'application/octet-stream');
  res.sendFile(storedPath);
});

app.delete('/files/:id', requireAuth, async (req, res) => {
  const file = await prisma.fileAsset.findFirst({
    where: { id: req.params.id, ...ownedContentWhere(req.user) }
  });

  if (!file) {
    return res.status(404).json({ message: 'File not found.' });
  }

  await prisma.fileAsset.delete({ where: { id: file.id } });
  const storedPath = await resolveStoredFilePath(file);
  if (storedPath) {
    await unlink(storedPath).catch(() => undefined);
  }
  await logActivity('file.deleted', req.user.id, { fileId: file.id, name: file.originalName });
  res.status(204).end();
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ message: 'Something went wrong.' });
});

await ensureRolePermissions();

app.listen(port, () => {
  console.log(`Equinox API listening on http://localhost:${port}`);
});

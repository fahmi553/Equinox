import test from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import { app, prisma } from '../src/server.js';

const runId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const password = 'RegressionPass123!';
const users = {
  owner: {
    username: `owner-${runId}`,
    displayName: 'Regression Owner'
  },
  outsider: {
    username: `outsider-${runId}`,
    displayName: 'Regression Outsider'
  }
};

async function createUser(data, role = 'FAMILY') {
  return prisma.user.create({
    data: {
      ...data,
      role,
      passwordHash: await bcrypt.hash(password, 12)
    }
  });
}

async function login(username) {
  const response = await request(app)
    .post('/auth/login')
    .send({ username, password })
    .expect(200);
  return response.body.token;
}

async function createLoggedInUser(name, role = 'FAMILY') {
  const user = await createUser({
    username: `${name}-${runId}`,
    displayName: `Regression ${name}`
  }, role);
  const token = await login(user.username);
  return { user, token };
}

test('private notes stay owner-only across list, update, and delete requests', async (t) => {
  const owner = await createUser(users.owner);
  const outsider = await createUser(users.outsider);

  t.after(async () => {
    await prisma.user.deleteMany({
      where: {
        id: { in: [owner.id, outsider.id] }
      }
    });
    await prisma.$disconnect();
  });

  const ownerToken = await login(users.owner.username);
  const outsiderToken = await login(users.outsider.username);

  const created = await request(app)
    .post('/notes')
    .set('Authorization', `Bearer ${ownerToken}`)
    .send({ title: `Private regression note ${runId}`, body: 'Owner only', isShared: false })
    .expect(201);

  const outsiderList = await request(app)
    .get('/notes')
    .set('Authorization', `Bearer ${outsiderToken}`)
    .expect(200);

  assert.equal(
    outsiderList.body.some((note) => note.id === created.body.id),
    false
  );

  await request(app)
    .patch(`/notes/${created.body.id}`)
    .set('Authorization', `Bearer ${outsiderToken}`)
    .send({ title: 'Outsider update attempt' })
    .expect(404);

  await request(app)
    .delete(`/notes/${created.body.id}`)
    .set('Authorization', `Bearer ${outsiderToken}`)
    .expect(404);

  await request(app)
    .get('/notes')
    .set('Authorization', `Bearer ${ownerToken}`)
    .expect(200)
    .expect((response) => {
      assert.equal(
        response.body.some((note) => note.id === created.body.id),
        true
      );
    });
});

test('api errors use the standard error envelope', async () => {
  await request(app)
    .get('/notes')
    .expect(401)
    .expect((response) => {
      assert.deepEqual(response.body, {
        error: {
          code: 'UNAUTHORIZED',
          message: 'Missing authorization token.'
        }
      });
    });
});

test('validation errors use the standard error envelope', async () => {
  await request(app)
    .post('/auth/login')
    .send({ username: '!', password: 'RegressionPass123!' })
    .expect(400)
    .expect((response) => {
      assert.equal(response.body.error.code, 'VALIDATION_ERROR');
      assert.match(response.body.error.message, /Username must be/);
    });
});

test('admin-only routes deny non-admin users', async (t) => {
  const { user, token } = await createLoggedInUser('non-admin-denied');

  t.after(async () => {
    await prisma.user.deleteMany({ where: { id: user.id } });
  });

  await request(app)
    .get('/users')
    .set('Authorization', `Bearer ${token}`)
    .expect(403)
    .expect((response) => {
      assert.equal(response.body.error.code, 'FORBIDDEN');
      assert.equal(response.body.error.message, 'Admin access required.');
    });
});

test('private activity stays hidden from other family users', async (t) => {
  const owner = await createLoggedInUser('activity-owner');
  const outsider = await createLoggedInUser('activity-outsider');
  const admin = await createLoggedInUser('activity-admin', 'ADMIN');

  const privateLog = await prisma.activityLog.create({
    data: {
      action: 'note.created',
      userId: owner.user.id,
      metadata: { visibility: 'PRIVATE', subject: 'Private activity regression' }
    }
  });
  const sharedLog = await prisma.activityLog.create({
    data: {
      action: 'note.created',
      userId: owner.user.id,
      metadata: { visibility: 'SHARED', subject: 'Shared activity regression' }
    }
  });
  const adminOnlyLog = await prisma.activityLog.create({
    data: {
      action: 'user.login',
      userId: owner.user.id,
      metadata: { visibility: 'SHARED', subject: 'Admin-only activity regression' }
    }
  });

  t.after(async () => {
    await prisma.activityLog.deleteMany({
      where: { id: { in: [privateLog.id, sharedLog.id, adminOnlyLog.id] } }
    });
    await prisma.user.deleteMany({
      where: { id: { in: [owner.user.id, outsider.user.id, admin.user.id] } }
    });
  });

  await request(app)
    .get('/activity')
    .set('Authorization', `Bearer ${outsider.token}`)
    .expect(200)
    .expect((response) => {
      const ids = response.body.map((item) => item.id);
      assert.equal(ids.includes(sharedLog.id), true);
      assert.equal(ids.includes(privateLog.id), false);
      assert.equal(ids.includes(adminOnlyLog.id), false);
    });

  await request(app)
    .get('/activity')
    .set('Authorization', `Bearer ${admin.token}`)
    .expect(200)
    .expect((response) => {
      const ids = response.body.map((item) => item.id);
      assert.equal(ids.includes(privateLog.id), true);
      assert.equal(ids.includes(adminOnlyLog.id), true);
    });
});

test('shared local files become inaccessible after access is revoked', async (t) => {
  const owner = await createLoggedInUser('file-owner');
  const recipient = await createLoggedInUser('file-recipient');
  let filePath = '';

  t.after(async () => {
    if (filePath) {
      await request(app)
        .delete('/file-portal/local/items')
        .set('Authorization', `Bearer ${owner.token}`)
        .query({ path: filePath })
        .catch(() => undefined);
    }
    await prisma.activityLog.deleteMany({
      where: {
        action: 'file_portal.shared_file_downloaded',
        userId: recipient.user.id
      }
    });
    await prisma.user.deleteMany({
      where: { id: { in: [owner.user.id, recipient.user.id] } }
    });
  });

  const uploaded = await request(app)
    .post('/file-portal/local/files')
    .set('Authorization', `Bearer ${owner.token}`)
    .field('path', '')
    .attach('file', Buffer.from('shared regression file'), {
      filename: `shared-${runId}.txt`,
      contentType: 'text/plain'
    })
    .expect(201);

  filePath = uploaded.body.path;

  const shared = await request(app)
    .patch('/file-portal/local/share-users')
    .set('Authorization', `Bearer ${owner.token}`)
    .send({ path: filePath, userIds: [recipient.user.id] })
    .expect(200);

  const metadataId = shared.body.id;

  await request(app)
    .get('/file-portal/shared')
    .set('Authorization', `Bearer ${recipient.token}`)
    .expect(200)
    .expect((response) => {
      assert.equal(response.body.files.some((file) => file.path === filePath), true);
    });

  await request(app)
    .get('/file-portal/shared/download')
    .set('Authorization', `Bearer ${recipient.token}`)
    .query({ id: metadataId })
    .expect(200);

  const downloadLog = await prisma.activityLog.findFirst({
    where: {
      action: 'file_portal.shared_file_downloaded',
      userId: recipient.user.id,
      metadata: {
        path: ['metadataId'],
        equals: metadataId
      }
    }
  });
  assert.notEqual(downloadLog, null);

  await request(app)
    .patch('/file-portal/local/share-users')
    .set('Authorization', `Bearer ${owner.token}`)
    .send({ path: filePath, userIds: [] })
    .expect(200);

  await request(app)
    .get('/file-portal/shared')
    .set('Authorization', `Bearer ${recipient.token}`)
    .expect(200)
    .expect((response) => {
      assert.equal(response.body.files.some((file) => file.path === filePath), false);
    });

  await request(app)
    .get('/file-portal/shared/download')
    .set('Authorization', `Bearer ${recipient.token}`)
    .query({ id: metadataId })
    .expect(404);
});

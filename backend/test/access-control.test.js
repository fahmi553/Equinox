import test from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import { app, prisma } from '../src/server.js';

const runId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const password = 'RegressionPass123';
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

async function createUser(data) {
  return prisma.user.create({
    data: {
      ...data,
      role: 'FAMILY',
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

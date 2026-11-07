import { test, mock, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createReq, createRes } from './helpers.js';

const queries = [];
mock.module('@vercel/postgres', {
  namedExports: { sql: async (strings) => { queries.push(strings.join('?')); return { rows: [], rowCount: 0 }; } },
});
const { default: handler } = await import('../../api/init-db.js');

const call = async (req) => { const res = createRes(); await handler(createReq(req), res); return res; };

beforeEach(() => { queries.length = 0; delete process.env.INIT_DB_SECRET; });

test('is disabled (404) unless INIT_DB_SECRET is set', async () => {
  assert.equal((await call({ method: 'POST' })).statusCode, 404);
  assert.equal(queries.length, 0);
});

test('only accepts POST', async () => {
  process.env.INIT_DB_SECRET = 's3cret';
  assert.equal((await call({ method: 'GET' })).statusCode, 405);
});

test('rejects a missing or wrong secret', async () => {
  process.env.INIT_DB_SECRET = 's3cret';
  for (const authorization of [undefined, 'Bearer ', 'Bearer wrong', 's3cret']) {
    const headers = authorization ? { authorization } : {};
    assert.equal((await call({ method: 'POST', headers })).statusCode, 401, String(authorization));
  }
  assert.equal(queries.length, 0);
});

test('creates tables and indexes with the right secret', async () => {
  process.env.INIT_DB_SECRET = 's3cret';
  const res = await call({ method: 'POST', headers: { authorization: 'Bearer s3cret' } });
  assert.equal(res.statusCode, 200);
  assert.equal(res.json().status, 'success');
  assert.ok(queries.some(q => q.includes('CREATE TABLE IF NOT EXISTS projects')));
  assert.ok(queries.some(q => q.includes('CREATE INDEX IF NOT EXISTS images_user_id_idx')));
});

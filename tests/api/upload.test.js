import { test, mock, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createReq, createRes, PNG } from './helpers.js';

let usage = { count: 0, chars: '0' };
const inserts = [];
mock.module('@vercel/postgres', {
  namedExports: {
    sql: async (strings, ...values) => {
      const text = strings.join('?');
      if (text.includes('SELECT COUNT')) return { rows: [usage] };
      inserts.push(values);
      return { rows: [], rowCount: 1 };
    },
  },
});
mock.module('@clerk/backend', {
  namedExports: {
    createClerkClient: () => ({
      authenticateRequest: async () => ({ isSignedIn: true, toAuth: () => ({ userId: 'user_1' }) }),
    }),
  },
});
process.env.CLERK_SECRET_KEY = 'sk_test';
const { default: handler } = await import('../../api/upload.js');

const upload = async (body) => {
  const res = createRes();
  await handler(createReq({ method: 'POST', url: '/api/upload', body }), res);
  return res;
};

beforeEach(() => { usage = { count: 0, chars: '0' }; inserts.length = 0; });

test('stores a PNG with a UUID id and the detected type', async () => {
  const res = await upload({ data: `data:image/png;base64,${PNG.toString('base64')}`, fileName: 'a.png' });
  assert.equal(res.statusCode, 200);
  assert.match(res.json().url, /^\/api\/image\?id=[0-9a-f-]{36}$/);
  const [, userId, , contentType] = inserts[0];
  assert.equal(userId, 'user_1');
  assert.equal(contentType, 'image/png');
});

test('ignores the claimed type and refuses non-images (e.g. HTML posing as PNG)', async () => {
  const html = Buffer.from('<html><script>alert(1)</script></html>').toString('base64');
  const res = await upload({ data: `data:image/png;base64,${html}`, contentType: 'image/png' });
  assert.equal(res.statusCode, 415);
  assert.equal(inserts.length, 0);
});

test('refuses images over 3 MB', async () => {
  const big = Buffer.concat([PNG, Buffer.alloc(3 * 1024 * 1024)]);
  assert.equal((await upload({ data: big.toString('base64') })).statusCode, 413);
});

test('enforces the per-user quota', async () => {
  usage = { count: 200, chars: '0' };
  assert.equal((await upload({ data: PNG.toString('base64') })).statusCode, 413);
  usage = { count: 1, chars: String(100 * 1024 * 1024) };
  assert.equal((await upload({ data: PNG.toString('base64') })).statusCode, 413);
  assert.equal(inserts.length, 0);
});

test('requires a payload', async () => {
  assert.equal((await upload({})).statusCode, 400);
  assert.equal((await upload(undefined)).statusCode, 400);
});

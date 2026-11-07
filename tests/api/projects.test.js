import { test, mock, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createReq, createRes } from './helpers.js';

let rowCount = 1;
const queries = [];
mock.module('@vercel/postgres', {
  namedExports: {
    sql: async (strings, ...values) => { queries.push({ text: strings.join('?'), values }); return { rows: [], rowCount }; },
  },
});
mock.module('@clerk/backend', {
  namedExports: {
    createClerkClient: () => ({
      authenticateRequest: async (request) => {
        const signedIn = request.headers.get('authorization') === 'Bearer valid';
        return { isSignedIn: signedIn, toAuth: () => ({ userId: 'user_1' }) };
      },
    }),
  },
});
process.env.CLERK_SECRET_KEY = 'sk_test';
const { default: handler } = await import('../../api/projects.js');

const call = async (req) => {
  const res = createRes();
  await handler(createReq({ url: '/api/projects', headers: { authorization: 'Bearer valid' }, ...req }), res);
  return res;
};
const save = (body) => call({ method: 'POST', body });

beforeEach(() => { rowCount = 1; queries.length = 0; });

test('requires a signed-in user', async () => {
  assert.equal((await call({ method: 'GET', headers: {} })).statusCode, 401);
});

test('saves a project when a row is written', async () => {
  const res = await save({ id: 'a', name: 'n', cards: [] });
  assert.equal(res.statusCode, 200);
  assert.ok(queries[0].values.includes('user_1'));
});

test('returns 409 when the ID belongs to another account', async () => {
  rowCount = 0;
  const res = await save({ id: 'a', name: 'n', cards: [] });
  assert.equal(res.statusCode, 409);
  assert.equal(res.json().code, 'id_conflict');
});

test('rejects malformed bodies', async () => {
  const bad = [undefined, {}, { id: 5, name: 'n', cards: [] }, { id: 'a', name: 'n', cards: 'x' },
    { id: 'x'.repeat(65), name: 'n', cards: [] }, { id: 'a', cards: [] }];
  for (const body of bad) assert.equal((await save(body)).statusCode, 400, JSON.stringify(body));
  assert.equal(queries.length, 0);
});

test('delete is scoped to the user and cleans up unreferenced images', async () => {
  const res = await call({ method: 'DELETE', query: { id: 'p1' } });
  assert.equal(res.statusCode, 200);
  assert.match(queries[0].text, /DELETE FROM projects WHERE id = \? AND user_id = \?/);
  assert.deepEqual(queries[0].values, ['p1', 'user_1']);
  assert.match(queries[1].text, /DELETE FROM images/);
});

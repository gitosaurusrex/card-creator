// Shared helpers: an in-memory /api backend and sign-in for the Clerk stub.

/**
 * Mocks /api/* with an in-memory store keyed by bearer token.
 * `db` maps user id -> array of projects (as the server would return them).
 * Returns a handle whose fields tests can read or tweak mid-test.
 */
export async function mockApi(page, { db = {}, conflictIds = [] } = {}) {
  const api = {
    db,
    requests: [],
    failSaves: false,
    conflictIds: new Set(conflictIds),
    uploadResponse: { status: 200, json: { url: '/api/image?id=test-image', success: true } },
    saves() { return this.requests.filter(r => r.method === 'POST' && r.path === '/api/projects'); },
    deletes() { return this.requests.filter(r => r.method === 'DELETE'); },
  };

  await page.route('**/api/**', async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const user = (req.headers()['authorization'] || '').replace('Bearer token-', '');
    const entry = { method: req.method(), path: url.pathname, query: url.search, user, at: Date.now() };
    if (req.method() === 'POST') entry.body = JSON.parse(req.postData() || 'null');
    api.requests.push(entry);

    const list = (api.db[user] ||= []);

    if (url.pathname === '/api/projects') {
      if (req.method() === 'GET') return route.fulfill({ json: list });
      if (req.method() === 'POST') {
        if (api.failSaves) return route.fulfill({ status: 500, json: { error: 'boom' } });
        if (api.conflictIds.has(entry.body.id)) {
          return route.fulfill({ status: 409, json: { error: 'conflict', code: 'id_conflict' } });
        }
        const i = list.findIndex(p => p.id === entry.body.id);
        if (i >= 0) list[i] = entry.body; else list.push(entry.body);
        return route.fulfill({ json: { success: true } });
      }
      if (req.method() === 'DELETE') {
        api.db[user] = list.filter(p => p.id !== url.searchParams.get('id'));
        return route.fulfill({ json: { success: true } });
      }
    }

    if (url.pathname === '/api/upload') {
      const { status, json, body, contentType } = api.uploadResponse;
      return json ? route.fulfill({ status, json }) : route.fulfill({ status, body, contentType });
    }

    return route.fulfill({ status: 404, body: '' });
  });

  return api;
}

/** Loads the app as `user` with clean storage (optionally pre-seeded). */
export async function signIn(page, user, { storage = {} } = {}) {
  await page.goto('/');
  await page.evaluate(({ user, storage }) => {
    localStorage.clear();
    for (const [key, value] of Object.entries(storage)) localStorage.setItem(key, value);
    localStorage.setItem('__test_user', user);
  }, { user, storage });
  await page.reload();
}

export const project = (id, name, cards, lastModified = '2026-01-01T00:00:00.000Z') => ({
  id,
  name,
  cards: cards.map((c, i) => ({ id: i + 1, text: '', selectedForPrint: true, ...c })),
  lastModified,
});

export const titleInput = (page) => page.locator('input[placeholder="Card title..."]');

export async function closeProject(page) {
  page.once('dialog', d => d.accept());
  await page.getByRole('button', { name: 'Close' }).click();
}

/** Simulates the tab being hidden (the browser fires this before unload). */
export async function hideTab(page) {
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
}

export const unsyncedIds = (page, user) =>
  page.evaluate(u => JSON.parse(localStorage.getItem(`tilemaker_projects_v2:${u}:unsynced`) || '[]'), user);

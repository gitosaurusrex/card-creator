// Shared helpers: an in-memory /api backend, sign-in for the Clerk stub and
// locators for the parts of the UI most tests touch.
import { expect } from '@playwright/test';

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
    uploads() { return this.requests.filter(r => r.path === '/api/upload'); },
    lastSaved() { return this.saves().at(-1)?.body; },
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

export const tourSeenKey = (user) => `cardcreator:tour-seen:${user}`;

/**
 * Loads the app as `user` with clean storage (optionally pre-seeded).
 * The guided tour is marked as seen unless `tourSeen: false` is passed.
 */
export async function signIn(page, user, { storage = {}, tourSeen = true } = {}) {
  await page.goto('/');
  await page.evaluate(({ user, storage, tourKey }) => {
    localStorage.clear();
    if (tourKey) localStorage.setItem(tourKey, 'true');
    for (const [key, value] of Object.entries(storage)) localStorage.setItem(key, value);
    localStorage.setItem('__test_user', user);
  }, { user, storage, tourKey: tourSeen ? tourSeenKey(user) : null });
  await page.reload();
}

export const project = (id, name, cards, lastModified = '2026-01-01T00:00:00.000Z') => ({
  id,
  name,
  cards: cards.map((c, i) => ({ id: i + 1, text: '', selectedForPrint: true, ...c })),
  lastModified,
});

// ---- Home screen ---------------------------------------------------------

export const newProjectButton = (page) => page.getByRole('button', { name: 'Start a new project' });

const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** The button that opens a project (its name starts with the project name). */
export const projectButton = (page, name) =>
  page.getByRole('button', { name: new RegExp(`^${escapeRegExp(name)}`) });

export const deleteProjectButton = (page, name) => page.getByRole('button', { name: `Delete ${name}`, exact: true });

export const confirmDeleteDialog = (page) => page.getByRole('dialog', { name: 'Delete this project?' });

// ---- Editor --------------------------------------------------------------

export const titleInput = (page) => page.getByLabel('Title', { exact: true });
export const projectNameInput = (page) => page.getByLabel('Project name', { exact: true });
/** The save indicator in the top bar ("All saved", "Saving soon…", "Saving…", "Not saved yet"). */
export const saveStatus = (page) =>
  page.getByRole('status').filter({ hasText: /^(All saved|Saving soon…|Saving…|Not saved yet)$/ });
export const tab = (page, name) => page.getByRole('tab', { name, exact: true });
// Scoped to the top bar: toasts have their own "Undo" button.
export const undoButton = (page) => page.getByRole('banner').getByRole('button', { name: 'Undo', exact: true });
export const redoButton = (page) => page.getByRole('banner').getByRole('button', { name: 'Redo', exact: true });

export const cardStrip = (page) => page.getByRole('region', { name: 'Your cards' });
/** Thumbnails in the card strip, one per card ("Card N: <title>"). */
export const cardThumbs = (page) => cardStrip(page).getByRole('button', { name: /^Card \d+:/ });
/** One thumbnail; its name may also carry the "Not printing" badge. */
export const cardThumb = (page, n, title) =>
  cardStrip(page).getByRole('button', { name: new RegExp(`^Card ${n}: ${escapeRegExp(title)}(\\s+Not printing)?$`) });
export const stripButton = (page, name) => cardStrip(page).getByRole('button', { name, exact: true });
// "Move earlier/later" are being renamed to "Move left/right"; accept both.
export const moveEarlierButton = (page) => cardStrip(page).getByRole('button', { name: /^Move (earlier|left)$/ });
export const moveLaterButton = (page) => cardStrip(page).getByRole('button', { name: /^Move (later|right)$/ });

/** Asserts the strip shows exactly these card titles, in order. */
export async function expectCardOrder(page, titles) {
  await expect(cardThumbs(page)).toHaveCount(titles.length);
  for (const [i, title] of titles.entries()) await expect(cardThumb(page, i + 1, title)).toBeVisible();
}

/** The big preview of the active card. */
export const preview = (page) => page.getByRole('region', { name: 'Card preview' });

/** Leaves the editor ("My projects"), which flushes pending saves. */
export async function closeProject(page) {
  await page.getByRole('button', { name: 'My projects' }).click();
  await expect(newProjectButton(page)).toBeVisible();
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

export const cachedProjects = (page, user) =>
  page.evaluate(u => JSON.parse(localStorage.getItem(`tilemaker_projects_v2:${u}`) || 'null'), user);

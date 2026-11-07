import { test, expect } from '@playwright/test';
import { mockApi, signIn, project, titleInput, closeProject, hideTab, unsyncedIds } from './helpers.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const LAST_MODIFIED = '2026-01-01T00:00:00.000Z';
const twoCards = () => project('p1', 'Old Project', [{ title: 'Card A' }, { title: 'Card B' }], LAST_MODIFIED);

test('opening and closing a project without edits sends no save', async ({ page }) => {
  const api = await mockApi(page, { db: { dana: [twoCards()] } });
  await signIn(page, 'dana');

  await page.getByText('Old Project').click();
  await expect(titleInput(page)).toHaveValue('Card A');
  await page.waitForTimeout(2000); // longer than the 1.5 s autosave debounce
  await closeProject(page);
  await page.waitForTimeout(300);

  expect(api.saves()).toHaveLength(0);
  await expect(page.locator('.project-meta')).toContainText('1/1/2026');
});

test('editing one card saves it, keeps the others and bumps lastModified', async ({ page }) => {
  const api = await mockApi(page, { db: { dana: [twoCards()] } });
  await signIn(page, 'dana');

  await page.getByText('Old Project').click();
  await page.locator('.ribbon-item', { hasText: 'Card B' }).click();
  await titleInput(page).fill('Card B edited');

  await expect.poll(() => api.saves().length, { timeout: 5000 }).toBeGreaterThan(0);
  const saved = api.saves().at(-1).body;
  expect(saved.cards.map(c => c.title)).toEqual(['Card A', 'Card B edited']);
  expect(new Date(saved.lastModified) > new Date(LAST_MODIFIED)).toBe(true);
});

test('closing a project saves pending edits immediately', async ({ page }) => {
  const api = await mockApi(page, { db: { dana: [twoCards()] } });
  await signIn(page, 'dana');

  await page.getByText('Old Project').click();
  await titleInput(page).fill('Edited right before close');
  const editedAt = Date.now();
  await closeProject(page);

  await expect.poll(() => api.saves().length).toBe(1);
  expect(api.saves()[0].at - editedAt).toBeLessThan(1000); // well under the debounce
  expect(api.saves()[0].body.cards[0].title).toBe('Edited right before close');
});

test('hiding the tab saves pending edits immediately', async ({ page }) => {
  const api = await mockApi(page, { db: { dana: [twoCards()] } });
  await signIn(page, 'dana');

  await page.getByText('Old Project').click();
  await titleInput(page).fill('Edited before tab hide');
  await hideTab(page);

  await expect.poll(() => api.saves().length, { timeout: 1000 }).toBe(1);
  expect(api.saves()[0].body.cards[0].title).toBe('Edited before tab hide');
});

test('a failed save is kept locally and re-sent on the next load', async ({ page }) => {
  const api = await mockApi(page, { db: { dana: [twoCards()] } });
  await signIn(page, 'dana');

  api.failSaves = true;
  await page.getByText('Old Project').click();
  await titleInput(page).fill('Unsynced edit');
  await expect(page.getByText('Sync Paused (Local Only)')).toBeVisible({ timeout: 5000 });
  expect(await unsyncedIds(page, 'dana')).toEqual(['p1']);

  api.failSaves = false;
  await page.reload();
  await expect.poll(() => api.db.dana[0].cards[0].title).toBe('Unsynced edit');
  await expect.poll(() => unsyncedIds(page, 'dana')).toEqual([]);
});

test('new projects and cards get UUIDs', async ({ page }) => {
  const api = await mockApi(page, { db: { dana: [] } });
  await signIn(page, 'dana');

  await page.locator('.new-project').click();
  await expect(titleInput(page)).toHaveValue('My Presentation Card');
  await closeProject(page);

  await expect.poll(() => api.saves().length).toBe(1);
  const created = api.saves()[0].body;
  expect(created.id).toMatch(UUID);
  expect(String(created.cards[0].id)).toMatch(UUID);
});

test('an ID conflict (409) re-keys the project and saves it under the new ID', async ({ page }) => {
  const api = await mockApi(page, { db: { dana: [twoCards()] }, conflictIds: ['p1'] });
  await signIn(page, 'dana');

  await page.getByText('Old Project').click();
  await titleInput(page).fill('Edited after conflict');

  await expect.poll(() => api.db.dana.find(p => p.id !== 'p1'), { timeout: 5000 }).toBeTruthy();
  const rekeyed = api.db.dana.find(p => p.id !== 'p1');
  expect(rekeyed.id).toMatch(UUID);
  expect(rekeyed.cards[0].title).toBe('Edited after conflict');
  await expect(page.getByText('Synced to Cloud')).toBeVisible();

  // Later edits go to the new ID, and nothing is left marked unsynced.
  await titleInput(page).fill('Second edit');
  await expect.poll(() => api.saves().at(-1).body.cards[0].title, { timeout: 5000 }).toBe('Second edit');
  expect(api.saves().at(-1).body.id).toBe(rekeyed.id);
  expect(await unsyncedIds(page, 'dana')).toEqual([]);
});

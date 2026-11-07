import { test, expect } from '@playwright/test';
import {
  mockApi, signIn, project, titleInput, closeProject, hideTab, unsyncedIds, cachedProjects,
  projectButton, newProjectButton, cardThumb, saveStatus, projectNameInput,
} from './helpers.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const LAST_MODIFIED = '2026-01-01T00:00:00.000Z';
const twoCards = () => project('p1', 'Old Project', [{ title: 'Card A' }, { title: 'Card B' }], LAST_MODIFIED);

test('opening and closing a project without edits sends no save', async ({ page }) => {
  const api = await mockApi(page, { db: { dana: [twoCards()] } });
  await signIn(page, 'dana');

  await projectButton(page, 'Old Project').click();
  await expect(titleInput(page)).toHaveValue('Card A');
  await cardThumb(page, 2, 'Card B').click(); // just looking at another card is not an edit
  await expect(titleInput(page)).toHaveValue('Card B');
  await expect(saveStatus(page)).toHaveText('All saved');
  await page.waitForTimeout(2000); // longer than the 1.5 s autosave debounce
  await closeProject(page);
  await page.waitForTimeout(300);

  expect(api.saves()).toHaveLength(0);
  expect((await cachedProjects(page, 'dana'))[0].lastModified).toBe(LAST_MODIFIED);
  await expect(projectButton(page, 'Old Project')).toContainText('2 cards');
  await expect(projectButton(page, 'Old Project')).not.toContainText('Changed today');
});

test('editing one card saves it, keeps the others and bumps lastModified', async ({ page }) => {
  const api = await mockApi(page, { db: { dana: [twoCards()] } });
  await signIn(page, 'dana');

  await projectButton(page, 'Old Project').click();
  await cardThumb(page, 2, 'Card B').click();
  await titleInput(page).fill('Card B edited');
  await expect(saveStatus(page)).toHaveText('Saving soon…');
  await expect(cardThumb(page, 2, 'Card B edited')).toBeVisible();

  await expect.poll(() => api.saves().length, { timeout: 5000 }).toBeGreaterThan(0);
  await expect(saveStatus(page)).toHaveText('All saved');
  const saved = api.lastSaved();
  expect(saved.cards.map(c => c.title)).toEqual(['Card A', 'Card B edited']);
  expect(saved.cards.map(c => c.id)).toEqual([1, 2]);
  expect(new Date(saved.lastModified) > new Date(LAST_MODIFIED)).toBe(true);

  await closeProject(page);
  await expect(projectButton(page, 'Old Project')).toContainText('Changed today');
});

test('renaming the project is saved', async ({ page }) => {
  const api = await mockApi(page, { db: { dana: [twoCards()] } });
  await signIn(page, 'dana');

  await projectButton(page, 'Old Project').click();
  await projectNameInput(page).fill('Renamed');
  await expect.poll(() => api.lastSaved()?.name, { timeout: 5000 }).toBe('Renamed');
  expect(api.lastSaved().cards.map(c => c.title)).toEqual(['Card A', 'Card B']);

  await closeProject(page);
  await expect(projectButton(page, 'Renamed')).toBeVisible();
});

test('going back to My projects saves pending edits immediately', async ({ page }) => {
  const api = await mockApi(page, { db: { dana: [twoCards()] } });
  await signIn(page, 'dana');

  await projectButton(page, 'Old Project').click();
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

  await projectButton(page, 'Old Project').click();
  await titleInput(page).fill('Edited before tab hide');
  await hideTab(page);

  await expect.poll(() => api.saves().length, { timeout: 1000 }).toBe(1);
  expect(api.saves()[0].body.cards[0].title).toBe('Edited before tab hide');
});

test('a failed save is kept locally and re-sent on the next load', async ({ page }) => {
  const api = await mockApi(page, { db: { dana: [twoCards()] } });
  await signIn(page, 'dana');

  api.failSaves = true;
  await projectButton(page, 'Old Project').click();
  await titleInput(page).fill('Unsynced edit');
  await expect(saveStatus(page)).toHaveText('Not saved yet', { timeout: 5000 });
  expect(await unsyncedIds(page, 'dana')).toEqual(['p1']);
  expect((await cachedProjects(page, 'dana'))[0].cards[0].title).toBe('Unsynced edit');

  api.failSaves = false;
  await page.reload();
  await expect.poll(() => api.db.dana[0].cards[0].title).toBe('Unsynced edit');
  await expect.poll(() => unsyncedIds(page, 'dana')).toEqual([]);

  // The local edit wins over the (older) server copy in the UI too.
  await projectButton(page, 'Old Project').click();
  await expect(titleInput(page)).toHaveValue('Unsynced edit');
});

test('new projects and cards get UUIDs', async ({ page }) => {
  const api = await mockApi(page, { db: { dana: [] } });
  await signIn(page, 'dana');

  await newProjectButton(page).click();
  await expect(titleInput(page)).toHaveValue('My Card');
  await expect(projectNameInput(page)).toHaveValue('My project 1');
  await page.getByRole('button', { name: 'Add a card' }).click();
  await expect(titleInput(page)).toHaveValue('Card 2');
  await closeProject(page);

  await expect.poll(() => api.saves().length).toBeGreaterThan(0);
  const created = api.lastSaved();
  expect(created.id).toMatch(UUID);
  expect(created.name).toBe('My project 1');
  expect(created.cards).toHaveLength(2);
  for (const card of created.cards) expect(String(card.id)).toMatch(UUID);
  expect(created.cards[0].id).not.toBe(created.cards[1].id);
  await expect(projectButton(page, 'My project 1')).toBeVisible();
});

test('an ID conflict (409) re-keys the project and saves it under the new ID', async ({ page }) => {
  const api = await mockApi(page, { db: { dana: [twoCards()] }, conflictIds: ['p1'] });
  await signIn(page, 'dana');

  await projectButton(page, 'Old Project').click();
  await titleInput(page).fill('Edited after conflict');

  await expect.poll(() => api.db.dana.find(p => p.id !== 'p1'), { timeout: 5000 }).toBeTruthy();
  const rekeyed = api.db.dana.find(p => p.id !== 'p1');
  expect(rekeyed.id).toMatch(UUID);
  expect(rekeyed.cards[0].title).toBe('Edited after conflict');
  await expect(saveStatus(page)).toHaveText('All saved');
  // The editor stays on the (re-keyed) project.
  await expect(titleInput(page)).toHaveValue('Edited after conflict');

  // Later edits go to the new ID, and nothing is left marked unsynced.
  await titleInput(page).fill('Second edit');
  await expect.poll(() => api.lastSaved().cards[0].title, { timeout: 5000 }).toBe('Second edit');
  expect(api.lastSaved().id).toBe(rekeyed.id);
  expect(await unsyncedIds(page, 'dana')).toEqual([]);
  expect((await cachedProjects(page, 'dana')).map(p => p.id)).toEqual([rekeyed.id]);
});

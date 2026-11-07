import { test, expect } from '@playwright/test';
import {
  mockApi, signIn, project, newProjectButton, projectButton, deleteProjectButton, confirmDeleteDialog,
  cachedProjects, unsyncedIds,
} from './helpers.js';

const aliceProject = () => project('p1', 'Alice Project', [{ title: 'Alice card', text: 'secret' }]);

test('cancelling the delete confirmation sends no request', async ({ page }) => {
  const api = await mockApi(page, { db: { alice: [aliceProject()] } });
  await signIn(page, 'alice');

  await deleteProjectButton(page, 'Alice Project').click();
  const dialog = confirmDeleteDialog(page);
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('Alice Project');
  await dialog.getByRole('button', { name: 'Cancel' }).click();
  await expect(dialog).toBeHidden();

  // Nothing to wait on for a request that must never happen; give it a moment.
  await page.waitForTimeout(300);
  expect(api.deletes()).toHaveLength(0);
  await expect(projectButton(page, 'Alice Project')).toBeVisible();
});

test('Escape also cancels the delete confirmation', async ({ page }) => {
  const api = await mockApi(page, { db: { alice: [aliceProject()] } });
  await signIn(page, 'alice');

  await deleteProjectButton(page, 'Alice Project').click();
  await expect(confirmDeleteDialog(page)).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(confirmDeleteDialog(page)).toBeHidden();

  await page.waitForTimeout(300);
  expect(api.deletes()).toHaveLength(0);
  await expect(projectButton(page, 'Alice Project')).toBeVisible();
});

test('confirmed delete removes the project on the server and in the local cache', async ({ page }) => {
  const api = await mockApi(page, { db: { alice: [aliceProject()] } });
  await signIn(page, 'alice');

  await deleteProjectButton(page, 'Alice Project').click();
  await confirmDeleteDialog(page).getByRole('button', { name: 'Delete project' }).click();

  await expect(projectButton(page, 'Alice Project')).toHaveCount(0);
  expect(api.deletes()).toHaveLength(1);
  expect(api.deletes()[0].query).toBe('?id=p1');
  expect(await cachedProjects(page, 'alice')).toEqual([]);

  await page.reload();
  await expect(newProjectButton(page)).toBeVisible();
  await expect(page.getByText('Alice Project')).toHaveCount(0);
});

test('a failed delete is reported inline and the project is kept', async ({ page }) => {
  await mockApi(page, { db: { alice: [aliceProject()] } });
  await page.route('**/api/projects?id=*', route => route.fulfill({ status: 500, json: { error: 'boom' } }));
  await signIn(page, 'alice');

  // No native dialogs any more: one would mean a regression to confirm()/alert().
  const nativeDialogs = [];
  page.on('dialog', d => { nativeDialogs.push(d.message()); d.dismiss(); });

  await deleteProjectButton(page, 'Alice Project').click();
  await confirmDeleteDialog(page).getByRole('button', { name: 'Delete project' }).click();

  await expect(page.getByRole('alert')).toHaveText(/^Couldn’t delete “Alice Project”/);
  await expect(projectButton(page, 'Alice Project')).toBeVisible();
  await expect(deleteProjectButton(page, 'Alice Project')).toBeEnabled();
  expect((await cachedProjects(page, 'alice')).map(p => p.id)).toEqual(['p1']);
  expect(nativeDialogs).toEqual([]);
});

test('the old shared browser cache is not shown to any account', async ({ page }) => {
  await mockApi(page, { db: { alice: [] } });
  await signIn(page, 'alice', {
    storage: { tilemaker_projects_v1: JSON.stringify([{ id: 'legacy', name: 'LEGACY LEAK', cards: [], lastModified: 1 }]) },
  });

  await expect(newProjectButton(page)).toBeVisible();
  await expect(page.getByText('LEGACY LEAK')).toHaveCount(0);
});

test('switching accounts shows and saves nothing from the previous user', async ({ page }) => {
  const api = await mockApi(page, { db: { alice: [aliceProject()], bob: [] } });
  await signIn(page, 'alice');
  await expect(projectButton(page, 'Alice Project')).toBeVisible();

  await page.evaluate(() => window.__setUser('bob'));
  await expect(newProjectButton(page)).toBeVisible();
  await expect(page.getByText('Alice Project')).toHaveCount(0);

  await page.reload();
  await expect(newProjectButton(page)).toBeVisible();
  await expect(page.getByText('Alice Project')).toHaveCount(0);
  expect(api.saves().filter(r => r.user === 'bob')).toHaveLength(0);
});

// Regression guard: an edit still waiting to be saved when the account
// changes must never be sent with the new account's session (it would land in
// the wrong account). It stays in the previous user's local copy, marked
// unsynced, and is uploaded when they sign in again.
test('switching accounts from inside the editor never saves the pending edit to the new account', async ({ page }) => {
  const api = await mockApi(page, { db: { alice: [aliceProject()], bob: [] } });
  await signIn(page, 'alice');

  await projectButton(page, 'Alice Project').click();
  await page.getByLabel('Title', { exact: true }).fill('Alice edit');
  await page.evaluate(() => window.__setUser('bob'));

  await expect(newProjectButton(page)).toBeVisible();
  await expect(page.getByText('Alice Project')).toHaveCount(0);
  // The flush runs on unmount, right away; allow it to land (or not).
  await page.waitForTimeout(1000);

  expect(api.saves().filter(r => r.user === 'bob')).toHaveLength(0);
  expect(api.db.bob).toEqual([]);
  // ...and Alice's edit is not lost: it reached her account or is still queued for it.
  const reachedAlice = api.db.alice[0].cards[0].title === 'Alice edit';
  expect(reachedAlice || (await unsyncedIds(page, 'alice')).includes('p1')).toBe(true);
});

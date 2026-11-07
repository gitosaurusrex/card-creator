import { test, expect } from '@playwright/test';
import { mockApi, signIn, project } from './helpers.js';

const aliceProject = () => project('p1', 'Alice Project', [{ title: 'Alice card', text: 'secret' }]);

test('cancelling the delete confirmation sends no request', async ({ page }) => {
  const api = await mockApi(page, { db: { alice: [aliceProject()] } });
  await signIn(page, 'alice');

  page.once('dialog', d => d.dismiss());
  await page.locator('.project-card:not(.new-project) .btn-danger').click();

  await page.waitForTimeout(300);
  expect(api.deletes()).toHaveLength(0);
  await expect(page.getByText('Alice Project')).toBeVisible();
});

test('confirmed delete removes the project on the server and in the local cache', async ({ page }) => {
  const api = await mockApi(page, { db: { alice: [aliceProject()] } });
  await signIn(page, 'alice');

  page.once('dialog', d => d.accept());
  await page.locator('.project-card:not(.new-project) .btn-danger').click();

  await expect(page.getByText('Alice Project')).toHaveCount(0);
  expect(api.deletes()).toHaveLength(1);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('tilemaker_projects_v2:alice')))).toEqual([]);

  await page.reload();
  await expect(page.locator('.new-project')).toBeVisible();
  await expect(page.getByText('Alice Project')).toHaveCount(0);
});

test('a failed delete is reported and the project is kept', async ({ page }) => {
  await mockApi(page, { db: { alice: [aliceProject()] } });
  await page.route('**/api/projects?id=*', route => route.fulfill({ status: 500, json: { error: 'boom' } }));
  await signIn(page, 'alice');

  const dialogs = [];
  page.on('dialog', d => { dialogs.push(d.message()); d.accept(); });
  await page.locator('.project-card:not(.new-project) .btn-danger').click();

  await expect.poll(() => dialogs.length).toBe(2);
  expect(dialogs[1]).toMatch(/Couldn't delete/);
  await expect(page.getByText('Alice Project')).toBeVisible();
});

test("the old shared browser cache is not shown to any account", async ({ page }) => {
  await mockApi(page, { db: { alice: [] } });
  await signIn(page, 'alice', {
    storage: { tilemaker_projects_v1: JSON.stringify([{ id: 'legacy', name: 'LEGACY LEAK', cards: [], lastModified: 1 }]) },
  });

  await expect(page.locator('.new-project')).toBeVisible();
  await expect(page.getByText('LEGACY LEAK')).toHaveCount(0);
});

test("switching accounts shows and saves nothing from the previous user", async ({ page }) => {
  const api = await mockApi(page, { db: { alice: [aliceProject()], bob: [] } });
  await signIn(page, 'alice');
  await expect(page.getByText('Alice Project')).toBeVisible();

  await page.evaluate(() => window.__setUser('bob'));
  await expect(page.locator('.new-project')).toBeVisible();
  await expect(page.getByText('Alice Project')).toHaveCount(0);

  await page.reload();
  await expect(page.locator('.new-project')).toBeVisible();
  await expect(page.getByText('Alice Project')).toHaveCount(0);
  expect(api.saves().filter(r => r.user === 'bob')).toHaveLength(0);
});

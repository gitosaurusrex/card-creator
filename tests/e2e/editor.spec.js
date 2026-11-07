import { test, expect } from '@playwright/test';
import { mockApi, signIn, project, titleInput, closeProject } from './helpers.js';

test('card edits, universal settings, rename and print selection all persist', async ({ page }) => {
  const api = await mockApi(page, { db: { erin: [] } });
  await signIn(page, 'erin');
  await page.locator('.new-project').click();

  await page.locator('.add-card-btn').click();
  await page.locator('.add-card-btn').click();
  await expect(page.locator('.ribbon-item')).toHaveCount(3);
  await expect(titleInput(page)).toHaveValue('New Card 3');

  await page.locator('.universal-toggle').click();
  await page.locator('input[type=range]').fill('300');
  await page.locator('.ribbon-item').nth(1).locator('.delete-card-btn').click();
  await expect(page.locator('.ribbon-item')).toHaveCount(2);
  await page.locator('.ribbon-item').nth(0).locator('.print-checkbox').uncheck();
  await page.locator('input[title="Rename Project"]').fill('Renamed');

  await expect.poll(() => api.saves().at(-1)?.body.name, { timeout: 5000 }).toBe('Renamed');
  const saved = api.saves().at(-1).body;
  expect(saved.cards.map(c => c.title)).toEqual(['My Presentation Card', 'New Card 3']);
  expect(saved.cards.map(c => c.cardHeight)).toEqual([300, 300]);
  expect(saved.cards.map(c => c.selectedForPrint)).toEqual([false, true]);
  await expect(page.locator('.print-only .print-card')).toHaveCount(1);
});

test('switching between projects shows the right cards', async ({ page }) => {
  await mockApi(page, {
    db: { erin: [project('p1', 'Two Cards', [{ title: 'First' }, { title: 'Second' }])] },
  });
  await signIn(page, 'erin');

  await page.locator('.new-project').click();
  await expect(page.locator('.ribbon-item')).toHaveCount(1);
  await expect(titleInput(page)).toHaveValue('My Presentation Card');
  await closeProject(page);

  await page.getByText('Two Cards').click();
  await expect(page.locator('.ribbon-item')).toHaveCount(2);
  await expect(titleInput(page)).toHaveValue('First');
  await expect(page.locator('.viewport .card-title')).toHaveText('First');
});

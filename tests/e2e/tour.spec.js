import { test, expect } from '@playwright/test';
import { mockApi, signIn, project, projectButton, newProjectButton, titleInput, closeProject, tab, tourSeenKey } from './helpers.js';

const tourDialog = (page) => page.getByRole('dialog', { name: 'Welcome to Card Creator!' });
// While the tour is up it is the only open dialog (closed <dialog>s are not exposed).
const anyTour = (page) => page.getByRole('dialog');
const tourStep = (page, title) => page.getByRole('dialog').getByRole('heading', { name: title, exact: true });

test('the tour opens on the first editor visit, can be skipped and stays closed after a reload', async ({ page }) => {
  await mockApi(page, { db: { gus: [project('p1', 'Gus Project', [{ title: 'Gus card' }])] } });
  await signIn(page, 'gus', { tourSeen: false });

  // Not on the home screen...
  await expect(projectButton(page, 'Gus Project')).toBeVisible();
  await expect(anyTour(page)).toHaveCount(0);

  // ...but as soon as a project opens.
  await projectButton(page, 'Gus Project').click();
  await expect(tourDialog(page)).toBeVisible();

  await tourDialog(page).getByRole('button', { name: 'Skip the tour' }).click();
  await expect(anyTour(page)).toHaveCount(0);
  expect(await page.evaluate(k => JSON.parse(localStorage.getItem(k)), tourSeenKey('gus'))).toBe(true);
  await titleInput(page).fill('Tour skipped'); // the editor is usable once it closes
  await closeProject(page);

  await page.reload();
  await projectButton(page, 'Gus Project').click();
  await expect(titleInput(page)).toHaveValue('Tour skipped');
  await expect(anyTour(page)).toHaveCount(0);
  await closeProject(page);
  await newProjectButton(page).click();
  await expect(titleInput(page)).toHaveValue('My Card');
  await expect(anyTour(page)).toHaveCount(0);
});

test('"Show me how" reopens the tour, which walks through the tabs', async ({ page }) => {
  await mockApi(page, { db: { gus: [] } });
  await signIn(page, 'gus');
  await newProjectButton(page).click();
  await expect(titleInput(page)).toBeVisible();
  await expect(anyTour(page)).toHaveCount(0);

  await page.getByRole('button', { name: 'Show me how' }).click();
  await expect(tourDialog(page)).toBeVisible();

  await page.getByRole('button', { name: 'Show me!' }).click();
  await expect(tourStep(page, 'Your cards')).toBeVisible();
  await expect(anyTour(page)).toContainText('1 of 8');
  await page.getByRole('button', { name: 'Next' }).click();
  await expect(tourStep(page, 'Words')).toBeVisible();
  await expect(tab(page, 'Words')).toHaveAttribute('aria-selected', 'true');
  await page.getByRole('button', { name: 'Next' }).click();
  await expect(tourStep(page, 'Picture')).toBeVisible();
  await expect(tab(page, 'Picture')).toHaveAttribute('aria-selected', 'true');
  await page.getByRole('button', { name: 'Back' }).click();
  await expect(tourStep(page, 'Words')).toBeVisible();

  await page.getByRole('button', { name: 'Close the tour' }).click();
  await expect(anyTour(page)).toHaveCount(0);

  // Escape closes it too.
  await page.getByRole('button', { name: 'Show me how' }).click();
  await expect(tourDialog(page)).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(anyTour(page)).toHaveCount(0);
});

test('finishing the tour ends on Print and marks it as seen', async ({ page }) => {
  await mockApi(page, { db: { gus: [] } });
  await signIn(page, 'gus', { tourSeen: false });
  await newProjectButton(page).click();
  await expect(tourDialog(page)).toBeVisible();

  await page.getByRole('button', { name: 'Show me!' }).click();
  for (let i = 1; i < 8; i++) await page.getByRole('button', { name: 'Next' }).click();
  await expect(tourStep(page, 'Print')).toBeVisible();
  await expect(anyTour(page)).toContainText('8 of 8');
  await anyTour(page).getByRole('button', { name: 'Start making cards' }).click();
  await expect(anyTour(page)).toHaveCount(0);
  expect(await page.evaluate(k => localStorage.getItem(k), tourSeenKey('gus'))).toBe('true');
});

// Targets the tour as a native <dialog> (incoming UI change): closing it puts
// back the tab that was open before and returns focus to "Show me how".
test('closing the tour restores the previous tab and focus', async ({ page }) => {
  await mockApi(page, { db: { gus: [] } });
  await signIn(page, 'gus');
  await newProjectButton(page).click();
  await tab(page, 'Layout').click();
  await expect(tab(page, 'Layout')).toHaveAttribute('aria-selected', 'true');

  const showMeHow = page.getByRole('button', { name: 'Show me how' });
  await showMeHow.click();
  await page.getByRole('button', { name: 'Show me!' }).click();
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('button', { name: 'Next' }).click();
  await expect(tab(page, 'Picture')).toHaveAttribute('aria-selected', 'true');

  await page.keyboard.press('Escape');
  await expect(anyTour(page)).toHaveCount(0);
  await expect(tab(page, 'Layout')).toHaveAttribute('aria-selected', 'true');
  await expect(showMeHow).toBeFocused();
});

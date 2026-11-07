import { test, expect } from '@playwright/test';
import { mockApi, signIn, project, projectButton, titleInput, cardThumb } from './helpers.js';

const threeCards = () => project('p1', 'Three Cards', [{ title: 'Card A' }, { title: 'Card B' }, { title: 'Card C' }]);
const printSheetTitles = (page) => page.locator('.print-only .print-card .card-title');

async function openPrintDialog(page) {
  const api = await mockApi(page, { db: { fay: [threeCards()] } });
  await signIn(page, 'fay');
  await projectButton(page, 'Three Cards').click();
  await expect(titleInput(page)).toHaveValue('Card A');
  // Record print calls, and whether the print dialog was still open at the time.
  await page.evaluate(() => {
    window.__printed = 0;
    window.print = () => {
      window.__printed += 1;
      window.__dialogOpenAtPrint = !!document.querySelector('dialog[open]');
    };
  });
  await page.getByRole('button', { name: 'Print', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Print your cards' });
  await expect(dialog).toBeVisible();
  return { api, dialog };
}

const checkbox = (dialog, n, title) => dialog.getByRole('checkbox', { name: new RegExp(`^${n}\\. ${title}\\b`) });
// The real checkbox is visually hidden; people click the card tile (its label).
const tile = (dialog, n, title) => dialog.getByText(`${n}. ${title}`, { exact: true });

test('the print dialog toggles selectedForPrint and prints only the chosen cards', async ({ page }) => {
  const { api, dialog } = await openPrintDialog(page);
  const printButton = dialog.getByRole('button', { name: /^Print \d+ cards?$/ });

  await expect(dialog.getByRole('checkbox')).toHaveCount(3);
  for (const [n, t] of [[1, 'Card A'], [2, 'Card B'], [3, 'Card C']]) await expect(checkbox(dialog, n, t)).toBeChecked();
  await expect(printButton).toHaveText('Print 3 cards');

  await tile(dialog, 2, 'Card B').click();
  await expect(checkbox(dialog, 2, 'Card B')).not.toBeChecked();
  await expect(printButton).toHaveText('Print 2 cards');
  await expect(printSheetTitles(page)).toHaveText(['Card A', 'Card C']);
  await expect.poll(() => api.lastSaved()?.cards.map(c => c.selectedForPrint), { timeout: 5000 })
    .toEqual([true, false, true]);

  await dialog.getByRole('button', { name: 'Choose none' }).click();
  await expect(printButton).toHaveText('Print 0 cards');
  await expect(printButton).toBeDisabled();
  await expect(page.locator('.print-only .print-card')).toHaveCount(0);

  await dialog.getByRole('button', { name: 'Choose all' }).click();
  await expect(printButton).toHaveText('Print 3 cards');
  await expect(page.locator('.print-only .print-card')).toHaveCount(3);

  await tile(dialog, 1, 'Card A').click();
  await tile(dialog, 3, 'Card C').click();
  await expect(printButton).toHaveText('Print 1 card');
  await printButton.click();

  await expect(dialog).toBeHidden();
  await expect.poll(() => page.evaluate(() => window.__printed)).toBe(1);
  expect(await page.evaluate(() => window.__dialogOpenAtPrint)).toBe(false);
  await expect(printSheetTitles(page)).toHaveText(['Card B']);
  await expect(cardThumb(page, 1, 'Card A')).toContainText('Not printing');
  await expect(cardThumb(page, 2, 'Card B')).not.toContainText('Not printing');
  await expect.poll(() => api.lastSaved()?.cards.map(c => c.selectedForPrint), { timeout: 5000 })
    .toEqual([false, true, false]);
});

test('closing the print dialog does not print', async ({ page }) => {
  const { dialog } = await openPrintDialog(page);
  await dialog.getByRole('button', { name: 'Not yet' }).click();
  await expect(dialog).toBeHidden();

  await page.getByRole('button', { name: 'Print', exact: true }).click();
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();

  await page.waitForTimeout(300); // print is called 50 ms after the dialog closes
  expect(await page.evaluate(() => window.__printed)).toBe(0);
});

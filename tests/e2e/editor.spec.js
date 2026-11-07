import { test, expect } from '@playwright/test';
import {
  mockApi, signIn, project, titleInput, closeProject, newProjectButton, projectButton, projectNameInput,
  tab, cardThumbs, cardThumb, stripButton, preview, undoButton, redoButton,
  moveEarlierButton, moveLaterButton, expectCardOrder,
} from './helpers.js';

const threeCards = () => project('p1', 'Three Cards', [{ title: 'Card A' }, { title: 'Card B' }, { title: 'Card C' }]);
const twoCards = () => project('p1', 'Two Cards', [{ title: 'Card A', text: 'aaa' }, { title: 'Card B', text: 'bbb' }]);

const toast = (page, text) => page.getByRole('status').filter({ hasText: text });

async function openSeeded(page, user, proj) {
  const api = await mockApi(page, { db: { [user]: [proj] } });
  await signIn(page, user);
  await projectButton(page, proj.name).click();
  await expect(titleInput(page)).toHaveValue(proj.cards[0].title);
  return api;
}

test('card edits, shared look, rename and print selection all persist', async ({ page }) => {
  const api = await mockApi(page, { db: { erin: [] } });
  await signIn(page, 'erin');
  await newProjectButton(page).click();

  await stripButton(page, 'Add a card').click();
  await stripButton(page, 'Add a card').click();
  await expect(cardThumbs(page)).toHaveCount(3);
  await expect(titleInput(page)).toHaveValue('Card 3');
  await expect(cardThumb(page, 3, 'Card 3')).toHaveAttribute('aria-current', 'true');

  await tab(page, 'Layout').click();
  await page.getByLabel('Card height', { exact: true }).fill('300');
  await page.getByRole('button', { name: 'Use this look on all cards' }).click();
  await expect(toast(page, 'All 3 cards now have this look.')).toBeVisible();

  await cardThumb(page, 2, 'Card 2').click();
  await stripButton(page, 'Delete').click();
  await expect(cardThumbs(page)).toHaveCount(2);

  await page.getByRole('button', { name: 'Print', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Print your cards' });
  await dialog.getByText('1. My Card', { exact: true }).click(); // the tile is the checkbox's label
  await expect(dialog.getByRole('checkbox', { name: /^1\. My Card\b/ })).not.toBeChecked();
  await dialog.getByRole('button', { name: 'Not yet' }).click();
  await expect(dialog).toBeHidden();
  await expect(cardThumb(page, 1, 'My Card')).toContainText('Not printing');

  await projectNameInput(page).fill('Renamed');

  await expect.poll(() => api.lastSaved()?.name, { timeout: 5000 }).toBe('Renamed');
  const saved = api.lastSaved();
  expect(saved.cards.map(c => c.title)).toEqual(['My Card', 'Card 3']);
  expect(saved.cards.map(c => c.cardHeight)).toEqual([300, 300]);
  expect(saved.cards.map(c => c.selectedForPrint)).toEqual([false, true]);
  await expect(page.locator('.print-only .print-card')).toHaveCount(1);
});

test('switching between projects shows the right cards', async ({ page }) => {
  await mockApi(page, {
    db: { erin: [project('p1', 'Two Cards', [{ title: 'First' }, { title: 'Second' }])] },
  });
  await signIn(page, 'erin');

  await newProjectButton(page).click();
  await expect(cardThumbs(page)).toHaveCount(1);
  await expect(titleInput(page)).toHaveValue('My Card');
  await closeProject(page);

  await projectButton(page, 'Two Cards').click();
  await expect(cardThumbs(page)).toHaveCount(2);
  await expect(titleInput(page)).toHaveValue('First');
  await expect(preview(page).getByRole('heading', { name: 'First' })).toBeVisible();

  await cardThumb(page, 2, 'Second').click();
  await expect(titleInput(page)).toHaveValue('Second');
  await expect(preview(page).getByRole('heading', { name: 'Second' })).toBeVisible();
});

test('the words tab edits title, words, sizes and fonts', async ({ page }) => {
  const api = await mockApi(page, { db: { erin: [] } });
  await signIn(page, 'erin');
  await newProjectButton(page).click();

  await titleInput(page).fill('Volcanoes');
  await page.getByLabel('Your words', { exact: true }).fill('Hot rocks');
  await page.getByLabel('Title size', { exact: true }).fill('60');
  await page.getByLabel('Words size', { exact: true }).fill('24');
  await page.getByText('Change the fonts').click();
  await page.getByRole('radiogroup', { name: 'Title font' }).getByRole('radio', { name: 'Bubbly' }).click();

  await expect(preview(page).getByRole('heading', { name: 'Volcanoes' })).toHaveCSS('font-size', '60px');
  await expect(preview(page).getByText('Hot rocks')).toHaveCSS('font-size', '24px');
  await expect.poll(() => api.lastSaved()?.cards[0].titleFont, { timeout: 5000 }).toBe("'Fredoka', sans-serif");
  expect(api.lastSaved().cards[0]).toMatchObject({ title: 'Volcanoes', text: 'Hot rocks', titleSize: 60, textSize: 24 });
});

test.describe('undo and redo', () => {
  test('a card edit can be undone and redone with the buttons', async ({ page }) => {
    const api = await mockApi(page, { db: { erin: [] } });
    await signIn(page, 'erin');
    await newProjectButton(page).click();
    await expect(undoButton(page)).toBeDisabled();
    await expect(redoButton(page)).toBeDisabled();

    await titleInput(page).fill('First edit');
    await expect(undoButton(page)).toBeEnabled();

    await undoButton(page).click();
    await expect(titleInput(page)).toHaveValue('My Card');
    await expect(preview(page).getByRole('heading', { name: 'My Card' })).toBeVisible();
    await expect(undoButton(page)).toBeDisabled();
    await expect(redoButton(page)).toBeEnabled();
    await expect.poll(() => api.lastSaved()?.cards[0].title, { timeout: 5000 }).toBe('My Card');

    await redoButton(page).click();
    await expect(titleInput(page)).toHaveValue('First edit');
    await expect(redoButton(page)).toBeDisabled();
    await expect.poll(() => api.lastSaved()?.cards[0].title, { timeout: 5000 }).toBe('First edit');
  });

  test('a card edit can be undone and redone with the keyboard', async ({ page }) => {
    await mockApi(page, { db: { erin: [] } });
    await signIn(page, 'erin');
    await newProjectButton(page).click();

    await titleInput(page).fill('Keyboard edit');
    await page.keyboard.press('ControlOrMeta+z');
    await expect(titleInput(page)).toHaveValue('My Card');
    await page.keyboard.press('ControlOrMeta+Shift+z');
    await expect(titleInput(page)).toHaveValue('Keyboard edit');

    await page.keyboard.press('Control+z');
    await expect(titleInput(page)).toHaveValue('My Card');
    await page.keyboard.press('Control+y');
    await expect(titleInput(page)).toHaveValue('Keyboard edit');
  });

  test('rapid typing undoes as one step, a later edit as another', async ({ page }) => {
    await mockApi(page, { db: { erin: [] } });
    await signIn(page, 'erin');
    await newProjectButton(page).click();

    await titleInput(page).fill('');
    await titleInput(page).pressSequentially('Bees');
    await expect(titleInput(page)).toHaveValue('Bees');
    await page.waitForTimeout(1000); // past the 800 ms grouping window
    await page.getByLabel('Your words', { exact: true }).fill('They make honey');

    await undoButton(page).click();
    await expect(page.getByLabel('Your words', { exact: true })).not.toHaveValue('They make honey');
    await expect(titleInput(page)).toHaveValue('Bees');

    await undoButton(page).click();
    await expect(titleInput(page)).toHaveValue('My Card');
    await expect(undoButton(page)).toBeDisabled();
  });

  test('undo history does not leak into another project', async ({ page }) => {
    await openSeeded(page, 'erin', twoCards());
    await titleInput(page).fill('Changed');
    await expect(undoButton(page)).toBeEnabled();
    await closeProject(page);

    await newProjectButton(page).click();
    await expect(undoButton(page)).toBeDisabled();
    await page.keyboard.press('Control+z');
    await expect(titleInput(page)).toHaveValue('My Card');
  });
});

test.describe('the card strip', () => {
  test('deleting a card shows a toast whose Undo brings it back', async ({ page }) => {
    const api = await openSeeded(page, 'erin', threeCards());

    await cardThumb(page, 2, 'Card B').click();
    await stripButton(page, 'Delete').click();

    await expectCardOrder(page, ['Card A', 'Card C']);
    await expect(titleInput(page)).toHaveValue('Card A');
    const deleted = toast(page, 'Card deleted.');
    await expect(deleted).toBeVisible();
    await expect.poll(() => api.lastSaved()?.cards.map(c => c.title), { timeout: 5000 }).toEqual(['Card A', 'Card C']);

    await deleted.getByRole('button', { name: 'Undo' }).click();
    await expect(deleted).toBeHidden();
    await expectCardOrder(page, ['Card A', 'Card B', 'Card C']);
    await expect.poll(() => api.lastSaved()?.cards.map(c => c.title), { timeout: 5000 }).toEqual(['Card A', 'Card B', 'Card C']);
    expect(api.lastSaved().cards.map(c => c.id)).toEqual([1, 2, 3]);
  });

  test('the last card cannot be deleted', async ({ page }) => {
    await mockApi(page, { db: { erin: [] } });
    await signIn(page, 'erin');
    await newProjectButton(page).click();
    await expect(stripButton(page, 'Delete')).toBeDisabled();
  });

  test('Copy and Move reorder the cards in the saved project', async ({ page }) => {
    const api = await openSeeded(page, 'erin', twoCards());
    await expect(moveEarlierButton(page)).toBeDisabled();

    await stripButton(page, 'Copy').click();
    await expect(toast(page, 'Made a copy of your card.')).toBeVisible();
    await expect(cardThumbs(page)).toHaveCount(3);
    await expect(cardThumb(page, 2, 'Card A')).toHaveAttribute('aria-current', 'true');
    await titleInput(page).fill('Copy of A');

    await moveLaterButton(page).click();
    await expectCardOrder(page, ['Card A', 'Card B', 'Copy of A']);
    await expect(cardThumb(page, 3, 'Copy of A')).toHaveAttribute('aria-current', 'true');
    await expect(moveLaterButton(page)).toBeDisabled();

    await expect.poll(() => api.lastSaved()?.cards.map(c => c.title), { timeout: 5000 })
      .toEqual(['Card A', 'Card B', 'Copy of A']);
    const copy = api.lastSaved().cards[2];
    expect(copy.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(copy.text).toBe('aaa');

    await moveEarlierButton(page).click();
    await moveEarlierButton(page).click();
    await expectCardOrder(page, ['Copy of A', 'Card A', 'Card B']);
    await expect(moveEarlierButton(page)).toBeDisabled();
    await expect.poll(() => api.lastSaved()?.cards.map(c => c.title), { timeout: 5000 })
      .toEqual(['Copy of A', 'Card A', 'Card B']);
    expect(api.lastSaved().cards.map(c => c.id)).toEqual([copy.id, 1, 2]);
  });
});

test.describe('colors and layout', () => {
  test('picking the Sunshine theme changes the card colors', async ({ page }) => {
    const api = await mockApi(page, { db: { erin: [] } });
    await signIn(page, 'erin');
    await newProjectButton(page).click();
    await tab(page, 'Colors').click();

    const sunshine = page.getByRole('radiogroup', { name: 'Pick a look' }).getByRole('radio', { name: 'Sunshine', exact: true });
    await expect(sunshine).toHaveAttribute('aria-checked', 'false');
    await sunshine.click();
    await expect(sunshine).toHaveAttribute('aria-checked', 'true');
    // Swatches are labelled by color name ("Lemon"); older builds used the hex value.
    const background = (name, hex) => page.getByRole('radiogroup', { name: 'Background color' })
      .getByRole('radio', { name: new RegExp(`^(${name}|${hex})$`) });
    await expect(background('Lemon', '#fff3c4'))
      .toHaveAttribute('aria-checked', 'true');
    await expect(preview(page).locator('.card-preview')).toHaveCSS('background-color', 'rgb(255, 243, 196)');

    await expect.poll(() => api.lastSaved()?.cards[0].cardBg, { timeout: 5000 }).toBe('#fff3c4');
    expect(api.lastSaved().cards[0]).toMatchObject({ textColor: '#4a3200', borderColor: '#f4a300', borderWidth: 6, title: 'My Card' });

    // Changing one color afterwards leaves the theme.
    await background('Sky blue', '#dff3ff').click();
    await expect(sunshine).toHaveAttribute('aria-checked', 'false');
    await expect.poll(() => api.lastSaved()?.cards[0].cardBg, { timeout: 5000 }).toBe('#dff3ff');
  });

  test('"Use this look on all cards" copies the look but not the words', async ({ page }) => {
    const api = await openSeeded(page, 'erin', twoCards());
    await tab(page, 'Colors').click();
    await page.getByRole('radio', { name: 'Sunshine', exact: true }).click();
    await tab(page, 'Layout').click();
    await page.getByLabel('Card height', { exact: true }).fill('300');
    // Edits less than 800 ms apart share one undo step; keep this one separate
    // so the toast's Undo below only reverts "use this look".
    await page.waitForTimeout(1000);

    await page.getByRole('button', { name: 'Use this look on all cards' }).click();
    const applied = toast(page, 'All 2 cards now have this look.');
    await expect(applied).toBeVisible();

    await expect.poll(() => api.lastSaved()?.cards.map(c => c.cardBg), { timeout: 5000 }).toEqual(['#fff3c4', '#fff3c4']);
    const cards = api.lastSaved().cards;
    expect(cards.map(c => c.cardHeight)).toEqual([300, 300]);
    expect(cards.map(c => c.borderColor)).toEqual(['#f4a300', '#f4a300']);
    expect(cards.map(c => c.title)).toEqual(['Card A', 'Card B']);
    expect(cards.map(c => c.text)).toEqual(['aaa', 'bbb']);

    // The toast's Undo puts the other card back as it was.
    await applied.getByRole('button', { name: 'Undo' }).click();
    await expect.poll(() => api.lastSaved()?.cards[1].cardBg ?? null, { timeout: 5000 }).toBe(null);
    expect(api.lastSaved().cards[0].cardBg).toBe('#fff3c4');
  });

  test('the shared-look button only appears with two or more cards', async ({ page }) => {
    await mockApi(page, { db: { erin: [] } });
    await signIn(page, 'erin');
    await newProjectButton(page).click();
    const button = page.getByRole('button', { name: 'Use this look on all cards' });
    await expect(button).toHaveCount(0);
    await stripButton(page, 'Add a card').click();
    await expect(button).toBeVisible();
    await stripButton(page, 'Delete').click();
    await expect(button).toHaveCount(0);
  });

  test('switching Wide to Tall makes the card vertical', async ({ page }) => {
    const api = await mockApi(page, { db: { erin: [] } });
    await signIn(page, 'erin');
    await newProjectButton(page).click();
    await tab(page, 'Layout').click();

    const shape = page.getByRole('radiogroup', { name: 'Card shape' });
    await expect(shape.getByRole('radio', { name: 'Wide' })).toHaveAttribute('aria-checked', 'true');
    await shape.getByRole('radio', { name: 'Tall' }).click();
    await expect(shape.getByRole('radio', { name: 'Tall' })).toHaveAttribute('aria-checked', 'true');
    await expect(preview(page).locator('.card-preview')).toHaveClass(/\bvertical\b/);
    await expect(page.getByLabel('Card height', { exact: true })).toHaveValue('640');

    await expect.poll(() => api.lastSaved()?.cards[0].orientation, { timeout: 5000 }).toBe('vertical');
    expect(api.lastSaved().cards[0].cardHeight).toBe(640);

    await shape.getByRole('radio', { name: 'Wide' }).click();
    await expect.poll(() => api.lastSaved()?.cards[0].orientation, { timeout: 5000 }).toBe('horizontal-left');
    expect(api.lastSaved().cards[0].cardHeight).toBe(530);
  });
});

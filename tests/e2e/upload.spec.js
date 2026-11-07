import { test, expect } from '@playwright/test';
import { mockApi, signIn, newProjectButton, tab, preview, saveStatus } from './helpers.js';

const PNG = Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex');

async function openPictureTab(page) {
  await newProjectButton(page).click();
  await tab(page, 'Picture').click();
  await expect(tab(page, 'Picture')).toHaveAttribute('aria-selected', 'true');
  return page.locator('#picture-file');
}

// Errors are shown inline now; a native alert() would be a regression.
let nativeDialogs;
test.beforeEach(async ({ page }) => {
  nativeDialogs = [];
  page.on('dialog', d => { nativeDialogs.push(d.message()); d.dismiss(); });
});
test.afterEach(() => {
  expect(nativeDialogs).toEqual([]);
});

test('SVG files are refused before anything is uploaded', async ({ page }) => {
  const api = await mockApi(page, { db: { carol: [] } });
  await signIn(page, 'carol');
  const fileInput = await openPictureTab(page);
  await expect(fileInput).toHaveAttribute('accept', 'image/png,image/jpeg,image/gif,image/webp');

  await fileInput.setInputFiles({ name: 'x.svg', mimeType: 'image/svg+xml', buffer: Buffer.from('<svg/>') });

  await expect(page.getByRole('alert')).toContainText('PNG, JPEG, GIF or WebP');
  await expect(fileInput).toHaveAttribute('aria-describedby', /.+/);
  expect(api.uploads()).toHaveLength(0);
  await expect(preview(page).locator('img')).toHaveCount(0);
});

test('a PNG upload sets the card image', async ({ page }) => {
  const api = await mockApi(page, { db: { carol: [] } });
  await signIn(page, 'carol');
  const fileInput = await openPictureTab(page);

  await fileInput.setInputFiles({ name: 'a.png', mimeType: 'image/png', buffer: PNG });

  await expect(preview(page).locator('img')).toHaveAttribute('src', '/api/image?id=test-image');
  await expect(page.getByRole('img', { name: 'The picture on this card' })).toHaveAttribute('src', '/api/image?id=test-image');
  await expect(page.getByRole('alert')).toHaveCount(0);
  const upload = api.uploads()[0];
  expect(upload.body.data).toMatch(/^data:image\/png;base64,/);
  expect(upload.body.fileName).toBe('a.png');
  expect(upload.body.contentType).toBeUndefined();

  await expect.poll(() => api.lastSaved()?.cards[0].imageUrl, { timeout: 5000 }).toBe('/api/image?id=test-image');
});

test('an upload error (non-JSON 413) is reported inline instead of hanging', async ({ page }) => {
  const api = await mockApi(page, { db: { carol: [] } });
  api.uploadResponse = { status: 413, body: 'Request Entity Too Large', contentType: 'text/plain' };
  await signIn(page, 'carol');
  const fileInput = await openPictureTab(page);

  await fileInput.setInputFiles({ name: 'a.png', mimeType: 'image/png', buffer: PNG });

  await expect(page.getByRole('alert')).toHaveText(/too big/);
  expect(api.uploads()).toHaveLength(1);
  // Not stuck in "Uploading…", and the card is unchanged.
  await expect(page.getByText('Choose a picture')).toBeVisible();
  await expect(page.getByText('Uploading your picture…')).toHaveCount(0);
  await expect(preview(page).locator('img')).toHaveCount(0);
  // The new project itself still saves normally.
  await expect(saveStatus(page)).toHaveText('All saved', { timeout: 5000 });
});

test('an upload server error (500) is reported inline', async ({ page }) => {
  const api = await mockApi(page, { db: { carol: [] } });
  api.uploadResponse = { status: 500, json: { error: 'disk full' } };
  await signIn(page, 'carol');
  const fileInput = await openPictureTab(page);

  await fileInput.setInputFiles({ name: 'a.png', mimeType: 'image/png', buffer: PNG });

  await expect(page.getByRole('alert')).toHaveText('The picture didn\'t upload: disk full');
  await expect(preview(page).locator('img')).toHaveCount(0);
});

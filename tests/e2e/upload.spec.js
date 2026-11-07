import { test, expect } from '@playwright/test';
import { mockApi, signIn } from './helpers.js';

const PNG = Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex');

test('SVG files are refused before anything is uploaded', async ({ page }) => {
  const api = await mockApi(page, { db: { carol: [] } });
  await signIn(page, 'carol');
  await page.locator('.new-project').click();

  const fileInput = page.locator('input[type=file]');
  await expect(fileInput).toHaveAttribute('accept', 'image/png,image/jpeg,image/gif,image/webp');

  // The alert fires inside the change event, so it must be dismissed from a
  // handler or setInputFiles would wait on it forever.
  let message = null;
  page.once('dialog', d => { message = d.message(); d.dismiss(); });
  await fileInput.setInputFiles({ name: 'x.svg', mimeType: 'image/svg+xml', buffer: Buffer.from('<svg/>') });
  await expect.poll(() => message).toMatch(/PNG, JPEG, GIF or WebP/);
  expect(api.requests.filter(r => r.path === '/api/upload')).toHaveLength(0);
});

test('a PNG upload sets the card image', async ({ page }) => {
  const api = await mockApi(page, { db: { carol: [] } });
  await signIn(page, 'carol');
  await page.locator('.new-project').click();

  await page.locator('input[type=file]').setInputFiles({ name: 'a.png', mimeType: 'image/png', buffer: PNG });

  await expect(page.locator('.viewport img')).toHaveAttribute('src', '/api/image?id=test-image');
  const upload = api.requests.find(r => r.path === '/api/upload');
  expect(upload.body.data).toMatch(/^data:image\/png;base64,/);
  expect(upload.body.contentType).toBeUndefined();
});

test('an upload error (non-JSON 413) is reported instead of hanging', async ({ page }) => {
  const api = await mockApi(page, { db: { carol: [] } });
  api.uploadResponse = { status: 413, body: 'Request Entity Too Large', contentType: 'text/plain' };
  await signIn(page, 'carol');
  await page.locator('.new-project').click();

  const alert = page.waitForEvent('dialog');
  await page.locator('input[type=file]').setInputFiles({ name: 'a.png', mimeType: 'image/png', buffer: PNG });
  const dialog = await alert;
  expect(dialog.message()).toMatch(/Upload failed: HTTP 413/);
  await dialog.dismiss();
  await expect(page.getByText('Sync Paused (Local Only)')).toBeVisible();
});

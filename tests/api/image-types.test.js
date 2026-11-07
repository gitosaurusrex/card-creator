import { test } from 'node:test';
import assert from 'node:assert/strict';
import { detectImageType, decodeBase64Payload } from '../../lib/image-types.js';
import { PNG } from './helpers.js';

test('detects the four supported formats from their bytes', () => {
  assert.equal(detectImageType(PNG), 'image/png');
  assert.equal(detectImageType(Buffer.from('ffd8ffe000104a4649460001', 'hex')), 'image/jpeg');
  assert.equal(detectImageType(Buffer.from('GIF89a\x01\x00\x01\x00\x00\x00', 'latin1')), 'image/gif');
  assert.equal(detectImageType(Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBPVP8 ')])), 'image/webp');
});

test('rejects markup and anything too short to identify', () => {
  assert.equal(detectImageType(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>')), null);
  assert.equal(detectImageType(Buffer.from('<html><script>alert(1)</script></html>')), null);
  assert.equal(detectImageType(Buffer.alloc(3)), null);
  assert.equal(detectImageType('not a buffer'), null);
});

test('decodes bare base64 and data: URLs, ignoring the claimed type', () => {
  assert.deepEqual(decodeBase64Payload(PNG.toString('base64')), PNG);
  assert.deepEqual(decodeBase64Payload(`data:text/html;base64,${PNG.toString('base64')}`), PNG);
  assert.equal(decodeBase64Payload(42), null);
});

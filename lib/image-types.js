// Image formats we accept and serve. The type is always derived from the
// file's own bytes, never from a client-supplied Content-Type, so a file
// that isn't really one of these images can't be stored or served (e.g. an
// HTML or SVG payload that would run script on our origin).

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

export function detectImageType(buf) {
    if (!Buffer.isBuffer(buf) || buf.length < 12) return null;

    if (buf.subarray(0, 8).equals(PNG_SIGNATURE)) return 'image/png';
    if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';

    const head6 = buf.subarray(0, 6).toString('latin1');
    if (head6 === 'GIF87a' || head6 === 'GIF89a') return 'image/gif';

    if (buf.subarray(0, 4).toString('latin1') === 'RIFF' &&
        buf.subarray(8, 12).toString('latin1') === 'WEBP') {
        return 'image/webp';
    }

    return null;
}

// Accepts either a bare base64 string or a data: URL and returns the bytes.
export function decodeBase64Payload(data) {
    if (typeof data !== 'string') return null;
    const commaIndex = data.indexOf(',');
    const base64 = data.startsWith('data:') && commaIndex !== -1
        ? data.slice(commaIndex + 1)
        : data;
    return Buffer.from(base64, 'base64');
}

import { sql } from '@vercel/postgres';
import { detectImageType, decodeBase64Payload } from '../lib/image-types.js';

export default async function handler(req, res) {
    try {
        if (req.method !== 'GET' && req.method !== 'HEAD') {
            return res.status(405).end();
        }

        const { id } = req.query;
        if (typeof id !== 'string' || id.length === 0 || id.length > 64) {
            return res.status(400).end();
        }

        const { rows } = await sql`
            SELECT data FROM images WHERE id = ${id}
        `;

        if (rows.length === 0) {
            return res.status(404).end();
        }

        const buffer = decodeBase64Payload(rows[0].data);

        // Never trust the stored content_type: older uploads accepted any
        // client-supplied type. Only serve bytes that are really an image.
        const contentType = detectImageType(buffer);
        if (!contentType) {
            return res.status(404).end();
        }

        res.setHeader('Content-Type', contentType);
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");
        res.setHeader('Cache-Control', 'private, max-age=31536000, immutable');
        return res.send(buffer);

    } catch (error) {
        console.error("Image Fetch Error:", error);
        return res.status(500).end();
    }
}

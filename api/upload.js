import { randomUUID } from 'node:crypto';
import { sql } from '@vercel/postgres';
import { createClerkClient } from '@clerk/backend';
import { detectImageType, decodeBase64Payload } from '../lib/image-types.js';

export const config = {
    api: {
        bodyParser: {
            sizeLimit: '4.5mb',
        },
    },
};

// Vercel caps request bodies at 4.5 MB and base64 adds ~33%, so 3 MB of
// image data is the largest upload that reliably fits.
const MAX_IMAGE_BYTES = 3 * 1024 * 1024;

// Per-user storage quota (images are stored as base64 in Postgres).
const MAX_IMAGES_PER_USER = 200;
const MAX_STORED_BASE64_CHARS_PER_USER = 100 * 1024 * 1024;

export default async function handler(req, res) {
    res.setHeader('Content-Type', 'application/json');

    try {
        const secretKey = process.env.CLERK_SECRET_KEY || process.env.CLERK_API_KEY;
        const publishableKey = process.env.CLERK_PUBLISHABLE_KEY || process.env.VITE_CLERK_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

        if (!secretKey) {
            return res.status(500).send(JSON.stringify({ error: "Configuration Error" }));
        }

        const clerkClient = createClerkClient({ secretKey, publishableKey });
        const protocol = req.headers['x-forwarded-proto'] || 'https';
        const hostname = req.headers['host'];
        const fullUrl = new URL(req.url, `${protocol}://${hostname}`).toString();

        const requestState = await clerkClient.authenticateRequest(new Request(fullUrl, {
            method: req.method,
            headers: new Headers(req.headers)
        }));

        const userId = requestState.isSignedIn ? requestState.toAuth().userId : null;
        if (!userId) {
            return res.status(401).send(JSON.stringify({ error: "Unauthorized" }));
        }

        if (req.method !== 'POST') {
            return res.status(405).send(JSON.stringify({ error: "Method not allowed" }));
        }

        const { data, fileName } = req.body || {};
        const bytes = decodeBase64Payload(data);
        if (!bytes || bytes.length === 0) {
            return res.status(400).send(JSON.stringify({ error: "No data provided" }));
        }
        if (bytes.length > MAX_IMAGE_BYTES) {
            return res.status(413).send(JSON.stringify({ error: "Image is too large (max 3 MB)" }));
        }

        const contentType = detectImageType(bytes);
        if (!contentType) {
            return res.status(415).send(JSON.stringify({ error: "Only PNG, JPEG, GIF and WebP images are supported" }));
        }

        const base64 = bytes.toString('base64');

        const { rows: [usage] } = await sql`
            SELECT COUNT(*)::int AS count, COALESCE(SUM(LENGTH(data)), 0)::bigint AS chars
            FROM images WHERE user_id = ${userId}
        `;
        if (usage.count >= MAX_IMAGES_PER_USER ||
            Number(usage.chars) + base64.length > MAX_STORED_BASE64_CHARS_PER_USER) {
            return res.status(413).send(JSON.stringify({ error: "Image storage limit reached. Delete unused projects to free space." }));
        }

        const id = randomUUID();
        const safeFileName = typeof fileName === 'string' && fileName ? fileName.slice(0, 255) : 'upload';
        await sql`
            INSERT INTO images (id, user_id, data, content_type, file_name)
            VALUES (${id}, ${userId}, ${base64}, ${contentType}, ${safeFileName})
        `;

        return res.status(200).send(JSON.stringify({
            url: `/api/image?id=${id}`,
            success: true
        }));
    } catch (error) {
        console.error("Upload Error:", error);
        return res.status(500).send(JSON.stringify({ error: "Upload Failed" }));
    }
}

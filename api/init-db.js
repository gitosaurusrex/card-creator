import { createHash, timingSafeEqual } from 'node:crypto';
import { sql } from '@vercel/postgres';

// Creates the schema. Disabled unless INIT_DB_SECRET is set, and then only
// callable with:  POST /api/init-db  Authorization: Bearer <INIT_DB_SECRET>
function isAuthorized(req, secret) {
    const header = req.headers.authorization || '';
    const provided = header.startsWith('Bearer ') ? header.slice(7) : '';
    const a = createHash('sha256').update(provided).digest();
    const b = createHash('sha256').update(secret).digest();
    return provided.length > 0 && timingSafeEqual(a, b);
}

export default async function handler(req, res) {
    res.setHeader('Content-Type', 'application/json');

    const secret = process.env.INIT_DB_SECRET;
    if (!secret) {
        return res.status(404).send(JSON.stringify({ error: "Not found" }));
    }
    if (req.method !== 'POST') {
        return res.status(405).send(JSON.stringify({ error: "Method not allowed" }));
    }
    if (!isAuthorized(req, secret)) {
        return res.status(401).send(JSON.stringify({ error: "Unauthorized" }));
    }

    try {
        await sql`
            CREATE TABLE IF NOT EXISTS projects (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                name TEXT NOT NULL,
                cards JSONB NOT NULL,
                export_name TEXT,
                last_modified TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `;
        await sql`
            CREATE INDEX IF NOT EXISTS projects_user_id_last_modified_idx
            ON projects (user_id, last_modified DESC);
        `;

        await sql`
            CREATE TABLE IF NOT EXISTS images (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                data TEXT NOT NULL,
                content_type TEXT NOT NULL,
                file_name TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `;
        await sql`
            CREATE INDEX IF NOT EXISTS images_user_id_idx ON images (user_id);
        `;

        return res.status(200).send(JSON.stringify({
            status: "success",
            message: "All tables verified/created"
        }));
    } catch (error) {
        console.error("Init-DB Error:", error);
        return res.status(500).send(JSON.stringify({ status: "error", message: "Database initialization failed" }));
    }
}

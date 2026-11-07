import { sql } from '@vercel/postgres';
import { createClerkClient } from '@clerk/backend';

export default async function handler(req, res) {
    res.setHeader('Content-Type', 'application/json');

    try {
        const secretKey = process.env.CLERK_SECRET_KEY || process.env.CLERK_API_KEY;
        const publishableKey = process.env.CLERK_PUBLISHABLE_KEY || process.env.VITE_CLERK_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

        if (!secretKey) {
            return res.status(500).send(JSON.stringify({ error: "Configuration Error", details: "Clerk Secret Key missing" }));
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

        if (req.method === 'GET') {
            const { rows } = await sql`
                SELECT id, name, cards, last_modified FROM projects 
                WHERE user_id = ${userId} 
                ORDER BY last_modified DESC
            `;
            const formatted = rows.map(r => ({
                id: r.id,
                name: r.name,
                cards: typeof r.cards === 'string' ? JSON.parse(r.cards) : r.cards,
                lastModified: r.last_modified
            }));
            return res.status(200).send(JSON.stringify(formatted));
        }

        if (req.method === 'POST') {
            const { id, name, cards } = req.body || {};
            if (typeof id !== 'string' || id.length === 0 || id.length > 64 ||
                typeof name !== 'string' || !Array.isArray(cards)) {
                return res.status(400).send(JSON.stringify({ error: "Missing or invalid fields" }));
            }
            const result = await sql`
                INSERT INTO projects (id, user_id, name, cards, last_modified)
                VALUES (${id}, ${userId}, ${name}, ${JSON.stringify(cards)}, NOW())
                ON CONFLICT (id) DO UPDATE SET
                    name = EXCLUDED.name,
                    cards = EXCLUDED.cards,
                    last_modified = NOW()
                WHERE projects.user_id = ${userId}
            `;
            // No row written means the ID already belongs to another account
            // (possible with older Date.now()-based IDs). Don't report success.
            if (result.rowCount === 0) {
                return res.status(409).send(JSON.stringify({ error: "Project ID is already in use", code: "id_conflict" }));
            }
            return res.status(200).send(JSON.stringify({ success: true }));
        }

        if (req.method === 'DELETE') {
            const { id } = req.query;
            if (!id) return res.status(400).send(JSON.stringify({ error: "Missing ID" }));
            await sql`DELETE FROM projects WHERE id = ${id} AND user_id = ${userId}`;

            // Remove this user's images that no remaining project references.
            // Images younger than an hour are kept: they may belong to an
            // edit that hasn't been saved to the server yet.
            try {
                await sql`
                    DELETE FROM images i
                    WHERE i.user_id = ${userId}
                      AND i.created_at < NOW() - INTERVAL '1 hour'
                      AND NOT EXISTS (
                          SELECT 1 FROM projects p
                          WHERE p.user_id = ${userId}
                            AND strpos(p.cards::text, 'id=' || i.id) > 0
                      )
                `;
            } catch (cleanupError) {
                console.error("Image cleanup failed:", cleanupError);
            }

            return res.status(200).send(JSON.stringify({ success: true }));
        }

        return res.status(405).send(JSON.stringify({ error: "Method not allowed" }));
    } catch (error) {
        console.error("Projects API Error:", error);
        return res.status(500).send(JSON.stringify({
            error: "Internal Server Error",
            message: error.message
        }));
    }
}

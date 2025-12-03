import { Hono } from 'hono'
import { v4 as uuidv4 } from 'uuid';
import { getDb, Env } from '../db'
import { authMiddleware } from '../auth/middleware';

const tiles = new Hono<{ Bindings: Env, Variables: { user: { userId: string, isExpert: boolean } | null } }>()

// Use auth middleware for all tile routes
// For GET, it's optional, but for others it will be required implicitly by checking c.get('user')
tiles.use('*', authMiddleware)

// GET all tiles, with optional domain filtering
tiles.get('/', async (c) => {
    const { domain } = c.req.query()
    const db = getDb(c)

    let query = "SELECT * FROM knowledge_tiles";
    const args: string[] = [];

    if (domain) {
        query += " WHERE domain = ?";
        args.push(domain);
    }
    
    query += " ORDER BY updated_at DESC";

    try {
        const result = await db.execute({ sql: query, args });
        return c.json(result.rows);
    } catch (e) {
        console.error(e);
        return c.json({ error: 'Failed to fetch tiles' }, 500);
    }
});

// POST a new tile
tiles.post('/', async (c) => {
    const user = c.get('user');
    if (!user) {
        return c.json({ error: 'Unauthorized. You must be logged in to create a tile.' }, 401);
    }

    const { content, domain } = await c.req.json<{ content: string; domain: string }>();
    if (!content || !domain) {
        return c.json({ error: 'Content and domain are required.' }, 400);
    }

    const db = getDb(c);
    const tileId = uuidv4();
    const authorMark = user.isExpert ? 'expert' : 'community';

    // Placeholder for "Dendritic Memory Space" coordinates
    const coordinates = {
        x: Math.random() * 100,
        y: Math.random() * 100,
        z: Math.random() * 100,
    };

    try {
        await db.execute({
            sql: `INSERT INTO knowledge_tiles (id, domain, content, coordinates_x, coordinates_y, coordinates_z, author_id, author_mark, updated_at) 
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
            args: [tileId, domain, content, coordinates.x, coordinates.y, coordinates.z, user.userId, authorMark]
        });

        const newTile = await db.execute({ sql: "SELECT * FROM knowledge_tiles WHERE id = ?", args: [tileId] });

        return c.json(newTile.rows[0], 201);
    } catch (e) {
        console.error(e);
        return c.json({ error: 'Failed to create tile' }, 500);
    }
});


// PUT update a tile by ID
tiles.put('/:id', async (c) => {
    const user = c.get('user');
    if (!user) {
        return c.json({ error: 'Unauthorized. You must be logged in to update a tile.' }, 401);
    }

    const { id } = c.req.param();
    const { content, domain } = await c.req.json<{ content: string; domain?: string }>();

    if (!content) {
        return c.json({ error: 'Content is required.' }, 400);
    }

    const db = getDb(c);

    try {
        // Check if tile exists
        const existingTile = await db.execute({
            sql: "SELECT * FROM knowledge_tiles WHERE id = ?",
            args: [id]
        });

        if (existingTile.rows.length === 0) {
            return c.json({ error: 'Tile not found' }, 404);
        }

        // Update tile - any logged-in user can edit any tile
        await db.execute({
            sql: `UPDATE knowledge_tiles
                  SET content = ?, domain = COALESCE(?, domain), updated_at = CURRENT_TIMESTAMP
                  WHERE id = ?`,
            args: [content, domain, id]
        });

        // Fetch updated tile
        const updatedTile = await db.execute({
            sql: "SELECT * FROM knowledge_tiles WHERE id = ?",
            args: [id]
        });

        return c.json(updatedTile.rows[0]);
    } catch (e) {
        console.error(e);
        return c.json({ error: 'Failed to update tile' }, 500);
    }
});

// DELETE a tile by ID
tiles.delete('/:id', async (c) => {
    const user = c.get('user');
    if (!user) {
        return c.json({ error: 'Unauthorized. You must be logged in to delete a tile.' }, 401);
    }

    const { id } = c.req.param();
    const db = getDb(c);

    try {
        // Optional: Add logic to check if the user is the author or has admin rights
        // For now, any logged-in user can delete any tile.
        const result = await db.execute({
            sql: "DELETE FROM knowledge_tiles WHERE id = ?",
            args: [id]
        });

        if (result.rowsAffected === 0) {
            return c.json({ error: 'Tile not found' }, 404);
        }

        return c.json({ message: 'Tile deleted successfully' });
    } catch (e) {
        console.error(e);
        return c.json({ error: 'Failed to delete tile' }, 500);
    }
});

// POST /iath/import - Import tiles from .iath file
tiles.post('/iath/import', async (c) => {
    const user = c.get('user');
    if (!user) {
        return c.json({ error: 'Unauthorized. You must be logged in to import tiles.' }, 401);
    }

    try {
        const formData = await c.req.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return c.json({ error: 'No file provided' }, 400);
        }

        // Read file content
        const fileContent = await file.text();

        // Parse JSON
        let iathData: any;
        try {
            iathData = JSON.parse(fileContent);
        } catch (e) {
            return c.json({ error: 'Invalid JSON format', details: String(e) }, 400);
        }

        // Validate .iath format
        if (!iathData.version || !iathData.header || !iathData.tiles || !Array.isArray(iathData.tiles)) {
            return c.json({ error: 'Invalid .iath file format' }, 400);
        }

        const domain = iathData.header.domain || 'General';
        const db = getDb(c);
        let imported = 0;

        // Import each tile
        for (const tile of iathData.tiles) {
            try {
                const tileId = tile.id || uuidv4();
                const content = tile.content || tile.title || '';
                const coords = tile.coordinates || {};
                const x = coords.x !== undefined ? coords.x : Math.random() * 100;
                const y = coords.y !== undefined ? coords.y : Math.random() * 100;
                const z = coords.z !== undefined ? coords.z : Math.random() * 100;

                // Map verification_status to author_mark
                let authorMark = 'community';
                if (tile.verification_status === 'expert_verified' || tile.author_mark === 'expert') {
                    authorMark = 'expert';
                } else if (tile.author_mark) {
                    authorMark = tile.author_mark;
                }

                // Insert or update tile
                await db.execute({
                    sql: `INSERT INTO knowledge_tiles (id, domain, content, coordinates_x, coordinates_y, coordinates_z, author_id, author_mark, updated_at)
                          VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                          ON CONFLICT(id) DO UPDATE SET
                            content = excluded.content,
                            coordinates_x = excluded.coordinates_x,
                            coordinates_y = excluded.coordinates_y,
                            coordinates_z = excluded.coordinates_z,
                            updated_at = CURRENT_TIMESTAMP`,
                    args: [tileId, domain, content, x, y, z, tile.author_id || user.userId, authorMark]
                });

                imported++;
            } catch (tileError) {
                console.error('Failed to import tile:', tile.id, tileError);
                // Continue with next tile
            }
        }

        return c.json({
            success: true,
            imported,
            total: iathData.tiles.length,
            domain
        });
    } catch (e) {
        console.error('Import error:', e);
        return c.json({ error: 'Failed to import tiles', details: String(e) }, 500);
    }
});


export default tiles;

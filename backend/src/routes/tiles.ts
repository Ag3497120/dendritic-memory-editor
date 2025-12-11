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
        const result = await db.prepare(query).bind(...args).all();
        return c.json(result.results);
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

    const { content, domain, topic } = await c.req.json<{ content: string; domain: string; topic?: string }>();
    if (!content || !domain) {
        return c.json({ error: 'Content and domain are required.' }, 400);
    }

    const db = getDb(c);
    const tileId = uuidv4();
    const authorMark = user.isExpert ? 'expert' : 'community';
    const tileTopic = topic || 'General';

    // Placeholder for "Dendritic Memory Space" coordinates
    const coordinates = {
        x: Math.random() * 100,
        y: Math.random() * 100,
        z: Math.random() * 100,
    };

    try {
        await db.prepare(
            `INSERT INTO knowledge_tiles (id, domain, topic, content, coordinates_x, coordinates_y, coordinates_z, author_id, author_mark, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`
        ).bind(tileId, domain, tileTopic, content, coordinates.x, coordinates.y, coordinates.z, user.userId, authorMark).run();

        const newTile = await db.prepare("SELECT * FROM knowledge_tiles WHERE id = ?").bind(tileId).first();

        return c.json(newTile, 201);
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
    const { content, domain, topic } = await c.req.json<{ content: string; domain?: string; topic?: string }>();

    if (!content) {
        return c.json({ error: 'Content is required.' }, 400);
    }

    const db = getDb(c);

    try {
        // Check if tile exists
        const existingTile = await db.prepare("SELECT * FROM knowledge_tiles WHERE id = ?").bind(id).first();

        if (!existingTile) {
            return c.json({ error: 'Tile not found' }, 404);
        }

        // Update tile - any logged-in user can edit any tile
        await db.prepare(
            `UPDATE knowledge_tiles
             SET content = ?, domain = COALESCE(?, domain), topic = COALESCE(?, topic), updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`
        ).bind(content, domain, topic, id).run();

        // Fetch updated tile
        const updatedTile = await db.prepare("SELECT * FROM knowledge_tiles WHERE id = ?").bind(id).first();

        return c.json(updatedTile);
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
        const result = await db.prepare("DELETE FROM knowledge_tiles WHERE id = ?").bind(id).run();

        if (result.meta.changes === 0) {
            return c.json({ error: 'Tile not found' }, 404);
        }

        return c.json({ message: 'Tile deleted successfully' });
    } catch (e) {
        console.error(e);
        return c.json({ error: 'Failed to delete tile' }, 500);
    }
});

// GET /iath/export - Export tiles as .iath file
tiles.get('/iath/export', async (c) => {
    const { domain } = c.req.query();
    const db = getDb(c);

    let query = "SELECT * FROM knowledge_tiles";
    const args: string[] = [];

    if (domain) {
        query += " WHERE domain = ?";
        args.push(domain);
    }

    query += " ORDER BY updated_at DESC";

    try {
        const result = await db.prepare(query).bind(...args).all();
        const tiles = result.results as any[];

        // Convert to .iath format (JSON version 2)
        const iathTiles = tiles.map((tile: any) => ({
            id: tile.id,
            title: tile.topic || 'Untitled',
            coordinates: {
                x: tile.coordinates_x || 50.0,
                y: tile.coordinates_y || 50.0,
                z: tile.coordinates_z || 50.0
            },
            content: tile.content,
            verification_status: tile.author_mark === 'expert' ? 'expert_verified' : 'community',
            created_at: tile.created_at || new Date().toISOString(),
            updated_at: tile.updated_at || new Date().toISOString(),
            author_id: tile.author_id || 'system',
            author_mark: tile.author_mark || 'community'
        }));

        const domainName = domain || 'General';
        const domainCode = domain === 'Medical' ? 1 : domain === 'AI_Fundamentals' ? 2 : 1;

        const exportData = {
            version: 2,
            header: {
                domain_code: domainCode,
                tile_count: iathTiles.length,
                created_at: new Date().toISOString(),
                domain: domainName
            },
            tiles: iathTiles
        };

        // Set response headers for file download
        c.header('Content-Type', 'application/json');
        c.header('Content-Disposition', `attachment; filename="${domainName}_tiles_${Date.now()}.iath"`);

        return c.json(exportData);
    } catch (e) {
        console.error('Export error:', e);
        return c.json({ error: 'Failed to export tiles', details: String(e) }, 500);
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
        console.log('Parsed iathData:', JSON.stringify(iathData, null, 2));
        console.log('iathData.tiles type:', typeof iathData.tiles);
        console.log('iathData.tiles isArray:', Array.isArray(iathData.tiles));
        console.log('iathData.tiles length:', iathData.tiles?.length);

        if (!iathData.version || !iathData.header || !iathData.tiles || !Array.isArray(iathData.tiles)) {
            return c.json({
                error: 'Invalid .iath file format',
                details: {
                    hasVersion: !!iathData.version,
                    hasHeader: !!iathData.header,
                    hasTiles: !!iathData.tiles,
                    tilesIsArray: Array.isArray(iathData.tiles),
                    tilesType: typeof iathData.tiles
                }
            }, 400);
        }

        const domain = iathData.header.domain || 'General';
        const db = getDb(c);
        let imported = 0;
        const errors: string[] = [];

        console.log(`Starting import of ${iathData.tiles.length} tiles to domain: ${domain}`);

        // Import each tile
        for (const tile of iathData.tiles) {
            try {
                const tileId = tile.id || uuidv4();
                const content = tile.content || tile.title || '';

                if (!content) {
                    errors.push(`Tile ${tileId}: No content found`);
                    continue;
                }

                const coords = tile.coordinates || {};
                const x = coords.x !== undefined ? coords.x : Math.random() * 100;
                const y = coords.y !== undefined ? coords.y : Math.random() * 100;
                const z = coords.z !== undefined ? coords.z : Math.random() * 100;

                // Extract topic from tile data or use title as topic, or default to domain
                const topic = tile.topic || tile.title || domain || 'General';

                // Map verification_status to author_mark
                let authorMark = 'community';
                if (tile.verification_status === 'expert_verified' || tile.author_mark === 'expert') {
                    authorMark = 'expert';
                } else if (tile.author_mark) {
                    authorMark = tile.author_mark;
                }

                console.log(`Importing tile ${tileId}: content length=${content.length}, coords=(${x},${y},${z}), topic=${topic}`);

                // Insert or update tile - always use current user as author since imported author may not exist
                const result = await db.prepare(
                    `INSERT INTO knowledge_tiles (id, domain, topic, content, coordinates_x, coordinates_y, coordinates_z, author_id, author_mark, updated_at)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                     ON CONFLICT(id) DO UPDATE SET
                       content = excluded.content,
                       topic = excluded.topic,
                       coordinates_x = excluded.coordinates_x,
                       coordinates_y = excluded.coordinates_y,
                       coordinates_z = excluded.coordinates_z,
                       updated_at = CURRENT_TIMESTAMP`
                ).bind(tileId, domain, topic, content, x, y, z, user.userId, authorMark).run();

                console.log(`Tile ${tileId} imported successfully. Meta: ${JSON.stringify(result.meta)}`);
                imported++;
            } catch (tileError: any) {
                const errorMsg = `Tile ${tile.id}: ${tileError.message || String(tileError)}`;
                console.error('Failed to import tile:', errorMsg, tileError);
                errors.push(errorMsg);
                // Continue with next tile
            }
        }

        return c.json({
            success: true,
            imported,
            total: iathData.tiles.length,
            domain,
            errors: errors.length > 0 ? errors : undefined
        });
    } catch (e) {
        console.error('Import error:', e);
        return c.json({ error: 'Failed to import tiles', details: String(e) }, 500);
    }
});


export default tiles;

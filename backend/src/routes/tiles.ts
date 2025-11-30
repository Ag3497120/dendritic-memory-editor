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


export default tiles;

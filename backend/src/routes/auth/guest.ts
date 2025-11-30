import { Hono } from 'hono'
import { v4 as uuidv4 } from 'uuid';
import { getDb, Env } from '../../db'
import { createToken } from '../../auth/jwt'

const guest = new Hono<{ Bindings: Env }>()

guest.post('/login', async (c) => {
    const db = getDb(c);
    
    const userId = uuidv4();
    const guestProviderId = `guest_${uuidv4()}`;

    // Create a new temporary user for the guest
    await db.prepare("INSERT INTO users (id, provider, provider_id, username, is_expert) VALUES (?, 'guest', ?, ?, ?)").bind(userId, guestProviderId, 'Guest User', 0).run();
    
    const newUserResult = await db.prepare("SELECT * FROM users WHERE id = ?").bind(userId).first();
    const user = newUserResult;

    if (!user || typeof user.id !== 'string' || typeof user.is_expert !== 'number') {
        return c.json({ error: 'Failed to create guest user' }, 500);
    }

    // Create a JWT for the guest session
    const appToken = await createToken({ userId: user.id, isExpert: user.is_expert === 1 }, c.env);

    return c.json({ token: appToken });
});

export default guest;

import { Hono } from 'hono'
import { v4 as uuidv4 } from 'uuid';
import { getDb, Env } from '../../db'
import { createToken } from '../../auth/jwt'

const orcid = new Hono<{ Bindings: Env }>()

// ORCID uses a different auth flow, we need to specify sandbox or production
const ORCID_BASE_URL = 'https://orcid.org'; // For production

// 1. Redirect user to ORCID's consent screen
orcid.get('/login', async (c) => {
    const state = uuidv4();
    const db = getDb(c);

    await db.prepare("INSERT INTO oauth_states (state) VALUES (?)").bind(state).run();

    const authUrl = new URL(`${ORCID_BASE_URL}/oauth/authorize`);
    authUrl.searchParams.set('client_id', c.env.ORCID_CLIENT_ID);
    const redirect_uri = new URL(c.req.url).origin + '/api/auth/orcid/callback';
    authUrl.searchParams.set('redirect_uri', redirect_uri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', '/authenticate');
    authUrl.searchParams.set('state', state);

    return c.redirect(authUrl.toString());
});

// 2. Handle the callback from ORCID
orcid.get('/callback', async (c) => {
    const { code, state } = c.req.query();
    const db = getDb(c);

    if (!state || !code) {
        return c.json({ error: 'Invalid request' }, 400);
    }

    // Verify state
    const stateRecord = await db.prepare("SELECT state FROM oauth_states WHERE state = ? AND created_at > datetime('now', '-10 minutes')").bind(state).first();

    if (!stateRecord) { // D1 .first() returns null if no record
        return c.json({ error: 'Invalid or expired state' }, 400);
    }
    await db.prepare("DELETE FROM oauth_states WHERE state = ?").bind(state).run();

    // Exchange code for token
    const redirect_uri = new URL(c.req.url).origin + '/api/auth/orcid/callback';
    const tokenResponse = await fetch(`${ORCID_BASE_URL}/oauth/token`, {
        method: 'POST',
        headers: { 
            'Accept': 'application/json',
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
            code,
            client_id: c.env.ORCID_CLIENT_ID,
            client_secret: c.env.ORCID_CLIENT_SECRET,
            redirect_uri,
            grant_type: 'authorization_code',
        }).toString(),
    });

    const tokenData = await tokenResponse.json() as { orcid: string, name: string, error?: string };

    if (tokenData.error || !tokenData.orcid) {
        return c.json({ error: 'Failed to fetch ORCID token', details: tokenData.error }, 500);
    }

    const orcidId = tokenData.orcid;
    const orcidName = tokenData.name || `ORCID User ${orcidId}`;

    // Find or create user in our database
    let user;
    const existingUsersResult = await db.prepare("SELECT * FROM users WHERE provider = 'orcid' AND provider_id = ?").bind(orcidId).all();
    
    if (existingUsersResult.results.length > 0) {
        user = existingUsersResult.results[0];
    } else {
        const userId = uuidv4();
        // ORCID users ARE experts
        await db.prepare("INSERT INTO users (id, provider, provider_id, username, is_expert) VALUES (?, 'orcid', ?, ?, ?)").bind(userId, orcidId, orcidName, 1).run();
        const newUserResult = await db.prepare("SELECT * FROM users WHERE id = ?").bind(userId).first();
        user = newUserResult;
    }

    if (!user || typeof user.id !== 'string' || typeof user.is_expert !== 'number') {
         return c.json({ error: 'Failed to create or retrieve user' }, 500);
    }

    // Create a JWT for our app
    const appToken = await createToken({ userId: user.id, isExpert: user.is_expert === 1 }, c.env);
    
    // Redirect to the frontend callback page with the token
    const callbackUrl = new URL(`/auth/callback`, c.env.FRONTEND_URL);
    callbackUrl.searchParams.set('token', appToken);
    
    return c.redirect(callbackUrl.toString());
});


export default orcid;

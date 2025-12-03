import { Hono } from 'hono'
import { v4 as uuidv4 } from 'uuid';
import { getDb, Env } from '../../db'
import { createToken } from '../../auth/jwt'

const google = new Hono<{ Bindings: Env }>()

// 1. Redirect user to Google's consent screen
google.get('/login', async (c) => {
    const state = uuidv4();
    const db = getDb(c);

    // Store state in DB to prevent CSRF
    await db.prepare("INSERT INTO oauth_states (state) VALUES (?)").bind(state).run();

    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', c.env.GOOGLE_CLIENT_ID);
    // The redirect_uri must be registered in your Google Cloud Console
    const redirect_uri = new URL(c.req.url).origin + '/api/auth/google/callback';
    authUrl.searchParams.set('redirect_uri', redirect_uri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', 'openid profile email');
    authUrl.searchParams.set('state', state);

    return c.redirect(authUrl.toString());
});

// 2. Handle the callback from Google
google.get('/callback', async (c) => {
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
    // State is single-use, delete it
    await db.prepare("DELETE FROM oauth_states WHERE state = ?").bind(state).run();

    // Exchange code for token
    const redirect_uri = new URL(c.req.url).origin + '/api/auth/google/callback';
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            code,
            client_id: c.env.GOOGLE_CLIENT_ID,
            client_secret: c.env.GOOGLE_CLIENT_SECRET,
            redirect_uri,
            grant_type: 'authorization_code',
        }),
    });

    const tokenData = await tokenResponse.json() as { access_token: string, error?: string };

    if (tokenData.error || !tokenData.access_token) {
        return c.json({ error: 'Failed to fetch Google token', details: tokenData.error }, 500);
    }

    // Get user info
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { 'Authorization': `Bearer ${tokenData.access_token}` },
    });

    const googleUser = await userInfoResponse.json() as { sub: string, name: string, email: string };

    // Find or create user in our database
    let user;
    const existingUsersResult = await db.prepare("SELECT * FROM users WHERE provider = 'google' AND provider_id = ?").bind(googleUser.sub).all();
    
    if (existingUsersResult.results.length > 0) {
        user = existingUsersResult.results[0];
    } else {
        const userId = uuidv4();
        await db.prepare("INSERT INTO users (id, provider, provider_id, username, is_expert) VALUES (?, 'google', ?, ?, ?)").bind(userId, googleUser.sub, googleUser.name, 0).run(); // Google users are not experts
        const newUserResult = await db.prepare("SELECT * FROM users WHERE id = ?").bind(userId).first();
        user = newUserResult;
    }

    if (!user || typeof user.id !== 'string' || typeof user.is_expert !== 'number') {
         return c.json({ error: 'Failed to create or retrieve user' }, 500);
    }

    const appToken = await createToken({
        userId: user.id,
        username: user.username as string || googleUser.name || 'Unknown',
        isExpert: user.is_expert === 1,
        provider: 'google'
    }, c.env);

    // Redirect to the frontend callback page with the token
    // Use hash-based routing format for React HashRouter
    const callbackUrl = `${c.env.FRONTEND_URL}/#/auth/callback?token=${encodeURIComponent(appToken)}`;

    return c.redirect(callbackUrl);
});


export default google;

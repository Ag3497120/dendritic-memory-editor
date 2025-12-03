import { Hono } from 'hono'
import { v4 as uuidv4 } from 'uuid';
import { getDb, Env } from '../../db'
import { createToken } from '../../auth/jwt'

const github = new Hono<{ Bindings: Env }>()

// 1. Redirect user to GitHub's consent screen
github.get('/login', async (c) => {
    const state = uuidv4();
    const db = getDb(c);

    await db.prepare("INSERT INTO oauth_states (state) VALUES (?)").bind(state).run();

    const authUrl = new URL('https://github.com/login/oauth/authorize');
    authUrl.searchParams.set('client_id', c.env.GITHUB_CLIENT_ID);
    const redirect_uri = new URL(c.req.url).origin + '/api/auth/github/callback';
    authUrl.searchParams.set('redirect_uri', redirect_uri);
    authUrl.searchParams.set('scope', 'read:user user:email');
    authUrl.searchParams.set('state', state);

    return c.redirect(authUrl.toString());
});

// 2. Handle the callback from GitHub
github.get('/callback', async (c) => {
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
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({
            code,
            client_id: c.env.GITHUB_CLIENT_ID,
            client_secret: c.env.GITHUB_CLIENT_SECRET,
        }),
    });

    const tokenData = await tokenResponse.json() as { access_token: string, error?: string };

    if (tokenData.error || !tokenData.access_token) {
        return c.json({ error: 'Failed to fetch GitHub token', details: tokenData.error }, 500);
    }

    // Get user info
    const userInfoResponse = await fetch('https://api.github.com/user', {
        headers: { 
            'Authorization': `Bearer ${tokenData.access_token}`,
            'User-Agent': 'DendriticMemoryEditor' 
        },
    });

    const githubUser = await userInfoResponse.json() as { id: number, login: string, name: string };

    // Find or create user in our database
    let user;
    const existingUsersResult = await db.prepare("SELECT * FROM users WHERE provider = 'github' AND provider_id = ?").bind(githubUser.id.toString()).all();
    
    if (existingUsersResult.results.length > 0) {
        user = existingUsersResult.results[0];
    } else {
        const userId = uuidv4();
        await db.prepare("INSERT INTO users (id, provider, provider_id, username, is_expert) VALUES (?, 'github', ?, ?, ?)").bind(userId, githubUser.id.toString(), githubUser.login, 0).run(); // GitHub users are not experts
        const newUserResult = await db.prepare("SELECT * FROM users WHERE id = ?").bind(userId).first();
        user = newUserResult;
    }

    if (!user || typeof user.id !== 'string' || typeof user.is_expert !== 'number') {
         return c.json({ error: 'Failed to create or retrieve user' }, 500);
    }

    // Create a JWT for our app
    const appToken = await createToken({
        userId: user.id,
        username: user.username as string || githubUser.login,
        isExpert: user.is_expert === 1,
        provider: 'github'
    }, c.env);

    // Redirect to the frontend callback page with the token
    // Use hash-based routing format for React HashRouter
    const callbackUrl = `${c.env.FRONTEND_URL}/#/auth/callback?token=${encodeURIComponent(appToken)}`;

    return c.redirect(callbackUrl);
});


export default github;

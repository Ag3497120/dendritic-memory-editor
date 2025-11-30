import { Hono } from 'hono'
import { v4 as uuidv4 } from 'uuid';
import { getDb, Env } from '../../db'
import { createToken } from '../../auth/jwt'

const npi = new Hono<{ Bindings: Env, Variables: { user: { userId: string, isExpert: boolean } | null } }>()

// Helper to fetch NPI details from NPPES API
async function verifyNpiWithNPPES(npi: string, nppesApiBaseUrl?: string): Promise<{ isValid: boolean, providerName?: string }> {
    if (!nppesApiBaseUrl) {
        console.warn('NPPES_API_BASE_URL is not set. Skipping NPI verification.');
        return { isValid: false };
    }
    try {
        const response = await fetch(`${nppesApiBaseUrl}?number=${npi}&version=2.1`);
        
        if (!response.ok) {
            console.error(`NPPES API request failed: ${response.status} ${response.statusText}`);
            return { isValid: false };
        }

        const npiData = await response.json() as { result_count: number; results: any[] };

        if (npiData.result_count === 0) {
            return { isValid: false };
        }

        const providerInfo = npiData.results[0];
        const basicInfo = providerInfo.basic;
        const providerName = basicInfo.credential || `${basicInfo.first_name || ''} ${basicInfo.last_name || ''}`.trim();

        return { isValid: true, providerName: providerName || `NPI User ${npi}` };
    } catch (error) {
        console.error('Error calling NPPES API:', error);
        return { isValid: false };
    }
}

// POST /api/auth/npi/verify - Register and verify NPI
npi.post('/verify', async (c) => {
    const { npiNumber } = await c.req.json<{ npiNumber: string }>();

    if (!npiNumber || !/^\d{10}$/.test(npiNumber)) {
        return c.json({ error: 'Invalid NPI number format. It must be 10 digits.' }, 400);
    }

    const db = getDb(c);
    const user = c.get('user'); // User is already logged in, we are verifying their NPI
    const NPPES_API_URL = c.env.NPPES_API_URL;

    if (!user) {
        return c.json({ error: 'Unauthorized. You must be logged in to verify NPI.' }, 401);
    }

    try {
        // 1. Check if NPI is already registered by another user
        const existingNpiUser = await db.prepare("SELECT id FROM users WHERE npi = ? AND id != ?").bind(npiNumber, user.userId).first();
        
        if (existingNpiUser) { // D1 .first() returns null if no record
            return c.json({ error: 'NPI is already registered by another user' }, 409);
        }

        // 2. Verify NPI with NPPES API
        const { isValid, providerName } = await verifyNpiWithNPPES(npiNumber, NPPES_API_URL);
        
        if (!isValid) {
            return c.json({ error: 'Invalid or unverified NPI' }, 400);
        }

        // 3. Update user's NPI and verification status
        await db.prepare("UPDATE users SET provider_id = ?, username = ?, is_expert = 1, npi = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(npiNumber, providerName, npiNumber, user.userId).run();

        const updatedUser = await db.prepare("SELECT id, is_expert FROM users WHERE id = ?").bind(user.userId).first();

        const appToken = await createToken({ userId: updatedUser.id, isExpert: updatedUser.is_expert === 1 }, c.env);

        return c.json({ message: 'NPI registered and verified successfully', npi: npiNumber, is_expert: true, token: appToken });

    } catch (e: any) {
        console.error('Error registering NPI:', e.message);
        return c.json({ error: 'Failed to register NPI', details: e.message }, 500);
    }
});

// GET /api/auth/npi/status - Get current user's NPI status
npi.get('/status', async (c) => {
    const db = getDb(c);
    const user = c.get('user');

    if (!user) {
        return c.json({ error: 'Unauthorized' }, 401);
    }

    try {
        const result = await db.prepare("SELECT npi, is_expert FROM users WHERE id = ?").bind(user.userId).first();

        if (!result) { // D1 .first() returns null if no record
            return c.json({ error: 'User not found' }, 404);
        }

        const { npi, is_expert } = result;
        return c.json({ npi: npi || null, is_expert: is_expert === 1 });

    } catch (e: any) {
        console.error('Error getting NPI status:', e.message);
        return c.json({ error: 'Failed to retrieve NPI status', details: e.message }, 500);
    }
});

export default npi;

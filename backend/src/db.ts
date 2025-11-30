import { Hono } from 'hono';
import { D1Database } from '@cloudflare/workers-types';

export type Env = {
    DB: D1Database; // Cloudflare D1 binding
    JWT_SECRET: string;
    // OAuth Providers
    GOOGLE_CLIENT_ID: string;
    GOOGLE_CLIENT_SECRET: string;
    GITHUB_CLIENT_ID: string;
    GITHUB_CLIENT_SECRET: string;
    ORCID_CLIENT_ID: string;
    ORCID_CLIENT_SECRET: string;
    NPPES_API_URL?: string;
    FRONTEND_URL: string;
}

export function getDb(c: Hono.Context<{ Bindings: Env }>): D1Database {
    return c.env.DB;
}

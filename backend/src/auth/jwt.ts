import { sign, verify } from 'hono/jwt'
import { Env } from '../db' // Adjust the import path as needed

export const createToken = async (payload: { userId: string, username: string, isExpert: boolean, provider: string }, env: Env) => {
    const secret = env.JWT_SECRET;
    if (!secret) {
        throw new Error("JWT_SECRET is not defined in the environment.");
    }

    // Add expiration time (7 days from now) and issued at time
    const now = Math.floor(Date.now() / 1000);
    const tokenPayload = {
        ...payload,
        iat: now,
        exp: now + (7 * 24 * 60 * 60) // 7 days
    };

    const token = await sign(tokenPayload, secret);
    return token;
}

export const verifyToken = async (token: string, env: Env) => {
    const secret = env.JWT_SECRET;
    if (!secret) {
        throw new Error("JWT_SECRET is not defined in the environment.");
    }
    try {
        const decodedPayload = await verify(token, secret);
        return decodedPayload;
    } catch (err) {
        return null;
    }
}

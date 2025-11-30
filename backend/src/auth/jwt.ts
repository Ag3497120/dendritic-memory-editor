import { sign, verify } from 'hono/jwt'
import { Env } from '../db' // Adjust the import path as needed

export const createToken = async (payload: { userId: string, isExpert: boolean }, env: Env) => {
    const secret = env.JWT_SECRET;
    if (!secret) {
        throw new Error("JWT_SECRET is not defined in the environment.");
    }
    const token = await sign(payload, secret);
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

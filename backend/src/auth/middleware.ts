import { createMiddleware } from 'hono/factory'
import { verifyToken } from './jwt'
import { Env } from '../db'

export const authMiddleware = createMiddleware<{
  Bindings: Env
  Variables: {
    user: { userId: string, isExpert: boolean } | null
  }
}>(async (c, next) => {
  const authHeader = c.req.header('Authorization')
  const token = authHeader?.split('Bearer ')[1]

  if (!token) {
    c.set('user', null)
    return await next()
  }

  const payload = await verifyToken(token, c.env)

  if (!payload || typeof payload.userId !== 'string') {
    c.set('user', null)
    return await next()
  }
  
  c.set('user', { userId: payload.userId, isExpert: payload.isExpert as boolean })
  
  await next()
})

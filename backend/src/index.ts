import { Hono } from 'hono'
import { cors } from 'hono/cors'
import google from './routes/auth/google'
import github from './routes/auth/github'
import orcid from './routes/auth/orcid'
import guest from './routes/auth/guest'
import npi from './routes/auth/npi'
import tiles from './routes/tiles'
import mcp from './routes/mcp'

const app = new Hono()

// CORS configuration
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}))

app.get('/', (c) => {
  return c.text('Hello from Dendritic Memory Editor Backend!')
})

app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: 'production'
  })
})

// Auth routes
app.route('/api/auth/google', google)
app.route('/api/auth/github', github)
app.route('/api/auth/orcid', orcid)
app.route('/api/auth/guest', guest)
app.route('/api/auth/npi', npi)

// DMS Tiles CRUD routes
app.route('/api/tiles', tiles)

// MCP Proxy routes
app.route('/api/mcp', mcp)

export default app

import { Hono } from 'hono'
import google from './routes/auth/google'
import github from './routes/auth/github'
import orcid from './routes/auth/orcid'
import guest from './routes/auth/guest'
import npi from './routes/auth/npi'
import tiles from './routes/tiles'

const app = new Hono()

app.get('/', (c) => {
  return c.text('Hello from Dendritic Memory Editor Backend!')
})

// Auth routes
app.route('/api/auth/google', google)
app.route('/api/auth/github', github)
app.route('/api/auth/orcid', orcid)
app.route('/api/auth/guest', guest)
app.route('/api/auth/npi', npi)

// DMS Tiles CRUD routes
app.route('/api/tiles', tiles)


export default app

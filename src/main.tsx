import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App.tsx'
import './index.css'

// Version marker for cache busting (December 13, 2025 - 19:30)
const APP_VERSION = '1.2.3-deployed'
console.log('Dendritic Memory Editor Version:', APP_VERSION)

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {/* HashRouterで囲む */}
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>,
)

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import './index.css'

// Every call to our own API carries the login token, and a server that says
// "signed out" (401) sends you back to the login screen. Public client pages
// (/client/..., /demo/...) never carry or need a token.
const nativeFetch = window.fetch.bind(window)
window.fetch = (input, init = {}) => {
  const url = typeof input === 'string' ? input : input?.url || ''
  const ours = url.startsWith('/api/') || url.startsWith(window.location.origin + '/api/')
  if (!ours) return nativeFetch(input, init)
  let token = null
  try {
    token = JSON.parse(localStorage.getItem('lithos_auth') || 'null')?.auth_token || null
  } catch {
    token = null
  }
  const publicPage = /^\/(client|demo)\//.test(window.location.pathname)
  if (token && !publicPage) {
    const headers = new Headers(init.headers || (typeof input === 'string' ? undefined : input.headers))
    if (!headers.has('x-auth-token')) headers.set('x-auth-token', token)
    init = { ...init, headers }
  }
  return nativeFetch(input, init).then((r) => {
    if (r.status === 401 && token && !publicPage) {
      // only a real "session over" answer signs you out, never other errors
      r.clone()
        .json()
        .then((b) => {
          if (b?.code === 'auth') {
            localStorage.removeItem('lithos_auth')
            window.location.assign('/')
          }
        })
        .catch(() => {})
    }
    return r
  })
}

// After a new deploy, an open tab may ask for a page file that no longer
// exists. Reload once to pick up the new version instead of showing an error.
window.addEventListener('vite:preloadError', (e) => {
  if (sessionStorage.getItem('lx_reloaded')) return
  sessionStorage.setItem('lx_reloaded', '1')
  e.preventDefault()
  window.location.reload()
})
window.addEventListener('load', () => setTimeout(() => sessionStorage.removeItem('lx_reloaded'), 10000))

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
// cache bust Tue Apr 21 11:09:22 AST 2026


// installable as an app on your phone (Add to Home Screen)
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}))
}

import { createContext, useContext } from 'react'

// Shared role-based auth context for the unified Lithos Labs app.
// appAuth shape: { id, name, email, role } where role is
// 'admin' | 'manager' | 'sales'
export const AuthContext = createContext({
  appAuth: null,
  setAppAuth: () => {},
  logout: () => {},
})

export function useAuth() {
  return useContext(AuthContext)
}

export const isRep = (appAuth) => appAuth?.role === 'sales'
export const isManager = (appAuth) => appAuth?.role === 'manager'
export const isAdmin = (appAuth) => appAuth?.role === 'admin'

// Single helper for talking to the serverless workflow API.
export async function workflowApi(action, { method = 'GET', params, body } = {}) {
  if (method === 'GET') {
    const qs = new URLSearchParams({ action, ...(params || {}) }).toString()
    const r = await fetch(`/api/workflow?${qs}`)
    return r.json()
  }
  const r = await fetch('/api/workflow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...(body || {}) }),
  })
  return r.json()
}

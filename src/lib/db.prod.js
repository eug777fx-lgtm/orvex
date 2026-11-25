// Browser side of /api/db. Every call carries the login token, so the
// database is only reachable for signed-in CRM users.
function authToken() {
  try {
    return JSON.parse(localStorage.getItem('lithos_auth') || 'null')?.auth_token || null
  } catch {
    return null
  }
}

async function query(sqlString, params = []) {
  const token = authToken()
  const response = await fetch('/api/db', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { 'x-auth-token': token } : {}) },
    body: JSON.stringify({ query: sqlString, params }),
  })
  if (response.status === 401 && localStorage.getItem('lithos_auth') && !window.location.pathname.startsWith('/demo/')) {
    // session expired or from before tokens existed: back to the login screen
    localStorage.removeItem('lithos_auth')
    window.location.assign('/')
    return []
  }
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(err.error || 'Database error')
  }
  const result = await response.json()
  return result.data
}

const db = { query }
export default db

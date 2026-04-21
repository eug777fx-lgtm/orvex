async function query(sqlString, params = []) {
  const response = await fetch('/api/db', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sqlString, params }),
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(err.error || 'Database error')
  }
  const result = await response.json()
  return result.data
}

const db = { query }
export default db

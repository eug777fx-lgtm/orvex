const isDev = import.meta.env.DEV

let devSqlPromise = null

async function getDevSql() {
  if (!devSqlPromise) {
    devSqlPromise = import('@neondatabase/serverless').then(({ neon }) => {
      const connectionString = import.meta.env.VITE_DATABASE_URL
      if (!connectionString) {
        console.error('VITE_DATABASE_URL is not set in your .env file')
        return null
      }
      return neon(connectionString)
    })
  }
  return devSqlPromise
}

async function runDev(query, params) {
  const devSql = await getDevSql()
  if (!devSql) throw new Error('Database not connected')
  return await devSql(query, params)
}

async function runProd(query, params) {
  const response = await fetch('/api/db', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, params }),
  })
  if (!response.ok) {
    let err = { error: response.statusText }
    try {
      err = await response.json()
    } catch {
      /* ignore */
    }
    throw new Error(err.error || 'Database request failed')
  }
  const payload = await response.json()
  return payload.data
}

const run = isDev ? runDev : runProd

function sql(stringsOrQuery, ...values) {
  if (Array.isArray(stringsOrQuery) && Array.isArray(stringsOrQuery.raw)) {
    const strings = stringsOrQuery
    let query = ''
    const params = []
    for (let i = 0; i < strings.length; i++) {
      query += strings[i]
      if (i < values.length) {
        params.push(values[i])
        query += `$${params.length}`
      }
    }
    return run(query, params)
  }
  return run(stringsOrQuery, values[0] || [])
}

sql.query = (queryStr, params = []) => run(queryStr, params)

export default sql

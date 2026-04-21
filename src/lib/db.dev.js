import { neon } from '@neondatabase/serverless'

const sql = neon(import.meta.env.VITE_DATABASE_URL)

async function query(sqlString, params = []) {
  return await sql.query(sqlString, params)
}

const db = { query }
export default db

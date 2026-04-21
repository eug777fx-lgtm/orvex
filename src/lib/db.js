import { neon } from '@neondatabase/serverless'

const connectionString = import.meta.env.VITE_DATABASE_URL

if (!connectionString) {
  console.error('VITE_DATABASE_URL is not set in your .env file')
}

const sql = connectionString ? neon(connectionString) : null

export default sql

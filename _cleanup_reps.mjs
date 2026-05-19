// One-off cleanup script — follows the api/db.js pattern:
//   neon(process.env.VITE_DATABASE_URL) from @neondatabase/serverless
import { readFileSync } from 'node:fs'

// Load VITE_DATABASE_URL from .env (same var the api uses)
for (const line of readFileSync(new URL('.env', import.meta.url), 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.*)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2]
}

const { neon } = await import('@neondatabase/serverless')
const sql = neon(process.env.VITE_DATABASE_URL)

const emails = ['jhonnyy@gmail.com', 'pablo@gmail.com', 'bigotf777@gmail.com']

const matched = await sql.query(
  'SELECT id, email FROM sales_reps WHERE email = ANY($1)',
  [emails],
)
const repRows = matched?.rows ?? matched ?? []
console.log('Matched sales_reps:', repRows.length)
for (const r of repRows) console.log(`  - ${r.email} (${r.id})`)

const leads = await sql.query(
  `DELETE FROM sales_leads
    WHERE rep_id IN (SELECT id FROM sales_reps WHERE email = ANY($1))
    RETURNING id`,
  [emails],
)
const dealsDel = await sql.query(
  `DELETE FROM deals
    WHERE rep_id IN (SELECT id FROM sales_reps WHERE email = ANY($1))
    RETURNING id`,
  [emails],
)
const repsDel = await sql.query(
  `DELETE FROM sales_reps WHERE email = ANY($1) RETURNING id`,
  [emails],
)

const count = (r) => (r?.rows ?? r ?? []).length
console.log('\n=== Rows deleted ===')
console.log('sales_leads:', count(leads))
console.log('deals:      ', count(dealsDel))
console.log('sales_reps: ', count(repsDel))

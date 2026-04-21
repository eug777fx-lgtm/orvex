import sql from '../lib/db'

let migratePromise = null

async function columnExists(column) {
  const rows = await sql`
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'leads' AND column_name = ${column}
    LIMIT 1
  `
  return rows.length > 0
}

export function migrateSchema() {
  if (!sql) return Promise.resolve(false)
  if (migratePromise) return migratePromise

  migratePromise = (async () => {
    try {
      await sql`ALTER TABLE leads DROP COLUMN IF EXISTS has_social`
      await sql`ALTER TABLE leads DROP COLUMN IF EXISTS social_links`

      const hasAutomation = await columnExists('has_automation')
      const hasCrm = await columnExists('has_crm')
      if (hasAutomation && !hasCrm) {
        await sql`ALTER TABLE leads RENAME COLUMN has_automation TO has_crm`
      } else if (hasAutomation && hasCrm) {
        await sql`ALTER TABLE leads DROP COLUMN has_automation`
      }

      await sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS has_crm boolean DEFAULT false`
      await sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS manual_processes boolean DEFAULT false`

      await sql`ALTER TABLE offers ADD COLUMN IF NOT EXISTS included text[]`

      await sql`ALTER TABLE deals ADD COLUMN IF NOT EXISTS title text`
      await sql`ALTER TABLE deals ADD COLUMN IF NOT EXISTS days_in_stage int DEFAULT 0`
      await sql`ALTER TABLE deals ADD COLUMN IF NOT EXISTS stage_changed_at timestamptz DEFAULT now()`

      await sql`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS completed_at timestamptz`

      await sql`
        CREATE TABLE IF NOT EXISTS discovery_runs (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          created_at timestamptz DEFAULT now(),
          industries text[],
          locations text[],
          total_found int,
          no_website_count int,
          added_to_leads int
        )
      `

      await sql`DELETE FROM scripts WHERE problem_tags @> ARRAY['no_social']::text[]`
      await sql`
        UPDATE scripts
        SET problem_tags = array_replace(problem_tags, 'no_automation', 'no_crm')
        WHERE 'no_automation' = ANY(problem_tags)
      `

      return true
    } catch (err) {
      console.error('migrateSchema failed', err)
      migratePromise = null
      return false
    }
  })()

  return migratePromise
}

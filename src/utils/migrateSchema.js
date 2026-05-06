import db from '@/lib/db'

let migratePromise = null

async function columnExists(column) {
  const rows = await db.query(
    `SELECT 1
     FROM information_schema.columns
     WHERE table_name = 'leads' AND column_name = $1
     LIMIT 1`,
    [column],
  )
  return rows.length > 0
}

export function migrateSchema() {
  if (migratePromise) return migratePromise

  migratePromise = (async () => {
    try {
      await db.query('ALTER TABLE leads DROP COLUMN IF EXISTS has_social')
      await db.query('ALTER TABLE leads DROP COLUMN IF EXISTS social_links')

      const hasAutomation = await columnExists('has_automation')
      const hasCrm = await columnExists('has_crm')
      if (hasAutomation && !hasCrm) {
        await db.query('ALTER TABLE leads RENAME COLUMN has_automation TO has_crm')
      } else if (hasAutomation && hasCrm) {
        await db.query('ALTER TABLE leads DROP COLUMN has_automation')
      }

      await db.query(
        'ALTER TABLE leads ADD COLUMN IF NOT EXISTS has_crm boolean DEFAULT false',
      )
      await db.query(
        'ALTER TABLE leads ADD COLUMN IF NOT EXISTS manual_processes boolean DEFAULT false',
      )

      await db.query('ALTER TABLE offers ADD COLUMN IF NOT EXISTS included text[]')

      await db.query('ALTER TABLE deals ADD COLUMN IF NOT EXISTS title text')
      await db.query(
        'ALTER TABLE deals ADD COLUMN IF NOT EXISTS days_in_stage int DEFAULT 0',
      )
      await db.query(
        'ALTER TABLE deals ADD COLUMN IF NOT EXISTS stage_changed_at timestamptz DEFAULT now()',
      )

      await db.query('ALTER TABLE tasks ADD COLUMN IF NOT EXISTS completed_at timestamptz')

      await db.query(`
        CREATE TABLE IF NOT EXISTS discovery_runs (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          created_at timestamptz DEFAULT now(),
          industries text[],
          locations text[],
          total_found int,
          no_website_count int,
          added_to_leads int
        )
      `)

      await db.query(`
        CREATE TABLE IF NOT EXISTS demos (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          created_at timestamptz DEFAULT now(),
          client_name text,
          business_name text NOT NULL,
          template text NOT NULL,
          slug text UNIQUE NOT NULL,
          config jsonb NOT NULL,
          status text DEFAULT 'draft' CHECK (status IN ('draft','sent','viewed','interested','closed')),
          view_count int DEFAULT 0,
          last_viewed_at timestamptz,
          lead_id uuid REFERENCES leads(id) ON DELETE SET NULL,
          notes text
        )
      `)

      await db.query(
        `ALTER TABLE scripts ADD COLUMN IF NOT EXISTS language text DEFAULT 'english'`,
      )
      await db.query(
        `UPDATE scripts SET language = 'english' WHERE language IS NULL`,
      )

      await db.query(
        `DELETE FROM scripts WHERE problem_tags @> ARRAY['no_social']::text[]`,
      )
      await db.query(
        `UPDATE scripts
         SET problem_tags = array_replace(problem_tags, 'no_automation', 'no_crm')
         WHERE 'no_automation' = ANY(problem_tags)`,
      )

      await db.query(`
        CREATE TABLE IF NOT EXISTS workflow_projects (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          created_at timestamptz DEFAULT now(),
          updated_at timestamptz DEFAULT now(),
          name text NOT NULL,
          type text CHECK (type IN ('client','personal','content')) DEFAULT 'personal',
          stage text CHECK (stage IN ('todo','in_progress','refining','done')) DEFAULT 'todo',
          progress int DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
          description text,
          checklist jsonb DEFAULT '[]'::jsonb,
          color text DEFAULT '#ffffff',
          priority text CHECK (priority IN ('low','medium','high')) DEFAULT 'medium'
        )
      `)

      await db.query(
        'CREATE TABLE IF NOT EXISTS app_meta (key text PRIMARY KEY, value text)',
      )
      const wfSeedRow = await db.query(
        `SELECT value FROM app_meta WHERE key = 'workflow_seed_v1' LIMIT 1`,
      )
      if (!wfSeedRow.length) {
        const seeds = [
          {
            name: 'AWATEC HQ',
            type: 'client',
            stage: 'in_progress',
            progress: 75,
            priority: 'high',
            description:
              "Web + CRM for dad's plumbing business. Still need to discuss small details, other features, setup email and run.",
            checklist: [
              { text: 'Discuss remaining details with owner', done: false },
              { text: 'Setup email automation', done: false },
              { text: 'Connect domain awatecaruba.com', done: false },
              { text: 'Add demo data', done: false },
            ],
          },
          {
            name: 'LIMITLESS Trading Journal',
            type: 'personal',
            stage: 'done',
            progress: 100,
            priority: 'medium',
            description: 'Trading journal app. Journal and landing page done.',
            checklist: [
              { text: 'Build journal app', done: true },
              { text: 'Build landing page', done: true },
              { text: 'Connect domain', done: true },
            ],
          },
          {
            name: 'COS Studios CRM',
            type: 'personal',
            stage: 'in_progress',
            progress: 80,
            priority: 'high',
            description:
              'Development agency dashboard and leads system. Core done, demos module added.',
            checklist: [
              { text: 'Core CRM built', done: true },
              { text: 'Demos module', done: true },
              { text: 'Deploy landing page', done: false },
              { text: 'Get first client', done: false },
            ],
          },
          {
            name: 'Clothing Brand',
            type: 'personal',
            stage: 'done',
            progress: 100,
            priority: 'low',
            description: 'Clothing brand marketing done.',
            checklist: [
              { text: 'Branding done', done: true },
              { text: 'Marketing done', done: true },
            ],
          },
          {
            name: 'Trading Career',
            type: 'personal',
            stage: 'done',
            progress: 80,
            priority: 'high',
            description: 'Trading strategy and psychology. 80% strong mentally.',
            checklist: [
              { text: 'Strategy defined', done: true },
              { text: 'Psychology work', done: true },
              { text: 'Consistency', done: false },
            ],
          },
          {
            name: 'COS Studios Landing Page',
            type: 'personal',
            stage: 'in_progress',
            progress: 60,
            priority: 'medium',
            description:
              'Landing page for the agency. Built locally, needs deployment.',
            checklist: [
              { text: 'Build landing page', done: true },
              { text: 'Apple animations', done: true },
              { text: 'Deploy to Vercel', done: false },
              { text: 'Connect domain', done: false },
            ],
          },
          {
            name: 'LIMITLESS Stripe + LLC',
            type: 'personal',
            stage: 'todo',
            progress: 10,
            priority: 'high',
            description:
              'Need LLC and Stripe integration to accept payments from trading journal users.',
            checklist: [
              { text: 'Form LLC', done: false },
              { text: 'Setup Stripe', done: false },
              { text: 'Connect to LIMITLESS', done: false },
            ],
          },
          {
            name: 'First COS Client',
            type: 'client',
            stage: 'todo',
            progress: 0,
            priority: 'high',
            description:
              'Land first paying client for COS Studios. Need to start calling.',
            checklist: [
              { text: 'Fix Google API key', done: false },
              { text: 'Run Discover', done: false },
              { text: 'Make first 5 calls', done: false },
              { text: 'Send first demo', done: false },
              { text: 'Close deal', done: false },
            ],
          },
        ]
        for (const p of seeds) {
          await db.query(
            `INSERT INTO workflow_projects
              (name, type, stage, progress, priority, description, checklist)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
              p.name,
              p.type,
              p.stage,
              p.progress,
              p.priority,
              p.description,
              JSON.stringify(p.checklist),
            ],
          )
        }
        await db.query(
          `INSERT INTO app_meta (key, value) VALUES ('workflow_seed_v1', '1')
           ON CONFLICT (key) DO NOTHING`,
        )
      }

      return true
    } catch (err) {
      console.error('migrateSchema failed', err)
      migratePromise = null
      return false
    }
  })()

  return migratePromise
}

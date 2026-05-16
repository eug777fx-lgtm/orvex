import db from '@/lib/db'

export async function setupMarketingDB() {
  // ===== PERMANENT created_at FIX =====
  // Before ANY query runs, guarantee a created_at column exists on every
  // table that is ever filtered/ordered by it. Legacy databases may have
  // these tables WITHOUT created_at (CREATE TABLE IF NOT EXISTS is a no-op
  // on a pre-existing table), which is what throws
  // `column "created_at" does not exist` and aborts the whole setup.
  // Each ALTER is isolated in its own try/catch so a missing table
  // (fresh DB — table not created yet) or any other error can never abort.
  const ensureCreatedAt = [
    'analytics',
    'content_pipeline',
    'schedules',
    'agent_runs',
    'post_packages',
    'content',
    'brands',
    'brand_memory',
  ]
  for (const t of ensureCreatedAt) {
    try {
      await db.query(
        `ALTER TABLE ${t} ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now()`,
      )
    } catch (e) {
      console.log('skip:', e.message)
    }
  }

  await db.query(`
    CREATE TABLE IF NOT EXISTS brands (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      voice_prompt TEXT,
      color TEXT,
      platforms JSONB DEFAULT '[]',
      created_at TIMESTAMPTZ DEFAULT now()
    )
  `)

  // Guarantee created_at exists on legacy `brands` tables BEFORE anything
  // orders/filters by it (dedupeBrand below does ORDER BY created_at).
  // CREATE TABLE IF NOT EXISTS is a no-op on an existing pre-created_at table,
  // so without this an old DB throws: column "created_at" does not exist.
  try {
    await db.query(
      `ALTER TABLE brands ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now()`,
    )
  } catch (e) {
    console.log('Migration skip:', e.message)
  }

  // Clean up any duplicate brand rows (oldest wins) before the unique index
  // is created — CREATE UNIQUE INDEX would error if duplicates still exist.
  await dedupeBrand('AWATEC')
  await dedupeBrand('LIMITLESS')

  await db.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS brands_name_unique ON brands(name)
  `)

  // Every ALTER TABLE is wrapped so one failing migration (e.g. a column
  // that depends on another not yet present) cannot abort the whole setup.
  try {
    await db.query(
      `ALTER TABLE brands ADD COLUMN IF NOT EXISTS client_id TEXT`,
    )
    await db.query(
      `ALTER TABLE brands ADD COLUMN IF NOT EXISTS brand_type TEXT DEFAULT 'own'`,
    )
    await db.query(
      `UPDATE brands SET brand_type = 'own' WHERE brand_type IS NULL`,
    )
    await db.query(`ALTER TABLE brands ADD COLUMN IF NOT EXISTS logo_url TEXT`)
    await db.query(`ALTER TABLE brands ADD COLUMN IF NOT EXISTS primary_color TEXT`)
    await db.query(`ALTER TABLE brands ADD COLUMN IF NOT EXISTS secondary_color TEXT`)
    await db.query(`ALTER TABLE brands ADD COLUMN IF NOT EXISTS visual_style TEXT`)
    await db.query(
      `ALTER TABLE brands ADD COLUMN IF NOT EXISTS aesthetic_description TEXT`,
    )
  } catch (e) {
    console.log('Migration skip:', e.message)
  }

  await db.query(`
    CREATE TABLE IF NOT EXISTS content (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      brand_id UUID REFERENCES brands(id),
      type TEXT NOT NULL,
      hook TEXT,
      caption TEXT,
      script TEXT,
      status TEXT DEFAULT 'pending',
      score INTEGER,
      created_at TIMESTAMPTZ DEFAULT now()
    )
  `)

  await db.query(`
    CREATE TABLE IF NOT EXISTS schedules (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      content_id UUID REFERENCES content(id),
      brand_id UUID REFERENCES brands(id),
      platform TEXT,
      scheduled_at TIMESTAMPTZ,
      published BOOLEAN DEFAULT false,
      created_at TIMESTAMPTZ DEFAULT now()
    )
  `)

  await db.query(`
    CREATE TABLE IF NOT EXISTS analytics (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      content_id UUID REFERENCES content(id),
      brand_id UUID REFERENCES brands(id),
      views INTEGER DEFAULT 0,
      likes INTEGER DEFAULT 0,
      comments INTEGER DEFAULT 0,
      shares INTEGER DEFAULT 0,
      engagement_rate FLOAT DEFAULT 0,
      score FLOAT DEFAULT 0,
      recorded_at TIMESTAMPTZ DEFAULT now()
    )
  `)

  await db.query(`
    CREATE TABLE IF NOT EXISTS brand_memory (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      brand_id UUID REFERENCES brands(id),
      memory_type TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT now()
    )
  `)

  await db.query(`
    CREATE TABLE IF NOT EXISTS post_packages (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      brand_id UUID REFERENCES brands(id),
      status TEXT DEFAULT 'draft',
      platform TEXT DEFAULT 'instagram',
      hook_id UUID REFERENCES content(id),
      visual_id UUID REFERENCES content(id),
      caption_id UUID REFERENCES content(id),
      hook_text TEXT,
      caption_text TEXT,
      cta_text TEXT,
      hashtags TEXT,
      visual_url TEXT,
      visual_type TEXT,
      visual_brief TEXT,
      remotion_composition TEXT,
      scheduled_at TIMESTAMPTZ,
      published BOOLEAN DEFAULT false,
      published_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT now()
    )
  `)

  // Async Remotion render tracking: render_id + render_bucket are stored when
  // the writer fires a render so the UI can poll render_status and the
  // backfill can target the exact package. Wrapped so a failing column add
  // can't abort the rest of setup. created_at is guaranteed first because the
  // UPDATE below filters on it (legacy tables may predate the column).
  try {
    await db.query(
      `ALTER TABLE post_packages ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now()`,
    )
    await db.query(
      `ALTER TABLE post_packages ADD COLUMN IF NOT EXISTS render_id TEXT`,
    )
    await db.query(
      `ALTER TABLE post_packages ADD COLUMN IF NOT EXISTS render_bucket TEXT`,
    )
    // Full structured video script (multi-scene) produced by the Writer agent
    // and consumed by the video_producer agent.
    await db.query(
      `ALTER TABLE post_packages ADD COLUMN IF NOT EXISTS script TEXT`,
    )
    // video_producer outputs: per-scene asset map + final duration / scene count.
    await db.query(
      `ALTER TABLE post_packages ADD COLUMN IF NOT EXISTS scenes_data JSONB`,
    )
    await db.query(
      `ALTER TABLE post_packages ADD COLUMN IF NOT EXISTS video_duration INTEGER`,
    )
    await db.query(
      `ALTER TABLE post_packages ADD COLUMN IF NOT EXISTS scenes_count INTEGER`,
    )
  } catch (e) {
    console.log('Migration skip:', e.message)
  }

  // Reset packages stuck in 'rendering' with no render_id (the kickoff
  // failed before persisting an id). Only run AFTER confirming the
  // created_at column actually exists — legacy post_packages tables may
  // predate it, and a missing column would otherwise abort setup.
  try {
    const colCheck = await db.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name='post_packages' AND column_name='created_at'",
    )
    const colExists = (colCheck.rows || colCheck).length > 0
    if (colExists) {
      try {
        await db.query(
          "UPDATE post_packages SET status='needs_visual' WHERE status='rendering' AND render_id IS NULL AND created_at < now() - interval '10 minutes'",
        )
      } catch (e) {
        console.log('Cleanup skip:', e.message)
      }
    }
  } catch (e) {
    console.log('Migration skip:', e.message)
  }

  await db.query(`
    CREATE TABLE IF NOT EXISTS content_pipeline (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      brand_id UUID REFERENCES brands(id) NOT NULL,
      post_package_id UUID REFERENCES post_packages(id),
      stage TEXT NOT NULL DEFAULT 'script',
      script_data JSONB,
      audio_data JSONB,
      visual_data JSONB,
      assembly_data JSONB,
      fallback_used BOOLEAN DEFAULT false,
      fallback_type TEXT,
      error_log JSONB DEFAULT '[]',
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    )
  `)
  try {
    await db.query(
      `CREATE INDEX IF NOT EXISTS idx_pipeline_brand ON content_pipeline(brand_id)`,
    )
    await db.query(
      `CREATE INDEX IF NOT EXISTS idx_pipeline_stage ON content_pipeline(stage)`,
    )
  } catch (e) {
    console.log('Migration skip:', e.message)
  }

  await db.query(`
    CREATE TABLE IF NOT EXISTS agent_runs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      brand_id UUID REFERENCES brands(id),
      agent_type TEXT NOT NULL,
      input JSONB,
      output JSONB,
      status TEXT DEFAULT 'pending',
      tokens_used INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT now()
    )
  `)

  // ===== Sales Rep System =====
  await db.query(`
    CREATE TABLE IF NOT EXISTS sales_reps (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT DEFAULT 'rep',
      phone TEXT,
      whatsapp TEXT,
      is_active BOOLEAN DEFAULT true,
      commission_rate FLOAT DEFAULT 10.0,
      target_monthly FLOAT DEFAULT 0,
      target_weekly FLOAT DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT now()
    )
  `)

  await db.query(`
    CREATE TABLE IF NOT EXISTS sales_leads (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      rep_id UUID REFERENCES sales_reps(id),
      assigned_by UUID REFERENCES sales_reps(id),
      company_name TEXT NOT NULL,
      contact_name TEXT,
      contact_email TEXT,
      contact_phone TEXT,
      contact_whatsapp TEXT,
      industry TEXT,
      location TEXT,
      source TEXT DEFAULT 'cold_outreach',
      status TEXT DEFAULT 'new',
      service_interest TEXT[],
      estimated_value FLOAT,
      notes TEXT,
      next_followup TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    )
  `)

  await db.query(`
    CREATE TABLE IF NOT EXISTS lead_activities (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      lead_id UUID REFERENCES sales_leads(id),
      rep_id UUID REFERENCES sales_reps(id),
      activity_type TEXT NOT NULL,
      description TEXT,
      outcome TEXT,
      attachment_url TEXT,
      created_at TIMESTAMPTZ DEFAULT now()
    )
  `)

  await db.query(`
    CREATE TABLE IF NOT EXISTS deals (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      lead_id UUID REFERENCES sales_leads(id),
      rep_id UUID REFERENCES sales_reps(id),
      service_name TEXT NOT NULL,
      deal_value FLOAT NOT NULL,
      commission_rate FLOAT NOT NULL,
      commission_amount FLOAT GENERATED ALWAYS AS (deal_value * commission_rate / 100) STORED,
      status TEXT DEFAULT 'pending_approval',
      payment_confirmed BOOLEAN DEFAULT false,
      payment_proof_url TEXT,
      admin_notes TEXT,
      approved_by UUID REFERENCES sales_reps(id),
      approved_at TIMESTAMPTZ,
      commission_paid_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT now()
    )
  `)

  await db.query(`
    CREATE TABLE IF NOT EXISTS services_catalog (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      description TEXT,
      category TEXT,
      price_min FLOAT,
      price_max FLOAT,
      price_fixed FLOAT,
      commission_rate FLOAT DEFAULT 10.0,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT now()
    )
  `)

  await db.query(`
    CREATE TABLE IF NOT EXISTS rep_kpis (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      rep_id UUID REFERENCES sales_reps(id),
      date DATE DEFAULT CURRENT_DATE,
      calls_made INTEGER DEFAULT 0,
      emails_sent INTEGER DEFAULT 0,
      leads_added INTEGER DEFAULT 0,
      demos_booked INTEGER DEFAULT 0,
      proposals_sent INTEGER DEFAULT 0,
      deals_closed INTEGER DEFAULT 0,
      revenue_generated FLOAT DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT now(),
      UNIQUE(rep_id, date)
    )
  `)

  await db.query(`
    CREATE TABLE IF NOT EXISTS sales_notifications (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      recipient_id UUID REFERENCES sales_reps(id),
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT,
      read BOOLEAN DEFAULT false,
      link TEXT,
      created_at TIMESTAMPTZ DEFAULT now()
    )
  `)

  await db.query(`
    CREATE TABLE IF NOT EXISTS rep_tasks (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      rep_id UUID REFERENCES sales_reps(id),
      lead_id UUID REFERENCES sales_leads(id),
      title TEXT NOT NULL,
      description TEXT,
      priority TEXT DEFAULT 'medium',
      status TEXT DEFAULT 'todo',
      due_date DATE,
      completed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT now()
    )
  `)

  // services_catalog has no natural unique key in the spec; add one so the
  // seed below is idempotent across the every-startup setup run. Wrapped so
  // a legacy/duplicated catalog can't abort setup.
  try {
    await db.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS services_catalog_name_unique ON services_catalog(name)`,
    )
    await db.query(`
      INSERT INTO services_catalog (name, description, category, price_min, price_max, commission_rate) VALUES
      ('CRM Setup', 'Full CRM setup with pipeline, lead tracking and automations', 'CRM', 500, 2000, 15),
      ('AI Marketing System', 'Complete AI content generation and brand automation system', 'AI', 1500, 5000, 15),
      ('Website Development', 'Custom website with modern design and CMS', 'Web', 800, 3000, 10),
      ('Lead Generation System', 'Automated lead capture, nurturing and qualification', 'Growth', 500, 2000, 15),
      ('Full Business Operating System', 'CRM + AI Marketing + Website + Automations package', 'Package', 3000, 10000, 20),
      ('Brand Identity', 'Logo, visual system, brand strategy and style guide', 'Brand', 300, 1500, 10),
      ('Monthly Retainer - Starter', 'Basic monthly maintenance and content management', 'Retainer', 500, 500, 10),
      ('Monthly Retainer - Growth', 'Full AI marketing + CRM management monthly', 'Retainer', 1500, 1500, 15)
      ON CONFLICT DO NOTHING
    `)
  } catch (e) {
    console.log('Migration skip:', e.message)
  }

  try {
    await db.query(`
      INSERT INTO sales_reps (name, email, password_hash, role, commission_rate) VALUES
      ('Eugene', 'admin@lithoslabs.com', 'admin123', 'admin', 0)
      ON CONFLICT (email) DO UPDATE SET password_hash='admin123', role='admin'
    `)
  } catch (e) {
    console.log('Migration skip:', e.message)
  }

  // One-time fresh start: wipe all generated content but keep brands and
  // brand_memory completely intact. Runs before the seed inserts below.
  await cleanContentForFreshStart()

  await db.query(
    `INSERT INTO brands (name, color, platforms)
     VALUES ('LIMITLESS', '#ffffff', '["instagram","facebook"]')
     ON CONFLICT (name) DO NOTHING`,
  )

  await db.query(
    `INSERT INTO brands (name, color, platforms)
     VALUES ('AWATEC', '#ffffff', '["instagram","facebook"]')
     ON CONFLICT (name) DO NOTHING`,
  )

  await db.query(
    `INSERT INTO brands (name, color, platforms, brand_type)
     VALUES ('Lithos Labs', '#C2B59B', '["instagram","facebook"]', 'own')
     ON CONFLICT (name) DO NOTHING`,
  )

  await seedBrandMemory('LIMITLESS', LIMITLESS_MEMORY)
  await seedBrandMemory('AWATEC', AWATEC_MEMORY)
  await seedBrandMemory('Lithos Labs', LITHOS_MEMORY)

  // One-time forced refresh of LIMITLESS memory for existing installs.
  // Gated on app_meta key so it only runs once per database, not every page load.
  await db.query(
    'CREATE TABLE IF NOT EXISTS app_meta (key text PRIMARY KEY, value text)',
  )
  const versionKey = 'limitless_memory_v3'
  const versionRows = await db.query(
    'SELECT value FROM app_meta WHERE key = $1 LIMIT 1',
    [versionKey],
  )
  if (versionRows.length === 0) {
    const limitlessRows = await db.query(
      "SELECT id FROM brands WHERE name = 'LIMITLESS' LIMIT 1",
    )
    const limitlessId = limitlessRows[0]?.id
    if (limitlessId) {
      await db.query('DELETE FROM brand_memory WHERE brand_id = $1', [
        limitlessId,
      ])
      for (const entry of LIMITLESS_MEMORY) {
        await db.query(
          `INSERT INTO brand_memory (brand_id, memory_type, content)
           VALUES ($1, $2, $3)`,
          [limitlessId, entry.memory_type, entry.content],
        )
      }
    }
    await db.query(
      `INSERT INTO app_meta (key, value) VALUES ($1, '1')
       ON CONFLICT (key) DO NOTHING`,
      [versionKey],
    )
  }

  // One-time forced refresh of AWATEC memory for existing installs.
  const awatecVersionKey = 'awatec_memory_v2'
  const awatecVersionRows = await db.query(
    'SELECT value FROM app_meta WHERE key = $1 LIMIT 1',
    [awatecVersionKey],
  )
  if (awatecVersionRows.length === 0) {
    let awatecRows = []
    try {
      awatecRows = await db.query(
        "SELECT id FROM brands WHERE name = 'AWATEC' ORDER BY created_at ASC LIMIT 1",
      )
    } catch (e) {
      console.log('Migration skip:', e.message)
    }
    const awatecId = awatecRows[0]?.id
    if (awatecId) {
      await db.query('DELETE FROM brand_memory WHERE brand_id = $1', [
        awatecId,
      ])
      for (const entry of AWATEC_MEMORY) {
        await db.query(
          `INSERT INTO brand_memory (brand_id, memory_type, content)
           VALUES ($1, $2, $3)`,
          [awatecId, entry.memory_type, entry.content],
        )
      }
    }
    await db.query(
      `INSERT INTO app_meta (key, value) VALUES ($1, '1')
       ON CONFLICT (key) DO NOTHING`,
      [awatecVersionKey],
    )
  }
}

// Wipes every generated-content table for a clean slate while preserving
// brands and brand_memory. Gated on an app_meta flag so it only ever runs
// once per database. Deletes run children-before-parents so the foreign
// keys (content_pipeline → post_packages, post_packages/schedules/analytics
// → content) don't reject the delete.
async function cleanContentForFreshStart() {
  await db.query(
    'CREATE TABLE IF NOT EXISTS app_meta (key text PRIMARY KEY, value text)',
  )
  const flagKey = 'fresh_start_v1'
  const existing = await db.query(
    'SELECT value FROM app_meta WHERE key = $1 LIMIT 1',
    [flagKey],
  )
  if (existing.length > 0) return

  // The `analytics` table uses `recorded_at`, NOT `created_at`, so the old
  // `DELETE FROM analytics WHERE created_at < now()` always threw
  // `column "created_at" does not exist` and aborted the entire setup.
  // Guarantee a created_at column on every table first (idempotent — no-op
  // where it already exists), then delete with per-table try/catch so a
  // single bad table can never break the rest of the migration.
  const cleanTables = [
    'content_pipeline',
    'schedules',
    'analytics',
    'agent_runs',
    'post_packages',
    'content',
  ]
  for (const t of cleanTables) {
    try {
      await db.query(
        `ALTER TABLE ${t} ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now()`,
      )
      await db.query(`DELETE FROM ${t} WHERE created_at < now()`)
    } catch (e) {
      console.log('Migration skip:', e.message)
    }
  }

  await db.query(
    `INSERT INTO app_meta (key, value) VALUES ($1, 'done')
     ON CONFLICT (key) DO NOTHING`,
    [flagKey],
  )
}

async function dedupeBrand(brandName) {
  // created_at is ensured by the ALTER guard in setupMarketingDB before this
  // runs, but stay defensive: if the column still isn't there, skip dedupe
  // rather than aborting the entire setup.
  let rows
  try {
    rows = await db.query(
      'SELECT id FROM brands WHERE name = $1 ORDER BY created_at ASC',
      [brandName],
    )
  } catch (e) {
    console.log('Migration skip:', e.message)
    return
  }
  if (!rows || rows.length <= 1) return
  const deleteIds = rows.slice(1).map((r) => r.id)
  for (const deleteId of deleteIds) {
    await db.query('DELETE FROM brand_memory WHERE brand_id = $1', [deleteId])
    await db.query('DELETE FROM agent_runs WHERE brand_id = $1', [deleteId])
    await db.query('DELETE FROM analytics WHERE brand_id = $1', [deleteId])
    await db.query('DELETE FROM schedules WHERE brand_id = $1', [deleteId])
    await db.query('DELETE FROM content WHERE brand_id = $1', [deleteId])
    await db.query('DELETE FROM brands WHERE id = $1', [deleteId])
  }
}

async function seedBrandMemory(brandName, entries) {
  const rows = await db.query(
    'SELECT id FROM brands WHERE name = $1 LIMIT 1',
    [brandName],
  )
  const brandId = rows[0]?.id
  if (!brandId) return

  const existing = await db.query(
    'SELECT 1 FROM brand_memory WHERE brand_id = $1 LIMIT 1',
    [brandId],
  )
  if (existing.length > 0) return

  for (const entry of entries) {
    await db.query(
      `INSERT INTO brand_memory (brand_id, memory_type, content)
       VALUES ($1, $2, $3)
       ON CONFLICT DO NOTHING`,
      [brandId, entry.memory_type, entry.content],
    )
  }
}

const LIMITLESS_MEMORY = [
  {
    memory_type: 'voice_rules',
    content:
      "Tone: calm, disciplined, cinematic, confident. Short punchy sentences. Speak directly to the trader. Never hype, never fake urgency, never exclamation marks. Speak like someone who has seen it all and knows what works. Example hooks: 'I lost $400 because I didnt do this.' 'Most traders fail because of this one habit.' 'Every serious trader journals. Most dont.' 'Your trades are telling you something. Are you listening?' Writing style: direct, identity-based, emotionally grounded, minimal words maximum impact. Never say: guaranteed, get rich, easy money, simple trick. Always: speak to trader identity, discipline, self-improvement through journaling.",
  },
  {
    memory_type: 'audience',
    content:
      'Primary: futures and forex traders aged 18-35. Mostly male. Trading NQ, ES, forex pairs. Learning ICT concepts, Smart Money Concepts, order flow. Most are struggling with consistency — they know what to do but dont do it. They lose money because of emotions and no system, not lack of knowledge. Secondary: aspiring traders who follow trading content on Instagram and Facebook looking for motivation and tools. Pain points: inconsistency, emotional trading, revenge trading, no clear system, not tracking their trades. Desires: consistent profits, a clear edge, emotional control, to journal but dont know where to start. They respond to: identity-based hooks, real trade examples, psychology content, product demos showing real data.',
  },
  {
    memory_type: 'top_performers',
    content:
      "Best content angles: 1. Identity hooks — Every serious trader does X. 2. Loss story hooks — I lost X because of this. 3. Psychology — why traders fail. 4. Product demos — show real journal data, P&L, win rate stats. 5. Discipline content — journaling = improvement. Best formats: short cinematic text reels 15-30 seconds, screen recordings of journal with voiceover, bold text on dark background with ambient music, carousels showing trader mistakes and solutions. Hook formulas that work: 'Most traders [do bad thing]. Here is what I do instead.' 'I [lost/failed] because of this one [habit/mistake].' 'Every [type of trader] does this.' 'Your trades are telling you [insight].' Call to action: always soft — link in bio, start your free trial, journal your next trade.",
  },
  {
    memory_type: 'campaign_history',
    content:
      'Product: LIMITLESS Trading Journal — web app for futures and forex traders. Features: trade logging, P&L tracking, performance analytics, pattern detection, trading plan page, news calendar. Price: 10 per month, 84 per year, 200 lifetime. USP vs competitors like TradePath: LIMITLESS is built by a real trader for real traders. More personal, more community focused, cinematic brand aesthetic that traders actually want to follow. Content competitor reference: tradepathai shows product UI with real data and gets strong engagement. LIMITLESS should do same but with more emotional storytelling and identity-based hooks. Platforms: Instagram Reels primary, Facebook secondary. Posting frequency goal: daily on Instagram, 3x week on Facebook. Visual identity: dark monochrome, black and white, clean typography, cinematic slow motion, no green neon like competitors.',
  },
]

const AWATEC_MEMORY = [
  {
    memory_type: 'voice_rules',
    content:
      "Brand: AWATEC — Aruba's specialized leak detection company. Tone: professional, technical but understandable, honest, practical, helpful, local, trustworthy, solution-focused. Languages: English, Papiamento, Spanish. Never sound like a general plumber — always position as a specialist diagnostic company. Strong brand phrases: 'We don't guess. We test.' 'Find the leak before breaking your floor.' 'Professional leak detection for homes, apartments, hotels and businesses.' 'Is your water meter spinning at night?' 'Clear inspection. Honest recommendation.' Writing style: direct, educational, problem-aware, locally relevant. Never use: hype language, fake urgency, generic plumbing talk. Always: speak to property owners, emphasize non-destructive methods, highlight specialized equipment.",
  },
  {
    memory_type: 'audience',
    content:
      'Primary audience: homeowners, landlords, property managers, hotel owners, commercial building managers, vacation rental owners across Aruba. Age 30-65+. Located throughout Aruba — Oranjestad, Noord, Santa Cruz, Paradera, Savaneta, San Nicolas, hotel districts. They contact AWATEC because of: high water bills, water meter moving without usage, water appearing through floors or grout, hidden underground leaks, moisture or damp areas, pressure loss, pool line leaks, failed previous leak investigations. Customer fears: breaking floors unnecessarily, expensive water bills, property damage, mold, wasting money on wrong repairs, not knowing where the leak is. Desired results: accurate leak location, minimal demolition, clear answers, fast response, professional testing, honest recommendations, peace of mind. They respond to: high water bill topics, hidden leak education, real leak cases, short videos, local language captions, equipment demonstrations, before/after cases.',
  },
  {
    memory_type: 'top_performers',
    content:
      "Best content angles for AWATEC: 1. High water bill hook — 'Is your WEB bill too high? You may have a hidden leak' 2. Water meter test — 'Is your water meter spinning at night?' 3. Before/after leak detection cases 4. Equipment demonstration videos — acoustic detection, helium tracer gas, pressure testing 5. Educational content — signs you have a hidden leak 6. Save your floor messaging — 'Find the leak before breaking your floor' 7. Commercial cases — hotels, apartments, restaurants. Best formats: short educational reels showing equipment in action, before/after photo posts, tip carousels in Papiamento and English, real case studies with results. Hook formulas: 'Your [water bill/floor/property] is telling you something.' 'Most people break their floor before calling us. Here is what we do instead.' 'Sign #1 that you have a hidden leak:' CTA: always include WhatsApp contact or website appointment link.",
  },
  {
    memory_type: 'campaign_history',
    content:
      'Business: AWATEC Leak Detection — Aruba. Founded: operating since at least 2022. Location: Primavera 1L #5, Oranjestad, Aruba. Service area: all of Aruba. Services: Leak Inspection (from Afl.175), Residential Leak Detection (Afl.695-825 up to 2 hours), Additional hours Afl.150-325/hr, Pipe Tracing from Afl.400, Commercial custom quote. Contact: WhatsApp Business, website appointment form, phone, social media. Website has appointment request page and service page. Platforms: Facebook primary, Instagram, WhatsApp Business, Google Business Profile. Unique positioning: specialized diagnostic company NOT a general plumber. Uses acoustic detection, helium tracer gas, pipe tracing equipment, pressure testing, water meter diagnostics. Differentiator: non-destructive testing — find the leak without unnecessary demolition. Content languages: English and Papiamento for local audience, Spanish secondary. Strong campaign concepts: High WEB bill campaign, Water meter spinning campaign, Find leak before breaking floor campaign, Professional detection for hotels and apartments campaign.',
  },
]

const LITHOS_MEMORY = [
  {
    memory_type: 'voice_rules',
    content:
      'Brand: Lithos Labs — CRM and marketing systems agency. Tone: clear, professional, strong, vision-focused, solution-oriented. No overhype, no corporate fluff, no loud guru energy. Calm confidence. Minimal luxury modern tech feel. Tagline: Building the foundation behind scalable brands. Example phrases: Build your business on solid systems. Systems that scale. Strong foundations. Smarter growth. Never use: hype language, fake urgency, buzzword overload. Always: speak to business owners, emphasize structure and systems, reference automation and CRM.',
  },
  {
    memory_type: 'audience',
    content:
      'Primary audience: coaches, service businesses, real estate brands, startups, personal brands, local businesses, e-commerce brands. They are business owners struggling with chaos, disorganization, lack of systems. They want: automation, lead generation, authority, better client experience, scalable systems. Pain points: operating in chaos, no CRM, manual processes, inconsistent marketing, poor client onboarding. They respond to: system breakdowns, before/after transformations, automation demos, premium minimal content.',
  },
  {
    memory_type: 'top_performers',
    content:
      'Best content angles for Lithos Labs: 1. System breakdowns — how to build a CRM pipeline 2. 5 automations every business needs 3. Why most businesses stay disorganized 4. Client transformation before/after 5. Premium branding strategy content. Best formats: carousel tips, workflow clips, minimal motivational content, brand strategy breakdowns. Hook formulas: Most businesses fail because they have no [system/structure/foundation]. Here is how to fix it. The difference between a 6-figure and 7-figure business is this one system. CTA: Book a strategy call — link in bio.',
  },
  {
    memory_type: 'campaign_history',
    content:
      'Agency: Lithos Labs — CRM and marketing systems agency. Services: CRM Setup (GoHighLevel, HubSpot), Marketing Systems (funnels, ads, email, content), Brand Identity (logos, websites, strategy), Automation (AI workflows, appointment booking, follow-up systems). Offer structure: Starter CRM Setup Package, Core Business Infrastructure System, Premium Full Scale Growth Partner monthly retainer. Visual identity: Obsidian Black #0B0B0D, Stone White #F5F5F2, Sandstone Beige #C2B59B accent, minimal luxury modern tech aesthetic inspired by Apple Linear Stripe Framer. Typography: Satoshi or General Sans bold headlines, Inter body. Content pillars: Business Systems, Marketing Psychology, Client Transformations, Premium Branding, Founder Vision. Platforms: Instagram and Facebook.',
  },
]

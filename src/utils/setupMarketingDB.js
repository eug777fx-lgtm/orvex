import db from '@/lib/db'

export async function setupMarketingDB() {
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

  // Clean up any duplicate brand rows (oldest wins) before the unique index
  // is created — CREATE UNIQUE INDEX would error if duplicates still exist.
  await dedupeBrand('AWATEC')
  await dedupeBrand('LIMITLESS')

  await db.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS brands_name_unique ON brands(name)
  `)

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

  await db.query(
    `INSERT INTO brands (name, color, platforms)
     VALUES ('LIMITLESS', '#ffffff', '["instagram","tiktok","linkedin"]')
     ON CONFLICT (name) DO NOTHING`,
  )

  await db.query(
    `INSERT INTO brands (name, color, platforms)
     VALUES ('AWATEC', '#ffffff', '["instagram","facebook"]')
     ON CONFLICT (name) DO NOTHING`,
  )

  await seedBrandMemory('LIMITLESS', LIMITLESS_MEMORY)
  await seedBrandMemory('AWATEC', AWATEC_MEMORY)

  // One-time forced refresh of LIMITLESS memory for existing installs.
  // Gated on app_meta key so it only runs once per database, not every page load.
  await db.query(
    'CREATE TABLE IF NOT EXISTS app_meta (key text PRIMARY KEY, value text)',
  )
  const versionKey = 'limitless_memory_v2'
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
}

async function dedupeBrand(brandName) {
  const rows = await db.query(
    'SELECT id FROM brands WHERE name = $1 ORDER BY created_at ASC',
    [brandName],
  )
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
      'Primary: futures and forex traders aged 18-35. Mostly male. Trading NQ, ES, forex pairs. Learning ICT concepts, Smart Money Concepts, order flow. Most are struggling with consistency — they know what to do but dont do it. They lose money because of emotions and no system, not lack of knowledge. Secondary: aspiring traders who follow trading content on TikTok and Instagram looking for motivation and tools. Pain points: inconsistency, emotional trading, revenge trading, no clear system, not tracking their trades. Desires: consistent profits, a clear edge, emotional control, to journal but dont know where to start. They respond to: identity-based hooks, real trade examples, psychology content, product demos showing real data.',
  },
  {
    memory_type: 'top_performers',
    content:
      "Best content angles: 1. Identity hooks — Every serious trader does X. 2. Loss story hooks — I lost X because of this. 3. Psychology — why traders fail. 4. Product demos — show real journal data, P&L, win rate stats. 5. Discipline content — journaling = improvement. Best formats: short cinematic text reels 15-30 seconds, screen recordings of journal with voiceover, bold text on dark background with ambient music, carousels showing trader mistakes and solutions. Hook formulas that work: 'Most traders [do bad thing]. Here is what I do instead.' 'I [lost/failed] because of this one [habit/mistake].' 'Every [type of trader] does this.' 'Your trades are telling you [insight].' Call to action: always soft — link in bio, start your free trial, journal your next trade.",
  },
  {
    memory_type: 'campaign_history',
    content:
      'Product: LIMITLESS Trading Journal — web app for futures and forex traders. Features: trade logging, P&L tracking, performance analytics, pattern detection, trading plan page, news calendar. Price: 10 per month, 84 per year, 200 lifetime. USP vs competitors like TradePath: LIMITLESS is built by a real trader for real traders. More personal, more community focused, cinematic brand aesthetic that traders actually want to follow. Content competitor reference: tradepathai shows product UI with real data and gets strong engagement. LIMITLESS should do same but with more emotional storytelling and identity-based hooks. Platforms: Instagram Reels primary, TikTok secondary, YouTube Shorts tertiary. Posting frequency goal: daily on Instagram, 3x week TikTok. Visual identity: dark monochrome, black and white, clean typography, cinematic slow motion, no green neon like competitors.',
  },
]

const AWATEC_MEMORY = [
  {
    memory_type: 'voice_rules',
    content:
      'Tone: trustworthy, professional, local, friendly. Aruba-based family business. Speak like a knowledgeable neighbor not a corporate brand. Clear and direct. Focus on solving problems. Language: English and Papiamento. Never use: corporate jargon, overly technical language, pushy sales tactics. Always: be helpful, be clear about services and pricing, build trust.',
  },
  {
    memory_type: 'audience',
    content:
      'Primary audience: homeowners and property managers in Aruba. Age 30-65. Main pain points: water leaks causing damage, high water bills, not knowing who to trust for plumbing work. They want: fast response, fair pricing, professional work, local trustworthy service. Services offered: Leak Detection, Leak Inspection (Afl.150), Pressure Service, Plumbing Repairs. They respond to: before/after results, clear pricing, local references, professional presentation.',
  },
  {
    memory_type: 'top_performers',
    content:
      'Best content angles for AWATEC: 1. Warning signs of a hidden water leak 2. How much a slow leak costs you per month 3. Before and after leak detection results 4. Why choose a local specialist over general plumber 5. Customer testimonials and results. Best formats: short educational reels, before/after photos, tip carousels. Hook style: problem-aware, local, practical.',
  },
]

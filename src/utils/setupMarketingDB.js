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

  await db.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS brands_name_unique ON brands(name)
  `)

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
     VALUES ('LIMITLESS', '#c084fc', '["instagram","tiktok","linkedin"]')
     ON CONFLICT (name) DO NOTHING`,
  )

  await db.query(
    `INSERT INTO brands (name, color, platforms)
     VALUES ('AWATEC', '#4ade80', '["instagram","facebook"]')
     ON CONFLICT (name) DO NOTHING`,
  )
}

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
      "Tone: calm, disciplined, cinematic, reflective. Short impactful sentences. Emotional phrasing. Never loud or hype. Never fake luxury. Always meaningful. Example lines: 'Discipline is built quietly.' 'Most people quit too early.' 'Small habits shape your future.' 'Silence reveals character.' Writing style: concise, poetic but understandable, philosophical, minimalist wording. Never use: exclamation marks, hype language, cluttered messaging, trend chasing.",
  },
  {
    memory_type: 'audience',
    content:
      'Primary audience: traders aged 18-35 interested in futures and forex trading, learning ICT concepts, struggling with consistency and discipline. They follow trading content on TikTok and Instagram. Secondary audience: young people interested in self-improvement, discipline, faith, purpose, and reflection. Audience problems: distraction, inconsistency, lack of direction, poor habits, low focus, mental exhaustion, social media overstimulation. Audience desires: inner peace, discipline, consistency, purpose, emotional strength, focus, growth. They respond to calm confident content not hype.',
  },
  {
    memory_type: 'top_performers',
    content:
      "Best performing content angles: 1. Trading discipline and consistency - 'most traders fail because of this one habit' 2. ICT concepts explained simply 3. Journal your trades messaging 4. Cinematic trading lifestyle visuals 5. Short philosophical trading wisdom quotes. Best formats: short cinematic reels with text overlays, carousels with minimalist slides, quote cards with dark aesthetic. Hook style: reflective, emotionally deep, curiosity-driven, minimalist.",
  },
  {
    memory_type: 'campaign_history',
    content:
      'Brand: LIMITLESS Trading Journal. Product: web app for futures and forex traders to journal trades, track performance, analyze patterns. Price: $10/month, $84/year, $200 lifetime. Target platforms: Instagram Reels, TikTok, YouTube Shorts. Content pillars: 1. Discipline and trading psychology 2. ICT concepts and education 3. Journal your trades 4. Trading lifestyle and motivation 5. Cinematic self-improvement. Visual identity: black and white monochrome, dark cinematic aesthetic, minimalist, clean typography, slow pacing, emotional atmosphere. Music: ambient cinematic piano, reflective soundscapes.',
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

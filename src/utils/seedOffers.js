import db from '@/lib/db'

// Bump this string to force re-seed / upsert on next app load.
const OFFERS_LIBRARY_VERSION = 'v4-lithos-official-2026'

const ALL_INDUSTRIES = [
  'plumber',
  'electrician',
  'hvac',
  'pest control',
  'landscaping',
  'cleaning',
  'clothing store',
  'coffee shop',
  'smoothie bar',
  'food truck',
  'restaurant',
  'bakery',
  'salon',
  'barbershop',
  'gym',
]

// Official Lithos Labs offers (3 packages + 3 add-ons). Mirrors the workflow.js
// seed_offers action and matches Documents.jsx CATALOG. Keep all three in sync.
const SEED_OFFERS = [
  {
    name: 'Landing Page',
    description:
      'A single high-converting page designed to turn visitors into leads.',
    price_min: 500,
    price_max: 500,
    target_industries: ALL_INDUSTRIES,
    problems_solved: ['no_website'],
    delivery_days: 7,
    is_active: true,
    included: [
      'Single-page design',
      'Mobile responsive',
      'Contact form',
      'Basic SEO',
      'Social media integration',
      'WhatsApp button',
      'Google Analytics',
    ],
  },
  {
    name: 'Business Website',
    description:
      'A full multi-page website that builds credibility and generates leads.',
    price_min: 700,
    price_max: 700,
    target_industries: ALL_INDUSTRIES,
    problems_solved: ['no_website', 'poor_website'],
    delivery_days: 14,
    is_active: true,
    included: [
      'Up to 5 pages',
      'Mobile responsive',
      'Contact form',
      'Basic SEO',
      'Social media integration',
      'WhatsApp button',
      'Google Analytics',
    ],
  },
  {
    name: 'Premium Custom Website',
    description:
      'A fully custom-built website with advanced features built for growth.',
    price_min: 1200,
    price_max: 1200,
    target_industries: ALL_INDUSTRIES,
    problems_solved: ['no_website', 'poor_website'],
    delivery_days: 21,
    is_active: true,
    included: [
      'Up to 10 pages',
      'Custom animations',
      'Full SEO setup',
      'Blog section',
      'Speed optimization',
      'Google Analytics + Search Console',
    ],
  },
  {
    name: 'Booking System',
    description:
      'Let customers book online with automated confirmations and reminders.',
    price_min: 300,
    price_max: 300,
    target_industries: ALL_INDUSTRIES,
    problems_solved: ['manual_processes'],
    delivery_days: 5,
    is_active: true,
    included: [
      'Online booking calendar',
      'Automated email confirmations',
      'WhatsApp reminders',
      'Admin booking dashboard',
    ],
  },
  {
    name: 'Automation System',
    description:
      'Business workflow automation — follow-ups, reminders, and more.',
    price_min: 300,
    price_max: 300,
    target_industries: ALL_INDUSTRIES,
    problems_solved: ['manual_processes'],
    delivery_days: 5,
    is_active: true,
    included: [
      'Missed call text-back',
      'Lead follow-up sequences',
      'Appointment reminders',
      'Review request automation',
    ],
  },
  {
    name: 'CRM Setup & Integrations',
    description:
      'Complete CRM to manage leads, clients, deals, and team.',
    price_min: 1000,
    price_max: 1000,
    target_industries: ALL_INDUSTRIES,
    problems_solved: ['no_crm', 'manual_processes'],
    delivery_days: 14,
    is_active: true,
    included: [
      'Custom CRM setup',
      'Pipeline configuration',
      'Automation triggers',
      'Team access',
      'Lead tracking',
    ],
  },
]

// Upsert by name: refresh existing rows so older seed data converges to the
// current catalog without losing the row's id (deals / pipelines reference it).
async function upsertAll() {
  for (const o of SEED_OFFERS) {
    const existing = await db.query('SELECT id FROM offers WHERE name = $1', [o.name])
    const existingId = existing?.[0]?.id || null
    if (existingId) {
      await db.query(
        `UPDATE offers
            SET description=$1, price_min=$2, price_max=$3,
                target_industries=$4, problems_solved=$5, delivery_days=$6,
                is_active=$7, included=$8
          WHERE id=$9`,
        [
          o.description,
          o.price_min,
          o.price_max,
          o.target_industries,
          o.problems_solved,
          o.delivery_days,
          o.is_active,
          o.included,
          existingId,
        ],
      )
    } else {
      await db.query(
        `INSERT INTO offers (
          name, description, price_min, price_max,
          target_industries, problems_solved, delivery_days,
          is_active, included
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [
          o.name,
          o.description,
          o.price_min,
          o.price_max,
          o.target_industries,
          o.problems_solved,
          o.delivery_days,
          o.is_active,
          o.included,
        ],
      )
    }
  }
  // Retire any legacy rows that aren't in the new 6-offer catalog.
  await db.query(
    `UPDATE offers SET is_active = false
      WHERE name NOT IN (
        'Landing Page','Business Website','Premium Custom Website',
        'Booking System','Automation System','CRM Setup & Integrations'
      )`,
  )
}

let seedPromise = null

export function seedOffersIfEmpty() {
  if (!db) return Promise.resolve(false)
  if (seedPromise) return seedPromise

  seedPromise = (async () => {
    try {
      await db.query(
        'CREATE TABLE IF NOT EXISTS app_meta (key text PRIMARY KEY, value text)',
      )

      const versionRows = await db.query(
        `SELECT value FROM app_meta WHERE key = 'offers_library_version'`,
      )
      const currentVersion = versionRows?.[0]?.value || null

      // Run the upsert on every version bump (and on first run when empty)
      // so existing installs converge to the current catalog.
      if (currentVersion !== OFFERS_LIBRARY_VERSION) {
        await upsertAll()
        await db.query(
          `INSERT INTO app_meta (key, value)
             VALUES ('offers_library_version', $1)
             ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
          [OFFERS_LIBRARY_VERSION],
        )
        return true
      }

      // Same version — only seed if the table is empty (e.g. fresh DB clone).
      const countRows = await db.query('SELECT COUNT(*)::int AS count FROM offers')
      if ((countRows?.[0]?.count ?? 0) === 0) {
        await upsertAll()
        return true
      }
      return false
    } catch (err) {
      console.error('seedOffersIfEmpty failed', err)
      seedPromise = null
      return false
    }
  })()

  return seedPromise
}

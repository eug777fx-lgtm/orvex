import db from '@/lib/db'

// Bump this string to force re-seed / upsert on next app load.
const OFFERS_LIBRARY_VERSION = 'v3-lithos-2026'

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

// The 4 Lithos Labs packages — also defined in Documents.jsx CATALOG.packages
// (for the estimate calculator UI). Keep these two lists in sync.
const SEED_OFFERS = [
  {
    name: 'Starter',
    description:
      'The Professional Launchpad — a clean, conversion-focused website built from scratch for your brand.',
    price_min: 800,
    price_max: 1200,
    target_industries: ALL_INDUSTRIES,
    problems_solved: ['no_website'],
    delivery_days: 10,
    is_active: true,
    included: [
      'Up to 5 pages',
      'Responsive design',
      'Contact form',
      'SEO foundation',
      'Google Analytics',
      'WhatsApp button',
      '1 revision round',
    ],
  },
  {
    name: 'Growth',
    description:
      'The Business Engine — a full business website built to generate leads, take bookings, and run content marketing automatically.',
    price_min: 1800,
    price_max: 2800,
    target_industries: ALL_INDUSTRIES,
    problems_solved: ['no_website', 'poor_website', 'low_reviews'],
    delivery_days: 18,
    is_active: true,
    included: [
      'Up to 10 pages',
      'Everything in Starter',
      'Custom animations',
      'Blog & content system',
      'Online booking system',
      'WhatsApp automation',
      'Google Business optimization',
      '2 revision rounds',
    ],
  },
  {
    name: 'Premium',
    description:
      'The Complete Digital System — not just a website but a complete digital business system integrated with your entire operation.',
    price_min: 3500,
    price_max: 5500,
    target_industries: ALL_INDUSTRIES,
    problems_solved: ['no_website', 'poor_website', 'no_crm', 'manual_processes'],
    delivery_days: 30,
    is_active: true,
    included: [
      'Unlimited pages',
      'Everything in Growth',
      'Payment integration',
      'Member portal',
      'Custom business dashboard',
      'CRM integration',
      'Advanced automations',
      'Dedicated onboarding session',
      '3 revision rounds',
    ],
  },
  {
    name: 'Enterprise',
    description:
      'The Full Operating System — fully custom digital infrastructure: website, CRM, AI systems, automations, all integrated and managed.',
    price_min: 8000,
    price_max: 25000,
    target_industries: ALL_INDUSTRIES,
    problems_solved: [
      'no_website',
      'poor_website',
      'no_crm',
      'manual_processes',
      'low_reviews',
    ],
    delivery_days: 60,
    is_active: true,
    included: [
      'Everything in Premium',
      'AI voice receptionist',
      'AI chat system',
      'Advanced workflow automation',
      'Custom internal tools',
      'White-label options',
      'Priority dedicated support',
      'Quarterly strategy sessions',
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
  // Retire any legacy package rows that aren't in the new 4-package catalog.
  await db.query(
    `UPDATE offers SET is_active = false
      WHERE name NOT IN ('Starter','Growth','Premium','Enterprise')`,
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

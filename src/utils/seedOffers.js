import db from '../lib/db'

const OFFERS_LIBRARY_VERSION = 'v2-15'

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

const SEED_OFFERS = [
  {
    name: 'Starter Website',
    description:
      'A clean, professional 5-page website for service businesses. Mobile-friendly, fast, and built to convert visitors into calls.',
    price_min: 500,
    price_max: 800,
    target_industries: ALL_INDUSTRIES,
    problems_solved: ['no_website'],
    delivery_days: 10,
    is_active: true,
    included: [
      '5 custom pages (Home, About, Services, Gallery, Contact)',
      'Mobile responsive design',
      'Contact form with email notifications',
      'Google Maps integration',
      'Basic SEO setup',
      '1 round of revisions',
    ],
  },
  {
    name: 'Professional Website',
    description:
      'A full-featured website with booking functionality, testimonials, and local SEO optimization to dominate your area.',
    price_min: 900,
    price_max: 1500,
    target_industries: ALL_INDUSTRIES,
    problems_solved: ['no_website', 'poor_website', 'low_reviews'],
    delivery_days: 14,
    is_active: true,
    included: [
      'Everything in Starter',
      'Online booking / quote request form',
      'Testimonials and reviews section',
      'Local SEO optimization',
      'Google Business Profile setup',
      'Speed optimization',
      '2 rounds of revisions',
      '30 days post-launch support',
    ],
  },
  {
    name: 'Business CRM System',
    description:
      'A custom business management system to track customers, jobs, invoices, and follow-ups — built specifically for your trade.',
    price_min: 1000,
    price_max: 2000,
    target_industries: ALL_INDUSTRIES,
    problems_solved: ['no_crm', 'manual_processes'],
    delivery_days: 21,
    is_active: true,
    included: [
      'Customer database',
      'Job / ticket management',
      'Invoice tracking',
      'Follow-up reminders',
      'Dashboard with stats',
      'Mobile accessible',
      'Training session included',
      '60 days post-launch support',
    ],
  },
  {
    name: 'Full System — Website + CRM',
    description:
      'The complete solution. A professional website bringing in new customers combined with a CRM system managing your existing ones.',
    price_min: 2000,
    price_max: 3500,
    target_industries: ALL_INDUSTRIES,
    problems_solved: [
      'no_website',
      'poor_website',
      'no_crm',
      'manual_processes',
      'low_reviews',
    ],
    delivery_days: 30,
    is_active: true,
    included: [
      'Everything in Professional Website',
      'Everything in Business CRM System',
      'Website and CRM connected (leads from website go straight into CRM)',
      'Priority support',
      '90 days post-launch support',
      'Free first-month maintenance',
    ],
  },
]

async function insertAll() {
  for (const o of SEED_OFFERS) {
    await db.query(
      `INSERT INTO offers (
        name, description, price_min, price_max,
        target_industries, problems_solved, delivery_days,
        is_active, included
      ) VALUES (
        $1, $2, $3, $4,
        $5, $6, $7,
        $8, $9
      )`,
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

      if (currentVersion === OFFERS_LIBRARY_VERSION) {
        const countRows = await db.query('SELECT COUNT(*)::int AS count FROM offers')
        if ((countRows?.[0]?.count ?? 0) > 0) return false
        await insertAll()
        return true
      }

      const countRows = await db.query('SELECT COUNT(*)::int AS count FROM offers')
      const existingCount = countRows?.[0]?.count ?? 0

      if (existingCount === 0) {
        await insertAll()
      }

      await db.query(
        `INSERT INTO app_meta (key, value)
         VALUES ('offers_library_version', $1)
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
        [OFFERS_LIBRARY_VERSION],
      )
      return true
    } catch (err) {
      console.error('seedOffersIfEmpty failed', err)
      seedPromise = null
      return false
    }
  })()

  return seedPromise
}

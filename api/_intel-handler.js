// ============================================================================
// Lead Intelligence Engine — API handler.
//
// Mounted by api/places.js as POST /api/places { action, ... }.
// Every action requires an admin/manager session token (x-auth-token) issued
// at CRM login. Discovery APIs cost money, so searches and website analyses
// are rate limited, capped per day (Settings → Limits) and usage-tracked.
//
// Staged pipeline (keeps provider spend low):
//   1. search   — one provider call per 20 results (rating, reviews, phone,
//                 website in the same call), normalize, dedupe, base filters,
//                 link to CRM leads, preliminary score + price
//   2. enrich   — only when the provider needs it (legacy fallback) or on
//                 demand ("Refresh data")
//   3. analyze  — public website analysis, only for the most promising
//                 results (auto) or when the user clicks Analyze
//
// Data rule: nothing is invented. Unknown values stay null and unknown
// detections stay 'unknown'.
// ============================================================================

import crypto from 'node:crypto'
import { requireRole } from './_auth.js'
import {
  MARKETS, INDUSTRIES, INDUSTRY_GROUPS, PRICE_ITEMS, DEFAULT_SETTINGS, BUILTIN_PRESETS,
  marketByKey, industryByKey, deepMerge, sanitizeSettings, dedupeKeys, dedupeList, sameBusiness,
  findLeadMatch, passesBaseFilters, haversineKm, evaluateBusiness, websiteChecks, isSocialUrl,
  WEBSITE_QUALITY_LABEL, analysisFilterState,
} from './_intel-core.js'
import { PROVIDERS, ProviderError, manualBusiness, providerStatus, googleKey } from './_intel-providers.js'
import { analyzeWebsite } from './_intel-analyze.js'

const rows = (r) => r?.rows ?? r ?? []
const first = (r) => rows(r)[0] || null

async function getSql() {
  const { neon } = await import('@neondatabase/serverless')
  return neon(process.env.VITE_DATABASE_URL)
}

// ---------------------------------------------------------------------------
// Logging (structured, server-side only; never returned to the browser)
// ---------------------------------------------------------------------------

function log(level, event, data = {}) {
  const line = JSON.stringify({ t: new Date().toISOString(), svc: 'lead-intel', level, event, ...data })
  if (level === 'error') console.error(line)
  else console.log(line)
}

class UserError extends Error {
  constructor(message, status = 400, extra = {}) {
    super(message)
    this.status = status
    this.extra = extra
  }
}

// ---------------------------------------------------------------------------
// Rate limiting (per warm instance, best effort; daily caps are DB-backed)
// ---------------------------------------------------------------------------

const rl = new Map()
function rateLimited(key, max, windowMs = 60_000) {
  const now = Date.now()
  const e = rl.get(key)
  if (!e || now - e.t0 > windowMs) {
    rl.set(key, { t0: now, n: 1 })
    return false
  }
  e.n += 1
  if (rl.size > 5000) rl.clear()
  return e.n > max
}

// ---------------------------------------------------------------------------
// Schema (idempotent, race-safe; runs once per warm instance)
// ---------------------------------------------------------------------------

const isConcurrentDdlError = (e) => {
  const msg = String(e?.message || '')
  return e?.code === '23505' || e?.code === '42P07' || e?.code === '42710' ||
    msg.includes('pg_type_typname_nsp_index') || msg.includes('already exists') || msg.includes('tuple concurrently')
}

async function ddl(sql, text) {
  for (let attempt = 0; ; attempt++) {
    try {
      await sql.query(text)
      return
    } catch (e) {
      if (!isConcurrentDdlError(e)) throw e
      if (attempt >= 2) return
      await new Promise((r) => setTimeout(r, 250 + Math.floor(Math.random() * 300)))
    }
  }
}

// Pipeline statuses added to the existing `leads.status` vocabulary.
export const LEAD_STATUS_ORDER = [
  'new', 'discovered', 'qualified', 'contacted', 'follow_up', 'interested', 'demo_sent',
  'call_scheduled', 'proposal_sent', 'negotiation', 'closed',
]
const TERMINAL = new Set(['closed', 'closed_won', 'lost', 'do_not_contact'])
const ALL_LEAD_STATUSES = [...LEAD_STATUS_ORDER, 'lost', 'do_not_contact']
export const CALL_OUTCOMES = [
  'no_answer', 'voicemail', 'interested', 'not_interested', 'call_back', 'demo_requested',
  'proposal_requested', 'wrong_number', 'do_not_contact',
]

// If a CHECK constraint restricts a column to a fixed list, widen it to a
// superset (never narrows, so existing rows always remain valid).
async function widenCheckConstraint(sql, table, column, values) {
  const cons = rows(
    await sql.query(
      `SELECT c.conname, pg_get_constraintdef(c.oid) AS def
         FROM pg_constraint c
         JOIN pg_class t ON t.oid = c.conrelid
        WHERE t.relname = $1 AND c.contype = 'c'`,
      [table],
    ),
  )
  for (const c of cons) {
    const def = String(c.def)
    if (!new RegExp(`\\b${column}\\b`).test(def)) continue
    // Only touch simple list checks: (col = ANY (ARRAY[...])) or col IN (...)
    const simple = new RegExp(`^CHECK \\(+\\(?${column}\\)?(::text)? = ANY \\(+ARRAY\\[[^\\]]*\\]\\)?(::text\\[\\])?\\)+$`).test(def)
    if (!simple) {
      log('warn', 'check_constraint_skipped', { table, column, def })
      continue
    }
    const existing = Array.from(def.matchAll(/'((?:[^']|'')*)'/g)).map((m) => m[1].replace(/''/g, "'"))
    const missing = values.filter((v) => !existing.includes(v))
    if (!missing.length) continue
    const all = [...existing, ...missing].map((v) => `'${v.replace(/'/g, "''")}'`).join(', ')
    const name = `"${String(c.conname).replace(/"/g, '""')}"`
    await ddl(sql, `ALTER TABLE ${table} DROP CONSTRAINT IF EXISTS ${name}`)
    await ddl(sql, `ALTER TABLE ${table} ADD CONSTRAINT ${name} CHECK (${column} IN (${all}))`)
    log('info', 'check_constraint_widened', { table, column, added: missing })
  }
}

let schemaPromise = null
function ensureSchema(sql) {
  if (!schemaPromise) {
    schemaPromise = createSchema(sql).catch((e) => {
      schemaPromise = null
      throw e
    })
  }
  return schemaPromise
}

async function createSchema(sql) {
  await ddl(sql, `CREATE TABLE IF NOT EXISTS intel_settings (
      id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
      data JSONB NOT NULL DEFAULT '{}'::jsonb,
      updated_by TEXT,
      updated_at TIMESTAMPTZ DEFAULT now()
    )`)
  await sql.query(`INSERT INTO intel_settings (id, data) VALUES (1, '{}'::jsonb) ON CONFLICT (id) DO NOTHING`)

  await ddl(sql, `CREATE TABLE IF NOT EXISTS intel_presets (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      criteria JSONB NOT NULL DEFAULT '{}'::jsonb,
      is_builtin BOOLEAN DEFAULT false,
      builtin_key TEXT UNIQUE,
      created_by TEXT,
      created_at TIMESTAMPTZ DEFAULT now()
    )`)

  await ddl(sql, `CREATE TABLE IF NOT EXISTS lead_discovery_searches (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id TEXT,
      user_name TEXT,
      label TEXT,
      market TEXT,
      country TEXT,
      country_code TEXT,
      region TEXT,
      city TEXT,
      postal_code TEXT,
      radius_km DOUBLE PRECISION,
      industries TEXT[],
      custom_term TEXT,
      query_texts TEXT[],
      filters JSONB DEFAULT '{}'::jsonb,
      provider TEXT,
      status TEXT DEFAULT 'running',
      result_count INT DEFAULT 0,
      new_count INT DEFAULT 0,
      duplicate_count INT DEFAULT 0,
      filtered_count INT DEFAULT 0,
      request_count INT DEFAULT 0,
      est_cost DOUBLE PRECISION DEFAULT 0,
      error TEXT,
      created_at TIMESTAMPTZ DEFAULT now(),
      completed_at TIMESTAMPTZ
    )`)
  await ddl(sql, `CREATE INDEX IF NOT EXISTS lds_created_idx ON lead_discovery_searches(created_at DESC)`)

  await ddl(sql, `CREATE TABLE IF NOT EXISTS discovered_businesses (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      provider TEXT NOT NULL,
      provider_id TEXT NOT NULL,
      business_name TEXT NOT NULL,
      industry TEXT,
      category TEXT,
      types TEXT[],
      address TEXT,
      city TEXT,
      region TEXT,
      country TEXT,
      country_code TEXT,
      postal_code TEXT,
      market TEXT,
      phone TEXT,
      phone_intl TEXT,
      website TEXT,
      email TEXT,
      email_source TEXT,
      rating DOUBLE PRECISION,
      review_count INT,
      hours JSONB,
      description TEXT,
      services JSONB,
      social JSONB DEFAULT '{}'::jsonb,
      business_status TEXT,
      source_url TEXT,
      lat DOUBLE PRECISION,
      lng DOUBLE PRECISION,
      name_key TEXT,
      phone_key TEXT,
      domain TEXT,
      addr_key TEXT,
      status TEXT DEFAULT 'new',
      lead_id UUID,
      raw_data JSONB,
      enriched_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now(),
      UNIQUE (provider, provider_id)
    )`)
  await ddl(sql, `CREATE INDEX IF NOT EXISTS db_domain_idx ON discovered_businesses(domain)`)
  await ddl(sql, `CREATE INDEX IF NOT EXISTS db_phone_idx ON discovered_businesses(phone_key)`)
  await ddl(sql, `CREATE INDEX IF NOT EXISTS db_name_idx ON discovered_businesses(name_key)`)
  await ddl(sql, `CREATE INDEX IF NOT EXISTS db_lead_idx ON discovered_businesses(lead_id)`)

  await ddl(sql, `CREATE TABLE IF NOT EXISTS lead_discovery_search_results (
      search_id UUID REFERENCES lead_discovery_searches(id) ON DELETE CASCADE,
      business_id UUID REFERENCES discovered_businesses(id) ON DELETE CASCADE,
      rank INT,
      PRIMARY KEY (search_id, business_id)
    )`)
  await ddl(sql, `CREATE INDEX IF NOT EXISTS ldsr_business_idx ON lead_discovery_search_results(business_id)`)

  await ddl(sql, `CREATE TABLE IF NOT EXISTS business_analysis (
      business_id UUID PRIMARY KEY REFERENCES discovered_businesses(id) ON DELETE CASCADE,
      website_status TEXT,
      mobile_status TEXT,
      booking_status TEXT,
      contact_form_status TEXT,
      website_quality TEXT,
      technology_data JSONB DEFAULT '[]'::jsonb,
      website_signals JSONB DEFAULT '{}'::jsonb,
      opportunity_data JSONB DEFAULT '{}'::jsonb,
      error TEXT,
      analyzed_at TIMESTAMPTZ
    )`)

  await ddl(sql, `CREATE TABLE IF NOT EXISTS lead_scores (
      business_id UUID PRIMARY KEY REFERENCES discovered_businesses(id) ON DELETE CASCADE,
      score INT,
      business_activity_score DOUBLE PRECISION,
      website_score DOUBLE PRECISION,
      booking_score DOUBLE PRECISION,
      crm_score DOUBLE PRECISION,
      automation_score DOUBLE PRECISION,
      confidence_score DOUBLE PRECISION,
      reasoning JSONB,
      calculated_at TIMESTAMPTZ DEFAULT now()
    )`)
  await ddl(sql, `CREATE INDEX IF NOT EXISTS lead_scores_score_idx ON lead_scores(score DESC)`)

  await ddl(sql, `CREATE TABLE IF NOT EXISTS pricing_recommendations (
      business_id UUID PRIMARY KEY REFERENCES discovered_businesses(id) ON DELETE CASCADE,
      package_name TEXT,
      recommended_services JSONB,
      price_low DOUBLE PRECISION,
      price_high DOUBLE PRECISION,
      suggested_price DOUBLE PRECISION,
      monthly DOUBLE PRECISION,
      currency TEXT,
      quote_required BOOLEAN DEFAULT false,
      reasoning TEXT,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    )`)

  await ddl(sql, `CREATE TABLE IF NOT EXISTS intel_usage_events (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id TEXT,
      search_id UUID,
      kind TEXT NOT NULL,
      provider TEXT,
      units INT DEFAULT 1,
      est_cost DOUBLE PRECISION DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT now()
    )`)
  await ddl(sql, `CREATE INDEX IF NOT EXISTS iue_created_idx ON intel_usage_events(created_at DESC)`)

  // Existing CRM tables: extend, never replace.
  for (const col of [
    'intel_business_id UUID', 'lead_score INT', 'recommended_service TEXT', 'suggested_price DOUBLE PRECISION',
    'price_low DOUBLE PRECISION', 'price_high DOUBLE PRECISION', 'price_currency TEXT', 'market TEXT',
    'country TEXT', 'region TEXT', 'city TEXT', 'postal_code TEXT', 'next_follow_up DATE',
    'website_url TEXT', 'avg_rating DOUBLE PRECISION', 'review_count INT', 'updated_at TIMESTAMPTZ',
  ]) {
    await ddl(sql, `ALTER TABLE leads ADD COLUMN IF NOT EXISTS ${col}`)
  }
  await ddl(sql, `CREATE INDEX IF NOT EXISTS leads_intel_business_idx ON leads(intel_business_id)`)
  await widenCheckConstraint(sql, 'leads', 'status', ALL_LEAD_STATUSES)
  await widenCheckConstraint(sql, 'activities', 'outcome', CALL_OUTCOMES)
  await widenCheckConstraint(sql, 'activities', 'type', ['call', 'note', 'discovery'])
  await widenCheckConstraint(sql, 'tasks', 'type', ['follow_up'])

  for (const p of BUILTIN_PRESETS) {
    await sql.query(
      `INSERT INTO intel_presets (name, criteria, is_builtin, builtin_key)
       VALUES ($1, $2::jsonb, true, $3) ON CONFLICT (builtin_key) DO NOTHING`,
      [p.name, JSON.stringify(p.criteria), p.key],
    )
  }
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

let settingsCache = null
async function loadSettings(sql, { fresh = false } = {}) {
  if (!fresh && settingsCache && Date.now() - settingsCache.t < 30_000) return settingsCache.v
  const r = first(await sql.query(`SELECT data FROM intel_settings WHERE id = 1`))
  let v
  try {
    v = sanitizeSettings(deepMerge(DEFAULT_SETTINGS, r?.data || {}))
  } catch (e) {
    log('error', 'settings_invalid_using_defaults', { error: e.message })
    v = sanitizeSettings(DEFAULT_SETTINGS)
  }
  settingsCache = { t: Date.now(), v }
  return v
}

const todayStartSql = (tzParam) => `(date_trunc('day', now() AT TIME ZONE ${tzParam}) AT TIME ZONE ${tzParam})`

// ---------------------------------------------------------------------------
// Usage tracking
// ---------------------------------------------------------------------------

function costOf(settings, provider, kind) {
  return Number(settings.provider_costs?.[provider]?.[kind] || 0)
}

async function recordUsage(sql, events) {
  if (!events.length) return
  try {
    await sql.query(
      `INSERT INTO intel_usage_events (user_id, search_id, kind, provider, units, est_cost)
       SELECT user_id, NULLIF(search_id, '')::uuid, kind, provider, units, est_cost
         FROM jsonb_to_recordset($1::jsonb) AS x(user_id TEXT, search_id TEXT, kind TEXT, provider TEXT, units INT, est_cost DOUBLE PRECISION)`,
      [JSON.stringify(events)],
    )
  } catch (e) {
    log('error', 'usage_record_failed', { error: e.message })
  }
}

async function usageToday(sql, settings) {
  const r = first(
    await sql.query(
      `SELECT
         COALESCE(SUM(units) FILTER (WHERE kind = 'search_request'), 0)::int AS search_requests,
         COALESCE(SUM(units) FILTER (WHERE kind = 'details_request'), 0)::int AS details_requests,
         COALESCE(SUM(units) FILTER (WHERE kind = 'geocode_request'), 0)::int AS geocode_requests,
         COALESCE(SUM(units) FILTER (WHERE kind = 'website_analysis'), 0)::int AS website_analyses,
         COALESCE(SUM(units) FILTER (WHERE kind = 'businesses_returned'), 0)::int AS businesses_returned,
         COALESCE(SUM(est_cost), 0)::float AS est_cost
       FROM intel_usage_events WHERE created_at >= ${todayStartSql('$1')}`,
      [settings.timezone],
    ),
  )
  const s = first(
    await sql.query(`SELECT COUNT(*)::int AS n FROM lead_discovery_searches WHERE created_at >= ${todayStartSql('$1')}`, [settings.timezone]),
  )
  const m = first(
    await sql.query(
      `SELECT COALESCE(SUM(est_cost), 0)::float AS est_cost FROM intel_usage_events
        WHERE created_at >= date_trunc('month', now() AT TIME ZONE $1) AT TIME ZONE $1`,
      [settings.timezone],
    ),
  )
  return {
    searches: s?.n || 0,
    ...r,
    month_est_cost: m?.est_cost || 0,
    limits: settings.limits,
  }
}

// ---------------------------------------------------------------------------
// Hydration: DB row → API object (evaluated with CURRENT settings, so edits to
// pricing/scoring apply immediately)
// ---------------------------------------------------------------------------

const BUSINESS_COLS = `b.id, b.provider, b.provider_id, b.business_name, b.industry, b.category, b.types, b.address,
  b.city, b.region, b.country, b.country_code, b.postal_code, b.market, b.phone, b.phone_intl, b.website, b.email,
  b.email_source, b.rating, b.review_count, b.hours, b.description, b.social, b.business_status, b.source_url,
  b.lat, b.lng, b.status, b.lead_id, b.raw_data, b.enriched_at, b.created_at, b.updated_at`

const ANALYSIS_JSON = `CASE WHEN a.business_id IS NULL THEN NULL ELSE jsonb_build_object(
  'website_status', a.website_status, 'mobile_status', a.mobile_status, 'booking_status', a.booking_status,
  'contact_form_status', a.contact_form_status, 'technology_data', a.technology_data,
  'website_signals', a.website_signals, 'error', a.error, 'analyzed_at', a.analyzed_at) END AS analysis`

function hydrate(row, settings) {
  const b = { ...row }
  const a = row.analysis || null
  delete b.analysis
  const lead = row.lead_ref_id
    ? { id: row.lead_ref_id, status: row.lead_status, company_name: row.lead_company }
    : null
  delete b.lead_ref_id
  delete b.lead_status
  delete b.lead_company
  if (!lead) b.lead_id = null
  const ev = evaluateBusiness(b, a, settings)
  return {
    ...b,
    analysis: a,
    lead,
    score: ev.score,
    score_components: ev.components,
    high_opportunity: ev.high_opportunity,
    website_quality: ev.website_quality,
    website_quality_label: WEBSITE_QUALITY_LABEL[ev.website_quality] || 'Not analyzed',
    website_state: ev.website_state,
    booking_status: ev.booking_status,
    crm_status: ev.crm_status,
    contact_form_status: ev.website_state === 'none_listed' || ev.website_state === 'social_only' ? 'not_detected' : a?.contact_form_status || 'unknown',
    tags: ev.tags,
    opportunities: ev.opportunities,
    pricing: ev.pricing,
    website_checks: websiteChecks(b, a, settings),
  }
}

// Website-dependent filters resolve to pass / fail / unknown per result.
function withFilterState(list, filters) {
  if (!filters) return list
  return list.map((h) => ({ ...h, filter_state: analysisFilterState(h, h, h.analysis, filters) }))
}

async function loadBusinesses(sql, settings, whereSql, params, orderSql = '') {
  const r = rows(
    await sql.query(
      `SELECT ${BUSINESS_COLS}, ${ANALYSIS_JSON},
              l.id AS lead_ref_id, l.status AS lead_status, l.company_name AS lead_company
         FROM discovered_businesses b
         LEFT JOIN business_analysis a ON a.business_id = b.id
         LEFT JOIN leads l ON l.id = b.lead_id
        WHERE ${whereSql} ${orderSql}`,
      params,
    ),
  )
  return r.map((x) => hydrate(x, settings))
}

async function persistEvaluations(sql, items) {
  if (!items.length) return
  const scores = items.map((h) => ({
    business_id: h.id,
    score: h.score,
    a: h.score_components.activity.points,
    w: h.score_components.website.points,
    b: h.score_components.booking.points,
    c: h.score_components.crm.points,
    au: h.score_components.automation.points,
    cf: h.score_components.confidence.points,
    reasoning: h.score_components,
  }))
  await sql.query(
    `INSERT INTO lead_scores (business_id, score, business_activity_score, website_score, booking_score, crm_score,
                              automation_score, confidence_score, reasoning, calculated_at)
     SELECT business_id, score, a, w, b, c, au, cf, reasoning, now()
       FROM jsonb_to_recordset($1::jsonb) AS x(business_id UUID, score INT, a FLOAT, w FLOAT, b FLOAT, c FLOAT, au FLOAT, cf FLOAT, reasoning JSONB)
     ON CONFLICT (business_id) DO UPDATE SET score = EXCLUDED.score,
       business_activity_score = EXCLUDED.business_activity_score, website_score = EXCLUDED.website_score,
       booking_score = EXCLUDED.booking_score, crm_score = EXCLUDED.crm_score,
       automation_score = EXCLUDED.automation_score, confidence_score = EXCLUDED.confidence_score,
       reasoning = EXCLUDED.reasoning, calculated_at = now()`,
    [JSON.stringify(scores)],
  )
  const prices = items.map((h) => ({
    business_id: h.id,
    package_name: h.pricing.package_name,
    services: h.pricing.services,
    low: h.pricing.price_low,
    high: h.pricing.price_high,
    suggested: h.pricing.suggested_price,
    monthly: h.pricing.monthly,
    currency: h.pricing.currency,
    quote: h.pricing.quote_required,
    reasoning: h.pricing.reasoning,
  }))
  await sql.query(
    `INSERT INTO pricing_recommendations (business_id, package_name, recommended_services, price_low, price_high,
                                          suggested_price, monthly, currency, quote_required, reasoning, updated_at)
     SELECT business_id, package_name, services, low, high, suggested, monthly, currency, quote, reasoning, now()
       FROM jsonb_to_recordset($1::jsonb) AS x(business_id UUID, package_name TEXT, services JSONB, low FLOAT, high FLOAT,
                                              suggested FLOAT, monthly FLOAT, currency TEXT, quote BOOLEAN, reasoning TEXT)
     ON CONFLICT (business_id) DO UPDATE SET package_name = EXCLUDED.package_name,
       recommended_services = EXCLUDED.recommended_services, price_low = EXCLUDED.price_low,
       price_high = EXCLUDED.price_high, suggested_price = EXCLUDED.suggested_price, monthly = EXCLUDED.monthly,
       currency = EXCLUDED.currency, quote_required = EXCLUDED.quote_required, reasoning = EXCLUDED.reasoning,
       updated_at = now()`,
    [JSON.stringify(prices)],
  )
}

// ---------------------------------------------------------------------------
// Leads helpers
// ---------------------------------------------------------------------------

async function loadLeadIndex(sql) {
  return rows(
    await sql.query(
      `SELECT id, company_name, phone, website_url, location, status, intel_business_id
         FROM leads ORDER BY created_at DESC NULLS LAST LIMIT 20000`,
    ),
  )
}

function leadMatchFor(b, leads) {
  if (b.lead_id) {
    const l = leads.find((x) => x.id === b.lead_id)
    if (l) return { lead: l, reason: 'Previously added from Lead Intelligence' }
  }
  const byIntel = leads.find((l) => l.intel_business_id && l.intel_business_id === b.id)
  if (byIntel) return { lead: byIntel, reason: 'Previously added from Lead Intelligence' }
  return findLeadMatch({ ...b, _keys: dedupeKeys(b) }, leads)
}

const statusIdx = (s) => LEAD_STATUS_ORDER.indexOf(s === 'closed_won' ? 'closed' : s)

function leadWebsiteQuality(h) {
  if (h.website_quality === 'none' || h.website_quality === 'social_only') return 'none'
  if (['needs_improvement', 'limited_conversion', 'unreachable'].includes(h.website_quality)) return 'poor'
  return null
}

function leadNotes(h, user) {
  const lines = [
    `Added from Lead Intelligence on ${new Date().toISOString().slice(0, 10)} by ${user.name || 'admin'}.`,
    `Lead Intelligence Score: ${h.score}/100.`,
  ]
  if (h.pricing?.services?.length) {
    const p = h.pricing
    const range = p.quote_required && p.price_low === 0 ? 'custom quote' : `${p.currency} ${fmt(p.price_low)}${p.price_high !== p.price_low ? `–${fmt(p.price_high)}${p.open_ended ? '+' : ''}` : ''}`
    lines.push(`Recommended: ${p.package_name} (${range}). ${p.reasoning}`)
  }
  const findings = [
    ...h.opportunities.website.findings.slice(0, 2),
    ...h.opportunities.booking.findings.slice(0, 1),
    ...h.opportunities.crm.findings.slice(0, 1),
  ]
  if (findings.length) lines.push(`Findings: ${findings.join('; ')}.`)
  if (h.source_url) lines.push(`Source: ${h.source_url}`)
  return lines.join('\n')
}

const fmt = (n) => (n === null || n === undefined ? '' : Number(n).toLocaleString('en-US'))

async function createLeadFromBusiness(sql, h, user, { assignTo, priceOverride } = {}) {
  const industryLabel = industryByKey(h.industry)?.label || h.industry || h.category || null
  const r = first(
    await sql.query(
      `INSERT INTO leads (
         company_name, phone, email, location, industry, website_url, has_website, website_quality,
         avg_rating, review_count, opportunity_score, status, source, notes,
         intel_business_id, lead_score, recommended_service, suggested_price, price_low, price_high, price_currency,
         market, country, region, city, postal_code, assigned_to, rep_id
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'discovered',$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$26)
       RETURNING id, company_name, status`,
      [
        h.business_name,
        h.phone_intl || h.phone || null,
        h.email || null,
        h.address || [h.city, h.region, h.country].filter(Boolean).join(', ') || null,
        industryLabel ? String(industryLabel).toLowerCase() : null,
        h.website || null,
        !!h.website && !isSocialUrl(h.website),
        leadWebsiteQuality(h),
        h.rating,
        h.review_count,
        Math.round(h.score / 10),
        h.provider,
        leadNotes(h, user),
        h.id,
        h.score,
        h.pricing?.services?.length ? h.pricing.package_name : null,
        priceOverride ?? h.pricing?.suggested_price ?? null,
        h.pricing?.price_low ?? null,
        h.pricing?.price_high ?? null,
        h.pricing?.currency || null,
        h.market || null,
        h.country || null,
        h.region || null,
        h.city || null,
        h.postal_code || null,
        assignTo || null,
      ],
    ),
  )
  await sql.query(`UPDATE discovered_businesses SET lead_id = $1, status = 'added', updated_at = now() WHERE id = $2`, [r.id, h.id])
  try {
    await sql.query(`INSERT INTO activities (lead_id, type, outcome, notes) VALUES ($1, 'note', NULL, $2)`, [
      r.id,
      `Added to Leads from Lead Intelligence (score ${h.score}/100).`,
    ])
  } catch (e) {
    log('warn', 'activity_insert_failed', { error: e.message })
  }
  return r
}

// Update an existing lead with discovery data: fills empty fields only and
// refreshes the intelligence columns. Status and activity are preserved.
async function updateLeadFromBusiness(sql, leadId, h) {
  const r = first(
    await sql.query(
      `UPDATE leads SET
         phone = COALESCE(NULLIF(phone, ''), $2),
         email = COALESCE(NULLIF(email, ''), $3),
         location = COALESCE(NULLIF(location, ''), $4),
         website_url = COALESCE(NULLIF(website_url, ''), $5),
         avg_rating = COALESCE($6, avg_rating),
         review_count = COALESCE($7, review_count),
         intel_business_id = $8,
         lead_score = $9,
         recommended_service = $10,
         suggested_price = $11,
         price_low = $12,
         price_high = $13,
         price_currency = $14,
         market = COALESCE(market, $15),
         country = COALESCE(country, $16),
         region = COALESCE(region, $17),
         city = COALESCE(city, $18),
         postal_code = COALESCE(postal_code, $19)
       WHERE id = $1
       RETURNING id, company_name, status`,
      [
        leadId,
        h.phone_intl || h.phone || null,
        h.email || null,
        h.address || null,
        h.website || null,
        h.rating,
        h.review_count,
        h.id,
        h.score,
        h.pricing?.services?.length ? h.pricing.package_name : null,
        h.pricing?.suggested_price ?? null,
        h.pricing?.price_low ?? null,
        h.pricing?.price_high ?? null,
        h.pricing?.currency || null,
        h.market || null,
        h.country || null,
        h.region || null,
        h.city || null,
        h.postal_code || null,
      ],
    ),
  )
  if (!r) throw new UserError('That lead no longer exists.', 404)
  await sql.query(`UPDATE discovered_businesses SET lead_id = $1, status = 'added', updated_at = now() WHERE id = $2`, [leadId, h.id])
  try {
    await sql.query(`INSERT INTO activities (lead_id, type, outcome, notes) VALUES ($1, 'note', NULL, $2)`, [
      leadId,
      `Lead Intelligence data updated (score ${h.score}/100${h.pricing?.services?.length ? `, recommended ${h.pricing.package_name}` : ''}).`,
    ])
  } catch {
    /* non-fatal */
  }
  return r
}

// ---------------------------------------------------------------------------
// Input validation
// ---------------------------------------------------------------------------

const str = (v, max = 120) => {
  const s = String(v ?? '').trim()
  return s ? s.slice(0, max) : ''
}
const optNum = (v, min, max) => {
  if (v === '' || v === null || v === undefined) return null
  const n = Number(v)
  if (!Number.isFinite(n) || n < min || n > max) throw new UserError(`Invalid value: ${v}`)
  return n
}
const isUuid = (v) => typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)
const uuidList = (v, max = 100) => {
  const list = Array.isArray(v) ? v.filter(isUuid) : []
  if (!list.length) throw new UserError('No businesses selected.')
  return Array.from(new Set(list)).slice(0, max)
}

const ENUMS = {
  website: ['any', 'has', 'none'],
  website_quality: ['any', 'poor_or_none', 'needs_improvement', 'good'],
  booking: ['any', 'has', 'none'],
  contact_form: ['any', 'has', 'none'],
  social: ['any', 'has', 'none'],
}

export function validateCriteria(body, settings) {
  const market = marketByKey(body.market)
  if (!market) throw new UserError('Choose a market.')
  const c = { market: market.key }
  if (market.countryCode) {
    c.country = market.country
    c.country_code = market.countryCode
  } else if (market.countries) {
    const ctry = market.countries.find((x) => x.code === body.country_code)
    if (!ctry) throw new UserError('Choose a country.')
    c.country = ctry.name
    c.country_code = ctry.code
  } else {
    c.country = str(body.country, 80)
    if (!c.country) throw new UserError('Enter a country.')
    c.country_code = /^[A-Za-z]{2}$/.test(body.country_code || '') ? body.country_code.toUpperCase() : null
  }
  c.region = str(body.region, 80)
  if (market.key === 'US' && c.region && !market.regions.some((r) => r.code === c.region)) throw new UserError('Unknown state.')
  c.city = str(body.city, 80)
  c.postal_code = market.supportsPostal ? str(body.postal_code, 12) : ''
  if (c.postal_code && !/^[A-Za-z0-9 -]{3,12}$/.test(c.postal_code)) throw new UserError('Invalid ZIP / postal code.')
  c.radius_km = market.supportsRadius ? optNum(body.radius_km, 1, 50) : null
  if (!c.city && !c.postal_code && !c.region && ['US', 'INTL', 'CARIBBEAN'].includes(market.key) && !c.country_code) {
    throw new UserError('Add a city, state/region or postal code.')
  }
  if (market.key === 'US' && !c.city && !c.postal_code && !c.region) throw new UserError('Choose a state, city or ZIP code.')
  if (c.radius_km && !c.city && !c.postal_code) throw new UserError('Radius needs a city or ZIP code as the center.')

  const inds = (Array.isArray(body.industries) ? body.industries : []).filter((k) => industryByKey(k))
  c.industries = Array.from(new Set(inds)).slice(0, settings.limits.max_industries_per_search)
  c.custom_term = str(body.custom_term, 80).replace(/[<>{}]/g, '')
  if (!c.industries.length && !c.custom_term) throw new UserError('Choose an industry or enter a search term.')

  const f = body.filters || {}
  c.filters = {
    min_reviews: optNum(f.min_reviews, 0, 100000),
    max_reviews: optNum(f.max_reviews, 0, 100000),
    min_rating: optNum(f.min_rating, 0, 5),
    max_rating: optNum(f.max_rating, 0, 5),
    open_only: f.open_only !== false,
  }
  for (const [k, allowed] of Object.entries(ENUMS)) c.filters[k] = allowed.includes(f[k]) ? f[k] : 'any'
  if (c.filters.min_reviews !== null && c.filters.max_reviews !== null && c.filters.min_reviews > c.filters.max_reviews) {
    throw new UserError('Minimum reviews is higher than maximum reviews.')
  }
  if (c.filters.min_rating !== null && c.filters.max_rating !== null && c.filters.min_rating > c.filters.max_rating) {
    throw new UserError('Minimum rating is higher than maximum rating.')
  }
  const maxRes = optNum(body.max_results, 20, 60) ?? settings.limits.max_results_per_search
  c.max_results = Math.min(settings.limits.max_results_per_search, Math.round(maxRes / 20) * 20 || 20)
  c.auto_analyze = body.auto_analyze !== false
  return c
}

function locationText(c) {
  const regionName = c.market === 'US' ? marketByKey('US').regions.find((r) => r.code === c.region)?.name : c.region
  if (c.postal_code) return [c.postal_code, regionName, c.country].filter(Boolean).join(', ')
  return [c.city, regionName, c.country].filter(Boolean).join(', ')
}

function searchLabel(c) {
  const what = c.industries.length ? c.industries.map((k) => industryByKey(k)?.label).join(', ') : c.custom_term
  const where = c.postal_code || c.city || c.region || c.country
  return `${what} · ${where}`
}

// ---------------------------------------------------------------------------
// Upsert discovered businesses with cross-search / cross-provider dedupe
// ---------------------------------------------------------------------------

async function upsertBusinesses(sql, items) {
  if (!items.length) return { ids: [], newCount: 0 }
  const keys = items.map((b) => ({ ...b, _keys: b._keys || dedupeKeys(b) }))
  const cands = rows(
    await sql.query(
      `SELECT id, provider, provider_id, business_name, phone, phone_intl, website, address, city
         FROM discovered_businesses
        WHERE (provider, provider_id) IN (SELECT * FROM jsonb_to_recordset($1::jsonb) AS x(provider TEXT, provider_id TEXT))
           OR domain = ANY($2::text[]) OR phone_key = ANY($3::text[]) OR name_key = ANY($4::text[])`,
      [
        JSON.stringify(keys.map((b) => ({ provider: b.provider, provider_id: b.provider_id }))),
        keys.map((b) => b._keys.domain).filter(Boolean),
        keys.map((b) => b._keys.phone_key).filter(Boolean),
        keys.map((b) => b._keys.name_key).filter(Boolean),
      ],
    ),
  )

  const toInsert = []
  const toMerge = []
  const idFor = new Map()
  for (const b of keys) {
    const exact = cands.find((c) => c.provider === b.provider && c.provider_id === b.provider_id)
    const match = exact || cands.find((c) => sameBusiness(c, b))
    if (match && !exact) {
      toMerge.push({ id: match.id, ...b })
      idFor.set(`${b.provider}:${b.provider_id}`, match.id)
    } else toInsert.push(b)
  }

  let newCount = 0
  if (toInsert.length) {
    const payload = toInsert.map((b) => ({
      provider: b.provider, provider_id: b.provider_id, business_name: b.business_name, industry: b.industry || null,
      category: b.category, types: b.types || [], address: b.address, city: b.city, region: b.region, country: b.country,
      country_code: b.country_code, postal_code: b.postal_code, market: b.market || null, phone: b.phone,
      phone_intl: b.phone_intl, website: b.website, email: b.email, rating: b.rating, review_count: b.review_count,
      hours: b.hours, description: b.description, business_status: b.business_status, source_url: b.source_url,
      lat: b.lat, lng: b.lng, name_key: b._keys.name_key, phone_key: b._keys.phone_key, domain: b._keys.domain,
      addr_key: b._keys.addr_key, raw_data: b.raw_data || {}, enriched: b.raw_data?.enriched !== false,
    }))
    const ins = rows(
      await sql.query(
        `INSERT INTO discovered_businesses (provider, provider_id, business_name, industry, category, types, address, city,
            region, country, country_code, postal_code, market, phone, phone_intl, website, email, email_source, rating,
            review_count, hours, description, business_status, source_url, lat, lng, name_key, phone_key, domain, addr_key,
            raw_data, enriched_at)
         SELECT provider, provider_id, business_name, industry, category, types, address, city, region, country,
                country_code, postal_code, market, phone, phone_intl, website, email,
                CASE WHEN email IS NULL THEN NULL ELSE 'provider' END, rating, review_count, hours, description,
                business_status, source_url, lat, lng, name_key, phone_key, domain, addr_key, raw_data,
                CASE WHEN enriched THEN now() ELSE NULL END
           FROM jsonb_to_recordset($1::jsonb) AS x(provider TEXT, provider_id TEXT, business_name TEXT, industry TEXT,
                category TEXT, types TEXT[], address TEXT, city TEXT, region TEXT, country TEXT, country_code TEXT,
                postal_code TEXT, market TEXT, phone TEXT, phone_intl TEXT, website TEXT, email TEXT, rating FLOAT,
                review_count INT, hours JSONB, description TEXT, business_status TEXT, source_url TEXT, lat FLOAT,
                lng FLOAT, name_key TEXT, phone_key TEXT, domain TEXT, addr_key TEXT, raw_data JSONB, enriched BOOLEAN)
         ON CONFLICT (provider, provider_id) DO UPDATE SET
           business_name = EXCLUDED.business_name,
           category = COALESCE(EXCLUDED.category, discovered_businesses.category),
           types = EXCLUDED.types,
           address = COALESCE(EXCLUDED.address, discovered_businesses.address),
           city = COALESCE(EXCLUDED.city, discovered_businesses.city),
           region = COALESCE(EXCLUDED.region, discovered_businesses.region),
           country = COALESCE(EXCLUDED.country, discovered_businesses.country),
           country_code = COALESCE(EXCLUDED.country_code, discovered_businesses.country_code),
           postal_code = COALESCE(EXCLUDED.postal_code, discovered_businesses.postal_code),
           industry = COALESCE(discovered_businesses.industry, EXCLUDED.industry),
           market = COALESCE(discovered_businesses.market, EXCLUDED.market),
           phone = COALESCE(EXCLUDED.phone, discovered_businesses.phone),
           phone_intl = COALESCE(EXCLUDED.phone_intl, discovered_businesses.phone_intl),
           website = CASE WHEN EXCLUDED.enriched_at IS NOT NULL THEN EXCLUDED.website ELSE discovered_businesses.website END,
           rating = COALESCE(EXCLUDED.rating, discovered_businesses.rating),
           review_count = COALESCE(EXCLUDED.review_count, discovered_businesses.review_count),
           hours = COALESCE(EXCLUDED.hours, discovered_businesses.hours),
           business_status = COALESCE(EXCLUDED.business_status, discovered_businesses.business_status),
           source_url = COALESCE(EXCLUDED.source_url, discovered_businesses.source_url),
           lat = COALESCE(EXCLUDED.lat, discovered_businesses.lat),
           lng = COALESCE(EXCLUDED.lng, discovered_businesses.lng),
           name_key = EXCLUDED.name_key,
           phone_key = COALESCE(EXCLUDED.phone_key, discovered_businesses.phone_key),
           domain = CASE WHEN EXCLUDED.enriched_at IS NOT NULL THEN EXCLUDED.domain ELSE discovered_businesses.domain END,
           addr_key = COALESCE(EXCLUDED.addr_key, discovered_businesses.addr_key),
           raw_data = CASE WHEN EXCLUDED.enriched_at IS NOT NULL OR discovered_businesses.enriched_at IS NULL
                           THEN EXCLUDED.raw_data ELSE discovered_businesses.raw_data END,
           enriched_at = COALESCE(EXCLUDED.enriched_at, discovered_businesses.enriched_at),
           updated_at = now()
         RETURNING id, provider, provider_id, (xmax = 0) AS inserted`,
        [JSON.stringify(payload)],
      ),
    )
    for (const r of ins) {
      idFor.set(`${r.provider}:${r.provider_id}`, r.id)
      if (r.inserted) newCount++
    }
  }
  if (toMerge.length) {
    // Same business found through another provider/listing: fill gaps only.
    await sql.query(
      `UPDATE discovered_businesses d SET
         phone = COALESCE(d.phone, x.phone), phone_intl = COALESCE(d.phone_intl, x.phone_intl),
         website = COALESCE(d.website, x.website), address = COALESCE(d.address, x.address),
         city = COALESCE(d.city, x.city), region = COALESCE(d.region, x.region),
         postal_code = COALESCE(d.postal_code, x.postal_code),
         rating = COALESCE(d.rating, x.rating), review_count = GREATEST(d.review_count, x.review_count),
         domain = COALESCE(d.domain, x.domain), phone_key = COALESCE(d.phone_key, x.phone_key),
         updated_at = now()
        FROM jsonb_to_recordset($1::jsonb) AS x(id UUID, phone TEXT, phone_intl TEXT, website TEXT, address TEXT,
             city TEXT, region TEXT, postal_code TEXT, rating FLOAT, review_count INT, domain TEXT, phone_key TEXT)
       WHERE d.id = x.id`,
      [
        JSON.stringify(
          toMerge.map((b) => ({
            id: b.id, phone: b.phone, phone_intl: b.phone_intl, website: b.website, address: b.address, city: b.city,
            region: b.region, postal_code: b.postal_code, rating: b.rating, review_count: b.review_count,
            domain: b._keys.domain, phone_key: b._keys.phone_key,
          })),
        ),
      ],
    )
  }
  return {
    ids: keys.map((b) => idFor.get(`${b.provider}:${b.provider_id}`)).filter(Boolean),
    newCount,
    mergedCount: toMerge.length,
  }
}

// Link discovered businesses to existing CRM leads (duplicate prevention).
async function linkExistingLeads(sql, businesses) {
  const leads = await loadLeadIndex(sql)
  const links = []
  for (const b of businesses) {
    if (b.lead) continue
    const m = leadMatchFor(b, leads)
    if (m) links.push({ id: b.id, lead_id: m.lead.id })
  }
  if (links.length) {
    await sql.query(
      `UPDATE discovered_businesses d SET lead_id = x.lead_id, status = CASE WHEN d.status = 'new' THEN 'added' ELSE d.status END
         FROM jsonb_to_recordset($1::jsonb) AS x(id UUID, lead_id UUID) WHERE d.id = x.id`,
      [JSON.stringify(links)],
    )
  }
  return links.length
}

// ---------------------------------------------------------------------------
// Provider orchestration
// ---------------------------------------------------------------------------

function providerChain(settings) {
  const chain = [settings.provider.primary]
  if (settings.provider.allow_legacy_fallback && settings.provider.primary === 'google_places') chain.push('google_places_legacy')
  return chain
}

async function runProviderSearch(settings, c, usage, userId) {
  if (!googleKey()) {
    throw new UserError(
      'Business discovery is not configured yet. Add GOOGLE_PLACES_API_KEY in Vercel → Settings → Environment Variables.',
      503,
      { code: 'not_configured' },
    )
  }
  const chain = providerChain(settings)
  let lastErr = null
  for (const pKey of chain) {
    const provider = PROVIDERS[pKey]
    try {
      let bias = null
      if (c.radius_km) {
        const center = await provider.geocode(locationText(c), c.country_code)
        usage.push({ user_id: userId, kind: 'geocode_request', provider: pKey, units: 1, est_cost: costOf(settings, pKey, 'geocode') })
        if (!center.point) throw new UserError('Could not locate that city / ZIP code for the radius search.')
        bias = { ...center.point, radiusM: c.radius_km * 1000 }
      }
      const all = []
      const queries = []
      const terms = c.industries.length ? c.industries.map((k) => ({ key: k, q: industryByKey(k).query })) : [{ key: null, q: c.custom_term }]
      const perTerm = Math.max(20, Math.ceil(c.max_results / terms.length / 20) * 20)
      for (const t of terms) {
        const textQuery = `${t.q} in ${locationText(c)}`
        queries.push(textQuery)
        let token = null
        let got = 0
        for (let page = 0; page < 3 && got < perTerm; page++) {
          const res = await provider.search({
            textQuery,
            regionCode: c.country_code,
            minRating: c.filters.min_rating,
            bias,
            pageToken: token,
          })
          usage.push({ user_id: userId, kind: 'search_request', provider: pKey, units: 1, est_cost: costOf(settings, pKey, 'search') })
          for (const it of res.items) all.push({ ...it, industry: t.key || null, _term: t.key || c.custom_term })
          got += res.items.length
          token = res.nextPageToken
          if (!token) break
          if (res.nextPageDelayMs) await new Promise((r) => setTimeout(r, res.nextPageDelayMs))
        }
      }
      return { providerKey: pKey, items: all, queries, bias, fellBack: pKey !== chain[0] ? lastErr : null }
    } catch (e) {
      if (e instanceof ProviderError && e.code === 'service_disabled' && pKey !== chain[chain.length - 1]) {
        log('warn', 'provider_fallback', { from: pKey, detail: e.detail })
        lastErr = e
        continue
      }
      throw e
    }
  }
  throw lastErr || new Error('no provider available')
}

async function enrichLegacy(settings, items, usage, userId, limit) {
  const provider = PROVIDERS.google_places_legacy
  const targets = items.filter((b) => b.provider === 'google_places_legacy' && b.raw_data?.enriched === false).slice(0, limit)
  let i = 0
  const worker = async () => {
    while (i < targets.length) {
      const b = targets[i++]
      try {
        const { item } = await provider.details(b.provider_id)
        usage.push({ user_id: userId, kind: 'details_request', provider: 'google_places_legacy', units: 1, est_cost: costOf(settings, 'google_places_legacy', 'details') })
        Object.assign(b, { ...item, industry: b.industry, _term: b._term, raw_data: { enriched: true } })
      } catch (e) {
        log('warn', 'legacy_enrich_failed', { id: b.provider_id, error: e.message })
      }
    }
  }
  await Promise.all([worker(), worker(), worker(), worker()])
  return targets.length
}

function publicProviderMessage(e) {
  if (e instanceof UserError) return e.message
  if (e instanceof ProviderError) {
    if (e.code === 'service_disabled') return 'Business discovery is not enabled for your Google API key. Enable "Places API (New)" in Google Cloud Console.'
    if (e.code === 'auth') return 'Business discovery is not available: the Google API key was rejected. Check the key in Vercel settings.'
    if (e.code === 'quota') return 'Business discovery hit the provider quota. Please try again later.'
    if (e.code === 'bad_request') return 'The provider could not process this search. Try simplifying the location or term.'
  }
  return 'Business discovery is temporarily unavailable. Please try again.'
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

async function actionBootstrap(sql, user) {
  const settings = await loadSettings(sql)
  const presets = rows(await sql.query(`SELECT id, name, criteria, is_builtin, created_by, created_at FROM intel_presets ORDER BY is_builtin DESC, created_at ASC`))
  let reps = []
  try {
    reps = rows(await sql.query(`SELECT id, name FROM sales_reps ORDER BY name ASC LIMIT 200`))
  } catch {
    reps = []
  }
  return {
    success: true,
    user: { id: user.id, name: user.name, role: user.role },
    catalog: { markets: MARKETS, industries: INDUSTRIES, industry_groups: INDUSTRY_GROUPS, price_items: PRICE_ITEMS },
    settings,
    default_settings: DEFAULT_SETTINGS,
    presets,
    reps,
    providers: providerStatus(),
    usage: await usageToday(sql, settings),
  }
}

async function actionSearch(sql, user, body) {
  const settings = await loadSettings(sql)
  const c = validateCriteria(body, settings)
  const used = await usageToday(sql, settings)
  if (used.searches >= settings.limits.max_searches_per_day) {
    throw new UserError(`Daily search limit reached (${settings.limits.max_searches_per_day}). Adjust it in Settings → Limits if needed.`, 429)
  }

  const search = first(
    await sql.query(
      `INSERT INTO lead_discovery_searches (user_id, user_name, label, market, country, country_code, region, city,
          postal_code, radius_km, industries, custom_term, filters, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13::jsonb,'running') RETURNING id, created_at`,
      [
        String(user.id), user.name || null, searchLabel(c), c.market, c.country, c.country_code, c.region || null,
        c.city || null, c.postal_code || null, c.radius_km, c.industries, c.custom_term || null,
        JSON.stringify({ ...c.filters, max_results: c.max_results, auto_analyze: c.auto_analyze }),
      ],
    ),
  )
  const usage = []
  const t0 = Date.now()
  try {
    const found = await runProviderSearch(settings, c, usage, String(user.id))
    const raw = found.items.map((b) => ({ ...b, market: c.market }))

    // Normalize + in-batch dedupe
    const { items: unique, duplicates } = dedupeList(raw)

    // Legacy fallback: stage-2 enrichment for the most relevant results only
    let enriched = 0
    if (found.providerKey === 'google_places_legacy') {
      const pre = unique.filter((b) => passesBaseFilters(b, c.filters).ok)
      pre.sort((a, b) => (b.review_count || 0) - (a.review_count || 0))
      enriched = await enrichLegacy(settings, pre, usage, String(user.id), settings.provider.legacy_enrich_count)
    }

    // Radius post-filter (provider bias is soft)
    let inArea = unique
    if (found.bias) {
      inArea = unique.filter((b) => b.lat === null || b.lat === undefined || haversineKm(found.bias, { lat: b.lat, lng: b.lng }) <= c.radius_km + 0.5)
    }
    const kept = inArea.filter((b) => passesBaseFilters(b, c.filters).ok).slice(0, c.max_results)
    const filteredOut = inArea.length - kept.length + (unique.length - inArea.length)

    const up = await upsertBusinesses(sql, kept)
    const ids = up.ids
    if (ids.length) {
      await sql.query(
        `INSERT INTO lead_discovery_search_results (search_id, business_id, rank)
         SELECT $1, x.id, x.rank FROM jsonb_to_recordset($2::jsonb) AS x(id UUID, rank INT)
         ON CONFLICT DO NOTHING`,
        [search.id, JSON.stringify(ids.map((id, i) => ({ id, rank: i })))],
      )
    }

    let results = ids.length ? await loadBusinesses(sql, settings, `b.id = ANY($1::uuid[])`, [ids]) : []
    const linked = await linkExistingLeads(sql, results)
    if (linked) results = await loadBusinesses(sql, settings, `b.id = ANY($1::uuid[])`, [ids])
    await persistEvaluations(sql, results)

    usage.push({ user_id: String(user.id), search_id: search.id, kind: 'businesses_returned', provider: found.providerKey, units: results.length, est_cost: 0 })
    for (const u of usage) u.search_id = search.id
    const requestCount = usage.filter((u) => u.kind.endsWith('_request')).reduce((a, u) => a + u.units, 0)
    const estCost = usage.reduce((a, u) => a + Number(u.est_cost || 0), 0)
    await recordUsage(sql, usage)

    await sql.query(
      `UPDATE lead_discovery_searches SET status = 'complete', provider = $2, query_texts = $3, result_count = $4,
          new_count = $5, duplicate_count = $6, filtered_count = $7, request_count = $8, est_cost = $9, completed_at = now()
        WHERE id = $1`,
      [search.id, found.providerKey, found.queries, results.length, up.newCount, duplicates + (up.mergedCount || 0), filteredOut, requestCount, estCost],
    )

    // Stage 3 queue: best-scoring results with an unanalyzed (or stale) website
    const analysesLeft = Math.max(0, settings.limits.max_analyses_per_day - (used.website_analyses || 0))
    const staleMs = 30 * 24 * 3600 * 1000
    const queue = c.auto_analyze
      ? results
          .filter((h) => h.website && !isSocialUrl(h.website) && (!h.analysis?.analyzed_at || Date.now() - new Date(h.analysis.analyzed_at).getTime() > staleMs))
          .sort((a, b) => b.score - a.score)
          .slice(0, Math.min(settings.limits.auto_analyze_count, analysesLeft))
          .map((h) => h.id)
      : []

    log('info', 'search_complete', {
      user: user.id, search: search.id, provider: found.providerKey, found: raw.length, kept: results.length,
      new: up.newCount, dup: duplicates, enriched, requests: requestCount, ms: Date.now() - t0,
    })

    return {
      success: true,
      search: {
        id: search.id,
        label: searchLabel(c),
        provider: found.providerKey,
        provider_note: found.fellBack
          ? 'Places API (New) is not enabled on your key, so the legacy Places API was used. Enable "Places API (New)" in Google Cloud for richer, cheaper results.'
          : null,
        created_at: search.created_at,
        stats: {
          returned: raw.length, kept: results.length, new: up.newCount, duplicates: duplicates + (up.mergedCount || 0),
          filtered_out: filteredOut, already_in_leads: results.filter((r) => r.lead).length, requests: requestCount,
          est_cost: estCost, enriched,
        },
      },
      criteria: c,
      results: withFilterState(results, c.filters),
      analyze_queue: queue,
      usage: await usageToday(sql, settings),
    }
  } catch (e) {
    await recordUsage(sql, usage.map((u) => ({ ...u, search_id: search.id })))
    await sql.query(`UPDATE lead_discovery_searches SET status = 'failed', error = $2, completed_at = now() WHERE id = $1`, [
      search.id,
      String(e.message || e).slice(0, 500),
    ])
    log('error', 'search_failed', { user: user.id, search: search.id, error: e.message, code: e.code, detail: e.detail })
    throw new UserError(publicProviderMessage(e), e instanceof UserError ? e.status : 502, { search_id: search.id })
  }
}

async function actionAnalyze(sql, user, body) {
  const settings = await loadSettings(sql)
  const ids = uuidList(body.business_ids, 4)
  const used = await usageToday(sql, settings)
  const left = settings.limits.max_analyses_per_day - (used.website_analyses || 0)
  if (left <= 0) throw new UserError(`Daily website-analysis limit reached (${settings.limits.max_analyses_per_day}).`, 429)
  const targets = await loadBusinesses(sql, settings, `b.id = ANY($1::uuid[])`, [ids.slice(0, left)])
  const usage = []
  await Promise.all(
    targets.map(async (h) => {
      if (!h.website || isSocialUrl(h.website)) return
      let res
      try {
        res = await analyzeWebsite(h.website, { slowMs: settings.scoring.slow_load_ms })
      } catch (e) {
        res = { website_status: 'unreachable', mobile_status: 'unknown', booking_status: 'unknown', contact_form_status: 'unknown', technology_data: [], website_signals: {}, error: 'analysis failed' }
        log('error', 'analysis_crash', { id: h.id, error: e.message })
      }
      usage.push({ user_id: String(user.id), kind: 'website_analysis', provider: 'website', units: 1, est_cost: 0 })
      const quality = evaluateBusiness(h, res, settings).website_quality
      await sql.query(
        `INSERT INTO business_analysis (business_id, website_status, mobile_status, booking_status, contact_form_status,
            website_quality, technology_data, website_signals, error, analyzed_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb,$9, now())
         ON CONFLICT (business_id) DO UPDATE SET website_status = EXCLUDED.website_status,
           mobile_status = EXCLUDED.mobile_status, booking_status = EXCLUDED.booking_status,
           contact_form_status = EXCLUDED.contact_form_status, website_quality = EXCLUDED.website_quality,
           technology_data = EXCLUDED.technology_data, website_signals = EXCLUDED.website_signals,
           error = EXCLUDED.error, analyzed_at = now()`,
        [h.id, res.website_status, res.mobile_status, res.booking_status, res.contact_form_status, quality,
          JSON.stringify(res.technology_data || []), JSON.stringify(res.website_signals || {}), res.error || null],
      )
      // Publicly listed business contact details from the business's own site.
      const sig = res.website_signals || {}
      const social = sig.social && Object.keys(sig.social).length ? sig.social : null
      const email = !h.email && Array.isArray(sig.emails) && sig.emails.length ? sig.emails[0] : null
      if (social || email) {
        await sql.query(
          `UPDATE discovered_businesses SET social = COALESCE($2::jsonb, social), email = COALESCE(email, $3),
              email_source = CASE WHEN email IS NULL AND $3::text IS NOT NULL THEN 'website (mailto link)' ELSE email_source END,
              updated_at = now() WHERE id = $1`,
          [h.id, social ? JSON.stringify(social) : null, email],
        )
      }
    }),
  )
  await recordUsage(sql, usage)
  const results = await loadBusinesses(sql, settings, `b.id = ANY($1::uuid[])`, [ids])
  await persistEvaluations(sql, results)
  const filters = body.filters && typeof body.filters === 'object' ? body.filters : null
  await sql.query(
    `UPDATE business_analysis a SET opportunity_data = x.o FROM jsonb_to_recordset($1::jsonb) AS x(id UUID, o JSONB) WHERE a.business_id = x.id`,
    [JSON.stringify(results.map((r) => ({ id: r.id, o: { tags: r.tags, score: r.score } })))],
  )
  return { success: true, results: withFilterState(results, filters) }
}

async function actionEnrich(sql, user, body) {
  const settings = await loadSettings(sql)
  const [id] = uuidList([body.business_id], 1)
  const b = first(await sql.query(`SELECT id, provider, provider_id, industry, market FROM discovered_businesses WHERE id = $1`, [id]))
  if (!b) throw new UserError('Business not found.', 404)
  const provider = PROVIDERS[b.provider]
  if (!provider) throw new UserError('This business was entered manually; there is no provider data to refresh.')
  if (rateLimited(`enrich:${user.id}`, 20)) throw new UserError('Too many refreshes. Wait a minute.', 429)
  try {
    const { item } = await provider.details(b.provider_id)
    await recordUsage(sql, [{ user_id: String(user.id), kind: 'details_request', provider: b.provider, units: 1, est_cost: costOf(settings, b.provider, 'details') }])
    await upsertBusinesses(sql, [{ ...item, industry: b.industry, market: b.market, raw_data: { ...(item.raw_data || {}), enriched: true } }])
  } catch (e) {
    log('error', 'enrich_failed', { id, error: e.message, detail: e.detail })
    throw new UserError(publicProviderMessage(e), 502)
  }
  const [h] = await loadBusinesses(sql, settings, `b.id = $1`, [id])
  await persistEvaluations(sql, [h])
  return { success: true, business: h }
}

async function actionResults(sql, user, body) {
  const settings = await loadSettings(sql)
  if (!isUuid(body.search_id)) throw new UserError('Invalid search.')
  const search = first(await sql.query(`SELECT * FROM lead_discovery_searches WHERE id = $1`, [body.search_id]))
  if (!search) throw new UserError('Search not found.', 404)
  const results = await loadBusinesses(
    sql, settings,
    `b.id IN (SELECT business_id FROM lead_discovery_search_results WHERE search_id = $1)`,
    [body.search_id],
  )
  return { success: true, search, results: withFilterState(results, search.filters) }
}

async function actionDetail(sql, user, body) {
  const settings = await loadSettings(sql)
  const [id] = uuidList([body.business_id], 1)
  const [h] = await loadBusinesses(sql, settings, `b.id = $1`, [id])
  if (!h) throw new UserError('Business not found.', 404)
  let activities = []
  let tasks = []
  if (h.lead) {
    activities = rows(await sql.query(`SELECT id, type, outcome, notes, created_at FROM activities WHERE lead_id = $1 ORDER BY created_at DESC LIMIT 50`, [h.lead.id]))
    try {
      tasks = rows(await sql.query(`SELECT id, title, due_date, is_complete FROM tasks WHERE lead_id = $1 AND is_complete = false ORDER BY due_date ASC NULLS LAST LIMIT 20`, [h.lead.id]))
    } catch {
      tasks = []
    }
  }
  const searches = rows(
    await sql.query(
      `SELECT s.id, s.label, s.created_at FROM lead_discovery_search_results r JOIN lead_discovery_searches s ON s.id = r.search_id
        WHERE r.business_id = $1 ORDER BY s.created_at DESC LIMIT 10`,
      [id],
    ),
  )
  return { success: true, business: h, activities, tasks, searches }
}

async function actionCheckLeads(sql, user, body) {
  const settings = await loadSettings(sql)
  const ids = uuidList(body.business_ids, 200)
  const list = await loadBusinesses(sql, settings, `b.id = ANY($1::uuid[])`, [ids])
  const leads = await loadLeadIndex(sql)
  return {
    success: true,
    checks: list.map((h) => {
      const m = leadMatchFor(h, leads)
      return { business_id: h.id, business_name: h.business_name, existing: m ? { id: m.lead.id, company_name: m.lead.company_name, status: m.lead.status, reason: m.reason } : null }
    }),
  }
}

async function actionAddLeads(sql, user, body) {
  const settings = await loadSettings(sql)
  const ids = uuidList(body.business_ids, 200)
  const mode = body.mode === 'update' ? 'update' : 'create'
  const assignTo = isUuid(body.assign_to) ? body.assign_to : null
  const list = await loadBusinesses(sql, settings, `b.id = ANY($1::uuid[])`, [ids])
  const leads = await loadLeadIndex(sql)
  const added = []
  const updated = []
  const skipped = []
  for (const h of list) {
    if (mode === 'update') {
      if (!isUuid(body.lead_id) || ids.length !== 1) throw new UserError('Choose the lead to update.')
      const r = await updateLeadFromBusiness(sql, body.lead_id, h)
      updated.push({ business_id: h.id, lead: r })
      continue
    }
    const m = leadMatchFor(h, leads)
    if (m) {
      if (!h.lead) await sql.query(`UPDATE discovered_businesses SET lead_id = $1, status = 'added' WHERE id = $2`, [m.lead.id, h.id])
      skipped.push({ business_id: h.id, business_name: h.business_name, existing: { id: m.lead.id, company_name: m.lead.company_name, status: m.lead.status, reason: m.reason } })
      continue
    }
    const ov = body.price_overrides && typeof body.price_overrides === 'object' ? body.price_overrides[h.id] : undefined
    const priceOverride = ov === undefined || ov === '' || ov === null ? null : optNum(ov, 0, 10_000_000)
    const r = await createLeadFromBusiness(sql, h, user, { assignTo, priceOverride })
    leads.push({ id: r.id, company_name: h.business_name, phone: h.phone_intl || h.phone, website_url: h.website, location: h.address, intel_business_id: h.id })
    added.push({ business_id: h.id, lead: r })
  }
  if (assignTo && added.length) {
    try {
      await sql.query(
        `INSERT INTO sales_notifications (recipient_id, type, title, message, link) VALUES ($1, 'lead_assigned', 'New leads assigned', $2, '/leads')`,
        [assignTo, `${added.length} new lead${added.length === 1 ? '' : 's'} from Lead Intelligence were assigned to you`],
      )
    } catch {
      /* notifications table optional */
    }
  }
  log('info', 'leads_added', { user: user.id, added: added.length, updated: updated.length, skipped: skipped.length })
  const refreshed = await loadBusinesses(sql, settings, `b.id = ANY($1::uuid[])`, [ids])
  return { success: true, added, updated, skipped, results: refreshed }
}

const OUTCOME_STATUS = {
  no_answer: 'contacted',
  voicemail: 'contacted',
  call_back: 'contacted',
  wrong_number: null,
  interested: 'interested',
  demo_requested: 'interested',
  proposal_requested: 'interested',
  not_interested: 'lost',
  do_not_contact: 'do_not_contact',
}

async function actionLogCall(sql, user, body) {
  const settings = await loadSettings(sql)
  const outcome = CALL_OUTCOMES.includes(body.outcome) ? body.outcome : null
  if (!outcome) throw new UserError('Choose a call outcome.')
  const notes = str(body.notes, 4000)
  const followUp = body.next_follow_up && /^\d{4}-\d{2}-\d{2}$/.test(body.next_follow_up) ? body.next_follow_up : null

  let leadId = isUuid(body.lead_id) ? body.lead_id : null
  let h = null
  if (isUuid(body.business_id)) {
    ;[h] = await loadBusinesses(sql, settings, `b.id = $1`, [body.business_id])
    if (!h) throw new UserError('Business not found.', 404)
    if (!leadId && h.lead) leadId = h.lead.id
    if (!leadId) {
      const m = leadMatchFor(h, await loadLeadIndex(sql))
      leadId = m ? m.lead.id : (await createLeadFromBusiness(sql, h, user)).id
    }
  }
  if (!leadId) throw new UserError('No lead selected.')
  const lead = first(await sql.query(`SELECT id, company_name, status FROM leads WHERE id = $1`, [leadId]))
  if (!lead) throw new UserError('Lead not found.', 404)

  await sql.query(`INSERT INTO activities (lead_id, type, outcome, notes) VALUES ($1, 'call', $2, $3)`, [leadId, outcome, notes || null])

  let newStatus = null
  const target = OUTCOME_STATUS[outcome]
  const cur = lead.status || 'new'
  if (target === 'do_not_contact') newStatus = 'do_not_contact'
  else if (target === 'lost') newStatus = TERMINAL.has(cur) ? null : 'lost'
  else if (target && !TERMINAL.has(cur) && statusIdx(target) > statusIdx(cur)) newStatus = target
  if (newStatus) await sql.query(`UPDATE leads SET status = $2 WHERE id = $1`, [leadId, newStatus])

  if (followUp) {
    await sql.query(`UPDATE leads SET next_follow_up = $2 WHERE id = $1`, [leadId, followUp])
    const label = {
      call_back: 'Call back', demo_requested: 'Send demo to', proposal_requested: 'Send proposal to',
      interested: 'Follow up with', voicemail: 'Try again:', no_answer: 'Try again:',
    }[outcome] || 'Follow up with'
    await sql.query(
      `INSERT INTO tasks (lead_id, title, type, due_date, priority, is_complete) VALUES ($1, $2, 'follow_up', $3, 'high', false)`,
      [leadId, `${label} ${lead.company_name}`, followUp],
    )
  }
  if (outcome === 'do_not_contact' && h) await sql.query(`UPDATE discovered_businesses SET status = 'do_not_contact' WHERE id = $1`, [h.id])
  log('info', 'call_logged', { user: user.id, lead: leadId, outcome })
  return { success: true, lead_id: leadId, status: newStatus || cur, follow_up_created: !!followUp }
}

async function actionSetStatus(sql, _user, body) {
  const ids = uuidList(body.business_ids, 200)
  const status = ['new', 'saved', 'ignored'].includes(body.status) ? body.status : null
  if (!status) throw new UserError('Invalid status.')
  await sql.query(
    `UPDATE discovered_businesses SET status = CASE WHEN lead_id IS NOT NULL AND $2 = 'new' THEN 'added' ELSE $2 END, updated_at = now()
      WHERE id = ANY($1::uuid[])`,
    [ids, status],
  )
  return { success: true, updated: ids.length, status }
}

async function actionManualAdd(sql, user, body) {
  const settings = await loadSettings(sql)
  const name = str(body.business_name, 200)
  if (!name) throw new UserError('Business name is required.')
  if (!body.website && !body.phone) throw new UserError('Add at least a website or a phone number.')
  const market = marketByKey(body.market) ? body.market : 'INTL'
  const idHash = crypto.createHash('sha256').update(`${name.toLowerCase()}|${body.website || ''}|${body.phone || ''}`).digest('hex').slice(0, 24)
  const b = manualBusiness(body, idHash)
  if (b.rating !== null && !(b.rating >= 0 && b.rating <= 5)) throw new UserError('Rating must be between 0 and 5.')
  b.industry = industryByKey(body.industry) ? body.industry : null
  b.market = market
  const { ids } = await upsertBusinesses(sql, [b])
  let [h] = await loadBusinesses(sql, settings, `b.id = $1`, [ids[0]])
  if (await linkExistingLeads(sql, [h])) [h] = await loadBusinesses(sql, settings, `b.id = $1`, [ids[0]])
  await persistEvaluations(sql, [h])
  return { success: true, business: h, analyze_queue: h.website && !isSocialUrl(h.website) ? [h.id] : [] }
}

async function actionHistory(sql, user, body) {
  const limit = Math.min(100, Math.max(1, Number(body.limit) || 50))
  const list = rows(
    await sql.query(
      `SELECT s.id, s.label, s.market, s.country, s.region, s.city, s.postal_code, s.radius_km, s.industries,
              s.custom_term, s.filters, s.provider, s.status, s.result_count, s.new_count, s.duplicate_count,
              s.request_count, s.est_cost, s.error, s.user_name, s.created_at, s.completed_at,
              (SELECT COUNT(*)::int FROM lead_discovery_search_results r
                 JOIN discovered_businesses b ON b.id = r.business_id
                 JOIN leads l ON l.id = b.lead_id AND l.intel_business_id = b.id
                WHERE r.search_id = s.id) AS added_count
         FROM lead_discovery_searches s ORDER BY s.created_at DESC LIMIT $1`,
      [limit],
    ),
  )
  // Never show raw provider errors in the UI.
  return { success: true, searches: list.map((s) => ({ ...s, error: s.error ? 'Search failed' : null })) }
}

async function actionDashboard(sql) {
  const settings = await loadSettings(sql)
  const tz = settings.timezone
  const T = todayStartSql('$1')
  const thr = settings.scoring.high_opportunity_threshold
  const today = first(
    await sql.query(
      `SELECT
        (SELECT COUNT(DISTINCT r.business_id)::int FROM lead_discovery_search_results r
           JOIN lead_discovery_searches s ON s.id = r.search_id WHERE s.created_at >= ${T}) AS discovered,
        (SELECT COUNT(DISTINCT r.business_id)::int FROM lead_discovery_search_results r
           JOIN lead_discovery_searches s ON s.id = r.search_id
           JOIN lead_scores ls ON ls.business_id = r.business_id
          WHERE s.created_at >= ${T} AND ls.score >= $2) AS high_opportunity,
        (SELECT COUNT(*)::int FROM leads WHERE intel_business_id IS NOT NULL AND created_at >= ${T}) AS added,
        (SELECT COUNT(DISTINCT a.lead_id)::int FROM activities a JOIN leads l ON l.id = a.lead_id
          WHERE l.intel_business_id IS NOT NULL AND a.type = 'call' AND a.created_at >= ${T}) AS contacted,
        (SELECT COUNT(DISTINCT a.lead_id)::int FROM activities a JOIN leads l ON l.id = a.lead_id
          WHERE l.intel_business_id IS NOT NULL AND a.type = 'call'
            AND a.outcome IN ('interested','demo_requested','proposal_requested') AND a.created_at >= ${T}) AS interested`,
      [tz, thr],
    ),
  )
  const byStatus = rows(
    await sql.query(`SELECT COALESCE(status,'new') AS status, COUNT(*)::int AS n FROM leads WHERE intel_business_id IS NOT NULL GROUP BY 1`),
  )
  const count = (keys) => byStatus.filter((r) => keys.includes(r.status)).reduce((a, r) => a + r.n, 0)
  const total = byStatus.reduce((a, r) => a + r.n, 0)
  const beyond = (stage) => {
    const idx = statusIdx(stage)
    return byStatus.filter((r) => statusIdx(r.status) >= idx).reduce((a, r) => a + r.n, 0)
  }
  const pipeline = {
    total,
    discovered: count(['discovered', 'new']),
    qualified: count(['qualified']),
    contacted: beyond('contacted'),
    interested: beyond('interested'),
    demo_sent: beyond('demo_sent'),
    call_scheduled: beyond('call_scheduled'),
    proposal_sent: beyond('proposal_sent'),
    negotiation: beyond('negotiation'),
    won: count(['closed', 'closed_won']),
    lost: count(['lost']),
    do_not_contact: count(['do_not_contact']),
  }
  const positive = `('interested','demo_sent','call_scheduled','proposal_sent','negotiation','closed','closed_won')`
  const niche = rows(
    await sql.query(
      `SELECT COALESCE(industry, 'unspecified') AS key, COUNT(*)::int AS added,
              COUNT(*) FILTER (WHERE status IN ${positive})::int AS positive,
              COUNT(*) FILTER (WHERE status IN ('closed','closed_won'))::int AS won
         FROM leads WHERE intel_business_id IS NOT NULL GROUP BY 1 HAVING COUNT(*) >= 3
        ORDER BY (COUNT(*) FILTER (WHERE status IN ${positive}))::float / COUNT(*) DESC, COUNT(*) DESC LIMIT 5`,
    ),
  )
  const location = rows(
    await sql.query(
      `SELECT COALESCE(city, country, 'unspecified') AS key, COUNT(*)::int AS added,
              COUNT(*) FILTER (WHERE status IN ${positive})::int AS positive,
              COUNT(*) FILTER (WHERE status IN ('closed','closed_won'))::int AS won
         FROM leads WHERE intel_business_id IS NOT NULL GROUP BY 1 HAVING COUNT(*) >= 3
        ORDER BY (COUNT(*) FILTER (WHERE status IN ${positive}))::float / COUNT(*) DESC, COUNT(*) DESC LIMIT 5`,
    ),
  )
  const followups = first(
    await sql.query(
      `SELECT COUNT(*)::int AS n FROM leads WHERE intel_business_id IS NOT NULL AND next_follow_up IS NOT NULL
          AND next_follow_up <= (now() AT TIME ZONE $1)::date AND status NOT IN ('closed','closed_won','lost','do_not_contact')`,
      [tz],
    ),
  )
  return {
    success: true,
    today,
    pipeline,
    conversion_rate: total ? pipeline.won / total : null,
    best_niches: niche,
    best_locations: location,
    followups_due: followups?.n || 0,
    usage: await usageToday(sql, settings),
    threshold: thr,
  }
}

async function actionSettingsSave(sql, user, body) {
  if (user.role !== 'admin') throw new UserError('Only admins can change Lead Intelligence settings.', 403)
  let clean
  try {
    clean = sanitizeSettings(body.settings || {})
  } catch (e) {
    throw new UserError(`Settings not saved: ${e.message}`)
  }
  await sql.query(`UPDATE intel_settings SET data = $1::jsonb, updated_by = $2, updated_at = now() WHERE id = 1`, [JSON.stringify(clean), user.name || String(user.id)])
  settingsCache = null
  log('info', 'settings_saved', { user: user.id })
  return { success: true, settings: await loadSettings(sql, { fresh: true }) }
}

async function actionPresetSave(sql, user, body) {
  const name = str(body.name, 80)
  if (!name) throw new UserError('Name the preset.')
  const crit = body.criteria && typeof body.criteria === 'object' ? body.criteria : {}
  const criteria = {
    market: marketByKey(crit.market) ? crit.market : undefined,
    country_code: str(crit.country_code, 2) || undefined,
    country: str(crit.country, 80) || undefined,
    region: str(crit.region, 80) || undefined,
    city: str(crit.city, 80) || undefined,
    postal_code: str(crit.postal_code, 12) || undefined,
    radius_km: crit.radius_km ? optNum(crit.radius_km, 1, 50) : undefined,
    industries: Array.isArray(crit.industries) ? crit.industries.filter((k) => industryByKey(k)).slice(0, 5) : undefined,
    custom_term: str(crit.custom_term, 80) || undefined,
    filters: crit.filters && typeof crit.filters === 'object' ? crit.filters : undefined,
  }
  const r = first(
    await sql.query(`INSERT INTO intel_presets (name, criteria, is_builtin, created_by) VALUES ($1, $2::jsonb, false, $3) RETURNING id, name, criteria, is_builtin, created_by, created_at`, [
      name, JSON.stringify(criteria), user.name || String(user.id),
    ]),
  )
  return { success: true, preset: r }
}

async function actionPresetDelete(sql, user, body) {
  if (!isUuid(body.preset_id)) throw new UserError('Invalid preset.')
  const r = first(await sql.query(`DELETE FROM intel_presets WHERE id = $1 AND is_builtin = false RETURNING id`, [body.preset_id]))
  if (!r) throw new UserError('Built-in presets cannot be deleted.')
  return { success: true }
}

async function actionSetLeadPrice(sql, user, body) {
  if (!isUuid(body.lead_id)) throw new UserError('Invalid lead.')
  const price = optNum(body.price, 0, 10_000_000)
  const cur = /^[A-Z]{3}$/.test(String(body.currency || '')) ? body.currency : null
  const r = first(await sql.query(`UPDATE leads SET suggested_price = $2, price_currency = COALESCE($3, price_currency) WHERE id = $1 RETURNING id`, [body.lead_id, price, cur]))
  if (!r) throw new UserError('Lead not found.', 404)
  return { success: true }
}

const ACTIONS = {
  bootstrap: { fn: actionBootstrap, rate: 60 },
  search: { fn: actionSearch, rate: 6 },
  analyze: { fn: actionAnalyze, rate: 40 },
  enrich: { fn: actionEnrich, rate: 30 },
  results: { fn: actionResults, rate: 60 },
  detail: { fn: actionDetail, rate: 120 },
  check_leads: { fn: actionCheckLeads, rate: 60 },
  add_leads: { fn: actionAddLeads, rate: 30 },
  log_call: { fn: actionLogCall, rate: 60 },
  set_status: { fn: actionSetStatus, rate: 60 },
  set_lead_price: { fn: actionSetLeadPrice, rate: 60 },
  manual_add: { fn: actionManualAdd, rate: 20 },
  history: { fn: actionHistory, rate: 60 },
  dashboard: { fn: actionDashboard, rate: 60 },
  settings_save: { fn: actionSettingsSave, rate: 20 },
  preset_save: { fn: actionPresetSave, rate: 20 },
  preset_delete: { fn: actionPresetDelete, rate: 20 },
}

export async function intelHandler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' })
  const body = req.body && typeof req.body === 'object' ? req.body : {}
  const action = String(body.action || '')
  const def = ACTIONS[action]
  if (!def) return res.status(400).json({ success: false, error: 'Unknown action' })

  const user = requireRole(req, ['admin', 'manager'])
  if (!user) {
    return res.status(401).json({ success: false, error: 'Your session expired or you do not have access. Sign out and back in.', code: 'auth' })
  }
  if (rateLimited(`${action}:${user.id}`, def.rate)) {
    return res.status(429).json({ success: false, error: 'Too many requests. Please wait a moment.' })
  }
  if (!process.env.VITE_DATABASE_URL) return res.status(503).json({ success: false, error: 'Database is not configured.' })

  const t0 = Date.now()
  try {
    const sql = await getSql()
    await ensureSchema(sql)
    const out = await def.fn(sql, user, body)
    log('info', 'request', { action, user: user.id, ms: Date.now() - t0 })
    return res.status(200).json(out)
  } catch (e) {
    if (e instanceof UserError) {
      log('warn', 'request_rejected', { action, user: user.id, status: e.status, error: e.message })
      return res.status(e.status).json({ success: false, error: e.message, ...e.extra })
    }
    log('error', 'request_failed', { action, user: user.id, error: e.message, stack: String(e.stack || '').split('\n').slice(0, 4).join(' | ') })
    return res.status(500).json({ success: false, error: 'Something went wrong. Please try again.' })
  }
}

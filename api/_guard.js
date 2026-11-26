// ============================================================================
// Shared request guard for every API function (underscore: not an endpoint).
//
//  - authUser():     verifies the login token AND checks the account in the
//                    database (still active, current role, sessions not revoked)
//  - requireUser():  the same, answering 401/403 itself
//  - isAutomation(): server-to-server calls (Make.com, cron) that carry
//                    WEBHOOK_SECRET or CRON_SECRET
//  - cors():         only Lithos origins, never "*"
//  - passwords:      scrypt hashing with transparent upgrade of old rows
//  - login limits:   failed attempts recorded in Postgres (works across
//                    serverless instances)
// ============================================================================

import crypto from 'node:crypto'
import { verifyAuthToken } from './_auth.js'

export const ALLOWED_ORIGINS = [
  'https://app.lithoslabs.agency',
  'https://lithoslabs.agency',
  'https://www.lithoslabs.agency',
]

export function cors(req, res, methods = 'GET, POST, OPTIONS') {
  const o = req.headers.origin
  if (o && (ALLOWED_ORIGINS.includes(o) || /^http:\/\/localhost:\d+$/.test(o))) {
    res.setHeader('Access-Control-Allow-Origin', o)
    res.setHeader('Vary', 'Origin')
  }
  res.setHeader('Access-Control-Allow-Methods', methods)
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-auth-token, x-webhook-secret')
}

export function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || !a || !b) return false
  const x = crypto.createHash('sha256').update(a).digest()
  const y = crypto.createHash('sha256').update(b).digest()
  return crypto.timingSafeEqual(x, y) && a.length === b.length
}

let sqlPromise = null
export function getSql() {
  if (!sqlPromise) {
    sqlPromise = import('@neondatabase/serverless').then(({ neon }) => neon(process.env.VITE_DATABASE_URL))
  }
  return sqlPromise
}
const rowsOf = (r) => r?.rows ?? r ?? []

// Additive only (IF NOT EXISTS): new auth columns and the attempts log.
// Each statement runs on its own; when two serverless instances start at the
// same moment Postgres can report a duplicate for one of them, which is fine.
let schemaReady = null
const benign = (e) => /already exists|duplicate key|pg_class_relname_nsp_index|pg_type_typname_nsp_index/i.test(e?.message || '')
export function ensureAuthSchema(sql) {
  if (!schemaReady) {
    schemaReady = (async () => {
      const steps = [
        'ALTER TABLE sales_reps ADD COLUMN IF NOT EXISTS sessions_valid_after TIMESTAMPTZ',
        `CREATE TABLE IF NOT EXISTS auth_attempts (
          id BIGSERIAL PRIMARY KEY, key TEXT NOT NULL, ok BOOLEAN NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now())`,
        'CREATE INDEX IF NOT EXISTS auth_attempts_key_time ON auth_attempts (key, created_at)',
      ]
      let failed = false
      for (const q of steps) {
        try {
          await sql.query(q)
        } catch (e) {
          if (!benign(e)) { failed = true; console.error('auth schema:', e.message) }
        }
      }
      if (failed) schemaReady = null
    })()
  }
  return schemaReady
}

// The emergency admin login only exists when a strong ADMIN_BYPASS_PASSWORD is set.
export const bypassEnabled = () => String(process.env.ADMIN_BYPASS_PASSWORD || '').length >= 12

const userCache = new Map() // id -> { row, t }
export function forgetUser(id) { userCache.delete(String(id)) }

export async function authUser(req) {
  const token = req.headers['x-auth-token'] || req.body?.auth_token || req.query?.auth_token
  const user = verifyAuthToken(token)
  if (!user) return null
  if (user.id === 'admin') return bypassEnabled() ? user : null
  const key = String(user.id)
  let hit = userCache.get(key)
  if (!hit || Date.now() - hit.t > 30_000) {
    try {
      const sql = await getSql()
      await ensureAuthSchema(sql)
      let r
      try {
        r = await sql.query(
          'SELECT id, role, is_active, commission_rate, sessions_valid_after FROM sales_reps WHERE id::text = $1',
          [key],
        )
      } catch (e) {
        if (!/sessions_valid_after/.test(e.message)) throw e
        r = await sql.query('SELECT id, role, is_active, commission_rate FROM sales_reps WHERE id::text = $1', [key])
      }
      hit = { row: rowsOf(r)[0] || null, t: Date.now() }
      userCache.set(key, hit)
      if (userCache.size > 2000) userCache.clear()
    } catch (e) {
      console.error('authUser lookup failed:', e.message)
      return null
    }
  }
  const row = hit.row
  if (!row || row.is_active === false) return null
  if (row.sessions_valid_after && (user.iat || 0) < new Date(row.sessions_valid_after).getTime()) return null
  const role = row.role === 'admin' ? 'admin' : row.role === 'manager' ? 'manager' : 'sales'
  return { ...user, role, commission_rate: row.commission_rate }
}

export async function requireUser(req, res, roles = null) {
  const user = await authUser(req)
  if (!user) {
    res.status(401).json({ success: false, error: 'Please sign in again', code: 'auth' })
    return null
  }
  if (roles && !roles.includes(user.role)) {
    res.status(403).json({ success: false, error: 'You do not have access to this', code: 'forbidden' })
    return null
  }
  return user
}

// Make.com scenarios and cron jobs: x-webhook-secret header or "Authorization: Bearer <CRON_SECRET>".
export function isAutomation(req) {
  const given = req.headers['x-webhook-secret'] || String(req.headers.authorization || '').replace(/^Bearer\s+/i, '')
  return [process.env.WEBHOOK_SECRET, process.env.CRON_SECRET].some((s) => s && s.length >= 16 && safeEqual(given, s))
}

export function clientIp(req) {
  return String(req.headers['x-real-ip'] || String(req.headers['x-forwarded-for'] || '').split(',')[0] || 'unknown').trim()
}

// ---- passwords --------------------------------------------------------------
export function hashPassword(pw) {
  const salt = crypto.randomBytes(16)
  const hash = crypto.scryptSync(String(pw), salt, 64, { N: 16384, r: 8, p: 1 })
  return `scrypt$16384$8$1$${salt.toString('base64')}$${hash.toString('base64')}`
}
export function verifyPassword(pw, stored) {
  stored = String(stored || '')
  if (stored.startsWith('scrypt$')) {
    const [, N, r, p, salt, hash] = stored.split('$')
    const want = Buffer.from(hash, 'base64')
    const got = crypto.scryptSync(String(pw || ''), Buffer.from(salt, 'base64'), want.length, { N: +N, r: +r, p: +p })
    return { ok: crypto.timingSafeEqual(want, got), upgrade: false }
  }
  // legacy rows stored the password itself: compare in constant time, then upgrade
  return { ok: safeEqual(String(pw || ''), stored), upgrade: true }
}
export function passwordProblem(pw) {
  pw = String(pw || '')
  if (pw.length < 10) return 'Use at least 10 characters'
  if (/^(.)\1+$/.test(pw) || /^(password|1234567890|qwerty)/i.test(pw)) return 'Choose a less common password'
  return null
}

// ---- login attempt limits (Postgres, so every serverless instance sees them) ----
export async function loginBlocked(sql, keys) {
  await ensureAuthSchema(sql)
  for (const [key, max] of keys) {
    const r = await sql.query(
      "SELECT COUNT(*)::int AS n FROM auth_attempts WHERE key = $1 AND ok = false AND created_at > now() - interval '15 minutes'",
      [key],
    )
    if ((rowsOf(r)[0]?.n || 0) >= max) return true
  }
  return false
}
export async function recordAttempt(sql, keys, ok) {
  try {
    for (const key of keys) await sql.query('INSERT INTO auth_attempts (key, ok) VALUES ($1, $2)', [key, ok])
    if (Math.random() < 0.02) await sql.query("DELETE FROM auth_attempts WHERE created_at < now() - interval '2 days'")
  } catch (e) {
    console.error('recordAttempt:', e.message)
  }
}

// ---- Retell (AI receptionist) webhook ------------------------------------------
// Retell signs with HMAC-SHA256(raw body + timestamp, RETELL_API_KEY), header "v=<ms>,d=<hex>".
// Vercel hands us parsed JSON, so we also try the compact re-serialization. A secret
// ?key=<WEBHOOK_SECRET> on the webhook URL, or Retell's published sender IP, are accepted too.
export function retellVerified(req) {
  const key = process.env.RETELL_API_KEY
  const m = /^v=(\d+),d=([0-9a-f]+)$/i.exec(String(req.headers['x-retell-signature'] || ''))
  if (key && m && Math.abs(Date.now() - Number(m[1])) < 5 * 60_000) {
    const bodies = [typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {})]
    for (const b of bodies) {
      const want = crypto.createHmac('sha256', key).update(b + m[1]).digest('hex')
      if (safeEqual(want, m[2].toLowerCase())) return true
    }
  }
  if (process.env.WEBHOOK_SECRET && safeEqual(String(req.query?.key || ''), process.env.WEBHOOK_SECRET)) return true
  return clientIp(req) === '100.20.5.228'
}

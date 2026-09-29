// ============================================================================
// Shared admin session auth (HMAC-signed tokens issued at login).
//
// Underscore prefix: not a Vercel function. Imported by api/_docs-helper.js
// (Payments & Documents) and api/_intel-handler.js (Lead Intelligence).
//
//   APP_SECRET — HMAC secret (recommended). Falls back to WEBHOOK_SECRET, then
//                a hash of the database URL so tokens still work if unset.
// ============================================================================

import crypto from 'node:crypto'

export function appSecret() {
  return (
    process.env.APP_SECRET ||
    process.env.WEBHOOK_SECRET ||
    crypto
      .createHash('sha256')
      .update(String(process.env.VITE_DATABASE_URL || 'lithos'))
      .digest('hex')
  )
}

export const b64url = (buf) =>
  Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

export function issueAuthToken(user) {
  const payload = b64url(
    JSON.stringify({
      id: user.id,
      name: user.name,
      role: user.role,
      exp: Date.now() + 1000 * 60 * 60 * 24 * 14, // 14 days
    }),
  )
  const sig = crypto.createHmac('sha256', appSecret()).update(payload).digest('hex')
  return `${payload}.${sig}`
}

export function verifyAuthToken(token) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null
  const [payload, sig] = token.split('.')
  const expected = crypto.createHmac('sha256', appSecret()).update(payload).digest('hex')
  const a = Buffer.from(String(sig))
  const b = Buffer.from(expected)
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null
  try {
    const data = JSON.parse(Buffer.from(payload.replace(/-/g, '+').replace(/_/g, '/'), 'base64'))
    if (!data.exp || Date.now() > data.exp) return null
    return data
  } catch {
    return null
  }
}

// Returns the verified user when their role is in `roles`, otherwise null.
export function requireRole(req, roles = ['admin', 'manager']) {
  const token = req.headers['x-auth-token'] || req.body?.auth_token || req.query?.auth_token
  const user = verifyAuthToken(token)
  if (!user) return null
  if (!roles.includes(user.role)) return null
  return user
}

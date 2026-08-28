// ============================================================================
// Payments & Documents — proposals, e-signature, invoices, payments backend.
//
// This module is NOT a Vercel function itself (underscore prefix keeps it out
// of the function count). All actions are dispatched from api/workflow.js via
//   /api/workflow?action=docs_*        (admin + client-facing actions)
// and the Stripe webhook is dispatched from api/webhooks.js via
//   /api/webhooks?source=stripe
//
// Env vars used (all optional unless noted):
//   VITE_DATABASE_URL     — Neon Postgres connection string (required)
//   APP_SECRET            — HMAC secret for admin session tokens (recommended;
//                           falls back to WEBHOOK_SECRET, then a hash of the
//                           database URL so the system still works)
//   STRIPE_SECRET_KEY     — Stripe secret key (sk_test_... / sk_live_...)
//   STRIPE_WEBHOOK_SECRET — Stripe webhook endpoint signing secret (whsec_...)
//   RESEND_API_KEY        — Resend API key for transactional email
//   DOCS_NOTIFY_EMAIL     — where admin notifications are sent
//   MAKE_WEBHOOK_NOTIFY   — fallback Make.com webhook for notifications
//   PUBLIC_BASE_URL       — canonical origin for client links (defaults to
//                           the request host)
// ============================================================================

import crypto from 'node:crypto'

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

const rows = (r) => r?.rows ?? r ?? []
const first = (r) => rows(r)[0] || null

function appSecret() {
  return (
    process.env.APP_SECRET ||
    process.env.WEBHOOK_SECRET ||
    crypto
      .createHash('sha256')
      .update(String(process.env.VITE_DATABASE_URL || 'lithos'))
      .digest('hex')
  )
}

const b64url = (buf) =>
  Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

// --- Admin session tokens (HMAC-signed, issued at login) -------------------

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

function verifyAuthToken(token) {
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

function requireAdmin(req) {
  const token = req.headers['x-auth-token'] || req.body?.auth_token || req.query?.auth_token
  const user = verifyAuthToken(token)
  if (!user) return null
  if (user.role !== 'admin' && user.role !== 'manager') return null
  return user
}

// --- Client access tokens ---------------------------------------------------

const newClientToken = () => b64url(crypto.randomBytes(32)) // 43 chars, unguessable

// --- Very small in-memory rate limiter (best-effort, per instance) ---------

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

const clientIp = (req) =>
  String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '')
    .split(',')[0]
    .trim()

// ---------------------------------------------------------------------------
// Schema (idempotent — runs once per cold start)
// ---------------------------------------------------------------------------

// Concurrent serverless instances can race on CREATE TABLE IF NOT EXISTS —
// Postgres then throws unique violations on internal catalogs
// ("pg_type_typname_nsp_index") or "already exists" errors. That only means
// another instance created the object a moment earlier, so those errors are
// safe to absorb after a short retry.
const isConcurrentDdlError = (e) => {
  const msg = String(e?.message || '')
  return (
    e?.code === '23505' || // unique_violation on a system catalog (pg_type/pg_class race)
    e?.code === '42P07' || // duplicate_table
    e?.code === '42710' || // duplicate_object
    msg.includes('pg_type_typname_nsp_index') ||
    msg.includes('already exists') ||
    msg.includes('tuple concurrently')
  )
}

async function ddl(sql, text) {
  for (let attempt = 0; ; attempt++) {
    try {
      await sql.query(text)
      return
    } catch (e) {
      if (!isConcurrentDdlError(e)) throw e
      if (attempt >= 2) return // object was created by another instance — continue
      await new Promise((r) => setTimeout(r, 250 + Math.floor(Math.random() * 300)))
    }
  }
}

let schemaPromise = null
function ensureSchema(sql) {
  // Single-flight per warm instance; reset on failure so the next request retries.
  if (!schemaPromise) {
    schemaPromise = createSchema(sql).catch((e) => {
      schemaPromise = null
      throw e
    })
  }
  return schemaPromise
}

async function createSchema(sql) {
  await ddl(sql, `
    CREATE TABLE IF NOT EXISTS doc_settings (
      id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
      business JSONB DEFAULT '{}'::jsonb,
      bank JSONB DEFAULT '{}'::jsonb,
      numbering JSONB DEFAULT '{}'::jsonb,
      email JSONB DEFAULT '{}'::jsonb,
      updated_at TIMESTAMPTZ DEFAULT now()
    )`)
  await sql.query(`INSERT INTO doc_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING`)
  await ddl(sql, `ALTER TABLE clients ADD COLUMN IF NOT EXISTS client_type TEXT DEFAULT 'aruba'`)
  await ddl(sql, `
    CREATE TABLE IF NOT EXISTS proposals (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      client_id UUID REFERENCES clients(id),
      number TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      project_name TEXT,
      amount NUMERIC(12,2) DEFAULT 0,
      currency TEXT DEFAULT 'AWG',
      notes TEXT,
      status TEXT DEFAULT 'draft',
      expires_at TIMESTAMPTZ,
      sent_at TIMESTAMPTZ,
      viewed_at TIMESTAMPTZ,
      signed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    )`)
  await ddl(sql, `CREATE INDEX IF NOT EXISTS proposals_client_idx ON proposals(client_id)`)
  await ddl(sql, `
    CREATE TABLE IF NOT EXISTS invoices (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      client_id UUID REFERENCES clients(id),
      proposal_id UUID REFERENCES proposals(id),
      number TEXT UNIQUE NOT NULL,
      project_name TEXT,
      description TEXT,
      amount NUMERIC(12,2) DEFAULT 0,
      currency TEXT DEFAULT 'AWG',
      tax JSONB DEFAULT '{"enabled":false}'::jsonb,
      due_date DATE,
      status TEXT DEFAULT 'draft',
      payment_method TEXT DEFAULT 'bank_transfer',
      sent_at TIMESTAMPTZ,
      viewed_at TIMESTAMPTZ,
      paid_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    )`)
  await ddl(sql, `CREATE INDEX IF NOT EXISTS invoices_client_idx ON invoices(client_id)`)
  await ddl(sql, `
    CREATE TABLE IF NOT EXISTS doc_files (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      parent_type TEXT NOT NULL,
      parent_id UUID NOT NULL,
      kind TEXT NOT NULL DEFAULT 'original',
      filename TEXT NOT NULL,
      content_type TEXT DEFAULT 'application/pdf',
      bytes BYTEA NOT NULL,
      size_bytes INT DEFAULT 0,
      sha256 TEXT,
      created_at TIMESTAMPTZ DEFAULT now()
    )`)
  await ddl(sql, `CREATE INDEX IF NOT EXISTS doc_files_parent_idx ON doc_files(parent_type, parent_id)`)
  await ddl(sql, `
    CREATE TABLE IF NOT EXISTS doc_signatures (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      proposal_id UUID UNIQUE REFERENCES proposals(id),
      signer_name TEXT NOT NULL,
      signer_email TEXT NOT NULL,
      signer_company TEXT,
      signature_image TEXT NOT NULL,
      consent BOOLEAN DEFAULT false,
      signed_at TIMESTAMPTZ DEFAULT now(),
      ip TEXT,
      user_agent TEXT,
      doc_sha256 TEXT,
      created_at TIMESTAMPTZ DEFAULT now()
    )`)
  await ddl(sql, `
    CREATE TABLE IF NOT EXISTS doc_access_tokens (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      token TEXT UNIQUE NOT NULL,
      parent_type TEXT NOT NULL,
      parent_id UUID NOT NULL,
      client_id UUID,
      revoked BOOLEAN DEFAULT false,
      expires_at TIMESTAMPTZ,
      first_viewed_at TIMESTAMPTZ,
      last_viewed_at TIMESTAMPTZ,
      view_count INT DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT now()
    )`)
  await ddl(sql, `CREATE INDEX IF NOT EXISTS doc_tokens_parent_idx ON doc_access_tokens(parent_type, parent_id)`)
  await ddl(sql, `
    CREATE TABLE IF NOT EXISTS payments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      invoice_id UUID REFERENCES invoices(id),
      client_id UUID,
      kind TEXT NOT NULL,
      status TEXT NOT NULL,
      amount NUMERIC(12,2) DEFAULT 0,
      currency TEXT,
      reference TEXT,
      reporter_name TEXT,
      reporter_email TEXT,
      paid_date DATE,
      receipt_file_id UUID,
      stripe_session_id TEXT UNIQUE,
      stripe_payment_intent TEXT,
      confirmed_by TEXT,
      confirmed_at TIMESTAMPTZ,
      meta JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ DEFAULT now()
    )`)
  await ddl(sql, `CREATE INDEX IF NOT EXISTS payments_invoice_idx ON payments(invoice_id)`)
  await ddl(sql, `
    CREATE TABLE IF NOT EXISTS doc_audit_events (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      event TEXT NOT NULL,
      parent_type TEXT,
      parent_id UUID,
      client_id UUID,
      actor TEXT,
      meta JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ DEFAULT now()
    )`)
  await ddl(sql, `CREATE INDEX IF NOT EXISTS doc_audit_parent_idx ON doc_audit_events(parent_type, parent_id)`)
  await ddl(sql, `CREATE INDEX IF NOT EXISTS doc_audit_client_idx ON doc_audit_events(client_id)`)
}

async function audit(sql, event, { parentType, parentId, clientId, actor, meta } = {}) {
  try {
    await sql.query(
      `INSERT INTO doc_audit_events (event, parent_type, parent_id, client_id, actor, meta)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [event, parentType || null, parentId || null, clientId || null, actor || 'system', JSON.stringify(meta || {})],
    )
  } catch (e) {
    console.error('audit error:', e.message)
  }
}

// ---------------------------------------------------------------------------
// Settings + numbering
// ---------------------------------------------------------------------------

async function getSettings(sql) {
  const s = first(await sql.query(`SELECT * FROM doc_settings WHERE id=1`))
  const year = new Date().getFullYear()
  const numbering = {
    proposal_prefix: 'LL-PROP',
    invoice_prefix: 'LL-INV',
    year,
    proposal_seq: 1,
    invoice_seq: 1,
    ...(s?.numbering || {}),
  }
  return {
    business: {
      name: 'Lithos Labs',
      email: 'eug777fx@gmail.com',
      website: 'https://lithoslabs.agency',
      default_currency: 'AWG',
      ...(s?.business || {}),
    },
    bank: s?.bank || {},
    numbering,
    email: { sender_name: 'Lithos Labs', ...(s?.email || {}) },
  }
}

async function nextNumber(sql, kind) {
  // Atomic read-and-increment on the settings row; handles year rollover.
  const year = new Date().getFullYear()
  const seqKey = kind === 'proposal' ? 'proposal_seq' : 'invoice_seq'
  const prefixKey = kind === 'proposal' ? 'proposal_prefix' : 'invoice_prefix'
  const defPrefix = kind === 'proposal' ? 'LL-PROP' : 'LL-INV'
  const r = await sql.query(
    `UPDATE doc_settings
        SET numbering = jsonb_set(
              jsonb_set(
                CASE WHEN COALESCE((numbering->>'year')::int, 0) = $1
                     THEN numbering
                     ELSE jsonb_set(numbering, '{${seqKey}}', '1'::jsonb) END,
                '{year}', to_jsonb($1::int)),
              '{${seqKey}}',
              to_jsonb(COALESCE((CASE WHEN COALESCE((numbering->>'year')::int,0) = $1
                                      THEN numbering ELSE '{}'::jsonb END ->> '${seqKey}')::int, 1) + 1)),
            updated_at = now()
      WHERE id = 1
      RETURNING numbering`,
    [year],
  )
  const numbering = first(r)?.numbering || {}
  const seq = Math.max(1, Number(numbering[seqKey] || 2) - 1)
  const prefix = numbering[prefixKey] || defPrefix
  return `${prefix}-${year}-${String(seq).padStart(3, '0')}`
}

// ---------------------------------------------------------------------------
// Email (Resend → Make webhook → skip)
// ---------------------------------------------------------------------------

async function sendEmail(sql, { to, subject, html, text }) {
  const settings = await getSettings(sql)
  const from = settings.email.sender_email
    ? `${settings.email.sender_name || 'Lithos Labs'} <${settings.email.sender_email}>`
    : 'Lithos Labs <onboarding@resend.dev>'
  try {
    if (process.env.RESEND_API_KEY && to) {
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ from, to: [to], subject, html: html || `<pre>${text || ''}</pre>` }),
      })
      if (!r.ok) throw new Error(`resend ${r.status}: ${await r.text()}`)
      return { sent: true, via: 'resend' }
    }
    if (process.env.MAKE_WEBHOOK_NOTIFY) {
      await fetch(process.env.MAKE_WEBHOOK_NOTIFY, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to, subject, text: text || '', html: html || '' }),
      })
      return { sent: true, via: 'make' }
    }
  } catch (e) {
    console.error('email send failed:', e.message)
    await audit(sql, 'email_failed', { meta: { to, subject, error: e.message } })
    return { sent: false, error: e.message }
  }
  await audit(sql, 'email_skipped', { meta: { to, subject, reason: 'no provider configured' } })
  return { sent: false, error: 'no email provider configured' }
}

function emailShell(title, bodyHtml) {
  return `<!doctype html><body style="margin:0;background:#0a0a0a;padding:32px 16px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
  <div style="max-width:560px;margin:0 auto;background:#111;border:1px solid #2a2a2a;border-radius:14px;padding:36px">
    <div style="font-size:15px;font-weight:700;color:#fff;letter-spacing:-0.3px;margin-bottom:22px">Lithos <span style="font-weight:300;color:#999">Labs</span></div>
    <div style="font-size:19px;font-weight:650;color:#fff;margin-bottom:14px">${title}</div>
    <div style="font-size:14px;line-height:1.65;color:#bbb">${bodyHtml}</div>
    <div style="margin-top:28px;padding-top:18px;border-top:1px solid #2a2a2a;font-size:12px;color:#666">Lithos Labs — Building the foundation behind scalable brands · Aruba</div>
  </div></body>`
}

function emailButton(url, label) {
  return `<div style="margin:22px 0"><a href="${url}" style="display:inline-block;background:#fff;color:#000;font-weight:600;font-size:14px;padding:13px 26px;border-radius:999px;text-decoration:none">${label}</a></div>`
}

function baseUrl(req) {
  if (process.env.PUBLIC_BASE_URL) return process.env.PUBLIC_BASE_URL.replace(/\/$/, '')
  const host = req.headers['x-forwarded-host'] || req.headers.host
  const proto = req.headers['x-forwarded-proto'] || 'https'
  return `${proto}://${host}`
}

// ---------------------------------------------------------------------------
// File handling
// ---------------------------------------------------------------------------

const MAX_PDF_BYTES = 4 * 1024 * 1024 // 4MB (Vercel body limit is 4.5MB)

function decodePdfBase64(data) {
  const payload = String(data || '').replace(/^data:application\/pdf;base64,/, '')
  const buf = Buffer.from(payload, 'base64')
  if (!buf.length) throw new Error('Empty file')
  if (buf.length > MAX_PDF_BYTES) throw new Error('PDF larger than 4MB — please compress it')
  if (buf.subarray(0, 5).toString('latin1') !== '%PDF-') throw new Error('File is not a valid PDF')
  return buf
}

function decodeImageBase64(data, maxBytes = 2 * 1024 * 1024) {
  const m = String(data || '').match(/^data:(image\/(?:png|jpeg|jpg));base64,(.*)$/)
  if (!m) throw new Error('Receipt must be a PNG or JPEG image')
  const buf = Buffer.from(m[2], 'base64')
  if (!buf.length || buf.length > maxBytes) throw new Error('Image missing or larger than 2MB')
  return { buf, contentType: m[1] }
}

const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex')

async function storeFile(sql, { parentType, parentId, kind, filename, buf, contentType }) {
  const r = await sql.query(
    `INSERT INTO doc_files (parent_type, parent_id, kind, filename, content_type, bytes, size_bytes, sha256)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     RETURNING id, filename, kind, size_bytes, sha256, created_at`,
    [
      parentType,
      parentId,
      kind,
      filename,
      contentType || 'application/pdf',
      buf,
      buf.length,
      sha256(buf),
    ],
  )
  return first(r)
}

// ---------------------------------------------------------------------------
// Signed-PDF generation (append a signature certificate page; original kept)
// ---------------------------------------------------------------------------

async function generateSignedPdf({ originalBytes, proposal, client, signature }) {
  const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib')
  const pdf = await PDFDocument.load(originalBytes, { ignoreEncryption: true })
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold)

  const page = pdf.addPage([612, 792]) // US Letter
  const { width, height } = page.getSize()
  const ink = rgb(0.05, 0.05, 0.05)
  const gray = rgb(0.4, 0.4, 0.4)
  let y = height - 64

  const text = (str, x, opts = {}) => {
    page.drawText(String(str ?? ''), {
      x,
      y,
      size: opts.size || 10,
      font: opts.bold ? fontBold : font,
      color: opts.color || ink,
      maxWidth: opts.maxWidth || width - x - 56,
      lineHeight: (opts.size || 10) * 1.4,
    })
  }

  text('LITHOS LABS', 56, { size: 13, bold: true })
  y -= 26
  text('Signature Certificate', 56, { size: 20, bold: true })
  y -= 16
  page.drawLine({ start: { x: 56, y }, end: { x: width - 56, y }, thickness: 1, color: gray })
  y -= 26

  const row = (label, value) => {
    text(label.toUpperCase(), 56, { size: 8, color: gray })
    y -= 13
    text(value || '—', 56, { size: 11 })
    y -= 22
  }

  row('Document', `${proposal.number} — ${proposal.title}`)
  row('Prepared for', client?.company_name || '')
  row('Signed by', `${signature.signer_name}${signature.signer_company ? ` (${signature.signer_company})` : ''}`)
  row('Signer email', signature.signer_email)
  row('Signed at (UTC)', new Date(signature.signed_at || Date.now()).toISOString())

  // Signature image
  text('SIGNATURE', 56, { size: 8, color: gray })
  y -= 8
  try {
    const imgData = String(signature.signature_image || '')
    const m = imgData.match(/^data:image\/(png|jpeg|jpg);base64,(.*)$/)
    if (m) {
      const imgBytes = Buffer.from(m[2], 'base64')
      const img = m[1] === 'png' ? await pdf.embedPng(imgBytes) : await pdf.embedJpg(imgBytes)
      const dims = img.scaleToFit(260, 90)
      y -= dims.height
      page.drawImage(img, { x: 56, y, width: dims.width, height: dims.height })
      y -= 8
      page.drawLine({ start: { x: 56, y }, end: { x: 336, y }, thickness: 0.8, color: ink })
      y -= 26
    }
  } catch (e) {
    console.error('embed signature image failed:', e.message)
    y -= 30
  }

  row('Original document SHA-256', signature.doc_sha256 || '')
  if (signature.ip) row('Signer IP', signature.ip)

  y -= 4
  text(
    'The signer confirmed: "By clicking Sign Proposal, you confirm that you are signing this proposal electronically and agree to the terms outlined in this document." This certificate page was appended automatically by the Lithos Labs document system; the preceding pages are the original document, unmodified.',
    56,
    { size: 8.5, color: gray },
  )

  return Buffer.from(await pdf.save())
}

// ---------------------------------------------------------------------------
// Token resolution for client-facing actions
// ---------------------------------------------------------------------------

async function resolveToken(sql, token) {
  if (!token || String(token).length < 20) return { error: 'not_found' }
  const t = first(
    await sql.query(`SELECT * FROM doc_access_tokens WHERE token = $1`, [String(token)]),
  )
  if (!t) return { error: 'not_found' }
  if (t.revoked) return { error: 'revoked' }
  if (t.expires_at && new Date(t.expires_at) < new Date()) return { error: 'expired' }
  const table = t.parent_type === 'proposal' ? 'proposals' : 'invoices'
  const parent = first(await sql.query(`SELECT * FROM ${table} WHERE id = $1`, [t.parent_id]))
  if (!parent) return { error: 'not_found' }
  const client = parent.client_id
    ? first(await sql.query(`SELECT * FROM clients WHERE id = $1`, [parent.client_id]))
    : null
  return { tokenRow: t, parent, client }
}

async function recordView(sql, tokenRow, parent, req) {
  await sql.query(
    `UPDATE doc_access_tokens
        SET view_count = view_count + 1,
            first_viewed_at = COALESCE(first_viewed_at, now()),
            last_viewed_at = now()
      WHERE id = $1`,
    [tokenRow.id],
  )
  const table = tokenRow.parent_type === 'proposal' ? 'proposals' : 'invoices'
  await sql.query(
    `UPDATE ${table}
        SET viewed_at = now(),
            status = CASE WHEN status = 'sent' THEN 'viewed' ELSE status END,
            updated_at = now()
      WHERE id = $1`,
    [parent.id],
  )
  await audit(sql, `${tokenRow.parent_type}_viewed`, {
    parentType: tokenRow.parent_type,
    parentId: parent.id,
    clientId: parent.client_id,
    actor: 'client',
    meta: { ip: clientIp(req) },
  })
}

const clientPublicView = (parentType, parent, client) => ({
  type: parentType,
  number: parent.number,
  title: parent.title || parent.project_name || '',
  project_name: parent.project_name || '',
  description: parent.description || '',
  amount: Number(parent.amount || 0),
  currency: parent.currency || 'AWG',
  status: parent.status,
  expires_at: parent.expires_at || null,
  due_date: parent.due_date || null,
  signed_at: parent.signed_at || null,
  paid_at: parent.paid_at || null,
  payment_method: parent.payment_method || null,
  tax: parent.tax || null,
  client: client
    ? { company_name: client.company_name, contact_name: client.contact_name, client_type: client.client_type || 'aruba' }
    : null,
})

// ---------------------------------------------------------------------------
// Stripe (REST via fetch; no SDK)
// ---------------------------------------------------------------------------

const STRIPE_SUPPORTED = new Set(['usd', 'eur', 'aud', 'cad', 'gbp'])

async function stripeCreateCheckout(sql, req, { invoice, client, tokenRow }) {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error('Stripe is not configured yet')
  const currency = String(invoice.currency || 'usd').toLowerCase()
  if (!STRIPE_SUPPORTED.has(currency)) {
    throw new Error(`Currency ${invoice.currency} is not supported for card payment — contact Lithos Labs`)
  }
  const amountCents = Math.round(Number(invoice.amount) * 100)
  if (!amountCents || amountCents < 50) throw new Error('Invalid invoice amount')

  const url = `${baseUrl(req)}/client/invoice/${tokenRow.token}`
  const params = new URLSearchParams({
    mode: 'payment',
    'line_items[0][price_data][currency]': currency,
    'line_items[0][price_data][unit_amount]': String(amountCents),
    'line_items[0][price_data][product_data][name]': `Invoice ${invoice.number} — Lithos Labs`,
    'line_items[0][quantity]': '1',
    success_url: `${url}?paid=1`,
    cancel_url: `${url}?cancelled=1`,
    'metadata[invoice_id]': invoice.id,
    'metadata[token_id]': tokenRow.id,
    'payment_intent_data[metadata][invoice_id]': invoice.id,
  })
  if (client?.contact_email) params.set('customer_email', client.contact_email)

  const r = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Idempotency-Key': `inv-${invoice.id}-${amountCents}-${Date.now() >> 14}`,
    },
    body: params.toString(),
  })
  const data = await r.json()
  if (!r.ok) throw new Error(data?.error?.message || `Stripe error ${r.status}`)
  await audit(sql, 'payment_checkout_created', {
    parentType: 'invoice',
    parentId: invoice.id,
    clientId: invoice.client_id,
    actor: 'client',
    meta: { session_id: data.id },
  })
  return { checkout_url: data.url, session_id: data.id }
}

export function verifyStripeSignature(rawBody, sigHeader, secret, toleranceSec = 300) {
  if (!sigHeader || !secret) return false
  const parts = Object.fromEntries(
    String(sigHeader)
      .split(',')
      .map((p) => p.split('=').map((s) => s.trim()))
      .filter((p) => p.length === 2),
  )
  const t = Number(parts.t)
  const v1 = parts.v1
  if (!t || !v1) return false
  if (Math.abs(Date.now() / 1000 - t) > toleranceSec) return false
  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${t}.${rawBody}`)
    .digest('hex')
  const a = Buffer.from(v1)
  const b = Buffer.from(expected)
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

// Called from api/webhooks.js with the RAW request body (Buffer/string).
export async function handleStripeWebhook(req, res, rawBody) {
  const { neon } = await import('@neondatabase/serverless')
  const sql = neon(process.env.VITE_DATABASE_URL)
  await ensureSchema(sql)

  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!verifyStripeSignature(String(rawBody), req.headers['stripe-signature'], secret)) {
    return res.status(400).json({ error: 'invalid signature' })
  }

  let event
  try {
    event = JSON.parse(String(rawBody))
  } catch {
    return res.status(400).json({ error: 'invalid payload' })
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const s = event.data.object
      const invoiceId = s.metadata?.invoice_id
      if (invoiceId && s.payment_status === 'paid') {
        // Idempotent: unique stripe_session_id
        const inserted = await sql.query(
          `INSERT INTO payments
             (invoice_id, client_id, kind, status, amount, currency, stripe_session_id, stripe_payment_intent, paid_date, meta)
           SELECT $1, i.client_id, 'stripe', 'succeeded', $2, $3, $4, $5, CURRENT_DATE, $6
             FROM invoices i WHERE i.id = $1
           ON CONFLICT (stripe_session_id) DO NOTHING
           RETURNING id`,
          [
            invoiceId,
            (Number(s.amount_total) || 0) / 100,
            String(s.currency || '').toUpperCase(),
            s.id,
            s.payment_intent || null,
            JSON.stringify({ event_id: event.id, email: s.customer_details?.email || null }),
          ],
        )
        if (first(inserted)) {
          await sql.query(
            `UPDATE invoices SET status='paid', paid_at=now(), payment_method='stripe', updated_at=now() WHERE id=$1`,
            [invoiceId],
          )
          const inv = first(await sql.query(`SELECT * FROM invoices WHERE id=$1`, [invoiceId]))
          await audit(sql, 'payment_succeeded', {
            parentType: 'invoice',
            parentId: invoiceId,
            clientId: inv?.client_id,
            actor: 'stripe',
            meta: { session_id: s.id, amount: (Number(s.amount_total) || 0) / 100 },
          })
          const to = process.env.DOCS_NOTIFY_EMAIL
          if (to && inv) {
            await sendEmail(sql, {
              to,
              subject: `Payment received — Invoice ${inv.number}`,
              html: emailShell(
                'Stripe payment received 🎉',
                `<p>Invoice <b style="color:#fff">${inv.number}</b> was paid via Stripe.</p>
                 <p>Amount: <b style="color:#fff">${inv.currency} ${Number(inv.amount).toLocaleString()}</b></p>`,
              ),
            })
          }
        }
      }
    } else if (event.type === 'checkout.session.expired') {
      const s = event.data.object
      if (s.metadata?.invoice_id) {
        await audit(sql, 'payment_checkout_expired', {
          parentType: 'invoice',
          parentId: s.metadata.invoice_id,
          actor: 'stripe',
          meta: { session_id: s.id },
        })
      }
    } else if (event.type === 'charge.refunded') {
      const ch = event.data.object
      const pi = ch.payment_intent
      if (pi) {
        const pay = first(
          await sql.query(`UPDATE payments SET status='refunded' WHERE stripe_payment_intent=$1 RETURNING *`, [pi]),
        )
        if (pay) {
          await audit(sql, 'invoice_refunded', {
            parentType: 'invoice',
            parentId: pay.invoice_id,
            clientId: pay.client_id,
            actor: 'stripe',
            meta: { payment_intent: pi, amount_refunded: (Number(ch.amount_refunded) || 0) / 100 },
          })
        }
      }
    } else if (event.type === 'payment_intent.payment_failed') {
      const pi = event.data.object
      if (pi.metadata?.invoice_id) {
        await audit(sql, 'payment_failed', {
          parentType: 'invoice',
          parentId: pi.metadata.invoice_id,
          actor: 'stripe',
          meta: { error: pi.last_payment_error?.message || 'payment failed' },
        })
      }
    }
    return res.status(200).json({ received: true })
  } catch (e) {
    console.error('stripe webhook error:', e.message)
    // 500 → Stripe retries (idempotency above makes retries safe)
    return res.status(500).json({ error: e.message })
  }
}

// ---------------------------------------------------------------------------
// Main dispatcher — every action name starts with docs_
// ---------------------------------------------------------------------------

export async function docsHandler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-auth-token')
  if (req.method === 'OPTIONS') return res.status(200).end()

  const action = req.body?.action || req.query?.action
  const body = req.body || {}
  const q = req.query || {}

  const { neon } = await import('@neondatabase/serverless')
  const sql = neon(process.env.VITE_DATABASE_URL)

  try {
    await ensureSchema(sql)

    // =================== CLIENT-FACING (token) ============================

    if (action === 'docs_client_view') {
      const token = body.token || q.token
      if (rateLimited(`view:${clientIp(req)}`, 60)) return res.status(429).json({ error: 'Too many requests' })
      const { error, tokenRow, parent, client } = await resolveToken(sql, token)
      if (error) return res.status(200).json({ success: false, state: error })
      await recordView(sql, tokenRow, parent, req)

      const settings = await getSettings(sql)
      const view = clientPublicView(tokenRow.parent_type, parent, client)
      const files = rows(
        await sql.query(
          `SELECT kind, filename, size_bytes, created_at FROM doc_files WHERE parent_type=$1 AND parent_id=$2 ORDER BY created_at`,
          [tokenRow.parent_type, parent.id],
        ),
      )
      const out = {
        success: true,
        state: 'ok',
        doc: view,
        business: settings.business,
        has_original: files.some((f) => f.kind === 'original'),
        has_signed: files.some((f) => f.kind === 'signed'),
      }
      if (tokenRow.parent_type === 'proposal') {
        const sig = first(await sql.query(`SELECT signer_name, signed_at FROM doc_signatures WHERE proposal_id=$1`, [parent.id]))
        out.signature = sig || null
        if (parent.expires_at && new Date(parent.expires_at) < new Date() && parent.status !== 'signed') {
          out.state = 'expired'
        }
      }
      if (tokenRow.parent_type === 'invoice') {
        const method = parent.payment_method || (client?.client_type === 'united_states' ? 'stripe' : 'bank_transfer')
        out.payment = { method, stripe_configured: !!process.env.STRIPE_SECRET_KEY }
        if (method === 'bank_transfer') out.payment.bank = settings.bank
        const reported = first(
          await sql.query(
            `SELECT status, created_at FROM payments WHERE invoice_id=$1 AND kind='bank_report' ORDER BY created_at DESC LIMIT 1`,
            [parent.id],
          ),
        )
        out.payment.reported = reported || null
      }
      return res.status(200).json(out)
    }

    if (action === 'docs_client_file') {
      const token = q.token || body.token
      const kind = (q.kind || body.kind) === 'signed' ? 'signed' : 'original'
      if (rateLimited(`file:${clientIp(req)}`, 120)) return res.status(429).json({ error: 'Too many requests' })
      const { error, tokenRow, parent } = await resolveToken(sql, token)
      if (error) return res.status(404).json({ error: 'Document not available' })
      const f = first(
        await sql.query(
          `SELECT filename, content_type, bytes FROM doc_files
            WHERE parent_type=$1 AND parent_id=$2 AND kind=$3
            ORDER BY created_at DESC LIMIT 1`,
          [tokenRow.parent_type, parent.id, kind],
        ),
      )
      if (!f) return res.status(404).json({ error: 'File not found' })
      const buf = Buffer.isBuffer(f.bytes) ? f.bytes : Buffer.from(f.bytes)
      res.setHeader('Content-Type', f.content_type || 'application/pdf')
      res.setHeader('Content-Disposition', `inline; filename="${(f.filename || 'document.pdf').replace(/"/g, '')}"`)
      res.setHeader('Cache-Control', 'private, no-store')
      return res.status(200).send(buf)
    }

    if (action === 'docs_client_sign') {
      if (rateLimited(`sign:${clientIp(req)}`, 10)) return res.status(429).json({ error: 'Too many requests' })
      const { token, name, email, company, signature_image, consent } = body
      const { error, tokenRow, parent, client } = await resolveToken(sql, token)
      if (error || tokenRow.parent_type !== 'proposal') {
        return res.status(200).json({ success: false, state: error || 'not_found' })
      }
      if (parent.status === 'signed') return res.status(200).json({ success: false, state: 'already_signed' })
      if (parent.status === 'cancelled' || parent.status === 'rejected') {
        return res.status(200).json({ success: false, state: 'revoked' })
      }
      if (parent.expires_at && new Date(parent.expires_at) < new Date()) {
        return res.status(200).json({ success: false, state: 'expired' })
      }
      if (!name || !email || !signature_image || consent !== true) {
        return res.status(400).json({ success: false, error: 'Name, email, signature and consent are required' })
      }
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(email))) {
        return res.status(400).json({ success: false, error: 'Enter a valid email address' })
      }
      if (!/^data:image\/(png|jpeg|jpg);base64,/.test(String(signature_image)) || String(signature_image).length > 500_000) {
        return res.status(400).json({ success: false, error: 'Invalid signature image' })
      }

      const orig = first(
        await sql.query(
          `SELECT * FROM doc_files WHERE parent_type='proposal' AND parent_id=$1 AND kind='original' ORDER BY created_at DESC LIMIT 1`,
          [parent.id],
        ),
      )

      // 1) Record the signature first — this is the legal record.
      const signature = first(
        await sql.query(
          `INSERT INTO doc_signatures
             (proposal_id, signer_name, signer_email, signer_company, signature_image, consent, ip, user_agent, doc_sha256)
           VALUES ($1,$2,$3,$4,$5,true,$6,$7,$8)
           ON CONFLICT (proposal_id) DO NOTHING
           RETURNING *`,
          [
            parent.id,
            String(name).slice(0, 200),
            String(email).slice(0, 200),
            String(company || '').slice(0, 200) || null,
            signature_image,
            clientIp(req).slice(0, 64),
            String(req.headers['user-agent'] || '').slice(0, 300),
            orig?.sha256 || null,
          ],
        ),
      )
      if (!signature) return res.status(200).json({ success: false, state: 'already_signed' })

      await sql.query(
        `UPDATE proposals SET status='signed', signed_at=now(), updated_at=now() WHERE id=$1`,
        [parent.id],
      )
      await audit(sql, 'proposal_signed', {
        parentType: 'proposal',
        parentId: parent.id,
        clientId: parent.client_id,
        actor: 'client',
        meta: { signer: name, email },
      })

      // 2) Generate the signed PDF (best-effort; failure never loses the signature).
      let signedOk = false
      if (orig) {
        try {
          const bytes = Buffer.isBuffer(orig.bytes) ? orig.bytes : Buffer.from(orig.bytes)
          const signedBytes = await generateSignedPdf({ originalBytes: bytes, proposal: parent, client, signature })
          await storeFile(sql, {
            parentType: 'proposal',
            parentId: parent.id,
            kind: 'signed',
            filename: orig.filename.replace(/\.pdf$/i, '') + '-SIGNED.pdf',
            buf: signedBytes,
          })
          signedOk = true
        } catch (e) {
          console.error('signed pdf generation failed:', e.message)
          await audit(sql, 'signed_pdf_failed', {
            parentType: 'proposal',
            parentId: parent.id,
            actor: 'system',
            meta: { error: e.message },
          })
        }
      }

      // 3) Notify admin (never blocks the signing result).
      const to = process.env.DOCS_NOTIFY_EMAIL
      if (to) {
        await sendEmail(sql, {
          to,
          subject: `Proposal Signed — ${client?.company_name || name}`,
          html: emailShell(
            'Proposal signed ✍️',
            `<p><b style="color:#fff">${name}</b>${client ? ` (${client.company_name})` : ''} signed
             <b style="color:#fff">${parent.number} — ${parent.title}</b>.</p>
             <p>Amount: <b style="color:#fff">${parent.currency} ${Number(parent.amount).toLocaleString()}</b></p>
             ${emailButton(`${baseUrl(req)}/payments-docs`, 'Open CRM')}`,
          ),
        })
      }

      return res.status(200).json({ success: true, signed_at: signature.signed_at, signed_pdf: signedOk })
    }

    if (action === 'docs_client_report_payment') {
      if (rateLimited(`report:${clientIp(req)}`, 10)) return res.status(429).json({ error: 'Too many requests' })
      const { token, name, email, paid_date, amount, reference, receipt_base64 } = body
      const { error, tokenRow, parent, client } = await resolveToken(sql, token)
      if (error || tokenRow.parent_type !== 'invoice') {
        return res.status(200).json({ success: false, state: error || 'not_found' })
      }
      if (parent.status === 'paid') return res.status(200).json({ success: false, state: 'already_paid' })
      if (!name || !email || !amount) {
        return res.status(400).json({ success: false, error: 'Name, email and amount are required' })
      }

      let receiptId = null
      if (receipt_base64) {
        try {
          const { buf, contentType } = decodeImageBase64(receipt_base64)
          const f = await storeFile(sql, {
            parentType: 'invoice',
            parentId: parent.id,
            kind: 'receipt',
            filename: `receipt-${parent.number}.${contentType.includes('png') ? 'png' : 'jpg'}`,
            buf,
            contentType,
          })
          receiptId = f.id
        } catch (e) {
          // Keep the report even if the receipt upload fails.
          await audit(sql, 'receipt_upload_failed', {
            parentType: 'invoice',
            parentId: parent.id,
            actor: 'client',
            meta: { error: e.message },
          })
        }
      }

      await sql.query(
        `INSERT INTO payments (invoice_id, client_id, kind, status, amount, currency, reference, reporter_name, reporter_email, paid_date, receipt_file_id)
         VALUES ($1,$2,'bank_report','reported',$3,$4,$5,$6,$7,$8,$9)`,
        [
          parent.id,
          parent.client_id,
          Number(amount) || 0,
          parent.currency,
          String(reference || '').slice(0, 120) || null,
          String(name).slice(0, 200),
          String(email).slice(0, 200),
          paid_date || null,
          receiptId,
        ],
      )
      // Reported, NOT paid — admin confirms manually.
      await sql.query(
        `UPDATE invoices SET status='payment_reported', updated_at=now() WHERE id=$1 AND status != 'paid'`,
        [parent.id],
      )
      await audit(sql, 'payment_reported', {
        parentType: 'invoice',
        parentId: parent.id,
        clientId: parent.client_id,
        actor: 'client',
        meta: { name, amount: Number(amount) || 0, reference: reference || null },
      })

      const to = process.env.DOCS_NOTIFY_EMAIL
      if (to) {
        await sendEmail(sql, {
          to,
          subject: `Payment Reported — ${client?.company_name || name} — ${parent.number}`,
          html: emailShell(
            'Bank payment reported 🔔',
            `<p><b style="color:#fff">${name}</b> reported a bank transfer of
             <b style="color:#fff">${parent.currency} ${Number(amount).toLocaleString()}</b> for invoice
             <b style="color:#fff">${parent.number}</b>.</p>
             <p>Check your bank account, then confirm it in the CRM.</p>
             ${emailButton(`${baseUrl(req)}/payments-docs`, 'Review in CRM')}`,
          ),
        })
      }
      return res.status(200).json({ success: true })
    }

    if (action === 'docs_client_stripe_checkout') {
      if (rateLimited(`stripe:${clientIp(req)}`, 10)) return res.status(429).json({ error: 'Too many requests' })
      const { error, tokenRow, parent, client } = await resolveToken(sql, body.token)
      if (error || tokenRow.parent_type !== 'invoice') {
        return res.status(200).json({ success: false, state: error || 'not_found' })
      }
      if (parent.status === 'paid') return res.status(200).json({ success: false, state: 'already_paid' })
      try {
        const out = await stripeCreateCheckout(sql, req, { invoice: parent, client, tokenRow })
        return res.status(200).json({ success: true, ...out })
      } catch (e) {
        return res.status(200).json({ success: false, error: e.message })
      }
    }

    // ========================= ADMIN ======================================

    const admin = requireAdmin(req)
    if (!admin) {
      return res.status(401).json({
        success: false,
        error: 'auth_required',
        message: 'Sign out and sign back in to refresh your session, then try again.',
      })
    }
    const actor = `admin:${admin.name || admin.id}`

    if (action === 'docs_bootstrap') {
      const settings = await getSettings(sql)
      const clients = rows(
        await sql.query(`SELECT id, company_name, contact_name, contact_email, contact_whatsapp, client_type FROM clients ORDER BY company_name`),
      )
      return res.status(200).json({
        success: true,
        settings,
        clients,
        stripe_configured: !!process.env.STRIPE_SECRET_KEY,
        stripe_webhook_configured: !!process.env.STRIPE_WEBHOOK_SECRET,
        email_configured: !!process.env.RESEND_API_KEY || !!process.env.MAKE_WEBHOOK_NOTIFY,
        notify_email: process.env.DOCS_NOTIFY_EMAIL || null,
      })
    }

    if (action === 'docs_settings_save') {
      const { business, bank, numbering, email } = body
      await sql.query(
        `UPDATE doc_settings
            SET business = COALESCE($1, business),
                bank = COALESCE($2, bank),
                numbering = COALESCE($3, numbering),
                email = COALESCE($4, email),
                updated_at = now()
          WHERE id = 1`,
        [
          business ? JSON.stringify(business) : null,
          bank ? JSON.stringify(bank) : null,
          numbering ? JSON.stringify(numbering) : null,
          email ? JSON.stringify(email) : null,
        ],
      )
      await audit(sql, 'settings_updated', { actor })
      return res.status(200).json({ success: true, settings: await getSettings(sql) })
    }

    if (action === 'docs_client_set_type') {
      await sql.query(`UPDATE clients SET client_type=$1 WHERE id=$2`, [
        ['aruba', 'united_states', 'other'].includes(body.client_type) ? body.client_type : 'other',
        body.client_id,
      ])
      return res.status(200).json({ success: true })
    }

    if (action === 'docs_metrics') {
      const [prop, inv, rev, activity, reported] = await Promise.all([
        sql.query(`SELECT status, COUNT(*)::int AS n FROM proposals GROUP BY status`),
        sql.query(`SELECT status, COUNT(*)::int AS n, COALESCE(SUM(amount),0) AS total FROM invoices GROUP BY status`),
        sql.query(
          `SELECT COALESCE(SUM(amount) FILTER (WHERE status='paid' AND paid_at >= date_trunc('month', now())),0) AS paid_month,
                  COALESCE(SUM(amount) FILTER (WHERE status NOT IN ('paid','cancelled','draft')),0) AS outstanding,
                  COALESCE(SUM(amount) FILTER (WHERE status NOT IN ('paid','cancelled') AND due_date IS NOT NULL AND due_date < CURRENT_DATE),0) AS overdue
             FROM invoices`,
        ),
        sql.query(
          `SELECT e.*, c.company_name FROM doc_audit_events e
             LEFT JOIN clients c ON c.id = e.client_id
            ORDER BY e.created_at DESC LIMIT 25`,
        ),
        sql.query(
          `SELECT p.*, i.number AS invoice_number, c.company_name
             FROM payments p
             JOIN invoices i ON i.id = p.invoice_id
             LEFT JOIN clients c ON c.id = p.client_id
            WHERE p.kind='bank_report' AND p.status='reported'
            ORDER BY p.created_at DESC`,
        ),
      ])
      return res.status(200).json({
        success: true,
        proposals: rows(prop),
        invoices: rows(inv),
        revenue: first(rev),
        activity: rows(activity),
        reported_payments: rows(reported),
      })
    }

    // ---- Proposals -------------------------------------------------------

    if (action === 'docs_proposals_list') {
      const list = rows(
        await sql.query(
          `SELECT p.*, c.company_name, c.contact_name,
                  s.signer_name, s.signed_at AS signature_at,
                  t.id AS token_id, t.token, t.revoked AS token_revoked, t.expires_at AS token_expires, t.last_viewed_at, t.view_count,
                  (SELECT COUNT(*)::int FROM doc_files f WHERE f.parent_type='proposal' AND f.parent_id=p.id AND f.kind='original') AS has_original,
                  (SELECT COUNT(*)::int FROM doc_files f WHERE f.parent_type='proposal' AND f.parent_id=p.id AND f.kind='signed') AS has_signed,
                  (SELECT COUNT(*)::int FROM invoices i WHERE i.proposal_id=p.id) AS invoice_count
             FROM proposals p
             LEFT JOIN clients c ON c.id = p.client_id
             LEFT JOIN doc_signatures s ON s.proposal_id = p.id
             LEFT JOIN LATERAL (
               SELECT * FROM doc_access_tokens t
                WHERE t.parent_type='proposal' AND t.parent_id=p.id AND t.revoked=false
                ORDER BY t.created_at DESC LIMIT 1
             ) t ON true
            ORDER BY p.created_at DESC`,
        ),
      )
      return res.status(200).json({ success: true, proposals: list })
    }

    if (action === 'docs_proposal_create') {
      const { client_id, title, project_name, amount, currency, expires_at, notes } = body
      if (!client_id || !title) return res.status(400).json({ success: false, error: 'client_id and title required' })
      const number = await nextNumber(sql, 'proposal')
      const p = first(
        await sql.query(
          `INSERT INTO proposals (client_id, number, title, project_name, amount, currency, expires_at, notes)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
          [
            client_id,
            number,
            String(title).slice(0, 300),
            String(project_name || '').slice(0, 300) || null,
            Number(amount) || 0,
            String(currency || 'AWG').toUpperCase().slice(0, 5),
            expires_at || null,
            String(notes || '').slice(0, 5000) || null,
          ],
        ),
      )
      await audit(sql, 'proposal_created', { parentType: 'proposal', parentId: p.id, clientId: client_id, actor })
      return res.status(200).json({ success: true, proposal: p })
    }

    if (action === 'docs_proposal_update') {
      const { id, title, project_name, amount, currency, expires_at, notes, status } = body
      const allowed = ['draft', 'sent', 'cancelled', 'rejected']
      const p = first(
        await sql.query(
          `UPDATE proposals SET
              title = COALESCE($2, title),
              project_name = COALESCE($3, project_name),
              amount = COALESCE($4, amount),
              currency = COALESCE($5, currency),
              expires_at = COALESCE($6, expires_at),
              notes = COALESCE($7, notes),
              status = CASE WHEN $8::text IS NOT NULL AND status NOT IN ('signed') THEN $8 ELSE status END,
              updated_at = now()
            WHERE id = $1 RETURNING *`,
          [
            id,
            title || null,
            project_name || null,
            amount != null ? Number(amount) : null,
            currency || null,
            expires_at || null,
            notes || null,
            status && allowed.includes(status) ? status : null,
          ],
        ),
      )
      if (!p) return res.status(404).json({ success: false, error: 'not found' })
      await audit(sql, 'proposal_edited', { parentType: 'proposal', parentId: id, clientId: p.client_id, actor })
      return res.status(200).json({ success: true, proposal: p })
    }

    if (action === 'docs_upload_file') {
      const { parent_type, parent_id, filename, data_base64 } = body
      if (!['proposal', 'invoice'].includes(parent_type) || !parent_id) {
        return res.status(400).json({ success: false, error: 'invalid parent' })
      }
      let buf
      try {
        buf = decodePdfBase64(data_base64)
      } catch (e) {
        return res.status(400).json({ success: false, error: e.message })
      }
      const safeName =
        String(filename || 'document.pdf')
          .replace(/[^\w.\- ()]/g, '')
          .slice(0, 140) || 'document.pdf'
      // Replace any previous original
      await sql.query(`DELETE FROM doc_files WHERE parent_type=$1 AND parent_id=$2 AND kind='original'`, [
        parent_type,
        parent_id,
      ])
      const f = await storeFile(sql, { parentType: parent_type, parentId: parent_id, kind: 'original', filename: safeName, buf })
      await audit(sql, `${parent_type}_uploaded`, { parentType: parent_type, parentId: parent_id, actor, meta: { filename: safeName, size: buf.length } })
      return res.status(200).json({ success: true, file: f })
    }

    if (action === 'docs_file_get') {
      // Admin fetch of any stored file (original/signed/receipt) by id or parent.
      let f
      if (q.file_id || body.file_id) {
        f = first(await sql.query(`SELECT filename, content_type, bytes FROM doc_files WHERE id=$1`, [q.file_id || body.file_id]))
      } else {
        f = first(
          await sql.query(
            `SELECT filename, content_type, bytes FROM doc_files
              WHERE parent_type=$1 AND parent_id=$2 AND kind=$3 ORDER BY created_at DESC LIMIT 1`,
            [q.parent_type || body.parent_type, q.parent_id || body.parent_id, q.kind || body.kind || 'original'],
          ),
        )
      }
      if (!f) return res.status(404).json({ error: 'File not found' })
      const buf = Buffer.isBuffer(f.bytes) ? f.bytes : Buffer.from(f.bytes)
      res.setHeader('Content-Type', f.content_type || 'application/pdf')
      res.setHeader('Content-Disposition', `inline; filename="${(f.filename || 'file').replace(/"/g, '')}"`)
      res.setHeader('Cache-Control', 'private, no-store')
      return res.status(200).send(buf)
    }

    if (action === 'docs_link_create') {
      const { parent_type, parent_id, expires_at } = body
      if (!['proposal', 'invoice'].includes(parent_type) || !parent_id) {
        return res.status(400).json({ success: false, error: 'invalid parent' })
      }
      const table = parent_type === 'proposal' ? 'proposals' : 'invoices'
      const parent = first(await sql.query(`SELECT * FROM ${table} WHERE id=$1`, [parent_id]))
      if (!parent) return res.status(404).json({ success: false, error: 'not found' })
      // Regenerating revokes previous links.
      await sql.query(`UPDATE doc_access_tokens SET revoked=true WHERE parent_type=$1 AND parent_id=$2`, [parent_type, parent_id])
      const token = newClientToken()
      const t = first(
        await sql.query(
          `INSERT INTO doc_access_tokens (token, parent_type, parent_id, client_id, expires_at)
           VALUES ($1,$2,$3,$4,$5) RETURNING *`,
          [token, parent_type, parent_id, parent.client_id, expires_at || parent.expires_at || null],
        ),
      )
      await audit(sql, 'link_created', { parentType: parent_type, parentId: parent_id, clientId: parent.client_id, actor })
      return res.status(200).json({ success: true, token: t, url: `${baseUrl(req)}/client/${parent_type}/${token}` })
    }

    if (action === 'docs_link_revoke') {
      if (body.token_id) {
        await sql.query(`UPDATE doc_access_tokens SET revoked=true WHERE id=$1`, [body.token_id])
      } else if (body.parent_type && body.parent_id) {
        await sql.query(`UPDATE doc_access_tokens SET revoked=true WHERE parent_type=$1 AND parent_id=$2`, [
          body.parent_type,
          body.parent_id,
        ])
      } else {
        return res.status(400).json({ success: false, error: 'token_id or parent required' })
      }
      await audit(sql, 'link_revoked', { actor, meta: { token_id: body.token_id || null, parent_id: body.parent_id || null } })
      return res.status(200).json({ success: true })
    }

    if (action === 'docs_send') {
      // Marks proposal/invoice as sent + optionally emails the client the link.
      const { parent_type, parent_id, email_client } = body
      const table = parent_type === 'proposal' ? 'proposals' : 'invoices'
      const parent = first(
        await sql.query(
          `UPDATE ${table} SET status = CASE WHEN status='draft' THEN 'sent' ELSE status END,
                  sent_at = COALESCE(sent_at, now()), updated_at=now()
            WHERE id=$1 RETURNING *`,
          [parent_id],
        ),
      )
      if (!parent) return res.status(404).json({ success: false, error: 'not found' })
      const client = parent.client_id ? first(await sql.query(`SELECT * FROM clients WHERE id=$1`, [parent.client_id])) : null
      await audit(sql, `${parent_type}_sent`, { parentType: parent_type, parentId: parent_id, clientId: parent.client_id, actor })

      let emailed = null
      if (email_client && client?.contact_email) {
        const t = first(
          await sql.query(
            `SELECT * FROM doc_access_tokens WHERE parent_type=$1 AND parent_id=$2 AND revoked=false ORDER BY created_at DESC LIMIT 1`,
            [parent_type, parent_id],
          ),
        )
        if (t) {
          const url = `${baseUrl(req)}/client/${parent_type}/${t.token}`
          const isProp = parent_type === 'proposal'
          emailed = await sendEmail(sql, {
            to: client.contact_email,
            subject: isProp
              ? 'Your Lithos Labs Proposal is Ready'
              : `Invoice from Lithos Labs — ${parent.number}`,
            html: emailShell(
              isProp ? 'Your proposal is ready' : `Invoice ${parent.number}`,
              `<p>Hi ${client.contact_name || client.company_name},</p>
               <p>${isProp ? `Your proposal <b style="color:#fff">${parent.title}</b> is ready for review.` : `Your invoice for <b style="color:#fff">${parent.project_name || 'our services'}</b> is ready.`}</p>
               <p>Amount: <b style="color:#fff">${parent.currency} ${Number(parent.amount).toLocaleString()}</b>${
                 isProp
                   ? parent.expires_at
                     ? `<br/>Valid until: <b style="color:#fff">${new Date(parent.expires_at).toLocaleDateString()}</b>`
                     : ''
                   : parent.due_date
                     ? `<br/>Due date: <b style="color:#fff">${new Date(parent.due_date).toLocaleDateString()}</b>`
                     : ''
               }</p>
               ${emailButton(url, isProp ? 'Review Proposal' : 'View Invoice')}`,
            ),
          })
        }
      }
      return res.status(200).json({ success: true, doc: parent, emailed })
    }

    if (action === 'docs_regenerate_signed') {
      const proposal = first(await sql.query(`SELECT * FROM proposals WHERE id=$1`, [body.proposal_id]))
      const signature = first(await sql.query(`SELECT * FROM doc_signatures WHERE proposal_id=$1`, [body.proposal_id]))
      const orig = first(
        await sql.query(
          `SELECT * FROM doc_files WHERE parent_type='proposal' AND parent_id=$1 AND kind='original' ORDER BY created_at DESC LIMIT 1`,
          [body.proposal_id],
        ),
      )
      if (!proposal || !signature || !orig) return res.status(400).json({ success: false, error: 'Missing proposal, signature or original PDF' })
      const client = proposal.client_id ? first(await sql.query(`SELECT * FROM clients WHERE id=$1`, [proposal.client_id])) : null
      const bytes = Buffer.isBuffer(orig.bytes) ? orig.bytes : Buffer.from(orig.bytes)
      const signedBytes = await generateSignedPdf({ originalBytes: bytes, proposal, client, signature })
      await sql.query(`DELETE FROM doc_files WHERE parent_type='proposal' AND parent_id=$1 AND kind='signed'`, [proposal.id])
      const f = await storeFile(sql, {
        parentType: 'proposal',
        parentId: proposal.id,
        kind: 'signed',
        filename: orig.filename.replace(/\.pdf$/i, '') + '-SIGNED.pdf',
        buf: signedBytes,
      })
      return res.status(200).json({ success: true, file: f })
    }

    // ---- Invoices --------------------------------------------------------

    if (action === 'docs_invoices_list') {
      const list = rows(
        await sql.query(
          `SELECT i.*, c.company_name, c.contact_name, c.client_type, p.number AS proposal_number,
                  t.id AS token_id, t.token, t.revoked AS token_revoked, t.last_viewed_at, t.view_count,
                  (SELECT COUNT(*)::int FROM doc_files f WHERE f.parent_type='invoice' AND f.parent_id=i.id AND f.kind='original') AS has_original,
                  (i.due_date IS NOT NULL AND i.due_date < CURRENT_DATE AND i.status NOT IN ('paid','cancelled')) AS overdue
             FROM invoices i
             LEFT JOIN clients c ON c.id = i.client_id
             LEFT JOIN proposals p ON p.id = i.proposal_id
             LEFT JOIN LATERAL (
               SELECT * FROM doc_access_tokens t
                WHERE t.parent_type='invoice' AND t.parent_id=i.id AND t.revoked=false
                ORDER BY t.created_at DESC LIMIT 1
             ) t ON true
            ORDER BY i.created_at DESC`,
        ),
      )
      return res.status(200).json({ success: true, invoices: list })
    }

    if (action === 'docs_invoice_create') {
      const { client_id, proposal_id, project_name, description, amount, currency, tax, due_date, payment_method } = body
      if (!client_id) return res.status(400).json({ success: false, error: 'client_id required' })
      const number = await nextNumber(sql, 'invoice')
      const inv = first(
        await sql.query(
          `INSERT INTO invoices (client_id, proposal_id, number, project_name, description, amount, currency, tax, due_date, payment_method)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
          [
            client_id,
            proposal_id || null,
            number,
            String(project_name || '').slice(0, 300) || null,
            String(description || '').slice(0, 5000) || null,
            Number(amount) || 0,
            String(currency || 'AWG').toUpperCase().slice(0, 5),
            JSON.stringify(tax || { enabled: false }),
            due_date || null,
            ['bank_transfer', 'stripe', 'manual'].includes(payment_method) ? payment_method : 'bank_transfer',
          ],
        ),
      )
      await audit(sql, 'invoice_created', { parentType: 'invoice', parentId: inv.id, clientId: client_id, actor })
      return res.status(200).json({ success: true, invoice: inv })
    }

    if (action === 'docs_invoice_update') {
      const { id, project_name, description, amount, currency, tax, due_date, payment_method, status } = body
      const allowed = ['draft', 'sent', 'cancelled']
      const inv = first(
        await sql.query(
          `UPDATE invoices SET
              project_name = COALESCE($2, project_name),
              description = COALESCE($3, description),
              amount = COALESCE($4, amount),
              currency = COALESCE($5, currency),
              tax = COALESCE($6, tax),
              due_date = COALESCE($7, due_date),
              payment_method = COALESCE($8, payment_method),
              status = CASE WHEN $9::text IS NOT NULL AND status NOT IN ('paid') THEN $9 ELSE status END,
              updated_at = now()
            WHERE id=$1 RETURNING *`,
          [
            id,
            project_name || null,
            description || null,
            amount != null ? Number(amount) : null,
            currency || null,
            tax ? JSON.stringify(tax) : null,
            due_date || null,
            payment_method || null,
            status && allowed.includes(status) ? status : null,
          ],
        ),
      )
      if (!inv) return res.status(404).json({ success: false, error: 'not found' })
      return res.status(200).json({ success: true, invoice: inv })
    }

    if (action === 'docs_invoice_mark_paid') {
      const inv = first(
        await sql.query(
          `UPDATE invoices SET status='paid', paid_at=now(), updated_at=now() WHERE id=$1 RETURNING *`,
          [body.invoice_id],
        ),
      )
      if (!inv) return res.status(404).json({ success: false, error: 'not found' })
      await sql.query(
        `INSERT INTO payments (invoice_id, client_id, kind, status, amount, currency, confirmed_by, confirmed_at, meta)
         VALUES ($1,$2,'manual','confirmed',$3,$4,$5,now(),$6)`,
        [inv.id, inv.client_id, inv.amount, inv.currency, actor, JSON.stringify({ note: body.note || 'manually marked paid' })],
      )
      await audit(sql, 'payment_confirmed', { parentType: 'invoice', parentId: inv.id, clientId: inv.client_id, actor, meta: { manual: true } })
      return res.status(200).json({ success: true, invoice: inv })
    }

    // ---- Payments --------------------------------------------------------

    if (action === 'docs_payments_list') {
      const list = rows(
        await sql.query(
          `SELECT p.*, i.number AS invoice_number, i.project_name, c.company_name
             FROM payments p
             LEFT JOIN invoices i ON i.id = p.invoice_id
             LEFT JOIN clients c ON c.id = p.client_id
            ORDER BY p.created_at DESC LIMIT 200`,
        ),
      )
      return res.status(200).json({ success: true, payments: list })
    }

    if (action === 'docs_payment_confirm') {
      const pay = first(
        await sql.query(
          `UPDATE payments SET status='confirmed', confirmed_by=$2, confirmed_at=now() WHERE id=$1 AND status='reported' RETURNING *`,
          [body.payment_id, actor],
        ),
      )
      if (!pay) return res.status(404).json({ success: false, error: 'Payment not found or already handled' })
      const inv = first(
        await sql.query(
          `UPDATE invoices SET status='paid', paid_at=now(), payment_method='bank_transfer', updated_at=now() WHERE id=$1 RETURNING *`,
          [pay.invoice_id],
        ),
      )
      await audit(sql, 'payment_confirmed', { parentType: 'invoice', parentId: pay.invoice_id, clientId: pay.client_id, actor, meta: { amount: pay.amount } })
      // Optionally notify the client their transfer was received.
      if (body.email_client && pay.reporter_email) {
        await sendEmail(sql, {
          to: pay.reporter_email,
          subject: `Payment confirmed — Invoice ${inv?.number || ''}`,
          html: emailShell(
            'Payment confirmed ✓',
            `<p>We've received your bank transfer of <b style="color:#fff">${inv?.currency || ''} ${Number(pay.amount).toLocaleString()}</b> for invoice <b style="color:#fff">${inv?.number || ''}</b>. Thank you!</p>`,
          ),
        })
      }
      return res.status(200).json({ success: true, payment: pay, invoice: inv })
    }

    if (action === 'docs_payment_reject') {
      const pay = first(
        await sql.query(
          `UPDATE payments SET status='rejected', confirmed_by=$2, confirmed_at=now(),
                  meta = meta || $3::jsonb
            WHERE id=$1 AND status='reported' RETURNING *`,
          [body.payment_id, actor, JSON.stringify({ reject_reason: body.reason || 'not received' })],
        ),
      )
      if (!pay) return res.status(404).json({ success: false, error: 'Payment not found or already handled' })
      // Put the invoice back to its pre-report state.
      await sql.query(
        `UPDATE invoices SET status='sent', updated_at=now() WHERE id=$1 AND status='payment_reported'`,
        [pay.invoice_id],
      )
      await audit(sql, 'payment_rejected', { parentType: 'invoice', parentId: pay.invoice_id, clientId: pay.client_id, actor, meta: { reason: body.reason || null } })
      return res.status(200).json({ success: true })
    }

    if (action === 'docs_client_timeline') {
      const list = rows(
        await sql.query(
          `SELECT e.*, c.company_name FROM doc_audit_events e
             LEFT JOIN clients c ON c.id = e.client_id
            WHERE e.client_id = $1
            ORDER BY e.created_at ASC`,
          [body.client_id || q.client_id],
        ),
      )
      return res.status(200).json({ success: true, events: list })
    }

    if (action === 'docs_audit_list') {
      const list = rows(
        await sql.query(
          `SELECT e.*, c.company_name FROM doc_audit_events e
             LEFT JOIN clients c ON c.id = e.client_id
            WHERE ($1::uuid IS NULL OR e.parent_id = $1)
            ORDER BY e.created_at DESC LIMIT 100`,
          [body.parent_id || q.parent_id || null],
        ),
      )
      return res.status(200).json({ success: true, events: list })
    }

    return res.status(400).json({ success: false, error: `Unknown docs action: ${action}` })
  } catch (e) {
    console.error('docsHandler error:', e)
    return res.status(500).json({ success: false, error: e.message })
  }
}

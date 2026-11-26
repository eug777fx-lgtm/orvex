// ============================================================================
// Outreach (cold email queue) + "New from a call" quick add.
// Underscore file: not a Vercel function. Called from api/workflow.js after
// the access gate, so every action here already has a signed-in user.
//
//   outreach_list    admin/manager  all rows, newest first
//   outreach_add     admin/manager  add companies with their drafted email
//   outreach_update  admin/manager  move a card: sent / replied / booked / no
//   quick_add        any signed-in  lead + call log + next-step task in one go
//
// Emails are never sent from here. "Open in Gmail" happens in the browser and
// the person sends it themselves.
// ============================================================================

const rows = (r) => r?.rows ?? r ?? []
const first = (r) => rows(r)[0] || null
const clip = (v, n) => String(v ?? '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]+/g, ' ').trim().slice(0, n)
const isEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e)
const STATUSES = ['ready', 'sent', 'replied', 'booked', 'no']
const FOLLOW_DAYS = [3, 4] // day 3 after the first email, then 4 days after the first follow up

let schemaReady = null
function ensureSchema(sql) {
  if (!schemaReady) {
    schemaReady = (async () => {
      await sql.query(`CREATE TABLE IF NOT EXISTS outreach (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        lead_id UUID,
        company TEXT NOT NULL,
        contact_email TEXT NOT NULL,
        website TEXT,
        city TEXT,
        niche TEXT,
        rating TEXT,
        issue TEXT,
        subject TEXT,
        body TEXT,
        status TEXT NOT NULL DEFAULT 'ready',
        batch TEXT,
        source TEXT DEFAULT 'claude',
        followup_count INT NOT NULL DEFAULT 0,
        followup_at TIMESTAMPTZ,
        sent_at TIMESTAMPTZ,
        replied_at TIMESTAMPTZ,
        notes TEXT,
        log JSONB NOT NULL DEFAULT '[]'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now())`)
      await sql.query('CREATE UNIQUE INDEX IF NOT EXISTS outreach_email_uq ON outreach (lower(contact_email))')
      await sql.query('CREATE INDEX IF NOT EXISTS outreach_status_idx ON outreach (status, followup_at)')
    })().catch((e) => {
      schemaReady = null
      // two instances creating the table at the same moment: the other one won
      if (!/already exists|duplicate key|pg_class_relname_nsp_index|pg_type_typname_nsp_index/i.test(e.message || '')) throw e
    })
  }
  return schemaReady
}

const logEntry = (text) => JSON.stringify([{ at: new Date().toISOString(), text }])

async function linkLead(sql, item) {
  // reuse a lead with the same email or website, otherwise create one
  const site = clip(item.website, 300).replace(/^https?:\/\//i, '').replace(/\/$/, '')
  const found = first(
    await sql.query(
      `SELECT id FROM leads WHERE lower(email) = lower($1)
          OR ($2 <> '' AND regexp_replace(lower(coalesce(website_url,'')), '^https?://(www\\.)?|/$', '', 'g') = regexp_replace(lower($2), '^www\\.', ''))
        LIMIT 1`,
      [item.contact_email, site],
    ),
  )
  if (found) return found.id
  const r = first(
    await sql.query(
      `INSERT INTO leads (company_name, email, location, industry, website_url, has_website, source, status, notes)
       VALUES ($1, $2, $3, $4, $5, true, 'outreach', 'new', $6) RETURNING id`,
      [item.company, item.contact_email, item.city || null, item.niche || null, item.website || null, item.issue ? `Website check: ${item.issue}` : null],
    ),
  )
  return r?.id || null
}

async function activity(sql, leadId, type, notes) {
  if (!leadId) return
  try {
    await sql.query('INSERT INTO activities (lead_id, type, outcome, notes) VALUES ($1, $2, NULL, $3)', [leadId, type, notes])
  } catch (e) {
    console.error('outreach activity:', e.message)
  }
}

async function task(sql, leadId, title, due, user) {
  try {
    await sql.query(
      `INSERT INTO tasks (lead_id, title, type, due_date, priority, is_complete, assigned_to, rep_id)
       VALUES ($1, $2, 'follow_up', $3, 'high', false, $4, $4)`,
      [leadId, title, due, /^[0-9a-f-]{36}$/i.test(String(user?.id)) ? user.id : null],
    )
  } catch (e) {
    console.error('outreach task:', e.message)
  }
}

async function list(sql) {
  // a sent card whose follow up date has passed shows as "follow up due"
  const r = rows(
    await sql.query(
      `SELECT *, CASE WHEN status = 'sent' AND followup_at IS NOT NULL AND followup_at <= now() THEN 'follow' ELSE status END AS column_key
         FROM outreach ORDER BY created_at DESC LIMIT 1000`,
    ),
  )
  return { success: true, items: r }
}

async function add(sql, body, user) {
  const items = Array.isArray(body.items) ? body.items.slice(0, 50) : []
  if (!items.length) return { success: false, error: 'No companies to add' }
  let added = 0
  const skipped = []
  for (const raw of items) {
    const it = {
      company: clip(raw.company, 200),
      contact_email: clip(raw.contact_email || raw.email, 200).toLowerCase(),
      website: clip(raw.website, 300),
      city: clip(raw.city, 120),
      niche: clip(raw.niche, 80),
      rating: clip(raw.rating, 40),
      issue: clip(raw.issue, 600),
      subject: clip(raw.subject, 200),
      body: clip(raw.body, 6000),
      batch: clip(raw.batch, 60),
    }
    if (!it.company || !isEmail(it.contact_email) || !it.subject || !it.body) {
      skipped.push(`${it.company || '?'}: missing company, email, subject or body`)
      continue
    }
    // never re-add someone who already got an email or said no
    const exists = first(await sql.query('SELECT status FROM outreach WHERE lower(contact_email) = $1', [it.contact_email]))
    if (exists) {
      skipped.push(`${it.company}: already in outreach (${exists.status})`)
      continue
    }
    const dnc = first(await sql.query("SELECT 1 FROM leads WHERE lower(email) = $1 AND status = 'do_not_contact' LIMIT 1", [it.contact_email]))
    if (dnc) {
      skipped.push(`${it.company}: marked do not contact`)
      continue
    }
    const leadId = await linkLead(sql, it)
    await sql.query(
      `INSERT INTO outreach (lead_id, company, contact_email, website, city, niche, rating, issue, subject, body, batch, log)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb)`,
      [leadId, it.company, it.contact_email, it.website, it.city, it.niche, it.rating, it.issue, it.subject, it.body, it.batch || null,
        logEntry('Found and checked, email drafted')],
    )
    await activity(sql, leadId, 'note', `Added to outreach. Email drafted: "${it.subject}"`)
    added++
  }
  return { success: true, added, skipped }
}

async function update(sql, body, user) {
  const id = String(body.id || '')
  if (!/^[0-9a-f-]{36}$/i.test(id)) return { success: false, error: 'Invalid id' }
  const to = String(body.status || '')
  const row = first(await sql.query('SELECT * FROM outreach WHERE id = $1', [id]))
  if (!row) return { success: false, error: 'Not found' }
  const note = clip(body.note, 1000)

  if (to === 'sent') {
    // first email, or a follow up when it was already sent
    const isFollow = row.status === 'sent'
    const n = isFollow ? row.followup_count + 1 : 0
    const nextDays = FOLLOW_DAYS[n] // undefined after the last follow up
    const next = nextDays ? new Date(Date.now() + nextDays * 86400000) : null
    const text = isFollow ? `Follow up ${n} sent` : 'Email sent'
    await sql.query(
      `UPDATE outreach SET status = 'sent', sent_at = COALESCE(sent_at, now()), followup_count = $2, followup_at = $3,
          log = log || $4::jsonb, updated_at = now() WHERE id = $1`,
      [id, n, next, logEntry(next ? `${text}. Next follow up ${next.toDateString()}` : `${text}. No more follow ups`)],
    )
    await activity(sql, row.lead_id, 'email', `${text}: "${row.subject}"`)
    if (row.lead_id) await sql.query("UPDATE leads SET status = 'contacted' WHERE id = $1 AND status IN ('new','discovered','qualified')", [row.lead_id])
    if (next) await task(sql, row.lead_id, `Follow up by email: ${row.company}`, next.toISOString().slice(0, 10), user)
    return { success: true }
  }
  if (!STATUSES.includes(to)) return { success: false, error: 'Unknown status' }
  const labels = { ready: 'Moved back to ready', replied: 'They replied', booked: 'Call booked', no: 'Not interested, never email again' }
  await sql.query(
    `UPDATE outreach SET status = $2, followup_at = CASE WHEN $2 IN ('replied','booked','no') THEN NULL ELSE followup_at END,
        replied_at = CASE WHEN $2 IN ('replied','booked') THEN COALESCE(replied_at, now()) ELSE replied_at END,
        notes = COALESCE(NULLIF($3, ''), notes), log = log || $4::jsonb, updated_at = now() WHERE id = $1`,
    [id, to, note, logEntry(labels[to] + (note ? `: ${note}` : ''))],
  )
  // stop any open follow up task once they answered
  if (['replied', 'booked', 'no'].includes(to) && row.lead_id) {
    await sql.query("UPDATE tasks SET is_complete = true, completed_at = now() WHERE lead_id = $1 AND is_complete = false AND title LIKE 'Follow up by email:%'", [row.lead_id])
    const leadStatus = { replied: 'interested', booked: 'call_scheduled', no: 'do_not_contact' }[to]
    await sql.query('UPDATE leads SET status = $2 WHERE id = $1', [row.lead_id, leadStatus])
    await activity(sql, row.lead_id, 'note', labels[to] + (note ? `: ${note}` : ''))
  }
  return { success: true }
}

async function quickAdd(sql, body, user) {
  const company = clip(body.company, 200)
  const phone = clip(body.phone, 40)
  const email = clip(body.email, 200).toLowerCase()
  if (!company) return { success: false, error: 'Add the company name' }
  if (!phone && !email) return { success: false, error: 'Add a phone number or an email' }
  if (email && !isEmail(email)) return { success: false, error: 'That email looks wrong' }
  const needs = (Array.isArray(body.needs) ? body.needs : []).map((n) => clip(n, 30)).filter(Boolean).slice(0, 4)
  const heat = clip(body.heat, 30)
  const notesParts = [needs.length && `Needs: ${needs.join(', ')}`, heat && `Interest: ${heat}`, clip(body.notes, 2000)].filter(Boolean)
  const status = heat === 'Ready to buy' || heat === 'Interested' ? 'interested' : 'contacted'
  const uid = /^[0-9a-f-]{36}$/i.test(String(user?.id)) ? user.id : null
  const lead = first(
    await sql.query(
      `INSERT INTO leads (company_name, owner_name, phone, email, website_url, has_website, source, status, notes, assigned_to, rep_id)
       VALUES ($1, $2, $3, $4, $5, $6, 'phone call', $7, $8, $9, $9) RETURNING id`,
      [company, clip(body.contact, 120) || null, phone || null, email || null, clip(body.website, 300) || null, !!clip(body.website, 300), status, notesParts.join(' · ') || null, uid],
    ),
  )
  await activity(sql, lead.id, 'call', notesParts.join(' · ') || 'Call')
  const step = clip(body.next_step, 60)
  if (step && step !== 'Nothing yet') {
    const when = /^\d{4}-\d{2}-\d{2}/.test(String(body.when || '')) ? String(body.when).slice(0, 10) : new Date(Date.now() + 86400000).toISOString().slice(0, 10)
    await task(sql, lead.id, `${step}: ${company}`, when, user)
  }
  return { success: true, lead_id: lead.id }
}

export async function outreachHandler(sql, action, body, user) {
  await ensureSchema(sql)
  if (action === 'outreach_list') return list(sql)
  if (action === 'outreach_add') return add(sql, body, user)
  if (action === 'outreach_update') return update(sql, body, user)
  if (action === 'quick_add') return quickAdd(sql, body, user)
  return { success: false, error: 'Unknown action' }
}

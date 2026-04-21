import db from '@/lib/db'

const ORVEX_FIELDS = new Set([
  'company_name',
  'owner_name',
  'phone',
  'email',
  'location',
  'industry',
  'website_url',
  'notes',
])

function clean(value) {
  if (value == null) return null
  const str = String(value).trim()
  return str === '' ? null : str
}

function buildLead(row, fieldMap) {
  const lead = {}
  for (const [csvColumn, orvexField] of Object.entries(fieldMap)) {
    if (!orvexField || orvexField === 'skip') continue
    if (!ORVEX_FIELDS.has(orvexField)) continue
    const value = clean(row[csvColumn])
    if (value != null) lead[orvexField] = value
  }
  return lead
}

function makeDupKey(name, phone) {
  return `${(name || '').toLowerCase().trim()}|${(phone || '').trim()}`
}

export async function importLeads(rows, fieldMap, options = {}, onProgress) {
  if (!db) {
    throw new Error('Database not connected.')
  }

  const {
    autoScore = true,
    skipDuplicates = true,
    defaultStatus = 'new',
    markNoWebsite = true,
  } = options

  const leads = []
  for (const row of rows || []) {
    const lead = buildLead(row, fieldMap)
    if (lead.company_name) leads.push(lead)
  }

  const total = leads.length
  let imported = 0
  let skipped = 0
  let errors = 0

  if (total === 0) {
    onProgress?.(0, 0)
    return { imported, skipped, errors }
  }

  let existing = new Set()
  if (skipDuplicates) {
    try {
      const existingRows = await db.query('SELECT company_name, phone FROM leads')
      existing = new Set(
        (existingRows || []).map((r) => makeDupKey(r.company_name, r.phone)),
      )
    } catch (err) {
      console.error('dedup load failed', err)
    }
  }

  const batchSize = 10
  for (let i = 0; i < total; i += batchSize) {
    const batch = leads.slice(i, i + batchSize)

    await Promise.all(
      batch.map(async (lead) => {
        try {
          if (skipDuplicates) {
            const key = makeDupKey(lead.company_name, lead.phone)
            if (existing.has(key)) {
              skipped += 1
              return
            }
            existing.add(key)
          }

          const hasWebsite = !!lead.website_url
          const noWebsite = !hasWebsite
          const autoFlagNoWebsite = markNoWebsite && noWebsite

          let score = 0
          if (autoScore) {
            if (autoFlagNoWebsite) score += 4
            score += 2
          }

          await db.query(
            `INSERT INTO leads (
              company_name, owner_name, phone, email, location, industry,
              website_url, notes, source, status,
              has_website, has_crm, manual_processes, opportunity_score
            ) VALUES (
              $1, $2, $3,
              $4, $5, $6,
              $7, $8,
              'import', $9,
              $10, false, true, $11
            )`,
            [
              lead.company_name,
              lead.owner_name || null,
              lead.phone || null,
              lead.email || null,
              lead.location || null,
              lead.industry || null,
              lead.website_url || null,
              lead.notes || null,
              defaultStatus,
              hasWebsite,
              score,
            ],
          )
          imported += 1
        } catch (err) {
          console.error('import row failed', err)
          errors += 1
        }
      }),
    )

    onProgress?.(Math.min(i + batchSize, total), total)
  }

  return { imported, skipped, errors }
}

export default importLeads

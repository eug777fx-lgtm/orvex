export function deriveLeadProblems(lead) {
  if (!lead) return new Set()
  const problems = new Set()
  if (!lead.has_website) problems.add('no_website')
  if (lead.website_quality === 'poor') problems.add('poor_website')
  if (!lead.has_crm) problems.add('no_crm')
  if (lead.manual_processes) problems.add('manual_processes')
  const rating = Number(lead.avg_rating) || 0
  const reviews = Number(lead.review_count) || 0
  if (reviews < 10 || rating < 3.5) problems.add('low_reviews')
  return problems
}

function normalizeIndustry(v) {
  return (v || '').toString().trim().toLowerCase()
}

export function scoreScriptForLead(script, lead) {
  if (!script) return 0
  const problems = deriveLeadProblems(lead)
  const tags = Array.isArray(script.problem_tags) ? script.problem_tags : []
  let score = 0
  for (const tag of tags) {
    if (problems.has(tag)) score += 1
  }
  const industryList = Array.isArray(script.industry_tags) ? script.industry_tags : []
  const leadIndustry = normalizeIndustry(lead?.industry)
  if (leadIndustry && industryList.some((t) => normalizeIndustry(t) === leadIndustry)) {
    score += 0.5
  }
  return score
}

export function pickBestScript(scripts, lead, { type = 'cold_call' } = {}) {
  if (!Array.isArray(scripts) || scripts.length === 0) return null
  const pool = scripts.filter((s) => (type ? s.type === type : true) && s.is_active !== false)
  if (pool.length === 0) return null

  let best = null
  let bestScore = -1
  for (const script of pool) {
    const s = scoreScriptForLead(script, lead)
    if (s > bestScore) {
      bestScore = s
      best = script
    }
  }
  return best
}

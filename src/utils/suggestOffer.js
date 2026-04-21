export function deriveLeadProblems(lead) {
  if (!lead) return new Set()
  const problems = new Set()
  if (lead.has_website === false) problems.add('no_website')
  if (lead.website_quality === 'poor') problems.add('poor_website')
  if (lead.has_crm === false) problems.add('no_crm')
  if (lead.manual_processes === true) problems.add('manual_processes')
  const rating = Number(lead.avg_rating) || 0
  if (rating > 0 && rating < 4) problems.add('low_reviews')
  return problems
}

export function scoreOfferForLead(offer, leadProblems) {
  if (!offer) return { score: 0, matches: [] }
  const tags = Array.isArray(offer.problems_solved) ? offer.problems_solved : []
  const matches = tags.filter((t) => leadProblems.has(t))
  return { score: matches.length, matches }
}

export function suggestOffer(lead, offers) {
  if (!Array.isArray(offers) || offers.length === 0) return []
  const problems = deriveLeadProblems(lead)
  const active = offers.filter((o) => o.is_active !== false)

  const scored = active
    .map((offer) => {
      const { score, matches } = scoreOfferForLead(offer, problems)
      return { offer, score, matches }
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      const aMin = Number(a.offer.price_min) || 0
      const bMin = Number(b.offer.price_min) || 0
      return aMin - bMin
    })

  return scored.slice(0, 2)
}

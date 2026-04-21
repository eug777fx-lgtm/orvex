const WEIGHTS = {
  no_website: 4,
  poor_website: 2,
  no_crm: 2,
  low_reviews: 1,
  manual_processes: 1,
}

export function calculateScore(flags = {}) {
  let score = 0
  for (const key in WEIGHTS) {
    if (flags[key]) score += WEIGHTS[key]
  }
  return Math.min(score, 10)
}

export default calculateScore

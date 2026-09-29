// Outreach generator for Lead Intelligence.
//
// Deterministic and fact-based: every sentence comes from verified provider
// data (name, city, rating, reviews) or an observed website finding. Nothing
// personal is invented, and unknowns are never stated as facts.

const BENEFIT = {
  landing_page: 'a clean landing page that turns visitors into calls',
  business_website: 'a professional website that turns visitors into calls',
  premium_website: 'a premium website built to win more jobs',
  booking: 'online booking so customers can schedule any time',
  crm: 'a simple system to track every lead and follow-up',
  automation: 'automatic follow-ups so no inquiry slips through',
  custom_dashboard: 'a dashboard to run the day-to-day in one place',
}

const SOCIAL_NAME = (url = '') =>
  /instagram/i.test(url) ? 'an Instagram page' : /facebook|fb\.com/i.test(url) ? 'a Facebook page' : 'a social media page'

function industryNoun(b, catalog) {
  const label = catalog?.find((i) => i.key === b.industry)?.label || b.category || ''
  return label ? `${label.toLowerCase()} businesses` : 'local businesses'
}

// The single most useful verified observation, phrased for the business owner.
export function primaryObservation(b) {
  const st = b.website_state
  if (st === 'none_listed') return { long: `I couldn't find a website listed for ${b.business_name} on Google`, short: `I noticed ${b.business_name} doesn't have a website listed on Google` }
  if (st === 'social_only') return { long: `it looks like ${b.business_name} uses ${SOCIAL_NAME(b.website)} instead of a website`, short: `I saw ${b.business_name} uses ${SOCIAL_NAME(b.website)} instead of a website` }
  if (st === 'unreachable') return { long: 'your website did not load when I checked it', short: 'your website did not load when I checked it' }
  if (st === 'reachable') {
    const s = b.analysis?.website_signals || {}
    if (b.booking_status === 'not_detected' && (b.opportunities?.booking?.fraction || 0) >= 0.5) {
      return { long: "your website doesn't appear to offer online booking", short: "your site doesn't seem to offer online booking" }
    }
    if (s.viewport === false) return { long: "your website doesn't seem to be optimized for phones", short: "your site doesn't seem optimized for phones" }
    if (s.contact_form === false) return { long: "I didn't see a quick way to request a quote or send a message on your website", short: "I didn't see a quote request form on your site" }
    if (s.https === false) return { long: "your website isn't using a secure (https) connection", short: "your site isn't on a secure connection" }
  }
  return null
}

function compliment(b) {
  if ((b.rating ?? 0) >= 4.3 && (b.review_count ?? 0) >= 20) {
    return `You have ${b.review_count} Google reviews at a ${Number(b.rating).toFixed(1)} rating, which says a lot about your work.`
  }
  return ''
}

function benefits(b, max = 3) {
  const keys = (b.pricing?.services || []).map((s) => s.key).filter((k) => BENEFIT[k])
  const list = keys.slice(0, max).map((k) => BENEFIT[k])
  if (!list.length) return 'better websites and customer workflows'
  if (list.length === 1) return list[0]
  return `${list.slice(0, -1).join(', ')} and ${list[list.length - 1]}`
}

const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s)

export function generateOutreach(b, { sender = 'Eugene', catalog } = {}) {
  const obs = primaryObservation(b)
  const noun = industryNoun(b, catalog)
  const where = b.city ? ` in ${b.city}` : ''
  const praise = compliment(b)
  const offer = benefits(b)
  const topOffer = benefits(b, 1)

  const intro = obs
    ? `${cap(obs.long)}.`
    : `I came across ${b.business_name} while researching ${noun}${where}.`

  const email = {
    subject: `Quick idea for ${b.business_name}`,
    body: [
      `Hi ${b.business_name} team,`,
      '',
      `My name is ${sender} from Lithos Labs. ${intro}${praise ? ` ${praise}` : ''}`,
      '',
      `We help ${noun} with ${offer}.`,
      '',
      'Would you be open to a quick 10 minute call this week? I can show you a short example of what this could look like for you.',
      '',
      'Best,',
      sender,
      'Lithos Labs',
      'lithoslabs.agency',
    ].join('\n'),
  }

  const sms = `Hi, this is ${sender} with Lithos Labs. ${obs ? `${cap(obs.short)}.` : `I came across ${b.business_name}${where}.`} We help ${noun} with ${topOffer}. Open to a quick call? Reply STOP to opt out.`

  const followUp = {
    subject: `Following up: ${b.business_name}`,
    body: [
      `Hi ${b.business_name} team,`,
      '',
      `Just following up on my note from last week. ${obs ? `${cap(obs.long)}, and ` : ''}I think there's a simple win here with ${topOffer}.`,
      '',
      'Happy to send a quick example or jump on a 10 minute call, whatever is easier for you.',
      '',
      'Best,',
      sender,
      'Lithos Labs',
    ].join('\n'),
  }

  const facts = []
  if (b.rating !== null && b.rating !== undefined) facts.push(`${b.review_count ?? 0} reviews at ${Number(b.rating).toFixed(1)}`)
  else facts.push('Rating: not available')
  for (const f of [
    ...(b.opportunities?.website?.findings || []).slice(0, 2),
    ...(b.opportunities?.booking?.findings || []).slice(0, 1),
    ...(b.opportunities?.crm?.findings || []).slice(0, 1),
  ]) facts.push(f)

  const callNotes = [
    `Opener: Hi, am I speaking with the owner of ${b.business_name}? My name is ${sender}, I'm with Lithos Labs.`,
    `Reason for the call: ${obs ? obs.long : `I came across ${b.business_name} while looking at ${noun}${where}`}.`,
    '',
    'Verified facts:',
    ...facts.map((f) => `  • ${f}`),
    '',
    'Discovery questions:',
    '  • How do new customers usually reach you or book today?',
    '  • How do you keep track of inquiries and follow-ups?',
    '  • What would one extra job per week be worth to you?',
    '',
    `Offer: ${b.pricing?.services?.length ? b.pricing.package_name : 'Discovery call first'}`,
    'Ask: a 10 minute call or a short demo this week.',
  ].join('\n')

  return { email, sms, followUp, callNotes }
}

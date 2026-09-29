// ============================================================================
// Lead Intelligence — public website analysis.
//
// Rules this module enforces:
//   • Only public http(s) pages on standard ports; private / internal network
//     addresses are refused (SSRF protection), on every redirect hop.
//   • robots.txt is honored for our user agent (LithosLabsBot) and "*".
//   • No login pages, forms, CAPTCHAs or paywalls are touched. We read the
//     homepage, the sitemap (if allowed) and HEAD-check a few internal links.
//   • Short timeouts and a byte cap per response.
//   • Every detection records the evidence that triggered it. Anything we
//     could not observe is reported as unknown, never as "no".
// ============================================================================

import dns from 'node:dns/promises'
import net from 'node:net'

export const BOT_UA = 'Mozilla/5.0 (compatible; LithosLabsBot/1.0; +https://lithoslabs.agency)'
const BOT_TOKEN = 'lithoslabsbot'

// ---------------------------------------------------------------------------
// SSRF-safe fetch
// ---------------------------------------------------------------------------

function ipv4Private(ip) {
  const p = ip.split('.').map(Number)
  if (p.length !== 4 || p.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return true
  const [a, b] = p
  return (
    a === 0 || a === 10 || a === 127 || a >= 224 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 192 && b === 0 && p[2] === 0) ||
    (a === 198 && (b === 18 || b === 19))
  )
}

export function isPrivateIp(ip) {
  if (net.isIPv4(ip)) return ipv4Private(ip)
  if (net.isIPv6(ip)) {
    const s = ip.toLowerCase()
    if (s === '::' || s === '::1') return true
    const mapped = s.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)
    if (mapped) return ipv4Private(mapped[1])
    if (/^f[cd]/.test(s)) return true // fc00::/7 unique local
    if (/^fe[89ab]/.test(s)) return true // fe80::/10 link local
    if (/^ff/.test(s)) return true // multicast
    return false
  }
  return true
}

const blocked = (msg) => Object.assign(new Error(msg), { code: 'blocked' })

export async function assertPublicUrl(raw) {
  let u
  try {
    u = new URL(raw)
  } catch {
    throw blocked('invalid URL')
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') throw blocked('unsupported protocol')
  if (u.username || u.password) throw blocked('credentials in URL not allowed')
  if (u.port && !['80', '443'].includes(u.port)) throw blocked('non-standard port')
  const host = u.hostname.replace(/^\[|\]$/g, '')
  if (!host || host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal')) {
    throw blocked('private host')
  }
  if (net.isIP(host)) {
    if (isPrivateIp(host)) throw blocked('private address')
    return u
  }
  let addrs
  try {
    addrs = await dns.lookup(host, { all: true, verbatim: true })
  } catch {
    throw blocked('domain does not resolve')
  }
  if (!addrs.length || addrs.some((a) => isPrivateIp(a.address))) throw blocked('private address')
  return u
}

export async function safeFetch(url, { method = 'GET', timeoutMs = 8000, maxBytes = 1_500_000, maxRedirects = 5, accept } = {}) {
  const started = Date.now()
  let current = url
  const chain = []
  for (let hop = 0; hop <= maxRedirects; hop++) {
    await assertPublicUrl(current)
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), Math.max(500, timeoutMs - (Date.now() - started)))
    let res
    try {
      res = await fetch(current, {
        method,
        redirect: 'manual',
        signal: ctrl.signal,
        headers: {
          'User-Agent': BOT_UA,
          Accept: accept || 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.5',
          'Accept-Language': 'en',
        },
      })
    } catch (e) {
      clearTimeout(timer)
      throw new Error(e?.name === 'AbortError' ? 'timed out' : 'connection failed')
    }
    if (res.status >= 300 && res.status < 400 && res.headers.get('location')) {
      clearTimeout(timer)
      chain.push({ url: current, status: res.status })
      current = new URL(res.headers.get('location'), current).toString()
      try { await res.body?.cancel() } catch { /* ignore */ }
      continue
    }
    let body = ''
    let bytes = 0
    let truncated = false
    if (method !== 'HEAD' && res.body) {
      const reader = res.body.getReader()
      const chunks = []
      try {
        for (;;) {
          const { done, value } = await reader.read()
          if (done) break
          bytes += value.byteLength
          if (bytes > maxBytes) {
            truncated = true
            chunks.push(value.slice(0, value.byteLength - (bytes - maxBytes)))
            try { await reader.cancel() } catch { /* ignore */ }
            break
          }
          chunks.push(value)
        }
      } catch (e) {
        clearTimeout(timer)
        throw new Error(e?.name === 'AbortError' ? 'timed out' : 'connection interrupted')
      }
      body = Buffer.concat(chunks.map((c) => Buffer.from(c))).toString('utf8')
    }
    clearTimeout(timer)
    return {
      status: res.status,
      ok: res.ok,
      url: current,
      redirects: chain,
      headers: Object.fromEntries(res.headers.entries()),
      body,
      bytes,
      truncated,
      ms: Date.now() - started,
    }
  }
  throw new Error('too many redirects')
}

// ---------------------------------------------------------------------------
// robots.txt
// ---------------------------------------------------------------------------

export function parseRobots(txt) {
  const groups = []
  let cur = null
  let lastWasAgent = false
  for (const rawLine of String(txt || '').split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, '').trim()
    if (!line) continue
    const m = line.match(/^([A-Za-z-]+)\s*:\s*(.*)$/)
    if (!m) continue
    const field = m[1].toLowerCase()
    const value = m[2].trim()
    if (field === 'user-agent') {
      if (!cur || !lastWasAgent) {
        cur = { agents: [], rules: [] }
        groups.push(cur)
      }
      cur.agents.push(value.toLowerCase())
      lastWasAgent = true
    } else {
      lastWasAgent = false
      if (!cur) continue
      if (field === 'allow' || field === 'disallow') cur.rules.push({ allow: field === 'allow', path: value })
    }
  }
  return groups
}

function ruleMatches(pattern, path) {
  if (!pattern) return false
  const esc = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')
  const re = esc.endsWith('\\$') ? new RegExp(`^${esc.slice(0, -2)}$`) : new RegExp(`^${esc}`)
  return re.test(path)
}

export function robotsAllows(groups, path = '/', agent = BOT_TOKEN) {
  const specific = groups.filter((g) => g.agents.some((a) => a !== '*' && agent.includes(a)))
  const group = specific.length ? specific : groups.filter((g) => g.agents.includes('*'))
  if (!group.length) return true
  let best = null
  for (const g of group) {
    for (const r of g.rules) {
      if (r.path === '' && !r.allow) continue // "Disallow:" (empty) allows everything
      if (ruleMatches(r.path, path)) {
        if (!best || r.path.length > best.path.length || (r.path.length === best.path.length && r.allow)) best = r
      }
    }
  }
  return best ? best.allow : true
}

// ---------------------------------------------------------------------------
// Technology / capability signatures
// category: cms | booking | ecommerce | ordering | payments | crm | field_service
//           | email_marketing | chat | analytics | forms | reviews
// ---------------------------------------------------------------------------

const SIG = (name, category, patterns) => ({ name, category, patterns })

export const SIGNATURES = [
  SIG('WordPress', 'cms', [/\/wp-content\//i, /\/wp-includes\//i, /<meta[^>]+generator[^>]+wordpress/i]),
  SIG('Shopify', 'cms', [/cdn\.shopify\.com/i, /Shopify\.theme/]),
  SIG('Wix', 'cms', [/static\.wixstatic\.com/i, /<meta[^>]+generator[^>]+wix\.com/i, /wix-code-sdk/i]),
  SIG('Squarespace', 'cms', [/static1\.squarespace\.com/i, /squarespace-cdn\.com/i, /<!--\s*This is Squarespace/i]),
  SIG('Webflow', 'cms', [/data-wf-page=/i, /assets\.website-files\.com/i, /webflow\.js/i]),
  SIG('GoDaddy Website Builder', 'cms', [/img\d?\.wsimg\.com/i, /<meta[^>]+generator[^>]+(go daddy|godaddy)/i]),
  SIG('Duda', 'cms', [/irp\.cdn-website\.com/i, /multiscreensite/i, /dudamobile/i]),
  SIG('Weebly', 'cms', [/editmysite\.com/i, /weebly\.com\/weebly/i]),
  SIG('Joomla', 'cms', [/<meta[^>]+generator[^>]+joomla/i, /\/media\/jui\//i]),
  SIG('Drupal', 'cms', [/Drupal\.settings/, /\/sites\/default\/files\//i, /<meta[^>]+generator[^>]+drupal/i]),
  SIG('Framer', 'cms', [/framerusercontent\.com/i, /<meta[^>]+generator[^>]+framer/i]),
  SIG('HubSpot CMS', 'cms', [/hs-sites\.com/i, /<meta[^>]+generator[^>]+hubspot/i]),
  SIG('Google Sites', 'cms', [/sites\.google\.com/i, /<meta[^>]+generator[^>]+google sites/i]),

  SIG('Calendly', 'booking', [/calendly\.com\/[a-z0-9_-]+/i, /assets\.calendly\.com/i]),
  SIG('Acuity Scheduling', 'booking', [/acuityscheduling\.com/i, /app\.acuityscheduling/i, /\.as\.me\b/i]),
  SIG('Square Appointments', 'booking', [/squareup\.com\/appointments/i, /book\.squareup\.com/i]),
  SIG('Booksy', 'booking', [/booksy\.com/i]),
  SIG('Vagaro', 'booking', [/vagaro\.com/i]),
  SIG('Fresha', 'booking', [/fresha\.com/i]),
  SIG('Setmore', 'booking', [/setmore\.com/i]),
  SIG('SimplyBook.me', 'booking', [/simplybook\.(me|it)/i]),
  SIG('Mindbody', 'booking', [/mindbodyonline\.com/i, /widgets\.healcode\.com/i]),
  SIG('Schedulicity', 'booking', [/schedulicity\.com/i]),
  SIG('GlossGenius', 'booking', [/glossgenius\.com/i]),
  SIG('StyleSeat', 'booking', [/styleseat\.com/i]),
  SIG('Zocdoc', 'booking', [/zocdoc\.com/i]),
  SIG('OpenTable', 'booking', [/opentable\.com/i]),
  SIG('Resy', 'booking', [/resy\.com/i]),
  SIG('Tock', 'booking', [/exploretock\.com/i]),
  SIG('Cal.com', 'booking', [/cal\.com\/[a-z0-9_-]+/i]),
  SIG('TidyCal', 'booking', [/tidycal\.com/i]),
  SIG('YouCanBookMe', 'booking', [/youcanbook\.me/i]),
  SIG('Appointy', 'booking', [/appointy\.com/i]),
  SIG('Boulevard', 'booking', [/joinblvd\.com/i, /blvd\.co/i]),
  SIG('Jane App', 'booking', [/janeapp\.com/i]),
  SIG('Timely', 'booking', [/gettimely\.com/i]),
  SIG('Microsoft Bookings', 'booking', [/outlook\.office365\.com\/owa\/calendar\/[^"']+bookings/i, /bookings\.cloud\.microsoft/i]),
  SIG('Google Appointment Schedule', 'booking', [/calendar\.app\.google/i, /calendar\.google\.com\/calendar\/appointments/i]),
  SIG('Wix Bookings', 'booking', [/wix-bookings/i, /bookings-widget/i]),
  SIG('Cloudbeds', 'booking', [/cloudbeds\.com/i]),
  SIG('SiteMinder', 'booking', [/siteminder\.com/i, /thebookingbutton/i]),
  SIG('SynXis', 'booking', [/synxis\.com/i]),

  SIG('Housecall Pro', 'field_service', [/housecallpro\.com/i]),
  SIG('Jobber', 'field_service', [/getjobber\.com/i, /clienthub\.getjobber/i]),
  SIG('ServiceTitan', 'field_service', [/servicetitan\.com/i, /scheduler\.servicetitan/i]),
  SIG('Workiz', 'field_service', [/workiz\.com/i]),
  SIG('ServiceM8', 'field_service', [/servicem8\.com/i]),

  SIG('WooCommerce', 'ecommerce', [/woocommerce/i]),
  SIG('BigCommerce', 'ecommerce', [/bigcommerce\.com/i]),
  SIG('Ecwid', 'ecommerce', [/ecwid\.com/i, /app\.ecwid/i]),
  SIG('Square Online', 'ecommerce', [/square\.site/i, /squareup\.com\/store/i]),
  SIG('Snipcart', 'ecommerce', [/snipcart/i]),
  SIG('Shopify Store', 'ecommerce', [/\/cart\.js/i, /shopify-section/i]),
  SIG('Toast Online Ordering', 'ordering', [/toasttab\.com/i]),
  SIG('ChowNow', 'ordering', [/chownow\.com/i]),
  SIG('Olo', 'ordering', [/olo\.com/i]),
  SIG('DoorDash', 'ordering', [/order\.online/i, /doordash\.com\/(store|business)/i]),
  SIG('Uber Eats', 'ordering', [/ubereats\.com\/store/i]),

  SIG('Stripe', 'payments', [/js\.stripe\.com/i, /checkout\.stripe\.com/i, /buy\.stripe\.com/i]),
  SIG('PayPal', 'payments', [/paypal\.com\/sdk/i, /paypalobjects\.com/i]),
  SIG('Square Payments', 'payments', [/web\.squarecdn\.com/i, /js\.squareup\.com/i]),
  SIG('Authorize.net', 'payments', [/authorize\.net/i]),
  SIG('Braintree', 'payments', [/braintreegateway\.com/i, /js\.braintreegateway/i]),
  SIG('Clover', 'payments', [/clover\.com\/(pay|online-ordering)/i]),

  SIG('HubSpot', 'crm', [/js\.hs-scripts\.com/i, /js\.hsforms\.net/i, /hs-analytics\.net/i, /js\.hubspot\.com/i]),
  SIG('Salesforce', 'crm', [/pardot\.com/i, /pi\.pardot/i, /force\.com\/servlet/i, /salesforce-sites/i]),
  SIG('Zoho', 'crm', [/zohopublic\.com/i, /salesiq\.zoho/i, /crm\.zoho\./i]),
  SIG('GoHighLevel', 'crm', [/leadconnectorhq\.com/i, /msgsndr\.com/i, /highlevel/i]),
  SIG('Keap', 'crm', [/infusionsoft\.com/i, /keap\.(com|app)/i]),
  SIG('Pipedrive', 'crm', [/pipedrive(webforms)?\.com/i, /leadbooster/i]),
  SIG('Podium', 'crm', [/podium\.com/i, /connect\.podium/i]),
  SIG('Birdeye', 'crm', [/birdeye\.com/i]),
  SIG('ActiveCampaign', 'email_marketing', [/trackcmp\.net/i, /activehosted\.com/i]),
  SIG('Mailchimp', 'email_marketing', [/list-manage\.com/i, /chimpstatic\.com/i]),
  SIG('Klaviyo', 'email_marketing', [/klaviyo\.com/i]),
  SIG('Constant Contact', 'email_marketing', [/ctctcdn\.com/i, /constantcontact\.com/i]),

  SIG('Intercom', 'chat', [/widget\.intercom\.io/i, /intercomcdn\.com/i]),
  SIG('Drift', 'chat', [/js\.driftt\.com/i, /drift\.com\/core/i]),
  SIG('Tawk.to', 'chat', [/embed\.tawk\.to/i]),
  SIG('LiveChat', 'chat', [/cdn\.livechatinc\.com/i]),
  SIG('Crisp', 'chat', [/client\.crisp\.chat/i]),
  SIG('Tidio', 'chat', [/code\.tidio\.co/i]),
  SIG('Zendesk Chat', 'chat', [/static\.zdassets\.com/i, /zopim/i]),
  SIG('Facebook Messenger', 'chat', [/fb-customerchat/i, /customerchat\.js/i]),
  SIG('WhatsApp', 'chat', [/wa\.me\/\d+/i, /api\.whatsapp\.com\/send/i]),

  SIG('Google Analytics', 'analytics', [/googletagmanager\.com\/gtag\/js/i, /google-analytics\.com\/(analytics|ga)\.js/i]),
  SIG('Google Tag Manager', 'analytics', [/googletagmanager\.com\/gtm\.js/i]),
  SIG('Meta Pixel', 'analytics', [/connect\.facebook\.net\/[^"']*fbevents\.js/i, /fbq\(\s*['"]init/i]),
  SIG('Hotjar', 'analytics', [/static\.hotjar\.com/i]),
  SIG('Microsoft Clarity', 'analytics', [/clarity\.ms\/tag/i]),
  SIG('TikTok Pixel', 'analytics', [/analytics\.tiktok\.com/i]),

  SIG('Gravity Forms', 'forms', [/gform_wrapper/i, /gravityforms/i]),
  SIG('Contact Form 7', 'forms', [/wpcf7/i]),
  SIG('WPForms', 'forms', [/wpforms/i]),
  SIG('Jotform', 'forms', [/jotform\.com/i]),
  SIG('Typeform', 'forms', [/typeform\.com/i]),
  SIG('Google Forms', 'forms', [/docs\.google\.com\/forms/i, /forms\.gle\//i]),
  SIG('Formspree', 'forms', [/formspree\.io/i]),
]

export function detectTechnologies(html) {
  const found = []
  for (const s of SIGNATURES) {
    for (const re of s.patterns) {
      const m = html.match(re)
      if (m) {
        found.push({ name: s.name, category: s.category, evidence: m[0].slice(0, 80) })
        break
      }
    }
  }
  // Shopify Store is implied by Shopify CMS; keep one entry.
  return found.filter((t, i, arr) => !(t.name === 'Shopify Store' && arr.some((x) => x.name === 'Shopify')))
}

// ---------------------------------------------------------------------------
// HTML signal extraction (pure; tested against fixtures)
// ---------------------------------------------------------------------------

const decode = (s) =>
  String(s || '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

function attr(tag, name) {
  const m = tag.match(new RegExp(`\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i'))
  return m ? m[2] ?? m[3] ?? m[4] ?? '' : null
}

const SOCIAL_PATTERNS = [
  ['facebook', /^https?:\/\/(www\.|m\.)?facebook\.com\/(?!sharer|share|dialog|plugins|tr\b|login)[^"'?#\s]+/i],
  ['instagram', /^https?:\/\/(www\.)?instagram\.com\/(?!p\/|share)[^"'?#\s]+/i],
  ['linkedin', /^https?:\/\/(www\.)?linkedin\.com\/(company|in|school)\/[^"'?#\s]+/i],
  ['tiktok', /^https?:\/\/(www\.)?tiktok\.com\/@[^"'?#\s]+/i],
  ['youtube', /^https?:\/\/(www\.)?youtube\.com\/(channel|c|user|@)[^"'?#\s]*/i],
  ['x', /^https?:\/\/(www\.)?(twitter|x)\.com\/(?!intent|share|home)[A-Za-z0-9_]+/i],
  ['yelp', /^https?:\/\/(www\.)?yelp\.[a-z.]+\/biz\/[^"'?#\s]+/i],
]

const BOOKING_TEXT = /\b(book (now|online|an? appointment|a service|your (appointment|visit|service))|schedule (now|online|an? (appointment|service|visit|estimate)|service)|request (an? )?appointment|make (an? )?(appointment|reservation)|reserve (a table|now))\b/i
const QUOTE_TEXT = /\b(free (quote|estimate)|get (a |your )?(free )?(quote|estimate)|request (a )?(quote|estimate))\b/i

export function extractSignals(html, pageUrl) {
  const base = new URL(pageUrl)
  const host = base.hostname.replace(/^www\./, '')
  const lower = html.toLowerCase()
  const s = {}

  s.title = decode((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || '') || null
  const metas = html.match(/<meta\b[^>]*>/gi) || []
  const metaBy = (key, val) => metas.find((m) => (attr(m, key) || '').toLowerCase() === val)
  const md = metaBy('name', 'description')
  s.meta_description = md ? decode(attr(md, 'content')) || null : null
  const vp = metaBy('name', 'viewport')
  s.viewport = !!(vp && /width\s*=\s*device-width/i.test(attr(vp, 'content') || ''))
  s.og_tags = metas.some((m) => /^og:/i.test(attr(m, 'property') || ''))
  const gen = metaBy('name', 'generator')
  s.generator = gen ? decode(attr(gen, 'content')).slice(0, 80) : null
  s.lang = attr((html.match(/<html\b[^>]*>/i) || [''])[0], 'lang') || null
  s.h1_count = (html.match(/<h1\b/gi) || []).length
  s.structured_data = /application\/ld\+json/i.test(html)
  s.local_business_schema = /"@type"\s*:\s*"(LocalBusiness|HomeAndConstructionBusiness|Plumber|Electrician|HVACBusiness|RoofingContractor|AutoRepair|BeautySalon|HairSalon|NailSalon|DaySpa|Dentist|MedicalBusiness|Restaurant|CafeOrCoffeeShop|Hotel|LegalService|Attorney|AccountingService|InsuranceAgency|RealEstateAgent|HealthClub|ExerciseGym|MovingCompany|Locksmith|HousePainter|GeneralContractor)"/i.test(html)

  // Links
  const anchors = html.match(/<a\b[^>]*>[\s\S]*?<\/a>/gi) || []
  const internal = new Set()
  const social = {}
  const emails = new Set()
  let phoneCta = false
  let bookingCta = null
  let quoteCta = null
  for (const a of anchors) {
    const href = (attr(a, 'href') || '').trim()
    const text = decode(a.replace(/<[^>]+>/g, ' '))
    if (/^tel:/i.test(href)) phoneCta = true
    if (/^mailto:/i.test(href)) {
      const em = decodeURIComponent(href.slice(7).split('?')[0]).trim().toLowerCase()
      if (/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(em)) emails.add(em)
    }
    if (!bookingCta && BOOKING_TEXT.test(text) && href && !/^(tel|mailto):/i.test(href) && href !== '#') bookingCta = text.slice(0, 60)
    if (!quoteCta && QUOTE_TEXT.test(text)) quoteCta = text.slice(0, 60)
    let abs
    try {
      abs = new URL(href, base)
    } catch {
      continue
    }
    if (abs.protocol !== 'http:' && abs.protocol !== 'https:') continue
    const h = abs.hostname.replace(/^www\./, '')
    if (h === host) {
      const path = abs.pathname.replace(/\/+$/, '') || '/'
      if (!/\.(jpg|jpeg|png|gif|webp|svg|pdf|zip|mp4|mp3|css|js)$/i.test(path)) internal.add(path)
    } else {
      for (const [k, re] of SOCIAL_PATTERNS) {
        if (!social[k] && re.test(abs.toString())) social[k] = abs.toString().split('?')[0]
      }
    }
  }
  s.phone_cta = phoneCta
  s.email_cta = emails.size > 0
  s.emails = Array.from(emails).slice(0, 5)
  s.social = social
  s.internal_links = internal.size
  s.internal_paths = Array.from(internal).filter((p) => p !== '/').slice(0, 40)
  s.booking_cta = bookingCta
  s.quote_cta = quoteCta

  // Forms: a contact/lead form has an email/tel field or a textarea; search
  // and newsletter-only forms don't count as contact forms.
  const forms = html.match(/<form\b[\s\S]*?<\/form>/gi) || []
  let contactForm = false
  let quoteForm = false
  let newsletterOnly = 0
  for (const f of forms) {
    const isSearch = /role\s*=\s*["']?search|type\s*=\s*["']?search|name\s*=\s*["']?(s|q|search)["'\s>]/i.test(f) && !/<textarea/i.test(f)
    if (isSearch) continue
    const hasTextarea = /<textarea/i.test(f)
    const hasTel = /type\s*=\s*["']?tel/i.test(f)
    const hasEmail = /type\s*=\s*["']?email|name\s*=\s*["']?[^"'\s>]*email/i.test(f)
    const inputs = (f.match(/<input\b/gi) || []).length
    if (hasTextarea || hasTel || (hasEmail && inputs >= 3)) {
      contactForm = true
      if (QUOTE_TEXT.test(decode(f.replace(/<[^>]+>/g, ' '))) || /quote|estimate/i.test(f)) quoteForm = true
    } else if (hasEmail) newsletterOnly++
  }
  // Embedded form providers count as forms even when rendered by script.
  if (!contactForm && /(hsforms|jotform|typeform|gform_wrapper|wpcf7|wpforms|formspree|leadconnectorhq\.com\/widget\/form)/i.test(html)) contactForm = true
  s.contact_form = contactForm
  s.quote_form = quoteForm
  s.newsletter_forms = newsletterOnly
  s.forms_count = forms.length

  // Copyright year (outdated-site indicator only)
  const years = []
  const re = /(?:©|&copy;|&#169;|copyright)\s*(?:\d{4}\s*(?:-|–|&ndash;|to)\s*)?((?:19|20)\d{2})/gi
  let m
  while ((m = re.exec(html))) years.push(Number(m[1]))
  const nowYear = new Date().getUTCFullYear()
  const valid = years.filter((y) => y <= nowYear + 1 && y >= 1995)
  s.copyright_year = valid.length ? Math.max(...valid) : null

  s.img_count = (html.match(/<img\b/gi) || []).length
  s.img_missing_alt = (html.match(/<img\b(?![^>]*\balt\s*=)[^>]*>/gi) || []).length
  s.script_count = (html.match(/<script\b/gi) || []).length
  s.flash_or_frames = /<(frameset|embed[^>]+swf)/i.test(html)
  s.table_layout = (lower.match(/<table\b/g) || []).length >= 6 && !/display\s*:\s*(flex|grid)/i.test(html)
  return s
}

// ---------------------------------------------------------------------------
// Full analysis of one website
// ---------------------------------------------------------------------------

const SOCIAL_HOST_RE = /(^|\.)(facebook\.com|fb\.com|instagram\.com|linktr\.ee|linkedin\.com|tiktok\.com|twitter\.com|x\.com|youtube\.com)$/i

export async function analyzeWebsite(inputUrl, { slowMs = 3000 } = {}) {
  const analyzedAt = new Date().toISOString()
  let url = String(inputUrl || '').trim()
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`

  const result = {
    website_status: 'unreachable',
    mobile_status: 'unknown',
    booking_status: 'unknown',
    contact_form_status: 'unknown',
    technology_data: [],
    website_signals: {},
    error: null,
    analyzed_at: analyzedAt,
  }

  let origin
  try {
    const u = await assertPublicUrl(url)
    origin = u.origin
  } catch (e) {
    result.error = e.message
    return result
  }

  // robots.txt
  let robots = []
  let robotsState = 'unavailable'
  try {
    const r = await safeFetch(`${origin}/robots.txt`, { timeoutMs: 4000, maxBytes: 200_000, accept: 'text/plain,*/*' })
    if (r.ok && !/<html/i.test(r.body.slice(0, 500))) {
      robots = parseRobots(r.body)
      robotsState = 'found'
    }
  } catch {
    /* no robots.txt reachable: treat as allowed */
  }
  const startPath = new URL(url).pathname || '/'
  if (!robotsAllows(robots, startPath)) {
    result.website_status = 'blocked_robots'
    result.website_signals = { robots_txt: 'disallowed' }
    return result
  }

  // Homepage (try https first; fall back to http if TLS/connection fails)
  let page
  try {
    page = await safeFetch(url, { timeoutMs: 9000 })
  } catch (e) {
    if (url.startsWith('https://') && e.code !== 'blocked') {
      try {
        page = await safeFetch(url.replace(/^https:/, 'http:'), { timeoutMs: 7000 })
      } catch {
        result.error = e.message
        return result
      }
    } else {
      result.error = e.message
      return result
    }
  }

  const finalHost = new URL(page.url).hostname.replace(/^www\./, '')
  if (SOCIAL_HOST_RE.test(finalHost)) {
    result.website_status = 'social_only'
    result.website_signals = { final_url: page.url, robots_txt: robotsState }
    return result
  }
  if (!page.ok) {
    result.error = `HTTP ${page.status}`
    result.website_signals = { final_url: page.url, http_status: page.status, robots_txt: robotsState }
    return result
  }
  const ctype = page.headers['content-type'] || ''
  if (ctype && !/html|xml/i.test(ctype)) {
    result.error = `unexpected content type (${ctype.split(';')[0]})`
    return result
  }

  const signals = extractSignals(page.body, page.url)
  const tech = detectTechnologies(page.body)
  signals.final_url = page.url
  signals.http_status = page.status
  signals.https = page.url.startsWith('https://')
  signals.redirects = page.redirects.length
  signals.load_ms = page.ms
  signals.html_bytes = page.bytes
  signals.truncated = page.truncated
  signals.robots_txt = robotsState
  signals.server = (page.headers.server || '').slice(0, 60) || null

  // Sitemap page estimate (only if robots allows)
  const finalOrigin = new URL(page.url).origin
  if (robotsAllows(robots, '/sitemap.xml')) {
    try {
      const sm = await safeFetch(`${finalOrigin}/sitemap.xml`, { timeoutMs: 4000, maxBytes: 800_000, accept: 'application/xml,text/xml,*/*' })
      if (sm.ok && /<(urlset|sitemapindex)/i.test(sm.body)) {
        const locs = (sm.body.match(/<loc>/gi) || []).length
        signals.sitemap = /<sitemapindex/i.test(sm.body) ? { type: 'index', sitemaps: locs } : { type: 'urlset', urls: locs }
      }
    } catch {
      /* optional */
    }
  }
  signals.page_estimate = signals.sitemap?.type === 'urlset' ? signals.sitemap.urls : signals.internal_links + 1

  // Broken-link indicator: HEAD-check up to 4 robots-allowed internal links.
  const toCheck = signals.internal_paths.filter((p) => robotsAllows(robots, p)).slice(0, 4)
  if (toCheck.length) {
    const checks = await Promise.allSettled(
      toCheck.map(async (p) => {
        const target = new URL(p, finalOrigin).toString()
        let r = await safeFetch(target, { method: 'HEAD', timeoutMs: 4000 })
        if (r.status === 405 || r.status === 501) r = await safeFetch(target, { timeoutMs: 4000, maxBytes: 20_000 })
        return r.status
      }),
    )
    signals.links_checked = checks.length
    signals.broken_links = checks.filter((c) => c.status === 'fulfilled' && c.value >= 400).length
  }
  delete signals.internal_paths

  const bookingTools = tech.filter((t) => t.category === 'booking' || t.category === 'field_service')
  result.website_status = 'reachable'
  result.mobile_status = signals.viewport ? 'detected' : 'not_detected'
  result.booking_status = bookingTools.length || signals.booking_cta ? 'detected' : 'not_detected'
  result.contact_form_status = signals.contact_form ? 'detected' : 'not_detected'
  if (signals.booking_cta && !bookingTools.length) {
    tech.push({ name: 'Booking link', category: 'booking', evidence: `“${signals.booking_cta}” link` })
  }
  signals.slow = typeof signals.load_ms === 'number' ? signals.load_ms > slowMs : null
  result.technology_data = tech
  result.website_signals = signals
  return result
}

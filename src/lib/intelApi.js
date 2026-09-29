// Client for the Lead Intelligence API (POST /api/places).
// Admin calls carry the HMAC session token issued at login (stored inside the
// lithos_auth localStorage blob). No provider keys ever reach the browser.

function authToken() {
  try {
    const raw = localStorage.getItem('lithos_auth')
    if (!raw) return null
    return JSON.parse(raw)?.auth_token || null
  } catch {
    return null
  }
}

export async function intelApi(action, body = {}) {
  let res
  try {
    res = await fetch('/api/places', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-auth-token': authToken() || '' },
      body: JSON.stringify({ action, ...body }),
    })
  } catch {
    return { success: false, error: 'Network error. Check your connection and try again.' }
  }
  let data
  try {
    data = await res.json()
  } catch {
    data = null
  }
  if (!data) {
    return {
      success: false,
      error:
        res.status === 504
          ? 'The request took too long. Try fewer results or try again.'
          : 'Business discovery is temporarily unavailable. Please try again.',
    }
  }
  return { status: res.status, ...data }
}

const SYMBOL = { USD: '$', AWG: 'Afl. ' }

export function fmtMoney(n, currency = 'USD') {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return 'Not available'
  const v = Number(n).toLocaleString('en-US', { maximumFractionDigits: 0 })
  return SYMBOL[currency] ? `${SYMBOL[currency]}${v}` : `${currency} ${v}`
}

export function fmtRange(low, high, currency, openEnded) {
  if (low === null || low === undefined) return 'Not available'
  if (high === null || high === undefined || high === low) return `${fmtMoney(low, currency)}${openEnded ? '+' : ''}`
  return `${fmtMoney(low, currency)}–${fmtMoney(high, currency).replace(/^(\$|Afl\. |[A-Z]{3} )/, '')}${openEnded ? '+' : ''}`
}

export function fmtDateTime(d) {
  if (!d) return ''
  const x = new Date(d)
  return x.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
}

export function fmtDate(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

// Provider cost estimates (USD, cents precision).
export function fmtCost(n) {
  return `$${(Number(n) || 0).toFixed(2)}`
}

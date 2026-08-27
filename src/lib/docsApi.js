// Client helper for the Payments & Documents API (docs_* actions).
//
// Admin calls carry the HMAC session token issued at login (rep.auth_token,
// persisted inside the lithos_auth localStorage blob). Client-facing pages
// call the same endpoint with only their access token — no session needed.

function authToken() {
  try {
    const raw = localStorage.getItem('lithos_auth')
    if (!raw) return null
    return JSON.parse(raw)?.auth_token || null
  } catch {
    return null
  }
}

export async function docsApi(action, body = {}) {
  const res = await fetch('/api/workflow', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(authToken() ? { 'x-auth-token': authToken() } : {}),
    },
    body: JSON.stringify({ action, ...body }),
  })
  const data = await res.json().catch(() => ({}))
  if (res.status === 401 && data?.error === 'auth_required') {
    throw new Error('Your session needs a refresh — sign out and back in, then retry.')
  }
  return data
}

// URL that streams a client-facing PDF (token-scoped, safe to embed).
export const clientFileUrl = (token, kind = 'original') =>
  `/api/workflow?action=docs_client_file&token=${encodeURIComponent(token)}&kind=${kind}`

// Admin file fetch — needs the auth header, so fetch a blob and objectURL it.
export async function adminFileBlobUrl({ fileId, parentType, parentId, kind }) {
  const qs = new URLSearchParams({ action: 'docs_file_get' })
  if (fileId) qs.set('file_id', fileId)
  if (parentType) qs.set('parent_type', parentType)
  if (parentId) qs.set('parent_id', parentId)
  if (kind) qs.set('kind', kind)
  const res = await fetch(`/api/workflow?${qs}`, {
    headers: authToken() ? { 'x-auth-token': authToken() } : {},
  })
  if (!res.ok) throw new Error('File not found')
  return URL.createObjectURL(await res.blob())
}

export function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader()
    fr.onload = () => resolve(fr.result)
    fr.onerror = () => reject(new Error('Could not read file'))
    fr.readAsDataURL(file)
  })
}

export const fmtMoney = (amount, currency = 'AWG') =>
  `${currency} ${Number(amount || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`

export const fmtDate = (d) => (d ? new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '—')

// Public client-facing proposal page: /client/proposal/:token
// Read the PDF → sign electronically → confirmation. No CRM account needed.

import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { docsApi, clientFileUrl, fmtMoney, fmtDate } from '../lib/docsApi.js'
import PdfViewer from '../components/PdfViewer.jsx'
import SignaturePad from '../components/SignaturePad.jsx'
import { shellStyles as S, ClientHeader, ClientStateScreen, STATE_COPY } from '../components/ClientDocShell.jsx'

export default function ClientProposal() {
  const { token } = useParams()
  const [data, setData] = useState(null)
  const [state, setState] = useState('loading')

  const [form, setForm] = useState({ name: '', email: '', company: '' })
  const [signature, setSignature] = useState(null)
  const [confirming, setConfirming] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [justSigned, setJustSigned] = useState(false)

  const load = useCallback(async () => {
    try {
      const r = await docsApi('docs_client_view', { token })
      if (!r.success) {
        setState(r.state || 'error')
        return
      }
      setData(r)
      setState('ok')
    } catch {
      setState('error')
    }
  }, [token])

  useEffect(() => {
    load()
  }, [load])

  const onSignature = useCallback((img) => setSignature(img), [])

  if (state === 'loading') {
    return (
      <div style={S.page}>
        <ClientHeader kicker="Proposal" />
        <div style={{ ...S.container, paddingTop: 80, textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>
          Loading your proposal…
        </div>
      </div>
    )
  }
  if (state !== 'ok' && state !== 'expired') {
    const copy = STATE_COPY[state] || STATE_COPY.error
    return <ClientStateScreen title={copy.title} message={copy.message} />
  }

  const doc = data.doc
  const signed = doc.status === 'signed' || justSigned
  const expired = state === 'expired' && !signed

  async function submitSignature() {
    setSubmitting(true)
    setError('')
    try {
      const r = await docsApi('docs_client_sign', {
        token,
        name: form.name.trim(),
        email: form.email.trim(),
        company: form.company.trim(),
        signature_image: signature,
        consent: true,
      })
      if (r.success) {
        setJustSigned(true)
        setConfirming(false)
        window.scrollTo({ top: 0, behavior: 'smooth' })
        load()
      } else if (r.state === 'already_signed') {
        setJustSigned(true)
        setConfirming(false)
      } else {
        setError(r.error || 'Something went wrong — please try again.')
        setConfirming(false)
      }
    } catch {
      setError('Something went wrong — please try again.')
      setConfirming(false)
    }
    setSubmitting(false)
  }

  const canSign = form.name.trim() && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email.trim()) && signature

  return (
    <div style={S.page}>
      <ClientHeader kicker="Proposal" />
      <div style={{ ...S.container, paddingTop: 36 }}>
        {/* Title block */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 12, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)', marginBottom: 10 }}>
            {doc.number}
          </div>
          <h1 style={{ fontSize: 'clamp(24px, 5vw, 34px)', fontWeight: 750, letterSpacing: '-0.02em', margin: '0 0 16px' }}>
            {doc.title}
          </h1>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px 34px', fontSize: 14, color: 'rgba(255,255,255,0.65)' }}>
            {doc.client && (
              <span>
                Prepared for <b style={{ color: '#fff' }}>{doc.client.company_name}</b>
              </span>
            )}
            <span>
              Prepared by <b style={{ color: '#fff' }}>{data.business?.name || 'Lithos Labs'}</b>
            </span>
            {doc.amount > 0 && (
              <span>
                Amount <b style={{ color: '#fff' }}>{fmtMoney(doc.amount, doc.currency)}</b>
              </span>
            )}
            {doc.expires_at && !signed && (
              <span>
                Valid until <b style={{ color: '#fff' }}>{fmtDate(doc.expires_at)}</b>
              </span>
            )}
          </div>
        </div>

        {/* Signed banner */}
        {signed && (
          <div
            style={{
              ...S.card,
              borderColor: 'rgba(255,255,255,0.35)',
              marginBottom: 24,
              display: 'flex',
              alignItems: 'center',
              gap: 14,
            }}
          >
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: '50%',
                border: '1.5px solid #fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 18,
                flexShrink: 0,
              }}
            >
              ✓
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16 }}>Proposal Signed</div>
              <div style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.55)', marginTop: 3 }}>
                {data.signature
                  ? `Signed by ${data.signature.signer_name} on ${fmtDate(data.signature.signed_at)}`
                  : 'Thank you — Lithos Labs has been notified.'}
              </div>
            </div>
          </div>
        )}
        {expired && (
          <div style={{ ...S.card, marginBottom: 24, color: 'rgba(255,255,255,0.7)', fontSize: 14 }}>
            This proposal's validity window has passed. You can still read it below — contact Lithos Labs for an
            updated version.
          </div>
        )}

        {/* PDF */}
        {data.has_original ? (
          <PdfViewer url={clientFileUrl(token, signed && data.has_signed ? 'signed' : 'original')} />
        ) : (
          <div style={{ ...S.card, textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>
            The proposal document is being prepared.
          </div>
        )}

        {/* Signature section */}
        {!signed && !expired && (
          <div style={{ ...S.card, marginTop: 30 }}>
            <h2 style={{ fontSize: 19, fontWeight: 700, margin: '0 0 6px' }}>Approval &amp; Signature</h2>
            <p style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.55)', lineHeight: 1.6, margin: '0 0 22px' }}>
              By signing below, I acknowledge that I have reviewed and agree to the terms outlined in this proposal.
            </p>

            <div style={{ display: 'grid', gap: 16 }}>
              <div>
                <label style={S.label}>Full name</label>
                <input
                  style={S.input}
                  value={form.name}
                  autoComplete="name"
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div>
                <label style={S.label}>Email</label>
                <input
                  style={S.input}
                  type="email"
                  autoComplete="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
              <div>
                <label style={S.label}>Company</label>
                <input
                  style={S.input}
                  autoComplete="organization"
                  value={form.company}
                  onChange={(e) => setForm({ ...form, company: e.target.value })}
                />
              </div>
              <div>
                <label style={S.label}>Signature</label>
                <SignaturePad onChange={onSignature} />
              </div>

              {error && <div style={{ color: '#ff6b6b', fontSize: 14 }}>{error}</div>}

              {!confirming ? (
                <button
                  style={{ ...S.primaryBtn, opacity: canSign ? 1 : 0.4, cursor: canSign ? 'pointer' : 'default' }}
                  disabled={!canSign}
                  onClick={() => setConfirming(true)}
                >
                  Sign Proposal
                </button>
              ) : (
                <div style={{ border: '1px solid rgba(255,255,255,0.25)', borderRadius: 12, padding: 18 }}>
                  <p style={{ fontSize: 14, lineHeight: 1.6, color: 'rgba(255,255,255,0.75)', margin: '0 0 16px' }}>
                    By clicking <b style={{ color: '#fff' }}>"Confirm &amp; Sign"</b>, you confirm that you are signing
                    this proposal electronically as <b style={{ color: '#fff' }}>{form.name.trim()}</b>.
                  </p>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <button style={{ ...S.primaryBtn, width: 'auto', padding: '14px 28px' }} disabled={submitting} onClick={submitSignature}>
                      {submitting ? 'Signing…' : 'Confirm & Sign'}
                    </button>
                    <button
                      style={{
                        background: 'transparent',
                        color: 'rgba(255,255,255,0.7)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        borderRadius: 999,
                        padding: '14px 24px',
                        fontSize: 15,
                        cursor: 'pointer',
                      }}
                      disabled={submitting}
                      onClick={() => setConfirming(false)}
                    >
                      Go back
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <div style={{ marginTop: 40, textAlign: 'center', fontSize: 12.5, color: 'rgba(255,255,255,0.35)' }}>
          Lithos Labs · Aruba · This is a secure document page — the link is unique to you.
        </div>
      </div>
    </div>
  )
}

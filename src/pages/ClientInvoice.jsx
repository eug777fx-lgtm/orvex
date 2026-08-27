// Public client-facing invoice page: /client/invoice/:token
// Shows the invoice PDF + the right payment path:
//   Aruba  → configured bank details + "I've Paid" report flow
//   US     → Stripe Checkout
// Payment truth is always server-side (Stripe webhook / admin confirmation).

import { useCallback, useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { docsApi, clientFileUrl, readFileAsBase64, fmtMoney, fmtDate } from '../lib/docsApi.js'
import PdfViewer from '../components/PdfViewer.jsx'
import { shellStyles as S, ClientHeader, ClientStateScreen, STATE_COPY } from '../components/ClientDocShell.jsx'

export default function ClientInvoice() {
  const { token } = useParams()
  const [params] = useSearchParams()
  const [data, setData] = useState(null)
  const [state, setState] = useState('loading')

  const [reporting, setReporting] = useState(false)
  const [report, setReport] = useState({ name: '', email: '', paid_date: '', amount: '', reference: '' })
  const [receipt, setReceipt] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [justReported, setJustReported] = useState(false)
  const [stripeLoading, setStripeLoading] = useState(false)

  const load = useCallback(async () => {
    try {
      const r = await docsApi('docs_client_view', { token })
      if (!r.success) {
        setState(r.state || 'error')
        return
      }
      setData(r)
      setState('ok')
      if (r.doc) setReport((prev) => ({ ...prev, amount: prev.amount || String(r.doc.amount || '') }))
    } catch {
      setState('error')
    }
  }, [token])

  useEffect(() => {
    load()
  }, [load])

  // After returning from Stripe (?paid=1) poll a few times while the webhook lands.
  useEffect(() => {
    if (params.get('paid') !== '1') return
    let n = 0
    const t = setInterval(() => {
      n += 1
      load()
      if (n >= 6) clearInterval(t)
    }, 2500)
    return () => clearInterval(t)
  }, [params, load])

  if (state === 'loading') {
    return (
      <div style={S.page}>
        <ClientHeader kicker="Invoice" />
        <div style={{ ...S.container, paddingTop: 80, textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>
          Loading your invoice…
        </div>
      </div>
    )
  }
  if (state !== 'ok') {
    const copy = STATE_COPY[state] || STATE_COPY.error
    return <ClientStateScreen title={copy.title} message={copy.message} />
  }

  const doc = data.doc
  const paid = doc.status === 'paid'
  const reported = doc.status === 'payment_reported' || justReported
  const overdue = !paid && doc.due_date && new Date(doc.due_date) < new Date()
  const method = data.payment?.method || 'bank_transfer'
  const bank = data.payment?.bank || {}
  const processingStripe = params.get('paid') === '1' && !paid

  async function submitReport() {
    setSubmitting(true)
    setError('')
    try {
      let receipt_base64 = null
      if (receipt) {
        if (receipt.size > 2 * 1024 * 1024) throw new Error('Receipt image must be under 2MB')
        receipt_base64 = await readFileAsBase64(receipt)
      }
      const r = await docsApi('docs_client_report_payment', {
        token,
        name: report.name.trim(),
        email: report.email.trim(),
        paid_date: report.paid_date || null,
        amount: Number(report.amount) || 0,
        reference: report.reference.trim(),
        receipt_base64,
      })
      if (r.success) {
        setJustReported(true)
        setReporting(false)
        window.scrollTo({ top: 0, behavior: 'smooth' })
        load()
      } else {
        setError(r.error || 'Something went wrong — please try again.')
      }
    } catch (e) {
      setError(e.message || 'Something went wrong — please try again.')
    }
    setSubmitting(false)
  }

  async function payWithStripe() {
    setStripeLoading(true)
    setError('')
    try {
      const r = await docsApi('docs_client_stripe_checkout', { token })
      if (r.success && r.checkout_url) {
        window.location.href = r.checkout_url
        return
      }
      setError(r.error || 'Card payment is unavailable right now — please contact Lithos Labs.')
    } catch {
      setError('Card payment is unavailable right now — please contact Lithos Labs.')
    }
    setStripeLoading(false)
  }

  const bankRow = (label, value) =>
    value ? (
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>{label}</span>
        <span style={{ fontSize: 14, fontWeight: 600, textAlign: 'right', wordBreak: 'break-word' }}>{value}</span>
      </div>
    ) : null

  const canReport = report.name.trim() && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(report.email.trim()) && Number(report.amount) > 0

  return (
    <div style={S.page}>
      <ClientHeader kicker="Invoice" />
      <div style={{ ...S.container, paddingTop: 36 }}>
        {/* Title block */}
        <div style={{ marginBottom: 26 }}>
          <div style={{ fontSize: 12, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)', marginBottom: 10 }}>
            Invoice {doc.number}
          </div>
          <h1 style={{ fontSize: 'clamp(24px, 5vw, 34px)', fontWeight: 750, letterSpacing: '-0.02em', margin: '0 0 16px' }}>
            {doc.project_name || 'Lithos Labs Services'}
          </h1>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px 34px', fontSize: 14, color: 'rgba(255,255,255,0.65)' }}>
            {doc.client && (
              <span>
                Billed to <b style={{ color: '#fff' }}>{doc.client.company_name}</b>
              </span>
            )}
            <span>
              Amount due <b style={{ color: '#fff' }}>{fmtMoney(doc.amount, doc.currency)}</b>
            </span>
            {doc.due_date && (
              <span>
                Due <b style={{ color: overdue ? '#ff6b6b' : '#fff' }}>{fmtDate(doc.due_date)}</b>
              </span>
            )}
          </div>
        </div>

        {/* Status banners */}
        {paid && (
          <div style={{ ...S.card, borderColor: 'rgba(255,255,255,0.35)', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 38, height: 38, borderRadius: '50%', border: '1.5px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>✓</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16 }}>Paid — thank you!</div>
              <div style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.55)', marginTop: 3 }}>
                {doc.paid_at ? `Payment received on ${fmtDate(doc.paid_at)}.` : 'Payment received.'}
              </div>
            </div>
          </div>
        )}
        {!paid && processingStripe && (
          <div style={{ ...S.card, marginBottom: 24, fontSize: 14, color: 'rgba(255,255,255,0.75)' }}>
            Payment received — we're confirming it with our payment provider. This page will update automatically.
          </div>
        )}
        {!paid && reported && !processingStripe && (
          <div style={{ ...S.card, marginBottom: 24, fontSize: 14, color: 'rgba(255,255,255,0.75)' }}>
            Your payment confirmation was submitted. Lithos Labs will verify the transfer and mark this invoice as
            paid — you'll be able to see the updated status here.
          </div>
        )}
        {!paid && !reported && overdue && (
          <div style={{ ...S.card, marginBottom: 24, borderColor: 'rgba(255,107,107,0.4)', fontSize: 14, color: 'rgba(255,255,255,0.75)' }}>
            This invoice is past its due date.
          </div>
        )}

        {/* PDF */}
        {data.has_original && <PdfViewer url={clientFileUrl(token, 'original')} style={{ marginBottom: 30 }} />}

        {/* Payment section */}
        {!paid && (
          <div style={S.card}>
            <h2 style={{ fontSize: 19, fontWeight: 700, margin: '0 0 18px' }}>Payment</h2>

            {method === 'stripe' && (
              <div>
                <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6, margin: '0 0 18px' }}>
                  Pay securely by card. You'll be taken to our payment partner Stripe to complete the payment.
                </p>
                <button style={S.primaryBtn} disabled={stripeLoading} onClick={payWithStripe}>
                  {stripeLoading ? 'Opening secure checkout…' : `Pay Invoice — ${fmtMoney(doc.amount, doc.currency)}`}
                </button>
              </div>
            )}

            {method !== 'stripe' && (
              <div>
                <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6, margin: '0 0 14px' }}>
                  Please transfer the invoice amount to the bank account below
                  {bank.reference_note ? '' : `, using ${doc.number} as the payment reference`}.
                </p>
                <div style={{ marginBottom: 20 }}>
                  {bankRow('Bank', bank.bank_name)}
                  {bankRow('Account holder', bank.account_name)}
                  {bankRow('Account number', bank.account_number)}
                  {bankRow('IBAN', bank.iban)}
                  {bankRow('SWIFT / BIC', bank.swift)}
                  {bankRow('Currency', bank.currency || doc.currency)}
                  {bankRow('Reference', bank.reference_note || doc.number)}
                  {!bank.bank_name && !bank.account_number && (
                    <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', padding: '8px 0' }}>
                      Bank details will be shared by Lithos Labs directly.
                    </div>
                  )}
                </div>
                {bank.instructions && (
                  <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6, margin: '0 0 18px' }}>{bank.instructions}</p>
                )}

                {!reported && !reporting && (
                  <button style={S.primaryBtn} onClick={() => setReporting(true)}>
                    I've Paid
                  </button>
                )}

                {reporting && !reported && (
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.12)', paddingTop: 20, marginTop: 4 }}>
                    <div style={{ fontSize: 15, fontWeight: 650, marginBottom: 14 }}>Confirm your payment</div>
                    <div style={{ display: 'grid', gap: 14 }}>
                      <div>
                        <label style={S.label}>Your name</label>
                        <input style={S.input} autoComplete="name" value={report.name} onChange={(e) => setReport({ ...report, name: e.target.value })} />
                      </div>
                      <div>
                        <label style={S.label}>Email</label>
                        <input style={S.input} type="email" autoComplete="email" value={report.email} onChange={(e) => setReport({ ...report, email: e.target.value })} />
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                        <div>
                          <label style={S.label}>Payment date</label>
                          <input style={S.input} type="date" value={report.paid_date} onChange={(e) => setReport({ ...report, paid_date: e.target.value })} />
                        </div>
                        <div>
                          <label style={S.label}>Amount paid</label>
                          <input style={S.input} type="number" inputMode="decimal" value={report.amount} onChange={(e) => setReport({ ...report, amount: e.target.value })} />
                        </div>
                      </div>
                      <div>
                        <label style={S.label}>Transaction / reference number (optional)</label>
                        <input style={S.input} value={report.reference} onChange={(e) => setReport({ ...report, reference: e.target.value })} />
                      </div>
                      <div>
                        <label style={S.label}>Payment receipt (optional, PNG/JPG)</label>
                        <input
                          type="file"
                          accept="image/png,image/jpeg"
                          onChange={(e) => setReceipt(e.target.files?.[0] || null)}
                          style={{ ...S.input, padding: '11px 15px' }}
                        />
                      </div>
                      {error && <div style={{ color: '#ff6b6b', fontSize: 14 }}>{error}</div>}
                      <button
                        style={{ ...S.primaryBtn, opacity: canReport ? 1 : 0.4, cursor: canReport ? 'pointer' : 'default' }}
                        disabled={!canReport || submitting}
                        onClick={submitReport}
                      >
                        {submitting ? 'Submitting…' : 'Submit Payment Confirmation'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
            {method === 'stripe' && error && <div style={{ color: '#ff6b6b', fontSize: 14, marginTop: 14 }}>{error}</div>}
          </div>
        )}

        <div style={{ marginTop: 40, textAlign: 'center', fontSize: 12.5, color: 'rgba(255,255,255,0.35)' }}>
          Lithos Labs · Aruba · This is a secure document page — the link is unique to you.
        </div>
      </div>
    </div>
  )
}

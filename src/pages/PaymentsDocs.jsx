// Payments & Documents — admin section.
// Overview · Proposals · Invoices · Payments · Settings
// Workflow: Client → Proposal → Signature → Signed PDF → Invoice → Payment → Paid

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  FileSignature,
  Receipt,
  CreditCard,
  LayoutDashboard,
  Settings as SettingsIcon,
  Plus,
  Link2,
  Send,
  Eye,
  Download,
  Ban,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Upload,
  Clock,
  X,
} from 'lucide-react'
import PageShell from '../components/PageShell'
import { COLORS } from '../theme.js'
import { docsApi, adminFileBlobUrl, readFileAsBase64, fmtMoney, fmtDate } from '../lib/docsApi.js'

// ---------------------------------------------------------------------------
// Shared styles (match the existing CRM design system)
// ---------------------------------------------------------------------------

const card = {
  background: COLORS.BG_CARD,
  border: `1px solid ${COLORS.BORDER_PRIMARY}`,
  borderRadius: 14,
  padding: 20,
}

const inp = {
  width: '100%',
  padding: '11px 13px',
  borderRadius: 10,
  border: `1px solid ${COLORS.BORDER_PRIMARY}`,
  background: COLORS.BG_INPUT,
  color: COLORS.TEXT_PRIMARY,
  fontSize: 14,
  outline: 'none',
  boxSizing: 'border-box',
}

const lbl = {
  display: 'block',
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: COLORS.TEXT_TERTIARY,
  marginBottom: 6,
}

const btn = (primary) => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 7,
  padding: '9px 16px',
  borderRadius: 999,
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
  border: primary ? 'none' : `1px solid ${COLORS.BORDER_SECONDARY}`,
  background: primary ? COLORS.ACCENT_PRIMARY : 'transparent',
  color: primary ? '#000' : COLORS.TEXT_SECONDARY,
})

const STATUS_LABELS = {
  draft: 'Draft',
  sent: 'Sent',
  viewed: 'Viewed',
  awaiting_signature: 'Awaiting Signature',
  signed: 'Signed',
  rejected: 'Rejected',
  expired: 'Expired',
  cancelled: 'Cancelled',
  payment_pending: 'Payment Pending',
  payment_reported: 'Payment Reported',
  paid: 'Paid',
  partially_paid: 'Partially Paid',
  overdue: 'Overdue',
}

function StatusPill({ status, strong }) {
  const label = STATUS_LABELS[status] || status
  const emphasis = ['signed', 'paid'].includes(status)
  const warn = ['payment_reported', 'overdue', 'expired'].includes(status)
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '4px 11px',
        borderRadius: 999,
        fontSize: 11.5,
        fontWeight: 650,
        letterSpacing: '0.03em',
        border: `1px solid ${emphasis ? '#fff' : warn ? 'rgba(255,255,255,0.45)' : COLORS.BORDER_SECONDARY}`,
        background: emphasis && strong ? '#fff' : 'transparent',
        color: emphasis && strong ? '#000' : emphasis ? '#fff' : warn ? 'rgba(255,255,255,0.85)' : COLORS.TEXT_SECONDARY,
      }}
    >
      {label}
    </span>
  )
}

function useToast() {
  const [toast, setToast] = useState(null)
  const show = useCallback((msg, isError) => {
    setToast({ msg, isError })
    setTimeout(() => setToast(null), 3500)
  }, [])
  const node = toast ? (
    <div
      style={{
        position: 'fixed',
        bottom: 24,
        left: '50%',
        transform: 'translateX(-50%)',
        background: toast.isError ? '#2a0d0d' : '#1a1a1a',
        border: `1px solid ${toast.isError ? '#803333' : '#3a3a3a'}`,
        color: '#fff',
        padding: '11px 20px',
        borderRadius: 999,
        fontSize: 13.5,
        zIndex: 300,
        maxWidth: '90vw',
      }}
    >
      {toast.msg}
    </div>
  ) : null
  return { show, node }
}

function Modal({ title, onClose, children, wide }) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.75)',
        zIndex: 200,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '5vh 16px',
        overflowY: 'auto',
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div style={{ ...card, width: '100%', maxWidth: wide ? 760 : 520, background: '#0d0d0d' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#fff' }}>{title}</h3>
          <button style={{ background: 'none', border: 'none', color: COLORS.TEXT_TERTIARY, cursor: 'pointer' }} onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

function PdfDrop({ onFile, current }) {
  const [drag, setDrag] = useState(false)
  const handle = (file) => {
    if (!file) return
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      onFile(null, 'Only PDF files are supported')
      return
    }
    if (file.size > 4 * 1024 * 1024) {
      onFile(null, 'PDF must be under 4MB')
      return
    }
    onFile(file, null)
  }
  return (
    <label
      onDragOver={(e) => {
        e.preventDefault()
        setDrag(true)
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDrag(false)
        handle(e.dataTransfer.files?.[0])
      }}
      style={{
        display: 'block',
        border: `1.5px dashed ${drag ? '#fff' : COLORS.BORDER_SECONDARY}`,
        borderRadius: 12,
        padding: '26px 16px',
        textAlign: 'center',
        cursor: 'pointer',
        background: drag ? 'rgba(255,255,255,0.04)' : 'transparent',
      }}
    >
      <input type="file" accept="application/pdf" style={{ display: 'none' }} onChange={(e) => handle(e.target.files?.[0])} />
      <Upload size={20} style={{ color: COLORS.TEXT_TERTIARY, marginBottom: 8 }} />
      <div style={{ fontSize: 13.5, color: COLORS.TEXT_SECONDARY }}>
        {current ? (
          <>
            <b style={{ color: '#fff' }}>{current.name}</b> · {(current.size / 1024).toFixed(0)} KB — click or drop to replace
          </>
        ) : (
          <>
            <b style={{ color: '#fff' }}>Drag &amp; drop your PDF</b> or click to choose
          </>
        )}
      </div>
    </label>
  )
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

const TABS = [
  { key: 'overview', label: 'Overview', icon: LayoutDashboard },
  { key: 'proposals', label: 'Proposals', icon: FileSignature },
  { key: 'invoices', label: 'Invoices', icon: Receipt },
  { key: 'payments', label: 'Payments', icon: CreditCard },
  { key: 'settings', label: 'Settings', icon: SettingsIcon },
]

export default function PaymentsDocs() {
  const [tab, setTab] = useState('overview')
  const [boot, setBoot] = useState(null)
  const [bootError, setBootError] = useState('')
  const toast = useToast()

  const reloadBoot = useCallback(async () => {
    try {
      const r = await docsApi('docs_bootstrap')
      if (r.success) {
        setBoot(r)
        setBootError('')
      } else setBootError(r.message || r.error || 'Failed to load')
    } catch (e) {
      setBootError(e.message)
    }
  }, [])

  useEffect(() => {
    reloadBoot()
  }, [reloadBoot])

  return (
    <PageShell style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 750, color: '#fff', letterSpacing: '-0.02em' }}>
            Payments &amp; Documents
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: COLORS.TEXT_TERTIARY }}>
            Client → Proposal → Signature → Invoice → Payment
          </p>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {TABS.map((t) => {
            const Icon = t.icon
            const active = tab === t.key
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                style={{
                  ...btn(active),
                  background: active ? '#fff' : 'transparent',
                  color: active ? '#000' : COLORS.TEXT_SECONDARY,
                }}
              >
                <Icon size={14} /> {t.label}
              </button>
            )
          })}
        </div>
      </div>

      {bootError && (
        <div style={{ ...card, borderColor: '#803333', color: '#ffb3b3', fontSize: 13.5 }}>{bootError}</div>
      )}

      {tab === 'overview' && <OverviewTab toast={toast} />}
      {tab === 'proposals' && boot && <ProposalsTab boot={boot} toast={toast} />}
      {tab === 'invoices' && boot && <InvoicesTab boot={boot} toast={toast} />}
      {tab === 'payments' && <PaymentsTab toast={toast} />}
      {tab === 'settings' && boot && <SettingsTab boot={boot} reload={reloadBoot} toast={toast} />}

      {toast.node}
    </PageShell>
  )
}

// ---------------------------------------------------------------------------
// Overview
// ---------------------------------------------------------------------------

const EVENT_COPY = {
  proposal_created: 'Proposal created',
  proposal_edited: 'Proposal edited',
  proposal_uploaded: 'Proposal PDF uploaded',
  proposal_sent: 'Proposal sent',
  proposal_viewed: 'Proposal viewed',
  proposal_signed: 'Proposal signed ✍️',
  invoice_created: 'Invoice created',
  invoice_uploaded: 'Invoice PDF uploaded',
  invoice_sent: 'Invoice sent',
  invoice_viewed: 'Invoice viewed',
  payment_checkout_created: 'Stripe checkout opened',
  payment_succeeded: 'Stripe payment received 🎉',
  payment_failed: 'Stripe payment failed',
  payment_reported: 'Bank payment reported 🔔',
  payment_confirmed: 'Payment confirmed ✓',
  payment_rejected: 'Payment report rejected',
  invoice_refunded: 'Payment refunded',
  link_created: 'Client link created',
  link_revoked: 'Client link revoked',
  signed_pdf_failed: 'Signed PDF generation failed',
  settings_updated: 'Settings updated',
  email_failed: 'Email failed to send',
  email_skipped: 'Email skipped (no provider)',
}

function OverviewTab({ toast }) {
  const [data, setData] = useState(null)
  const load = useCallback(async () => {
    const r = await docsApi('docs_metrics')
    if (r.success) setData(r)
  }, [])
  useEffect(() => {
    load()
  }, [load])

  if (!data) return <div style={{ color: COLORS.TEXT_TERTIARY, fontSize: 14 }}>Loading…</div>

  const count = (list, ...statuses) =>
    (list || []).filter((r) => statuses.includes(r.status)).reduce((a, r) => a + Number(r.n), 0)

  const stat = (label, value, sub) => (
    <div style={{ ...card, flex: 1, minWidth: 150 }}>
      <div style={{ fontSize: 11.5, letterSpacing: '0.08em', textTransform: 'uppercase', color: COLORS.TEXT_TERTIARY, marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 750, color: '#fff', letterSpacing: '-0.02em' }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: COLORS.TEXT_TERTIARY, marginTop: 4 }}>{sub}</div>}
    </div>
  )

  async function confirmPayment(p, ok) {
    const r = await docsApi(ok ? 'docs_payment_confirm' : 'docs_payment_reject', {
      payment_id: p.id,
      email_client: ok,
      reason: ok ? undefined : 'Transfer not found — please verify',
    })
    if (r.success) {
      toast.show(ok ? 'Payment confirmed — invoice marked Paid' : 'Payment report rejected')
      load()
    } else toast.show(r.error || 'Failed', true)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Reported payments needing action */}
      {data.reported_payments?.length > 0 && (
        <div style={{ ...card, borderColor: 'rgba(255,255,255,0.4)' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 14 }}>
            🔔 Payments reported — waiting for your confirmation
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {data.reported_payments.map((p) => (
              <div key={p.id} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12, padding: '12px 14px', background: COLORS.BG_ELEVATED, borderRadius: 10 }}>
                <div style={{ flex: 1, minWidth: 220 }}>
                  <div style={{ fontSize: 14, color: '#fff', fontWeight: 600 }}>
                    {p.company_name || p.reporter_name} — {fmtMoney(p.amount, p.currency)}
                  </div>
                  <div style={{ fontSize: 12.5, color: COLORS.TEXT_TERTIARY, marginTop: 3 }}>
                    Invoice {p.invoice_number} · reported {fmtDate(p.created_at)}
                    {p.reference ? ` · ref ${p.reference}` : ''}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button style={btn(true)} onClick={() => confirmPayment(p, true)}>
                    <CheckCircle2 size={14} /> Confirm Payment
                  </button>
                  <button style={btn(false)} onClick={() => confirmPayment(p, false)}>
                    <XCircle size={14} /> Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14 }}>
        {stat('Awaiting signature', count(data.proposals, 'sent', 'viewed', 'awaiting_signature'))}
        {stat('Signed proposals', count(data.proposals, 'signed'))}
        {stat('Outstanding', fmtMoney(data.revenue?.outstanding))}
        {stat('Overdue', fmtMoney(data.revenue?.overdue))}
        {stat('Paid this month', fmtMoney(data.revenue?.paid_month))}
      </div>

      <div style={card}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 14 }}>Recent activity</div>
        {data.activity?.length ? (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {data.activity.map((e) => (
              <div key={e.id} style={{ display: 'flex', gap: 12, alignItems: 'baseline', padding: '9px 0', borderBottom: `1px solid ${COLORS.BORDER_SUBTLE}` }}>
                <span style={{ fontSize: 12, color: COLORS.TEXT_TERTIARY, whiteSpace: 'nowrap' }}>
                  {new Date(e.created_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
                <span style={{ fontSize: 13.5, color: COLORS.TEXT_SECONDARY }}>
                  {EVENT_COPY[e.event] || e.event}
                  {e.company_name ? ` — ${e.company_name}` : ''}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ fontSize: 13.5, color: COLORS.TEXT_TERTIARY }}>No activity yet — create your first proposal.</div>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Proposals
// ---------------------------------------------------------------------------

function ProposalsTab({ boot, toast }) {
  const [list, setList] = useState(null)
  const [q, setQ] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [creating, setCreating] = useState(false)
  const [detail, setDetail] = useState(null)

  const load = useCallback(async () => {
    const r = await docsApi('docs_proposals_list')
    if (r.success) setList(r.proposals)
  }, [])
  useEffect(() => {
    load()
  }, [load])

  const filtered = useMemo(() => {
    let out = list || []
    if (statusFilter) out = out.filter((p) => p.status === statusFilter)
    if (q.trim()) {
      const needle = q.toLowerCase()
      out = out.filter((p) =>
        [p.number, p.title, p.project_name, p.company_name, p.contact_name].join(' ').toLowerCase().includes(needle),
      )
    }
    return out
  }, [list, q, statusFilter])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        <input style={{ ...inp, maxWidth: 280 }} placeholder="Search proposals…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select style={{ ...inp, maxWidth: 200 }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All statuses</option>
          {['draft', 'sent', 'viewed', 'signed', 'rejected', 'expired', 'cancelled'].map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
        <button style={{ ...btn(true), marginLeft: 'auto' }} onClick={() => setCreating(true)}>
          <Plus size={14} /> New Proposal
        </button>
      </div>

      {!list ? (
        <div style={{ color: COLORS.TEXT_TERTIARY, fontSize: 14 }}>Loading…</div>
      ) : filtered.length === 0 ? (
        <div style={{ ...card, textAlign: 'center', color: COLORS.TEXT_TERTIARY, fontSize: 14, padding: 40 }}>
          No proposals yet. Create one, drop in your PDF, and send the client link.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map((p) => (
            <div
              key={p.id}
              onClick={() => setDetail(p)}
              style={{ ...card, cursor: 'pointer', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 14 }}
            >
              <div style={{ flex: 1, minWidth: 230 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 12.5, color: COLORS.TEXT_TERTIARY, fontFamily: 'monospace' }}>{p.number}</span>
                  <StatusPill status={p.status} strong />
                </div>
                <div style={{ fontSize: 15, fontWeight: 650, color: '#fff', marginTop: 6 }}>{p.title}</div>
                <div style={{ fontSize: 12.5, color: COLORS.TEXT_TERTIARY, marginTop: 3 }}>
                  {p.company_name || 'No client'} · {fmtMoney(p.amount, p.currency)} · created {fmtDate(p.created_at)}
                  {p.last_viewed_at ? ` · viewed ${fmtDate(p.last_viewed_at)}` : ''}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 12, color: COLORS.TEXT_TERTIARY }}>
                {p.has_original ? <span title="PDF uploaded">📄</span> : <span style={{ opacity: 0.4 }}>no PDF</span>}
                {p.signer_name && <span>✍️ {p.signer_name}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {creating && (
        <CreateProposalModal
          clients={boot.clients}
          onClose={() => setCreating(false)}
          onCreated={(p) => {
            setCreating(false)
            load()
            setDetail(p)
            toast.show(`Proposal ${p.number} created`)
          }}
        />
      )}
      {detail && (
        <ProposalDetailModal
          proposal={(list || []).find((x) => x.id === detail.id) || detail}
          toast={toast}
          onClose={() => setDetail(null)}
          reload={load}
        />
      )}
    </div>
  )
}

function CreateProposalModal({ clients, onClose, onCreated }) {
  const [f, setF] = useState({ client_id: '', title: '', project_name: '', amount: '', currency: 'AWG', expires_at: '', notes: '' })
  const [file, setFile] = useState(null)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  async function create() {
    if (!f.client_id || !f.title.trim()) {
      setErr('Client and title are required')
      return
    }
    setBusy(true)
    setErr('')
    try {
      const r = await docsApi('docs_proposal_create', {
        ...f,
        amount: Number(f.amount) || 0,
        expires_at: f.expires_at || null,
      })
      if (!r.success) throw new Error(r.error || 'Failed to create proposal')
      if (file) {
        const data_base64 = await readFileAsBase64(file)
        const up = await docsApi('docs_upload_file', {
          parent_type: 'proposal',
          parent_id: r.proposal.id,
          filename: file.name,
          data_base64,
        })
        if (!up.success) throw new Error(up.error || 'PDF upload failed')
      }
      onCreated(r.proposal)
    } catch (e) {
      setErr(e.message)
      setBusy(false)
    }
  }

  return (
    <Modal title="New Proposal" onClose={onClose}>
      <div style={{ display: 'grid', gap: 14 }}>
        <div>
          <label style={lbl}>Client</label>
          <select style={inp} value={f.client_id} onChange={(e) => setF({ ...f, client_id: e.target.value })}>
            <option value="">Select a client…</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.company_name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label style={lbl}>Proposal title</label>
          <input style={inp} placeholder="Website Development Proposal — ABC Company" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={lbl}>Project name</label>
            <input style={inp} value={f.project_name} onChange={(e) => setF({ ...f, project_name: e.target.value })} />
          </div>
          <div>
            <label style={lbl}>Expiration date</label>
            <input style={inp} type="date" value={f.expires_at} onChange={(e) => setF({ ...f, expires_at: e.target.value })} />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
          <div>
            <label style={lbl}>Total amount</label>
            <input style={inp} type="number" inputMode="decimal" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} />
          </div>
          <div>
            <label style={lbl}>Currency</label>
            <select style={inp} value={f.currency} onChange={(e) => setF({ ...f, currency: e.target.value })}>
              {['AWG', 'USD', 'EUR'].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label style={lbl}>Notes (internal)</label>
          <textarea style={{ ...inp, minHeight: 70, resize: 'vertical' }} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} />
        </div>
        <div>
          <label style={lbl}>Proposal PDF</label>
          <PdfDrop current={file} onFile={(fl, e) => (e ? setErr(e) : (setFile(fl), setErr('')))} />
        </div>
        {err && <div style={{ color: '#ff8a8a', fontSize: 13 }}>{err}</div>}
        <button style={{ ...btn(true), justifyContent: 'center', padding: '13px 0' }} disabled={busy} onClick={create}>
          {busy ? 'Creating…' : 'Create Proposal'}
        </button>
      </div>
    </Modal>
  )
}

function LinkControls({ parentType, parent, toast, reload }) {
  const [busy, setBusy] = useState(false)
  const hasLink = parent.token && !parent.token_revoked
  const url = hasLink ? `${window.location.origin}/client/${parentType}/${parent.token}` : null

  async function createLink() {
    setBusy(true)
    const r = await docsApi('docs_link_create', { parent_type: parentType, parent_id: parent.id })
    setBusy(false)
    if (r.success) {
      try {
        await navigator.clipboard.writeText(r.url)
        toast.show('Client link created and copied to clipboard')
      } catch {
        toast.show('Client link created')
      }
      reload()
    } else toast.show(r.error || 'Failed to create link', true)
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(url)
      toast.show('Client link copied')
    } catch {
      toast.show(url)
    }
  }

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
      {hasLink ? (
        <>
          <button style={btn(true)} onClick={copy}>
            <Link2 size={14} /> Copy Client Link
          </button>
          <a href={url} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
            <button style={btn(false)}>
              <Eye size={14} /> Open
            </button>
          </a>
          <button style={btn(false)} onClick={createLink} disabled={busy} title="Old link stops working">
            <RefreshCw size={14} /> Regenerate
          </button>
          <button
            style={btn(false)}
            onClick={async () => {
              const r = await docsApi('docs_link_revoke', { token_id: parent.token_id || undefined, parent_type: parentType, parent_id: parent.id })
              // fall back: revoke by regenerating list state
              if (r.success) {
                toast.show('Link revoked')
                reload()
              } else toast.show(r.error || 'Failed', true)
            }}
          >
            <Ban size={14} /> Revoke
          </button>
          <span style={{ fontSize: 12, color: COLORS.TEXT_TERTIARY }}>
            {parent.view_count > 0 ? `Viewed ${parent.view_count}× · last ${fmtDate(parent.last_viewed_at)}` : 'Not viewed yet'}
          </span>
        </>
      ) : (
        <button style={btn(true)} onClick={createLink} disabled={busy}>
          <Link2 size={14} /> {busy ? 'Creating…' : 'Create Client Link'}
        </button>
      )}
    </div>
  )
}

function ProposalDetailModal({ proposal: p, toast, onClose, reload }) {
  const [busy, setBusy] = useState(false)
  const [invoiceModal, setInvoiceModal] = useState(false)

  async function uploadPdf(file) {
    if (!file) return
    setBusy(true)
    try {
      const data_base64 = await readFileAsBase64(file)
      const r = await docsApi('docs_upload_file', { parent_type: 'proposal', parent_id: p.id, filename: file.name, data_base64 })
      if (!r.success) throw new Error(r.error)
      toast.show('PDF uploaded')
      reload()
    } catch (e) {
      toast.show(e.message || 'Upload failed', true)
    }
    setBusy(false)
  }

  async function openPdf(kind) {
    try {
      const url = await adminFileBlobUrl({ parentType: 'proposal', parentId: p.id, kind })
      window.open(url, '_blank')
    } catch {
      toast.show('File not found', true)
    }
  }

  async function send(emailClient) {
    setBusy(true)
    const r = await docsApi('docs_send', { parent_type: 'proposal', parent_id: p.id, email_client: emailClient })
    setBusy(false)
    if (r.success) {
      toast.show(emailClient ? (r.emailed?.sent ? 'Marked sent + emailed to client' : 'Marked sent (email not configured)') : 'Marked as sent')
      reload()
    } else toast.show(r.error || 'Failed', true)
  }

  return (
    <Modal title={`${p.number} — ${p.title}`} onClose={onClose} wide>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 26px', fontSize: 13.5, color: COLORS.TEXT_SECONDARY }}>
          <span>
            Client: <b style={{ color: '#fff' }}>{p.company_name || '—'}</b>
          </span>
          <span>
            Amount: <b style={{ color: '#fff' }}>{fmtMoney(p.amount, p.currency)}</b>
          </span>
          <span>
            Status: <StatusPill status={p.status} strong />
          </span>
          {p.expires_at && <span>Expires: {fmtDate(p.expires_at)}</span>}
        </div>

        {p.status === 'signed' && (
          <div style={{ ...card, background: COLORS.BG_ELEVATED, borderColor: 'rgba(255,255,255,0.3)' }}>
            <div style={{ fontSize: 14, color: '#fff', fontWeight: 650 }}>
              ✍️ Signed by {p.signer_name} on {fmtDate(p.signature_at)}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
              {p.has_signed ? (
                <button style={btn(true)} onClick={() => openPdf('signed')}>
                  <Download size={14} /> View Signed PDF
                </button>
              ) : (
                <button
                  style={btn(false)}
                  onClick={async () => {
                    const r = await docsApi('docs_regenerate_signed', { proposal_id: p.id })
                    if (r.success) {
                      toast.show('Signed PDF generated')
                      reload()
                    } else toast.show(r.error || 'Failed', true)
                  }}
                >
                  <RefreshCw size={14} /> Generate Signed PDF
                </button>
              )}
              <button style={btn(true)} onClick={() => setInvoiceModal(true)}>
                <Receipt size={14} /> Create Invoice
              </button>
            </div>
          </div>
        )}

        <div>
          <label style={lbl}>Document</label>
          {p.has_original ? (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button style={btn(false)} onClick={() => openPdf('original')}>
                <Eye size={14} /> Open PDF
              </button>
              <label style={{ ...btn(false), cursor: 'pointer' }}>
                <Upload size={14} /> Replace PDF
                <input type="file" accept="application/pdf" style={{ display: 'none' }} onChange={(e) => uploadPdf(e.target.files?.[0])} />
              </label>
            </div>
          ) : (
            <PdfDrop onFile={(f, e) => (e ? toast.show(e, true) : uploadPdf(f))} />
          )}
        </div>

        <div>
          <label style={lbl}>Client link</label>
          <LinkControls parentType="proposal" parent={p} toast={toast} reload={reload} />
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', borderTop: `1px solid ${COLORS.BORDER_SUBTLE}`, paddingTop: 16 }}>
          {p.status === 'draft' && (
            <>
              <button style={btn(true)} disabled={busy || !p.has_original} onClick={() => send(true)} title={!p.has_original ? 'Upload the PDF first' : ''}>
                <Send size={14} /> Send to Client (email)
              </button>
              <button style={btn(false)} disabled={busy} onClick={() => send(false)}>
                Mark as Sent
              </button>
            </>
          )}
          {p.status !== 'signed' && p.status !== 'cancelled' && (
            <button
              style={btn(false)}
              onClick={async () => {
                const r = await docsApi('docs_proposal_update', { id: p.id, status: 'cancelled' })
                if (r.success) {
                  toast.show('Proposal cancelled')
                  reload()
                  onClose()
                }
              }}
            >
              <Ban size={14} /> Cancel Proposal
            </button>
          )}
        </div>
      </div>

      {invoiceModal && (
        <InvoiceFormModal
          prefill={{
            client_id: p.client_id,
            proposal_id: p.id,
            project_name: p.project_name || p.title,
            description: `As per signed proposal ${p.number}`,
            amount: p.amount,
            currency: p.currency,
          }}
          clients={[{ id: p.client_id, company_name: p.company_name }]}
          onClose={() => setInvoiceModal(false)}
          onDone={(inv) => {
            setInvoiceModal(false)
            toast.show(`Invoice ${inv.number} created — find it in the Invoices tab`)
          }}
        />
      )}
    </Modal>
  )
}

// ---------------------------------------------------------------------------
// Invoices
// ---------------------------------------------------------------------------

function InvoiceFormModal({ prefill, clients, onClose, onDone }) {
  const [f, setF] = useState({
    client_id: prefill?.client_id || '',
    proposal_id: prefill?.proposal_id || null,
    project_name: prefill?.project_name || '',
    description: prefill?.description || '',
    amount: prefill?.amount || '',
    currency: prefill?.currency || 'AWG',
    due_date: '',
    payment_method: 'bank_transfer',
    tax_enabled: false,
    tax_label: 'Tax',
    tax_rate: '',
  })
  const [file, setFile] = useState(null)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  async function create() {
    if (!f.client_id) {
      setErr('Client is required')
      return
    }
    setBusy(true)
    setErr('')
    try {
      const taxRate = Number(f.tax_rate) || 0
      const r = await docsApi('docs_invoice_create', {
        client_id: f.client_id,
        proposal_id: f.proposal_id,
        project_name: f.project_name,
        description: f.description,
        amount: Number(f.amount) || 0,
        currency: f.currency,
        due_date: f.due_date || null,
        payment_method: f.payment_method,
        tax: f.tax_enabled
          ? { enabled: true, label: f.tax_label, rate: taxRate, amount: Math.round((Number(f.amount) || 0) * taxRate) / 100 }
          : { enabled: false },
      })
      if (!r.success) throw new Error(r.error || 'Failed to create invoice')
      if (file) {
        const data_base64 = await readFileAsBase64(file)
        const up = await docsApi('docs_upload_file', { parent_type: 'invoice', parent_id: r.invoice.id, filename: file.name, data_base64 })
        if (!up.success) throw new Error(up.error || 'PDF upload failed')
      }
      onDone(r.invoice)
    } catch (e) {
      setErr(e.message)
      setBusy(false)
    }
  }

  return (
    <Modal title="New Invoice" onClose={onClose}>
      <div style={{ display: 'grid', gap: 14 }}>
        <div>
          <label style={lbl}>Client</label>
          <select style={inp} value={f.client_id} onChange={(e) => setF({ ...f, client_id: e.target.value })} disabled={!!prefill?.client_id}>
            <option value="">Select a client…</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.company_name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label style={lbl}>Project</label>
          <input style={inp} value={f.project_name} onChange={(e) => setF({ ...f, project_name: e.target.value })} />
        </div>
        <div>
          <label style={lbl}>Description</label>
          <textarea style={{ ...inp, minHeight: 60, resize: 'vertical' }} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 12 }}>
          <div>
            <label style={lbl}>Amount</label>
            <input style={inp} type="number" inputMode="decimal" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} />
          </div>
          <div>
            <label style={lbl}>Currency</label>
            <select style={inp} value={f.currency} onChange={(e) => setF({ ...f, currency: e.target.value })}>
              {['AWG', 'USD', 'EUR'].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={lbl}>Due date</label>
            <input style={inp} type="date" value={f.due_date} onChange={(e) => setF({ ...f, due_date: e.target.value })} />
          </div>
        </div>
        <div>
          <label style={lbl}>Payment method</label>
          <select style={inp} value={f.payment_method} onChange={(e) => setF({ ...f, payment_method: e.target.value })}>
            <option value="bank_transfer">Bank transfer (Aruba)</option>
            <option value="stripe">Stripe (card — US / international)</option>
            <option value="manual">Manual / other</option>
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <input type="checkbox" id="taxen" checked={f.tax_enabled} onChange={(e) => setF({ ...f, tax_enabled: e.target.checked })} />
          <label htmlFor="taxen" style={{ fontSize: 13.5, color: COLORS.TEXT_SECONDARY }}>
            Add tax line
          </label>
          {f.tax_enabled && (
            <>
              <input style={{ ...inp, width: 120 }} placeholder="Label" value={f.tax_label} onChange={(e) => setF({ ...f, tax_label: e.target.value })} />
              <input style={{ ...inp, width: 90 }} type="number" placeholder="%" value={f.tax_rate} onChange={(e) => setF({ ...f, tax_rate: e.target.value })} />
            </>
          )}
        </div>
        <div>
          <label style={lbl}>Invoice PDF</label>
          <PdfDrop current={file} onFile={(fl, e) => (e ? setErr(e) : (setFile(fl), setErr('')))} />
        </div>
        {err && <div style={{ color: '#ff8a8a', fontSize: 13 }}>{err}</div>}
        <button style={{ ...btn(true), justifyContent: 'center', padding: '13px 0' }} disabled={busy} onClick={create}>
          {busy ? 'Creating…' : 'Create Invoice'}
        </button>
      </div>
    </Modal>
  )
}

function InvoicesTab({ boot, toast }) {
  const [list, setList] = useState(null)
  const [q, setQ] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [creating, setCreating] = useState(false)
  const [detail, setDetail] = useState(null)

  const load = useCallback(async () => {
    const r = await docsApi('docs_invoices_list')
    if (r.success) setList(r.invoices)
  }, [])
  useEffect(() => {
    load()
  }, [load])

  const filtered = useMemo(() => {
    let out = list || []
    if (statusFilter === 'overdue') out = out.filter((i) => i.overdue)
    else if (statusFilter) out = out.filter((i) => i.status === statusFilter)
    if (q.trim()) {
      const needle = q.toLowerCase()
      out = out.filter((i) => [i.number, i.project_name, i.company_name, i.proposal_number].join(' ').toLowerCase().includes(needle))
    }
    return out
  }, [list, q, statusFilter])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        <input style={{ ...inp, maxWidth: 280 }} placeholder="Search invoices…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select style={{ ...inp, maxWidth: 200 }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All statuses</option>
          {['draft', 'sent', 'viewed', 'payment_reported', 'paid', 'overdue', 'cancelled'].map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
        <button style={{ ...btn(true), marginLeft: 'auto' }} onClick={() => setCreating(true)}>
          <Plus size={14} /> New Invoice
        </button>
      </div>

      {!list ? (
        <div style={{ color: COLORS.TEXT_TERTIARY, fontSize: 14 }}>Loading…</div>
      ) : filtered.length === 0 ? (
        <div style={{ ...card, textAlign: 'center', color: COLORS.TEXT_TERTIARY, fontSize: 14, padding: 40 }}>
          No invoices yet.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map((i) => (
            <div key={i.id} onClick={() => setDetail(i)} style={{ ...card, cursor: 'pointer', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 14 }}>
              <div style={{ flex: 1, minWidth: 230 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 12.5, color: COLORS.TEXT_TERTIARY, fontFamily: 'monospace' }}>{i.number}</span>
                  <StatusPill status={i.overdue && i.status !== 'paid' ? 'overdue' : i.status} strong />
                  {i.proposal_number && <span style={{ fontSize: 11.5, color: COLORS.TEXT_TERTIARY }}>from {i.proposal_number}</span>}
                </div>
                <div style={{ fontSize: 15, fontWeight: 650, color: '#fff', marginTop: 6 }}>
                  {i.company_name || '—'} — {fmtMoney(i.amount, i.currency)}
                </div>
                <div style={{ fontSize: 12.5, color: COLORS.TEXT_TERTIARY, marginTop: 3 }}>
                  {i.project_name || 'No project'} · due {fmtDate(i.due_date)} · {i.payment_method === 'stripe' ? 'Stripe' : i.payment_method === 'manual' ? 'Manual' : 'Bank transfer'}
                </div>
              </div>
              <div style={{ fontSize: 12, color: COLORS.TEXT_TERTIARY }}>{i.has_original ? '📄' : 'no PDF'}</div>
            </div>
          ))}
        </div>
      )}

      {creating && (
        <InvoiceFormModal
          clients={boot.clients}
          onClose={() => setCreating(false)}
          onDone={(inv) => {
            setCreating(false)
            load()
            toast.show(`Invoice ${inv.number} created`)
          }}
        />
      )}
      {detail && (
        <InvoiceDetailModal
          invoice={(list || []).find((x) => x.id === detail.id) || detail}
          toast={toast}
          onClose={() => setDetail(null)}
          reload={load}
        />
      )}
    </div>
  )
}

function InvoiceDetailModal({ invoice: i, toast, onClose, reload }) {
  const [busy, setBusy] = useState(false)

  async function uploadPdf(file) {
    if (!file) return
    setBusy(true)
    try {
      const data_base64 = await readFileAsBase64(file)
      const r = await docsApi('docs_upload_file', { parent_type: 'invoice', parent_id: i.id, filename: file.name, data_base64 })
      if (!r.success) throw new Error(r.error)
      toast.show('Invoice PDF uploaded')
      reload()
    } catch (e) {
      toast.show(e.message || 'Upload failed', true)
    }
    setBusy(false)
  }

  async function openPdf() {
    try {
      const url = await adminFileBlobUrl({ parentType: 'invoice', parentId: i.id, kind: 'original' })
      window.open(url, '_blank')
    } catch {
      toast.show('File not found', true)
    }
  }

  async function send(emailClient) {
    setBusy(true)
    const r = await docsApi('docs_send', { parent_type: 'invoice', parent_id: i.id, email_client: emailClient })
    setBusy(false)
    if (r.success) {
      toast.show(emailClient ? (r.emailed?.sent ? 'Marked sent + emailed to client' : 'Marked sent (email not configured)') : 'Marked as sent')
      reload()
    } else toast.show(r.error || 'Failed', true)
  }

  return (
    <Modal title={`Invoice ${i.number}`} onClose={onClose} wide>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 26px', fontSize: 13.5, color: COLORS.TEXT_SECONDARY }}>
          <span>
            Client: <b style={{ color: '#fff' }}>{i.company_name || '—'}</b>
          </span>
          <span>
            Amount: <b style={{ color: '#fff' }}>{fmtMoney(i.amount, i.currency)}</b>
          </span>
          <span>
            Status: <StatusPill status={i.overdue && i.status !== 'paid' ? 'overdue' : i.status} strong />
          </span>
          <span>Due: {fmtDate(i.due_date)}</span>
          <span>Method: {i.payment_method === 'stripe' ? 'Stripe' : i.payment_method === 'manual' ? 'Manual' : 'Bank transfer'}</span>
        </div>

        <div>
          <label style={lbl}>Invoice document</label>
          {i.has_original ? (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button style={btn(false)} onClick={openPdf}>
                <Eye size={14} /> Open Invoice PDF
              </button>
              <label style={{ ...btn(false), cursor: 'pointer' }}>
                <Upload size={14} /> Replace PDF
                <input type="file" accept="application/pdf" style={{ display: 'none' }} onChange={(e) => uploadPdf(e.target.files?.[0])} />
              </label>
            </div>
          ) : (
            <PdfDrop onFile={(f, e) => (e ? toast.show(e, true) : uploadPdf(f))} />
          )}
        </div>

        <div>
          <label style={lbl}>Client link</label>
          <LinkControls parentType="invoice" parent={i} toast={toast} reload={reload} />
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', borderTop: `1px solid ${COLORS.BORDER_SUBTLE}`, paddingTop: 16 }}>
          {i.status === 'draft' && (
            <>
              <button style={btn(true)} disabled={busy} onClick={() => send(true)}>
                <Send size={14} /> Send to Client (email)
              </button>
              <button style={btn(false)} disabled={busy} onClick={() => send(false)}>
                Mark as Sent
              </button>
            </>
          )}
          {i.status !== 'paid' && i.status !== 'cancelled' && (
            <button
              style={btn(false)}
              onClick={async () => {
                if (!window.confirm(`Mark invoice ${i.number} as PAID? Use this only when you've verified the money arrived.`)) return
                const r = await docsApi('docs_invoice_mark_paid', { invoice_id: i.id })
                if (r.success) {
                  toast.show('Invoice marked as paid')
                  reload()
                } else toast.show(r.error || 'Failed', true)
              }}
            >
              <CheckCircle2 size={14} /> Mark as Paid
            </button>
          )}
          {i.status !== 'paid' && i.status !== 'cancelled' && (
            <button
              style={btn(false)}
              onClick={async () => {
                const r = await docsApi('docs_invoice_update', { id: i.id, status: 'cancelled' })
                if (r.success) {
                  toast.show('Invoice cancelled')
                  reload()
                  onClose()
                }
              }}
            >
              <Ban size={14} /> Cancel
            </button>
          )}
        </div>
      </div>
    </Modal>
  )
}

// ---------------------------------------------------------------------------
// Payments
// ---------------------------------------------------------------------------

function PaymentsTab({ toast }) {
  const [list, setList] = useState(null)
  const load = useCallback(async () => {
    const r = await docsApi('docs_payments_list')
    if (r.success) setList(r.payments)
  }, [])
  useEffect(() => {
    load()
  }, [load])

  const KIND = { stripe: 'Stripe', bank_report: 'Bank transfer', manual: 'Manual' }
  const PSTAT = { reported: 'Reported', confirmed: 'Confirmed', rejected: 'Rejected', succeeded: 'Succeeded', failed: 'Failed', refunded: 'Refunded' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {!list ? (
        <div style={{ color: COLORS.TEXT_TERTIARY, fontSize: 14 }}>Loading…</div>
      ) : list.length === 0 ? (
        <div style={{ ...card, textAlign: 'center', color: COLORS.TEXT_TERTIARY, fontSize: 14, padding: 40 }}>No payments yet.</div>
      ) : (
        list.map((p) => (
          <div key={p.id} style={{ ...card, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 14 }}>
            <div style={{ flex: 1, minWidth: 240 }}>
              <div style={{ fontSize: 14.5, fontWeight: 650, color: '#fff' }}>
                {p.company_name || p.reporter_name || '—'} — {fmtMoney(p.amount, p.currency)}
              </div>
              <div style={{ fontSize: 12.5, color: COLORS.TEXT_TERTIARY, marginTop: 4 }}>
                {KIND[p.kind] || p.kind} · invoice {p.invoice_number || '—'} · {fmtDate(p.created_at)}
                {p.reference ? ` · ref ${p.reference}` : ''}
                {p.confirmed_by ? ` · by ${String(p.confirmed_by).replace('admin:', '')}` : ''}
              </div>
            </div>
            <StatusPill status={p.status === 'succeeded' || p.status === 'confirmed' ? 'paid' : p.status === 'reported' ? 'payment_reported' : p.status} strong />
            {p.status === 'reported' && (
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  style={btn(true)}
                  onClick={async () => {
                    const r = await docsApi('docs_payment_confirm', { payment_id: p.id, email_client: true })
                    if (r.success) {
                      toast.show('Payment confirmed — invoice marked Paid')
                      load()
                    } else toast.show(r.error || 'Failed', true)
                  }}
                >
                  <CheckCircle2 size={14} /> Confirm
                </button>
                <button
                  style={btn(false)}
                  onClick={async () => {
                    const r = await docsApi('docs_payment_reject', { payment_id: p.id })
                    if (r.success) {
                      toast.show('Payment report rejected')
                      load()
                    } else toast.show(r.error || 'Failed', true)
                  }}
                >
                  <XCircle size={14} /> Reject
                </button>
              </div>
            )}
            {p.receipt_file_id && (
              <button
                style={btn(false)}
                onClick={async () => {
                  try {
                    const url = await adminFileBlobUrl({ fileId: p.receipt_file_id })
                    window.open(url, '_blank')
                  } catch {
                    toast.show('Receipt not found', true)
                  }
                }}
              >
                <Eye size={14} /> Receipt
              </button>
            )}
          </div>
        ))
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

function SettingsTab({ boot, reload, toast }) {
  const [s, setS] = useState(boot.settings)
  const [busy, setBusy] = useState(false)
  const [clients, setClients] = useState(boot.clients)

  const set = (section, key, value) => setS({ ...s, [section]: { ...s[section], [key]: value } })

  async function save() {
    setBusy(true)
    const r = await docsApi('docs_settings_save', s)
    setBusy(false)
    if (r.success) {
      toast.show('Settings saved')
      reload()
    } else toast.show(r.error || 'Failed to save', true)
  }

  const field = (section, key, label, placeholder) => (
    <div>
      <label style={lbl}>{label}</label>
      <input style={inp} placeholder={placeholder || ''} value={s[section]?.[key] || ''} onChange={(e) => set(section, key, e.target.value)} />
    </div>
  )

  const statusDot = (ok) => (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: ok ? '#fff' : COLORS.TEXT_TERTIARY }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: ok ? '#fff' : '#444' }} />
      {ok ? 'Configured' : 'Not configured'}
    </span>
  )

  return (
    <div style={{ display: 'grid', gap: 18, gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', alignItems: 'start' }}>
      <div style={{ ...card, display: 'grid', gap: 12 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>Business</div>
        {field('business', 'name', 'Business name', 'Lithos Labs')}
        {field('business', 'email', 'Email')}
        {field('business', 'phone', 'Phone')}
        {field('business', 'address', 'Address')}
        {field('business', 'website', 'Website')}
        {field('business', 'default_currency', 'Default currency', 'AWG')}
      </div>

      <div style={{ ...card, display: 'grid', gap: 12 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>Aruba bank transfer</div>
        {field('bank', 'bank_name', 'Bank name', 'Aruba Bank')}
        {field('bank', 'account_name', 'Account holder')}
        {field('bank', 'account_number', 'Account number')}
        {field('bank', 'iban', 'IBAN (if applicable)')}
        {field('bank', 'swift', 'SWIFT / BIC (if applicable)')}
        {field('bank', 'currency', 'Currency', 'AWG')}
        <div>
          <label style={lbl}>Payment instructions (shown to clients)</label>
          <textarea style={{ ...inp, minHeight: 60, resize: 'vertical' }} value={s.bank?.instructions || ''} onChange={(e) => set('bank', 'instructions', e.target.value)} />
        </div>
        {field('bank', 'reference_note', 'Reference instructions', 'Use the invoice number as reference')}
      </div>

      <div style={{ ...card, display: 'grid', gap: 12 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>Documents & numbering</div>
        {field('numbering', 'proposal_prefix', 'Proposal prefix', 'LL-PROP')}
        {field('numbering', 'invoice_prefix', 'Invoice prefix', 'LL-INV')}
        <div style={{ fontSize: 12.5, color: COLORS.TEXT_TERTIARY }}>
          Next: {s.numbering?.proposal_prefix || 'LL-PROP'}-{s.numbering?.year}-{String(s.numbering?.proposal_seq || 1).padStart(3, '0')} ·{' '}
          {s.numbering?.invoice_prefix || 'LL-INV'}-{s.numbering?.year}-{String(s.numbering?.invoice_seq || 1).padStart(3, '0')}
        </div>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginTop: 8 }}>Email</div>
        {field('email', 'sender_name', 'Sender name', 'Lithos Labs')}
        {field('email', 'sender_email', 'Sender email (verified in Resend)')}
        <div style={{ fontSize: 12.5, color: COLORS.TEXT_TERTIARY }}>Email delivery: {statusDot(boot.email_configured)}</div>
      </div>

      <div style={{ ...card, display: 'grid', gap: 12 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>Stripe</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5, color: COLORS.TEXT_SECONDARY }}>
          <span>API key</span> {statusDot(boot.stripe_configured)}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5, color: COLORS.TEXT_SECONDARY }}>
          <span>Webhook</span> {statusDot(boot.stripe_webhook_configured)}
        </div>
        <div style={{ fontSize: 12.5, color: COLORS.TEXT_TERTIARY, lineHeight: 1.6 }}>
          Keys live in Vercel env vars (<code>STRIPE_SECRET_KEY</code>, <code>STRIPE_WEBHOOK_SECRET</code>) — never in
          the app. Point the Stripe webhook at <code>/api/webhooks?source=stripe</code>.
        </div>

        <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginTop: 8 }}>Client payment types</div>
        <div style={{ display: 'grid', gap: 8, maxHeight: 260, overflowY: 'auto' }}>
          {clients.map((c) => (
            <div key={c.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              <span style={{ fontSize: 13, color: COLORS.TEXT_SECONDARY, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.company_name}</span>
              <select
                style={{ ...inp, width: 150, padding: '7px 10px', fontSize: 12.5 }}
                value={c.client_type || 'aruba'}
                onChange={async (e) => {
                  const client_type = e.target.value
                  setClients(clients.map((x) => (x.id === c.id ? { ...x, client_type } : x)))
                  await docsApi('docs_client_set_type', { client_id: c.id, client_type })
                }}
              >
                <option value="aruba">Aruba</option>
                <option value="united_states">United States</option>
                <option value="other">Other</option>
              </select>
            </div>
          ))}
        </div>
      </div>

      <div style={{ gridColumn: '1 / -1' }}>
        <button style={{ ...btn(true), padding: '13px 30px' }} disabled={busy} onClick={save}>
          {busy ? 'Saving…' : 'Save Settings'}
        </button>
      </div>
    </div>
  )
}

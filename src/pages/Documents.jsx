import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus,
  Search,
  FileText,
  Receipt,
  FileSignature,
  Shield,
  Scale,
  ListChecks,
  Download,
  Copy,
  Save,
  Loader2,
  Trash2,
  X,
} from 'lucide-react'
import PageShell from '../components/PageShell'
import { workflowApi } from '../lib/auth'

const SERVICE_PACKAGES = [
  'CRM Setup',
  'AI Marketing System',
  'Website Development',
  'Lead Generation System',
  'Full Business Operating System',
  'Brand Identity',
  'Monthly Retainer - Starter',
  'Monthly Retainer - Growth',
]

const DOC_TYPES = [
  { key: 'Service Agreement', icon: FileSignature },
  { key: 'Invoice', icon: Receipt },
  { key: 'Proposal', icon: FileText },
  { key: 'Privacy Policy', icon: Shield },
  { key: 'Terms of Service', icon: Scale },
  { key: 'Onboarding Checklist', icon: ListChecks },
]

const card = {
  background: 'rgba(194,181,155,0.03)',
  border: '0.5px solid rgba(194,181,155,0.08)',
  borderRadius: 14,
}

const inputStyle = {
  width: '100%',
  background: 'rgba(255,255,255,0.04)',
  border: '0.5px solid rgba(255,255,255,0.1)',
  borderRadius: 10,
  padding: '10px 12px',
  color: '#fff',
  fontSize: 13,
  outline: 'none',
  fontFamily: 'inherit',
}

const labelStyle = {
  fontSize: 11,
  fontWeight: 500,
  color: 'rgba(255,255,255,0.4)',
  marginBottom: 6,
  display: 'block',
}

const money = (n) => '$' + (Number(n) || 0).toLocaleString()

export default function Documents() {
  const [clients, setClients] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [filter, setFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)

  const [docs, setDocs] = useState([])
  const [generating, setGenerating] = useState(null)
  const [generatedDoc, setGeneratedDoc] = useState(null)
  const [toast, setToast] = useState('')

  const selected = useMemo(
    () => clients.find((c) => c.id === selectedId) || null,
    [clients, selectedId],
  )

  function showToast(m) {
    setToast(m)
    setTimeout(() => setToast(''), 2600)
  }

  async function loadClients() {
    setLoading(true)
    try {
      const data = await workflowApi('get_clients')
      setClients(data?.clients || [])
    } catch (e) {
      /* noop */
    } finally {
      setLoading(false)
    }
  }

  async function loadDocs(clientId) {
    if (!clientId) return setDocs([])
    try {
      const data = await workflowApi('get_documents', {
        params: { client_id: clientId },
      })
      setDocs(data?.documents || [])
    } catch (e) {
      setDocs([])
    }
  }

  useEffect(() => {
    loadClients()
  }, [])

  useEffect(() => {
    setGeneratedDoc(null)
    loadDocs(selectedId)
  }, [selectedId])

  const filtered = clients.filter((c) =>
    (c.company_name || '').toLowerCase().includes(filter.trim().toLowerCase()),
  )

  async function generateDoc(type, client) {
    setGenerating(type)
    setGeneratedDoc(null)
    const prompts = {
      'Service Agreement': `Generate a professional service agreement between Lithos Labs (provider, based in Aruba) and ${client.company_name} (client). Services: ${client.service_package}. Setup fee: $${client.setup_fee}. Monthly retainer: $${client.monthly_retainer}. Start date: ${client.start_date}. Include: scope of work, payment terms, intellectual property, confidentiality, termination (30 days notice), governing law (Aruba). Professional and complete.`,
      Invoice: `Generate a professional invoice from Lithos Labs to ${client.company_name}. Contact: ${client.contact_name}. Service: ${client.service_package}. Setup Fee: $${client.setup_fee}. Monthly: $${client.monthly_retainer}. Date: ${new Date().toLocaleDateString()}. Due: 14 days. Include payment instructions placeholder.`,
      Proposal: `Generate a compelling project proposal from Lithos Labs to ${client.company_name} for ${client.service_package}. Include: executive summary, problem we solve, our solution, deliverables, timeline (2-4 weeks), investment ($${client.setup_fee} setup + $${client.monthly_retainer}/month), why Lithos Labs, next steps. Professional and persuasive.`,
      'Privacy Policy': `Generate a complete GDPR-compliant privacy policy for ${client.company_name} (${client.industry}) website. Contact: ${client.contact_email}. Include: data collection, usage, cookies, third parties, user rights, contact info. Professional and complete.`,
      'Terms of Service': `Generate professional terms of service for ${client.company_name} (${client.industry}). Include: acceptance, services, payments, cancellation (30 days), liability limits, governing law (Aruba). Complete and professional.`,
      'Onboarding Checklist': `Generate a detailed client onboarding checklist for Lithos Labs delivering ${client.service_package} to ${client.company_name}. Include: kickoff meeting items, access/credentials needed from client, design preferences to gather, content to collect, review milestones, go-live checklist, training plan, 30-day check-in. Format as a clear checklist with checkboxes.`,
    }
    try {
      const data = await workflowApi('ai_generate', {
        method: 'POST',
        body: {
          system:
            'You are a professional document writer for Lithos Labs, a CRM and AI marketing agency in Aruba. Generate complete, professional documents. Return ONLY the document text.',
          prompt: prompts[type],
          max_tokens: 2000,
        },
      })
      if (!data?.success || !data?.text) {
        showToast(data?.error || 'Generation failed')
        return
      }
      setGeneratedDoc({
        type,
        title: type + ' — ' + client.company_name,
        content: data.text,
      })
    } catch (e) {
      showToast('Generation failed')
    } finally {
      setGenerating(null)
    }
  }

  function downloadPdf(title, content) {
    const w = window.open('', '_blank')
    if (!w) return
    w.document.write(
      `<html><head><title>${title}</title><style>body{font-family:Georgia,serif;max-width:800px;margin:40px auto;line-height:1.8;color:#111;font-size:14px;}h1{font-size:22px;border-bottom:2px solid #111;padding-bottom:8px;}h2{font-size:18px;margin-top:24px;}p{margin:10px 0;}ul,ol{margin:10px 0;padding-left:24px;}</style></head><body>`,
    )
    w.document.write(`<h1>LITHOS LABS</h1><h2>${title}</h2><hr>`)
    w.document.write(
      '<p>' + content.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>') + '</p>',
    )
    w.document.write('</body></html>')
    w.document.close()
    w.print()
  }

  async function saveDocument() {
    if (!generatedDoc || !selected) return
    try {
      const data = await workflowApi('save_document', {
        method: 'POST',
        body: {
          client_id: selected.id,
          type: generatedDoc.type,
          title: generatedDoc.title,
          content: generatedDoc.content,
        },
      })
      if (data?.success) {
        showToast('Document saved')
        loadDocs(selected.id)
      } else {
        showToast('Could not save')
      }
    } catch (e) {
      showToast('Could not save')
    }
  }

  async function deleteDoc(id) {
    try {
      await workflowApi('delete_document', {
        method: 'POST',
        body: { document_id: id },
      })
      loadDocs(selectedId)
    } catch (e) {
      /* noop */
    }
  }

  return (
    <PageShell>
      <div style={{ display: 'flex', gap: 18, alignItems: 'flex-start', minHeight: '70vh' }}>
        {/* LEFT PANEL */}
        <div
          style={{
            ...card,
            width: 280,
            flexShrink: 0,
            padding: 16,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            alignSelf: 'stretch',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, color: '#fff' }}>Clients</h3>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>
                {clients.length}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setAddOpen(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                fontSize: 12,
                fontWeight: 600,
                color: '#C2B59B',
                background: 'rgba(194,181,155,0.08)',
                border: '0.5px solid rgba(194,181,155,0.2)',
                borderRadius: 8,
                padding: '6px 10px',
                cursor: 'pointer',
              }}
            >
              <Plus size={13} /> Add
            </button>
          </div>

          <div style={{ position: 'relative' }}>
            <Search
              size={13}
              style={{
                position: 'absolute',
                left: 11,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'rgba(255,255,255,0.3)',
              }}
            />
            <input
              style={{ ...inputStyle, paddingLeft: 32, fontSize: 12.5 }}
              placeholder="Search clients..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, overflowY: 'auto' }}>
            {loading ? (
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12.5, padding: 16 }}>
                Loading…
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12.5, padding: 16 }}>
                No clients yet
              </div>
            ) : (
              filtered.map((c) => {
                const active = c.id === selectedId
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedId(c.id)}
                    style={{
                      textAlign: 'left',
                      background: active
                        ? 'rgba(194,181,155,0.1)'
                        : 'transparent',
                      border: active
                        ? '0.5px solid rgba(194,181,155,0.25)'
                        : '0.5px solid transparent',
                      borderRadius: 10,
                      padding: '10px 12px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                    }}
                  >
                    <span
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: '50%',
                        flexShrink: 0,
                        background:
                          c.status === 'active'
                            ? '#7DD3FC'
                            : 'rgba(255,255,255,0.25)',
                      }}
                    />
                    <span style={{ minWidth: 0 }}>
                      <span
                        style={{
                          display: 'block',
                          fontSize: 13,
                          fontWeight: 600,
                          color: active ? '#fff' : 'rgba(255,255,255,0.8)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {c.company_name}
                      </span>
                      {c.service_package && (
                        <span
                          style={{
                            display: 'block',
                            fontSize: 11,
                            color: 'rgba(255,255,255,0.35)',
                            marginTop: 2,
                          }}
                        >
                          {c.service_package}
                        </span>
                      )}
                    </span>
                  </button>
                )
              })
            )}
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {!selected ? (
            <div
              style={{
                ...card,
                minHeight: '60vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'rgba(255,255,255,0.35)',
                fontSize: 14,
              }}
            >
              Select a client to generate documents
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div style={{ ...card, padding: 22 }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: 16,
                    flexWrap: 'wrap',
                  }}
                >
                  <div>
                    <h2 style={{ fontSize: 22, fontWeight: 600, color: '#fff', letterSpacing: '-0.3px' }}>
                      {selected.company_name}
                    </h2>
                    <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', marginTop: 6 }}>
                      {[selected.contact_name, selected.contact_email, selected.contact_phone]
                        .filter(Boolean)
                        .join('  ·  ')}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    {selected.service_package && (
                      <span
                        style={{
                          display: 'inline-block',
                          fontSize: 12,
                          fontWeight: 600,
                          color: '#C2B59B',
                          background: 'rgba(194,181,155,0.1)',
                          border: '0.5px solid rgba(194,181,155,0.2)',
                          borderRadius: 999,
                          padding: '5px 14px',
                        }}
                      >
                        {selected.service_package}
                      </span>
                    )}
                    <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.5)', marginTop: 10 }}>
                      Setup{' '}
                      <span style={{ color: '#fff', fontWeight: 600 }}>
                        {money(selected.setup_fee)}
                      </span>{' '}
                      · Monthly{' '}
                      <span style={{ color: '#fff', fontWeight: 600 }}>
                        {money(selected.monthly_retainer)}
                      </span>
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 8,
                    marginTop: 18,
                  }}
                >
                  {DOC_TYPES.map(({ key, icon: Icon }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => generateDoc(key, selected)}
                      disabled={generating != null}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 7,
                        fontSize: 12.5,
                        fontWeight: 500,
                        color: 'rgba(255,255,255,0.8)',
                        background: 'rgba(255,255,255,0.03)',
                        border: '0.5px solid rgba(255,255,255,0.1)',
                        borderRadius: 10,
                        padding: '9px 14px',
                        cursor: generating ? 'wait' : 'pointer',
                      }}
                    >
                      {generating === key ? (
                        <Loader2 size={13} className="spin" />
                      ) : (
                        <Icon size={13} />
                      )}
                      {key}
                    </button>
                  ))}
                </div>
              </div>

              {generatedDoc && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <ActionBtn
                      icon={Download}
                      label="Download PDF"
                      onClick={() =>
                        downloadPdf(generatedDoc.title, generatedDoc.content)
                      }
                    />
                    <ActionBtn icon={Save} label="Save" onClick={saveDocument} />
                    <ActionBtn
                      icon={Copy}
                      label="Copy"
                      onClick={() => {
                        navigator.clipboard.writeText(generatedDoc.content)
                        showToast('Copied to clipboard')
                      }}
                    />
                  </div>
                  <div
                    style={{
                      background: '#ffffff',
                      color: '#111',
                      padding: 32,
                      borderRadius: 12,
                    }}
                  >
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: 18,
                        letterSpacing: '0.5px',
                      }}
                    >
                      LITHOS LABS
                    </div>
                    <hr
                      style={{
                        border: 'none',
                        borderTop: '2px solid #111',
                        margin: '12px 0 20px',
                      }}
                    />
                    <h2 style={{ fontSize: 18, margin: '0 0 16px' }}>
                      {generatedDoc.title}
                    </h2>
                    <div
                      style={{
                        whiteSpace: 'pre-wrap',
                        fontSize: 14,
                        lineHeight: 1.7,
                        fontFamily: 'Georgia, serif',
                      }}
                    >
                      {generatedDoc.content}
                    </div>
                  </div>
                </div>
              )}

              <div style={{ ...card, padding: 18 }}>
                <h3
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: 'rgba(255,255,255,0.75)',
                    marginBottom: 12,
                  }}
                >
                  Saved documents
                </h3>
                {docs.length === 0 ? (
                  <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.35)' }}>
                    No saved documents for this client yet.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {docs.map((d) => (
                      <div
                        key={d.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12,
                          padding: '10px 12px',
                          background: 'rgba(255,255,255,0.02)',
                          border: '0.5px solid rgba(255,255,255,0.06)',
                          borderRadius: 10,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 10.5,
                            fontWeight: 600,
                            color: '#C2B59B',
                            background: 'rgba(194,181,155,0.1)',
                            borderRadius: 6,
                            padding: '3px 8px',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {d.type}
                        </span>
                        <span
                          style={{
                            flex: 1,
                            minWidth: 0,
                            fontSize: 13,
                            color: 'rgba(255,255,255,0.8)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {d.title}
                        </span>
                        <span
                          style={{
                            fontSize: 11.5,
                            color: 'rgba(255,255,255,0.35)',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {d.created_at
                            ? new Date(d.created_at).toLocaleDateString()
                            : ''}
                        </span>
                        <button
                          type="button"
                          onClick={() => downloadPdf(d.title, d.content || '')}
                          style={iconBtn}
                          aria-label="Download"
                        >
                          <Download size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteDoc(d.id)}
                          style={{ ...iconBtn, color: 'rgba(255,120,120,0.7)' }}
                          aria-label="Delete"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {addOpen && (
          <AddClientModal
            onClose={() => setAddOpen(false)}
            onSaved={(client) => {
              setAddOpen(false)
              loadClients()
              if (client?.id) setSelectedId(client.id)
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            style={{
              position: 'fixed',
              bottom: 28,
              left: '50%',
              transform: 'translateX(-50%)',
              background: '#16161A',
              border: '0.5px solid rgba(194,181,155,0.2)',
              color: '#fff',
              fontSize: 13,
              fontWeight: 500,
              padding: '12px 22px',
              borderRadius: 12,
              zIndex: 300,
            }}
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </PageShell>
  )
}

function ActionBtn({ icon: Icon, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 7,
        fontSize: 12.5,
        fontWeight: 600,
        color: '#fff',
        background: 'rgba(194,181,155,0.08)',
        border: '0.5px solid rgba(194,181,155,0.2)',
        borderRadius: 10,
        padding: '9px 16px',
        cursor: 'pointer',
      }}
    >
      <Icon size={13} />
      {label}
    </button>
  )
}

const iconBtn = {
  width: 28,
  height: 28,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'transparent',
  border: '0.5px solid rgba(255,255,255,0.1)',
  borderRadius: 8,
  color: 'rgba(255,255,255,0.55)',
  cursor: 'pointer',
  flexShrink: 0,
}

function AddClientModal({ onClose, onSaved }) {
  const [form, setForm] = useState({
    company_name: '',
    contact_name: '',
    contact_email: '',
    contact_phone: '',
    contact_whatsapp: '',
    address: '',
    industry: '',
    service_package: SERVICE_PACKAGES[0],
    setup_fee: '',
    monthly_retainer: '',
    start_date: '',
    notes: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  async function save() {
    if (!form.company_name.trim()) {
      setError('Company name is required')
      return
    }
    setSaving(true)
    setError('')
    try {
      const data = await workflowApi('add_client', {
        method: 'POST',
        body: {
          ...form,
          setup_fee: Number(form.setup_fee) || 0,
          monthly_retainer: Number(form.monthly_retainer) || 0,
          start_date: form.start_date || null,
        },
      })
      if (data?.success) onSaved(data.client)
      else setError(data?.error || 'Could not save client')
    } catch (e) {
      setError('Could not save client')
    } finally {
      setSaving(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.75)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 300,
        padding: 16,
      }}
    >
      <motion.div
        initial={{ scale: 0.96, y: 14 }}
        animate={{ scale: 1, y: 0 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#111113',
          border: '0.5px solid rgba(255,255,255,0.1)',
          borderRadius: 16,
          padding: 24,
          width: '100%',
          maxWidth: 540,
          maxHeight: '88vh',
          overflowY: 'auto',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 18,
          }}
        >
          <h3 style={{ fontSize: 17, fontWeight: 600, color: '#fff' }}>Add Client</h3>
          <button
            type="button"
            onClick={onClose}
            style={{ ...iconBtn, border: 'none' }}
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 12,
          }}
        >
          <Field label="Company name *" full>
            <input style={inputStyle} value={form.company_name} onChange={set('company_name')} />
          </Field>
          <Field label="Contact name">
            <input style={inputStyle} value={form.contact_name} onChange={set('contact_name')} />
          </Field>
          <Field label="Contact email">
            <input style={inputStyle} value={form.contact_email} onChange={set('contact_email')} />
          </Field>
          <Field label="Phone">
            <input style={inputStyle} value={form.contact_phone} onChange={set('contact_phone')} />
          </Field>
          <Field label="WhatsApp">
            <input
              style={inputStyle}
              value={form.contact_whatsapp}
              onChange={set('contact_whatsapp')}
            />
          </Field>
          <Field label="Address" full>
            <input style={inputStyle} value={form.address} onChange={set('address')} />
          </Field>
          <Field label="Industry">
            <input style={inputStyle} value={form.industry} onChange={set('industry')} />
          </Field>
          <Field label="Service package">
            <select
              style={inputStyle}
              value={form.service_package}
              onChange={set('service_package')}
            >
              {SERVICE_PACKAGES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Setup fee ($)">
            <input
              type="number"
              style={inputStyle}
              value={form.setup_fee}
              onChange={set('setup_fee')}
            />
          </Field>
          <Field label="Monthly retainer ($)">
            <input
              type="number"
              style={inputStyle}
              value={form.monthly_retainer}
              onChange={set('monthly_retainer')}
            />
          </Field>
          <Field label="Start date">
            <input
              type="date"
              style={inputStyle}
              value={form.start_date}
              onChange={set('start_date')}
            />
          </Field>
          <Field label="Notes" full>
            <textarea
              style={{ ...inputStyle, minHeight: 70, resize: 'vertical' }}
              value={form.notes}
              onChange={set('notes')}
            />
          </Field>
        </div>

        {error && (
          <div style={{ color: '#ff6b6b', fontSize: 12.5, marginTop: 12 }}>{error}</div>
        )}

        <button
          type="button"
          onClick={save}
          disabled={saving}
          style={{
            width: '100%',
            marginTop: 18,
            background: '#C2B59B',
            color: '#0B0B0D',
            border: 'none',
            borderRadius: 12,
            padding: 13,
            fontSize: 14,
            fontWeight: 600,
            cursor: saving ? 'wait' : 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          {saving && <Loader2 size={15} className="spin" />}
          Save Client
        </button>
      </motion.div>
    </motion.div>
  )
}

function Field({ label, children, full }) {
  return (
    <div style={{ gridColumn: full ? '1 / -1' : 'auto' }}>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  )
}

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
  ChevronDown,
  Calculator,
  FolderOpen,
  MessageCircle,
  Landmark,
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

// ---- Estimate calculator catalog ----
const CATALOG = [
  {
    key: 'websites',
    label: 'Websites',
    tiers: [
      { id: 'web-starter', name: 'Starter Website', price: 600 },
      { id: 'web-business', name: 'Business Website', price: 1000 },
      { id: 'web-premium', name: 'Premium Website System', price: 1800 },
    ],
    addons: [
      { id: 'web-booking', name: 'Booking System', price: 150 },
      { id: 'web-dashboard', name: 'Custom Dashboard', price: 400 },
      { id: 'web-payment', name: 'Payment Integration', price: 350 },
      { id: 'web-anim', name: 'Animations', price: 150 },
      { id: 'web-blog', name: 'Blog System', price: 100 },
      { id: 'web-portal', name: 'Member Portal', price: 500 },
      { id: 'web-ai', name: 'AI Integration', price: 800 },
      { id: 'web-pages', name: 'Extra Pages (per page)', price: 80, qty: true },
    ],
  },
  {
    key: 'crm',
    label: 'CRM',
    tiers: [
      { id: 'crm-basic', name: 'Basic CRM Setup', price: 700 },
      { id: 'crm-adv', name: 'Advanced CRM System', price: 1200 },
      { id: 'crm-ent', name: 'Enterprise CRM', price: 2000 },
    ],
    addons: [
      { id: 'crm-flows', name: 'WhatsApp/Email Flows', price: 200 },
      { id: 'crm-ai', name: 'AI Workflows', price: 400 },
      { id: 'crm-analytics', name: 'Analytics Dashboard', price: 200 },
      { id: 'crm-api', name: 'API Integrations', price: 300 },
    ],
  },
  {
    key: 'ai',
    label: 'AI Services',
    tiers: [
      { id: 'ai-chatbot-basic', name: 'Basic Website Chatbot', price: 500 },
      { id: 'ai-chatbot-adv', name: 'Advanced AI Chatbot', price: 900 },
      { id: 'ai-wa-std', name: 'WhatsApp AI Standard', price: 600 },
      { id: 'ai-wa-adv', name: 'WhatsApp AI Advanced', price: 1200 },
      { id: 'ai-voice-starter', name: 'Starter Voice Agent', price: 800 },
      { id: 'ai-receptionist', name: 'Advanced AI Receptionist', price: 1800 },
    ],
    addons: [],
  },
  {
    key: 'automation',
    label: 'Automation',
    tiers: [
      { id: 'auto-basic', name: 'Basic Automation System', price: 650 },
      { id: 'auto-adv', name: 'Advanced Automation', price: 1400 },
    ],
    addons: [],
  },
  {
    key: 'leadgen',
    label: 'Lead Generation',
    tiers: [
      { id: 'lead-basic', name: 'Basic Lead System', price: 600 },
      { id: 'lead-adv', name: 'Advanced Lead System', price: 1500 },
    ],
    addons: [],
  },
]

const RETAINERS = [
  { id: 'ret-maint', name: 'Maintenance + Support', price: 200 },
  { id: 'ret-chatbot', name: 'AI Chatbot Management', price: 250 },
  { id: 'ret-wa', name: 'WhatsApp AI Management', price: 250 },
  { id: 'ret-marketing', name: 'Full Marketing Management', price: 500 },
  { id: 'ret-system', name: 'Full System Management', price: 800 },
]

const BANKING_KEY = 'lithos_banking_info'
const INVOICE_COUNT_KEY = 'lithos_invoice_count'

const PRINT_CSS = `
@media print {
  body * { visibility: hidden !important; }
  #invoice-print-area, #invoice-print-area * { visibility: visible !important; }
  #invoice-print-area {
    position: absolute !important;
    left: 0; top: 0;
    width: 100% !important;
    margin: 0 !important;
    box-shadow: none !important;
  }
  .no-print { display: none !important; }
  @page { margin: 16mm; }
}
`

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

function loadBanking() {
  try {
    const raw = localStorage.getItem(BANKING_KEY)
    if (raw) return JSON.parse(raw)
  } catch (e) {
    /* noop */
  }
  return { bankName: '', accountName: 'Lithos Labs', accountNumber: '', whatsappNumber: '' }
}

function nextInvoiceNumber() {
  let count = 0
  try {
    count = parseInt(localStorage.getItem(INVOICE_COUNT_KEY) || '0', 10) || 0
  } catch (e) {
    count = 0
  }
  count += 1
  try {
    localStorage.setItem(INVOICE_COUNT_KEY, String(count))
  } catch (e) {
    /* noop */
  }
  const year = new Date().getFullYear()
  return `INV-${year}-${String(count).padStart(3, '0')}`
}

const TABS = [
  { key: 'contracts', label: 'Contracts', icon: FileSignature },
  { key: 'estimates', label: 'Estimates & Invoices', icon: Calculator },
  { key: 'saved', label: 'Saved Documents', icon: FolderOpen },
]

export default function Documents() {
  const [clients, setClients] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [filter, setFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [tab, setTab] = useState('contracts')

  const [docs, setDocs] = useState([])
  const [generating, setGenerating] = useState(null)
  const [generatedDoc, setGeneratedDoc] = useState(null)
  const [toast, setToast] = useState('')

  const [banking, setBanking] = useState(loadBanking)

  const selected = useMemo(
    () => clients.find((c) => c.id === selectedId) || null,
    [clients, selectedId],
  )

  function showToast(m) {
    setToast(m)
    setTimeout(() => setToast(''), 2600)
  }

  function saveBanking(next) {
    setBanking(next)
    try {
      localStorage.setItem(BANKING_KEY, JSON.stringify(next))
      showToast('Banking info saved')
    } catch (e) {
      showToast('Could not save banking info')
    }
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

  // Saves an arbitrary generated document (invoice / proposal) for the selected client.
  async function saveGenerated(type, title, content) {
    if (!selected) {
      showToast('Select a client to save')
      return false
    }
    try {
      const data = await workflowApi('save_document', {
        method: 'POST',
        body: { client_id: selected.id, type, title, content },
      })
      if (data?.success) {
        showToast(type + ' saved')
        loadDocs(selected.id)
        return true
      }
      showToast('Could not save')
      return false
    } catch (e) {
      showToast('Could not save')
      return false
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
      <style>{PRINT_CSS}</style>
      <div
        className="no-print"
        style={{ display: 'flex', gap: 18, alignItems: 'flex-start', minHeight: '70vh' }}
      >
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
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Tabs + banking */}
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: 16,
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {TABS.map(({ key, label, icon: Icon }) => {
                const active = tab === key
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setTab(key)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 7,
                      fontSize: 12.5,
                      fontWeight: 600,
                      color: active ? '#0B0B0D' : 'rgba(255,255,255,0.7)',
                      background: active ? '#C2B59B' : 'rgba(255,255,255,0.03)',
                      border: active
                        ? '0.5px solid #C2B59B'
                        : '0.5px solid rgba(255,255,255,0.1)',
                      borderRadius: 10,
                      padding: '9px 16px',
                      cursor: 'pointer',
                    }}
                  >
                    <Icon size={13} />
                    {label}
                  </button>
                )
              })}
            </div>
            <BankingCard banking={banking} onSave={saveBanking} />
          </div>

          {tab === 'contracts' && (
            <ContractsTab
              selected={selected}
              generating={generating}
              generatedDoc={generatedDoc}
              onGenerate={generateDoc}
              onDownload={downloadPdf}
              onSave={saveDocument}
              onCopy={(content) => {
                navigator.clipboard.writeText(content)
                showToast('Copied to clipboard')
              }}
            />
          )}

          {tab === 'estimates' && (
            <EstimatesTab
              selected={selected}
              banking={banking}
              showToast={showToast}
              onSaveDoc={saveGenerated}
            />
          )}

          {tab === 'saved' && (
            <SavedDocsTab
              selected={selected}
              docs={docs}
              onDownload={downloadPdf}
              onDelete={deleteDoc}
            />
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
            className="no-print"
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

// ---------- Contracts tab (existing generator) ----------
function ContractsTab({
  selected,
  generating,
  generatedDoc,
  onGenerate,
  onDownload,
  onSave,
  onCopy,
}) {
  if (!selected) {
    return (
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
    )
  }
  return (
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

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 18 }}>
          {DOC_TYPES.map(({ key, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => onGenerate(key, selected)}
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
              onClick={() => onDownload(generatedDoc.title, generatedDoc.content)}
            />
            <ActionBtn icon={Save} label="Save" onClick={onSave} />
            <ActionBtn
              icon={Copy}
              label="Copy"
              onClick={() => onCopy(generatedDoc.content)}
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
            <div style={{ fontWeight: 700, fontSize: 18, letterSpacing: '0.5px' }}>
              LITHOS LABS
            </div>
            <hr
              style={{
                border: 'none',
                borderTop: '2px solid #111',
                margin: '12px 0 20px',
              }}
            />
            <h2 style={{ fontSize: 18, margin: '0 0 16px' }}>{generatedDoc.title}</h2>
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
    </div>
  )
}

// ---------- Saved documents tab ----------
function SavedDocsTab({ selected, docs, onDownload, onDelete }) {
  if (!selected) {
    return (
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
        Select a client to view saved documents
      </div>
    )
  }
  return (
    <div style={{ ...card, padding: 18 }}>
      <h3
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: 'rgba(255,255,255,0.75)',
          marginBottom: 12,
        }}
      >
        Saved documents — {selected.company_name}
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
                {d.created_at ? new Date(d.created_at).toLocaleDateString() : ''}
              </span>
              <button
                type="button"
                onClick={() => onDownload(d.title, d.content || '')}
                style={iconBtn}
                aria-label="Download"
              >
                <Download size={13} />
              </button>
              <button
                type="button"
                onClick={() => onDelete(d.id)}
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
  )
}

// ---------- Banking info card ----------
function BankingCard({ banking, onSave }) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(banking)

  useEffect(() => {
    setForm(banking)
  }, [banking])

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  return (
    <div
      style={{
        ...card,
        width: open ? 280 : 'auto',
        padding: open ? 16 : '0',
        flexShrink: 0,
      }}
    >
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 7,
            fontSize: 12.5,
            fontWeight: 600,
            color: 'rgba(255,255,255,0.7)',
            background: 'transparent',
            border: 'none',
            borderRadius: 14,
            padding: '11px 16px',
            cursor: 'pointer',
          }}
        >
          <Landmark size={13} /> My Banking Info
        </button>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: '#fff',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
              }}
            >
              <Landmark size={13} /> Banking Info
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              style={{ ...iconBtn, border: 'none', width: 22, height: 22 }}
              aria-label="Close"
            >
              <X size={14} />
            </button>
          </div>
          <div>
            <label style={labelStyle}>Bank name</label>
            <input style={inputStyle} value={form.bankName || ''} onChange={set('bankName')} />
          </div>
          <div>
            <label style={labelStyle}>Account name</label>
            <input
              style={inputStyle}
              value={form.accountName || ''}
              onChange={set('accountName')}
            />
          </div>
          <div>
            <label style={labelStyle}>Account number</label>
            <input
              style={inputStyle}
              value={form.accountNumber || ''}
              onChange={set('accountNumber')}
            />
          </div>
          <div>
            <label style={labelStyle}>WhatsApp number</label>
            <input
              style={inputStyle}
              placeholder="e.g. 297XXXXXXX"
              value={form.whatsappNumber || ''}
              onChange={set('whatsappNumber')}
            />
          </div>
          <button
            type="button"
            onClick={() => {
              onSave(form)
              setOpen(false)
            }}
            style={{
              width: '100%',
              background: '#C2B59B',
              color: '#0B0B0D',
              border: 'none',
              borderRadius: 10,
              padding: 10,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Save
          </button>
        </div>
      )}
    </div>
  )
}

// ---------- Estimates & Invoices tab ----------
function buildLineItems(tiers, addons, pagesQty) {
  const items = []
  for (const cat of CATALOG) {
    const tierId = tiers[cat.key]
    if (tierId) {
      const t = cat.tiers.find((x) => x.id === tierId)
      if (t) items.push({ id: t.id, name: t.name, price: t.price, group: cat.label })
    }
    for (const a of cat.addons) {
      if (addons[a.id]) {
        if (a.qty) {
          const q = Math.max(1, Number(pagesQty) || 1)
          items.push({
            id: a.id,
            name: `${a.name.replace(' (per page)', '')} × ${q}`,
            price: a.price * q,
            group: cat.label,
            addon: true,
          })
        } else {
          items.push({ id: a.id, name: a.name, price: a.price, group: cat.label, addon: true })
        }
      }
    }
  }
  return items
}

function EstimatesTab({ selected, banking, showToast, onSaveDoc }) {
  const [tiers, setTiers] = useState({})
  const [addons, setAddons] = useState({})
  const [pagesQty, setPagesQty] = useState(1)
  const [retainers, setRetainers] = useState({})
  const [openCats, setOpenCats] = useState({ websites: true })
  const [invoice, setInvoice] = useState(null)
  const [proposal, setProposal] = useState(null)

  const lineItems = useMemo(
    () => buildLineItems(tiers, addons, pagesQty),
    [tiers, addons, pagesQty],
  )
  const subtotal = useMemo(
    () => lineItems.reduce((s, i) => s + i.price, 0),
    [lineItems],
  )
  const retainerItems = useMemo(
    () => RETAINERS.filter((r) => retainers[r.id]),
    [retainers],
  )
  const monthly = useMemo(
    () => retainerItems.reduce((s, r) => s + r.price, 0),
    [retainerItems],
  )

  function toggleTier(catKey, tierId) {
    setTiers((t) => ({ ...t, [catKey]: t[catKey] === tierId ? undefined : tierId }))
  }
  function toggleAddon(id) {
    setAddons((a) => ({ ...a, [id]: !a[id] }))
  }
  function toggleRetainer(id) {
    setRetainers((r) => ({ ...r, [id]: !r[id] }))
  }
  function toggleCat(key) {
    setOpenCats((o) => ({ ...o, [key]: !o[key] }))
  }

  function clientInfo() {
    return {
      name: selected?.contact_name || selected?.company_name || '',
      email: selected?.contact_email || '',
      company: selected?.company_name || '',
    }
  }

  function generateInvoice() {
    if (lineItems.length === 0 && retainerItems.length === 0) {
      showToast('Select at least one service')
      return
    }
    const number = nextInvoiceNumber()
    const today = new Date()
    const due = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
    setProposal(null)
    setInvoice({
      number,
      date: today.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      dueDate: due.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      client: clientInfo(),
      items: lineItems,
      retainers: retainerItems,
      subtotal,
      monthly,
    })
  }

  function generateProposal() {
    if (lineItems.length === 0 && retainerItems.length === 0) {
      showToast('Select at least one service')
      return
    }
    const ci = clientInfo()
    const lines = []
    lines.push('PROJECT PROPOSAL')
    lines.push('')
    lines.push(`Prepared for: ${ci.company || ci.name || 'Prospective Client'}`)
    if (ci.name && ci.company) lines.push(`Attn: ${ci.name}`)
    lines.push(`Date: ${new Date().toLocaleDateString()}`)
    lines.push('')
    lines.push('EXECUTIVE SUMMARY')
    lines.push(
      `Lithos Labs proposes the following digital systems engagement for ${
        ci.company || 'your business'
      }, designed to streamline operations and accelerate growth.`,
    )
    lines.push('')
    lines.push('SCOPE & DELIVERABLES')
    for (const it of lineItems) lines.push(`  • ${it.name} — ${money(it.price)}`)
    lines.push('')
    if (retainerItems.length) {
      lines.push('ONGOING MANAGEMENT (MONTHLY)')
      for (const r of retainerItems) lines.push(`  • ${r.name} — ${money(r.price)}/mo`)
      lines.push('')
    }
    lines.push('INVESTMENT')
    lines.push(`  One-time total: ${money(subtotal)}`)
    if (monthly) lines.push(`  Monthly retainer: ${money(monthly)}/mo`)
    lines.push('')
    lines.push('TIMELINE')
    lines.push('  Estimated delivery: 2–4 weeks from project kickoff.')
    lines.push('')
    lines.push('NEXT STEPS')
    lines.push(
      '  Approve this proposal and we will issue an invoice and onboarding schedule to begin immediately.',
    )
    setInvoice(null)
    setProposal({
      title:
        'Proposal — ' + (ci.company || ci.name || new Date().toLocaleDateString()),
      content: lines.join('\n'),
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        {/* LEFT 60% — selector */}
        <div style={{ ...card, flex: '1 1 58%', minWidth: 320, padding: 18 }}>
          <h3
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: '#fff',
              marginBottom: 14,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Calculator size={14} /> Estimate Calculator
          </h3>

          {CATALOG.map((cat) => {
            const isOpen = !!openCats[cat.key]
            return (
              <div
                key={cat.key}
                style={{
                  border: '0.5px solid rgba(255,255,255,0.07)',
                  borderRadius: 10,
                  marginBottom: 10,
                  overflow: 'hidden',
                }}
              >
                <button
                  type="button"
                  onClick={() => toggleCat(cat.key)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 14px',
                    background: 'rgba(255,255,255,0.02)',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>
                    {cat.label}
                  </span>
                  <ChevronDown
                    size={15}
                    style={{
                      color: 'rgba(255,255,255,0.4)',
                      transform: isOpen ? 'rotate(180deg)' : 'none',
                      transition: 'transform 0.18s',
                    }}
                  />
                </button>
                {isOpen && (
                  <div style={{ padding: '6px 14px 14px' }}>
                    {cat.tiers.map((t) => {
                      const active = tiers[cat.key] === t.id
                      return (
                        <SelectRow
                          key={t.id}
                          type="radio"
                          active={active}
                          label={t.name}
                          price={t.price}
                          onClick={() => toggleTier(cat.key, t.id)}
                        />
                      )
                    })}
                    {cat.addons.length > 0 && (
                      <div
                        style={{
                          fontSize: 10.5,
                          fontWeight: 600,
                          letterSpacing: '0.4px',
                          color: 'rgba(255,255,255,0.3)',
                          textTransform: 'uppercase',
                          margin: '12px 0 6px',
                        }}
                      >
                        Add-ons
                      </div>
                    )}
                    {cat.addons.map((a) => {
                      const active = !!addons[a.id]
                      return (
                        <div key={a.id}>
                          <SelectRow
                            type="check"
                            active={active}
                            label={a.name}
                            price={a.price}
                            onClick={() => toggleAddon(a.id)}
                          />
                          {a.qty && active && (
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                padding: '4px 0 8px 30px',
                              }}
                            >
                              <span
                                style={{
                                  fontSize: 12,
                                  color: 'rgba(255,255,255,0.5)',
                                }}
                              >
                                Pages:
                              </span>
                              <input
                                type="number"
                                min={1}
                                value={pagesQty}
                                onChange={(e) =>
                                  setPagesQty(Math.max(1, Number(e.target.value) || 1))
                                }
                                style={{ ...inputStyle, width: 80, padding: '6px 8px' }}
                              />
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}

          {/* Monthly retainer */}
          <div
            style={{
              border: '0.5px solid rgba(194,181,155,0.15)',
              borderRadius: 10,
              marginTop: 4,
              padding: '12px 14px',
            }}
          >
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: '#C2B59B',
                marginBottom: 8,
              }}
            >
              Monthly Retainer (optional)
            </div>
            {RETAINERS.map((r) => (
              <SelectRow
                key={r.id}
                type="check"
                active={!!retainers[r.id]}
                label={r.name}
                price={r.price}
                suffix="/mo"
                onClick={() => toggleRetainer(r.id)}
              />
            ))}
          </div>
        </div>

        {/* RIGHT 40% — breakdown */}
        <div
          style={{
            ...card,
            flex: '1 1 36%',
            minWidth: 280,
            padding: 18,
            position: 'sticky',
            top: 16,
          }}
        >
          <h3
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: '#fff',
              marginBottom: 14,
            }}
          >
            Price Breakdown
          </h3>

          {lineItems.length === 0 && retainerItems.length === 0 ? (
            <div
              style={{
                fontSize: 12.5,
                color: 'rgba(255,255,255,0.35)',
                padding: '24px 0',
                textAlign: 'center',
              }}
            >
              Select services to see the estimate
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {lineItems.map((i) => (
                <div
                  key={i.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 12,
                    fontSize: 12.5,
                    color: i.addon
                      ? 'rgba(255,255,255,0.55)'
                      : 'rgba(255,255,255,0.85)',
                    paddingLeft: i.addon ? 12 : 0,
                  }}
                >
                  <span style={{ minWidth: 0 }}>
                    {i.addon ? '+ ' : ''}
                    {i.name}
                  </span>
                  <span style={{ whiteSpace: 'nowrap' }}>{money(i.price)}</span>
                </div>
              ))}
            </div>
          )}

          {(lineItems.length > 0 || retainerItems.length > 0) && (
            <>
              <div
                style={{
                  borderTop: '0.5px solid rgba(255,255,255,0.1)',
                  margin: '14px 0',
                }}
              />
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: 13,
                  color: 'rgba(255,255,255,0.7)',
                }}
              >
                <span>Subtotal</span>
                <span>{money(subtotal)}</span>
              </div>
              {monthly > 0 && (
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: 13,
                    color: '#C2B59B',
                    marginTop: 8,
                  }}
                >
                  <span>Monthly</span>
                  <span>{money(monthly)}/mo</span>
                </div>
              )}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  marginTop: 16,
                  paddingTop: 16,
                  borderTop: '0.5px solid rgba(194,181,155,0.2)',
                }}
              >
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>
                  Total
                </span>
                <span style={{ fontSize: 30, fontWeight: 700, color: '#C2B59B' }}>
                  {money(subtotal)}
                </span>
              </div>

              <button
                type="button"
                onClick={generateInvoice}
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
                  cursor: 'pointer',
                }}
              >
                Generate Invoice
              </button>
              <button
                type="button"
                onClick={generateProposal}
                style={{
                  width: '100%',
                  marginTop: 10,
                  background: 'rgba(255,255,255,0.04)',
                  color: '#fff',
                  border: '0.5px solid rgba(255,255,255,0.12)',
                  borderRadius: 12,
                  padding: 13,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Generate Proposal
              </button>
            </>
          )}
        </div>
      </div>

      {proposal && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <ActionBtn
              icon={Download}
              label="Download PDF"
              onClick={() => window.print()}
            />
            <ActionBtn
              icon={Save}
              label="Save Proposal"
              onClick={() => onSaveDoc('Proposal', proposal.title, proposal.content)}
            />
            <ActionBtn
              icon={Copy}
              label="Copy"
              onClick={() => {
                navigator.clipboard.writeText(proposal.content)
                showToast('Copied to clipboard')
              }}
            />
          </div>
          <div
            id="invoice-print-area"
            style={{ background: '#fff', color: '#111', padding: 40, borderRadius: 12 }}
          >
            <div style={{ fontWeight: 700, fontSize: 18, letterSpacing: '0.5px' }}>
              LITHOS LABS
            </div>
            <hr
              style={{
                border: 'none',
                borderTop: '2px solid #111',
                margin: '12px 0 20px',
              }}
            />
            <div
              style={{
                whiteSpace: 'pre-wrap',
                fontSize: 14,
                lineHeight: 1.7,
                fontFamily: 'Georgia, serif',
              }}
            >
              {proposal.content}
            </div>
          </div>
        </div>
      )}

      {invoice && (
        <InvoicePreview
          invoice={invoice}
          banking={banking}
          onSave={() =>
            onSaveDoc(
              'Invoice',
              `${invoice.number} — ${invoice.client.company || invoice.client.name}`,
              invoiceText(invoice),
            )
          }
          showToast={showToast}
        />
      )}
    </div>
  )
}

function SelectRow({ type, active, label, price, suffix, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '8px 4px',
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        textAlign: 'left',
      }}
    >
      <span
        style={{
          width: 16,
          height: 16,
          flexShrink: 0,
          borderRadius: type === 'radio' ? '50%' : 5,
          border: active
            ? '1px solid #C2B59B'
            : '1px solid rgba(255,255,255,0.25)',
          background: active ? '#C2B59B' : 'transparent',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {active && (
          <span
            style={{
              width: type === 'radio' ? 6 : 8,
              height: type === 'radio' ? 6 : 8,
              borderRadius: type === 'radio' ? '50%' : 2,
              background: '#0B0B0D',
            }}
          />
        )}
      </span>
      <span
        style={{
          flex: 1,
          minWidth: 0,
          fontSize: 12.5,
          color: active ? '#fff' : 'rgba(255,255,255,0.7)',
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: 12.5,
          fontWeight: 600,
          color: active ? '#C2B59B' : 'rgba(255,255,255,0.45)',
          whiteSpace: 'nowrap',
        }}
      >
        {money(price)}
        {suffix || ''}
      </span>
    </button>
  )
}

// Plain-text representation stored in the documents table.
function invoiceText(inv) {
  const lines = []
  lines.push(`INVOICE ${inv.number}`)
  lines.push(`Date: ${inv.date}   Due: ${inv.dueDate}`)
  lines.push('')
  lines.push(`Bill To: ${inv.client.company || inv.client.name}`)
  if (inv.client.name) lines.push(inv.client.name)
  if (inv.client.email) lines.push(inv.client.email)
  lines.push('')
  lines.push('Services:')
  for (const it of inv.items) lines.push(`  ${it.name}  —  ${money(it.price)}`)
  if (inv.retainers.length) {
    lines.push('')
    lines.push('Monthly retainer:')
    for (const r of inv.retainers) lines.push(`  ${r.name}  —  ${money(r.price)}/mo`)
  }
  lines.push('')
  lines.push(`Subtotal: ${money(inv.subtotal)}`)
  if (inv.monthly) lines.push(`Monthly: ${money(inv.monthly)}/mo`)
  lines.push(`Total Due: ${money(inv.subtotal)}`)
  return lines.join('\n')
}

function InvoicePreview({ invoice, banking, onSave, showToast }) {
  function sendWhatsApp() {
    const num = (banking.whatsappNumber || '').replace(/[^0-9]/g, '')
    if (!num) {
      showToast('Add your WhatsApp number in Banking Info')
      return
    }
    const text = `Invoice ${invoice.number} for ${money(invoice.subtotal)} is ready`
    window.open(
      `https://wa.me/${num}?text=${encodeURIComponent(text)}`,
      '_blank',
    )
  }

  const labelCell = {
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '0.5px',
    color: '#888',
    textTransform: 'uppercase',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="no-print" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <ActionBtn icon={Download} label="Download PDF" onClick={() => window.print()} />
        <ActionBtn icon={Save} label="Save Invoice" onClick={onSave} />
        <ActionBtn icon={MessageCircle} label="Send via WhatsApp" onClick={sendWhatsApp} />
      </div>

      <div
        id="invoice-print-area"
        style={{
          background: '#ffffff',
          color: '#111',
          padding: 48,
          borderRadius: 12,
          fontFamily: 'Helvetica, Arial, sans-serif',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 24,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
            <img
              src="/lithos-logo.png"
              width={40}
              alt="Lithos Labs"
              style={{ display: 'block' }}
            />
            <div>
              <div style={{ fontWeight: 700, fontSize: 20, letterSpacing: '0.5px' }}>
                LITHOS LABS
              </div>
              <div style={{ fontSize: 12, color: '#666', marginTop: 3 }}>
                Professional Digital Systems
              </div>
              <div style={{ fontSize: 12, color: '#666', marginTop: 6 }}>
                lithoslabs.com
              </div>
              <div style={{ fontSize: 12, color: '#666' }}>hello@lithoslabs.com</div>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div
              style={{
                fontSize: 30,
                fontWeight: 700,
                letterSpacing: '2px',
                color: '#111',
              }}
            >
              INVOICE
            </div>
            <div style={{ fontSize: 12.5, color: '#444', marginTop: 10 }}>
              <strong>{invoice.number}</strong>
            </div>
            <div style={{ fontSize: 12.5, color: '#666', marginTop: 4 }}>
              Date: {invoice.date}
            </div>
            <div style={{ fontSize: 12.5, color: '#666' }}>
              Due Date: {invoice.dueDate}
            </div>
          </div>
        </div>

        <div
          style={{ borderTop: '2px solid #111', margin: '28px 0 24px' }}
        />

        {/* Bill to */}
        <div style={{ marginBottom: 28 }}>
          <div style={labelCell}>Bill To</div>
          <div style={{ fontSize: 15, fontWeight: 600, marginTop: 8 }}>
            {invoice.client.company || invoice.client.name || '—'}
          </div>
          {invoice.client.name && invoice.client.company && (
            <div style={{ fontSize: 13, color: '#444', marginTop: 2 }}>
              {invoice.client.name}
            </div>
          )}
          {invoice.client.email && (
            <div style={{ fontSize: 13, color: '#444', marginTop: 2 }}>
              {invoice.client.email}
            </div>
          )}
        </div>

        {/* Services table */}
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1.5px solid #111' }}>
              <th
                style={{
                  textAlign: 'left',
                  padding: '10px 0',
                  ...labelCell,
                }}
              >
                Service
              </th>
              <th
                style={{
                  textAlign: 'right',
                  padding: '10px 0',
                  ...labelCell,
                }}
              >
                Price
              </th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((it) => (
              <tr key={it.id} style={{ borderBottom: '1px solid #eee' }}>
                <td
                  style={{
                    padding: '11px 0',
                    fontSize: 13.5,
                    color: it.addon ? '#555' : '#111',
                    paddingLeft: it.addon ? 16 : 0,
                  }}
                >
                  {it.addon ? '↳ ' : ''}
                  {it.name}
                </td>
                <td
                  style={{
                    padding: '11px 0',
                    fontSize: 13.5,
                    textAlign: 'right',
                    color: '#111',
                  }}
                >
                  {money(it.price)}
                </td>
              </tr>
            ))}
            {invoice.retainers.map((r) => (
              <tr key={r.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '11px 0', fontSize: 13.5, color: '#111' }}>
                  {r.name} (monthly)
                </td>
                <td
                  style={{
                    padding: '11px 0',
                    fontSize: 13.5,
                    textAlign: 'right',
                    color: '#111',
                  }}
                >
                  {money(r.price)}/mo
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            marginTop: 22,
          }}
        >
          <div style={{ width: 280 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: 13.5,
                color: '#444',
                padding: '6px 0',
              }}
            >
              <span>Subtotal</span>
              <span>{money(invoice.subtotal)}</span>
            </div>
            {invoice.monthly > 0 && (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: 13.5,
                  color: '#444',
                  padding: '6px 0',
                }}
              >
                <span>Monthly Retainer</span>
                <span>{money(invoice.monthly)}/mo</span>
              </div>
            )}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                marginTop: 10,
                paddingTop: 14,
                borderTop: '2px solid #111',
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 700, color: '#111' }}>
                TOTAL DUE
              </span>
              <span style={{ fontSize: 26, fontWeight: 700, color: '#9c8f74' }}>
                {money(invoice.subtotal)}
              </span>
            </div>
          </div>
        </div>

        {/* Payment details */}
        <div
          style={{
            marginTop: 36,
            padding: 20,
            background: '#f7f6f3',
            borderRadius: 8,
          }}
        >
          <div style={labelCell}>Payment Details</div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '8px 24px',
              marginTop: 12,
              fontSize: 13,
              color: '#333',
            }}
          >
            <div>
              <strong>Bank:</strong> {banking.bankName || '—'}
            </div>
            <div>
              <strong>Account Name:</strong> {banking.accountName || 'Lithos Labs'}
            </div>
            <div>
              <strong>Account Number:</strong> {banking.accountNumber || '—'}
            </div>
            <div>
              <strong>Payment Reference:</strong> {invoice.number}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            marginTop: 32,
            textAlign: 'center',
            fontSize: 12.5,
            color: '#666',
            lineHeight: 1.8,
          }}
        >
          <div style={{ fontWeight: 600, color: '#111' }}>
            Thank you for your business
          </div>
          <div>Payment is due within 7 days</div>
          <div>Questions? Contact us at hello@lithoslabs.com</div>
        </div>
      </div>
    </div>
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

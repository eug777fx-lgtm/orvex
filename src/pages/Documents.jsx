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

// ---- Estimate calculator catalog (official Lithos Labs pricing, USD + AWG) ----
const CATALOG = {
  packages: [
    {
      id: 'landing',
      name: 'Landing Page',
      subtitle: 'Fast, focused, and built to convert.',
      description:
        'A single high-converting page designed to turn visitors into leads or customers. Perfect for campaigns, product launches, or businesses that need a professional online presence fast.',
      price_usd: 500,
      price_awg: 900,
      ideal_for: 'New businesses, campaigns, product launches, freelancers',
      includes: [
        'Single-page design',
        'Mobile responsive design',
        'Contact form',
        'Basic SEO setup',
        'Social media integration',
        'WhatsApp button',
        'Google Analytics',
        'Delivered in 7 days',
      ],
      delivery_days: 7,
    },
    {
      id: 'business',
      name: 'Business Website',
      subtitle: 'Your complete digital presence, built professionally.',
      description:
        'A full multi-page website that represents your business, builds credibility, and generates leads. Includes everything a modern business needs to compete online.',
      price_usd: 700,
      price_awg: 1250,
      ideal_for: 'Established small businesses, service providers, local companies',
      includes: [
        'Up to 5 pages',
        'Mobile responsive design',
        'Contact form',
        'Basic SEO setup',
        'Social media integration',
        'WhatsApp button',
        'Google Analytics',
        'About, Services, Contact pages',
        'Delivered in 14 days',
      ],
      delivery_days: 14,
    },
    {
      id: 'premium',
      name: 'Premium Custom Website',
      subtitle: 'A fully custom digital system built for growth.',
      description:
        'A premium, fully custom-built website with advanced features, custom animations, and deep integrations. Built for businesses that want to stand out and scale.',
      price_usd: 1200,
      price_awg: 2150,
      ideal_for: 'Growing businesses, brands targeting premium clients, multi-service companies',
      includes: [
        'Up to 10 pages',
        'Mobile responsive design',
        'Custom animations & micro-interactions',
        'Advanced contact forms',
        'Full SEO setup',
        'Social media integration',
        'Google Analytics + Search Console',
        'WhatsApp integration',
        'Blog or news section',
        'Speed optimization (90+ PageSpeed)',
        'Delivered in 21 days',
      ],
      delivery_days: 21,
    },
  ],
  addons: [
    {
      id: 'booking',
      name: 'Booking System',
      category: 'Add-On Services',
      description:
        'Let customers book appointments, services, or consultations directly on your website. Includes automated confirmation emails and WhatsApp reminders. No more back-and-forth scheduling.',
      price_usd: 300,
      price_awg: 540,
      type: 'fixed',
      billing: 'one-time',
    },
    {
      id: 'automation',
      name: 'Automation System',
      category: 'Add-On Services',
      description:
        'Automate your business workflows — missed call text-back, lead follow-up sequences, appointment reminders, review requests, and more. Powered by Make.com. Set it up once, runs forever.',
      price_usd: 300,
      price_awg: 540,
      type: 'fixed',
      billing: 'monthly',
    },
    {
      id: 'crm',
      name: 'CRM Setup & Integrations',
      category: 'Add-On Services',
      description:
        'A complete CRM system to manage your leads, clients, deals, and team in one place. Custom-built for your business workflow. Includes pipeline setup, automation triggers, and team access.',
      price_usd: 1000,
      price_awg: 1800,
      type: 'fixed',
      billing: 'one-time',
    },
  ],
  retainers: [
    {
      id: 'maintenance',
      name: 'Monthly Maintenance & Support',
      description:
        'Ongoing support, updates, monitoring, and everything needed to keep your website and systems running smoothly every month. Pricing depends on the size and complexity of your project — discussed and agreed before starting.',
      price_note: 'Custom — based on project size',
      price_usd: null,
      price_awg: null,
    },
  ],
}

// Single category in the new architecture — kept for backwards-compatible
// grouping logic in the calculator UI.
const ADDON_CATEGORIES = ['Add-On Services']

// AWG formatter (Aruban florin) — `money` continues to format USD.
const awg = (n) => 'AWG ' + (Number(n) || 0).toLocaleString()

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
  background: 'rgba(255, 255, 255,0.03)',
  border: '0.5px solid rgba(255, 255, 255,0.08)',
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
                color: '#FFFFFF',
                background: 'rgba(255, 255, 255,0.08)',
                border: '0.5px solid rgba(255, 255, 255,0.2)',
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
                        ? 'rgba(255, 255, 255,0.1)'
                        : 'transparent',
                      border: active
                        ? '0.5px solid rgba(255, 255, 255,0.25)'
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
                            ? '#FFFFFF'
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
                      color: active ? '#000000' : 'rgba(255,255,255,0.7)',
                      background: active ? '#FFFFFF' : 'rgba(255,255,255,0.03)',
                      border: active
                        ? '0.5px solid #FFFFFF'
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
              background: '#1A1A1A',
              border: '0.5px solid rgba(255, 255, 255,0.2)',
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
                  color: '#FFFFFF',
                  background: 'rgba(255, 255, 255,0.1)',
                  border: '0.5px solid rgba(255, 255, 255,0.2)',
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
                  color: '#FFFFFF',
                  background: 'rgba(255, 255, 255,0.1)',
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
                style={{ ...iconBtn, color: 'rgba(255, 68, 68,0.7)' }}
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
              background: '#FFFFFF',
              color: '#000000',
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
// Build invoice/proposal line items from calculator selections. Each item:
// { id, name, price (USD), awg, group, addon?, billing? }. Monthly addons go
// in `items` like the rest but with `billing: 'monthly'` so the summary can
// separate one-time vs recurring totals. InvoicePreview / invoiceText only
// rely on { id, name, price, group, addon } so older code keeps working.
function buildLineItems(packageId, selectedAddons) {
  const items = []
  if (packageId) {
    const pkg = CATALOG.packages.find((p) => p.id === packageId)
    if (pkg) {
      items.push({
        id: pkg.id,
        name: `${pkg.name} Package`,
        price: pkg.price_usd,
        awg: pkg.price_awg,
        group: 'Package',
        billing: 'one-time',
      })
    }
  }
  for (const a of CATALOG.addons) {
    if (!selectedAddons[a.id]) continue
    items.push({
      id: a.id,
      name: a.name,
      price: a.price_usd,
      awg: a.price_awg,
      group: a.category,
      addon: true,
      billing: a.billing || 'one-time',
    })
  }
  return items
}

function EstimatesTab({ selected, banking, showToast, onSaveDoc }) {
  const [selectedPackage, setSelectedPackage] = useState(null)
  const [selectedAddons, setSelectedAddons] = useState({})
  const [selectedRetainer, setSelectedRetainer] = useState(null)
  const [invoice, setInvoice] = useState(null)
  const [proposal, setProposal] = useState(null)
  const [generating, setGeneratingPdf] = useState(null) // 'invoice' | 'proposal' | 'contract' | null

  // Client info — free-form inputs at top of the calculator. Pre-fill from the
  // selected client (sidebar) when present, but allow override.
  const [clientName, setClientName] = useState('')
  const [clientCompany, setClientCompany] = useState('')
  const [clientEmail, setClientEmail] = useState('')

  useEffect(() => {
    if (selected) {
      setClientName(selected.contact_name || '')
      setClientCompany(selected.company_name || '')
      setClientEmail(selected.contact_email || '')
    }
  }, [selected])

  const pkg = useMemo(
    () => CATALOG.packages.find((p) => p.id === selectedPackage) || null,
    [selectedPackage],
  )
  const lineItems = useMemo(
    () => buildLineItems(selectedPackage, selectedAddons),
    [selectedPackage, selectedAddons],
  )
  // Separate one-time vs monthly so totals split cleanly. Retainer (if priced)
  // counts toward monthly too; the current one is null-priced ("Custom").
  const oneTimeItems = useMemo(
    () => lineItems.filter((i) => (i.billing || 'one-time') === 'one-time'),
    [lineItems],
  )
  const monthlyItems = useMemo(
    () => lineItems.filter((i) => i.billing === 'monthly'),
    [lineItems],
  )
  const subtotal = useMemo(
    () => oneTimeItems.reduce((s, i) => s + (i.price || 0), 0),
    [oneTimeItems],
  )
  const subtotalAwg = useMemo(
    () => oneTimeItems.reduce((s, i) => s + (i.awg || 0), 0),
    [oneTimeItems],
  )
  const monthly = useMemo(
    () => monthlyItems.reduce((s, i) => s + (i.price || 0), 0),
    [monthlyItems],
  )
  const monthlyAwg = useMemo(
    () => monthlyItems.reduce((s, i) => s + (i.awg || 0), 0),
    [monthlyItems],
  )
  const retainer = useMemo(
    () => CATALOG.retainers.find((r) => r.id === selectedRetainer) || null,
    [selectedRetainer],
  )
  const retainerItems = useMemo(() => (retainer ? [retainer] : []), [retainer])

  function pickPackage(id) {
    setSelectedPackage((cur) => (cur === id ? null : id))
  }
  function toggleAddon(id) {
    setSelectedAddons((a) => ({ ...a, [id]: !a[id] }))
  }
  function pickRetainer(id) {
    setSelectedRetainer((cur) => (cur === id ? null : id))
  }

  function clientInfo() {
    return {
      name: selected?.contact_name || selected?.company_name || '',
      email: selected?.contact_email || '',
      company: selected?.company_name || '',
    }
  }

  // Collect selected addon ids as a plain array — the underlying state is a
  // {id:bool} map; the PDF builders below want a clean iterable.
  function selectedAddonIds() {
    return Object.keys(selectedAddons).filter((id) => selectedAddons[id])
  }

  function buildPdfLineItems() {
    const items = []
    if (selectedPackage) {
      const p = CATALOG.packages.find((x) => x.id === selectedPackage)
      if (p)
        items.push({
          name: p.name,
          description: p.subtitle,
          price_usd: p.price_usd,
          price_awg: p.price_awg,
        })
    }
    for (const id of selectedAddonIds()) {
      const a = CATALOG.addons.find((x) => x.id === id)
      if (a)
        items.push({
          name: a.name,
          description: a.description,
          price_usd: a.price_usd,
          price_awg: a.price_awg,
        })
    }
    if (selectedRetainer) {
      const r = CATALOG.retainers.find((x) => x.id === selectedRetainer)
      if (r)
        items.push({
          name: r.name + ' (Monthly Retainer)',
          description: r.description,
          price_usd: r.price_usd ?? 0,
          price_awg: r.price_awg ?? 0,
        })
    }
    return items
  }

  function pdfTotals(items) {
    return {
      total_usd: items.reduce((s, i) => s + (i.price_usd || 0), 0),
      total_awg: items.reduce((s, i) => s + (i.price_awg || 0), 0),
    }
  }

  // Trigger a browser download from a PDF blob. PDF generation lives inside
  // /api/workflow under action=generate_pdf (single function — Vercel Hobby
  // plan only allows 12 serverless functions, so we can't split it out).
  async function downloadPdf(type, payload) {
    setGeneratingPdf(type)
    try {
      const res = await fetch('/api/workflow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate_pdf', type, data: payload }),
      })
      if (!res.ok) {
        const text = await res.text().catch(() => '')
        showToast(`PDF generation failed${text ? ': ' + text.slice(0, 80) : ''}`)
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Lithos-Labs-${type[0].toUpperCase() + type.slice(1)}-${Date.now()}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      setTimeout(() => URL.revokeObjectURL(url), 1000)
      showToast(`${type[0].toUpperCase() + type.slice(1)} PDF downloaded`)
    } catch (e) {
      showToast('PDF generation failed')
    } finally {
      setGeneratingPdf(null)
    }
  }

  async function generateInvoice() {
    if (!selectedPackage && selectedAddonIds().length === 0 && !selectedRetainer) {
      showToast('Select at least one service')
      return
    }
    const items = buildPdfLineItems()
    const { total_usd, total_awg } = pdfTotals(items)
    await downloadPdf('invoice', {
      client_name: clientName || 'Client Name',
      client_email: clientEmail || '',
      client_company: clientCompany || '',
      invoice_number: 'INV-' + Date.now().toString().slice(-6),
      invoice_date: new Date().toLocaleDateString(),
      due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString(),
      line_items: items,
      total_usd,
      total_awg,
    })
  }

  async function generateProposal() {
    if (!selectedPackage && selectedAddonIds().length === 0 && !selectedRetainer) {
      showToast('Select at least one service')
      return
    }
    const scope_items = []
    if (selectedPackage) {
      const p = CATALOG.packages.find((x) => x.id === selectedPackage)
      if (p?.includes) scope_items.push(...p.includes)
    }
    for (const id of selectedAddonIds()) {
      const a = CATALOG.addons.find((x) => x.id === id)
      if (a) scope_items.push(a.name)
    }
    if (selectedRetainer) {
      const r = CATALOG.retainers.find((x) => x.id === selectedRetainer)
      if (r) scope_items.push(r.name + ' (Monthly Retainer)')
    }

    const items = buildPdfLineItems()
    const { total_usd, total_awg } = pdfTotals(items)
    const pkgRow = CATALOG.packages.find((x) => x.id === selectedPackage)

    await downloadPdf('proposal', {
      client_name: clientName || 'Client Name',
      client_company: clientCompany || '',
      proposal_date: new Date().toLocaleDateString(),
      valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString(),
      project_name: pkgRow ? pkgRow.name + ' Package' : 'Custom Project',
      scope_items,
      total_usd,
      total_awg,
      timeline: pkgRow ? `${pkgRow.delivery_days} business days` : 'To be confirmed',
    })
  }

  async function generateContract() {
    if (!selectedPackage && selectedAddonIds().length === 0 && !selectedRetainer) {
      showToast('Select at least one service')
      return
    }
    const scope_items = []
    if (selectedPackage) {
      const p = CATALOG.packages.find((x) => x.id === selectedPackage)
      if (p?.includes) scope_items.push(...p.includes)
    }
    for (const id of selectedAddonIds()) {
      const a = CATALOG.addons.find((x) => x.id === id)
      if (a) scope_items.push(a.name)
    }
    if (selectedRetainer) {
      const r = CATALOG.retainers.find((x) => x.id === selectedRetainer)
      if (r) scope_items.push(r.name + ' (Monthly Retainer)')
    }

    const items = buildPdfLineItems()
    const { total_usd } = pdfTotals(items)
    const pkgRow = CATALOG.packages.find((x) => x.id === selectedPackage)
    const days = pkgRow?.delivery_days || 14

    await downloadPdf('contract', {
      contract_number: 'LTH-' + Date.now().toString().slice(-6),
      contract_date: new Date().toLocaleDateString(),
      client_name: clientName || 'Client Name',
      client_company: clientCompany || '',
      client_email: clientEmail || '',
      project_name: pkgRow ? pkgRow.name + ' Package' : 'Custom Project',
      scope_items,
      total_usd,
      payment_terms: '50% upfront, 50% on delivery',
      start_date: new Date().toLocaleDateString(),
      delivery_date: new Date(Date.now() + days * 24 * 60 * 60 * 1000).toLocaleDateString(),
      revision_rounds: '2 revision rounds included',
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        {/* LEFT 60% — selector */}
        <div
          style={{
            ...card,
            flex: '1 1 58%',
            minWidth: 320,
            padding: 22,
            display: 'flex',
            flexDirection: 'column',
            gap: 22,
          }}
        >
          <h3
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Calculator size={14} /> Estimate Calculator
          </h3>

          {/* Client info — used in generated PDFs */}
          <section>
            <SectionLabel>Client info — appears on every PDF</SectionLabel>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: 10,
                marginTop: 8,
              }}
            >
              <div>
                <label style={labelStyle}>Client name</label>
                <input
                  style={inputStyle}
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="John Doe"
                />
              </div>
              <div>
                <label style={labelStyle}>Company</label>
                <input
                  style={inputStyle}
                  value={clientCompany}
                  onChange={(e) => setClientCompany(e.target.value)}
                  placeholder="Acme Inc."
                />
              </div>
              <div>
                <label style={labelStyle}>Email</label>
                <input
                  style={inputStyle}
                  type="email"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  placeholder="client@example.com"
                />
              </div>
            </div>
          </section>

          {/* Packages */}
          <section>
            <SectionLabel>Packages — pick one</SectionLabel>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                gap: 10,
                marginTop: 8,
              }}
            >
              {CATALOG.packages.map((p) => (
                <PackageCard
                  key={p.id}
                  pkg={p}
                  active={selectedPackage === p.id}
                  onClick={() => pickPackage(p.id)}
                />
              ))}
            </div>
          </section>

          {/* Add-Ons — flat list (single category in the current catalog) */}
          <section>
            <SectionLabel>Add-On Services</SectionLabel>
            <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {CATALOG.addons.map((a) => (
                <AddonRow
                  key={a.id}
                  addon={a}
                  active={!!selectedAddons[a.id]}
                  onToggle={() => toggleAddon(a.id)}
                />
              ))}
            </div>
          </section>

          {/* Retainers */}
          <section>
            <SectionLabel>Monthly retainer — pick one (optional)</SectionLabel>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                gap: 10,
                marginTop: 8,
              }}
            >
              {CATALOG.retainers.map((r) => (
                <RetainerCard
                  key={r.id}
                  retainer={r}
                  active={selectedRetainer === r.id}
                  onClick={() => pickRetainer(r.id)}
                />
              ))}
            </div>
          </section>
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

          {lineItems.length === 0 && !retainer ? (
            <div
              style={{
                fontSize: 12.5,
                color: 'rgba(255,255,255,0.35)',
                padding: '24px 0',
                textAlign: 'center',
              }}
            >
              Select a package, add-ons, or retainer to see the estimate
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {oneTimeItems.length > 0 && (
                <SummaryGroupHeader>One-Time</SummaryGroupHeader>
              )}
              {oneTimeItems.map((i) => (
                <SummaryLine key={i.id} item={i} />
              ))}
              {monthlyItems.length > 0 && (
                <SummaryGroupHeader accent>Monthly</SummaryGroupHeader>
              )}
              {monthlyItems.map((i) => (
                <SummaryLine key={i.id} item={i} monthly />
              ))}
              {retainer && (
                <>
                  <SummaryGroupHeader accent>Monthly Retainer</SummaryGroupHeader>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: 12,
                      fontSize: 12.5,
                      color: '#FFFFFF',
                    }}
                  >
                    <span style={{ minWidth: 0 }}>{retainer.name}</span>
                    <span style={{ whiteSpace: 'nowrap', fontStyle: 'italic' }}>Custom</span>
                  </div>
                  <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.4)', marginTop: -4 }}>
                    Discussed per project
                  </div>
                </>
              )}
            </div>
          )}

          {(lineItems.length > 0 || retainer) && (
            <>
              <div
                style={{
                  borderTop: '0.5px solid rgba(255,255,255,0.1)',
                  margin: '14px 0',
                }}
              />
              {subtotal > 0 && (
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                  }}
                >
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
                    One-time total
                  </span>
                  <span style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: 22, fontWeight: 700, color: '#FFFFFF' }}>
                      {money(subtotal)}
                    </span>
                    <span
                      style={{
                        display: 'block',
                        fontSize: 12,
                        color: 'rgba(255, 255, 255,0.6)',
                        marginTop: 2,
                      }}
                    >
                      {awg(subtotalAwg)}
                    </span>
                  </span>
                </div>
              )}
              {monthly > 0 && (
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                    marginTop: 10,
                  }}
                >
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
                    Monthly recurring
                  </span>
                  <span style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: 18, fontWeight: 700, color: '#FFFFFF' }}>
                      {money(monthly)}/mo
                    </span>
                    <span
                      style={{
                        display: 'block',
                        fontSize: 11,
                        color: 'rgba(255, 255, 255,0.6)',
                        marginTop: 2,
                      }}
                    >
                      {awg(monthlyAwg)}/mo
                    </span>
                  </span>
                </div>
              )}
              {retainer && (
                <div
                  style={{
                    fontSize: 11,
                    color: 'rgba(255, 255, 255,0.7)',
                    marginTop: 10,
                    lineHeight: 1.5,
                  }}
                >
                  + Monthly maintenance retainer (custom — discussed per project)
                </div>
              )}

              <button
                type="button"
                onClick={generateInvoice}
                disabled={generating != null}
                style={{
                  width: '100%',
                  marginTop: 18,
                  background: '#FFFFFF',
                  color: '#000000',
                  border: 'none',
                  borderRadius: 12,
                  padding: 13,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: generating ? 'wait' : 'pointer',
                  opacity: generating && generating !== 'invoice' ? 0.5 : 1,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                {generating === 'invoice' && <Loader2 size={14} className="spin" />}
                Generate Invoice PDF
              </button>
              <button
                type="button"
                onClick={generateProposal}
                disabled={generating != null}
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
                  cursor: generating ? 'wait' : 'pointer',
                  opacity: generating && generating !== 'proposal' ? 0.5 : 1,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                {generating === 'proposal' && <Loader2 size={14} className="spin" />}
                Generate Proposal PDF
              </button>
              <button
                type="button"
                onClick={generateContract}
                disabled={generating != null}
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
                  cursor: generating ? 'wait' : 'pointer',
                  opacity: generating && generating !== 'contract' ? 0.5 : 1,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                {generating === 'contract' && <Loader2 size={14} className="spin" />}
                Generate Contract PDF
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

function SectionLabel({ children }) {
  return (
    <div
      style={{
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: '0.6px',
        color: 'rgba(255,255,255,0.45)',
        textTransform: 'uppercase',
      }}
    >
      {children}
    </div>
  )
}

function SummaryGroupHeader({ children, accent }) {
  return (
    <div
      style={{
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: '0.6px',
        color: accent ? 'rgba(255, 255, 255,0.7)' : 'rgba(255,255,255,0.35)',
        textTransform: 'uppercase',
        margin: '6px 0 2px',
      }}
    >
      {children}
    </div>
  )
}

function SummaryLine({ item, monthly }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: 12,
          fontSize: 12.5,
          color: item.addon
            ? 'rgba(255,255,255,0.7)'
            : 'rgba(255,255,255,0.92)',
          paddingLeft: item.addon ? 12 : 0,
        }}
      >
        <span style={{ minWidth: 0 }}>
          {item.addon ? '+ ' : ''}
          {item.name}
        </span>
        <span style={{ whiteSpace: 'nowrap', textAlign: 'right' }}>
          {money(item.price)}{monthly ? '/mo' : ''}
        </span>
      </div>
      {typeof item.awg === 'number' && (
        <div
          style={{
            fontSize: 10.5,
            color: 'rgba(255, 255, 255,0.55)',
            textAlign: 'right',
          }}
        >
          {awg(item.awg)}{monthly ? '/mo' : ''}
        </div>
      )}
    </div>
  )
}

function PackageCard({ pkg, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        textAlign: 'left',
        cursor: 'pointer',
        background: active ? 'rgba(255, 255, 255,0.08)' : 'rgba(255,255,255,0.02)',
        border: active
          ? '0.5px solid rgba(255, 255, 255,0.5)'
          : '0.5px solid rgba(255,255,255,0.08)',
        borderRadius: 12,
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        color: '#fff',
        transition: 'background 120ms, border-color 120ms',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: 8,
        }}
      >
        <span style={{ fontSize: 14, fontWeight: 700 }}>{pkg.name}</span>
        {active && (
          <span
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: '#000000',
              background: '#FFFFFF',
              borderRadius: 6,
              padding: '2px 7px',
            }}
          >
            Selected
          </span>
        )}
      </div>
      <div style={{ fontSize: 11.5, color: 'rgba(255, 255, 255,0.85)' }}>{pkg.subtitle}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span style={{ fontSize: 18, fontWeight: 700, color: '#FFFFFF' }}>
          {money(pkg.price_usd)}
        </span>
        <span style={{ fontSize: 11.5, color: 'rgba(255, 255, 255,0.7)' }}>
          {awg(pkg.price_awg)}
        </span>
      </div>
      <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.5)', lineHeight: 1.45 }}>
        {pkg.description}
      </div>
      <div
        style={{
          fontSize: 10.5,
          color: 'rgba(255,255,255,0.4)',
          lineHeight: 1.45,
        }}
      >
        <strong style={{ color: 'rgba(255,255,255,0.55)', fontWeight: 600 }}>Ideal for:</strong>{' '}
        {pkg.ideal_for}
      </div>
      <ul
        style={{
          listStyle: 'none',
          padding: 0,
          margin: '4px 0 0',
          fontSize: 11.5,
          color: 'rgba(255,255,255,0.65)',
          lineHeight: 1.55,
        }}
      >
        {pkg.includes.map((line, i) => (
          <li key={i} style={{ display: 'flex', gap: 6 }}>
            <span style={{ color: '#FFFFFF' }}>✓</span>
            <span>{line}</span>
          </li>
        ))}
      </ul>
      <div
        style={{
          fontSize: 10.5,
          color: 'rgba(255,255,255,0.35)',
          marginTop: 4,
        }}
      >
        Delivery: {pkg.delivery_days} days
      </div>
    </button>
  )
}

function AddonRow({ addon, active, onToggle }) {
  const isMonthly = addon.billing === 'monthly'
  return (
    <div
      style={{
        padding: '10px 12px',
        borderRadius: 10,
        background: active ? 'rgba(255, 255, 255,0.07)' : 'rgba(255,255,255,0.02)',
        border: active
          ? '0.5px solid rgba(255, 255, 255,0.3)'
          : '0.5px solid rgba(255,255,255,0.06)',
        display: 'flex',
        gap: 12,
        alignItems: 'flex-start',
        cursor: 'pointer',
      }}
      onClick={onToggle}
    >
      <span
        style={{
          width: 16,
          height: 16,
          flexShrink: 0,
          borderRadius: 4,
          border: active ? '1px solid #FFFFFF' : '1px solid rgba(255,255,255,0.25)',
          background: active ? '#FFFFFF' : 'transparent',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginTop: 1,
        }}
        aria-hidden="true"
      >
        {active && (
          <span style={{ width: 8, height: 2, background: '#000000', borderRadius: 1 }} />
        )}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 10,
            alignItems: 'flex-start',
          }}
        >
          <span style={{ display: 'flex', gap: 8, alignItems: 'baseline', flexWrap: 'wrap' }}>
            <span
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: active ? '#fff' : 'rgba(255,255,255,0.85)',
              }}
            >
              {addon.name}
            </span>
            <span
              style={{
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: '0.4px',
                textTransform: 'uppercase',
                color: isMonthly ? 'rgba(255, 255, 255,0.8)' : 'rgba(255,255,255,0.45)',
                background: isMonthly
                  ? 'rgba(255, 255, 255,0.12)'
                  : 'rgba(255,255,255,0.06)',
                border: isMonthly
                  ? '0.5px solid rgba(255, 255, 255,0.3)'
                  : '0.5px solid rgba(255,255,255,0.08)',
                borderRadius: 999,
                padding: '2px 8px',
              }}
            >
              {isMonthly ? 'Monthly' : 'One-time'}
            </span>
          </span>
          <span style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
            <span
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: active ? '#FFFFFF' : 'rgba(255,255,255,0.6)',
              }}
            >
              {money(addon.price_usd)}{isMonthly ? '/mo' : ''}
            </span>
            <span
              style={{
                display: 'block',
                fontSize: 11,
                color: active ? 'rgba(255, 255, 255,0.7)' : 'rgba(255,255,255,0.35)',
                marginTop: 2,
              }}
            >
              {awg(addon.price_awg)}{isMonthly ? '/mo' : ''}
            </span>
          </span>
        </div>
        <div
          style={{
            fontSize: 11.5,
            color: 'rgba(255,255,255,0.5)',
            marginTop: 6,
            lineHeight: 1.45,
          }}
        >
          {addon.description}
        </div>
      </div>
    </div>
  )
}

function RetainerCard({ retainer, active, onClick }) {
  const hasFixedPrice = retainer.price_usd != null
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        textAlign: 'left',
        cursor: 'pointer',
        background: active ? 'rgba(255, 255, 255,0.08)' : 'rgba(255,255,255,0.02)',
        border: active
          ? '0.5px solid rgba(255, 255, 255,0.5)'
          : '0.5px solid rgba(255,255,255,0.08)',
        borderRadius: 12,
        padding: 14,
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        color: '#fff',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: 8,
        }}
      >
        <span style={{ fontSize: 13.5, fontWeight: 700 }}>{retainer.name}</span>
        {hasFixedPrice ? (
          <span style={{ fontSize: 14, fontWeight: 700, color: '#FFFFFF' }}>
            {money(retainer.price_usd)}/mo
          </span>
        ) : (
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: '#FFFFFF',
              fontStyle: 'italic',
            }}
          >
            Custom pricing
          </span>
        )}
      </div>
      {hasFixedPrice && retainer.price_awg != null && (
        <div style={{ fontSize: 11, color: 'rgba(255, 255, 255,0.6)', marginTop: -2 }}>
          {awg(retainer.price_awg)}/mo
        </div>
      )}
      <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.55)', lineHeight: 1.45 }}>
        {retainer.description}
      </div>
      {retainer.price_note && !hasFixedPrice && (
        <div
          style={{
            fontSize: 10.5,
            color: 'rgba(255, 255, 255,0.65)',
            marginTop: 2,
            fontStyle: 'italic',
          }}
        >
          {retainer.price_note}
        </div>
      )}
      {retainer.best_for && (
        <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
          <strong style={{ color: 'rgba(255,255,255,0.55)', fontWeight: 600 }}>Best for:</strong>{' '}
          {retainer.best_for}
        </div>
      )}
    </button>
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
            ? '1px solid #FFFFFF'
            : '1px solid rgba(255,255,255,0.25)',
          background: active ? '#FFFFFF' : 'transparent',
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
              background: '#000000',
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
          color: active ? '#FFFFFF' : 'rgba(255,255,255,0.45)',
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
              <span style={{ fontSize: 26, fontWeight: 700, color: '#FFFFFF' }}>
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
            background: '#FFFFFF',
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
        background: 'rgba(255, 255, 255,0.08)',
        border: '0.5px solid rgba(255, 255, 255,0.2)',
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
          background: '#111111',
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
          <div style={{ color: '#FF4444', fontSize: 12.5, marginTop: 12 }}>{error}</div>
        )}

        <button
          type="button"
          onClick={save}
          disabled={saving}
          style={{
            width: '100%',
            marginTop: 18,
            background: '#FFFFFF',
            color: '#000000',
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

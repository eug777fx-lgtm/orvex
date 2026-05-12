import { useEffect, useMemo, useState } from 'react'
import {
  Plus,
  Copy,
  ChevronDown,
  ChevronUp,
  Check,
  UserPlus,
  Pencil,
  X,
} from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import db from '@/lib/db'
import AddScriptModal from '../components/AddScriptModal'
import { seedScriptsIfEmpty } from '../utils/seedScripts'
import PageShell from '../components/PageShell'
import useIsMobile from '../utils/useIsMobile'

const TYPE_TABS = [
  { value: 'all', label: 'All' },
  { value: 'cold_call', label: 'Cold Call' },
  { value: 'follow_up', label: 'Follow-up' },
  { value: 'objection', label: 'Objection' },
  { value: 'closing', label: 'Closing' },
]

const INDUSTRIES = [
  'All',
  'Plumber',
  'Electrician',
  'HVAC',
  'Pest Control',
  'Landscaping',
  'Cleaning',
  'Clothing Store',
  'Coffee Shop',
  'Smoothie Bar',
  'Food Truck',
  'Restaurant',
  'Bakery',
  'Salon',
  'Barbershop',
  'Gym',
]

const pageHeadingStyle = {
  fontSize: '1.5rem',
  fontWeight: 700,
  color: '#ffffff',
  letterSpacing: '-0.01em',
}

const pageSubStyle = {
  fontSize: 13,
  color: 'rgba(255,255,255,0.45)',
  marginTop: 6,
}

const cardStyle = {
  background: 'rgba(17,17,20,0.7)',
  border: '0.5px solid rgba(255,255,255,0.08)',
  borderRadius: 16,
  padding: '1.5rem',
  display: 'flex',
  flexDirection: 'column',
  gap: 14,
  backdropFilter: 'blur(12px) saturate(160%)',
  WebkitBackdropFilter: 'blur(12px) saturate(160%)',
}

const tabGroupStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.06)',
  padding: 4,
  borderRadius: 999,
}

function tabButtonStyle(active) {
  return {
    padding: '6px 14px',
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 500,
    letterSpacing: '0.01em',
    cursor: 'pointer',
    border: 'none',
    background: active ? '#ffffff' : 'transparent',
    color: active ? '#000000' : 'rgba(255,255,255,0.5)',
    transition: 'all 0.15s ease',
  }
}

const selectStyle = {
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 10,
  color: '#ffffff',
  padding: '9px 32px 9px 14px',
  fontSize: 13,
  fontFamily: 'inherit',
  outline: 'none',
  appearance: 'none',
  WebkitAppearance: 'none',
  backgroundImage:
    'url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'rgba(255,255,255,0.5)\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'><polyline points=\'6 9 12 15 18 9\'></polyline></svg>")',
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 12px center',
  cursor: 'pointer',
}

const addButtonStyle = {
  background: '#ffffff',
  color: '#000000',
  borderRadius: 999,
  padding: '8px 20px',
  fontSize: 13,
  fontWeight: 500,
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  border: 'none',
  cursor: 'pointer',
}

const ghostButtonStyle = {
  background: 'transparent',
  border: '1px solid rgba(255,255,255,0.1)',
  color: 'rgba(255,255,255,0.75)',
  borderRadius: 8,
  padding: '6px 12px',
  fontSize: 11.5,
  fontWeight: 500,
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  cursor: 'pointer',
  transition: 'all 0.15s ease',
}

const sectionLabelStyle = {
  fontSize: 10,
  fontWeight: 600,
  color: 'rgba(255,255,255,0.4)',
  textTransform: 'uppercase',
  letterSpacing: '0.12em',
  marginBottom: 6,
}

const sectionTextStyle = {
  fontSize: 13.5,
  color: 'rgba(255,255,255,0.88)',
  lineHeight: 1.6,
}

function typeLabel(type) {
  const t = TYPE_TABS.find((x) => x.value === type)
  return t ? t.label : type
}

function Pill({ children, bg = 'rgba(255,255,255,0.08)', color = 'rgba(255,255,255,0.85)', size = 'md' }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: size === 'sm' ? '2px 8px' : '3px 10px',
        borderRadius: 999,
        background: bg,
        color,
        fontSize: size === 'sm' ? 11 : 11.5,
        fontWeight: 500,
        letterSpacing: '0.02em',
      }}
    >
      {children}
    </span>
  )
}

function buildFullScript(script) {
  const parts = []
  if (script.opening) parts.push(`Opening:\n${script.opening}`)
  if (script.problem_hook) parts.push(`Problem Hook:\n${script.problem_hook}`)
  if (script.value_prop) parts.push(`Value Prop:\n${script.value_prop}`)
  if (script.cta) parts.push(`Call to Action:\n${script.cta}`)
  return parts.join('\n\n')
}

async function copyText(text) {
  if (!text) return false
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch (err) {
    console.error('clipboard error', err)
    try {
      const el = document.createElement('textarea')
      el.value = text
      el.style.position = 'fixed'
      el.style.opacity = '0'
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
      return true
    } catch {
      return false
    }
  }
}

function CopyButton({ label, getText, icon: Icon = Copy }) {
  const [copied, setCopied] = useState(false)
  async function onClick() {
    const ok = await copyText(getText())
    if (ok) {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    }
  }
  return (
    <button type="button" style={ghostButtonStyle} onClick={onClick}>
      {copied ? <Check size={11} /> : <Icon size={11} />}
      {copied ? 'Copied' : label}
    </button>
  )
}

function ScriptSection({ label, text }) {
  if (!text) return null
  return (
    <div>
      <div style={sectionLabelStyle}>{label}</div>
      <div style={sectionTextStyle}>{text}</div>
    </div>
  )
}

const editInputStyle = {
  width: '100%',
  background: 'rgba(255,255,255,0.04)',
  border: '0.5px solid rgba(255,255,255,0.1)',
  borderRadius: 8,
  color: '#ffffff',
  padding: '10px 12px',
  fontSize: 13,
  fontFamily: 'inherit',
  outline: 'none',
  resize: 'vertical',
}

const editLabelStyle = {
  fontSize: 10,
  fontWeight: 600,
  color: 'rgba(255,255,255,0.4)',
  textTransform: 'uppercase',
  letterSpacing: '0.12em',
  marginBottom: 6,
}

function parseObjections(raw) {
  if (!raw) return []
  if (Array.isArray(raw)) return raw
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }
  return []
}

function ScriptCard({ script, onSaved, onToast }) {
  const [expanded, setExpanded] = useState(false)
  const [objectionsOpen, setObjectionsOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(null)

  const objections = useMemo(() => parseObjections(script.objections), [script.objections])
  const industryTags = Array.isArray(script.industry_tags) ? script.industry_tags : []

  function startEdit() {
    setForm({
      name: script.name || '',
      opening: script.opening || '',
      problem_hook: script.problem_hook || '',
      value_prop: script.value_prop || '',
      cta: script.cta || '',
      objections: objections.map((o) => ({
        trigger: o.trigger || '',
        response: o.response || '',
      })),
    })
    setIsEditing(true)
  }

  function cancelEdit() {
    setIsEditing(false)
    setForm(null)
  }

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function updateObjection(idx, key, value) {
    setForm((prev) => ({
      ...prev,
      objections: prev.objections.map((o, i) => (i === idx ? { ...o, [key]: value } : o)),
    }))
  }

  function addObjection() {
    setForm((prev) => ({
      ...prev,
      objections: [...prev.objections, { trigger: '', response: '' }],
    }))
  }

  function removeObjection(idx) {
    setForm((prev) => ({
      ...prev,
      objections: prev.objections.filter((_, i) => i !== idx),
    }))
  }

  async function save() {
    if (!form) return
    setSaving(true)
    const cleanObjections = form.objections
      .filter((o) => o.trigger.trim() || o.response.trim())
      .map((o) => ({ trigger: o.trigger.trim(), response: o.response.trim() }))
    try {
      await db.query(
        `UPDATE scripts
         SET name = $1, opening = $2, problem_hook = $3, value_prop = $4, cta = $5, objections = $6
         WHERE id = $7`,
        [
          form.name.trim() || script.name,
          form.opening,
          form.problem_hook,
          form.value_prop,
          form.cta,
          JSON.stringify(cleanObjections),
          script.id,
        ],
      )
      onSaved?.({
        ...script,
        name: form.name.trim() || script.name,
        opening: form.opening,
        problem_hook: form.problem_hook,
        value_prop: form.value_prop,
        cta: form.cta,
        objections: cleanObjections,
      })
      onToast?.('Script saved ✓', 'success')
      setIsEditing(false)
      setForm(null)
    } catch (err) {
      console.error(err)
      onToast?.('Failed to save. Try again.', 'error')
    } finally {
      setSaving(false)
    }
  }

  const editingCardStyle = {
    ...cardStyle,
    border: '1px solid rgba(255,255,255,0.25)',
    background: 'rgba(20,20,24,0.9)',
    transition: 'border-color 0.2s ease, background 0.2s ease',
  }

  return (
    <div style={isEditing ? editingCardStyle : cardStyle}>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <div style={{ minWidth: 0, flex: 1 }}>
          {isEditing ? (
            <input
              style={{
                ...editInputStyle,
                fontSize: 14,
                fontWeight: 600,
                padding: '8px 12px',
              }}
              value={form.name}
              onChange={(e) => updateField('name', e.target.value)}
              placeholder="Script name"
            />
          ) : (
            <div
              style={{
                fontSize: 15,
                fontWeight: 700,
                color: '#ffffff',
                letterSpacing: '-0.01em',
              }}
            >
              {script.name}
            </div>
          )}
          {!isEditing && industryTags.length > 0 && (
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 6,
                marginTop: 10,
              }}
            >
              {industryTags.map((tag) => (
                <span
                  key={tag}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '2px 8px',
                    borderRadius: 999,
                    background: 'rgba(255,255,255,0.06)',
                    color: 'rgba(255,255,255,0.4)',
                    fontSize: 11,
                    fontWeight: 500,
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
          {isEditing ? (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '3px 10px',
                borderRadius: 999,
                background: 'rgba(255,255,255,0.15)',
                color: '#ffffff',
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: '0.04em',
              }}
            >
              EDITING
            </span>
          ) : (
            <>
              <Pill>{typeLabel(script.type)}</Pill>
              <Pill size="sm">
                {LANGUAGE_BADGE[(script.language || 'english').toLowerCase()] || 'EN'}
              </Pill>
            </>
          )}
        </div>
      </div>

      {isEditing ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <div style={editLabelStyle}>Opening</div>
            <textarea
              rows={3}
              style={editInputStyle}
              value={form.opening}
              onChange={(e) => updateField('opening', e.target.value)}
            />
          </div>
          <div>
            <div style={editLabelStyle}>Problem Hook</div>
            <textarea
              rows={3}
              style={editInputStyle}
              value={form.problem_hook}
              onChange={(e) => updateField('problem_hook', e.target.value)}
            />
          </div>
          <div>
            <div style={editLabelStyle}>Value Prop</div>
            <textarea
              rows={3}
              style={editInputStyle}
              value={form.value_prop}
              onChange={(e) => updateField('value_prop', e.target.value)}
            />
          </div>
          <div>
            <div style={editLabelStyle}>Call to Action</div>
            <textarea
              rows={2}
              style={editInputStyle}
              value={form.cta}
              onChange={(e) => updateField('cta', e.target.value)}
            />
          </div>
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 14 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 10,
              }}
            >
              <span style={editLabelStyle}>Objections</span>
              <button
                type="button"
                onClick={addObjection}
                style={{
                  ...ghostButtonStyle,
                  padding: '5px 10px',
                  fontSize: 11,
                  color: 'rgba(255,255,255,0.7)',
                }}
              >
                <Plus size={11} />
                Add Objection
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {form.objections.map((o, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(120px, 1fr) minmax(0, 2fr) auto',
                    gap: 8,
                    alignItems: 'start',
                  }}
                >
                  <input
                    style={editInputStyle}
                    value={o.trigger}
                    onChange={(e) => updateObjection(idx, 'trigger', e.target.value)}
                    placeholder="Trigger"
                  />
                  <input
                    style={editInputStyle}
                    value={o.response}
                    onChange={(e) => updateObjection(idx, 'response', e.target.value)}
                    placeholder="Response"
                  />
                  <button
                    type="button"
                    onClick={() => removeObjection(idx)}
                    style={{
                      ...ghostButtonStyle,
                      padding: '8px 10px',
                      color: 'rgba(255,255,255,0.4)',
                    }}
                    aria-label="Remove"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
              {form.objections.length === 0 && (
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>
                  No objections. Click "Add Objection" to create one.
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <ScriptSection label="Opening" text={script.opening} />
            {expanded && (
              <>
                <ScriptSection label="Problem Hook" text={script.problem_hook} />
                <ScriptSection label="Value Prop" text={script.value_prop} />
                <ScriptSection label="Call to Action" text={script.cta} />
              </>
            )}
          </div>

          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            style={{
              ...ghostButtonStyle,
              alignSelf: 'flex-start',
              padding: '5px 10px',
              fontSize: 11,
              color: 'rgba(255,255,255,0.6)',
            }}
          >
            {expanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
            {expanded ? 'Hide sections' : 'Show full script'}
          </button>

          {objections.length > 0 && (
            <div
              style={{
                borderTop: '1px solid rgba(255,255,255,0.05)',
                paddingTop: 14,
              }}
            >
              <button
                type="button"
                onClick={() => setObjectionsOpen((v) => !v)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: 'transparent',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  color: 'rgba(255,255,255,0.75)',
                  fontSize: 12,
                  fontWeight: 500,
                }}
              >
                <span style={sectionLabelStyle}>Objection Handling</span>
                {objectionsOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>

              {objectionsOpen && (
                <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {objections.map((o, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'minmax(110px, auto) 1fr',
                        gap: 12,
                        alignItems: 'start',
                      }}
                    >
                      <div>
                        <Pill size="sm">{o.trigger}</Pill>
                      </div>
                      <div
                        style={{
                          fontSize: 13,
                          color: 'rgba(255,255,255,0.7)',
                          lineHeight: 1.5,
                        }}
                      >
                        {o.response}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      <div
        style={{
          display: 'flex',
          gap: 8,
          flexWrap: 'wrap',
          borderTop: '1px solid rgba(255,255,255,0.05)',
          paddingTop: 14,
        }}
      >
        {isEditing ? (
          <>
            <motion.button
              type="button"
              whileTap={{ scale: 0.97 }}
              onClick={save}
              disabled={saving}
              style={{
                background: '#ffffff',
                color: '#000000',
                borderRadius: 8,
                padding: '8px 20px',
                fontSize: 13,
                fontWeight: 600,
                border: 'none',
                cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.6 : 1,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Check size={12} strokeWidth={2.5} />
              {saving ? 'Saving...' : 'Save'}
            </motion.button>
            <motion.button
              type="button"
              whileTap={{ scale: 0.97 }}
              onClick={cancelEdit}
              disabled={saving}
              style={{
                background: 'transparent',
                color: 'rgba(255,255,255,0.5)',
                border: '0.5px solid rgba(255,255,255,0.15)',
                borderRadius: 8,
                padding: '8px 20px',
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Cancel
            </motion.button>
          </>
        ) : (
          <>
            <button
              type="button"
              style={ghostButtonStyle}
              onClick={startEdit}
            >
              <Pencil size={11} />
              Edit
            </button>
            <CopyButton label="Copy Opening" getText={() => script.opening || ''} />
            <CopyButton label="Copy Full Script" getText={() => buildFullScript(script)} />
            <button type="button" style={ghostButtonStyle} title="Coming soon">
              <UserPlus size={11} />
              Use on Lead
            </button>
          </>
        )}
      </div>
    </div>
  )
}

function EmptyState({ onAdd }) {
  return (
    <div
      style={{
        ...cardStyle,
        gridColumn: '1 / -1',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '4rem 1rem',
        textAlign: 'center',
      }}
    >
      <div style={{ fontSize: 16, color: '#ffffff', fontWeight: 500 }}>No scripts yet</div>
      <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>
        Add your first script to start selling faster
      </div>
      <button type="button" onClick={onAdd} style={{ ...addButtonStyle, marginTop: 10 }}>
        <Plus size={14} strokeWidth={2.5} />
        Add Script
      </button>
    </div>
  )
}

const LANGUAGE_TABS = [
  { value: 'english', label: '🇺🇸 English' },
  { value: 'papiamento', label: '🇦🇼 Papiamento' },
  { value: 'spanish', label: '🇪🇸 Spanish' },
]

const LANGUAGE_BADGE = {
  english: 'EN',
  papiamento: 'PAP 🇦🇼',
  spanish: 'ES 🇪🇸',
}

export default function Scripts() {
  const isMobile = useIsMobile()
  const [scripts, setScripts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [type, setType] = useState('all')
  const [industry, setIndustry] = useState('All')
  const [language, setLanguage] = useState('english')
  const [modalOpen, setModalOpen] = useState(false)
  const [toast, setToast] = useState(null)

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2500)
    return () => clearTimeout(t)
  }, [toast])

  async function fetchScripts() {
    if (!db) {
      setLoading(false)
      setError(
        'Database not connected. Please add VITE_DATABASE_URL to your .env file and restart the dev server.',
      )
      return
    }
    setLoading(true)
    setError(null)
    try {
      await seedScriptsIfEmpty()
      const rows = await db.query('SELECT * FROM scripts ORDER BY created_at DESC')
      setScripts(rows || [])
    } catch (err) {
      console.error(err)
      setError(err?.message || 'Failed to load scripts.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchScripts()
  }, [])

  const filtered = useMemo(() => {
    const ind = industry === 'All' ? null : industry.toLowerCase()
    return scripts.filter((s) => {
      const scriptLang = (s.language || 'english').toLowerCase()
      if (scriptLang !== language) return false
      if (type !== 'all' && s.type !== type) return false
      if (ind) {
        const tags = Array.isArray(s.industry_tags) ? s.industry_tags : []
        const match = tags.some((t) => String(t).toLowerCase() === ind)
        if (!match) return false
      }
      return true
    })
  }, [scripts, type, industry, language])

  return (
    <PageShell style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h2 style={pageHeadingStyle}>Scripts</h2>
        <p style={pageSubStyle}>Your cold call and sales scripts library</p>
      </div>

      <div style={{ ...tabGroupStyle, alignSelf: 'flex-start' }}>
        {LANGUAGE_TABS.map((l) => (
          <button
            key={l.value}
            type="button"
            style={tabButtonStyle(language === l.value)}
            onClick={() => setLanguage(l.value)}
          >
            {l.label}
          </button>
        ))}
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={tabGroupStyle}>
            {TYPE_TABS.map((t) => (
              <button
                key={t.value}
                type="button"
                style={tabButtonStyle(type === t.value)}
                onClick={() => setType(t.value)}
              >
                {t.label}
              </button>
            ))}
          </div>
          <select
            style={selectStyle}
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
          >
            {INDUSTRIES.map((i) => (
              <option key={i} value={i}>
                {i === 'All' ? 'All industries' : i}
              </option>
            ))}
          </select>
        </div>
        <button type="button" onClick={() => setModalOpen(true)} style={addButtonStyle}>
          <Plus size={14} strokeWidth={2.5} />
          Add Script
        </button>
      </div>

      {loading ? (
        <div
          style={{
            textAlign: 'center',
            padding: '4rem 1rem',
            color: 'rgba(255,255,255,0.45)',
            fontSize: 13,
          }}
        >
          Loading scripts...
        </div>
      ) : error ? (
        <div
          style={{
            textAlign: 'center',
            padding: '4rem 1rem',
            color: 'rgba(255,255,255,0.7)',
            fontSize: 14,
          }}
        >
          {error}
        </div>
      ) : scripts.length === 0 ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, minmax(0, 1fr))',
            gap: 16,
          }}
        >
          <EmptyState onAdd={() => setModalOpen(true)} />
        </div>
      ) : filtered.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '4rem 1rem',
            color: 'rgba(255,255,255,0.35)',
            fontSize: 13,
          }}
        >
          No scripts match your filters
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, minmax(0, 1fr))',
            gap: 16,
          }}
        >
          {filtered.map((s) => (
            <ScriptCard
              key={s.id}
              script={s}
              onSaved={(updated) =>
                setScripts((prev) =>
                  prev.map((x) => (x.id === updated.id ? { ...x, ...updated } : x)),
                )
              }
              onToast={(message, kind) => setToast({ message, kind })}
            />
          ))}
        </div>
      )}

      <AddScriptModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={fetchScripts}
      />

      <AnimatePresence>
        {toast && (
          <motion.div
            key="toast"
            initial={{ opacity: 0, x: 80 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: 'fixed',
              bottom: 24,
              right: 24,
              background: '#1a1a1e',
              color: '#ffffff',
              border: '0.5px solid rgba(255,255,255,0.12)',
              borderRadius: 12,
              padding: '12px 20px',
              fontSize: 14,
              fontWeight: 500,
              boxShadow: '0 20px 40px rgba(0,0,0,0.5), 0 0 30px rgba(255,255,255,0.06)',
              zIndex: 200,
            }}
          >
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>
    </PageShell>
  )
}

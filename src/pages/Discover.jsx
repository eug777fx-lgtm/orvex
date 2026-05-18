import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Loader2, Plus, MapPin, Sparkles, Check } from 'lucide-react'
import PageShell from '../components/PageShell'
import { useAuth, workflowApi } from '../lib/auth'

const cardStyle = {
  background: 'rgba(194,181,155,0.03)',
  border: '0.5px solid rgba(194,181,155,0.08)',
  borderRadius: 14,
  padding: 20,
}

const inputStyle = {
  width: '100%',
  background: 'rgba(255,255,255,0.04)',
  border: '0.5px solid rgba(255,255,255,0.1)',
  borderRadius: 12,
  padding: '13px 16px',
  color: '#ffffff',
  fontSize: 14,
  outline: 'none',
  fontFamily: 'inherit',
}

const pillInputStyle = {
  flex: 1,
  minWidth: 140,
  background: 'rgba(194,181,155,0.04)',
  border: '0.5px solid rgba(194,181,155,0.12)',
  borderRadius: 999,
  padding: '9px 16px',
  color: '#ffffff',
  fontSize: 13,
  outline: 'none',
  fontFamily: 'inherit',
}

const searchButton = {
  background: '#C2B59B',
  color: '#0B0B0D',
  border: 'none',
  borderRadius: 12,
  padding: '13px 26px',
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  whiteSpace: 'nowrap',
}

export default function Discover() {
  const { appAuth } = useAuth()
  const [query, setQuery] = useState('')
  const [industry, setIndustry] = useState('')
  const [location, setLocation] = useState('')
  const [companyType, setCompanyType] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [savedIdx, setSavedIdx] = useState(() => new Set())
  const [savingIdx, setSavingIdx] = useState(null)
  const [toast, setToast] = useState('')

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(''), 2600)
  }

  async function runSearch(e) {
    e?.preventDefault?.()
    if (!query.trim() || loading) return
    setLoading(true)
    setError('')
    setResults([])
    setSavedIdx(new Set())
    try {
      const composed = [query.trim(), companyType && `(${companyType})`]
        .filter(Boolean)
        .join(' ')
      const data = await workflowApi('discover_leads', {
        method: 'POST',
        body: {
          query: composed,
          industry: industry.trim() || undefined,
          location: location.trim() || 'Aruba',
        },
      })
      if (!data?.success) {
        setError(data?.error || 'Search failed. Try a different query.')
        return
      }
      setResults(Array.isArray(data.results) ? data.results : [])
      if (!data.results?.length) setError('No matches found. Broaden your search.')
    } catch (err) {
      setError(err?.message || 'Search failed. Try again.')
    } finally {
      setLoading(false)
    }
  }

  async function saveLead(lead, idx) {
    if (savedIdx.has(idx) || savingIdx != null) return
    setSavingIdx(idx)
    try {
      const data = await workflowApi('add_lead', {
        method: 'POST',
        body: {
          rep_id: appAuth?.id,
          company_name: lead.company_name,
          contact_name: lead.contact_title || null,
          industry: lead.industry || null,
          location: lead.location || null,
          source: 'discover',
          estimated_value: Number(lead.estimated_value) || null,
          notes: [lead.potential_need, lead.outreach_angle]
            .filter(Boolean)
            .join(' — '),
        },
      })
      if (data?.success) {
        setSavedIdx((s) => new Set(s).add(idx))
        showToast('Lead saved to your pipeline')
      } else {
        showToast(data?.error || 'Could not save lead')
      }
    } catch (err) {
      showToast('Could not save lead')
    } finally {
      setSavingIdx(null)
    }
  }

  return (
    <PageShell style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h2 style={{ fontSize: 22, fontWeight: 600, color: '#fff', letterSpacing: '-0.4px' }}>
          Discover Leads
        </h2>
        <p style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.4)', marginTop: 6 }}>
          Find potential clients in Aruba and beyond
        </p>
      </div>

      <div style={cardStyle}>
        <form onSubmit={runSearch} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ position: 'relative' }}>
            <Search
              size={16}
              style={{
                position: 'absolute',
                left: 16,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'rgba(255,255,255,0.35)',
              }}
            />
            <input
              style={{ ...inputStyle, paddingLeft: 44 }}
              placeholder="Search for businesses, industries, or locations..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <input
              style={pillInputStyle}
              placeholder="Industry"
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
            />
            <input
              style={pillInputStyle}
              placeholder="Location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
            <input
              style={pillInputStyle}
              placeholder="Company Type"
              value={companyType}
              onChange={(e) => setCompanyType(e.target.value)}
            />
            <button type="submit" style={searchButton} disabled={loading}>
              {loading ? (
                <Loader2 size={15} className="spin" />
              ) : (
                <Sparkles size={15} />
              )}
              {loading ? 'Searching…' : 'Search'}
            </button>
          </div>
        </form>
      </div>

      {error && (
        <div
          style={{
            ...cardStyle,
            color: 'rgba(255,255,255,0.55)',
            textAlign: 'center',
            fontSize: 13.5,
          }}
        >
          {error}
        </div>
      )}

      {loading && (
        <div
          style={{
            ...cardStyle,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            color: 'rgba(255,255,255,0.5)',
            fontSize: 13.5,
            padding: 48,
          }}
        >
          <Loader2 size={18} className="spin" />
          Researching potential clients…
        </div>
      )}

      {results.length > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: 16,
          }}
        >
          {results.map((lead, idx) => {
            const saved = savedIdx.has(idx)
            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: idx * 0.04 }}
                style={{ ...cardStyle, display: 'flex', flexDirection: 'column', gap: 12 }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: '#fff' }}>
                      {lead.company_name || 'Unnamed business'}
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        marginTop: 6,
                        fontSize: 12,
                        color: 'rgba(255,255,255,0.4)',
                      }}
                    >
                      <MapPin size={12} />
                      {lead.location || 'Aruba'}
                    </div>
                  </div>
                  {lead.industry && (
                    <span
                      style={{
                        alignSelf: 'flex-start',
                        fontSize: 11,
                        fontWeight: 500,
                        color: '#C2B59B',
                        background: 'rgba(194,181,155,0.1)',
                        border: '0.5px solid rgba(194,181,155,0.2)',
                        borderRadius: 999,
                        padding: '3px 10px',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {lead.industry}
                    </span>
                  )}
                </div>

                {lead.why_good_fit && (
                  <div>
                    <div style={labelMini}>Why a good fit</div>
                    <p style={bodyText}>{lead.why_good_fit}</p>
                  </div>
                )}
                {lead.outreach_angle && (
                  <div>
                    <div style={labelMini}>Outreach angle</div>
                    <p style={bodyText}>{lead.outreach_angle}</p>
                  </div>
                )}

                {lead.estimated_value ? (
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>
                    Est. value{' '}
                    <span style={{ color: '#C2B59B', fontWeight: 600 }}>
                      ${Number(lead.estimated_value).toLocaleString()}
                    </span>
                  </div>
                ) : null}

                <button
                  type="button"
                  onClick={() => saveLead(lead, idx)}
                  disabled={saved || savingIdx === idx}
                  style={{
                    marginTop: 'auto',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 7,
                    padding: '10px 14px',
                    borderRadius: 10,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: saved ? 'default' : 'pointer',
                    border: saved
                      ? '0.5px solid rgba(125,211,252,0.3)'
                      : '0.5px solid rgba(194,181,155,0.25)',
                    background: saved
                      ? 'rgba(125,211,252,0.08)'
                      : 'rgba(194,181,155,0.08)',
                    color: saved ? 'rgba(125,211,252,0.9)' : '#C2B59B',
                  }}
                >
                  {savingIdx === idx ? (
                    <Loader2 size={14} className="spin" />
                  ) : saved ? (
                    <Check size={14} />
                  ) : (
                    <Plus size={14} />
                  )}
                  {saved ? 'Saved to pipeline' : 'Save as Lead'}
                </button>
              </motion.div>
            )
          })}
        </div>
      )}

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
              boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
            }}
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </PageShell>
  )
}

const labelMini = {
  fontSize: 10.5,
  fontWeight: 600,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: 'rgba(255,255,255,0.3)',
  marginBottom: 4,
}

const bodyText = {
  fontSize: 12.5,
  lineHeight: 1.55,
  color: 'rgba(255,255,255,0.62)',
}

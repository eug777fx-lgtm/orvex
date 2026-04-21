import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Search, Plus, ExternalLink, Upload, X } from 'lucide-react'
import sql from '../lib/db'
import AddLeadModal from '../components/AddLeadModal'
import Discover from '../components/Discover'
import PageShell from '../components/PageShell'

const INDUSTRY_FILTERS = [
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

const STATUS_FILTERS = ['All', 'new', 'contacted', 'follow_up', 'interested', 'closed', 'lost']

const STATUS_STYLES = {
  new: { bg: 'rgba(255,255,255,0.08)' },
  contacted: { bg: 'rgba(255,255,255,0.12)' },
  follow_up: { bg: 'rgba(255,255,255,0.15)' },
  interested: { bg: 'rgba(255,255,255,0.2)' },
  closed: { bg: 'rgba(255,255,255,0.25)' },
  lost: { bg: 'rgba(255,255,255,0.05)', strike: true },
}

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

const glassCardStyle = {
  background: 'rgba(17,17,20,0.55)',
  border: '0.5px solid rgba(255,255,255,0.08)',
  borderRadius: 16,
  overflow: 'hidden',
  backdropFilter: 'blur(12px) saturate(160%)',
  WebkitBackdropFilter: 'blur(12px) saturate(160%)',
}

const inputStyle = {
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 10,
  color: '#ffffff',
  padding: '9px 14px 9px 38px',
  fontSize: 13,
  fontFamily: 'inherit',
  outline: 'none',
  width: 280,
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
  transition: 'opacity 0.15s ease',
}

const ghostButtonStyle = {
  background: 'transparent',
  border: '1px solid rgba(255,255,255,0.1)',
  color: 'rgba(255,255,255,0.75)',
  borderRadius: 8,
  padding: '5px 12px',
  fontSize: 12,
  fontWeight: 500,
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  cursor: 'pointer',
  transition: 'all 0.15s ease',
}

const tableHeaderCell = {
  textAlign: 'left',
  fontSize: 11,
  fontWeight: 500,
  color: 'rgba(255,255,255,0.4)',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  padding: '14px 16px',
  borderBottom: '1px solid rgba(255,255,255,0.06)',
  background: 'rgba(255,255,255,0.02)',
}

const tableCellBase = {
  fontSize: 13,
  color: 'rgba(255,255,255,0.75)',
  padding: '16px',
  borderBottom: '1px solid rgba(255,255,255,0.04)',
  verticalAlign: 'middle',
}

function industryPillStyle() {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '3px 10px',
    borderRadius: 999,
    background: 'rgba(255,255,255,0.08)',
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 500,
  }
}

function statusPillStyle(status) {
  const conf = STATUS_STYLES[status] || STATUS_STYLES.new
  return {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '3px 10px',
    borderRadius: 999,
    background: conf.bg,
    color: conf.strike ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.85)',
    fontSize: 11,
    fontWeight: 500,
    letterSpacing: '0.02em',
    textTransform: 'lowercase',
    textDecoration: conf.strike ? 'line-through' : 'none',
  }
}

function scoreColor(score) {
  if (score >= 7) return '#ffffff'
  if (score >= 4) return 'rgba(255,255,255,0.5)'
  return 'rgba(255,255,255,0.2)'
}

function ScoreBadge({ score }) {
  const s = Number(score) || 0
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: scoreColor(s),
          boxShadow: s >= 7 ? '0 0 6px rgba(255,255,255,0.4)' : 'none',
        }}
      />
      <span style={{ color: '#ffffff', fontWeight: 600, fontSize: 13 }}>{s}</span>
      <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12 }}>/10</span>
    </div>
  )
}

function EmptyState({ onAdd }) {
  return (
    <div
      style={{
        padding: '4rem 1rem',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
      }}
    >
      <div style={{ fontSize: 16, color: '#ffffff', fontWeight: 500 }}>No leads yet</div>
      <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>
        Add your first lead to get started
      </div>
      <button
        type="button"
        onClick={onAdd}
        style={{ ...addButtonStyle, marginTop: 18 }}
      >
        <Plus size={14} strokeWidth={2.5} />
        Add Lead
      </button>
    </div>
  )
}

function CenteredMessage({ children }) {
  return (
    <div
      style={{
        padding: '4rem 1rem',
        textAlign: 'center',
        color: 'rgba(255,255,255,0.45)',
        fontSize: 13,
      }}
    >
      {children}
    </div>
  )
}

export default function Leads() {
  const navigate = useNavigate()
  const location = useLocation()
  const [importBanner, setImportBanner] = useState(
    typeof location.state?.imported === 'number' ? location.state.imported : null,
  )

  useEffect(() => {
    if (location.state?.imported != null) {
      window.history.replaceState({}, document.title)
    }
  }, [])

  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [industry, setIndustry] = useState('All')
  const [status, setStatus] = useState('All')
  const [modalOpen, setModalOpen] = useState(false)
  const [tab, setTab] = useState('my')

  async function fetchLeads() {
    if (!sql) {
      setLoading(false)
      setError(
        'Database not connected. Please add VITE_DATABASE_URL to your .env file and restart the dev server.',
      )
      return
    }
    setLoading(true)
    setError(null)
    try {
      const rows = await sql`SELECT * FROM leads ORDER BY created_at DESC`
      setLeads(rows)
    } catch (err) {
      console.error(err)
      setError(err?.message || 'Failed to load leads.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLeads()
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return leads.filter((l) => {
      if (q && !(l.company_name || '').toLowerCase().includes(q)) return false
      if (industry !== 'All' && l.industry !== industry) return false
      if (status !== 'All' && l.status !== status) return false
      return true
    })
  }, [leads, search, industry, status])

  const hasLeads = leads.length > 0
  const hasFilteredLeads = filtered.length > 0

  return (
    <PageShell style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: 20,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <h2 style={pageHeadingStyle}>Leads</h2>
          <p style={pageSubStyle}>Find and track your business prospects</p>
        </div>
      </div>

      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.06)',
          padding: 4,
          borderRadius: 999,
          alignSelf: 'flex-start',
        }}
      >
        {[
          { value: 'my', label: 'My Leads' },
          { value: 'discover', label: 'Discover' },
        ].map((t) => {
          const active = tab === t.value
          return (
            <button
              key={t.value}
              type="button"
              onClick={() => setTab(t.value)}
              style={{
                padding: '6px 20px',
                borderRadius: 999,
                fontSize: 12.5,
                fontWeight: 500,
                border: 'none',
                cursor: 'pointer',
                background: active ? '#ffffff' : 'transparent',
                color: active ? '#000000' : 'rgba(255,255,255,0.4)',
                transition: 'all 0.15s ease',
              }}
            >
              {t.label}
            </button>
          )
        })}
      </div>

      {tab === 'discover' && <Discover onLeadsAdded={fetchLeads} />}

      {tab === 'my' && importBanner != null && importBanner > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 12,
            padding: '12px 16px',
          }}
        >
          <div style={{ fontSize: 13, color: '#ffffff' }}>
            {importBanner} {importBanner === 1 ? 'lead' : 'leads'} imported successfully
          </div>
          <button
            type="button"
            onClick={() => setImportBanner(null)}
            aria-label="Dismiss"
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.08)',
              color: 'rgba(255,255,255,0.6)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {tab === 'my' && (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative' }}>
            <Search
              size={14}
              style={{
                position: 'absolute',
                left: 14,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'rgba(255,255,255,0.4)',
              }}
            />
            <input
              style={inputStyle}
              placeholder="Search companies..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            style={selectStyle}
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
          >
            {INDUSTRY_FILTERS.map((i) => (
              <option key={i} value={i}>
                {i === 'All' ? 'All industries' : i}
              </option>
            ))}
          </select>
          <select style={selectStyle} value={status} onChange={(e) => setStatus(e.target.value)}>
            {STATUS_FILTERS.map((s) => (
              <option key={s} value={s}>
                {s === 'All' ? 'All statuses' : s}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => navigate('/import')}
            style={ghostButtonStyle}
          >
            <Upload size={12} />
            Import CSV
          </button>
          <button type="button" onClick={() => setModalOpen(true)} style={addButtonStyle}>
            <Plus size={14} strokeWidth={2.5} />
            Add Lead
          </button>
        </div>
      </div>
      )}

      {tab === 'my' && (
      <div style={glassCardStyle}>
        {!sql ? (
          <div
            style={{
              padding: '4rem 1rem',
              textAlign: 'center',
              color: 'rgba(255,255,255,0.7)',
              fontSize: '1rem',
            }}
          >
            Database not connected. Please add VITE_DATABASE_URL to your .env file and restart
            the dev server.
          </div>
        ) : loading ? (
          <CenteredMessage>Loading leads...</CenteredMessage>
        ) : error ? (
          <CenteredMessage>
            <div style={{ color: '#ff8888' }}>{error}</div>
          </CenteredMessage>
        ) : !hasLeads ? (
          <EmptyState onAdd={() => setModalOpen(true)} />
        ) : !hasFilteredLeads ? (
          <CenteredMessage>No leads match your filters</CenteredMessage>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={tableHeaderCell}>Company</th>
                  <th style={tableHeaderCell}>Industry</th>
                  <th style={tableHeaderCell}>Location</th>
                  <th style={tableHeaderCell}>Score</th>
                  <th style={tableHeaderCell}>Status</th>
                  <th style={tableHeaderCell}>Website</th>
                  <th style={{ ...tableHeaderCell, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((lead) => (
                  <tr
                    key={lead.id}
                    onClick={() => navigate(`/leads/${lead.id}`)}
                    style={{ cursor: 'pointer', transition: 'background 0.15s ease' }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.02)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent'
                    }}
                  >
                    <td style={tableCellBase}>
                      <div style={{ color: '#ffffff', fontWeight: 600, fontSize: 13 }}>
                        {lead.company_name || '—'}
                      </div>
                      {lead.owner_name && (
                        <div
                          style={{
                            color: 'rgba(255,255,255,0.4)',
                            fontSize: 12,
                            marginTop: 2,
                          }}
                        >
                          {lead.owner_name}
                        </div>
                      )}
                    </td>
                    <td style={tableCellBase}>
                      {lead.industry ? (
                        <span style={industryPillStyle()}>{lead.industry}</span>
                      ) : (
                        <span style={{ color: 'rgba(255,255,255,0.3)' }}>—</span>
                      )}
                    </td>
                    <td style={{ ...tableCellBase, color: 'rgba(255,255,255,0.55)' }}>
                      {lead.location || '—'}
                    </td>
                    <td style={tableCellBase}>
                      <ScoreBadge score={lead.opportunity_score} />
                    </td>
                    <td style={tableCellBase}>
                      <span style={statusPillStyle(lead.status)}>{lead.status || 'new'}</span>
                    </td>
                    <td style={{ ...tableCellBase, color: 'rgba(255,255,255,0.55)' }}>
                      {lead.has_website ? 'Yes' : 'No'}
                    </td>
                    <td style={{ ...tableCellBase, textAlign: 'right' }}>
                      <button
                        type="button"
                        style={ghostButtonStyle}
                        onClick={(e) => {
                          e.stopPropagation()
                          navigate(`/leads/${lead.id}`)
                        }}
                      >
                        <ExternalLink size={11} />
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      )}

      <AddLeadModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={fetchLeads}
      />
    </PageShell>
  )
}

import { useEffect, useState } from 'react'
import { Sparkles, Check, X, Phone, Star, MapPin } from 'lucide-react'
import sql from '../lib/db'
import { searchBusinesses } from '../utils/placesSearch'

const INDUSTRIES = [
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

const LOCATIONS = [
  'Oranjestad',
  'San Nicolas',
  'Santa Cruz',
  'Noord',
  'Paradera',
  'Palm Beach',
]

const glassCardStyle = {
  background: 'rgba(17,17,20,0.55)',
  border: '0.5px solid rgba(255,255,255,0.08)',
  borderRadius: 16,
  padding: '1.5rem',
  backdropFilter: 'blur(12px) saturate(160%)',
  WebkitBackdropFilter: 'blur(12px) saturate(160%)',
}

const cardStyle = {
  background: 'rgba(17,17,20,0.7)',
  border: '0.5px solid rgba(255,255,255,0.08)',
  borderRadius: 16,
  padding: '1.25rem',
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
  backdropFilter: 'blur(12px) saturate(160%)',
  WebkitBackdropFilter: 'blur(12px) saturate(160%)',
}

const titleStyle = {
  fontSize: '1.1rem',
  fontWeight: 700,
  color: '#ffffff',
  letterSpacing: '-0.01em',
}

const subtitleStyle = {
  fontSize: 12,
  color: 'rgba(255,255,255,0.45)',
  marginTop: 4,
}

const labelStyle = {
  fontSize: 11,
  fontWeight: 600,
  color: 'rgba(255,255,255,0.5)',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  marginBottom: 10,
}

const togglePillBase = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '6px 14px',
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 500,
  cursor: 'pointer',
  border: 'none',
  transition: 'all 0.15s ease',
}

function togglePillStyle(active) {
  return {
    ...togglePillBase,
    background: active ? '#ffffff' : 'rgba(255,255,255,0.06)',
    color: active ? '#000000' : '#ffffff',
    border: active ? '1px solid #ffffff' : '1px solid rgba(255,255,255,0.1)',
  }
}

const solidButtonStyle = {
  width: '100%',
  background: '#ffffff',
  color: '#000000',
  borderRadius: 999,
  padding: '10px 28px',
  fontSize: 13,
  fontWeight: 600,
  border: 'none',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
}

const smallSolidButtonStyle = {
  background: '#ffffff',
  color: '#000000',
  borderRadius: 999,
  padding: '6px 14px',
  fontSize: 12,
  fontWeight: 600,
  border: 'none',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
}

const smallGhostButtonStyle = {
  background: 'transparent',
  border: '1px solid rgba(255,255,255,0.1)',
  color: 'rgba(255,255,255,0.6)',
  borderRadius: 999,
  padding: '6px 12px',
  fontSize: 12,
  fontWeight: 500,
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  cursor: 'pointer',
}

const industryPillStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '2px 10px',
  borderRadius: 999,
  background: 'rgba(255,255,255,0.08)',
  color: 'rgba(255,255,255,0.85)',
  fontSize: 11,
  fontWeight: 500,
}

const locationPillStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '2px 10px',
  borderRadius: 999,
  background: 'rgba(255,255,255,0.04)',
  color: 'rgba(255,255,255,0.55)',
  fontSize: 11,
  fontWeight: 500,
}

const scorePillStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '2px 8px',
  borderRadius: 999,
  background: 'rgba(255,255,255,0.06)',
  color: 'rgba(255,255,255,0.75)',
  fontSize: 11,
  fontWeight: 600,
}

function InfoRow({ icon: Icon, text, dim = false }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        fontSize: 12,
        color: dim ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.7)',
      }}
    >
      <Icon size={12} color="rgba(255,255,255,0.4)" style={{ flexShrink: 0 }} />
      <span
        style={{
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {text}
      </span>
    </div>
  )
}

function ResultCard({ result, alreadyInLeads, added, onAdd, onSkip }) {
  const rating = result.rating != null
    ? `${Number(result.rating).toFixed(1)} ★ · ${result.review_count || 0} reviews`
    : 'No reviews'

  return (
    <div style={{ ...cardStyle, opacity: alreadyInLeads ? 0.45 : 1 }}>
      <div
        style={{
          fontSize: '0.95rem',
          fontWeight: 700,
          color: '#ffffff',
          letterSpacing: '-0.01em',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {result.company_name}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        <span style={industryPillStyle}>{result.industry}</span>
        {result.location && <span style={locationPillStyle}>{result.location}</span>}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {result.address && <InfoRow icon={MapPin} text={result.address} />}
        {result.phone ? (
          <InfoRow icon={Phone} text={result.phone} />
        ) : (
          <InfoRow icon={Phone} text="No phone listed" dim />
        )}
        <InfoRow icon={Star} text={rating} />
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          paddingTop: 10,
          borderTop: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        <span style={scorePillStyle}>Score: {result.opportunity_score}/10</span>
        <div style={{ display: 'flex', gap: 6 }}>
          {alreadyInLeads ? (
            <span
              style={{
                ...smallGhostButtonStyle,
                cursor: 'default',
                color: 'rgba(255,255,255,0.4)',
              }}
            >
              Already in leads
            </span>
          ) : added ? (
            <span
              style={{
                ...smallGhostButtonStyle,
                cursor: 'default',
                color: 'rgba(255,255,255,0.6)',
              }}
            >
              <Check size={11} />
              Added
            </span>
          ) : (
            <>
              <button type="button" style={smallGhostButtonStyle} onClick={onSkip}>
                Skip
              </button>
              <button type="button" style={smallSolidButtonStyle} onClick={onAdd}>
                Add to Leads
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function Discover({ onLeadsAdded }) {
  const [selectedIndustries, setSelectedIndustries] = useState(INDUSTRIES)
  const [selectedLocations, setSelectedLocations] = useState(LOCATIONS)
  const [isSearching, setIsSearching] = useState(false)
  const [progress, setProgress] = useState('')
  const [results, setResults] = useState([])
  const [existingLeads, setExistingLeads] = useState([])
  const [addedIds, setAddedIds] = useState(new Set())
  const [skippedIds, setSkippedIds] = useState(new Set())
  const [error, setError] = useState(null)

  const apiKey = import.meta.env.VITE_GOOGLE_PLACES_KEY

  useEffect(() => {
    if (!apiKey) {
      setError('Google Places API key not configured. Add VITE_GOOGLE_PLACES_KEY to your .env file and restart the dev server.')
    }
    if (!sql) return
    sql`SELECT company_name FROM leads`
      .then((rows) => {
        setExistingLeads(
          (rows || [])
            .map((r) => (r.company_name || '').toLowerCase().trim())
            .filter(Boolean),
        )
      })
      .catch((err) => console.error('load existing leads failed', err))
  }, [apiKey])

  function toggleIndustry(value) {
    setSelectedIndustries((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value],
    )
  }

  function toggleLocation(value) {
    setSelectedLocations((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value],
    )
  }

  async function handleSearch() {
    if (!apiKey) {
      setError('Google Places API key not configured. Add VITE_GOOGLE_PLACES_KEY to your .env file.')
      return
    }
    if (selectedIndustries.length === 0 || selectedLocations.length === 0) {
      setError('Select at least one industry and one location.')
      return
    }

    setIsSearching(true)
    setResults([])
    setAddedIds(new Set())
    setSkippedIds(new Set())
    setError(null)
    setProgress('Starting search...')

    try {
      const found = await searchBusinesses(
        selectedIndustries,
        selectedLocations,
        apiKey,
        (msg) => setProgress(msg),
      )
      setResults(found)
    } catch (err) {
      console.error(err)
      const msg = String(err?.message || 'Search failed.')
      if (msg.includes('REQUEST_DENIED') || msg.includes('Places API not enabled')) {
        setError(
          'Places API not enabled. Go to Google Cloud Console → APIs & Services → Enable Places API for your project.',
        )
      } else {
        setError(msg)
      }
    } finally {
      setIsSearching(false)
      setProgress('')
    }
  }

  function isAlreadyInLeads(result) {
    const name = (result.company_name || '').toLowerCase().trim()
    return existingLeads.includes(name)
  }

  async function handleAdd(result) {
    if (!sql) return
    try {
      const rating = result.rating != null ? Number(result.rating) : null
      const reviews = result.review_count != null ? Number(result.review_count) : null

      await sql`
        INSERT INTO leads (
          company_name, phone, email, location, industry,
          has_website, website_quality, has_crm, manual_processes,
          avg_rating, review_count, opportunity_score,
          status, source, notes
        ) VALUES (
          ${result.company_name}, ${result.phone || null}, ${null},
          ${result.address || result.location || null},
          ${(result.industry || '').toLowerCase() || null},
          false, 'none', false, true,
          ${rating}, ${reviews}, ${result.opportunity_score || 0},
          'new', 'google_places',
          'Found via Orvex Discover — no website detected'
        )
      `
      setAddedIds((prev) => {
        const next = new Set(prev)
        next.add(result.place_id)
        return next
      })
      setExistingLeads((prev) => [
        ...prev,
        (result.company_name || '').toLowerCase().trim(),
      ])
      onLeadsAdded?.()
    } catch (err) {
      console.error('add lead failed', err)
      setError(err?.message || 'Failed to add lead.')
    }
  }

  async function handleAddAll() {
    const toAdd = results.filter(
      (r) =>
        !addedIds.has(r.place_id) &&
        !skippedIds.has(r.place_id) &&
        !isAlreadyInLeads(r),
    )
    for (const r of toAdd) {
      await handleAdd(r)
      await new Promise((resolve) => setTimeout(resolve, 100))
    }
  }

  function handleSkip(result) {
    setSkippedIds((prev) => {
      const next = new Set(prev)
      next.add(result.place_id)
      return next
    })
  }

  const visibleResults = results.filter((r) => !skippedIds.has(r.place_id))
  const newCount = visibleResults.filter(
    (r) => !addedIds.has(r.place_id) && !isAlreadyInLeads(r),
  ).length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={glassCardStyle}>
        <div style={titleStyle}>Discover</div>
        <div style={subtitleStyle}>Find businesses in Aruba with no website</div>
      </div>

      {error && (
        <div
          style={{
            ...glassCardStyle,
            fontSize: 13,
            color: '#ffffff',
            lineHeight: 1.5,
          }}
        >
          {error}
        </div>
      )}

      <div style={glassCardStyle}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div>
            <div style={labelStyle}>Industries</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {INDUSTRIES.map((ind) => (
                <button
                  key={ind}
                  type="button"
                  style={togglePillStyle(selectedIndustries.includes(ind))}
                  onClick={() => toggleIndustry(ind)}
                >
                  {ind}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div style={labelStyle}>Locations</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {LOCATIONS.map((loc) => (
                <button
                  key={loc}
                  type="button"
                  style={togglePillStyle(selectedLocations.includes(loc))}
                  onClick={() => toggleLocation(loc)}
                >
                  {loc}
                </button>
              ))}
            </div>
          </div>

          <div>
            <button
              type="button"
              style={{
                ...solidButtonStyle,
                opacity: isSearching ? 0.6 : 1,
                cursor: isSearching ? 'not-allowed' : 'pointer',
              }}
              onClick={handleSearch}
              disabled={isSearching}
            >
              <Sparkles size={14} strokeWidth={2.5} />
              {isSearching ? 'Searching...' : 'Find Businesses'}
            </button>

            {isSearching && (
              <div style={{ marginTop: 14 }}>
                <div
                  style={{
                    width: '100%',
                    height: 3,
                    background: 'rgba(255,255,255,0.1)',
                    borderRadius: 999,
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: '100%',
                      height: '100%',
                      background: 'rgba(255,255,255,0.8)',
                      borderRadius: 999,
                      animation: 'orvex-progress 1.4s ease-in-out infinite',
                    }}
                  />
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: 'rgba(255,255,255,0.5)',
                    marginTop: 8,
                  }}
                >
                  {progress || 'Working...'}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {!isSearching && results.length > 0 && (
        <>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              flexWrap: 'wrap',
            }}
          >
            <div
              style={{
                fontSize: '0.95rem',
                fontWeight: 700,
                color: '#ffffff',
              }}
            >
              Found {visibleResults.length} businesses with no website
            </div>
            <button
              type="button"
              style={{
                ...smallSolidButtonStyle,
                padding: '8px 20px',
                opacity: newCount === 0 ? 0.4 : 1,
                cursor: newCount === 0 ? 'not-allowed' : 'pointer',
              }}
              disabled={newCount === 0}
              onClick={handleAddAll}
            >
              Add All ({newCount} new)
            </button>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
              gap: 14,
            }}
          >
            {visibleResults.map((r) => (
              <ResultCard
                key={r.place_id}
                result={r}
                alreadyInLeads={isAlreadyInLeads(r)}
                added={addedIds.has(r.place_id)}
                onAdd={() => handleAdd(r)}
                onSkip={() => handleSkip(r)}
              />
            ))}
          </div>
        </>
      )}

      {!isSearching && !error && results.length === 0 && progress === '' && visibleResults.length === 0 && (
        <div
          style={{
            ...glassCardStyle,
            textAlign: 'center',
            padding: '3rem 1.5rem',
            color: 'rgba(255,255,255,0.4)',
            fontSize: 13,
          }}
        >
          Pick industries and locations above, then click Find Businesses.
        </div>
      )}

      {!isSearching && results.length === 0 && progress !== '' && !error && (
        <div
          style={{
            ...glassCardStyle,
            textAlign: 'center',
            padding: '3rem 1.5rem',
            color: 'rgba(255,255,255,0.45)',
            fontSize: 13,
          }}
        >
          No businesses found — try different industries or areas.
        </div>
      )}
    </div>
  )
}

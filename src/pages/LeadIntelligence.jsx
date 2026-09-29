// Lead Intelligence Engine (Discover Leads)
// Discover → enrich → analyze → score → price → add to Leads → call → track.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Radar, History, LayoutDashboard, Settings2, AlertTriangle, RotateCcw, Check } from 'lucide-react'
import PageShell from '../components/PageShell'
import useIsMobile from '../utils/useIsMobile'
import { useAuth } from '../lib/auth'
import { intelApi, fmtCost } from '../lib/intelApi'
import { Button, Modal, Field, Spinner } from '../components/intel/ui'
import { S, GLOBAL_CSS, copyText, EMPTY_CRITERIA, EMPTY_FILTERS, sortResults } from '../components/intel/shared'
import { useToast } from '../components/intel/useToast'
import SearchPanel from '../components/intel/SearchPanel'
import ResultsView from '../components/intel/ResultsView'
import BusinessPanel from '../components/intel/BusinessPanel'
import OutreachModal from '../components/intel/OutreachModal'
import CallModal from '../components/intel/CallModal'
import HistoryTab from '../components/intel/HistoryTab'
import DashboardTab from '../components/intel/DashboardTab'
import SettingsTab from '../components/intel/SettingsTab'

const TABS = [
  { key: 'discover', label: 'Discover', icon: Radar },
  { key: 'history', label: 'History', icon: History },
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'settings', label: 'Settings', icon: Settings2 },
]

const STAGES = [
  { key: 'finding', label: 'Finding businesses…' },
  { key: 'enriching', label: 'Enriching business data…' },
  { key: 'analyzing', label: 'Checking online presence…' },
  { key: 'scoring', label: 'Calculating opportunities…' },
  { key: 'done', label: 'Complete' },
]

const ANALYZE_BATCH = 3

function csvEscape(v) {
  const s = v === null || v === undefined ? '' : String(v)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

function exportCsv(list, catalog) {
  const head = [
    'Business', 'Industry', 'Category', 'Address', 'City', 'Region', 'Country', 'Postal code', 'Phone', 'Website', 'Email',
    'Rating', 'Reviews', 'Website status', 'Booking', 'Contact form', 'Lead Intelligence Score', 'Recommended package',
    'Price low', 'Price high', 'Currency', 'Monthly', 'In Leads', 'Source URL',
  ]
  const rows = list.map((b) => [
    b.business_name, catalog.industries.find((i) => i.key === b.industry)?.label || '', b.category, b.address, b.city, b.region,
    b.country, b.postal_code, b.phone || b.phone_intl, b.website, b.email, b.rating, b.review_count, b.website_quality_label,
    b.booking_status, b.contact_form_status, b.score, b.pricing?.services?.length ? b.pricing.package_name : '',
    b.pricing?.price_low, b.pricing?.price_high, b.pricing?.currency, b.pricing?.monthly, b.lead ? 'Yes' : 'No', b.source_url,
  ])
  const csv = [head, ...rows].map((r) => r.map(csvEscape).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `lead-intelligence-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function emptySuggestions(c) {
  const out = []
  if (c.radius_km) out.push('Expand the radius')
  if (Number(c.filters.min_reviews) > 0) out.push('Reduce the minimum reviews')
  if (Number(c.filters.min_rating) > 0) out.push('Lower the minimum rating')
  if (c.filters.website !== 'any') out.push('Remove the website filter')
  out.push('Try another industry')
  out.push(c.city ? 'Try another city or the whole state/region' : 'Try a specific city')
  return out
}

export default function LeadIntelligence() {
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const { appAuth } = useAuth()
  const [toast, toastNode] = useToast()

  const [boot, setBoot] = useState(null)
  const [bootError, setBootError] = useState(null)
  const [tab, setTab] = useState('discover')
  const [criteria, setCriteria] = useState(EMPTY_CRITERIA)

  const [results, setResults] = useState([])
  const [search, setSearch] = useState(null)
  const [lastCriteria, setLastCriteria] = useState(null)
  const [stage, setStage] = useState(null)
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const [error, setError] = useState(null)

  const [selected, setSelected] = useState(new Set())
  const [sort, setSort] = useState('score')
  const [analyzing, setAnalyzing] = useState(new Set())
  const [showIgnored, setShowIgnored] = useState(false)
  const [showFailed, setShowFailed] = useState(false)
  const [hideUnknown, setHideUnknown] = useState(false)

  const [panelId, setPanelId] = useState(null)
  const [outreach, setOutreach] = useState(null)
  const [callBiz, setCallBiz] = useState(null)
  const [dup, setDup] = useState(null)
  const [bulk, setBulk] = useState(null)

  const [history, setHistory] = useState({ loading: false, list: [] })
  const [dash, setDash] = useState({ loading: false, data: null })
  const [settingsVersion, setSettingsVersion] = useState(0)
  const stageTimer = useRef(null)

  const sender = (appAuth?.name || 'Eugene').split(' ')[0]

  // ---- bootstrap ---------------------------------------------------------
  useEffect(() => {
    intelApi('bootstrap').then((r) => {
      if (r.success) {
        setBoot(r)
        if (!r.settings) return
      } else setBootError(r)
    })
  }, [])

  const mergeResults = useCallback((updated) => {
    if (!updated?.length) return
    setResults((prev) => {
      const map = new Map(updated.map((u) => [u.id, u]))
      const next = prev.map((p) => (map.has(p.id) ? { ...p, ...map.get(p.id) } : p))
      for (const u of updated) if (!prev.some((p) => p.id === u.id)) next.unshift(u)
      return next
    })
  }, [])

  // ---- staged analysis ---------------------------------------------------
  const runAnalysis = useCallback(
    async (ids, filters, { staged = false } = {}) => {
      if (!ids.length) return
      setAnalyzing((prev) => new Set([...prev, ...ids]))
      if (staged) {
        setStage('analyzing')
        setProgress({ done: 0, total: ids.length })
      }
      let done = 0
      for (let i = 0; i < ids.length; i += ANALYZE_BATCH) {
        const batch = ids.slice(i, i + ANALYZE_BATCH)
        const r = await intelApi('analyze', { business_ids: batch, filters })
        if (r.success) mergeResults(r.results)
        else {
          toast(r.error || 'Website analysis failed for some businesses.', 'error')
          if (r.status === 429) {
            setAnalyzing((prev) => new Set([...prev].filter((x) => !ids.includes(x))))
            break
          }
        }
        done += batch.length
        setAnalyzing((prev) => new Set([...prev].filter((x) => !batch.includes(x))))
        if (staged) setProgress({ done, total: ids.length })
      }
      if (staged) {
        setStage('scoring')
        await new Promise((res) => setTimeout(res, 350))
        setStage('done')
      }
    },
    [mergeResults, toast],
  )

  // ---- search --------------------------------------------------------------
  async function doSearch() {
    setError(null)
    setSelected(new Set())
    setResults([])
    setSearch(null)
    setStage('finding')
    setProgress({ done: 0, total: 0 })
    clearTimeout(stageTimer.current)
    stageTimer.current = setTimeout(() => setStage((s) => (s === 'finding' ? 'enriching' : s)), 2500)
    const body = { ...criteria, filters: { ...criteria.filters } }
    const r = await intelApi('search', body)
    clearTimeout(stageTimer.current)
    if (!r.success) {
      setStage(null)
      setError(r)
      return
    }
    setResults(r.results)
    setSearch(r.search)
    setLastCriteria(r.criteria)
    setBoot((b) => (b ? { ...b, usage: r.usage } : b))
    if (r.results.length && r.analyze_queue?.length) {
      await runAnalysis(r.analyze_queue, r.criteria.filters, { staged: true })
    } else {
      setStage('scoring')
      await new Promise((res) => setTimeout(res, 300))
      setStage('done')
    }
  }

  // ---- actions ---------------------------------------------------------------
  async function refreshOne(id) {
    const r = await intelApi('detail', { business_id: id })
    if (r.success) mergeResults([{ ...r.business, filter_state: results.find((x) => x.id === id)?.filter_state }])
  }

  async function addOne(b, priceOverride) {
    if (b.lead) {
      navigate(`/leads/${b.lead.id}`)
      return
    }
    const c = await intelApi('check_leads', { business_ids: [b.id] })
    if (!c.success) return toast(c.error || 'Could not check existing leads.', 'error')
    const existing = c.checks?.[0]?.existing
    if (existing) {
      setDup({ business: b, existing, priceOverride })
      return
    }
    const overrides = priceOverride !== undefined && priceOverride !== '' && Number(priceOverride) !== Number(b.pricing?.suggested_price) ? { [b.id]: priceOverride } : undefined
    const r = await intelApi('add_leads', { business_ids: [b.id], price_overrides: overrides })
    if (!r.success) return toast(r.error || 'Could not add to Leads.', 'error')
    mergeResults(r.results)
    toast(`${b.business_name} added to Leads`)
  }

  async function resolveDup(mode) {
    const d = dup
    setDup(null)
    if (!d) return
    if (mode === 'open') return navigate(`/leads/${d.existing.id}`)
    if (mode === 'update') {
      const r = await intelApi('add_leads', { business_ids: [d.business.id], mode: 'update', lead_id: d.existing.id })
      if (!r.success) return toast(r.error || 'Could not update the lead.', 'error')
      mergeResults(r.results)
      toast('Existing lead updated. Status and activity were kept.')
    }
  }

  async function openBulk(mode) {
    const ids = [...selected]
    const c = await intelApi('check_leads', { business_ids: ids })
    if (!c.success) return toast(c.error || 'Could not check existing leads.', 'error')
    setBulk({ mode, ids, existing: c.checks.filter((x) => x.existing), assignTo: '' })
  }

  async function confirmBulk() {
    const b = bulk
    const r = await intelApi('add_leads', { business_ids: b.ids, assign_to: b.mode === 'assign' ? b.assignTo : undefined })
    setBulk(null)
    if (!r.success) return toast(r.error || 'Could not add to Leads.', 'error')
    mergeResults(r.results)
    setSelected(new Set())
    toast(`${r.added.length} added to Leads${r.skipped.length ? `, ${r.skipped.length} already existed` : ''}`)
  }

  async function setStatus(ids, status) {
    const r = await intelApi('set_status', { business_ids: ids, status })
    if (!r.success) return toast(r.error || 'Update failed.', 'error')
    setResults((prev) => prev.map((b) => (ids.includes(b.id) ? { ...b, status: b.lead && status === 'new' ? 'added' : status } : b)))
    if (status === 'ignored') toast(`${ids.length} ignored`)
  }

  async function logCall(payload) {
    const b = callBiz
    const r = await intelApi('log_call', { business_id: b.id, lead_id: b.lead?.id, ...payload })
    if (!r.success) {
      toast(r.error || 'Could not save the call.', 'error')
      return false
    }
    toast(`Call saved${r.follow_up_created ? ' and follow-up scheduled' : ''}`)
    await refreshOne(b.id)
    return true
  }

  async function manualAdd(data) {
    const r = await intelApi('manual_add', data)
    if (!r.success) {
      toast(r.error || 'Could not add the business.', 'error')
      return false
    }
    mergeResults([r.business])
    setStage((s) => s || 'done')
    toast('Business added')
    if (r.analyze_queue?.length) runAnalysis(r.analyze_queue, lastCriteria?.filters)
    return true
  }

  async function enrich(b) {
    const r = await intelApi('enrich', { business_id: b.id })
    if (!r.success) return toast(r.error || 'Refresh failed.', 'error')
    mergeResults([r.business])
    toast('Business data refreshed')
  }

  const handlers = {
    onOpen: (b) => setPanelId(b.id),
    onAnalyze: (ids) => runAnalysis(ids, lastCriteria?.filters),
    onAdd: addOne,
    onCall: (b) => setCallBiz(b),
    onOutreach: (list) => setOutreach(list),
    onOpenWebsite: (b) => b.website && window.open(b.website, '_blank', 'noopener,noreferrer'),
    onCopyPhone: async (b) => toast((await copyText(b.phone || b.phone_intl)) ? 'Phone copied' : 'Copy failed', 'info'),
    onSave: (b) => setStatus([b.id], b.status === 'saved' ? 'new' : 'saved'),
    onIgnore: (b) => setStatus([b.id], b.status === 'ignored' ? 'new' : 'ignored'),
    onEnrich: enrich,
    onOpenLead: (id) => navigate(`/leads/${id}`),
    onSaveLeadPrice: async (b, price) => {
      const r = await intelApi('set_lead_price', { lead_id: b.lead.id, price, currency: b.pricing?.currency })
      toast(r.success ? 'Price saved to lead' : r.error || 'Could not save price', r.success ? 'info' : 'error')
    },
    onBulkAdd: () => openBulk('add'),
    onBulkAssign: () => openBulk('assign'),
    onBulkAnalyze: () => {
      const ids = results.filter((b) => selected.has(b.id) && b.website && b.website_state !== 'social_only').map((b) => b.id)
      if (!ids.length) return toast('None of the selected businesses have a website to analyze.', 'error')
      runAnalysis(ids, lastCriteria?.filters)
    },
    onBulkOutreach: () => setOutreach(sortResults(results.filter((b) => selected.has(b.id)), sort)),
    onBulkExport: () => exportCsv(sortResults(results.filter((b) => selected.has(b.id)), sort), boot.catalog),
    onBulkIgnore: () => {
      setStatus([...selected], 'ignored')
      setSelected(new Set())
    },
  }

  // ---- tabs ----------------------------------------------------------------
  function openTab(t) {
    setTab(t)
    if (t === 'history') {
      setHistory((h) => ({ ...h, loading: true }))
      intelApi('history', { limit: 60 }).then((r) => setHistory({ loading: false, list: r.success ? r.searches : [] }))
    }
    if (t === 'dashboard') {
      setDash((d) => ({ ...d, loading: true }))
      intelApi('dashboard').then((r) => {
        setDash({ loading: false, data: r.success ? r : null })
        if (r.success) setBoot((b) => (b ? { ...b, usage: r.usage } : b))
      })
    }
  }

  async function reopen(s) {
    const r = await intelApi('results', { search_id: s.id })
    if (!r.success) return toast(r.error || 'Could not reopen this search.', 'error')
    setResults(r.results)
    setSearch({ id: s.id, label: s.label, provider: s.provider, created_at: s.created_at, reopened: true, stats: { kept: r.results.length } })
    setLastCriteria({ filters: r.search.filters || {} })
    setCriteria((c) => ({
      ...c,
      market: s.market || c.market,
      region: s.region || '',
      city: s.city || '',
      postal_code: s.postal_code || '',
      radius_km: s.radius_km ? String(s.radius_km) : '',
      industries: s.industries || [],
      custom_term: s.custom_term || '',
      filters: { ...EMPTY_FILTERS, ...Object.fromEntries(Object.entries(r.search.filters || {}).filter(([k]) => k in EMPTY_FILTERS).map(([k, v]) => [k, v ?? ''])) },
    }))
    setStage('done')
    setSelected(new Set())
    setTab('discover')
  }

  async function savePreset(name) {
    const r = await intelApi('preset_save', { name, criteria })
    if (!r.success) {
      toast(r.error || 'Could not save preset.', 'error')
      return false
    }
    setBoot((b) => ({ ...b, presets: [...b.presets, r.preset] }))
    toast('Preset saved')
    return true
  }

  async function deletePreset(p) {
    if (!window.confirm(`Delete the preset “${p.name}”?`)) return
    const r = await intelApi('preset_delete', { preset_id: p.id })
    if (!r.success) return toast(r.error || 'Could not delete preset.', 'error')
    setBoot((b) => ({ ...b, presets: b.presets.filter((x) => x.id !== p.id) }))
  }

  async function saveSettings(settings) {
    const r = await intelApi('settings_save', { settings })
    if (!r.success) return toast(r.error || 'Settings not saved.', 'error')
    setBoot((b) => ({ ...b, settings: r.settings }))
    setSettingsVersion((v) => v + 1)
    toast('Settings saved. Scores and prices now use the new values.')
    if (search?.id) {
      const rr = await intelApi('results', { search_id: search.id })
      if (rr.success) setResults(rr.results)
    }
  }

  // ---- derived -------------------------------------------------------------
  const visible = useMemo(
    () =>
      results.filter(
        (b) => (showIgnored || b.status !== 'ignored') && (showFailed || b.filter_state !== 'fail') && (!hideUnknown || b.filter_state !== 'unknown'),
      ),
    [results, showIgnored, showFailed, hideUnknown],
  )
  const counts = {
    visible: visible.length,
    failed: results.filter((b) => b.filter_state === 'fail').length,
    unknown: results.filter((b) => b.filter_state === 'unknown').length,
    ignored: results.filter((b) => b.status === 'ignored').length,
  }
  const panelBiz = results.find((b) => b.id === panelId) || null
  const busy = stage === 'finding' || stage === 'enriching'
  const inProgress = stage && stage !== 'done'
  const highOpp = results.filter((b) => b.high_opportunity).length

  // ---- render ----------------------------------------------------------------
  if (bootError) {
    const auth = bootError.status === 401
    return (
      <PageShell style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <Header isMobile={isMobile} />
        <div style={{ ...S.card, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <AlertTriangle size={18} color="rgba(255,255,255,0.7)" style={{ flexShrink: 0, marginTop: 2 }} />
          <div style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.8)', lineHeight: 1.6 }}>
            {auth ? (
              <>
                Your session needs to be refreshed to use Lead Intelligence. <b>Sign out and sign back in</b>, then open this page again.
              </>
            ) : (
              bootError.error || 'Lead Intelligence is temporarily unavailable. Please try again.'
            )}
          </div>
        </div>
      </PageShell>
    )
  }
  if (!boot) {
    return (
      <PageShell style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <Header isMobile={isMobile} />
        <div style={{ ...S.card, textAlign: 'center', ...S.muted, fontSize: 13, padding: '3rem' }}>
          <Spinner /> Loading Lead Intelligence…
        </div>
      </PageShell>
    )
  }

  const configured = boot.providers.some((p) => p.key !== 'manual' && p.configured)

  return (
    <PageShell style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <style>{GLOBAL_CSS}</style>
      <Header isMobile={isMobile} usage={boot.usage} />

      {/* Tabs */}
      <div style={{ display: 'inline-flex', gap: 4, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', padding: 4, borderRadius: 999, alignSelf: 'flex-start', maxWidth: '100%', overflowX: 'auto' }}>
        {TABS.map((t) => {
          const active = tab === t.key
          const Icon = t.icon
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => openTab(t.key)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 16px', borderRadius: 999, fontSize: 12.5, fontWeight: 500, border: 'none', cursor: 'pointer', background: active ? '#fff' : 'transparent', color: active ? '#000' : 'rgba(255,255,255,0.45)', whiteSpace: 'nowrap', fontFamily: 'inherit' }}
            >
              <Icon size={13} /> {t.label}
            </button>
          )
        })}
      </div>

      {tab === 'discover' && (
        <>
          {!configured && (
            <div style={{ ...S.card, fontSize: 13, color: 'rgba(255,255,255,0.8)', lineHeight: 1.6 }}>
              Business discovery is not configured yet. Add <code>GOOGLE_PLACES_API_KEY</code> in Vercel → Settings → Environment Variables and redeploy. Manual business entry still works.
            </div>
          )}
          <SearchPanel
            catalog={boot.catalog}
            settings={boot.settings}
            presets={boot.presets}
            criteria={criteria}
            setCriteria={setCriteria}
            onSearch={doSearch}
            busy={busy}
            onSavePreset={savePreset}
            onDeletePreset={deletePreset}
            onManualAdd={manualAdd}
            isMobile={isMobile}
          />

          {stage && <StageBar stage={stage} progress={progress} />}

          {error && (
            <div style={{ ...S.card, display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 13.5, color: 'rgba(255,255,255,0.85)', lineHeight: 1.5 }}>
                <AlertTriangle size={17} style={{ flexShrink: 0, marginTop: 1 }} />
                {error.status === 401 ? 'Your session expired. Sign out and sign back in.' : error.error || 'Business discovery is temporarily unavailable. Please try again.'}
              </div>
              {error.status !== 400 && error.status !== 401 && (
                <Button small onClick={doSearch}>
                  <RotateCcw size={12} /> Try again
                </Button>
              )}
            </div>
          )}

          {search && (
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', alignItems: 'baseline' }}>
              <div>
                <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff' }}>
                  {search.label}
                  {search.reopened ? <span style={{ ...S.muted, fontWeight: 400, fontSize: 13 }}> · reopened</span> : null}
                </div>
                {search.stats && !search.reopened && (
                  <div style={{ fontSize: 12.5, ...S.muted, marginTop: 4 }}>
                    {search.stats.kept} matched · {search.stats.new} new · {search.stats.duplicates} duplicates merged · {search.stats.filtered_out} filtered out ·{' '}
                    {search.stats.already_in_leads} already in Leads · {highOpp} high-opportunity · {search.stats.requests} provider requests ({fmtCost(search.stats.est_cost)} est.)
                  </div>
                )}
                {search.provider_note && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 6 }}>{search.provider_note}</div>}
              </div>
            </div>
          )}

          {results.length > 0 && (
            <ResultsView
              results={visible}
              selected={selected}
              setSelected={setSelected}
              sort={sort}
              setSort={setSort}
              analyzing={analyzing}
              isMobile={isMobile}
              handlers={handlers}
              counts={counts}
              toggles={{
                showFailed,
                toggleFailed: () => setShowFailed((v) => !v),
                hideUnknown,
                toggleUnknown: () => setHideUnknown((v) => !v),
                showIgnored,
                toggleIgnored: () => setShowIgnored((v) => !v),
              }}
            />
          )}

          {stage === 'done' && search && results.length === 0 && !error && (
            <div style={{ ...S.card, textAlign: 'center', padding: '2.5rem 1.5rem' }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#fff' }}>No businesses matched your criteria.</div>
              <div style={{ fontSize: 13, ...S.muted, marginTop: 10 }}>Suggestions:</div>
              <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap', marginTop: 8 }}>
                {emptySuggestions(criteria).map((sg) => (
                  <span key={sg} style={{ fontSize: 12, padding: '4px 10px', borderRadius: 999, background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.7)' }}>
                    {sg}
                  </span>
                ))}
              </div>
            </div>
          )}
          {!stage && !search && !error && (
            <div style={{ ...S.card, textAlign: 'center', padding: '2.5rem 1.5rem', ...S.muted, fontSize: 13, lineHeight: 1.6 }}>
              Choose a market, an industry and your filters, then click <b style={{ color: '#fff' }}>Discover</b>.
              <br />
              Results are scored for Lithos Labs fit, with a recommended package and suggested price.
            </div>
          )}
          {inProgress && results.length === 0 && busy && (
            <div style={{ ...S.card, padding: 0, overflow: 'hidden' }}>
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} style={{ height: 58, borderBottom: '1px solid rgba(255,255,255,0.04)', background: `linear-gradient(90deg, rgba(255,255,255,0.02), rgba(255,255,255,${0.04 - i * 0.005}), rgba(255,255,255,0.02))` }} />
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'history' && <HistoryTab searches={history.list} loading={history.loading} catalog={boot.catalog} onReopen={reopen} isMobile={isMobile} />}
      {tab === 'dashboard' && <DashboardTab data={dash.data} loading={dash.loading} catalog={boot.catalog} isMobile={isMobile} />}
      {tab === 'settings' && (
        <SettingsTab key={`settings-${settingsVersion}`} settings={boot.settings} defaults={boot.default_settings} catalog={boot.catalog} providers={boot.providers} canEdit={appAuth?.role === 'admin'} onSave={saveSettings} isMobile={isMobile} />
      )}

      <BusinessPanel key={`panel-${panelId || 'closed'}`} business={panelBiz} open={!!panelBiz} onClose={() => setPanelId(null)} handlers={handlers} analyzing={analyzing} catalog={boot.catalog} isMobile={isMobile} />
      <OutreachModal key={`outreach-${outreach ? outreach.map((b) => b.id).join(',') : 'closed'}`} open={!!outreach} onClose={() => setOutreach(null)} businesses={outreach} sender={sender} catalog={boot.catalog.industries} onCopied={toast} />
      <CallModal key={`call-${callBiz ? callBiz.id : 'closed'}`} open={!!callBiz} onClose={() => setCallBiz(null)} business={callBiz} onSubmit={logCall} />

      <Modal
        open={!!dup}
        onClose={() => setDup(null)}
        title="Already in your Leads"
        width={460}
        footer={
          <>
            <Button onClick={() => setDup(null)}>Cancel</Button>
            <Button onClick={() => resolveDup('update')}>Update existing lead</Button>
            <Button variant="solid" onClick={() => resolveDup('open')}>
              Open existing lead
            </Button>
          </>
        }
      >
        {dup && (
          <div style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.8)', lineHeight: 1.6 }}>
            This business already exists in your Leads as <b style={{ color: '#fff' }}>{dup.existing.company_name}</b> ({dup.existing.status || 'new'}).
            <div style={{ fontSize: 12.5, ...S.muted, marginTop: 6 }}>Matched by: {dup.existing.reason}.</div>
            <div style={{ fontSize: 12.5, ...S.muted, marginTop: 6 }}>Updating fills in missing contact details and refreshes the score and recommendation. Status and activity history are kept.</div>
          </div>
        )}
      </Modal>

      <Modal
        open={!!bulk}
        onClose={() => setBulk(null)}
        title={bulk?.mode === 'assign' ? 'Add and assign to a rep' : 'Add to Leads'}
        width={480}
        footer={
          <>
            <Button onClick={() => setBulk(null)}>Cancel</Button>
            <Button variant="solid" disabled={!bulk || bulk.ids.length - bulk.existing.length === 0 || (bulk.mode === 'assign' && !bulk.assignTo)} onClick={confirmBulk}>
              <Check size={13} /> Confirm
            </Button>
          </>
        }
      >
        {bulk && (
          <div style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.8)', lineHeight: 1.6 }}>
            <b style={{ color: '#fff' }}>{bulk.ids.length - bulk.existing.length}</b> business{bulk.ids.length - bulk.existing.length === 1 ? '' : 'es'} will be added to your Leads pipeline as Discovered.
            {bulk.existing.length > 0 && (
              <div style={{ fontSize: 12.5, ...S.muted, marginTop: 8 }}>
                {bulk.existing.length} already exist and will be skipped: {bulk.existing.slice(0, 4).map((x) => x.business_name).join(', ')}
                {bulk.existing.length > 4 ? '…' : ''}
              </div>
            )}
            {bulk.mode === 'assign' && (
              <Field label="Assign to" style={{ marginTop: 14 }}>
                {boot.reps.length ? (
                  <select style={S.select} value={bulk.assignTo} onChange={(e) => setBulk({ ...bulk, assignTo: e.target.value })}>
                    <option value="">Choose a rep</option>
                    {boot.reps.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div style={{ fontSize: 12.5, ...S.muted }}>No sales reps found. Add reps on the Team page.</div>
                )}
              </Field>
            )}
          </div>
        )}
      </Modal>
      {toastNode}
    </PageShell>
  )
}

function Header({ isMobile, usage }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap' }}>
      <div>
        <h2 style={S.h2}>Discover Leads</h2>
        <p style={{ ...S.sub, marginBottom: 0 }}>Lead Intelligence Engine: find, analyze, score and price prospects, then move them into your pipeline.</p>
      </div>
      {usage && !isMobile && (
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', textAlign: 'right', lineHeight: 1.5 }}>
          Today: {usage.searches}/{usage.limits?.max_searches_per_day} searches · {usage.businesses_returned} businesses
          <br />
          Estimated provider cost {fmtCost(usage.est_cost)}
        </div>
      )}
    </div>
  )
}

function StageBar({ stage, progress }) {
  const idx = STAGES.findIndex((s) => s.key === stage)
  const current = STAGES[idx]
  return (
    <div style={{ ...S.card, padding: '12px 16px' }} aria-live="polite">
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#fff' }}>
          {stage === 'done' ? <Check size={14} /> : <Spinner />}
          {current?.label}
          {stage === 'analyzing' && progress.total > 0 && <span style={S.muted}>({progress.done}/{progress.total} websites)</span>}
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {STAGES.map((s, i) => (
            <span key={s.key} title={s.label} style={{ width: 26, height: 4, borderRadius: 999, background: i <= idx ? '#fff' : 'rgba(255,255,255,0.12)' }} />
          ))}
        </div>
      </div>
    </div>
  )
}

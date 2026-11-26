import { useEffect, useMemo, useRef, useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Search, LogOut, UserCog, CornerDownLeft, Plus } from 'lucide-react'
import QuickAdd from '../components/QuickAdd'
import useIsMobile from '../utils/useIsMobile'
import { areasForRole, areaForPath, tabMatches, SETTINGS_TABS, canSee } from './nav'
import './shell.css'

const lastTabKey = (area) => `lx_last_tab_${area}`
const remember = (area, path) => { try { sessionStorage.setItem(lastTabKey(area), path) } catch { /* private mode */ } }
const recall = (area) => { try { return sessionStorage.getItem(lastTabKey(area)) } catch { return null } }

function initialsOf(appAuth) {
  return (appAuth.name || appAuth.email || '?').split(/[\s@.]+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('')
}

function AccountMenu({ appAuth, onLogout }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const navigate = useNavigate()
  useEffect(() => {
    if (!open) return
    const close = (e) => { if (!ref.current?.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])
  const settings = SETTINGS_TABS.filter((t) => canSee(t, appAuth.role))
  return (
    <div className="lx-me" ref={ref}>
      <button type="button" className="lx-avatar" onClick={() => setOpen((o) => !o)} aria-label="Account">{initialsOf(appAuth)}</button>
      {open && (
        <div className="lx-menu">
          <div className="who"><b>{appAuth.name || appAuth.email}</b><span>{appAuth.role}</span></div>
          {settings.map((t) => (
            <button key={t.path} type="button" onClick={() => { setOpen(false); navigate(t.path) }}><UserCog size={15} />{t.label}</button>
          ))}
          <button type="button" onClick={onLogout}><LogOut size={15} />Log out</button>
        </div>
      )}
    </div>
  )
}

function CommandPalette({ areas, appAuth, onClose }) {
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [sel, setSel] = useState(0)
  const items = useMemo(() => {
    const pages = areas.flatMap((a) => a.tabs.map((t) => ({ group: a.label, label: t.label, path: t.path })))
    const settings = SETTINGS_TABS.filter((t) => canSee(t, appAuth.role)).map((t) => ({ group: 'Account', label: t.label, path: t.path }))
    const all = [...pages, ...settings]
    const s = q.trim().toLowerCase()
    return s ? all.filter((i) => `${i.label} ${i.group}`.toLowerCase().includes(s)) : all
  }, [areas, appAuth.role, q])
  const go = (i) => { const it = items[i]; if (it) { onClose(); navigate(it.path) } }
  let lastGroup = ''
  return (
    <div className="lx-pal-bg" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="lx-pal">
        <input
          autoFocus
          placeholder="Jump to a page…"
          value={q}
          onChange={(e) => { setQ(e.target.value); setSel(0) }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') { e.preventDefault(); setSel((s) => Math.min(items.length - 1, s + 1)) }
            if (e.key === 'ArrowUp') { e.preventDefault(); setSel((s) => Math.max(0, s - 1)) }
            if (e.key === 'Enter') go(sel)
            if (e.key === 'Escape') onClose()
          }}
        />
        <div className="lx-pal-list">
          {items.map((it, i) => {
            const head = it.group !== lastGroup ? <div className="lx-pal-g">{(lastGroup = it.group)}</div> : null
            return (
              <div key={it.path + i}>
                {head}
                <div className={`lx-pal-i ${i === sel ? 'on' : ''}`} onMouseEnter={() => setSel(i)} onClick={() => go(i)}>
                  {it.label}{i === sel && <small><CornerDownLeft size={12} /></small>}
                </div>
              </div>
            )
          })}
          {!items.length && <div className="lx-pal-i">No matches</div>}
        </div>
      </div>
    </div>
  )
}

export default function Shell({ appAuth, onLogout, children, background }) {
  const isMobile = useIsMobile()
  const location = useLocation()
  const navigate = useNavigate()
  const areas = useMemo(() => areasForRole(appAuth.role), [appAuth.role])
  const current = areaForPath(areas, location.pathname)
  const [palette, setPalette] = useState(false)
  const [quick, setQuick] = useState(false)

  // remember the last tab you used in each area
  useEffect(() => {
    if (current) remember(current.key, location.pathname)
  }, [current, location.pathname])

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPalette((p) => !p) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const openArea = (a) => {
    const last = recall(a.key)
    const target = last && a.tabs.some((t) => tabMatches(t, last)) ? last : a.tabs[0].path
    navigate(target)
  }

  return (
    <div className="lx-shell">
      {background}
      <header className="lx-top">
        <div className="lx-bar">
          <a className="lx-brand" href="/" onClick={(e) => { e.preventDefault(); navigate('/') }}>
            <img src="/lithos-logo.png" alt="" /><b>Lithos</b><span>Labs</span>
          </a>
          <nav className="lx-areas" aria-label="Areas">
            {areas.map((a) => {
              const Icon = a.icon
              const on = current?.key === a.key
              return (
                <button key={a.key} type="button" className={`lx-area ${on ? 'on' : ''}`} onClick={() => openArea(a)}>
                  {on && <motion.div layoutId="lx-area-pill" className="pill" transition={{ type: 'spring', stiffness: 520, damping: 38 }} />}
                  <Icon size={14} strokeWidth={2} />
                  <span>{a.label}</span>
                </button>
              )
            })}
          </nav>
          <div className="lx-right">
            <button type="button" className="lx-new" onClick={() => setQuick(true)} aria-label="New lead from a call"><Plus size={15} strokeWidth={2.4} /><span>New</span></button>
            <button type="button" className="lx-search" onClick={() => setPalette(true)}>
              <Search size={14} /><span>Jump to…</span><span className="lx-kbd">⌘K</span>
            </button>
            <AccountMenu appAuth={appAuth} onLogout={onLogout} />
          </div>
        </div>
        {current && (current.tabs.length > 1 || isMobile) && (
          <div className="lx-tabs">
            <span className="area-name">{current.label}</span>
            {current.tabs.map((t) => {
              const on = tabMatches(t, location.pathname)
              return (
                <NavLink key={t.path} to={t.path} end={t.end} className={`lx-tab ${on ? 'on' : ''}`}>
                  {t.label}
                  {on && <motion.span layoutId="lx-tab-line" className="line" transition={{ type: 'spring', stiffness: 520, damping: 40 }} />}
                </NavLink>
              )
            })}
          </div>
        )}
      </header>
      <main className={`lx-main ${location.pathname === '/agents' ? 'flush' : ''}`}>{children}</main>
      {isMobile && (
        <nav className="lx-mobile" style={{ '--n': areas.length + 1 }} aria-label="Areas">
          {areas.flatMap((a, i) => {
            const Icon = a.icon
            const on = current?.key === a.key
            const btn = (
              <button key={a.key} type="button" className={on ? 'on' : ''} onClick={() => openArea(a)}>
                <Icon size={20} strokeWidth={on ? 2.2 : 1.8} />
                {a.label}
              </button>
            )
            return i === Math.min(1, areas.length - 1)
              ? [btn, <button key="plus" type="button" className="lx-plus" onClick={() => setQuick(true)} aria-label="New lead from a call"><i><Plus size={22} /></i></button>]
              : [btn]
          })}
        </nav>
      )}
      {palette && <CommandPalette areas={areas} appAuth={appAuth} onClose={() => setPalette(false)} />}
      {quick && <QuickAdd onClose={() => setQuick(false)} onSaved={(id) => id && navigate(`/leads/${id}`)} />}
    </div>
  )
}

import { useEffect, useState } from 'react'
import {
  NavLink,
  Routes,
  Route,
  useLocation,
  useNavigate,
} from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  LogOut,
  LayoutDashboard,
  Users,
  Kanban,
  Package,
  BookOpen,
  CheckSquare,
  Upload,
} from 'lucide-react'
import { migrateSchema } from './utils/migrateSchema'
import Background from './components/Background'
import Dashboard from './pages/Dashboard'
import Leads from './pages/Leads'
import LeadDetail from './pages/LeadDetail'
import Pipeline from './pages/Pipeline'
import Offers from './pages/Offers'
import Scripts from './pages/Scripts'
import Tasks from './pages/Tasks'
import Import from './pages/Import'
import Login from './pages/Login'
import useIsMobile from './utils/useIsMobile'

const navItems = [
  { to: '/', label: 'Dashboard', end: true, icon: LayoutDashboard },
  { to: '/leads', label: 'Leads', icon: Users },
  { to: '/pipeline', label: 'Pipeline', icon: Kanban },
  { to: '/offers', label: 'Offers', icon: Package },
  { to: '/scripts', label: 'Scripts', icon: BookOpen },
  { to: '/tasks', label: 'Tasks', icon: CheckSquare },
  { to: '/import', label: 'Import', icon: Upload },
]

const mobileBottomNavItems = navItems.slice(0, 6)

const logoStyle = {
  color: '#ffffff',
  fontWeight: 700,
  fontSize: 16,
  letterSpacing: '-0.3px',
}

const dotStyle = {
  width: 6,
  height: 6,
  borderRadius: '50%',
  background: 'var(--accent-blue)',
  boxShadow: '0 0 10px var(--accent-blue-glow)',
  animation: 'glowPulse 2s ease-in-out infinite',
}

const avatarStyle = {
  width: 32,
  height: 32,
  borderRadius: '50%',
  background: 'rgba(255,255,255,0.06)',
  border: '0.5px solid rgba(255,255,255,0.1)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: 'rgba(255,255,255,0.85)',
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: '0.04em',
}

const signOutStyle = {
  width: 32,
  height: 32,
  borderRadius: 8,
  background: 'transparent',
  border: '0.5px solid transparent',
  color: 'rgba(255,255,255,0.3)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  transition: 'color 0.15s ease, border-color 0.15s ease',
}

function NavTabs() {
  const location = useLocation()
  return (
    <nav
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        background: 'rgba(255,255,255,0.03)',
        border: '0.5px solid rgba(255,255,255,0.06)',
        padding: 3,
        borderRadius: 999,
      }}
    >
      {navItems.map((item) => {
        const active = item.end
          ? location.pathname === item.to
          : location.pathname.startsWith(item.to)
        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            style={{
              position: 'relative',
              padding: '6px 16px',
              borderRadius: 999,
              fontSize: 12.5,
              fontWeight: 500,
              letterSpacing: '0.01em',
              color: active ? '#000000' : 'rgba(255,255,255,0.5)',
              transition: 'color 0.15s ease',
            }}
          >
            {active && (
              <motion.div
                layoutId="activeTab"
                transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: '#ffffff',
                  borderRadius: 999,
                  zIndex: 0,
                }}
              />
            )}
            <span style={{ position: 'relative', zIndex: 1 }}>{item.label}</span>
          </NavLink>
        )
      })}
    </nav>
  )
}

function MobileBottomNav() {
  const location = useLocation()
  return (
    <nav
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: 64,
        background: 'rgba(8,8,8,0.95)',
        borderTop: '0.5px solid rgba(255,255,255,0.08)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        padding: '0 4px',
        zIndex: 90,
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      {mobileBottomNavItems.map((item) => {
        const Icon = item.icon
        const active = item.end
          ? location.pathname === item.to
          : location.pathname.startsWith(item.to)
        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 3,
              padding: '8px 0',
              minHeight: 48,
              color: active ? '#ffffff' : 'rgba(255,255,255,0.35)',
              transition: 'color 0.15s ease',
            }}
          >
            <Icon size={20} strokeWidth={active ? 2.2 : 1.8} />
            <span style={{ fontSize: 10, fontWeight: 500 }}>{item.label}</span>
          </NavLink>
        )
      })}
    </nav>
  )
}

function AnimatedRoutes() {
  const location = useLocation()
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/leads" element={<Leads />} />
        <Route path="/leads/:id" element={<LeadDetail />} />
        <Route path="/pipeline" element={<Pipeline />} />
        <Route path="/offers" element={<Offers />} />
        <Route path="/scripts" element={<Scripts />} />
        <Route path="/tasks" element={<Tasks />} />
        <Route path="/import" element={<Import />} />
      </Routes>
    </AnimatePresence>
  )
}

function Shell() {
  const navigate = useNavigate()
  const isMobile = useIsMobile()

  function signOut() {
    localStorage.removeItem('orvex_auth')
    navigate('/', { replace: true })
    window.location.reload()
  }

  const topbarStyle = {
    height: isMobile ? 52 : 56,
    width: '100%',
    background: 'rgba(12,12,14,0.65)',
    borderBottom: '0.5px solid rgba(255,255,255,0.06)',
    backdropFilter: 'blur(24px) saturate(180%)',
    WebkitBackdropFilter: 'blur(24px) saturate(180%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: isMobile ? '0 1rem' : '0 1.5rem',
    position: 'sticky',
    top: 0,
    zIndex: 100,
  }

  const mainStyle = {
    maxWidth: 1400,
    margin: '0 auto',
    padding: isMobile ? '1rem' : '2rem',
    paddingBottom: isMobile ? 88 : 32,
    position: 'relative',
    zIndex: 1,
  }

  return (
    <div style={{ minHeight: '100vh', background: 'transparent', color: '#fff', position: 'relative' }}>
      <Background />
      <header style={topbarStyle}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            minWidth: isMobile ? 'auto' : 160,
          }}
        >
          <span style={logoStyle}>ORVEX</span>
          <span style={dotStyle} />
        </div>
        {!isMobile && <NavTabs />}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            justifyContent: 'flex-end',
            minWidth: isMobile ? 'auto' : 160,
          }}
        >
          <div style={avatarStyle}>EG</div>
          <button
            type="button"
            onClick={signOut}
            style={signOutStyle}
            aria-label="Sign out"
          >
            <LogOut size={14} />
          </button>
        </div>
      </header>
      <main style={mainStyle}>
        <AnimatedRoutes />
      </main>
      {isMobile && <MobileBottomNav />}
    </div>
  )
}

export default function App() {
  const [authed, setAuthed] = useState(
    () => localStorage.getItem('orvex_auth') === 'true',
  )

  useEffect(() => {
    if (authed) migrateSchema()
  }, [authed])

  if (!authed) {
    return <Login onSuccess={() => setAuthed(true)} />
  }
  return <Shell />
}

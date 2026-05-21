import { useEffect, useState } from 'react'
import {
  NavLink,
  Routes,
  Route,
  Navigate,
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
  Monitor,
  ListChecks,
  Sparkles,
  FileText,
  Zap,
  UserCog,
  Share2,
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
import Demos from './pages/Demos'
import Workflow from './pages/Workflow'
import PublicDemo from './pages/PublicDemo'
import MarketingEngine from './pages/MarketingEngine'
import Documents from './pages/Documents'
import Automations from './pages/Automations'
import Team from './pages/Team'
import Social from './pages/Social'
import AppLogin from './components/AppLogin'
import { AuthContext } from './lib/auth'
import useIsMobile from './utils/useIsMobile'

// Single source of truth for navigation.
//  - adminOnly: only the admin sees it
//  - repOnly:   only a sales rep sees it
//  - (neither): everyone sees it
// Roles: 'admin' | 'manager' | 'sales'.
//  - adminOnly:   only admin
//  - roles:       explicit allow-list (admin always sees everything)
//  - (neither):   every role sees it
const navItems = [
  { path: '/', label: 'Dashboard', end: true, icon: LayoutDashboard },
  { path: '/leads', label: 'Leads', icon: Users },
  { path: '/pipeline', label: 'Pipeline', icon: Kanban },
  { path: '/offers', label: 'Offers', icon: Package },
  { path: '/scripts', label: 'Scripts', icon: BookOpen },
  { path: '/tasks', label: 'Tasks', icon: CheckSquare },
  { path: '/workflow', label: 'Workflow', icon: ListChecks, adminOnly: true },
  { path: '/documents', label: 'Documents', icon: FileText, adminOnly: true },
  { path: '/automations', label: 'Automations', icon: Zap, adminOnly: true },
  { path: '/team', label: 'Team', icon: UserCog, roles: ['admin', 'manager'] },
  { path: '/marketing', label: 'AI Office', icon: Sparkles, adminOnly: true },
  { path: '/social', label: 'Social Media', icon: Share2, adminOnly: true },
  { path: '/demos', label: 'Demos', icon: Monitor, adminOnly: true },
  { path: '/import', label: 'Import', icon: Upload, adminOnly: true },
]

const navForRole = (role) =>
  navItems.filter((item) => {
    if (role === 'admin') return true
    if (item.adminOnly) return false
    if (item.roles) return item.roles.includes(role)
    return true
  })

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

function NavTabs({ items }) {
  const location = useLocation()
  return (
    <nav
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        background: 'rgba(255, 255, 255,0.04)',
        border: '0.5px solid rgba(255, 255, 255,0.1)',
        padding: 3,
        borderRadius: 999,
      }}
    >
      {items.map((item) => {
        const active = item.end
          ? location.pathname === item.path
          : location.pathname.startsWith(item.path)
        return (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.end}
            style={{
              position: 'relative',
              padding: '6px 14px',
              borderRadius: 999,
              fontSize: 12.5,
              fontWeight: 500,
              letterSpacing: '0.01em',
              color: active ? '#000000' : 'rgba(255,255,255,0.55)',
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
                  background: '#FFFFFF',
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

function MobileBottomNav({ items }) {
  const location = useLocation()
  const bottomItems = items.slice(0, 6)
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
      {bottomItems.map((item) => {
        const Icon = item.icon
        const active = item.end
          ? location.pathname === item.path
          : location.pathname.startsWith(item.path)
        return (
          <NavLink
            key={item.path}
            to={item.path}
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

// Admin-only route guard. Non-admins hitting an admin URL bounce home.
function AdminOnly({ role, children }) {
  if (role !== 'admin') return <Navigate to="/" replace />
  return children
}

// Allow-list route guard for routes shared by a subset of roles.
function RoleGuard({ role, allow, children }) {
  if (!allow.includes(role)) return <Navigate to="/" replace />
  return children
}

function AnimatedRoutes({ role }) {
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
        <Route
          path="/workflow"
          element={
            <AdminOnly role={role}>
              <Workflow />
            </AdminOnly>
          }
        />
        <Route
          path="/documents"
          element={
            <AdminOnly role={role}>
              <Documents />
            </AdminOnly>
          }
        />
        <Route
          path="/automations"
          element={
            <AdminOnly role={role}>
              <Automations />
            </AdminOnly>
          }
        />
        <Route
          path="/team"
          element={
            <RoleGuard role={role} allow={['admin', 'manager']}>
              <Team />
            </RoleGuard>
          }
        />
        <Route
          path="/marketing"
          element={
            <AdminOnly role={role}>
              <MarketingEngine />
            </AdminOnly>
          }
        />
        <Route
          path="/social"
          element={
            <AdminOnly role={role}>
              <Social />
            </AdminOnly>
          }
        />
        <Route
          path="/demos"
          element={
            <AdminOnly role={role}>
              <Demos />
            </AdminOnly>
          }
        />
        <Route
          path="/import"
          element={
            <AdminOnly role={role}>
              <Import />
            </AdminOnly>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  )
}

function Shell({ appAuth, onLogout }) {
  const isMobile = useIsMobile()
  const items = navForRole(appAuth.role)

  const initials = (appAuth.name || appAuth.email || '?')
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('')

  const roleLabel =
    appAuth?.role === 'admin'
      ? 'ADMIN'
      : appAuth?.role === 'manager'
        ? 'MANAGER'
        : 'SALES'
  const roleColor =
    {
      admin: '#FFFFFF',
      manager: 'rgba(255, 255, 255,0.9)',
      sales: 'rgba(255, 255, 255,0.9)',
    }[appAuth?.role] || 'rgba(255, 255, 255,0.9)'

  const topbarStyle = {
    height: isMobile ? 52 : 56,
    width: '100%',
    background: 'rgba(10,10,10,0.65)',
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
    <div
      style={{
        minHeight: '100vh',
        background: 'transparent',
        color: '#fff',
        position: 'relative',
      }}
    >
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
          <img
            src="/lithos-logo.png"
            alt="Lithos Labs"
            style={{
              width: 24,
              height: 24,
              objectFit: 'contain',
              filter: 'brightness(0) invert(1)',
              opacity: 0.9,
            }}
          />
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
            <span
              style={{
                fontWeight: 600,
                fontSize: 15,
                color: '#ffffff',
                letterSpacing: '-0.3px',
              }}
            >
              Lithos
            </span>
            <span
              style={{
                fontWeight: 300,
                fontSize: 15,
                color: 'rgba(255, 255, 255,0.6)',
                letterSpacing: '-0.3px',
              }}
            >
              Labs
            </span>
          </div>
        </div>
        {!isMobile && <NavTabs items={items} />}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            justifyContent: 'flex-end',
            minWidth: isMobile ? 'auto' : 160,
          }}
        >
          {!isMobile && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-end',
                lineHeight: 1.25,
              }}
            >
              <span
                style={{
                  fontSize: 12.5,
                  fontWeight: 600,
                  color: 'rgba(255,255,255,0.85)',
                }}
              >
                {appAuth.name || appAuth.email}
              </span>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: roleColor,
                }}
              >
                {roleLabel}
              </span>
            </div>
          )}
          <div style={avatarStyle}>{initials}</div>
          <button
            type="button"
            onClick={onLogout}
            style={signOutStyle}
            aria-label="Log out"
            title="Log out"
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'rgba(255,255,255,0.8)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'rgba(255,255,255,0.3)'
            }}
          >
            <LogOut size={14} />
          </button>
        </div>
      </header>
      <main style={mainStyle}>
        <AnimatedRoutes role={appAuth.role} />
      </main>
      {isMobile && <MobileBottomNav items={items} />}
    </div>
  )
}

export default function App() {
  const location = useLocation()
  const navigate = useNavigate()
  const [appAuth, setAppAuth] = useState(() => {
    try {
      const stored = localStorage.getItem('lithos_auth')
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  })

  useEffect(() => {
    if (appAuth) migrateSchema()
  }, [appAuth])

  // The old standalone sales portal is gone — /sales now bounces to the
  // unified app login.
  useEffect(() => {
    if (location.pathname.startsWith('/sales')) {
      navigate('/', { replace: true })
    }
  }, [location.pathname, navigate])

  function logout() {
    localStorage.removeItem('lithos_auth')
    setAppAuth(null)
    navigate('/', { replace: true })
  }

  // Public client demo pages stay outside the auth wall.
  if (location.pathname.startsWith('/demo/')) {
    return (
      <Routes>
        <Route path="/demo/:slug" element={<PublicDemo />} />
      </Routes>
    )
  }

  if (location.pathname.startsWith('/sales')) {
    return null
  }

  if (!appAuth) {
    return (
      <AppLogin
        onAuth={(user) => {
          localStorage.setItem('lithos_auth', JSON.stringify(user))
          setAppAuth(user)
        }}
      />
    )
  }

  return (
    <AuthContext.Provider value={{ appAuth, setAppAuth, logout }}>
      <Shell appAuth={appAuth} onLogout={logout} />
    </AuthContext.Provider>
  )
}

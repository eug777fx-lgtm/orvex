import { lazy, Suspense, useEffect, useState } from 'react'
import {
  Routes,
  Route,
  Navigate,
  useLocation,
  useNavigate,
} from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { migrateSchema } from './utils/migrateSchema'
import Background from './components/Background'
import Dashboard from './pages/Dashboard'
import Home from './pages/Home'
import Agents from './pages/Agents'
import Shell from './shell/Shell'
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

// Public client-facing document pages (lazy: keeps pdf.js out of the CRM bundle)
const ClientProposal = lazy(() => import('./pages/ClientProposal'))
const ClientInvoice = lazy(() => import('./pages/ClientInvoice'))
import MarketingEngine from './pages/MarketingEngine'
import Documents from './pages/Documents'
import Automations from './pages/Automations'
import Team from './pages/Team'
import Social from './pages/Social'
import AIReceptionist from './pages/AIReceptionist'
import AppLogin from './components/AppLogin'
import PaymentsDocs from './pages/PaymentsDocs'
import LeadIntelligence from './pages/LeadIntelligence'
import { AuthContext } from './lib/auth'

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
        <Route path="/" element={<Home />} />
        <Route path="/reports" element={<Dashboard />} />
        <Route
          path="/agents"
          element={
            <AdminOnly role={role}>
              <Agents />
            </AdminOnly>
          }
        />
        <Route path="/leads" element={<Leads />} />
        <Route path="/leads/:id" element={<LeadDetail />} />
        <Route
          path="/discover"
          element={
            <RoleGuard role={role} allow={['admin', 'manager']}>
              <LeadIntelligence />
            </RoleGuard>
          }
        />
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
          path="/payments-docs"
          element={
            <RoleGuard role={role} allow={['admin', 'manager']}>
              <PaymentsDocs />
            </RoleGuard>
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
          path="/ai-receptionist"
          element={
            <AdminOnly role={role}>
              <AIReceptionist />
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

function AppShell({ appAuth, onLogout }) {
  return (
    <Shell appAuth={appAuth} onLogout={onLogout} background={<Background />}>
      <AnimatedRoutes role={appAuth.role} />
    </Shell>
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

  // Public client-facing proposal & invoice pages (secure tokenized links) —
  // clients never see the CRM or its login.
  if (location.pathname.startsWith('/client/')) {
    return (
      <Suspense
        fallback={
          <div style={{ minHeight: '100vh', background: '#000', color: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif', fontSize: 14 }}>
            Loading…
          </div>
        }
      >
        <Routes>
          <Route path="/client/proposal/:token" element={<ClientProposal />} />
          <Route path="/client/invoice/:token" element={<ClientInvoice />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
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
      <AppShell appAuth={appAuth} onLogout={logout} />
    </AuthContext.Provider>
  )
}

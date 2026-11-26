// The whole CRM in five areas. Every existing page lives on as a tab inside one
// of them, so nothing is lost; the top bar only ever shows five things.
//
// Tab access:
//   adminOnly: only the admin
//   roles:     explicit allow list (admin always allowed)
//   neither:   every role
import { LayoutDashboard, Target, Briefcase, Sparkles, Bot } from 'lucide-react'

export const AREAS = [
  {
    key: 'home',
    label: 'Home',
    icon: LayoutDashboard,
    tabs: [
      { path: '/', label: 'Today', end: true },
      { path: '/tasks', label: 'Tasks' },
      { path: '/reports', label: 'Reports' },
    ],
  },
  {
    key: 'sales',
    label: 'Sales',
    icon: Target,
    tabs: [
      { path: '/leads', label: 'Leads' },
      { path: '/pipeline', label: 'Pipeline' },
      { path: '/outreach', label: 'Outreach', roles: ['admin', 'manager'] },
      { path: '/discover', label: 'Lead finder', roles: ['admin', 'manager'] },
      { path: '/offers', label: 'Offers' },
      { path: '/scripts', label: 'Scripts' },
      { path: '/import', label: 'Import', adminOnly: true },
    ],
  },
  {
    key: 'clients',
    label: 'Clients',
    icon: Briefcase,
    tabs: [
      { path: '/payments-docs', label: 'Proposals & invoices', roles: ['admin', 'manager'] },
      { path: '/workflow', label: 'Projects', adminOnly: true },
      { path: '/documents', label: 'Documents', adminOnly: true },
      { path: '/demos', label: 'Demos', adminOnly: true },
    ],
  },
  {
    key: 'growth',
    label: 'Growth',
    icon: Sparkles,
    tabs: [
      { path: '/marketing', label: 'AI office', adminOnly: true },
      { path: '/social', label: 'Social', adminOnly: true },
      { path: '/ai-receptionist', label: 'AI receptionist', adminOnly: true },
      { path: '/automations', label: 'Automations', adminOnly: true },
    ],
  },
  {
    key: 'agents',
    label: 'Agents',
    icon: Bot,
    tabs: [{ path: '/agents', label: 'Mission Control', adminOnly: true }],
  },
]

// Pages that live behind the account menu instead of the top bar.
export const SETTINGS_TABS = [{ path: '/team', label: 'Team', roles: ['admin', 'manager'] }]

export function canSee(tab, role) {
  if (role === 'admin') return true
  if (tab.adminOnly) return false
  if (tab.roles) return tab.roles.includes(role)
  return true
}

export function areasForRole(role) {
  return AREAS.map((a) => ({ ...a, tabs: a.tabs.filter((t) => canSee(t, role)) })).filter((a) => a.tabs.length)
}

export function tabMatches(tab, pathname) {
  if (tab.end) return pathname === tab.path
  return pathname === tab.path || pathname.startsWith(tab.path + '/')
}

export function areaForPath(areas, pathname) {
  for (const a of areas) if (a.tabs.some((t) => tabMatches(t, pathname))) return a
  return null
}

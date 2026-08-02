import { Suspense, useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  BarChart3,
  CalendarCheck,
  CloudUpload,
  FileText,
  LayoutDashboard,
  Lock,
  Menu,
  Settings,
  ShieldCheck,
  Users,
  UsersRound,
  WifiOff,
  X,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { ThemeToggle } from '@/components/layout/ThemeToggle'
import { Badge, Drawer, IconButton, SealSpinner, Seal } from '@/components/ui'
import { useContent } from '@/context/ContentContext'
import { useToast } from '@/context/ToastContext'
import { useVault } from '@/context/VaultContext'
import { useOnline } from '@/hooks'
import { isUnlocked } from '@/lib/access'
import { cx, relativeTime } from '@/lib/utils'
import { AccessGate } from './AccessGate'
import { VaultGate } from './VaultGate'

/**
 * The admin shell.
 *
 * Everything below this component assumes an unlocked vault, so the gate is
 * rendered here rather than repeated in each page. That also means a locked or
 * absent vault never mounts the admin routes at all — the membership register
 * cannot be read out of a component that was never rendered.
 */

interface AdminNavItem {
  to: string
  label: string
  icon: LucideIcon
  description: string
  end?: boolean
}

export const ADMIN_NAV: AdminNavItem[] = [
  {
    to: '/admin',
    label: 'Dashboard',
    icon: LayoutDashboard,
    description: 'Church at a glance',
    end: true,
  },
  { to: '/admin/members', label: 'Members', icon: Users, description: 'Register and directory' },
  {
    to: '/admin/attendance',
    label: 'Attendance',
    icon: CalendarCheck,
    description: 'Service registers',
  },
  {
    to: '/admin/departments',
    label: 'Departments',
    icon: UsersRound,
    description: 'Units and their leaders',
  },
  {
    to: '/admin/content',
    label: 'Content',
    icon: FileText,
    description: 'What the public site shows',
  },
  { to: '/admin/reports', label: 'Reports', icon: BarChart3, description: 'Trends and exports' },
  {
    to: '/admin/settings',
    label: 'Settings',
    icon: Settings,
    description: 'Publishing, backups, security',
  },
]

export default function AdminLayout() {
  const { status } = useVault()

  /**
   * The access key comes before everything, including the vault setup screen,
   * so a visitor cannot create a vault or look around the office at all.
   */
  const [unlocked, setUnlocked] = useState(() => isUnlocked())
  if (!unlocked) return <AccessGate onUnlocked={() => setUnlocked(true)} />

  if (status === 'checking') {
    return (
      <div className="grid min-h-screen place-items-center">
        <SealSpinner className="size-10 text-brand" label="Opening the church vault" />
      </div>
    )
  }

  if (status !== 'unlocked') return <VaultGate />

  return <AdminShell />
}

// ---------------------------------------------------------------------------

function AdminShell() {
  const { lock, saving, lastSavedAt, data, settings } = useVault()
  const { hasUnpublished, dirty } = useContent()
  const toast = useToast()
  const online = useOnline()
  const location = useLocation()

  const [menuOpen, setMenuOpen] = useState(false)

  // Close the mobile drawer whenever a route is chosen, or it stays over the
  // page the admin just navigated to.
  useEffect(() => setMenuOpen(false), [location.pathname])

  /** Nudge, not a nag: shown once per session when a backup is overdue. */
  useEffect(() => {
    if (!data) return
    const days = settings.backupReminderDays
    const last = settings.lastBackupAt
    const overdue = !last || Date.now() - new Date(last).getTime() > days * 86_400_000
    if (!overdue || data.members.length === 0) return

    const key = 'fbc.backup.nudged'
    if (sessionStorage.getItem(key)) return
    sessionStorage.setItem(key, '1')

    toast.warning(
      last ? 'Backup is overdue' : 'No backup yet',
      'These records exist only on this device. Take a backup from Settings.',
    )
  }, [data, settings.backupReminderDays, settings.lastBackupAt, toast])

  return (
    <div className="min-h-screen bg-canvas lg:grid lg:grid-cols-[16rem_1fr]">
      {/* --- desktop sidebar ------------------------------------------------ */}
      <aside className="sticky top-0 hidden h-screen flex-col border-r border-line bg-surface lg:flex">
        <SidebarContent />
      </aside>

      {/* --- mobile drawer -------------------------------------------------- */}
      <Drawer open={menuOpen} onClose={() => setMenuOpen(false)} title="Admin menu" side="left">
        <div className="flex h-full flex-col">
          <div className="flex justify-end p-2">
            <IconButton icon={X} label="Close menu" onClick={() => setMenuOpen(false)} />
          </div>
          <SidebarContent />
        </div>
      </Drawer>

      <div className="flex min-w-0 flex-col">
        {/* --- top bar ------------------------------------------------------ */}
        <header className="sticky top-0 z-40 flex h-14 items-center gap-2 border-b border-line bg-surface/90 px-3 backdrop-blur sm:px-5">
          <IconButton
            icon={Menu}
            label="Open admin menu"
            onClick={() => setMenuOpen(true)}
            className="lg:hidden"
          />

          <div className="min-w-0 flex-1">
            <p className="truncate text-[0.8125rem] font-semibold text-ink">
              {data?.admin?.name ?? 'Church Administrator'}
            </p>
            <p className="truncate text-[0.7rem] text-ink-faint">
              {saving
                ? 'Saving…'
                : lastSavedAt
                  ? `Saved ${relativeTime(lastSavedAt)}`
                  : 'All changes save to this device'}
            </p>
          </div>

          {!online && (
            <Badge tone="warning" icon={WifiOff} className="hidden sm:inline-flex">
              Offline
            </Badge>
          )}

          {hasUnpublished && (
            <Link to="/admin/content" className="shrink-0">
              <Badge tone="gold" icon={CloudUpload}>
                {dirty.length} unpublished
              </Badge>
            </Link>
          )}

          <ThemeToggle />

          <IconButton
            icon={Lock}
            label="Lock the vault"
            onClick={() => {
              lock()
              toast.info('Vault locked', 'The records on this device are encrypted again.')
            }}
          />
        </header>

        <main id="main" className="min-w-0 flex-1 px-3 py-5 sm:px-5 sm:py-7" tabIndex={-1}>
          <Suspense fallback={<AdminFallback />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------

function SidebarContent() {
  const { data } = useVault()

  return (
    <>
      <Link
        to="/admin"
        className="flex items-center gap-3 border-b border-line px-4 py-4 transition-colors hover:bg-sunken"
      >
        <Seal className="size-9 shrink-0" decorative />
        <span className="min-w-0">
          <span className="block truncate font-display text-[0.9375rem] font-semibold leading-tight text-ink">
            FBC Agbede
          </span>
          <span className="block text-[0.7rem] uppercase tracking-[0.13em] text-ornament">
            Church office
          </span>
        </span>
      </Link>

      <nav className="min-h-0 flex-1 overflow-y-auto p-2" aria-label="Church office">
        <ul className="space-y-0.5">
          {ADMIN_NAV.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cx(
                    'flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors',
                    isActive
                      ? 'bg-brand text-on-brand shadow-pew'
                      : 'text-ink-soft hover:bg-sunken hover:text-ink',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <item.icon className="mt-0.5 size-[1.15rem] shrink-0" aria-hidden />
                    <span className="min-w-0">
                      <span className="block text-[0.875rem] font-semibold leading-tight">
                        {item.label}
                      </span>
                      <span
                        className={cx(
                          'mt-0.5 block truncate text-[0.7rem]',
                          isActive ? 'text-on-brand/70' : 'text-ink-faint',
                        )}
                      >
                        {item.description}
                      </span>
                    </span>
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="border-t border-line p-3">
        <p className="flex items-start gap-2 rounded-lg bg-sunken px-3 py-2.5 text-[0.7rem] leading-snug text-ink-faint">
          <ShieldCheck className="mt-px size-3.5 shrink-0 text-success" aria-hidden />
          <span>
            {data?.members.length ?? 0} member records, encrypted on this device only.
          </span>
        </p>
        <Link
          to="/"
          className="mt-2 block rounded-lg px-3 py-2 text-[0.8125rem] font-medium text-ink-faint transition-colors hover:bg-sunken hover:text-ink"
        >
          ← Back to the church app
        </Link>
      </div>
    </>
  )
}

function AdminFallback() {
  return (
    <div className="grid min-h-[50vh] place-items-center">
      <SealSpinner className="size-9 text-brand" label="Loading" />
    </div>
  )
}

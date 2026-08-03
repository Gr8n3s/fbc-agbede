import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { Menu, ShieldCheck, WifiOff, X } from 'lucide-react'
import { Drawer, IconButton, Wordmark } from '@/components/ui'
import { useChurch } from '@/context/ContentContext'
import { useOnline } from '@/hooks'
import { cx } from '@/lib/utils'
import { PRIMARY_NAV, SECONDARY_NAV } from './nav'
import { ThemeToggle } from './ThemeToggle'

export function Header() {
  const church = useChurch()
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const online = useOnline()
  const location = useLocation()

  // Close the drawer whenever the route changes, so a tap inside it does not
  // leave the menu covering the page it just navigated to.
  useEffect(() => setMenuOpen(false), [location.pathname])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[120] focus:rounded-lg focus:bg-brand focus:px-4 focus:py-2.5 focus:text-sm focus:font-semibold focus:text-on-brand"
      >
        Skip to content
      </a>

      <header
        className={cx(
          'sticky top-0 z-50 border-b transition-all duration-300',
          scrolled
            ? 'border-line bg-canvas/85 shadow-pew backdrop-blur-lg'
            : 'border-transparent bg-canvas/60 backdrop-blur-sm',
        )}
      >
        {/* The tricolour hairline from the seal: plum, crimson, gold. */}
        <div
          aria-hidden
          className="h-0.5 w-full bg-[linear-gradient(90deg,var(--color-vestry-800)_0_33%,var(--color-crimson-600)_33%_66%,var(--color-gold-500)_66%_100%)]"
        />

        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6">
          <Link to="/" className="shrink-0 rounded-lg" aria-label={`${church.shortName || church.name} home`}>
            <Wordmark name={church.shortName || church.name} motto={church.motto} />
          </Link>

          <nav aria-label="Main" className="ml-auto hidden items-center gap-0.5 lg:flex">
            {PRIMARY_NAV.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.to === '/'} className={navLinkClass}>
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-1.5 lg:ml-2">
            {!online && (
              <span
                className="hidden items-center gap-1.5 rounded-full border border-warning/30 bg-warning/10 px-2.5 py-1 text-[0.7rem] font-semibold text-warning sm:inline-flex"
                role="status"
              >
                <WifiOff className="size-3.5" aria-hidden />
                Offline
              </span>
            )}

            <ThemeToggle className="hidden sm:inline-flex" />

            <Link
              to="/admin"
              className="hidden items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-[0.8125rem] font-semibold text-ink-soft transition-colors hover:border-ornament hover:text-ink lg:inline-flex"
            >
              <ShieldCheck className="size-4" aria-hidden />
              Admin
            </Link>

            <IconButton
              icon={menuOpen ? X : Menu}
              label={menuOpen ? 'Close menu' : 'Open menu'}
              onClick={() => setMenuOpen((open) => !open)}
              className="lg:hidden"
              aria-expanded={menuOpen}
            />
          </div>
        </div>
      </header>

      <Drawer open={menuOpen} onClose={() => setMenuOpen(false)} title="Menu">
        <div className="flex items-center justify-between border-b border-line px-4 py-3.5">
          <Wordmark name={church.shortName || church.name} motto={church.motto} />
          <IconButton icon={X} label="Close menu" onClick={() => setMenuOpen(false)} />
        </div>

        <nav aria-label="All pages" className="flex-1 overflow-y-auto p-3">
          <ul className="space-y-0.5">
            {[...PRIMARY_NAV, ...SECONDARY_NAV].map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) =>
                    cx(
                      'flex items-start gap-3 rounded-xl px-3 py-2.5 transition-colors',
                      isActive ? 'bg-brand/10 text-brand' : 'text-ink-soft hover:bg-sunken',
                    )
                  }
                >
                  <item.icon className="mt-0.5 size-[1.1rem] shrink-0" aria-hidden />
                  <span className="min-w-0">
                    <span className="block text-[0.9rem] font-semibold text-ink">{item.label}</span>
                    <span className="mt-0.5 block text-[0.75rem] leading-snug text-ink-faint">
                      {item.description}
                    </span>
                  </span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center justify-between gap-3 border-t border-line p-3">
          <ThemeToggle />
          <Link
            to="/admin"
            className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-[0.8125rem] font-semibold text-ink-soft"
          >
            <ShieldCheck className="size-4" aria-hidden />
            Admin
          </Link>
        </div>
      </Drawer>
    </>
  )
}

function navLinkClass({ isActive }: { isActive: boolean }) {
  return cx(
    'relative rounded-lg px-3 py-2 text-[0.875rem] font-medium transition-colors duration-200',
    'after:absolute after:inset-x-3 after:-bottom-px after:h-0.5 after:origin-left after:scale-x-0 after:bg-ornament after:transition-transform after:duration-300',
    isActive ? 'text-ink after:scale-x-100' : 'text-ink-soft hover:text-ink hover:after:scale-x-100',
  )
}

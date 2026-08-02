import { NavLink } from 'react-router-dom'
import { cx } from '@/lib/utils'
import { PRIMARY_NAV } from './nav'

/**
 * Mobile tab bar.
 *
 * The app is installed to a phone home screen, so it should feel like an app
 * rather than a website in a frame: five fixed destinations, thumb-reachable,
 * clearing the iOS home indicator via the safe-area inset.
 */
export function BottomNav() {
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-canvas/92 pb-[env(safe-area-inset-bottom)] backdrop-blur-lg lg:hidden"
    >
      <ul className="mx-auto flex max-w-lg">
        {PRIMARY_NAV.map((item) => (
          <li key={item.to} className="flex-1">
            <NavLink
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                cx(
                  'group relative flex flex-col items-center gap-1 px-1 py-2.5 transition-colors duration-200',
                  isActive ? 'text-brand' : 'text-ink-faint',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    aria-hidden
                    className={cx(
                      'absolute top-0 h-0.5 w-8 rounded-full bg-ornament transition-all duration-300',
                      isActive ? 'opacity-100' : 'w-0 opacity-0',
                    )}
                  />
                  <item.icon
                    className={cx('size-[1.15rem] transition-transform duration-200', isActive && 'scale-110')}
                    strokeWidth={isActive ? 2.2 : 1.8}
                    aria-hidden
                  />
                  <span className="text-[0.6875rem] font-medium leading-none">
                    {item.short ?? item.label}
                  </span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}

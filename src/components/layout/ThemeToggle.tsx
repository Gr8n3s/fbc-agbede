import { Monitor, Moon, Sun } from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'
import { cx } from '@/lib/utils'

/**
 * Light / dark / follow-system.
 *
 * Three explicit states rather than a two-way switch: "system" is a real
 * preference and silently dropping it the first time someone taps the toggle
 * is a small betrayal of what they set at the OS level.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { preference, setPreference } = useTheme()

  const options = [
    { value: 'light' as const, icon: Sun, label: 'Light' },
    { value: 'dark' as const, icon: Moon, label: 'Dark' },
    { value: 'system' as const, icon: Monitor, label: 'System' },
  ]

  return (
    <div
      role="radiogroup"
      aria-label="Colour theme"
      className={cx('inline-flex rounded-full border border-line bg-sunken p-0.5', className)}
    >
      {options.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={preference === value}
          aria-label={`${label} theme`}
          title={`${label} theme`}
          onClick={() => setPreference(value)}
          className={cx(
            'grid size-8 place-items-center rounded-full transition-all duration-200',
            preference === value
              ? 'bg-surface text-ink shadow-pew'
              : 'text-ink-faint hover:text-ink',
          )}
        >
          <Icon className="size-4" aria-hidden />
        </button>
      ))}
    </div>
  )
}

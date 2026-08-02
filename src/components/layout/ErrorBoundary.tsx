import { Component, type ErrorInfo, type ReactNode } from 'react'
import { RefreshCw } from 'lucide-react'
import { Button, Seal } from '@/components/ui'

interface State {
  error: Error | null
}

/**
 * Last line of defence.
 *
 * Anything that escapes a route lands here rather than leaving a blank screen.
 * The message is deliberately plain — this is used by church volunteers, not
 * developers — but the technical detail is kept behind a disclosure so a
 * problem can still be reported usefully.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[fbc] unhandled error', error, info.componentStack)
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children

    return (
      <div className="grid min-h-screen place-items-center px-4 py-16">
        <div className="w-full max-w-md text-center">
          <Seal className="mx-auto size-20 opacity-90" decorative />
          <h1 className="mt-6 font-display text-2xl font-semibold text-ink">
            Something went wrong
          </h1>
          <p className="mt-2 text-pretty text-sm leading-relaxed text-ink-soft">
            The page could not be displayed. Your church records on this device are safe and
            untouched, reloading usually clears it.
          </p>

          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Button icon={RefreshCw} onClick={() => window.location.reload()}>
              Reload the app
            </Button>
            <Button variant="secondary" onClick={() => this.setState({ error: null })}>
              Try again
            </Button>
          </div>

          <details className="mt-8 text-left">
            <summary className="cursor-pointer text-[0.75rem] font-medium text-ink-faint hover:text-ink">
              Technical details
            </summary>
            <pre className="mt-2 max-h-48 overflow-auto rounded-lg bg-sunken p-3 text-[0.7rem] leading-relaxed text-ink-soft">
              {error.name}: {error.message}
              {error.stack ? `\n\n${error.stack.split('\n').slice(1, 6).join('\n')}` : ''}
            </pre>
          </details>
        </div>
      </div>
    )
  }
}

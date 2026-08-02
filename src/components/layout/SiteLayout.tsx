import { Suspense } from 'react'
import { Outlet } from 'react-router-dom'
import { SealSpinner } from '@/components/ui'
import { BottomNav } from './BottomNav'
import { Footer } from './Footer'
import { Header } from './Header'

export function SiteLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main id="main" className="flex-1 focus:outline-none" tabIndex={-1}>
        <Suspense fallback={<RouteFallback />}>
          <Outlet />
        </Suspense>
      </main>
      <Footer />
      <BottomNav />
    </div>
  )
}

/** Shown while a lazily-loaded route chunk downloads. */
export function RouteFallback() {
  return (
    <div className="grid min-h-[60vh] place-items-center px-4">
      <div className="text-center">
        <SealSpinner className="mx-auto size-10 text-brand" label="Loading page" />
        <p className="mt-4 text-[0.8125rem] text-ink-faint">Just a moment…</p>
      </div>
    </div>
  )
}

import { Home, Search } from 'lucide-react'
import { ButtonLink, Rule, Seal } from '@/components/ui'
import { useDocumentTitle } from '@/hooks'
import { ALL_NAV } from '@/components/layout/nav'

export default function NotFoundPage() {
  useDocumentTitle('Page not found')

  return (
    <div className="grid min-h-screen place-items-center px-4 py-16">
      <div className="w-full max-w-lg text-center">
        <Seal className="mx-auto size-24 opacity-90" decorative />

        <p className="eyebrow mt-7">Error 404</p>
        <h1 className="mt-3 font-display text-title font-semibold text-ink">
          We could not find that page
        </h1>
        <p className="mx-auto mt-3 max-w-sm text-pretty leading-relaxed text-ink-soft">
          The link may be out of date, or the page may have been moved. Everything else is still
          here.
        </p>

        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <ButtonLink to="/" icon={Home}>
            Back to the home page
          </ButtonLink>
          <ButtonLink to="/programme" variant="secondary" icon={Search}>
            This week’s programme
          </ButtonLink>
        </div>

        <Rule className="my-10" />

        <nav aria-label="All pages">
          <ul className="flex flex-wrap justify-center gap-x-4 gap-y-2">
            {ALL_NAV.map((item) => (
              <li key={item.to}>
                <ButtonLink to={item.to} variant="link" size="sm">
                  {item.label}
                </ButtonLink>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </div>
  )
}

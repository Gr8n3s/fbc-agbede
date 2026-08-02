import { Link } from 'react-router-dom'
import { Clock, Facebook, Globe, Instagram, Mail, MapPin, Phone, Youtube } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Seal } from '@/components/ui'
import { useChurch } from '@/context/ContentContext'
import { formatTime, safeUrl } from '@/lib/utils'
import { PRIMARY_NAV, SECONDARY_NAV } from './nav'

const SOCIAL_ICON: Record<string, LucideIcon> = {
  facebook: Facebook,
  youtube: Youtube,
  instagram: Instagram,
  website: Globe,
}

export function Footer() {
  const church = useChurch()
  const year = new Date().getFullYear()
  const phone = church.phone?.trim()
  const email = church.email?.trim()

  return (
    <footer className="relative mt-20 border-t border-line bg-surface pb-24 lg:pb-0">
      {/* Arch silhouette rising out of the top edge, the motif, used once, quietly. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-px left-1/2 h-16 w-40 -translate-x-1/2 rounded-t-full border border-b-0 border-line bg-surface"
      />

      <div className="relative mx-auto max-w-6xl px-4 pt-10 sm:px-6">
        <div className="flex justify-center">
          <Seal className="size-16 -translate-y-14" decorative />
        </div>

        <div className="-mt-10 grid gap-10 md:grid-cols-[1.4fr_1fr_1fr] md:gap-8">
          <div>
            <p className="font-display text-lg font-semibold tracking-tight text-ink">
              {church.name}
            </p>
            <p className="eyebrow mt-1">{church.motto}</p>
            <p className="mt-3 max-w-sm text-pretty text-[0.875rem] leading-relaxed text-ink-soft">
              {church.tagline}
            </p>

            <address className="mt-5 space-y-2 not-italic">
              <FooterLine icon={MapPin}>
                {[church.address, church.city, church.state].filter(Boolean).join(', ')}
              </FooterLine>
              {phone && (
                <FooterLine icon={Phone}>
                  <a href={`tel:${phone.replace(/\s/g, '')}`} className="hover:text-ink">
                    {phone}
                  </a>
                </FooterLine>
              )}
              {email && (
                <FooterLine icon={Mail}>
                  <a href={`mailto:${email}`} className="break-all hover:text-ink">
                    {email}
                  </a>
                </FooterLine>
              )}
            </address>

            {church.socials.length > 0 && (
              <ul className="mt-5 flex flex-wrap gap-2">
                {church.socials.map((social) => {
                  const href = safeUrl(social.url)
                  if (!href) return null
                  const Icon = SOCIAL_ICON[social.platform] ?? Globe
                  return (
                    <li key={social.id}>
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={social.label ?? social.platform}
                        className="grid size-9 place-items-center rounded-full border border-line text-ink-soft transition-colors hover:border-ornament hover:text-ink"
                      >
                        <Icon className="size-4" aria-hidden />
                      </a>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          <nav aria-label="Footer">
            <h2 className="eyebrow">Explore</h2>
            <ul className="mt-3 space-y-2">
              {[...PRIMARY_NAV.slice(1), ...SECONDARY_NAV].map((item) => (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    className="text-[0.875rem] text-ink-soft transition-colors hover:text-ink"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <h2 className="eyebrow">Times of worship</h2>
            {church.serviceTimes.length === 0 ? (
              <p className="mt-3 text-[0.875rem] text-ink-faint">
                Service times will appear here once they are set.
              </p>
            ) : (
              <ul className="mt-3 space-y-2.5">
                {church.serviceTimes.slice(0, 5).map((service) => (
                  <li key={service.id} className="flex gap-2.5">
                    <Clock className="mt-0.5 size-3.5 shrink-0 text-ornament" aria-hidden />
                    <span className="min-w-0">
                      <span className="block text-[0.875rem] font-medium text-ink">
                        {service.name}
                      </span>
                      <span className="block text-[0.8125rem] text-ink-faint">
                        {service.day} · {formatTime(service.startTime)}
                        {service.endTime ? `, ${formatTime(service.endTime)}` : ''}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="rule-gold my-8" role="separator" />

        <div className="flex flex-col items-center justify-between gap-3 pb-8 text-center sm:flex-row sm:text-left">
          <p className="text-[0.75rem] text-ink-faint">
            © {year} {church.name}. All rights reserved.
          </p>
          <p className="text-[0.75rem] text-ink-faint">
            Built for the church ·{' '}
            <Link to="/privacy" className="underline underline-offset-2 hover:text-ink">
              Privacy
            </Link>
          </p>
        </div>
      </div>
    </footer>
  )
}

function FooterLine({ icon: Icon, children }: { icon: LucideIcon; children: React.ReactNode }) {
  return (
    <p className="flex gap-2.5 text-[0.875rem] text-ink-soft">
      <Icon className="mt-0.5 size-3.5 shrink-0 text-ornament" aria-hidden />
      <span className="min-w-0">{children}</span>
    </p>
  )
}

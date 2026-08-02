import { Clock, Mail, MapPin, MessageCircle, Navigation, Phone } from 'lucide-react'
import {
  Card,
  EmptyState,
  ExternalButton,
  PageHeader,
  Rule,
  SectionHeading,
} from '@/components/ui'
import { useChurch } from '@/context/ContentContext'
import { useDocumentTitle, useRevealAll } from '@/hooks'
import { formatTime, safeUrl, toWhatsAppNumber } from '@/lib/utils'

export default function ContactPage() {
  const church = useChurch()
  useDocumentTitle('Contact', `Find and contact ${church.name}.`)
  const revealRef = useRevealAll<HTMLDivElement>()

  const whatsapp = toWhatsAppNumber(church.whatsapp || church.phone)
  const mapUrl =
    safeUrl(church.mapUrl) ??
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      [church.name, church.address, church.city, church.state, church.country]
        .filter(Boolean)
        .join(', '),
    )}`

  return (
    <>
      <PageHeader
        eyebrow="Come and worship"
        title="Visit Us"
        description="We would love to meet you. Here is where to find us and how to get in touch."
      />

      <div ref={revealRef} className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-12">
        <div className="grid gap-5 sm:grid-cols-2">
          <Card className="reveal p-6">
            <span className="grid size-11 place-items-center rounded-xl bg-brand/10 text-brand">
              <MapPin className="size-5" aria-hidden />
            </span>
            <h2 className="mt-4 font-display text-xl font-semibold text-ink">Our address</h2>
            <address className="mt-2 not-italic leading-relaxed text-ink-soft">
              {church.name}
              <br />
              {church.address}
              <br />
              {[church.city, church.state].filter(Boolean).join(', ')}
              <br />
              {church.country}
            </address>
            <ExternalButton href={mapUrl} icon={Navigation} variant="secondary" className="mt-4">
              Get directions
            </ExternalButton>
          </Card>

          <Card className="reveal p-6">
            <span className="grid size-11 place-items-center rounded-xl bg-ornament/12 text-ornament">
              <Phone className="size-5" aria-hidden />
            </span>
            <h2 className="mt-4 font-display text-xl font-semibold text-ink">Reach the church</h2>

            <ul className="mt-3 space-y-3">
              {church.phone && (
                <li>
                  <a
                    href={`tel:${church.phone.replace(/\s/g, '')}`}
                    className="flex items-center gap-2.5 text-[0.9375rem] text-ink-soft hover:text-ink"
                  >
                    <Phone className="size-4 shrink-0 text-ornament" aria-hidden />
                    {church.phone}
                  </a>
                </li>
              )}
              {church.email && (
                <li>
                  <a
                    href={`mailto:${church.email}`}
                    className="flex items-center gap-2.5 break-all text-[0.9375rem] text-ink-soft hover:text-ink"
                  >
                    <Mail className="size-4 shrink-0 text-ornament" aria-hidden />
                    {church.email}
                  </a>
                </li>
              )}
              {whatsapp && (
                <li>
                  <a
                    href={`https://wa.me/${whatsapp}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2.5 text-[0.9375rem] text-ink-soft hover:text-ink"
                  >
                    <MessageCircle className="size-4 shrink-0 text-ornament" aria-hidden />
                    Message on WhatsApp
                  </a>
                </li>
              )}
            </ul>

            {!church.phone && !church.email && (
              <p className="mt-3 text-[0.875rem] text-ink-faint">
                Contact details will be published here shortly.
              </p>
            )}
          </Card>
        </div>

        <Rule className="my-12" />

        <section className="reveal">
          <SectionHeading
            eyebrow="When we gather"
            title="Service times"
            description="Programmes run through the week, not on Sundays only."
          />

          {church.serviceTimes.length > 0 ? (
            <ul className="mt-6 grid gap-3 sm:grid-cols-2">
              {church.serviceTimes.map((service) => (
                <li key={service.id} className="reveal">
                  <Card className="flex items-start gap-3.5 p-4">
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand/10 text-brand">
                      <Clock className="size-4.5" aria-hidden />
                    </span>
                    <span className="min-w-0">
                      <span className="block font-display text-[1rem] font-semibold text-ink">
                        {service.name}
                      </span>
                      <span className="mt-0.5 block text-[0.875rem] text-ink-soft">
                        {service.day} · {formatTime(service.startTime)}
                        {service.endTime ? ` – ${formatTime(service.endTime)}` : ''}
                      </span>
                      {service.note && (
                        <span className="mt-1 block text-[0.8125rem] text-ink-faint">
                          {service.note}
                        </span>
                      )}
                    </span>
                  </Card>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              className="mt-6"
              icon={Clock}
              title="Service times coming soon"
              description="The weekly worship timetable will be published here."
            />
          )}
        </section>

        <Card className="reveal mt-10 border-ornament/30 p-6 text-center">
          <h2 className="font-display text-xl font-semibold text-ink">Planning your first visit?</h2>
          <p className="mx-auto mt-2 max-w-md text-pretty text-[0.9375rem] leading-relaxed text-ink-soft">
            Come as you are. Arrive a few minutes early and an usher will find you a seat and answer
            any questions. We would be glad to have you worship with us.
          </p>
        </Card>
      </div>
    </>
  )
}

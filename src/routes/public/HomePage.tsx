import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  BookOpenText,
  CalendarDays,
  Church,
  Download,
  HandHeart,
  Megaphone,
  Mic,
  ScrollText,
  Share2,
  Smartphone,
  Users,
  Wallet,
} from 'lucide-react'
import {
  AnnouncementCard,
  BulletinCard,
  CompactEventRow,
  DevotionalCard,
  SermonCard,
} from '@/components/site/cards'
import {
  Badge,
  Button,
  ButtonLink,
  Card,
  CardGridSkeleton,
  EmptyState,
  Rule,
  Seal,
  SectionHeading,
} from '@/components/ui'
import { useContent } from '@/context/ContentContext'
import { useDocumentTitle, useInstallPrompt, useRevealAll } from '@/hooks'
import {
  currentBulletin,
  devotionalForToday,
  publishedAnnouncements,
  publishedBulletins,
  publishedDepartments,
  publishedSermons,
} from '@/lib/content'
import { nextService, upcomingOccurrences } from '@/lib/schedule'
import { cx, dayName, formatTime, relativeTime } from '@/lib/utils'

export default function HomePage() {
  const { content, loading } = useContent()
  const church = content.church
  useDocumentTitle(undefined, church.tagline)

  const revealRef = useRevealAll<HTMLDivElement>()

  const programme = useMemo(() => currentBulletin(content.bulletins), [content.bulletins])
  const otherProgrammes = useMemo(
    () => publishedBulletins(content.bulletins).filter((b) => b.id !== programme?.id).slice(0, 2),
    [content.bulletins, programme],
  )
  const events = useMemo(() => upcomingOccurrences(content.events, 5), [content.events])
  const sermons = useMemo(() => publishedSermons(content.sermons).slice(0, 3), [content.sermons])
  const notices = useMemo(
    () => publishedAnnouncements(content.announcements).slice(0, 3),
    [content.announcements],
  )
  const devotional = useMemo(() => devotionalForToday(content.devotionals), [content.devotionals])
  const departments = useMemo(
    () => publishedDepartments(content.departments).slice(0, 6),
    [content.departments],
  )
  const upNext = useMemo(() => nextService(church.serviceTimes), [church.serviceTimes])

  return (
    <div ref={revealRef}>
      <Hero churchName={church.name} motto={church.motto} tagline={church.tagline} />

      {upNext && (
        <NextServiceStrip
          name={upNext.service.name}
          day={dayName(upNext.at)}
          time={formatTime(upNext.service.startTime)}
          relative={relativeTime(upNext.at.toISOString())}
          note={upNext.service.note}
        />
      )}

      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        {/* ---------------- Programme ---------------- */}
        <section className="py-14 sm:py-16" aria-labelledby="programme-heading">
          <SectionHeading
            eyebrow="Order of service"
            title="Church programme"
            description="Our programmes run through the week, not on Sundays only. Here is what is coming up next."
            action={
              <ButtonLink to="/programme" variant="secondary" size="sm" iconRight={ArrowRight}>
                All programmes
              </ButtonLink>
            }
            className="reveal"
          />

          <div className="mt-7 grid gap-4 lg:grid-cols-[1.6fr_1fr]">
            {programme ? (
              <div className="reveal">
                <BulletinCard bulletin={programme} featured />
              </div>
            ) : (
              <EmptyState
                icon={ScrollText}
                title="No programme published yet"
                description="The order of service will appear here once it is uploaded."
                className="reveal"
              />
            )}

            <div className="reveal space-y-4">
              {otherProgrammes.length > 0 ? (
                otherProgrammes.map((bulletin) => (
                  <BulletinCard key={bulletin.id} bulletin={bulletin} />
                ))
              ) : (
                <QuickLinks />
              )}
            </div>
          </div>
        </section>

        <Rule className="reveal" />

        {/* ---------------- Devotional + events ---------------- */}
        <section className="py-14 sm:py-16" aria-labelledby="today-heading">
          <div className="grid gap-8 lg:grid-cols-[1.35fr_1fr]">
            <div className="reveal">
              <h2 id="today-heading" className="sr-only">
                Today
              </h2>
              {devotional ? (
                <>
                  <DevotionalCard devotional={devotional} />
                  <ButtonLink
                    to="/devotional"
                    variant="link"
                    size="sm"
                    iconRight={ArrowRight}
                    className="mt-4"
                  >
                    Read the full devotional and reading plan
                  </ButtonLink>
                </>
              ) : (
                <EmptyState
                  icon={BookOpenText}
                  title="No devotional today"
                  description="Daily verses and the reading plan will appear here."
                />
              )}
            </div>

            <div className="reveal">
              <Card className="p-4 sm:p-5">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-display text-lg font-semibold text-ink">Coming up</h3>
                  <Link
                    to="/events"
                    className="text-[0.8125rem] font-medium text-info hover:underline"
                  >
                    Calendar
                  </Link>
                </div>
                <div className="mt-3 space-y-0.5">
                  {events.length > 0 ? (
                    events.map((occurrence) => (
                      <CompactEventRow key={occurrence.key} occurrence={occurrence} />
                    ))
                  ) : (
                    <p className="py-6 text-center text-[0.875rem] text-ink-faint">
                      No events scheduled yet.
                    </p>
                  )}
                </div>
              </Card>

              {notices.length > 0 && (
                <Card className="mt-4 p-4 sm:p-5">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-display text-lg font-semibold text-ink">Notice board</h3>
                    <Link
                      to="/announcements"
                      className="text-[0.8125rem] font-medium text-info hover:underline"
                    >
                      All notices
                    </Link>
                  </div>
                  <ul className="mt-3 space-y-3">
                    {notices.map((notice) => (
                      <li key={notice.id} className="border-b border-line pb-3 last:border-0 last:pb-0">
                        <div className="flex items-start gap-2">
                          <Megaphone className="mt-0.5 size-3.5 shrink-0 text-ornament" aria-hidden />
                          <div className="min-w-0">
                            <p className="text-[0.875rem] font-semibold text-ink">{notice.title}</p>
                            <p className="mt-0.5 line-clamp-2 text-[0.8125rem] leading-snug text-ink-soft">
                              {notice.body}
                            </p>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </Card>
              )}
            </div>
          </div>
        </section>

        <Rule className="reveal" />

        {/* ---------------- Sermons ---------------- */}
        <section className="py-14 sm:py-16" aria-labelledby="sermons-heading">
          <SectionHeading
            eyebrow="From the pulpit"
            title="Recent messages"
            description="Sermon notes, scripture references and recordings you can keep on your phone."
            action={
              <ButtonLink to="/sermons" variant="secondary" size="sm" iconRight={ArrowRight}>
                All sermons
              </ButtonLink>
            }
            className="reveal"
          />

          <div className="mt-7">
            {loading && sermons.length === 0 ? (
              <CardGridSkeleton count={3} />
            ) : sermons.length > 0 ? (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {sermons.map((sermon) => (
                  <div key={sermon.id} className="reveal">
                    <SermonCard sermon={sermon} />
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Mic}
                title="No sermons yet"
                description="Messages will appear here as they are uploaded."
                className="reveal"
              />
            )}
          </div>
        </section>

        {/* ---------------- Departments ---------------- */}
        {departments.length > 0 && (
          <>
            <Rule className="reveal" />
            <section className="py-14 sm:py-16" aria-labelledby="departments-heading">
              <SectionHeading
                eyebrow="Serve together"
                title="Our departments"
                description="Every member has a place. Find where you belong and grow with others."
                action={
                  <ButtonLink to="/departments" variant="secondary" size="sm" iconRight={ArrowRight}>
                    All departments
                  </ButtonLink>
                }
                className="reveal"
              />
              <ul className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {departments.map((department) => (
                  <li key={department.id} className="reveal">
                    <Link
                      to={`/departments/${department.slug}`}
                      className="card-chapel hoverable flex items-center gap-3 p-3.5"
                    >
                      <span
                        className={cx(
                          'grid size-11 shrink-0 place-items-center rounded-xl',
                          department.accent === 'crimson'
                            ? 'bg-accent/10 text-accent'
                            : department.accent === 'gold'
                              ? 'bg-ornament/12 text-ornament'
                              : department.accent === 'azure'
                                ? 'bg-info/10 text-info'
                                : 'bg-brand/10 text-brand',
                        )}
                      >
                        <Users className="size-5" aria-hidden />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate font-display text-[0.9375rem] font-semibold text-ink">
                          {department.name}
                        </span>
                        <span className="mt-0.5 block truncate text-[0.75rem] text-ink-faint">
                          {department.meetingDay
                            ? `${department.meetingDay}${department.meetingTime ? ` · ${formatTime(department.meetingTime)}` : ''}`
                            : department.summary}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          </>
        )}

        {/* ---------------- Notices (full) ---------------- */}
        {notices.length > 0 && (
          <>
            <Rule className="reveal" />
            <section className="py-14 sm:py-16">
              <SectionHeading
                eyebrow="Announcements"
                title="From the notice board"
                className="reveal"
                action={
                  <ButtonLink
                    to="/announcements"
                    variant="secondary"
                    size="sm"
                    iconRight={ArrowRight}
                  >
                    See all
                  </ButtonLink>
                }
              />
              <div className="mt-7 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {notices.map((notice) => (
                  <div key={notice.id} className="reveal">
                    <AnnouncementCard announcement={notice} />
                  </div>
                ))}
              </div>
            </section>
          </>
        )}

        {/* ---------------- Giving + install ---------------- */}
        <section className="py-14 sm:py-16">
          <div className="grid gap-5 lg:grid-cols-2">
            <GivingPanel />
            <InstallPanel />
          </div>
        </section>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Hero
// ---------------------------------------------------------------------------

function Hero({
  churchName,
  motto,
  tagline,
}: {
  churchName: string
  motto: string
  tagline: string
}) {
  return (
    <section className="relative overflow-hidden border-b border-line">
      {/* Light through a window: two soft washes in the seal's own colours. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 size-[46rem] -translate-x-1/2 rounded-full blur-3xl"
        style={{ background: 'radial-gradient(circle, var(--halo-a), transparent 60%)', opacity: 0.55 }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-56 -right-32 size-[34rem] rounded-full blur-3xl"
        style={{ background: 'radial-gradient(circle, var(--halo-b), transparent 62%)', opacity: 0.5 }}
      />

      <div className="relative mx-auto max-w-6xl px-4 pb-16 pt-12 sm:px-6 sm:pb-20 sm:pt-16">
        <div className="mx-auto max-w-3xl text-center">
          <div className="animate-seal-in">
            <Seal className="mx-auto size-24 drop-shadow-lg sm:size-32" decorative />
          </div>

          <p className="eyebrow mt-7 animate-veil">Agbede, Ikorodu · Nigerian Baptist Convention</p>

          <h1 className="mt-4 animate-veil text-balance font-display text-hero font-semibold text-ink [animation-delay:80ms]">
            {churchName.replace(/,.*$/, '')}
            <span className="mt-4 block text-[0.42em] font-semibold uppercase tracking-[0.34em] text-accent">
              {motto}
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-xl animate-veil text-pretty text-[1.0625rem] leading-relaxed text-ink-soft [animation-delay:160ms]">
            {tagline}
          </p>

          <div className="mt-8 flex animate-veil flex-wrap justify-center gap-3 [animation-delay:240ms]">
            <ButtonLink to="/programme" size="lg" icon={ScrollText}>
              This week’s programme
            </ButtonLink>
            <ButtonLink to="/sermons" size="lg" variant="secondary" icon={Mic}>
              Listen to a sermon
            </ButtonLink>
          </div>
        </div>
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Next service
// ---------------------------------------------------------------------------

function NextServiceStrip({
  name,
  day,
  time,
  relative,
  note,
}: {
  name: string
  day: string
  time: string
  relative: string
  note?: string
}) {
  return (
    <div className="border-b border-line bg-brand text-on-brand">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-6 gap-y-1.5 px-4 py-3 text-center sm:px-6">
        <span className="inline-flex items-center gap-2 text-[0.7rem] font-bold uppercase tracking-[0.2em] text-on-brand/70">
          <Church className="size-3.5" aria-hidden />
          Next service
        </span>
        <p className="text-[0.9375rem] font-semibold">
          {name} · {day} {time}
        </p>
        {/* Solid gold on near-black: self-contained, so it reads on the brand
            strip in both light and dark, where a tinted fill did not. */}
        <Badge tone="gold" className="border-transparent bg-ornament text-vestry-950">
          {relative}
        </Badge>
        {note && <span className="text-[0.8125rem] text-on-brand/75">{note}</span>}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Panels
// ---------------------------------------------------------------------------

function QuickLinks() {
  const links = [
    { to: '/events', label: 'Church calendar', icon: CalendarDays },
    { to: '/prayer', label: 'Prayer requests', icon: HandHeart },
    { to: '/downloads', label: 'Bulletins & downloads', icon: Download },
    { to: '/giving', label: 'Tithes & offerings', icon: Wallet },
  ]

  return (
    <Card className="p-4 sm:p-5">
      <h3 className="font-display text-lg font-semibold text-ink">Quick links</h3>
      <ul className="mt-3 space-y-1">
        {links.map((link) => (
          <li key={link.to}>
            <Link
              to={link.to}
              className="flex items-center gap-3 rounded-lg px-2 py-2.5 text-[0.875rem] font-medium text-ink-soft transition-colors hover:bg-sunken hover:text-ink"
            >
              <link.icon className="size-4 text-ornament" aria-hidden />
              {link.label}
              <ArrowRight className="ml-auto size-3.5 opacity-40" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  )
}

function GivingPanel() {
  return (
    <Card className="reveal relative overflow-hidden border-ornament/30 p-6 sm:p-8">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-10 size-40 rounded-full bg-ornament/10 blur-2xl"
      />
      <div className="relative">
        <span className="grid size-11 place-items-center rounded-xl bg-ornament/12 text-ornament">
          <Wallet className="size-5" aria-hidden />
        </span>
        <h2 className="mt-4 font-display text-2xl font-semibold text-ink">Tithes &amp; offerings</h2>
        <p className="mt-2 max-w-sm text-pretty text-[0.9375rem] leading-relaxed text-ink-soft">
          Give cheerfully, wherever you are. The church account details are published in the app so
          you can transfer directly — no third-party payment service, no charges.
        </p>
        <ButtonLink to="/giving" variant="gold" className="mt-5" iconRight={ArrowRight}>
          View account details
        </ButtonLink>
      </div>
    </Card>
  )
}

function InstallPanel() {
  const { canInstall, installed, needsManualInstructions, install } = useInstallPrompt()

  const share = async () => {
    const data = {
      title: 'FBC Agbede — Chapel of Grace',
      text: 'Sermons, programmes and events from First Baptist Church Agbede, Ikorodu.',
      url: window.location.origin + import.meta.env.BASE_URL,
    }
    if (navigator.share) {
      try {
        await navigator.share(data)
      } catch {
        /* the user dismissed the share sheet */
      }
    } else {
      await navigator.clipboard?.writeText(data.url)
    }
  }

  return (
    <Card className="reveal p-6 sm:p-8">
      <span className="grid size-11 place-items-center rounded-xl bg-brand/10 text-brand">
        <Smartphone className="size-5" aria-hidden />
      </span>
      <h2 className="mt-4 font-display text-2xl font-semibold text-ink">
        {installed ? 'Installed — thank you' : 'Keep the church in your pocket'}
      </h2>
      <p className="mt-2 max-w-sm text-pretty text-[0.9375rem] leading-relaxed text-ink-soft">
        {installed
          ? 'The app is on your home screen. Programmes, sermons and devotionals stay available even without data.'
          : 'Install the app to your home screen. It opens instantly and keeps working when you have no data.'}
      </p>

      {needsManualInstructions && !installed && (
        <p className="mt-4 rounded-lg border border-line bg-sunken/60 p-3 text-[0.8125rem] leading-relaxed text-ink-soft">
          On iPhone: tap <strong className="text-ink">Share</strong>, then{' '}
          <strong className="text-ink">Add to Home Screen</strong>.
        </p>
      )}

      <div className="mt-5 flex flex-wrap gap-2">
        {canInstall && (
          <Button icon={Smartphone} onClick={() => void install()}>
            Install app
          </Button>
        )}
        <Button variant="secondary" icon={Share2} onClick={() => void share()}>
          Share with someone
        </Button>
      </div>
    </Card>
  )
}

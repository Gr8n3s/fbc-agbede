import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  BookOpenText,
  Cake,
  CalendarRange,
  Clock,
  Download,
  HandHeart,
  Hammer,
  MapPin,
  Megaphone,
  Mic,
  Music4,
  Printer,
  Share2,
  Users,
  Wallet,
} from 'lucide-react'
import { RichText } from '@/components/site/RichText'
import { VerseBlock } from '@/components/site/cards'
import { Badge, Button, ButtonLink, Card, EmptyState, Rule, Seal } from '@/components/ui'
import { useContent } from '@/context/ContentContext'
import { useToast } from '@/context/ToastContext'
import { useDocumentTitle } from '@/hooks'
import { publishedBulletins } from '@/lib/content'
import { printDocument, type PrintSection } from '@/lib/export'
import { BULLETIN_KIND_LABELS, type Bulletin, type BulletinAttendanceRow } from '@/lib/types'
import { asset, formatDate, formatTime, safeUrl } from '@/lib/utils'

/**
 * One programme sheet, rendered the way the church prints it.
 *
 * The order matters: it follows the paper bulletin top to bottom, so someone
 * holding the printed copy and someone reading their phone are looking at the
 * same document. Everything is optional — a midweek programme with nothing but
 * an order of service renders cleanly, without empty headings.
 */
export default function ProgrammeDetailPage() {
  const { date } = useParams<{ date: string }>()
  const { content } = useContent()
  const toast = useToast()

  const bulletin = useMemo(
    () => publishedBulletins(content.bulletins).find((b) => b.date === date),
    [content.bulletins, date],
  )

  useDocumentTitle(bulletin ? bulletin.title : 'Programme', bulletin?.theme)

  if (!bulletin) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20">
        <EmptyState
          icon={BookOpenText}
          title="Programme not found"
          description="This order of service may have been removed, or the link is out of date."
          action={
            <ButtonLink to="/programme" variant="secondary">
              Back to all programmes
            </ButtonLink>
          }
        />
      </div>
    )
  }

  const church = content.church
  const multiDay = bulletin.endDate && bulletin.endDate !== bulletin.date

  const sections = bulletin.sections ?? []
  const schedule = bulletin.schedule ?? []
  const notices = bulletin.notices ?? []
  const attendance = bulletin.attendanceSummary ?? []
  const birthdays = [...(bulletin.birthdays ?? [])].sort((a, b) => a.day - b.day)
  const coming = bulletin.comingProgrammes ?? []
  const prayerPoints = bulletin.prayerPoints ?? []
  const projects = bulletin.projects ?? []
  const urgentNeeds = bulletin.urgentNeeds ?? []
  const teenagersOrder = bulletin.teenagersOrder ?? []

  const print = () => printDocument(buildPrintable(bulletin, church.name, church.motto))

  const share = async () => {
    const url = window.location.href
    if (navigator.share) {
      try {
        await navigator.share({ title: bulletin.title, text: bulletin.theme, url })
        return
      } catch {
        /* dismissed */
      }
    }
    try {
      await navigator.clipboard.writeText(url)
      toast.success('Link copied', 'Paste it into WhatsApp to share with the church.')
    } catch {
      toast.error('Could not copy the link', 'Copy it from the address bar instead.')
    }
  }

  const pdf = safeUrl(bulletin.pdfUrl ? asset(bulletin.pdfUrl) : undefined)

  return (
    <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <Link
        to="/programme"
        className="inline-flex items-center gap-1.5 text-[0.8125rem] font-medium text-ink-faint hover:text-ink"
      >
        <span aria-hidden>←</span> All programmes
      </Link>

      {/* --- masthead ------------------------------------------------------ */}
      <header className="mt-6 overflow-hidden rounded-2xl border border-line bg-surface">
        <div
          aria-hidden
          className="h-1 w-full bg-[linear-gradient(90deg,var(--color-vestry-800)_0_33%,var(--color-crimson-600)_33%_66%,var(--color-gold-500)_66%_100%)]"
        />
        <div className="px-5 py-7 text-center sm:px-8 sm:py-9">
          {bulletin.yearTheme && (
            <p className="mb-5 text-balance font-display text-[0.9375rem] font-bold uppercase tracking-[0.08em] text-accent">
              {bulletin.yearTheme}
            </p>
          )}

          <Seal className="mx-auto size-16" decorative />
          <p className="mt-4 font-display text-sm font-semibold uppercase tracking-[0.16em] text-ink-soft">
            {church.name}
          </p>
          <p className="eyebrow mt-1">{church.motto}</p>

          <Rule className="mx-auto my-5 max-w-[10rem]" />

          <p className="text-[0.9375rem] font-medium text-ink">
            {bulletin.welcomeLine ??
              (bulletin.sundayNumber
                ? `You are welcome to the ${ordinal(bulletin.sundayNumber)} Sunday.`
                : 'You are welcome.')}
          </p>
          <p className="mt-1 text-[0.9375rem] font-medium text-ink-soft">
            Today is {formatDate(bulletin.date, 'long')}
            {multiDay && ` – ${formatDate(bulletin.endDate, 'long')}`}.
          </p>

          {bulletin.occasion && (
            <div className="mt-5">
              <Badge tone="accent">{BULLETIN_KIND_LABELS[bulletin.kind] ?? 'Programme'}</Badge>
              <h1 className="mt-3 text-balance font-display text-2xl font-semibold text-ink sm:text-3xl">
                {bulletin.occasion}
              </h1>
              {bulletin.occasionSubtitle && (
                <p className="mx-auto mt-2 max-w-xl text-pretty text-[0.9375rem] italic leading-relaxed text-ink-soft">
                  {bulletin.occasionSubtitle}
                </p>
              )}
            </div>
          )}

          {!bulletin.occasion && (
            <h1 className="mt-5 text-balance font-display text-2xl font-semibold text-ink sm:text-3xl">
              {bulletin.title}
            </h1>
          )}

          {/* timetable */}
          {schedule.length > 0 && (
            <dl className="mx-auto mt-6 max-w-md space-y-1 rounded-lg border border-line bg-sunken/50 px-4 py-3 text-left">
              {schedule.map((row) => (
                <div key={row.id} className="flex flex-wrap justify-between gap-x-4 gap-y-0.5">
                  <dt className="text-[0.8125rem] font-medium text-ink-soft">{row.name}</dt>
                  <dd className="text-[0.8125rem] font-semibold tabular-nums text-ink">
                    {formatTime(row.startTime)}
                    {row.endTime ? ` – ${formatTime(row.endTime)}` : ''}
                  </dd>
                </div>
              ))}
            </dl>
          )}

          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 text-[0.875rem] text-ink-faint">
            {schedule.length === 0 && bulletin.startTime && (
              <span className="inline-flex items-center gap-1.5">
                <Clock className="size-3.5 text-ornament" aria-hidden />
                {formatTime(bulletin.startTime)}
                {bulletin.endTime ? ` – ${formatTime(bulletin.endTime)}` : ''}
              </span>
            )}
            {bulletin.venue && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="size-3.5 text-ornament" aria-hidden />
                {bulletin.venue}
              </span>
            )}
            {bulletin.preacher && (
              <span className="inline-flex items-center gap-1.5">
                <Mic className="size-3.5 text-ornament" aria-hidden />
                {bulletin.preacher}
              </span>
            )}
          </div>

          <div className="no-print mt-6 flex flex-wrap justify-center gap-2">
            <Button icon={Printer} onClick={print}>
              Print / Save PDF
            </Button>
            <Button variant="secondary" icon={Share2} onClick={() => void share()}>
              Share
            </Button>
            {pdf && (
              <a
                href={pdf}
                download
                className="inline-flex h-11 items-center gap-2 rounded-xl border border-line-strong bg-surface px-4 text-sm font-semibold text-ink hover:border-ornament"
              >
                <Download className="size-4" aria-hidden />
                Download sheet
              </a>
            )}
          </div>
        </div>
      </header>

      {/* --- Sunday School lesson ------------------------------------------ */}
      {bulletin.sundaySchool?.topic && (
        <Card className="mt-6 p-5 sm:p-7">
          <p className="eyebrow">Church in Classes</p>
          <h2 className="mt-1.5 text-balance font-display text-xl font-semibold text-ink">
            {bulletin.sundaySchool.topic}
          </h2>
          {bulletin.sundaySchool.topicYoruba && (
            <p className="mt-1 font-display text-[0.9375rem] italic text-ink-soft">
              {bulletin.sundaySchool.topicYoruba}
            </p>
          )}
          {bulletin.sundaySchool.text && (
            <p className="mt-3 text-[0.875rem] font-medium text-info">
              {bulletin.sundaySchool.text}
            </p>
          )}
          {bulletin.sundaySchool.memoryVerse && (
            <VerseBlock
              reference={bulletin.sundaySchool.memoryVerseRef ?? 'Memory verse'}
              text={bulletin.sundaySchool.memoryVerse}
              className="mt-5"
            />
          )}
        </Card>
      )}

      {/* --- theme ---------------------------------------------------------- */}
      {(bulletin.theme || bulletin.themeVerse) && (
        <Card className="mt-5 p-5 sm:p-7">
          {bulletin.theme && (
            <>
              <p className="eyebrow">Theme</p>
              <h2 className="mt-1.5 text-balance font-display text-2xl font-semibold text-ink">
                {bulletin.theme}
              </h2>
            </>
          )}
          {bulletin.themeVerse && (
            <VerseBlock
              reference={bulletin.themeVerseRef ?? 'Scripture'}
              text={bulletin.themeVerse}
              className="mt-5"
            />
          )}
        </Card>
      )}

      {bulletin.welcomeNote && (
        <Card className="mt-5 border-ornament/30 p-5">
          <p className="eyebrow">Welcome</p>
          <p className="mt-2 whitespace-pre-line text-[0.9375rem] leading-relaxed text-ink-soft">
            {bulletin.welcomeNote}
          </p>
        </Card>
      )}

      {/* --- order of service ---------------------------------------------- */}
      {sections.length > 0 && (
        <section className="mt-8" aria-labelledby="oos-heading">
          <h2 id="oos-heading" className="font-display text-xl font-semibold text-ink">
            Order of Service
          </h2>

          {(bulletin.serviceMotto || bulletin.serviceMottoYoruba) && (
            <div className="mt-4 rounded-lg border-2 border-ink/70 px-4 py-3 text-center">
              {bulletin.serviceMotto && (
                <p className="font-display text-[1.0625rem] font-bold italic text-ink">
                  {bulletin.serviceMotto}
                </p>
              )}
              {bulletin.serviceMottoYoruba && (
                <p className="mt-0.5 font-display text-[0.9375rem] font-semibold italic text-ink-soft">
                  {bulletin.serviceMottoYoruba}
                </p>
              )}
            </div>
          )}

          <div className="mt-5 space-y-6">
            {sections
              .filter((section) => section.items.length > 0)
              .map((section) => (
                <div key={section.id}>
                  <h3 className="font-display text-[0.8125rem] font-bold uppercase tracking-[0.1em] text-brand">
                    {section.heading}
                    {section.headingYoruba && (
                      <span className="text-ink-faint"> / {section.headingYoruba}</span>
                    )}
                  </h3>

                  <ol className="mt-2.5 overflow-hidden rounded-xl border border-line bg-surface">
                    {section.items.map((item) => (
                      <li
                        key={item.id}
                        className="flex items-start gap-3 border-b border-line px-4 py-3 last:border-0"
                      >
                        <span
                          className="mt-2 size-1.5 shrink-0 rotate-45 bg-ornament"
                          aria-hidden
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block text-[0.9375rem] font-medium text-ink">
                            {item.item}
                            {item.hymnNumber && (
                              <span className="ml-1.5 rounded bg-sunken px-1.5 py-0.5 font-mono text-[0.75rem] font-semibold text-ink-soft">
                                {item.hymnNumber}
                              </span>
                            )}
                          </span>
                          {item.itemYoruba && (
                            <span className="mt-0.5 block text-[0.875rem] italic text-ink-soft">
                              {item.itemYoruba}
                              {item.hymnNumberYoruba && (
                                <span className="ml-1.5 rounded bg-sunken px-1.5 py-0.5 font-mono text-[0.75rem] font-semibold not-italic">
                                  {item.hymnNumberYoruba}
                                </span>
                              )}
                            </span>
                          )}
                          {item.note && (
                            <span className="mt-0.5 block text-[0.8125rem] text-ink-faint">
                              {item.note}
                            </span>
                          )}
                        </span>
                        <span className="shrink-0 text-right">
                          {item.minister && (
                            <span className="block text-[0.8125rem] font-semibold text-ink-soft">
                              {item.minister}
                            </span>
                          )}
                          {item.time && (
                            <span className="block text-[0.75rem] tabular-nums text-ornament">
                              {formatTime(item.time)}
                            </span>
                          )}
                        </span>
                      </li>
                    ))}
                  </ol>
                </div>
              ))}
          </div>
        </section>
      )}

      {/* --- hymns & readings ---------------------------------------------- */}
      {((bulletin.hymns?.length ?? 0) > 0 || (bulletin.readings?.length ?? 0) > 0) && (
        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          {(bulletin.hymns?.length ?? 0) > 0 && (
            <Card className="p-5">
              <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-ink">
                <Music4 className="size-4.5 text-ornament" aria-hidden />
                Hymns
              </h2>
              <ul className="mt-3 space-y-2.5">
                {bulletin.hymns.map((hymn) => (
                  <li key={hymn.id} className="flex items-baseline gap-2.5">
                    {hymn.number && (
                      <span className="shrink-0 rounded bg-sunken px-1.5 py-0.5 font-mono text-[0.75rem] font-semibold text-ink-soft">
                        {hymn.number}
                      </span>
                    )}
                    <span className="min-w-0">
                      <span className="block text-[0.9rem] font-medium text-ink">{hymn.title}</span>
                      {hymn.slot && <span className="text-[0.75rem] text-ink-faint">{hymn.slot}</span>}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {(bulletin.readings?.length ?? 0) > 0 && (
            <Card className="p-5">
              <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-ink">
                <BookOpenText className="size-4.5 text-ornament" aria-hidden />
                Scripture readings
              </h2>
              <ul className="mt-3 space-y-2">
                {bulletin.readings.map((reading) => (
                  <li key={reading} className="text-[0.9rem] font-medium text-info">
                    {reading}
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      )}

      {/* --- teenagers ------------------------------------------------------ */}
      {teenagersOrder.length > 0 && (
        <Card className="mt-6 p-5">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-ink">
            <Users className="size-4.5 text-ornament" aria-hidden />
            Teenagers’ Church
          </h2>
          <ol className="mt-3 space-y-1.5">
            {teenagersOrder.map((line, index) => (
              <li key={index} className="flex gap-2.5 text-[0.9rem] text-ink-soft">
                <span className="w-5 shrink-0 text-right font-semibold tabular-nums text-ink-faint">
                  {index + 1}.
                </span>
                {line}
              </li>
            ))}
          </ol>
        </Card>
      )}

      {/* --- attendance ----------------------------------------------------- */}
      {attendance.length > 0 && (
        <section className="mt-8" aria-labelledby="attendance-heading">
          <h2
            id="attendance-heading"
            className="font-display text-xl font-semibold text-ink"
          >
            Last week in figures
          </h2>
          <div className="-mx-4 mt-4 overflow-x-auto sm:mx-0 sm:rounded-xl sm:border sm:border-line">
            <table className="w-full min-w-[34rem] border-collapse text-left text-sm">
              <caption className="sr-only">Attendance at last week’s services</caption>
              <thead className="bg-sunken/95">
                <tr className="border-b border-line">
                  {['Service', 'Men', 'Women', 'Youth', 'Teens', 'Children', 'Total'].map(
                    (heading, i) => (
                      <th
                        key={heading}
                        scope="col"
                        className={`px-3 py-2.5 text-[0.7rem] font-semibold uppercase tracking-[0.08em] text-ink-faint ${
                          i === 0 ? '' : 'text-right'
                        }`}
                      >
                        {heading}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {attendance.map((row) => (
                  <tr key={row.id}>
                    <td className="px-3 py-2.5 font-medium text-ink">{row.label}</td>
                    {(['men', 'women', 'youth', 'teenagers', 'children'] as const).map((key) => (
                      <td
                        key={key}
                        className="px-3 py-2.5 text-right tabular-nums text-ink-soft"
                      >
                        {row[key] ?? '—'}
                      </td>
                    ))}
                    <td className="px-3 py-2.5 text-right font-semibold tabular-nums text-ink">
                      {rowTotal(row) || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* --- notices -------------------------------------------------------- */}
      {notices.length > 0 && (
        <section className="mt-8" aria-labelledby="notices-heading">
          <h2
            id="notices-heading"
            className="flex items-center gap-2 font-display text-xl font-semibold text-ink"
          >
            <Megaphone className="size-5 text-ornament" aria-hidden />
            Announcements
          </h2>
          <ul className="mt-4 space-y-2.5">
            {notices.map((notice, index) => (
              <li key={index} className="flex gap-3 rounded-lg bg-sunken/60 px-4 py-3">
                <span className="mt-1 size-1.5 shrink-0 rotate-45 bg-ornament" aria-hidden />
                <span className="text-[0.9rem] leading-relaxed text-ink-soft">{notice}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* --- week ahead ------------------------------------------------------ */}
      {(bulletin.weekAhead?.length ?? 0) > 0 && (
        <section className="mt-8" aria-labelledby="week-heading">
          <h2 id="week-heading" className="font-display text-xl font-semibold text-ink">
            The week ahead
          </h2>
          <ul className="mt-4 space-y-2">
            {bulletin.weekAhead.map((entry) => (
              <li
                key={entry.id}
                className="flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-lg border border-line bg-surface px-4 py-3"
              >
                <span className="w-24 shrink-0 text-[0.8125rem] font-bold uppercase tracking-[0.08em] text-brand">
                  {entry.day}
                </span>
                <span className="min-w-0 flex-1 text-[0.9375rem] font-medium text-ink">
                  {entry.activity}
                </span>
                <span className="text-[0.8125rem] text-ink-faint">
                  {[entry.time ? formatTime(entry.time) : '', entry.venue]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* --- coming programmes ----------------------------------------------- */}
      {coming.length > 0 && (
        <section className="mt-8" aria-labelledby="coming-heading">
          <h2
            id="coming-heading"
            className="flex items-center gap-2 font-display text-xl font-semibold text-ink"
          >
            <CalendarRange className="size-5 text-ornament" aria-hidden />
            Our coming programmes
          </h2>
          <ul className="mt-4 divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
            {coming.map((item) => (
              <li key={item.id} className="flex flex-wrap gap-x-4 gap-y-1 px-4 py-3">
                <span className="w-40 shrink-0 text-[0.8125rem] font-semibold text-brand">
                  {[item.month, item.when].filter(Boolean).join(' · ')}
                </span>
                <span className="min-w-0 flex-1 text-[0.9rem] text-ink-soft">{item.what}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* --- birthdays -------------------------------------------------------- */}
      {birthdays.length > 0 && (
        <section className="mt-8" aria-labelledby="birthday-heading">
          <h2
            id="birthday-heading"
            className="flex items-center gap-2 font-display text-xl font-semibold text-ink"
          >
            <Cake className="size-5 text-ornament" aria-hidden />
            Birthday celebrants
          </h2>
          <p className="mt-1 text-[0.875rem] text-ink-faint">
            We pray and rejoice with the following people.
          </p>
          <ul className="mt-4 grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
            {birthdays.map((entry) => (
              <li
                key={entry.id}
                className="flex items-baseline justify-between gap-3 border-b border-line py-1.5"
              >
                <span className="min-w-0 truncate text-[0.9rem] text-ink">{entry.name}</span>
                <span className="shrink-0 text-[0.8125rem] font-semibold tabular-nums text-ornament">
                  {ordinal(entry.day)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* --- the message ------------------------------------------------------ */}
      {bulletin.message?.body && (
        <section className="mt-10" aria-labelledby="message-heading">
          <Rule className="mx-auto max-w-xs" />
          <p className="mt-6 text-center font-display text-[0.8125rem] font-bold uppercase tracking-[0.14em] text-ornament">
            {bulletin.message.heading ?? 'From the Throne of Glory!'}
          </p>
          <h2
            id="message-heading"
            className="mt-2 text-balance text-center font-display text-2xl font-semibold text-ink"
          >
            {bulletin.message.topic}
          </h2>
          {bulletin.message.text && (
            <p className="mt-1.5 text-center text-[0.9375rem] font-medium text-info">
              {bulletin.message.text}
            </p>
          )}

          <RichText className="mt-6">{bulletin.message.body}</RichText>

          {bulletin.message.author && (
            <p className="mt-6 text-right font-display text-[0.9375rem] font-semibold italic text-ink-soft">
              — {bulletin.message.author}
            </p>
          )}
        </section>
      )}

      {/* --- prayer points ----------------------------------------------------- */}
      {prayerPoints.length > 0 && (
        <Card className="mt-8 p-5">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-ink">
            <HandHeart className="size-4.5 text-ornament" aria-hidden />
            Prayer points
          </h2>
          <ol className="mt-3 space-y-2">
            {prayerPoints.map((point, index) => (
              <li key={index} className="flex gap-3">
                <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-brand/10 text-[0.7rem] font-bold tabular-nums text-brand">
                  {index + 1}
                </span>
                <span className="text-[0.9rem] leading-relaxed text-ink-soft">{point}</span>
              </li>
            ))}
          </ol>
        </Card>
      )}

      {/* --- coming up --------------------------------------------------------- */}
      {(bulletin.nextSundaySchool?.topic ||
        (bulletin.disciplesThisMonth?.length ?? 0) > 0 ||
        (bulletin.disciplesNextMonth?.length ?? 0) > 0) && (
        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          {bulletin.nextSundaySchool?.topic && (
            <Card className="p-5">
              <p className="eyebrow">Next week’s Sunday School</p>
              <p className="mt-2 font-display text-[1.0625rem] font-semibold text-ink">
                {bulletin.nextSundaySchool.topic}
              </p>
              {bulletin.nextSundaySchool.topicYoruba && (
                <p className="mt-0.5 text-[0.875rem] italic text-ink-soft">
                  {bulletin.nextSundaySchool.topicYoruba}
                </p>
              )}
              {bulletin.nextSundaySchool.text && (
                <p className="mt-2 text-[0.875rem] font-medium text-info">
                  {bulletin.nextSundaySchool.text}
                </p>
              )}
            </Card>
          )}

          {((bulletin.disciplesThisMonth?.length ?? 0) > 0 ||
            (bulletin.disciplesNextMonth?.length ?? 0) > 0) && (
            <Card className="p-5">
              <p className="eyebrow">Disciples’ Lifestyle</p>
              {(bulletin.disciplesThisMonth ?? []).length > 0 && (
                <>
                  <p className="mt-2 text-[0.75rem] font-semibold uppercase tracking-wider text-ink-faint">
                    This month
                  </p>
                  {bulletin.disciplesThisMonth.map((theme) => (
                    <p key={theme.id} className="mt-1">
                      <span className="block text-[0.9375rem] font-medium text-ink">
                        {theme.topic}
                      </span>
                      {theme.topicYoruba && (
                        <span className="block text-[0.8125rem] italic text-ink-soft">
                          {theme.topicYoruba}
                        </span>
                      )}
                    </p>
                  ))}
                </>
              )}
              {(bulletin.disciplesNextMonth ?? []).length > 0 && (
                <>
                  <p className="mt-3 text-[0.75rem] font-semibold uppercase tracking-wider text-ink-faint">
                    Next month
                  </p>
                  {bulletin.disciplesNextMonth.map((theme) => (
                    <p key={theme.id} className="mt-1">
                      <span className="block text-[0.9375rem] font-medium text-ink">
                        {theme.topic}
                      </span>
                      {theme.topicYoruba && (
                        <span className="block text-[0.8125rem] italic text-ink-soft">
                          {theme.topicYoruba}
                        </span>
                      )}
                    </p>
                  ))}
                </>
              )}
            </Card>
          )}
        </div>
      )}

      {/* --- appeals ------------------------------------------------------------ */}
      {(urgentNeeds.length > 0 || projects.length > 0) && (
        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          {urgentNeeds.length > 0 && (
            <Card className="border-accent/30 p-5">
              <h2 className="font-display text-lg font-semibold text-ink">Urgent needs</h2>
              <ul className="mt-3 space-y-2">
                {urgentNeeds.map((need, index) => (
                  <li key={index} className="flex gap-2.5 text-[0.9rem] text-ink-soft">
                    <span className="mt-1.5 size-1.5 shrink-0 rotate-45 bg-accent" aria-hidden />
                    {need}
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {projects.length > 0 && (
            <Card className="p-5">
              <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-ink">
                <Hammer className="size-4.5 text-ornament" aria-hidden />
                Church projects
              </h2>
              <ul className="mt-3 space-y-2">
                {projects.map((project, index) => (
                  <li key={index} className="flex gap-2.5 text-[0.9rem] text-ink-soft">
                    <span className="mt-1.5 size-1.5 shrink-0 rotate-45 bg-ornament" aria-hidden />
                    {project}
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      )}

      {/* --- offering ------------------------------------------------------------ */}
      {(bulletin.offeringNote || church.bankAccounts.length > 0) && (
        <Card className="mt-6 border-ornament/30 p-5">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-ink">
            <Wallet className="size-4.5 text-ornament" aria-hidden />
            Giving
          </h2>
          {bulletin.offeringNote && (
            <p className="mt-2 whitespace-pre-line text-[0.9rem] leading-relaxed text-ink-soft">
              {bulletin.offeringNote}
            </p>
          )}
          <ButtonLink to="/giving" variant="link" size="sm" className="mt-2">
            See the church account details
          </ButtonLink>
        </Card>
      )}

      {bulletin.closingNote && (
        <>
          <Rule className="mx-auto mt-10 max-w-xs" />
          <p className="mt-6 text-balance text-center font-display text-lg italic leading-relaxed text-ink-soft">
            {bulletin.closingNote}
          </p>
        </>
      )}
    </article>
  )
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function rowTotal(row: BulletinAttendanceRow): number {
  if (row.total !== undefined) return row.total
  return (
    (row.men ?? 0) +
    (row.women ?? 0) +
    (row.youth ?? 0) +
    (row.teenagers ?? 0) +
    (row.children ?? 0)
  )
}

function ordinal(n: number): string {
  const rem100 = n % 100
  if (rem100 >= 11 && rem100 <= 13) return `${n}th`
  switch (n % 10) {
    case 1:
      return `${n}st`
    case 2:
      return `${n}nd`
    case 3:
      return `${n}rd`
    default:
      return `${n}th`
  }
}

/** The printed sheet, section by section, in the same order as the page. */
function buildPrintable(bulletin: Bulletin, churchName: string, motto?: string) {
  const sections: PrintSection[] = []

  if (bulletin.sundaySchool?.topic) {
    sections.push({
      heading: 'Church in Classes',
      intro: [
        bulletin.sundaySchool.topic,
        bulletin.sundaySchool.topicYoruba,
        bulletin.sundaySchool.text,
        bulletin.sundaySchool.memoryVerse &&
          `“${bulletin.sundaySchool.memoryVerse}” — ${bulletin.sundaySchool.memoryVerseRef ?? ''}`,
      ]
        .filter(Boolean)
        .join(' · '),
      columns: [],
      rows: [],
    })
  }

  for (const section of bulletin.sections ?? []) {
    if (section.items.length === 0) continue
    sections.push({
      heading: [section.heading, section.headingYoruba].filter(Boolean).join(' / '),
      columns: [{ header: 'Item' }, { header: 'Minister' }, { header: 'Time', align: 'right' }],
      rows: section.items.map((item) => [
        [
          [item.item, item.hymnNumber].filter(Boolean).join(' '),
          [item.itemYoruba, item.hymnNumberYoruba].filter(Boolean).join(' '),
        ]
          .filter(Boolean)
          .join(' / '),
        item.minister ?? '',
        item.time ? formatTime(item.time) : '',
      ]),
    })
  }

  if ((bulletin.attendanceSummary?.length ?? 0) > 0) {
    sections.push({
      heading: 'Attendance',
      columns: [
        { header: 'Service' },
        { header: 'Men', align: 'right' },
        { header: 'Women', align: 'right' },
        { header: 'Youth', align: 'right' },
        { header: 'Teens', align: 'right' },
        { header: 'Children', align: 'right' },
        { header: 'Total', align: 'right' },
      ],
      rows: bulletin.attendanceSummary.map((row) => [
        row.label,
        row.men ?? '',
        row.women ?? '',
        row.youth ?? '',
        row.teenagers ?? '',
        row.children ?? '',
        rowTotal(row),
      ]),
    })
  }

  if ((bulletin.notices?.length ?? 0) > 0) {
    sections.push({
      heading: 'Announcements',
      columns: [{ header: '#' }, { header: 'Notice' }],
      rows: bulletin.notices.map((notice, i) => [i + 1, notice]),
    })
  }

  if ((bulletin.comingProgrammes?.length ?? 0) > 0) {
    sections.push({
      heading: 'Our Coming Programmes',
      columns: [{ header: 'When' }, { header: 'What' }],
      rows: bulletin.comingProgrammes.map((item) => [
        [item.month, item.when].filter(Boolean).join(' · '),
        item.what,
      ]),
    })
  }

  if ((bulletin.birthdays?.length ?? 0) > 0) {
    sections.push({
      heading: 'Birthday Celebrants',
      columns: [{ header: 'Name' }, { header: 'Day', align: 'right' }],
      rows: [...bulletin.birthdays]
        .sort((a, b) => a.day - b.day)
        .map((entry) => [entry.name, ordinal(entry.day)]),
    })
  }

  if ((bulletin.prayerPoints?.length ?? 0) > 0) {
    sections.push({
      heading: 'Prayer Points',
      columns: [{ header: '#' }, { header: 'Prayer point' }],
      rows: bulletin.prayerPoints.map((point, i) => [i + 1, point]),
    })
  }

  if ((bulletin.projects?.length ?? 0) > 0) {
    sections.push({
      heading: 'Church Projects',
      columns: [{ header: 'Project' }],
      rows: bulletin.projects.map((project) => [project]),
    })
  }

  return {
    title: bulletin.occasion || bulletin.title,
    subtitle: [
      bulletin.yearTheme,
      formatDate(bulletin.date, 'full'),
      bulletin.occasionSubtitle,
      (bulletin.schedule ?? [])
        .map((row) => `${row.name} ${formatTime(row.startTime)}`)
        .join(' · '),
    ]
      .filter(Boolean)
      .join(' — '),
    churchName,
    motto,
    sections,
    footNote: bulletin.closingNote ?? `${churchName} — ${motto ?? ''}`,
  }
}

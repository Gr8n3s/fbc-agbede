import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  BookOpenText,
  Clock,
  Download,
  MapPin,
  Megaphone,
  Mic,
  Music4,
  Printer,
  Share2,
  Wallet,
} from 'lucide-react'
import { VerseBlock } from '@/components/site/cards'
import { Badge, Button, ButtonLink, Card, EmptyState, Rule, Seal } from '@/components/ui'
import { useContent } from '@/context/ContentContext'
import { useToast } from '@/context/ToastContext'
import { useDocumentTitle } from '@/hooks'
import { publishedBulletins } from '@/lib/content'
import { printDocument } from '@/lib/export'
import { BULLETIN_KIND_LABELS } from '@/lib/types'
import { asset, formatDate, formatTime, safeUrl } from '@/lib/utils'

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

  const print = () => {
    printDocument({
      title: bulletin.title,
      subtitle: [
        formatDate(bulletin.date, 'full'),
        bulletin.startTime ? formatTime(bulletin.startTime) : '',
        bulletin.venue,
      ]
        .filter(Boolean)
        .join(' · '),
      churchName: church.name,
      motto: church.motto,
      sections: [
        ...(bulletin.theme
          ? [
              {
                heading: 'Theme',
                intro: `${bulletin.theme}${bulletin.themeVerseRef ? ` — ${bulletin.themeVerseRef}` : ''}`,
                columns: [],
                rows: [],
              },
            ]
          : []),
        {
          heading: 'Order of Service',
          columns: [{ header: 'Time' }, { header: 'Item' }, { header: 'Minister' }],
          rows: bulletin.orderOfService.map((item) => [
            item.time ? formatTime(item.time) : '',
            item.item,
            item.minister ?? '',
          ]),
        },
        ...(bulletin.hymns.length
          ? [
              {
                heading: 'Hymns',
                columns: [{ header: 'Slot' }, { header: 'No.' }, { header: 'Hymn' }],
                rows: bulletin.hymns.map((h) => [h.slot ?? '', h.number ?? '', h.title]),
              },
            ]
          : []),
        ...(bulletin.weekAhead.length
          ? [
              {
                heading: 'The Week Ahead',
                columns: [{ header: 'Day' }, { header: 'Time' }, { header: 'Activity' }, { header: 'Venue' }],
                rows: bulletin.weekAhead.map((w) => [w.day, w.time ?? '', w.activity, w.venue ?? '']),
              },
            ]
          : []),
        ...(bulletin.notices.length
          ? [
              {
                heading: 'Notices',
                columns: [{ header: '#' }, { header: 'Notice' }],
                rows: bulletin.notices.map((notice, i) => [i + 1, notice]),
              },
            ]
          : []),
      ],
      footNote: bulletin.closingNote ?? `${church.name} — ${church.motto}`,
    })
  }

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

      {/* --- Programme head, styled like the printed sheet --- */}
      <header className="mt-6 overflow-hidden rounded-2xl border border-line bg-surface">
        <div
          aria-hidden
          className="h-1 w-full bg-[linear-gradient(90deg,var(--color-vestry-800)_0_33%,var(--color-crimson-600)_33%_66%,var(--color-gold-500)_66%_100%)]"
        />
        <div className="px-5 py-7 text-center sm:px-8 sm:py-9">
          <Seal className="mx-auto size-16" decorative />
          <p className="mt-4 font-display text-sm font-semibold uppercase tracking-[0.16em] text-ink-soft">
            {church.name}
          </p>
          <p className="eyebrow mt-1">{church.motto}</p>

          <Rule className="mx-auto my-5 max-w-[10rem]" />

          <Badge tone="accent">{BULLETIN_KIND_LABELS[bulletin.kind] ?? 'Programme'}</Badge>
          <h1 className="mt-3 text-balance font-display text-3xl font-semibold text-ink sm:text-4xl">
            {bulletin.title}
          </h1>

          <p className="mt-3 text-[0.9375rem] font-medium text-ink-soft">
            {formatDate(bulletin.date, 'full')}
            {multiDay && ` – ${formatDate(bulletin.endDate, 'full')}`}
          </p>

          <div className="mt-3 flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 text-[0.875rem] text-ink-faint">
            {bulletin.startTime && (
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

      {/* --- Theme --- */}
      {(bulletin.theme || bulletin.themeVerse) && (
        <Card className="mt-6 p-5 sm:p-7">
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

      {/* --- Order of service --- */}
      {bulletin.orderOfService.length > 0 && (
        <section className="mt-8" aria-labelledby="oos-heading">
          <h2 id="oos-heading" className="font-display text-xl font-semibold text-ink">
            Order of Service
          </h2>
          <ol className="mt-4 overflow-hidden rounded-xl border border-line bg-surface">
            {bulletin.orderOfService.map((item, index) => (
              <li
                key={item.id}
                className="flex items-start gap-3 border-b border-line px-4 py-3 last:border-0"
              >
                <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-brand/10 text-[0.7rem] font-bold tabular-nums text-brand">
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[0.9375rem] font-medium text-ink">{item.item}</span>
                  {(item.minister || item.note) && (
                    <span className="mt-0.5 block text-[0.8125rem] text-ink-faint">
                      {[item.minister, item.note].filter(Boolean).join(' · ')}
                    </span>
                  )}
                </span>
                {item.time && (
                  <span className="shrink-0 text-[0.8125rem] font-semibold tabular-nums text-ornament">
                    {formatTime(item.time)}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* --- Hymns & readings --- */}
      {(bulletin.hymns.length > 0 || bulletin.readings.length > 0) && (
        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          {bulletin.hymns.length > 0 && (
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
                      {hymn.slot && (
                        <span className="text-[0.75rem] text-ink-faint">{hymn.slot}</span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {bulletin.readings.length > 0 && (
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

      {/* --- Week ahead --- */}
      {bulletin.weekAhead.length > 0 && (
        <section className="mt-8" aria-labelledby="week-heading">
          <h2 id="week-heading" className="font-display text-xl font-semibold text-ink">
            The week ahead
          </h2>
          <p className="mt-1 text-[0.875rem] text-ink-faint">
            Activities running on other days this week.
          </p>
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
                  {[entry.time ? formatTime(entry.time) : '', entry.venue].filter(Boolean).join(' · ')}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* --- Notices --- */}
      {bulletin.notices.length > 0 && (
        <section className="mt-8" aria-labelledby="notices-heading">
          <h2
            id="notices-heading"
            className="flex items-center gap-2 font-display text-xl font-semibold text-ink"
          >
            <Megaphone className="size-5 text-ornament" aria-hidden />
            Notices
          </h2>
          <ul className="mt-4 space-y-2.5">
            {bulletin.notices.map((notice, index) => (
              <li key={index} className="flex gap-3 rounded-lg bg-sunken/60 px-4 py-3">
                <span className="mt-1 size-1.5 shrink-0 rotate-45 bg-ornament" aria-hidden />
                <span className="text-[0.9rem] leading-relaxed text-ink-soft">{notice}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* --- Offering --- */}
      {bulletin.offeringNote && (
        <Card className="mt-6 border-ornament/30 p-5">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-ink">
            <Wallet className="size-4.5 text-ornament" aria-hidden />
            Offering
          </h2>
          <p className="mt-2 whitespace-pre-line text-[0.9rem] leading-relaxed text-ink-soft">
            {bulletin.offeringNote}
          </p>
          <ButtonLink to="/giving" variant="link" size="sm" className="mt-2">
            See church account details
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

import { useMemo, useState } from 'react'
import { BookOpenText, CheckCircle2, ChevronLeft, ChevronRight, Circle, Share2 } from 'lucide-react'
import { RichText } from '@/components/site/RichText'
import { VerseBlock } from '@/components/site/cards'
import {
  Button,
  Card,
  EmptyState,
  IconButton,
  PageHeader,
  Rule,
  SectionHeading,
} from '@/components/ui'
import { useContent } from '@/context/ContentContext'
import { useToast } from '@/context/ToastContext'
import { useDocumentTitle, useLocalState } from '@/hooks'
import { cx, formatDate, todayIso } from '@/lib/utils'

export default function DevotionalPage() {
  const { content } = useContent()
  const toast = useToast()
  useDocumentTitle('Daily Devotional', 'Today’s verse, devotional thought and Bible reading plan.')

  /**
   * Reading-plan ticks are kept on the device only. Nobody else needs to know
   * how someone is getting on with their Bible reading.
   */
  const [completed, setCompleted] = useLocalState<string[]>('reading-plan', [])

  const devotionals = useMemo(
    () =>
      content.devotionals
        .filter((d) => d.published !== false)
        .sort((a, b) => b.date.localeCompare(a.date)),
    [content.devotionals],
  )

  const today = todayIso()
  const startIndex = Math.max(
    0,
    devotionals.findIndex((d) => d.date <= today),
  )
  const [index, setIndex] = useState(startIndex)
  const devotional = devotionals[index]

  const toggle = (reference: string) => {
    const key = `${devotional?.date}:${reference}`
    setCompleted((current) =>
      current.includes(key) ? current.filter((k) => k !== key) : [...current, key],
    )
  }

  const share = async () => {
    if (!devotional) return
    const text = `${devotional.title}\n\n"${devotional.verseText}", ${devotional.verseRef}\n\n${window.location.href}`
    if (navigator.share) {
      try {
        await navigator.share({ title: devotional.title, text })
        return
      } catch {
        /* dismissed */
      }
    }
    try {
      await navigator.clipboard.writeText(text)
      toast.success('Copied', 'Paste it into WhatsApp to share the word.')
    } catch {
      toast.error('Could not copy')
    }
  }

  if (!devotional) {
    return (
      <>
        <PageHeader eyebrow="Daily bread" title="Devotional" />
        <div className="mx-auto max-w-2xl px-4 py-16">
          <EmptyState
            icon={BookOpenText}
            title="No devotional published yet"
            description="Daily verses, devotional thoughts and the Bible reading plan will appear here."
          />
        </div>
      </>
    )
  }

  const isToday = devotional.date === today
  const readingDone = devotional.readingPlan.filter((r) =>
    completed.includes(`${devotional.date}:${r}`),
  ).length

  return (
    <>
      <PageHeader
        eyebrow="Daily bread"
        title="Devotional"
        description="A verse, a thought and a reading for each day. Tick off your reading as you go, that record stays on your phone."
      />

      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-12">
        {/* Day navigation */}
        <div className="flex items-center justify-between gap-3">
          <IconButton
            icon={ChevronLeft}
            label="Later devotional"
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
            disabled={index === 0}
          />
          <p className="text-center">
            <span className="block font-display text-[0.9375rem] font-semibold text-ink">
              {formatDate(devotional.date, 'full')}
            </span>
            {isToday && <span className="eyebrow">Today</span>}
          </p>
          <IconButton
            icon={ChevronRight}
            label="Earlier devotional"
            onClick={() => setIndex((i) => Math.min(devotionals.length - 1, i + 1))}
            disabled={index >= devotionals.length - 1}
          />
        </div>

        <Card className="mt-6 overflow-hidden">
          <div className="relative px-5 py-8 text-center sm:px-10 sm:py-10">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 h-32 opacity-45"
              style={{ background: 'radial-gradient(60% 100% at 50% 0%, var(--halo-a), transparent)' }}
            />
            <div className="relative">
              <h1 className="text-balance font-display text-2xl font-semibold text-ink sm:text-3xl">
                {devotional.title}
              </h1>
              <VerseBlock
                reference={devotional.verseRef}
                text={devotional.verseText}
                className="mx-auto mt-7 max-w-xl text-left"
              />
            </div>
          </div>

          <div className="border-t border-line px-5 py-6 sm:px-10 sm:py-8">
            <RichText>{devotional.body}</RichText>

            {devotional.prayer && (
              <div className="mt-7 rounded-xl border border-ornament/30 bg-ornament/[0.06] p-4 sm:p-5">
                <p className="eyebrow">Prayer</p>
                <p className="mt-2 whitespace-pre-line text-[0.9375rem] italic leading-relaxed text-ink">
                  {devotional.prayer}
                </p>
              </div>
            )}

            {devotional.author && (
              <p className="mt-6 text-[0.8125rem] text-ink-faint">— {devotional.author}</p>
            )}
          </div>
        </Card>

        {devotional.readingPlan.length > 0 && (
          <section className="mt-8">
            <SectionHeading
              eyebrow="Bible reading plan"
              title="Today’s reading"
              description={`${readingDone} of ${devotional.readingPlan.length} completed. Your progress is saved on this device only.`}
            />
            <ul className="mt-5 space-y-2">
              {devotional.readingPlan.map((reference) => {
                const done = completed.includes(`${devotional.date}:${reference}`)
                return (
                  <li key={reference}>
                    <button
                      type="button"
                      onClick={() => toggle(reference)}
                      aria-pressed={done}
                      className={cx(
                        'flex w-full items-center gap-3 rounded-xl border px-4 py-3.5 text-left transition-all duration-200',
                        done
                          ? 'border-success/35 bg-success/8 text-ink'
                          : 'border-line bg-surface text-ink-soft hover:border-ornament/50',
                      )}
                    >
                      {done ? (
                        <CheckCircle2 className="size-5 shrink-0 text-success" aria-hidden />
                      ) : (
                        <Circle className="size-5 shrink-0 text-ink-faint" aria-hidden />
                      )}
                      <span
                        className={cx(
                          'font-display text-[1.0625rem] font-medium',
                          done && 'line-through decoration-success/40',
                        )}
                      >
                        {reference}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </section>
        )}

        <Rule className="my-8" />

        <div className="flex justify-center">
          <Button variant="secondary" icon={Share2} onClick={() => void share()}>
            Share today’s word
          </Button>
        </div>
      </div>
    </>
  )
}

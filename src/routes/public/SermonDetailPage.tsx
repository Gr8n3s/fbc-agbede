import { useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { BookOpenText, Clock, Headphones, Mic, Share2, Video } from 'lucide-react'
import { SermonCard } from '@/components/site/cards'
import { RichText } from '@/components/site/RichText'
import {
  BackLink,
  Badge,
  Button,
  ButtonLink,
  Card,
  EmptyState,
  ExternalButton,
  Rule,
} from '@/components/ui'
import { useContent } from '@/context/ContentContext'
import { useToast } from '@/context/ToastContext'
import { useDocumentTitle } from '@/hooks'
import { publishedSermons } from '@/lib/content'
import { asset, formatDate, pluralise, safeUrl } from '@/lib/utils'

export default function SermonDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const { content } = useContent()
  const toast = useToast()

  const sermons = useMemo(() => publishedSermons(content.sermons), [content.sermons])
  const sermon = useMemo(() => sermons.find((s) => s.slug === slug), [sermons, slug])

  useDocumentTitle(sermon?.title ?? 'Sermon', sermon?.summary)

  const related = useMemo(() => {
    if (!sermon) return []
    return sermons
      .filter((s) => s.id !== sermon.id)
      .filter(
        (s) =>
          (sermon.series && s.series === sermon.series) ||
          s.preacher === sermon.preacher ||
          s.tags.some((tag) => sermon.tags.includes(tag)),
      )
      .slice(0, 3)
  }, [sermons, sermon])

  if (!sermon) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20">
        <EmptyState
          icon={Mic}
          title="Sermon not found"
          description="This message may have been removed, or the link is out of date."
          action={
            <ButtonLink to="/sermons" variant="secondary">
              Back to all sermons
            </ButtonLink>
          }
        />
      </div>
    )
  }

  const audio = safeUrl(sermon.audioUrl ? asset(sermon.audioUrl) : undefined)
  const video = safeUrl(sermon.videoUrl)

  const share = async () => {
    const url = window.location.href
    if (navigator.share) {
      try {
        await navigator.share({ title: sermon.title, text: sermon.summary, url })
        return
      } catch {
        /* dismissed */
      }
    }
    try {
      await navigator.clipboard.writeText(url)
      toast.success('Link copied')
    } catch {
      toast.error('Could not copy the link')
    }
  }

  return (
    <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <BackLink to="/sermons">Back to sermons</BackLink>

      <header className="mt-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="brand">{sermon.category.replace(/-/g, ' ')}</Badge>
          {sermon.series && <Badge tone="gold">{sermon.series}</Badge>}
        </div>

        <h1 className="mt-3 text-balance font-display text-title font-semibold text-ink">
          {sermon.title}
        </h1>

        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[0.875rem] text-ink-faint">
          <span className="inline-flex items-center gap-1.5">
            <Mic className="size-4 text-ornament" aria-hidden />
            {sermon.preacher}
          </span>
          <span>{formatDate(sermon.date, 'full')}</span>
          {sermon.durationMinutes && (
            <span className="inline-flex items-center gap-1.5">
              <Clock className="size-4 text-ornament" aria-hidden />
              {pluralise(sermon.durationMinutes, 'minute')}
            </span>
          )}
        </div>
      </header>

      {sermon.scriptures.length > 0 && (
        <Card className="mt-6 border-info/25 p-4">
          <p className="flex items-center gap-2 text-[0.7rem] font-bold uppercase tracking-[0.14em] text-info">
            <BookOpenText className="size-3.5" aria-hidden />
            Scripture
          </p>
          <p className="mt-1.5 font-display text-lg font-semibold text-ink">
            {sermon.scriptures.join(' · ')}
          </p>
        </Card>
      )}

      {(audio || video) && (
        <div className="mt-6 space-y-4">
          {audio && (
            <Card className="p-4">
              <p className="mb-2.5 flex items-center gap-2 text-[0.8125rem] font-semibold text-ink">
                <Headphones className="size-4 text-ornament" aria-hidden />
                Listen to this message
              </p>
              {/* Native audio: no player library, full platform controls, and it
                  is cached by the service worker for offline listening. */}
              <audio controls preload="none" src={audio} className="w-full">
                Your browser cannot play audio.{' '}
                <a href={audio} download>
                  Download the recording
                </a>
                .
              </audio>
            </Card>
          )}

          {video && (
            <ExternalButton href={video} icon={Video} variant="secondary">
              Watch the video
            </ExternalButton>
          )}
        </div>
      )}

      {sermon.summary && (
        <p className="mt-7 text-pretty text-[1.0625rem] font-medium leading-relaxed text-ink">
          {sermon.summary}
        </p>
      )}

      {sermon.notes && (
        <>
          <Rule className="my-8" />
          <h2 className="font-display text-xl font-semibold text-ink">Sermon notes</h2>
          <RichText className="mt-4">{sermon.notes}</RichText>
        </>
      )}

      {sermon.tags.length > 0 && (
        <ul className="mt-8 flex flex-wrap gap-2">
          {sermon.tags.map((tag) => (
            <li
              key={tag}
              className="rounded-full border border-line bg-sunken px-3 py-1 text-[0.75rem] font-medium text-ink-soft"
            >
              #{tag}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-8">
        <Button variant="secondary" icon={Share2} onClick={() => void share()}>
          Share this message
        </Button>
      </div>

      {related.length > 0 && (
        <section className="mt-14">
          <Rule className="mb-8" />
          <h2 className="font-display text-xl font-semibold text-ink">Related messages</h2>
          <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((item) => (
              <SermonCard key={item.id} sermon={item} />
            ))}
          </div>
        </section>
      )}
    </article>
  )
}

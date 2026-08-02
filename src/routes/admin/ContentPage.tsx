import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  AlertTriangle,
  BookOpenText,
  Building2,
  CalendarDays,
  CheckCircle2,
  CloudUpload,
  Download,
  ExternalLink,
  HandHeart,
  Images,
  Megaphone,
  Mic,
  RotateCcw,
  ScrollText,
  Settings,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import {
  Badge,
  Button,
  ButtonLink,
  Input,
  Modal,
  Panel,
  useConfirm,
} from '@/components/ui'
import { useContent } from '@/context/ContentContext'
import { useToast } from '@/context/ToastContext'
import { useVault } from '@/context/VaultContext'
import { useDocumentTitle, useOnline } from '@/hooks'
import type { PublishProgress } from '@/lib/github'
import type { CollectionName } from '@/lib/types'
import { formatDate, pluralise } from '@/lib/utils'
import { ChurchEditor } from './content/ChurchEditor'
import { BulletinsEditor } from './content/BulletinsEditor'
import {
  AnnouncementsEditor,
  DevotionalsEditor,
  DownloadsEditor,
  EventsEditor,
  GalleryEditor,
  PrayerPointsEditor,
  SermonsEditor,
} from './content/collections'

/**
 * Everything the public site shows, and the one place it gets published from.
 *
 * The mental model the page teaches, because it is the thing an admin must
 * understand: editing is local and free, publishing is a commit to GitHub.
 * Nothing typed here is visible to the congregation until "Publish" is pressed
 * and the site rebuilds.
 */

interface Section {
  slug: string
  collection: CollectionName
  label: string
  description: string
  icon: LucideIcon
  render: () => React.ReactNode
  count: (content: ReturnType<typeof useContent>['content']) => number
}

const SECTIONS: Section[] = [
  {
    slug: 'church',
    collection: 'church',
    label: 'Church details',
    description: 'Name, address, service times, accounts and beliefs',
    icon: Building2,
    render: () => <ChurchEditor />,
    count: (content) => content.church.serviceTimes.length,
  },
  {
    slug: 'bulletins',
    collection: 'bulletins',
    label: 'Programmes',
    description: 'Order of service for Sunday and midweek',
    icon: ScrollText,
    render: () => <BulletinsEditor />,
    count: (content) => content.bulletins.length,
  },
  {
    slug: 'events',
    collection: 'events',
    label: 'Events',
    description: 'Church calendar, revivals and conventions',
    icon: CalendarDays,
    render: () => <EventsEditor />,
    count: (content) => content.events.length,
  },
  {
    slug: 'sermons',
    collection: 'sermons',
    label: 'Sermons',
    description: 'Notes, audio and video',
    icon: Mic,
    render: () => <SermonsEditor />,
    count: (content) => content.sermons.length,
  },
  {
    slug: 'announcements',
    collection: 'announcements',
    label: 'Announcements',
    description: 'The notice board',
    icon: Megaphone,
    render: () => <AnnouncementsEditor />,
    count: (content) => content.announcements.length,
  },
  {
    slug: 'devotionals',
    collection: 'devotionals',
    label: 'Devotionals',
    description: 'Daily verse, reflection and reading plan',
    icon: BookOpenText,
    render: () => <DevotionalsEditor />,
    count: (content) => content.devotionals.length,
  },
  {
    slug: 'prayerPoints',
    collection: 'prayerPoints',
    label: 'Prayer points',
    description: 'What the church is agreeing in prayer',
    icon: HandHeart,
    render: () => <PrayerPointsEditor />,
    count: (content) => content.prayerPoints.length,
  },
  {
    slug: 'gallery',
    collection: 'gallery',
    label: 'Gallery',
    description: 'Photo albums and videos',
    icon: Images,
    render: () => <GalleryEditor />,
    count: (content) => content.gallery.albums.length + content.gallery.videos.length,
  },
  {
    slug: 'downloads',
    collection: 'downloads',
    label: 'Downloads',
    description: 'Bulletins, outlines, constitution, study material',
    icon: Download,
    render: () => <DownloadsEditor />,
    count: (content) => content.downloads.length,
  },
]

export default function ContentPage() {
  const { collection } = useParams<{ collection?: string }>()
  const section = SECTIONS.find((s) => s.slug === collection)

  useDocumentTitle(section ? section.label : 'Content')

  return section ? <SectionView section={section} /> : <ContentHub />
}

// ---------------------------------------------------------------------------

function ContentHub() {
  const { content, dirty, hasUnpublished } = useContent()

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <header>
        <p className="eyebrow">Church office</p>
        <h1 className="mt-1.5 font-display text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
          Website content
        </h1>
        <p className="mt-1 max-w-2xl text-[0.875rem] leading-relaxed text-ink-soft">
          Everything here is public. Edits are saved on this device first; the congregation only
          sees them once you publish.
        </p>
      </header>

      <PublishPanel />

      <ul className="grid gap-3 sm:grid-cols-2">
        {SECTIONS.map((section) => {
          const isDirty = dirty.includes(section.collection)
          return (
            <li key={section.slug}>
              <Link
                to={`/admin/content/${section.slug}`}
                className="group flex h-full items-start gap-3 rounded-xl border border-line bg-surface p-4 transition-all duration-200 hover:border-ornament hover:shadow-pew"
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-brand/10 text-brand transition-colors group-hover:bg-brand group-hover:text-on-brand">
                  <section.icon className="size-[1.15rem]" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-display text-[0.9375rem] font-semibold text-ink">
                      {section.label}
                    </span>
                    {isDirty && <Badge tone="gold">Unpublished</Badge>}
                  </span>
                  <span className="mt-0.5 block text-[0.8125rem] leading-snug text-ink-faint">
                    {section.description}
                  </span>
                  <span className="mt-1.5 block text-[0.75rem] font-semibold tabular-nums text-ink-soft">
                    {section.count(content)} {section.collection === 'church' ? 'service times' : 'items'}
                  </span>
                </span>
              </Link>
            </li>
          )
        })}
      </ul>

      {!hasUnpublished && (
        <p className="flex items-center justify-center gap-2 rounded-xl border border-success/30 bg-success/[0.06] px-4 py-3 text-[0.8125rem] font-medium text-success">
          <CheckCircle2 className="size-4" aria-hidden />
          The website matches what is on this device.
        </p>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------

function SectionView({ section }: { section: Section }) {
  const { dirty } = useContent()
  const isDirty = dirty.includes(section.collection)

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link
            to="/admin/content"
            className="text-[0.8125rem] font-medium text-ink-faint hover:text-ink"
          >
            ← All content
          </Link>
          <h1 className="mt-1.5 flex flex-wrap items-center gap-2 font-display text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
            {section.label}
            {isDirty && <Badge tone="gold">Unpublished</Badge>}
          </h1>
          <p className="mt-1 text-[0.875rem] text-ink-soft">{section.description}</p>
        </div>
        <PublishButton />
      </header>

      {section.render()}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Publishing
// ---------------------------------------------------------------------------

function PublishPanel() {
  const { dirty, hasUnpublished, discard, refresh } = useContent()
  const { data } = useVault()
  const { confirm, confirmElement } = useConfirm()
  const toast = useToast()

  const github = data?.github

  return (
    <>
      <Panel
        title="Publishing"
        description={
          github
            ? `Commits to ${github.owner}/${github.repo} on ${github.branch}`
            : 'Not connected to GitHub yet'
        }
        icon={CloudUpload}
        action={<PublishButton />}
      >
        {!github ? (
          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-warning/35 bg-warning/[0.07] p-3.5">
            <AlertTriangle className="size-5 shrink-0 text-warning" aria-hidden />
            <p className="min-w-0 flex-1 text-[0.8125rem] leading-snug text-ink-soft">
              Connect the church's GitHub repository and this app can update the website by itself.
              Until then, edits stay on this device.
            </p>
            <ButtonLink to="/admin/settings" size="sm" variant="secondary" icon={Settings}>
              Connect
            </ButtonLink>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[0.875rem] text-ink-soft">
              {hasUnpublished ? (
                <>
                  <strong className="text-ink">{pluralise(dirty.length, 'section')}</strong> waiting
                  to go live: {dirty.join(', ')}.
                </>
              ) : (
                'Nothing is waiting to be published.'
              )}
            </p>

            <span className="flex flex-wrap gap-2">
              <Button
                variant="ghost"
                size="sm"
                icon={RotateCcw}
                onClick={async () => {
                  await refresh()
                  toast.success('Reloaded', 'Fetched the latest published content.')
                }}
              >
                Reload live version
              </Button>
              {hasUnpublished && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={async () => {
                    const ok = await confirm({
                      title: 'Throw away local edits?',
                      message:
                        'Every unpublished change on this device will be lost, and the app goes back to what is live on the website.',
                      confirmLabel: 'Discard edits',
                    })
                    if (!ok) return
                    await discard()
                    toast.warning('Local edits discarded')
                  }}
                >
                  Discard edits
                </Button>
              )}
              <a
                href={`https://github.com/${github.owner}/${github.repo}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[0.8125rem] font-medium text-info hover:underline"
              >
                Repository <ExternalLink className="size-3.5" aria-hidden />
              </a>
            </span>
          </div>
        )}

        {github?.verifiedAt && (
          <p className="mt-3 text-[0.75rem] text-ink-faint">
            Connected as {github.verifiedLogin} · checked{' '}
            {formatDate(github.verifiedAt.slice(0, 10), 'long')}
          </p>
        )}
      </Panel>
      {confirmElement}
    </>
  )
}

function PublishButton() {
  const { dirty, hasUnpublished, publish, publishing } = useContent()
  const { data } = useVault()
  const toast = useToast()
  const online = useOnline()

  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [progress, setProgress] = useState<PublishProgress | null>(null)

  const github = data?.github
  const defaultMessage = useMemo(
    () => `Update ${dirty.join(', ')} — ${formatDate(new Date(), 'long')}`,
    [dirty],
  )

  const run = async () => {
    if (!github) return
    setProgress(null)

    try {
      const outcome = await publish(github, message.trim() || defaultMessage, setProgress)

      if (outcome.failed.length === 0) {
        setOpen(false)
        toast.success(
          'Published',
          `${pluralise(outcome.committed.length, 'file')} committed. The website rebuilds in a minute or two.`,
        )
        return
      }

      toast.error(
        'Some sections did not publish',
        `${outcome.failed.map((f) => f.label).join(', ')} — ${outcome.failed[0]?.error}`,
      )
    } catch (error) {
      toast.error(
        'Could not publish',
        error instanceof Error ? error.message : 'Something went wrong talking to GitHub.',
      )
    } finally {
      setProgress(null)
    }
  }

  if (!github) return null

  return (
    <>
      <Button
        icon={CloudUpload}
        size="sm"
        disabled={!hasUnpublished || !online}
        onClick={() => {
          setMessage('')
          setOpen(true)
        }}
      >
        {hasUnpublished ? `Publish ${dirty.length}` : 'Published'}
      </Button>

      <Modal
        open={open}
        onClose={() => !publishing && setOpen(false)}
        title="Publish to the church website"
        description={`Commits to ${github.owner}/${github.repo} (${github.branch}).`}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={publishing}>
              Cancel
            </Button>
            <Button icon={CloudUpload} onClick={run} loading={publishing}>
              Publish now
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <p className="mb-1.5 text-[0.8125rem] font-semibold text-ink">Going live</p>
            <ul className="space-y-1">
              {dirty.map((name) => (
                <li key={name} className="flex items-center gap-2 text-[0.875rem] text-ink-soft">
                  <CheckCircle2 className="size-4 shrink-0 text-success" aria-hidden />
                  {SECTIONS.find((s) => s.collection === name)?.label ?? name}
                </li>
              ))}
            </ul>
          </div>

          <Input
            label="What changed"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={defaultMessage}
            hint="Recorded on the commit, so the church has a history of every change."
          />

          {progress && (
            <div>
              <div className="h-1.5 overflow-hidden rounded-full bg-sunken">
                <div
                  className="h-full rounded-full bg-brand transition-all duration-300"
                  style={{ width: `${(progress.done / Math.max(1, progress.total)) * 100}%` }}
                />
              </div>
              <p className="mt-1.5 text-[0.75rem] text-ink-faint">
                {progress.done} of {progress.total} · {progress.current}
              </p>
            </div>
          )}

          <p className="rounded-lg bg-sunken px-3 py-2.5 text-[0.75rem] leading-relaxed text-ink-faint">
            Only impersonal church information is committed. The membership register, attendance and
            prayer requests never leave this device.
          </p>
        </div>
      </Modal>
    </>
  )
}

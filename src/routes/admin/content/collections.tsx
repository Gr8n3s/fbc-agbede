import {
  BookOpenText,
  CalendarDays,
  Download,
  HandHeart,
  Images,
  Megaphone,
  Mic,
  Video,
} from 'lucide-react'
import {
  Combobox,
  FileField,
  MultiFileField,
  Input,
  ListEditor,
  RowInput,
  Select,
  Switch,
  Textarea,
} from '@/components/ui'
import { useContent } from '@/context/ContentContext'
import type {
  Announcement,
  ChurchEvent,
  Devotional,
  DownloadItem,
  EventCategory,
  GalleryAlbum,
  GalleryPhoto,
  GalleryVideo,
  PrayerPoint,
  Sermon,
} from '@/lib/types'
import { formatDate, newId, nowIso, slugify, todayIso } from '@/lib/utils'
import { CollectionManager, stamps } from './shared'

/**
 * The published collections.
 *
 * Each one is a thin configuration of `CollectionManager` — the list, search,
 * publish toggle and delete behaviour are shared, so all that lives here is
 * what genuinely differs: the fields, and how a row reads at a glance.
 */

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

const EVENT_CATEGORIES: { value: EventCategory; label: string }[] = [
  { value: 'service', label: 'Service' },
  { value: 'revival', label: 'Revival' },
  { value: 'convention', label: 'Convention' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'outreach', label: 'Outreach' },
  { value: 'training', label: 'Training' },
  { value: 'social', label: 'Social' },
  { value: 'special', label: 'Special service' },
]

export function EventsEditor() {
  const { content, update } = useContent()

  return (
    <CollectionManager<ChurchEvent>
      noun="events"
      singular="event"
      icon={CalendarDays}
      items={content.events}
      onChange={(next) => update('events', () => next)}
      emptyHint="Add revivals, conventions, weekly activities and special services so the congregation can plan ahead."
      sortBy={(a, b) => b.start.localeCompare(a.start)}
      searchFields={(event) => [event.title, event.description, event.venue, event.host]}
      validate={(draft) =>
        !draft.title.trim()
          ? 'An event needs a title.'
          : !draft.start
            ? 'An event needs a start date and time.'
            : null
      }
      createItem={() => ({
        id: newId('evt'),
        title: '',
        slug: '',
        description: '',
        category: 'service',
        start: `${todayIso()}T09:00`,
        allDay: false,
        recurrence: 'none',
        venue: '',
        featured: false,
        published: true,
        ...stamps(),
      })}
      renderRow={(event) => ({
        title: event.title,
        meta: `${event.venue || 'Venue to be confirmed'} · ${EVENT_CATEGORIES.find((c) => c.value === event.category)?.label ?? event.category}`,
        trailing: formatDate(event.start.slice(0, 10), 'medium'),
        badges: event.featured ? [{ label: 'Featured', tone: 'gold' }] : undefined,
      })}
      renderForm={(draft, set) => (
        <>
          <Input
            label="Title"
            required
            value={draft.title}
            onChange={(e) => {
              set('title', e.target.value)
              if (!draft.slug) set('slug', slugify(e.target.value))
            }}
            placeholder="e.g. Annual Harvest Thanksgiving"
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Combobox
              label="Category"
              value={draft.category}
              onChange={(e) => set('category', e.target.value as EventCategory)}
              options={EVENT_CATEGORIES}
              hint="Pick one, or type your own."
            />
            <Input
              label="Venue"
              value={draft.venue}
              onChange={(e) => set('venue', e.target.value)}
              placeholder="e.g. Church auditorium"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Starts"
              type={draft.allDay ? 'date' : 'datetime-local'}
              required
              value={draft.allDay ? draft.start.slice(0, 10) : draft.start}
              onChange={(e) =>
                set('start', draft.allDay ? `${e.target.value}T00:00` : e.target.value)
              }
            />
            <Input
              label="Ends"
              type={draft.allDay ? 'date' : 'datetime-local'}
              value={draft.allDay ? (draft.end?.slice(0, 10) ?? '') : (draft.end ?? '')}
              onChange={(e) =>
                set(
                  'end',
                  e.target.value
                    ? draft.allDay
                      ? `${e.target.value}T23:59`
                      : e.target.value
                    : undefined,
                )
              }
              hint="Leave blank for a single-session event."
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Repeats"
              value={draft.recurrence}
              onChange={(e) => set('recurrence', e.target.value as ChurchEvent['recurrence'])}
              options={[
                { value: 'none', label: 'Does not repeat' },
                { value: 'weekly', label: 'Every week' },
                { value: 'monthly', label: 'Every month' },
                { value: 'yearly', label: 'Every year' },
              ]}
            />
            {draft.recurrence !== 'none' && (
              <Input
                label="Repeats until"
                type="date"
                value={draft.recurUntil ?? ''}
                onChange={(e) => set('recurUntil', e.target.value || undefined)}
              />
            )}
          </div>

          <Textarea
            label="Description"
            rows={5}
            maxLength={4000}
            value={draft.description}
            onChange={(e) => set('description', e.target.value)}
          />

          <Input
            label="Host or preacher"
            value={draft.host ?? ''}
            onChange={(e) => set('host', e.target.value)}
          />

          <div className="space-y-3 rounded-lg border border-line bg-sunken/40 p-3.5">
            <Switch
              label="All-day event"
              checked={draft.allDay}
              onChange={(next) => set('allDay', next)}
            />
            <Switch
              label="Feature on the home page"
              description="Featured events lead the church calendar."
              checked={draft.featured}
              onChange={(next) => set('featured', next)}
            />
            <Switch
              label="Published"
              description="Turn off to keep it as a draft."
              checked={draft.published}
              onChange={(next) => set('published', next)}
            />
          </div>
        </>
      )}
    />
  )
}

// ---------------------------------------------------------------------------
// Sermons
// ---------------------------------------------------------------------------

const SERMON_CATEGORIES: { value: Sermon['category']; label: string }[] = [
  { value: 'sunday-worship', label: 'Sunday worship' },
  { value: 'bible-study', label: 'Bible study' },
  { value: 'revival', label: 'Revival' },
  { value: 'convention', label: 'Convention' },
  { value: 'teaching', label: 'Teaching' },
  { value: 'special', label: 'Special service' },
]

export function SermonsEditor() {
  const { content, update } = useContent()

  return (
    <CollectionManager<Sermon>
      noun="sermons"
      singular="sermon"
      icon={Mic}
      items={content.sermons}
      onChange={(next) => update('sermons', () => next)}
      emptyHint="Upload the notes from Sunday's message. Audio and video can be linked from anywhere free. YouTube, Facebook, Google Drive."
      sortBy={(a, b) => b.date.localeCompare(a.date)}
      searchFields={(sermon) => [
        sermon.title,
        sermon.preacher,
        sermon.summary,
        sermon.series,
        sermon.scriptures.join(' '),
        sermon.tags.join(' '),
      ]}
      validate={(draft) =>
        !draft.title.trim()
          ? 'A sermon needs a title.'
          : !draft.preacher.trim()
            ? 'Who preached this message?'
            : null
      }
      createItem={() => ({
        id: newId('ser'),
        title: '',
        slug: '',
        preacher: '',
        date: todayIso(),
        category: 'sunday-worship',
        scriptures: [],
        summary: '',
        notes: '',
        tags: [],
        published: true,
        ...stamps(),
      })}
      renderRow={(sermon) => ({
        title: sermon.title,
        meta: `${sermon.preacher}${sermon.series ? ` · ${sermon.series}` : ''}${
          sermon.scriptures.length ? ` · ${sermon.scriptures.join(', ')}` : ''
        }`,
        trailing: formatDate(sermon.date, 'medium'),
        badges: [
          ...(sermon.audioUrl ? [{ label: 'Audio', tone: 'info' as const }] : []),
          ...(sermon.videoUrl ? [{ label: 'Video', tone: 'accent' as const }] : []),
        ],
      })}
      renderForm={(draft, set) => (
        <>
          <Input
            label="Title"
            required
            value={draft.title}
            onChange={(e) => {
              set('title', e.target.value)
              if (!draft.slug) set('slug', slugify(e.target.value))
            }}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Preacher"
              required
              value={draft.preacher}
              onChange={(e) => set('preacher', e.target.value)}
              placeholder="e.g. Rev. Samuel Ade"
            />
            <Input
              label="Date preached"
              type="date"
              value={draft.date}
              onChange={(e) => set('date', e.target.value)}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Combobox
              label="Category"
              value={draft.category}
              onChange={(e) => set('category', e.target.value as Sermon['category'])}
              options={SERMON_CATEGORIES}
              hint="Pick one, or type your own."
            />
            <Input
              label="Series"
              value={draft.series ?? ''}
              onChange={(e) => set('series', e.target.value)}
              placeholder="Optional"
            />
          </div>

          <Input
            label="Bible references"
            value={draft.scriptures.join(', ')}
            onChange={(e) =>
              set(
                'scriptures',
                e.target.value
                  .split(',')
                  .map((s) => s.trim())
                  .filter(Boolean),
              )
            }
            hint="Separate with commas, e.g. John 3:16, Romans 8:28"
          />

          <Textarea
            label="Summary"
            rows={3}
            maxLength={500}
            showCount
            value={draft.summary}
            onChange={(e) => set('summary', e.target.value)}
            hint="A few lines shown in the sermon list."
          />

          <Textarea
            label="Sermon notes"
            rows={10}
            maxLength={20000}
            value={draft.notes}
            onChange={(e) => set('notes', e.target.value)}
            hint="Headings start with #. Lists start with -. Quotes start with >."
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <FileField
              label="Audio"
              folder="sermons"
              accept="audio/*"
              value={draft.audioUrl ?? ''}
              onChange={(next) => set('audioUrl', next || undefined)}
              hint="Upload a recording, or paste a link. For anything long, a link to YouTube or Drive keeps the app light."
            />
            <Input
              label="Video link"
              type="url"
              value={draft.videoUrl ?? ''}
              onChange={(e) => set('videoUrl', e.target.value || undefined)}
              placeholder="https://youtube.com/…"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Length (minutes)"
              type="number"
              min={0}
              value={draft.durationMinutes ?? ''}
              onChange={(e) =>
                set('durationMinutes', e.target.value ? Number(e.target.value) : undefined)
              }
            />
            <Input
              label="Tags"
              value={draft.tags.join(', ')}
              onChange={(e) =>
                set(
                  'tags',
                  e.target.value
                    .split(',')
                    .map((s) => s.trim())
                    .filter(Boolean),
                )
              }
              hint="Comma separated, faith, grace, family"
            />
          </div>

          <Switch
            label="Published"
            checked={draft.published}
            onChange={(next) => set('published', next)}
          />
        </>
      )}
    />
  )
}

// ---------------------------------------------------------------------------
// Announcements
// ---------------------------------------------------------------------------

export function AnnouncementsEditor() {
  const { content, update } = useContent()

  return (
    <CollectionManager<Announcement>
      noun="announcements"
      singular="announcement"
      icon={Megaphone}
      items={content.announcements}
      onChange={(next) => update('announcements', () => next)}
      emptyHint="The notice board, anything the church needs everyone to know."
      sortBy={(a, b) => b.publishedAt.localeCompare(a.publishedAt)}
      searchFields={(item) => [item.title, item.body]}
      validate={(draft) => (!draft.title.trim() ? 'An announcement needs a title.' : null)}
      createItem={() => ({
        id: newId('ann'),
        title: '',
        body: '',
        category: 'general',
        featured: false,
        pinned: false,
        publishedAt: nowIso(),
        published: true,
        ...stamps(),
      })}
      renderRow={(item) => ({
        title: item.title,
        meta: item.body.slice(0, 120),
        trailing: formatDate(item.publishedAt.slice(0, 10), 'medium'),
        badges: [
          ...(item.pinned ? [{ label: 'Pinned', tone: 'brand' as const }] : []),
          ...(item.category === 'urgent' ? [{ label: 'Urgent', tone: 'danger' as const }] : []),
        ],
      })}
      renderForm={(draft, set) => (
        <>
          <Input
            label="Title"
            required
            value={draft.title}
            onChange={(e) => set('title', e.target.value)}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Combobox
              label="Category"
              value={draft.category}
              onChange={(e) => set('category', e.target.value as Announcement['category'])}
              hint="Pick one, or type your own."
              options={[
                { value: 'general', label: 'General' },
                { value: 'service', label: 'Service' },
                { value: 'department', label: 'Department' },
                { value: 'urgent', label: 'Urgent' },
                { value: 'celebration', label: 'Celebration' },
                { value: 'finance', label: 'Finance' },
              ]}
            />
            <Select
              label="Department"
              value={draft.departmentId ?? ''}
              onChange={(e) => set('departmentId', e.target.value || undefined)}
              placeholder="Whole church"
              options={content.departments.map((d) => ({ value: d.id, label: d.name }))}
            />
          </div>

          <Textarea
            label="Announcement"
            rows={7}
            maxLength={4000}
            value={draft.body}
            onChange={(e) => set('body', e.target.value)}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Published on"
              type="date"
              value={draft.publishedAt.slice(0, 10)}
              onChange={(e) => set('publishedAt', `${e.target.value}T00:00:00.000Z`)}
            />
            <Input
              label="Remove after"
              type="date"
              value={draft.expiresAt ?? ''}
              onChange={(e) => set('expiresAt', e.target.value || undefined)}
              hint="It disappears from the notice board on its own."
            />
          </div>

          <div className="space-y-3 rounded-lg border border-line bg-sunken/40 p-3.5">
            <Switch
              label="Pin to the top"
              checked={draft.pinned}
              onChange={(next) => set('pinned', next)}
            />
            <Switch
              label="Feature on the home page"
              checked={draft.featured}
              onChange={(next) => set('featured', next)}
            />
            <Switch
              label="Published"
              checked={draft.published}
              onChange={(next) => set('published', next)}
            />
          </div>
        </>
      )}
    />
  )
}

// ---------------------------------------------------------------------------
// Devotionals
// ---------------------------------------------------------------------------

export function DevotionalsEditor() {
  const { content, update } = useContent()

  return (
    <CollectionManager<Devotional>
      noun="devotionals"
      singular="devotional"
      icon={BookOpenText}
      items={content.devotionals}
      onChange={(next) => update('devotionals', () => next)}
      emptyHint="A verse, a short reflection and a reading plan for each day."
      sortBy={(a, b) => b.date.localeCompare(a.date)}
      searchFields={(item) => [item.title, item.verseRef, item.verseText, item.body]}
      validate={(draft) =>
        !draft.title.trim()
          ? 'A devotional needs a title.'
          : !draft.verseRef.trim()
            ? 'Which verse is this built on?'
            : null
      }
      createItem={() => ({
        id: newId('dev'),
        date: todayIso(),
        title: '',
        verseRef: '',
        verseText: '',
        body: '',
        readingPlan: [],
        published: true,
        ...stamps(),
      })}
      renderRow={(item) => ({
        title: item.title,
        meta: item.verseRef,
        trailing: formatDate(item.date, 'medium'),
      })}
      renderForm={(draft, set) => (
        <>
          <div className="grid gap-4 sm:grid-cols-[1fr_2fr]">
            <Input
              label="Date"
              type="date"
              value={draft.date}
              onChange={(e) => set('date', e.target.value)}
            />
            <Input
              label="Title"
              required
              value={draft.title}
              onChange={(e) => set('title', e.target.value)}
            />
          </div>

          <Input
            label="Verse reference"
            required
            value={draft.verseRef}
            onChange={(e) => set('verseRef', e.target.value)}
            placeholder="e.g. Psalm 23:1"
          />

          <Textarea
            label="Verse text"
            rows={3}
            maxLength={1000}
            value={draft.verseText}
            onChange={(e) => set('verseText', e.target.value)}
          />

          <Textarea
            label="Reflection"
            rows={8}
            maxLength={8000}
            value={draft.body}
            onChange={(e) => set('body', e.target.value)}
          />

          <Textarea
            label="Prayer"
            rows={3}
            maxLength={1000}
            value={draft.prayer ?? ''}
            onChange={(e) => set('prayer', e.target.value || undefined)}
          />

          <Input
            label="Reading plan"
            value={draft.readingPlan.join(', ')}
            onChange={(e) =>
              set(
                'readingPlan',
                e.target.value
                  .split(',')
                  .map((s) => s.trim())
                  .filter(Boolean),
              )
            }
            hint="Comma separated, e.g. Genesis 1-2, Matthew 1"
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Written by"
              value={draft.author ?? ''}
              onChange={(e) => set('author', e.target.value || undefined)}
            />
          </div>

          <Switch
            label="Published"
            checked={draft.published}
            onChange={(next) => set('published', next)}
          />
        </>
      )}
    />
  )
}

// ---------------------------------------------------------------------------
// Prayer points
// ---------------------------------------------------------------------------

export function PrayerPointsEditor() {
  const { content, update } = useContent()

  return (
    <CollectionManager<PrayerPoint>
      noun="prayer points"
      singular="prayer point"
      icon={HandHeart}
      items={content.prayerPoints}
      onChange={(next) => update('prayerPoints', () => next)}
      emptyHint="Points the whole church agrees with in prayer. Personal requests submitted by members stay on their own devices."
      sortBy={(a, b) => b.publishedAt.localeCompare(a.publishedAt)}
      searchFields={(item) => [item.title, item.body, item.scripture]}
      validate={(draft) => (!draft.title.trim() ? 'A prayer point needs a title.' : null)}
      createItem={() => ({
        id: newId('pry'),
        title: '',
        body: '',
        category: 'church',
        publishedAt: nowIso(),
        published: true,
        ...stamps(),
      })}
      renderRow={(item) => ({
        title: item.title,
        meta: item.body.slice(0, 120),
        trailing: formatDate(item.publishedAt.slice(0, 10), 'medium'),
      })}
      renderForm={(draft, set) => (
        <>
          <Input
            label="Title"
            required
            value={draft.title}
            onChange={(e) => set('title', e.target.value)}
          />

          <Combobox
            label="Category"
            value={draft.category}
            onChange={(e) => set('category', e.target.value as PrayerPoint['category'])}
            hint="Pick one, or type your own."
            options={[
              { value: 'church', label: 'The church' },
              { value: 'nation', label: 'The nation' },
              { value: 'missions', label: 'Missions' },
              { value: 'thanksgiving', label: 'Thanksgiving' },
              { value: 'healing', label: 'Healing' },
              { value: 'family', label: 'Families' },
            ]}
          />

          <Textarea
            label="Prayer point"
            rows={6}
            maxLength={3000}
            value={draft.body}
            onChange={(e) => set('body', e.target.value)}
          />

          <Input
            label="Scripture"
            value={draft.scripture ?? ''}
            onChange={(e) => set('scripture', e.target.value || undefined)}
            placeholder="e.g. 2 Chronicles 7:14"
          />

          <Switch
            label="Published"
            checked={draft.published}
            onChange={(next) => set('published', next)}
          />
        </>
      )}
    />
  )
}

// ---------------------------------------------------------------------------
// Downloads
// ---------------------------------------------------------------------------

export function DownloadsEditor() {
  const { content, update } = useContent()

  return (
    <CollectionManager<DownloadItem>
      noun="downloads"
      singular="download"
      icon={Download}
      items={content.downloads}
      onChange={(next) => update('downloads', () => next)}
      emptyHint="Bulletins, weekly outlines, the church constitution and study materials."
      sortBy={(a, b) => b.createdAt.localeCompare(a.createdAt)}
      searchFields={(item) => [item.title, item.description, item.category]}
      validate={(draft) =>
        !draft.title.trim() ? 'A download needs a title.' : !draft.url.trim() ? 'Where is the file?' : null
      }
      createItem={() => ({
        id: newId('dl'),
        title: '',
        category: 'bulletin',
        url: '',
        fileType: 'PDF',
        published: true,
        ...stamps(),
      })}
      formSize="md"
      renderRow={(item) => ({
        title: item.title,
        meta: `${item.fileType}${item.sizeLabel ? ` · ${item.sizeLabel}` : ''} · ${item.url}`,
        trailing: formatDate(item.createdAt.slice(0, 10), 'medium'),
      })}
      renderForm={(draft, set) => (
        <>
          <Input
            label="Title"
            required
            value={draft.title}
            onChange={(e) => set('title', e.target.value)}
          />

          <Textarea
            label="Description"
            rows={2}
            maxLength={500}
            value={draft.description ?? ''}
            onChange={(e) => set('description', e.target.value || undefined)}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Combobox
              label="Category"
              value={draft.category}
              onChange={(e) => set('category', e.target.value as DownloadItem['category'])}
              hint="Pick one, or type your own."
              options={[
                { value: 'bulletin', label: 'Bulletin' },
                { value: 'outline', label: 'Weekly outline' },
                { value: 'constitution', label: 'Constitution' },
                { value: 'study', label: 'Study material' },
                { value: 'form', label: 'Form' },
                { value: 'report', label: 'Report' },
                { value: 'other', label: 'Other' },
              ]}
            />
            <Input
              label="File type"
              value={draft.fileType}
              onChange={(e) => set('fileType', e.target.value)}
              placeholder="PDF"
            />
          </div>

          <FileField
            label="File"
            required
            folder="downloads"
            accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt"
            value={draft.url}
            onChange={(next) => set('url', next)}
            hint="Browse to upload it to the church repository, or paste a link to a file hosted elsewhere."
          />

          <Input
            label="File size"
            value={draft.sizeLabel ?? ''}
            onChange={(e) => set('sizeLabel', e.target.value || undefined)}
            placeholder="e.g. 1.2 MB"
            hint="Shown so people on mobile data know what they are downloading."
          />

          <Switch
            label="Published"
            checked={draft.published}
            onChange={(next) => set('published', next)}
          />
        </>
      )}
    />
  )
}

// ---------------------------------------------------------------------------
// Gallery — albums and videos, both inside one JSON file
// ---------------------------------------------------------------------------

export function GalleryEditor() {
  const { content, update } = useContent()
  const gallery = content.gallery

  return (
    <div className="space-y-8">
      <section>
        <h3 className="mb-3 font-display text-base font-semibold text-ink">Photo albums</h3>
        <CollectionManager<GalleryAlbum>
          noun="albums"
          singular="album"
          icon={Images}
          items={gallery.albums}
          onChange={(next) => update('gallery', (current) => ({ ...current, albums: next }))}
          emptyHint="Group pictures by programme, harvest, convention, baptism, anniversary."
          sortBy={(a, b) => b.date.localeCompare(a.date)}
          searchFields={(album) => [album.title, album.description]}
          validate={(draft) => (!draft.title.trim() ? 'An album needs a title.' : null)}
          createItem={() => ({
            id: newId('alb'),
            title: '',
            slug: '',
            date: todayIso(),
            photos: [],
            published: true,
            ...stamps(),
          })}
          renderRow={(album) => ({
            title: album.title,
            meta: `${album.photos.length} photo${album.photos.length === 1 ? '' : 's'}`,
            trailing: formatDate(album.date, 'medium'),
          })}
          renderForm={(draft, set) => (
            <>
              <Input
                label="Album title"
                required
                value={draft.title}
                onChange={(e) => {
                  set('title', e.target.value)
                  if (!draft.slug) set('slug', slugify(e.target.value))
                }}
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Date"
                  type="date"
                  value={draft.date}
                  onChange={(e) => set('date', e.target.value)}
                />
                <FileField
                  label="Cover image"
                  folder="gallery"
                  accept="image/*"
                  value={draft.cover ?? ''}
                  onChange={(next) => set('cover', next || undefined)}
                />
              </div>

              <Textarea
                label="Description"
                rows={3}
                maxLength={1000}
                value={draft.description ?? ''}
                onChange={(e) => set('description', e.target.value || undefined)}
              />

              <MultiFileField
                label="Add photos"
                hint="Choose several at once. Each one is committed to the church repository, then listed below where you can caption and reorder them. Remember to save, then publish."
                folder="gallery"
                accept="image/*"
                onAdd={(paths) =>
                  set('photos', [
                    ...draft.photos,
                    ...paths.map((url) => ({ id: newId('img'), url })),
                  ])
                }
              />

              <ListEditor<GalleryPhoto>
                label="Photos in this album"
                items={draft.photos}
                onChange={(next) => set('photos', next)}
                createItem={() => ({ id: newId('img'), url: '' })}
                addLabel="Add photo"
                emptyLabel="No photos in this album yet."
                renderRow={(photo, updatePhoto) => (
                  <div className="grid gap-1.5 sm:grid-cols-2">
                    <FileField
                      label="Photo"
                      folder="gallery"
                      accept="image/*"
                      value={photo.url}
                      onChange={(next) => updatePhoto({ url: next })}
                    />
                    <RowInput
                      label="Caption"
                      value={photo.caption ?? ''}
                      onChange={(e) => updatePhoto({ caption: e.target.value })}
                    />
                  </div>
                )}
              />

              <Switch
                label="Published"
                checked={draft.published}
                onChange={(next) => set('published', next)}
              />
            </>
          )}
        />
      </section>

      <section>
        <h3 className="mb-3 font-display text-base font-semibold text-ink">Videos</h3>
        <CollectionManager<GalleryVideo & { published?: boolean }>
          noun="videos"
          singular="video"
          icon={Video}
          publishable={false}
          items={gallery.videos}
          onChange={(next) => update('gallery', (current) => ({ ...current, videos: next }))}
          emptyHint="Link to YouTube or Facebook, hosting video costs nothing when someone else does it."
          searchFields={(video) => [video.title, video.description]}
          validate={(draft) =>
            !draft.title.trim() ? 'A video needs a title.' : !draft.url.trim() ? 'Paste the video link.' : null
          }
          createItem={() => ({ id: newId('vid'), title: '', url: '', date: todayIso() })}
          formSize="md"
          renderRow={(video) => ({
            title: video.title,
            meta: video.url,
            trailing: video.date ? formatDate(video.date, 'medium') : undefined,
          })}
          renderForm={(draft, set) => (
            <>
              <Input
                label="Title"
                required
                value={draft.title}
                onChange={(e) => set('title', e.target.value)}
              />
              <Input
                label="Video link"
                type="url"
                required
                value={draft.url}
                onChange={(e) => set('url', e.target.value)}
                placeholder="https://youtube.com/watch?v=…"
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Date"
                  type="date"
                  value={draft.date ?? ''}
                  onChange={(e) => set('date', e.target.value || undefined)}
                />
                <FileField
                  label="Thumbnail"
                  folder="gallery"
                  accept="image/*"
                  value={draft.thumbnail ?? ''}
                  onChange={(next) => set('thumbnail', next || undefined)}
                />
              </div>
              <Textarea
                label="Description"
                rows={3}
                maxLength={1000}
                value={draft.description ?? ''}
                onChange={(e) => set('description', e.target.value || undefined)}
              />
            </>
          )}
        />
      </section>
    </div>
  )
}

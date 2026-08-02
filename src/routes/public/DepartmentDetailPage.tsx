import { useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { Clock, MapPin, Megaphone, UserRound, Users } from 'lucide-react'
import { AnnouncementCard, EventCard } from '@/components/site/cards'
import { RichText } from '@/components/site/RichText'
import {
  BackLink,
  Badge,
  ButtonLink,
  Card,
  DetailRow,
  EmptyState,
  Rule,
  SectionHeading,
} from '@/components/ui'
import { useContent } from '@/context/ContentContext'
import { useDocumentTitle } from '@/hooks'
import { publishedAnnouncements, publishedDepartments, publishedEvents } from '@/lib/content'
import { upcomingOccurrences } from '@/lib/schedule'
import { asset, formatTime } from '@/lib/utils'

export default function DepartmentDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const { content } = useContent()

  const department = useMemo(
    () => publishedDepartments(content.departments).find((d) => d.slug === slug),
    [content.departments, slug],
  )

  useDocumentTitle(department?.name ?? 'Department', department?.summary)

  const events = useMemo(() => {
    if (!department) return []
    const owned = publishedEvents(content.events).filter((e) => e.departmentId === department.id)
    return upcomingOccurrences(owned, 6, 365)
  }, [content.events, department])

  const notices = useMemo(() => {
    if (!department) return []
    return publishedAnnouncements(content.announcements)
      .filter((a) => a.departmentId === department.id)
      .slice(0, 4)
  }, [content.announcements, department])

  if (!department) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20">
        <EmptyState
          icon={Users}
          title="Department not found"
          description="This department may have been renamed or removed."
          action={
            <ButtonLink to="/departments" variant="secondary">
              Back to departments
            </ButtonLink>
          }
        />
      </div>
    )
  }

  const tone =
    department.accent === 'crimson'
      ? 'accent'
      : department.accent === 'gold'
        ? 'gold'
        : department.accent === 'azure'
          ? 'info'
          : 'brand'

  return (
    <article className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
      <BackLink to="/departments">All departments</BackLink>

      <header className="mt-6 grid gap-6 sm:grid-cols-[1fr_auto] sm:items-start">
        <div>
          {department.shortName && <Badge tone={tone}>{department.shortName}</Badge>}
          <h1 className="mt-3 text-balance font-display text-title font-semibold text-ink">
            {department.name}
          </h1>
          {department.summary && (
            <p className="mt-3 text-pretty text-[1.0625rem] leading-relaxed text-ink-soft">
              {department.summary}
            </p>
          )}
        </div>

        {department.image && (
          <img
            src={asset(department.image)}
            alt=""
            loading="lazy"
            className="arch-sm h-48 w-full border border-line object-cover sm:w-40"
          />
        )}
      </header>

      <Card className="mt-7 p-5">
        <dl>
          {department.meetingDay && (
            <DetailRow label="Meets" icon={Clock}>
              {department.meetingDay}
              {department.meetingTime && ` · ${formatTime(department.meetingTime)}`}
            </DetailRow>
          )}
          {department.meetingVenue && (
            <DetailRow label="Venue" icon={MapPin}>
              {department.meetingVenue}
            </DetailRow>
          )}
          {department.leaderName && (
            <DetailRow label="Leader" icon={UserRound}>
              {department.leaderName}
            </DetailRow>
          )}
          {department.assistantLeaderName && (
            <DetailRow label="Assistant" icon={UserRound}>
              {department.assistantLeaderName}
            </DetailRow>
          )}
        </dl>
        <p className="mt-4 rounded-lg bg-sunken/70 px-3 py-2.5 text-[0.75rem] leading-relaxed text-ink-faint">
          Member names and contact details are kept in the church’s private records, not published
          here. Speak to the department leader after service to join.
        </p>
      </Card>

      {department.description && (
        <>
          <Rule className="my-8" />
          <RichText>{department.description}</RichText>
        </>
      )}

      {events.length > 0 && (
        <section className="mt-12">
          <SectionHeading eyebrow="Diary" title={`${department.name} events`} />
          <div className="mt-5 space-y-4">
            {events.map((occurrence) => (
              <EventCard key={occurrence.key} occurrence={occurrence} />
            ))}
          </div>
        </section>
      )}

      {notices.length > 0 && (
        <section className="mt-12">
          <SectionHeading
            eyebrow="Notices"
            title="Department announcements"
            action={<Megaphone className="size-5 text-ornament" aria-hidden />}
          />
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {notices.map((notice) => (
              <AnnouncementCard key={notice.id} announcement={notice} />
            ))}
          </div>
        </section>
      )}
    </article>
  )
}

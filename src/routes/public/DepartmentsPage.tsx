import { useMemo } from 'react'
import { Clock, MapPin, Users } from 'lucide-react'
import { ArchCard, Badge, EmptyState, PageHeader } from '@/components/ui'
import { useContent } from '@/context/ContentContext'
import { useDocumentTitle, useRevealAll } from '@/hooks'
import { publishedDepartments } from '@/lib/content'
import { asset, formatTime, truncate } from '@/lib/utils'

export default function DepartmentsPage() {
  const { content } = useContent()
  useDocumentTitle(
    'Departments',
    'Choir, ushers, media, evangelism, WMU, MMU, Royal Ambassadors and more.',
  )

  const departments = useMemo(
    () => publishedDepartments(content.departments),
    [content.departments],
  )
  const revealRef = useRevealAll<HTMLDivElement>()

  return (
    <>
      <PageHeader
        eyebrow="Serve together"
        title="Departments"
        description="Every member has a gift and a place to use it. These are the arms through which the Chapel of Grace serves God and our community."
      />

      <div ref={revealRef} className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12">
        {departments.length > 0 ? (
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {departments.map((department) => (
              <li key={department.id} className="reveal">
                <ArchCard
                  to={`/departments/${department.slug}`}
                  image={department.image ? asset(department.image) : undefined}
                  imageAlt=""
                  fallbackIcon={Users}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="font-display text-[1.0625rem] font-semibold leading-snug text-ink">
                      {department.name}
                    </h2>
                    {department.shortName && (
                      <Badge
                        tone={
                          department.accent === 'crimson'
                            ? 'accent'
                            : department.accent === 'gold'
                              ? 'gold'
                              : department.accent === 'azure'
                                ? 'info'
                                : 'brand'
                        }
                      >
                        {department.shortName}
                      </Badge>
                    )}
                  </div>

                  {department.summary && (
                    <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-ink-soft">
                      {truncate(department.summary, 96)}
                    </p>
                  )}

                  <div className="mt-3 space-y-1 border-t border-line pt-2.5">
                    {department.meetingDay && (
                      <p className="flex items-center gap-1.5 text-[0.75rem] text-ink-faint">
                        <Clock className="size-3.5 text-ornament" aria-hidden />
                        {department.meetingDay}
                        {department.meetingTime && ` · ${formatTime(department.meetingTime)}`}
                      </p>
                    )}
                    {department.meetingVenue && (
                      <p className="flex items-center gap-1.5 text-[0.75rem] text-ink-faint">
                        <MapPin className="size-3.5 text-ornament" aria-hidden />
                        {department.meetingVenue}
                      </p>
                    )}
                  </div>
                </ArchCard>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            icon={Users}
            title="Departments are being set up"
            description="Choir, ushers, media, evangelism, children, youth, WMU, MMU, Royal Ambassadors and Lydia will be listed here."
          />
        )}
      </div>
    </>
  )
}

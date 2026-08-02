import { BookMarked, Compass, Eye, Quote, Users } from 'lucide-react'
import { RichText } from '@/components/site/RichText'
import { Card, PageHeader, Rule, Seal, SectionHeading } from '@/components/ui'
import { useChurch } from '@/context/ContentContext'
import { useDocumentTitle, useRevealAll } from '@/hooks'

export default function AboutPage() {
  const church = useChurch()
  useDocumentTitle('About Us', church.about)
  const revealRef = useRevealAll<HTMLDivElement>()

  return (
    <>
      <PageHeader
        eyebrow="Who we are"
        title="About the Chapel of Grace"
        description={church.tagline}
      />

      <div ref={revealRef} className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-12">
        {church.about && (
          <section className="reveal">
            <RichText className="text-[1.0625rem]">{church.about}</RichText>
          </section>
        )}

        {(church.mission || church.vision) && (
          <>
            <Rule className="my-12" />
            <div className="grid gap-5 sm:grid-cols-2">
              {church.mission && (
                <Card className="reveal p-6">
                  <span className="grid size-11 place-items-center rounded-xl bg-brand/10 text-brand">
                    <Compass className="size-5" aria-hidden />
                  </span>
                  <h2 className="mt-4 font-display text-xl font-semibold text-ink">Our mission</h2>
                  <p className="mt-2 text-pretty leading-relaxed text-ink-soft">{church.mission}</p>
                </Card>
              )}
              {church.vision && (
                <Card className="reveal p-6">
                  <span className="grid size-11 place-items-center rounded-xl bg-ornament/12 text-ornament">
                    <Eye className="size-5" aria-hidden />
                  </span>
                  <h2 className="mt-4 font-display text-xl font-semibold text-ink">Our vision</h2>
                  <p className="mt-2 text-pretty leading-relaxed text-ink-soft">{church.vision}</p>
                </Card>
              )}
            </div>
          </>
        )}

        {church.pastorName && (
          <>
            <Rule className="my-12" />
            <section className="reveal">
              <SectionHeading eyebrow="Leadership" title="A word from our pastor" />
              <Card className="mt-6 overflow-hidden">
                <div className="grid gap-6 p-6 sm:grid-cols-[auto_1fr] sm:p-8">
                  <div className="mx-auto sm:mx-0">
                    <div className="seal size-24">
                      <Users className="size-10" aria-hidden />
                    </div>
                  </div>
                  <div className="min-w-0">
                    <Quote className="size-6 text-ornament/50" aria-hidden />
                    {church.pastorMessage ? (
                      <p className="mt-2 whitespace-pre-line text-pretty font-display text-[1.0625rem] italic leading-relaxed text-ink">
                        {church.pastorMessage}
                      </p>
                    ) : (
                      <p className="mt-2 text-ink-faint">
                        A message from the pastor will appear here.
                      </p>
                    )}
                    <p className="mt-4 flex items-center gap-2.5">
                      <span className="h-px w-6 bg-ornament" aria-hidden />
                      <span>
                        <span className="block font-display font-semibold text-ink">
                          {church.pastorName}
                        </span>
                        <span className="block text-[0.8125rem] text-ink-faint">
                          {church.pastorTitle}
                        </span>
                      </span>
                    </p>
                  </div>
                </div>
              </Card>
            </section>
          </>
        )}

        {church.history && (
          <>
            <Rule className="my-12" />
            <section className="reveal">
              <SectionHeading
                eyebrow="Our story"
                title="History"
                description={church.established ? `Established ${church.established}` : undefined}
              />
              <RichText className="mt-6">{church.history}</RichText>
            </section>
          </>
        )}

        {church.beliefs.length > 0 && (
          <>
            <Rule className="my-12" />
            <section className="reveal">
              <SectionHeading
                eyebrow="What we hold"
                title="Our beliefs"
                description="As a Baptist congregation in voluntary cooperation with the Nigerian Baptist Convention."
              />
              <ul className="mt-6 space-y-3">
                {church.beliefs.map((belief, index) => (
                  <li key={index} className="reveal flex gap-3.5 rounded-xl border border-line bg-surface p-4">
                    <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-ornament/12 text-[0.8125rem] font-bold text-ornament">
                      {index + 1}
                    </span>
                    <p className="text-pretty text-[0.9375rem] leading-relaxed text-ink-soft">
                      {belief}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          </>
        )}

        <Rule className="my-12" />

        <section className="reveal text-center">
          <Seal className="mx-auto size-20" decorative />
          <h2 className="mt-5 flex items-center justify-center gap-2 font-display text-xl font-semibold text-ink">
            <BookMarked className="size-5 text-ornament" aria-hidden />
            {church.motto}
          </h2>
          <p className="mx-auto mt-2 max-w-md text-pretty text-[0.9375rem] leading-relaxed text-ink-soft">
            You are welcome at {church.shortName}. Come as you are, there is a place for you here.
          </p>
        </section>
      </div>
    </>
  )
}

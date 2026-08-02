import { Database, EyeOff, Github, Lock, Server, Smartphone } from 'lucide-react'
import { Card, PageHeader, Rule, SectionHeading } from '@/components/ui'
import { useChurch } from '@/context/ContentContext'
import { useDocumentTitle } from '@/hooks'

/**
 * Written in plain language on purpose.
 *
 * A privacy page that nobody can understand protects the church, not the
 * member. This one describes exactly what the app does and does not do,
 * because the architecture is genuinely simple enough to explain.
 */
export default function PrivacyPage() {
  const church = useChurch()
  useDocumentTitle('Privacy', 'What this app stores, and what it does not.')

  return (
    <>
      <PageHeader
        eyebrow="Plain language"
        title="Privacy"
        description="This app was built so that your personal information is never published. Here is exactly how it works."
      />

      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-12">
        <div className="grid gap-4 sm:grid-cols-2">
          <Point
            icon={Server}
            title="There is no server"
            body="This app is a set of files served from GitHub. Nothing you type is transmitted to us, because there is nowhere for it to be transmitted to."
          />
          <Point
            icon={EyeOff}
            title="No tracking"
            body="No analytics, no advertising, no cookies for tracking, no third-party scripts. Nobody is counting your visits."
          />
          <Point
            icon={Smartphone}
            title="Your data stays on your phone"
            body="Prayer requests you write and your Bible reading progress are saved in this browser only. Clearing your browser data deletes them."
          />
          <Point
            icon={Lock}
            title="Church records are encrypted"
            body="Member records and attendance registers are kept on the church administrator's own device, encrypted with AES-256. They are never uploaded here."
          />
        </div>

        <Rule className="my-12" />

        <SectionHeading eyebrow="The detail" title="What is published, and what is not" />

        <div className="prose-chapel mt-6">
          <h3>Published publicly</h3>
          <p>
            The following is stored in the church’s public GitHub repository, and anyone on the
            internet can read it. That is intentional, it is the church’s public notice board:
          </p>
          <ul>
            <li>Service times, address, church phone number and email</li>
            <li>Church programmes and orders of service</li>
            <li>Events, sermons, sermon notes and announcements</li>
            <li>Photos and videos the church chooses to publish</li>
            <li>The church’s own bank account details for offerings</li>
            <li>Department information and the names of department leaders</li>
          </ul>

          <h3>Never published</h3>
          <p>
            None of the following is committed to the repository or uploaded anywhere. It lives only
            on the church administrator’s device, inside an encrypted store, and in encrypted backup
            files the church keeps itself:
          </p>
          <ul>
            <li>Member names, phone numbers, addresses and email addresses</li>
            <li>Dates of birth, wedding anniversaries and family groupings</li>
            <li>Baptism records and membership status</li>
            <li>Attendance registers naming individuals</li>
            <li>Any prayer request you write in this app</li>
          </ul>

          <h3>Prayer requests</h3>
          <p>
            When you write a prayer request it is saved in this browser. It is not sent anywhere
            until <strong>you</strong> tap “Send on WhatsApp” or “Send by email”, at which point your
            own phone sends it, exactly as if you had typed the message yourself. If you never tap
            send, nobody but you ever sees it.
          </p>

          <h3>Photographs</h3>
          <p>
            Photographs of church gatherings are published in the gallery. If you appear in a photo
            and would prefer it removed, please contact the church office and it will be taken down.
          </p>

          <h3>Children</h3>
          <p>
            No information about children is published in this app. Children’s records, where the
            church keeps them, remain in the encrypted private store along with all other member
            records.
          </p>

          <h3>Your rights</h3>
          <p>
            You may ask the church what it holds about you, ask for it to be corrected, or ask for it
            to be deleted. Because the records sit on the church’s own device rather than with any
            company, the church can act on that request directly.
          </p>

          <h3>Changes</h3>
          <p>
            If how the app handles information ever changes, this page changes with it. The full
            history of every change is public in the church’s GitHub repository.
          </p>
        </div>

        <Card className="mt-10 flex items-start gap-3 p-5">
          <Github className="mt-0.5 size-5 shrink-0 text-ink-faint" aria-hidden />
          <p className="text-[0.875rem] leading-relaxed text-ink-soft">
            <strong className="text-ink">Open by design.</strong> Everything published by this app is
            visible in the church’s public repository, including its full history. There is no hidden
            database and no hidden collection.
          </p>
        </Card>

        <Card className="mt-4 flex items-start gap-3 p-5">
          <Database className="mt-0.5 size-5 shrink-0 text-ink-faint" aria-hidden />
          <p className="text-[0.875rem] leading-relaxed text-ink-soft">
            Questions about your information? Contact {church.name}
            {church.email ? (
              <>
                {' '}
                at{' '}
                <a
                  href={`mailto:${church.email}`}
                  className="font-medium text-info underline underline-offset-2"
                >
                  {church.email}
                </a>
              </>
            ) : null}
            .
          </p>
        </Card>
      </div>
    </>
  )
}

function Point({
  icon: Icon,
  title,
  body,
}: {
  icon: typeof Lock
  title: string
  body: string
}) {
  return (
    <Card className="p-5">
      <span className="grid size-10 place-items-center rounded-xl bg-brand/10 text-brand">
        <Icon className="size-5" aria-hidden />
      </span>
      <h2 className="mt-3 font-display text-[1.0625rem] font-semibold text-ink">{title}</h2>
      <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-ink-soft">{body}</p>
    </Card>
  )
}

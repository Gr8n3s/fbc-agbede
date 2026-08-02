import { useMemo, useState } from 'react'
import {
  CheckCircle2,
  HandHeart,
  Lock,
  Mail,
  MessageCircle,
  Send,
  Sparkles,
  Trash2,
} from 'lucide-react'
import {
  Badge,
  Button,
  Card,
  Checkbox,
  EmptyState,
  IconButton,
  Input,
  PageHeader,
  Rule,
  SectionHeading,
  Select,
  Textarea,
  useConfirm,
} from '@/components/ui'
import { useChurch, useContent } from '@/context/ContentContext'
import { useToast } from '@/context/ToastContext'
import { useDocumentTitle, useLocalState } from '@/hooks'
import { publishedPrayerPoints } from '@/lib/content'
import type { PrayerRequest } from '@/lib/types'
import { formatDate, newId, nowIso, sanitiseText, toWhatsAppNumber } from '@/lib/utils'

const CATEGORIES = [
  { value: 'personal', label: 'Personal' },
  { value: 'family', label: 'Family' },
  { value: 'healing', label: 'Healing' },
  { value: 'thanksgiving', label: 'Thanksgiving' },
  { value: 'church', label: 'The church' },
  { value: 'nation', label: 'The nation' },
  { value: 'missions', label: 'Missions' },
]

export default function PrayerPage() {
  const { content } = useContent()
  const church = useChurch()
  const toast = useToast()
  const { confirm, confirmElement } = useConfirm()
  useDocumentTitle('Prayer', 'Prayer points from the church, and a place to write your own requests.')

  const points = useMemo(() => publishedPrayerPoints(content.prayerPoints), [content.prayerPoints])

  /**
   * Requests live in this browser and nowhere else.
   *
   * There is no server to receive them, and putting them in the public
   * repository would publish people's private burdens to the internet. So the
   * app keeps them on the device and hands the member a ready-written message
   * they choose to send to the pastor — the sending is theirs, not ours.
   */
  const [requests, setRequests] = useLocalState<PrayerRequest[]>('prayer-requests', [])

  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [category, setCategory] = useState('personal')
  const [anonymous, setAnonymous] = useState(false)
  const [name, setName] = useState('')
  const [errors, setErrors] = useState<{ subject?: string; body?: string }>({})

  const submit = (event: React.FormEvent) => {
    event.preventDefault()

    const nextErrors: typeof errors = {}
    if (!subject.trim()) nextErrors.subject = 'Give your request a short title.'
    if (body.trim().length < 5) nextErrors.body = 'Please write a little more.'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    const request: PrayerRequest = {
      id: newId('pr'),
      subject: sanitiseText(subject, 120),
      body: sanitiseText(body, 2000),
      category: category as PrayerRequest['category'],
      anonymous,
      sharedWithPastor: false,
      requesterName: anonymous ? undefined : sanitiseText(name, 80) || undefined,
      answered: false,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    }

    setRequests((current) => [request, ...current])
    setSubject('')
    setBody('')
    setName('')
    setErrors({})
    toast.success('Saved on this device', 'Send it to the pastor below whenever you are ready.')
  }

  const messageFor = (request: PrayerRequest) =>
    [
      'Prayer request — FBC Agbede',
      '',
      `Subject: ${request.subject}`,
      `Category: ${request.category}`,
      request.anonymous ? 'From: Anonymous' : request.requesterName ? `From: ${request.requesterName}` : '',
      '',
      request.body,
    ]
      .filter(Boolean)
      .join('\n')

  const sendWhatsApp = (request: PrayerRequest) => {
    const number = toWhatsAppNumber(church.whatsapp || church.phone)
    if (!number) {
      toast.warning('No church WhatsApp number', 'Use email, or speak to the pastor after service.')
      return
    }
    window.open(
      `https://wa.me/${number}?text=${encodeURIComponent(messageFor(request))}`,
      '_blank',
      'noopener,noreferrer',
    )
    markShared(request.id)
  }

  const sendEmail = (request: PrayerRequest) => {
    if (!church.email) {
      toast.warning('No church email address set')
      return
    }
    window.location.href = `mailto:${church.email}?subject=${encodeURIComponent(
      `Prayer request: ${request.subject}`,
    )}&body=${encodeURIComponent(messageFor(request))}`
    markShared(request.id)
  }

  const markShared = (id: string) =>
    setRequests((current) =>
      current.map((r) => (r.id === id ? { ...r, sharedWithPastor: true, updatedAt: nowIso() } : r)),
    )

  const toggleAnswered = (id: string) =>
    setRequests((current) =>
      current.map((r) => (r.id === id ? { ...r, answered: !r.answered, updatedAt: nowIso() } : r)),
    )

  const remove = async (request: PrayerRequest) => {
    const ok = await confirm({
      title: 'Delete this request?',
      message: `“${request.subject}” will be removed from this device. This cannot be undone.`,
      confirmLabel: 'Delete',
    })
    if (ok) setRequests((current) => current.filter((r) => r.id !== request.id))
  }

  return (
    <>
      {confirmElement}
      <PageHeader
        eyebrow="Stand together"
        title="Prayer"
        description="“Confess your faults one to another, and pray one for another, that ye may be healed. The effectual fervent prayer of a righteous man availeth much.” — James 5:16"
      />

      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-12">
        {/* --- Church prayer points --- */}
        <section aria-labelledby="points-heading">
          <SectionHeading
            eyebrow="Agree with us"
            title="Church prayer points"
            description="What the whole church is praying about this season."
            as="h2"
          />

          {points.length > 0 ? (
            <ul className="mt-6 grid gap-4 sm:grid-cols-2">
              {points.map((point) => (
                <li key={point.id}>
                  <Card className={point.answered ? 'border-success/35 p-5' : 'p-5'}>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={point.answered ? 'success' : 'brand'}>
                        {point.answered ? 'answered' : point.category}
                      </Badge>
                      <span className="ml-auto text-[0.75rem] text-ink-faint">
                        {formatDate(point.publishedAt.slice(0, 10), 'medium')}
                      </span>
                    </div>
                    <h3 className="mt-2 font-display text-[1.0625rem] font-semibold text-ink">
                      {point.title}
                    </h3>
                    <p className="mt-1.5 whitespace-pre-line text-[0.875rem] leading-relaxed text-ink-soft">
                      {point.body}
                    </p>
                    {point.scripture && (
                      <p className="mt-2.5 text-[0.8125rem] font-medium text-info">{point.scripture}</p>
                    )}
                    {point.answered && point.answeredNote && (
                      <p className="mt-3 flex gap-2 rounded-lg bg-success/8 p-2.5 text-[0.8125rem] text-ink-soft">
                        <Sparkles className="mt-0.5 size-3.5 shrink-0 text-success" aria-hidden />
                        {point.answeredNote}
                      </p>
                    )}
                  </Card>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              className="mt-6"
              icon={HandHeart}
              title="No prayer points published yet"
              description="Prayer points shared by the pastor will appear here."
            />
          )}
        </section>

        <Rule className="my-12" />

        {/* --- Submit --- */}
        <section aria-labelledby="request-heading">
          <SectionHeading
            eyebrow="Your request"
            title="Write a prayer request"
            description="Requests are saved on this phone only — nothing is uploaded anywhere. When you are ready, send it to the pastor with one tap."
            as="h2"
          />

          <Card className="mt-6 border-brand/25 p-3">
            <p className="flex items-start gap-2.5 text-[0.8125rem] leading-relaxed text-ink-soft">
              <Lock className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />
              <span>
                <strong className="text-ink">Private by design.</strong> This app has no server. What
                you write below stays in this browser until you choose to send it.
              </span>
            </p>
          </Card>

          <form onSubmit={submit} className="mt-5 space-y-4" noValidate>
            <Input
              label="Title"
              required
              value={subject}
              maxLength={120}
              error={errors.subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Journey mercies for my family"
            />

            <Textarea
              label="Your request"
              required
              rows={5}
              value={body}
              maxLength={2000}
              showCount
              error={errors.body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write freely — nobody sees this until you send it."
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <Select
                label="Category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                options={CATEGORIES}
              />
              {!anonymous && (
                <Input
                  label="Your name"
                  hint="Optional — helps the pastor know who to follow up."
                  value={name}
                  maxLength={80}
                  onChange={(e) => setName(e.target.value)}
                />
              )}
            </div>

            <Checkbox
              label="Send anonymously"
              description="Your name will not be included in the message."
              checked={anonymous}
              onChange={(e) => setAnonymous(e.target.checked)}
            />

            <Button type="submit" icon={Send}>
              Save request
            </Button>
          </form>
        </section>

        {/* --- My requests --- */}
        {requests.length > 0 && (
          <section className="mt-12" aria-labelledby="mine-heading">
            <Rule className="mb-12" />
            <SectionHeading
              eyebrow="On this device"
              title="My prayer requests"
              description="Only visible on this phone. Clearing your browser data will remove them."
              as="h2"
            />

            <ul className="mt-6 space-y-3">
              {requests.map((request) => (
                <li key={request.id}>
                  <Card className={request.answered ? 'border-success/35 p-4' : 'p-4'}>
                    <div className="flex items-start gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Badge tone={request.answered ? 'success' : 'neutral'}>
                            {request.category}
                          </Badge>
                          {request.sharedWithPastor && <Badge tone="info">sent to pastor</Badge>}
                          {request.anonymous && <Badge tone="neutral">anonymous</Badge>}
                        </div>
                        <h3 className="mt-1.5 font-display text-[1rem] font-semibold text-ink">
                          {request.subject}
                        </h3>
                        <p className="mt-1 whitespace-pre-line text-[0.875rem] leading-relaxed text-ink-soft">
                          {request.body}
                        </p>
                        <p className="mt-1.5 text-[0.75rem] text-ink-faint">
                          Written {formatDate(request.createdAt.slice(0, 10), 'medium')}
                        </p>
                      </div>
                      <IconButton
                        icon={Trash2}
                        tone="danger"
                        size="sm"
                        label={`Delete ${request.subject}`}
                        onClick={() => void remove(request)}
                      />
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2 border-t border-line pt-3">
                      <Button
                        size="sm"
                        variant="secondary"
                        icon={MessageCircle}
                        onClick={() => sendWhatsApp(request)}
                      >
                        Send on WhatsApp
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        icon={Mail}
                        onClick={() => sendEmail(request)}
                      >
                        Send by email
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        icon={CheckCircle2}
                        onClick={() => toggleAnswered(request.id)}
                      >
                        {request.answered ? 'Mark unanswered' : 'Mark answered'}
                      </Button>
                    </div>
                  </Card>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </>
  )
}

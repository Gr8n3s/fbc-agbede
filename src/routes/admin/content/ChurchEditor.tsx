import { useEffect, useState } from 'react'
import { Building2, Clock, Landmark, Save, Share2, Sparkles } from 'lucide-react'
import { Button, Input, ListEditor, Panel, RowInput, Textarea } from '@/components/ui'
import { useContent } from '@/context/ContentContext'
import { useToast } from '@/context/ToastContext'
import type { BankAccount, ChurchProfile, ServiceTime, SocialLink } from '@/lib/types'
import { newId, nowIso, sanitiseText } from '@/lib/utils'

/**
 * The church profile.
 *
 * One record rather than a collection, and the one page in the app that most
 * shapes how the church appears to a stranger. Edits are held locally until
 * saved, then published with everything else — so a half-finished "about us"
 * is never briefly live.
 */

const DAY_OPTIONS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Daily',
].map((day) => ({ value: day, label: day }))

const PLATFORM_OPTIONS: { value: SocialLink['platform']; label: string }[] = [
  { value: 'facebook', label: 'Facebook' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'x', label: 'X' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'website', label: 'Website' },
]

export function ChurchEditor() {
  const { content, update } = useContent()
  const toast = useToast()

  const [draft, setDraft] = useState<ChurchProfile>(content.church)
  const [busy, setBusy] = useState(false)

  // Adopt a newly-fetched profile only while the form is untouched, so a
  // background refresh cannot overwrite what is being typed.
  const [dirty, setDirty] = useState(false)
  useEffect(() => {
    if (!dirty) setDraft(content.church)
  }, [content.church, dirty])

  const set = <K extends keyof ChurchProfile>(key: K, value: ChurchProfile[K]) => {
    setDirty(true)
    setDraft((current) => ({ ...current, [key]: value }))
  }

  const save = async () => {
    setBusy(true)
    try {
      await update('church', () => ({
        ...draft,
        name: sanitiseText(draft.name, 120),
        motto: sanitiseText(draft.motto, 80),
        tagline: sanitiseText(draft.tagline, 160),
        updatedAt: nowIso(),
      }))
      setDirty(false)
      toast.success('Church details saved', 'Publish from the Content page to update the website.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-5">
      <Panel title="Identity" icon={Building2}>
        <div className="space-y-4">
          <Input
            label="Church name"
            required
            value={draft.name}
            onChange={(e) => set('name', e.target.value)}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Short name"
              value={draft.shortName}
              onChange={(e) => set('shortName', e.target.value)}
              placeholder="FBC Agbede"
            />
            <Input
              label="Motto"
              value={draft.motto}
              onChange={(e) => set('motto', e.target.value)}
              placeholder="Chapel of Grace"
            />
          </div>
          <Input
            label="Tagline"
            value={draft.tagline}
            onChange={(e) => set('tagline', e.target.value)}
            hint="One line, shown under the church name on the home page."
          />
          <Input
            label="Established"
            value={draft.established ?? ''}
            onChange={(e) => set('established', e.target.value)}
            placeholder="e.g. 1987"
          />
        </div>
      </Panel>

      <Panel title="Where and how to reach us" icon={Building2}>
        <div className="space-y-4">
          <Input
            label="Address"
            value={draft.address}
            onChange={(e) => set('address', e.target.value)}
          />
          <div className="grid gap-4 sm:grid-cols-3">
            <Input label="Town" value={draft.city} onChange={(e) => set('city', e.target.value)} />
            <Input label="State" value={draft.state} onChange={(e) => set('state', e.target.value)} />
            <Input
              label="Country"
              value={draft.country}
              onChange={(e) => set('country', e.target.value)}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Church phone"
              type="tel"
              value={draft.phone}
              onChange={(e) => set('phone', e.target.value)}
              hint="A church line. Never someone's private mobile."
            />
            <Input
              label="Church email"
              type="email"
              value={draft.email}
              onChange={(e) => set('email', e.target.value)}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="WhatsApp number"
              value={draft.whatsapp ?? ''}
              onChange={(e) => set('whatsapp', e.target.value)}
              placeholder="2348031234567"
              hint="Digits only, with the country code."
            />
            <Input
              label="Map link"
              type="url"
              value={draft.mapUrl ?? ''}
              onChange={(e) => set('mapUrl', e.target.value)}
              placeholder="https://maps.google.com/…"
            />
          </div>
        </div>
      </Panel>

      <Panel title="Leadership" icon={Sparkles}>
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Pastor's name"
              value={draft.pastorName}
              onChange={(e) => set('pastorName', e.target.value)}
            />
            <Input
              label="Title"
              value={draft.pastorTitle}
              onChange={(e) => set('pastorTitle', e.target.value)}
              placeholder="Resident Pastor"
            />
          </div>
          <Textarea
            label="Pastor's welcome message"
            rows={5}
            maxLength={2000}
            value={draft.pastorMessage ?? ''}
            onChange={(e) => set('pastorMessage', e.target.value)}
            hint="Shown on the About page. Speak to a first-time visitor."
          />
        </div>
      </Panel>

      <Panel title="About the church" icon={Building2}>
        <div className="space-y-4">
          <Textarea
            label="About"
            rows={5}
            maxLength={4000}
            value={draft.about}
            onChange={(e) => set('about', e.target.value)}
          />
          <Textarea
            label="History"
            rows={6}
            maxLength={8000}
            value={draft.history}
            onChange={(e) => set('history', e.target.value)}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Textarea
              label="Mission"
              rows={4}
              maxLength={1500}
              value={draft.mission}
              onChange={(e) => set('mission', e.target.value)}
            />
            <Textarea
              label="Vision"
              rows={4}
              maxLength={1500}
              value={draft.vision}
              onChange={(e) => set('vision', e.target.value)}
            />
          </div>
          <Textarea
            label="What we believe"
            rows={7}
            maxLength={4000}
            value={draft.beliefs.join('\n')}
            onChange={(e) => set('beliefs', e.target.value.split('\n').filter(Boolean))}
            hint="One belief per line."
          />
        </div>
      </Panel>

      <Panel title="Service times" icon={Clock}>
        <ListEditor<ServiceTime>
          label="Weekly services"
          hint="Everything that happens every week, in the order the church would list it."
          items={draft.serviceTimes}
          onChange={(next) => set('serviceTimes', next)}
          createItem={() => ({ id: newId('svc'), day: 'Sunday', name: '', startTime: '08:00' })}
          addLabel="Add a service"
          emptyLabel="No service times listed yet."
          renderRow={(item, updateItem) => (
            <div className="grid gap-1.5 sm:grid-cols-4">
              <select
                aria-label="Day"
                value={item.day}
                onChange={(e) => updateItem({ day: e.target.value as ServiceTime['day'] })}
                className="h-9 rounded-lg border border-line-strong bg-surface px-2 text-[0.8125rem] text-ink"
              >
                {DAY_OPTIONS.map((day) => (
                  <option key={day.value} value={day.value}>
                    {day.label}
                  </option>
                ))}
              </select>
              <RowInput
                label="Service name"
                value={item.name}
                onChange={(e) => updateItem({ name: e.target.value })}
              />
              <RowInput
                label="Start"
                type="time"
                value={item.startTime}
                onChange={(e) => updateItem({ startTime: e.target.value })}
              />
              <RowInput
                label="End"
                type="time"
                value={item.endTime ?? ''}
                onChange={(e) => updateItem({ endTime: e.target.value })}
              />
            </div>
          )}
        />
      </Panel>

      <Panel
        title="Church accounts"
        description="Shown on the Giving page. Publish only official church accounts."
        icon={Landmark}
      >
        <ListEditor<BankAccount>
          label="Bank accounts"
          items={draft.bankAccounts}
          onChange={(next) => set('bankAccounts', next)}
          createItem={() => ({
            id: newId('acc'),
            purpose: 'Tithes & Offerings',
            bankName: '',
            accountName: '',
            accountNumber: '',
          })}
          addLabel="Add an account"
          emptyLabel="No accounts listed yet."
          renderRow={(item, updateItem) => (
            <div className="grid gap-1.5 sm:grid-cols-2">
              <RowInput
                label="Purpose"
                value={item.purpose}
                onChange={(e) => updateItem({ purpose: e.target.value })}
              />
              <RowInput
                label="Bank"
                value={item.bankName}
                onChange={(e) => updateItem({ bankName: e.target.value })}
              />
              <RowInput
                label="Account name"
                value={item.accountName}
                onChange={(e) => updateItem({ accountName: e.target.value })}
              />
              <RowInput
                label="Account number"
                inputMode="numeric"
                value={item.accountNumber}
                onChange={(e) => updateItem({ accountNumber: e.target.value })}
              />
            </div>
          )}
        />
      </Panel>

      <Panel title="Social links" icon={Share2}>
        <ListEditor<SocialLink>
          label="Where the church is online"
          items={draft.socials}
          onChange={(next) => set('socials', next)}
          createItem={() => ({ id: newId('soc'), platform: 'facebook', url: '' })}
          addLabel="Add a link"
          emptyLabel="No social links yet."
          renderRow={(item, updateItem) => (
            <div className="grid gap-1.5 sm:grid-cols-[10rem_1fr]">
              <select
                aria-label="Platform"
                value={item.platform}
                onChange={(e) =>
                  updateItem({ platform: e.target.value as SocialLink['platform'] })
                }
                className="h-9 rounded-lg border border-line-strong bg-surface px-2 text-[0.8125rem] text-ink"
              >
                {PLATFORM_OPTIONS.map((platform) => (
                  <option key={platform.value} value={platform.value}>
                    {platform.label}
                  </option>
                ))}
              </select>
              <RowInput
                label="Link"
                type="url"
                value={item.url}
                onChange={(e) => updateItem({ url: e.target.value })}
              />
            </div>
          )}
        />
      </Panel>

      <div className="sticky bottom-0 -mx-3 border-t border-line bg-surface/95 px-3 py-3 backdrop-blur sm:-mx-5 sm:px-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[0.8125rem] text-ink-faint">
            {dirty ? 'You have unsaved changes on this page.' : 'Everything on this page is saved.'}
          </p>
          <Button icon={Save} onClick={save} loading={busy} disabled={!dirty}>
            Save church details
          </Button>
        </div>
      </div>
    </div>
  )
}

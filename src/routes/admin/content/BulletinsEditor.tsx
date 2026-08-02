import { ScrollText } from 'lucide-react'
import { Input, ListEditor, RowInput, Select, Switch, Textarea } from '@/components/ui'
import { useContent } from '@/context/ContentContext'
import type { Bulletin, BulletinHymn, OrderOfServiceItem } from '@/lib/types'
import { BULLETIN_KIND_LABELS } from '@/lib/types'
import { formatDate, newId, startOfWeek, toIsoDate, todayIso } from '@/lib/utils'
import { CollectionManager, stamps } from './shared'

/**
 * Programme sheets — the printed order of service.
 *
 * Note the date handling: `date` is the day the programme runs and may be any
 * weekday, because midweek Bible study, workers' meetings and revival nights
 * are programmes too. `weekOf` only groups the recurring Sunday bulletin, and
 * is filled in automatically for Sunday programmes so the admin never has to
 * think about it.
 */

const KIND_OPTIONS = (Object.keys(BULLETIN_KIND_LABELS) as Bulletin['kind'][]).map((value) => ({
  value,
  label: BULLETIN_KIND_LABELS[value],
}))

export function BulletinsEditor() {
  const { content, update } = useContent()

  return (
    <CollectionManager<Bulletin>
      noun="programmes"
      singular="programme"
      icon={ScrollText}
      items={content.bulletins}
      onChange={(next) => update('bulletins', () => next)}
      emptyHint="The order of service for Sunday worship, midweek Bible study, revivals and special programmes."
      sortBy={(a, b) => b.date.localeCompare(a.date)}
      formSize="xl"
      searchFields={(item) => [item.title, item.theme, item.serviceName, item.preacher]}
      validate={(draft) =>
        !draft.title.trim()
          ? 'A programme needs a title.'
          : !draft.date
            ? 'Which day does this programme run?'
            : null
      }
      createItem={() => {
        const date = todayIso()
        return {
          id: newId('bul'),
          date,
          weekOf: toIsoDate(startOfWeek(date)),
          kind: 'weekly-bulletin',
          title: '',
          serviceName: 'Sunday Worship Service',
          orderOfService: [],
          hymns: [],
          readings: [],
          notices: [],
          weekAhead: [],
          featured: false,
          published: true,
          ...stamps(),
        }
      }}
      renderRow={(item) => ({
        title: item.title || BULLETIN_KIND_LABELS[item.kind],
        meta: [
          BULLETIN_KIND_LABELS[item.kind],
          item.theme,
          item.preacher && `Preacher: ${item.preacher}`,
          `${item.orderOfService.length} items`,
        ]
          .filter(Boolean)
          .join(' · '),
        trailing: formatDate(item.date, 'medium'),
        badges: item.featured ? [{ label: 'Featured', tone: 'gold' }] : undefined,
      })}
      renderForm={(draft, set) => (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Title"
              required
              value={draft.title}
              onChange={(e) => set('title', e.target.value)}
              placeholder="e.g. Sunday Worship — 12 October"
            />
            <Select
              label="Kind of programme"
              value={draft.kind}
              onChange={(e) => set('kind', e.target.value as Bulletin['kind'])}
              options={KIND_OPTIONS}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Input
              label="Date"
              type="date"
              required
              value={draft.date}
              onChange={(e) => {
                const date = e.target.value
                set('date', date)
                // Keep the Sunday grouping in step, without ever forcing it.
                if (date) set('weekOf', toIsoDate(startOfWeek(date)))
              }}
              hint="Any day of the week."
            />
            <Input
              label="Starts"
              type="time"
              value={draft.startTime ?? ''}
              onChange={(e) => set('startTime', e.target.value || undefined)}
            />
            <Input
              label="Ends"
              type="time"
              value={draft.endTime ?? ''}
              onChange={(e) => set('endTime', e.target.value || undefined)}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Runs until"
              type="date"
              value={draft.endDate ?? ''}
              onChange={(e) => set('endDate', e.target.value || undefined)}
              hint="For multi-day programmes such as revival or convention."
            />
            <Input
              label="Venue"
              value={draft.venue ?? ''}
              onChange={(e) => set('venue', e.target.value || undefined)}
              placeholder="Church auditorium"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Service name"
              value={draft.serviceName}
              onChange={(e) => set('serviceName', e.target.value)}
              placeholder="e.g. Sunday Worship Service"
            />
            <Input
              label="Preacher"
              value={draft.preacher ?? ''}
              onChange={(e) => set('preacher', e.target.value || undefined)}
            />
          </div>

          <Input
            label="Theme"
            value={draft.theme ?? ''}
            onChange={(e) => set('theme', e.target.value || undefined)}
          />

          <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
            <Input
              label="Theme verse"
              value={draft.themeVerse ?? ''}
              onChange={(e) => set('themeVerse', e.target.value || undefined)}
            />
            <Input
              label="Reference"
              value={draft.themeVerseRef ?? ''}
              onChange={(e) => set('themeVerseRef', e.target.value || undefined)}
              placeholder="e.g. Psalm 100:4"
            />
          </div>

          <Textarea
            label="Welcome note"
            rows={3}
            maxLength={1500}
            value={draft.welcomeNote ?? ''}
            onChange={(e) => set('welcomeNote', e.target.value || undefined)}
            hint="Read by first-time visitors more than anyone else."
          />

          <ListEditor<OrderOfServiceItem>
            label="Order of service"
            hint="The programme as it will be read from the pulpit, in order."
            items={draft.orderOfService}
            onChange={(next) => set('orderOfService', next)}
            createItem={() => ({ id: newId('oos'), item: '' })}
            addLabel="Add an item"
            emptyLabel="No items yet."
            renderRow={(item, updateItem) => (
              <div className="grid gap-1.5 sm:grid-cols-[6rem_1fr_1fr]">
                <RowInput
                  label="Time"
                  value={item.time ?? ''}
                  onChange={(e) => updateItem({ time: e.target.value })}
                />
                <RowInput
                  label="Item"
                  value={item.item}
                  onChange={(e) => updateItem({ item: e.target.value })}
                />
                <RowInput
                  label="Minister"
                  value={item.minister ?? ''}
                  onChange={(e) => updateItem({ minister: e.target.value })}
                />
              </div>
            )}
          />

          <ListEditor<BulletinHymn>
            label="Hymns"
            items={draft.hymns}
            onChange={(next) => set('hymns', next)}
            createItem={() => ({ id: newId('hym'), title: '' })}
            addLabel="Add a hymn"
            emptyLabel="No hymns listed."
            renderRow={(item, updateItem) => (
              <div className="grid gap-1.5 sm:grid-cols-[5rem_1fr_8rem]">
                <RowInput
                  label="Number"
                  value={item.number ?? ''}
                  onChange={(e) => updateItem({ number: e.target.value })}
                />
                <RowInput
                  label="Hymn title"
                  value={item.title}
                  onChange={(e) => updateItem({ title: e.target.value })}
                />
                <RowInput
                  label="Slot"
                  value={item.slot ?? ''}
                  onChange={(e) => updateItem({ slot: e.target.value })}
                />
              </div>
            )}
          />

          <Textarea
            label="Bible readings"
            rows={3}
            value={draft.readings.join('\n')}
            onChange={(e) => set('readings', e.target.value.split('\n').filter(Boolean))}
            hint="One reading per line."
          />

          <Textarea
            label="Notices"
            rows={5}
            value={draft.notices.join('\n')}
            onChange={(e) => set('notices', e.target.value.split('\n').filter(Boolean))}
            hint="One notice per line. These are published publicly — no personal phone numbers."
          />

          <ListEditor<Bulletin['weekAhead'][number]>
            label="The week ahead"
            hint="The rest of the week's activities."
            items={draft.weekAhead}
            onChange={(next) => set('weekAhead', next)}
            createItem={() => ({ id: newId('wk'), day: '', activity: '' })}
            addLabel="Add an activity"
            emptyLabel="Nothing listed for the week ahead."
            renderRow={(item, updateItem) => (
              <div className="grid gap-1.5 sm:grid-cols-4">
                <RowInput
                  label="Day"
                  value={item.day}
                  onChange={(e) => updateItem({ day: e.target.value })}
                />
                <RowInput
                  label="Time"
                  value={item.time ?? ''}
                  onChange={(e) => updateItem({ time: e.target.value })}
                />
                <RowInput
                  label="Activity"
                  value={item.activity}
                  onChange={(e) => updateItem({ activity: e.target.value })}
                />
                <RowInput
                  label="Venue"
                  value={item.venue ?? ''}
                  onChange={(e) => updateItem({ venue: e.target.value })}
                />
              </div>
            )}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Textarea
              label="Offering note"
              rows={3}
              maxLength={1000}
              value={draft.offeringNote ?? ''}
              onChange={(e) => set('offeringNote', e.target.value || undefined)}
            />
            <Textarea
              label="Closing note"
              rows={3}
              maxLength={1000}
              value={draft.closingNote ?? ''}
              onChange={(e) => set('closingNote', e.target.value || undefined)}
            />
          </div>

          <Input
            label="Printed bulletin (PDF)"
            value={draft.pdfUrl ?? ''}
            onChange={(e) => set('pdfUrl', e.target.value || undefined)}
            placeholder="media/downloads/bulletin-2025-10-12.pdf"
            hint="Optional — a scanned or designed copy people can download."
          />

          <div className="space-y-3 rounded-lg border border-line bg-sunken/40 p-3.5">
            <Switch
              label="Feature on the home page"
              description="The programme the congregation should see first."
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

import { ChevronDown, Plus, ScrollText, Trash2 } from 'lucide-react'
import {
  FileField,
  IconButton,
  Input,
  ListEditor,
  RowInput,
  Select,
  Switch,
  Textarea,
} from '@/components/ui'
import { useContent } from '@/context/ContentContext'
import type {
  Bulletin,
  BulletinAttendanceRow,
  BulletinBirthday,
  BulletinHymn,
  BulletinProgramme,
  BulletinScheduleRow,
  BulletinTheme,
  OrderOfServiceItem,
  OrderOfServiceSection,
  SundaySchoolLesson,
} from '@/lib/types'
import { BULLETIN_KIND_LABELS } from '@/lib/types'
import { formatDate, newId, startOfWeek, toIsoDate, todayIso } from '@/lib/utils'
import { CollectionManager, stamps } from './shared'

/**
 * The programme sheet, modelled on the one the church actually prints.
 *
 * It is a long form because the real bulletin is a long document — masthead,
 * timetable, Sunday School lesson, a bilingual order of service in named
 * blocks, the teenagers' order, last week's head counts, notices, the coming
 * programmes, the month's birthdays, the full message, prayer points, the
 * discipleship themes, and the appeals. Every field maps to something on the
 * paper sheet, and every one of them is optional except the date and title, so
 * a midweek programme stays a two-minute job.
 *
 * Date handling: `date` is the day the programme runs and may be any weekday.
 * `weekOf` only groups the recurring Sunday bulletin and is filled in
 * automatically, so the admin never has to think about it.
 */

const KIND_OPTIONS = (Object.keys(BULLETIN_KIND_LABELS) as Bulletin['kind'][]).map((value) => ({
  value,
  label: BULLETIN_KIND_LABELS[value],
}))

/** The blocks the church prints, offered on a new sheet so nobody retypes them. */
const DEFAULT_SECTIONS: { heading: string; headingYoruba: string }[] = [
  { heading: 'In Worship', headingYoruba: 'Ninu Isin' },
  { heading: 'In Warmth & Witness', headingYoruba: 'Ninu Ife Ara ati Eri' },
  { heading: 'Word Ministrations', headingYoruba: 'Ninu Ise Iranse Oro Naa' },
  {
    heading: 'In Worshipful Thanksgiving & Offerings',
    headingYoruba: 'Ninu Isin Idupe ati Ore fun Oluwa',
  },
  { heading: 'In Witness', headingYoruba: 'Ninu Eri' },
]

/** The timetable as it stands on a normal Sunday. */
const DEFAULT_SCHEDULE: Omit<BulletinScheduleRow, 'id'>[] = [
  { name: 'Pre-Service Prayer for Church Workers', startTime: '08:30', endTime: '09:00' },
  { name: 'Sunday School / New Members’ Classes', startTime: '09:00', endTime: '10:00' },
  { name: 'Combined Service', startTime: '10:00', endTime: '12:00' },
]

const DEFAULT_ATTENDANCE_ROWS = [
  'Combined Worship',
  'English Worship',
  'Yoruba Worship',
  'Mid-Week Prayer and Bible Study',
]

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
      searchFields={(item) => [
        item.title,
        item.theme,
        item.occasion,
        item.serviceName,
        item.preacher,
        item.message?.topic,
      ]}
      validate={(draft) =>
        !draft.title.trim()
          ? 'A programme needs a title.'
          : !draft.date
            ? 'Which day does this programme run?'
            : null
      }
      createItem={() => {
        const date = todayIso()
        const lastYearTheme = content.bulletins.find((b) => b.yearTheme)?.yearTheme
        return {
          id: newId('bul'),
          date,
          weekOf: toIsoDate(startOfWeek(date)),
          kind: 'weekly-bulletin',
          title: '',
          // Carried forward: the year theme is the same on every sheet all year.
          yearTheme: lastYearTheme,
          sundayNumber: sundayOfYear(date),
          serviceName: 'Sunday Worship Service',
          schedule: DEFAULT_SCHEDULE.map((row) => ({ ...row, id: newId('sch') })),
          sections: DEFAULT_SECTIONS.map((section) => ({
            ...section,
            id: newId('sec'),
            items: [],
          })),
          hymns: [],
          readings: [],
          teenagersOrder: [],
          attendanceSummary: [],
          notices: [],
          weekAhead: [],
          comingProgrammes: [],
          birthdays: [],
          prayerPoints: [],
          disciplesThisMonth: [],
          disciplesNextMonth: [],
          urgentNeeds: [],
          projects: [],
          featured: false,
          published: true,
          ...stamps(),
        }
      }}
      renderRow={(item) => ({
        title: item.title || BULLETIN_KIND_LABELS[item.kind],
        meta: [
          BULLETIN_KIND_LABELS[item.kind],
          item.occasion,
          item.message?.topic && `Message: ${item.message.topic}`,
          `${countItems(item)} items`,
        ]
          .filter(Boolean)
          .join(' · '),
        trailing: formatDate(item.date, 'medium'),
        badges: item.featured ? [{ label: 'Featured', tone: 'gold' }] : undefined,
      })}
      renderForm={(draft, set) => (
        <>
          {/* ---------------------------------------------------- masthead */}
          <Group title="Masthead" hint="The block at the very top of the printed sheet.">
            <Input
              label="Theme for the year"
              value={draft.yearTheme ?? ''}
              onChange={(e) => set('yearTheme', e.target.value || undefined)}
              placeholder="2026: My Year of Fruitful Outpouring!"
              hint="Carried forward automatically onto the next programme you create."
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Title"
                required
                value={draft.title}
                onChange={(e) => set('title', e.target.value)}
                placeholder="e.g. Sunday Worship, 2 August 2026"
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
                  if (date) {
                    set('weekOf', toIsoDate(startOfWeek(date)))
                    set('sundayNumber', sundayOfYear(date))
                  }
                }}
                hint="Any day of the week."
              />
              <Input
                label="Sunday of the year"
                type="number"
                min={1}
                max={53}
                value={draft.sundayNumber ?? ''}
                onChange={(e) =>
                  set('sundayNumber', e.target.value ? Number(e.target.value) : undefined)
                }
                hint="Worked out from the date; change it if the church counts differently."
              />
              <Input
                label="Runs until"
                type="date"
                value={draft.endDate ?? ''}
                onChange={(e) => set('endDate', e.target.value || undefined)}
                hint="Revivals, conventions."
              />
            </div>

            <Input
              label="Welcome line"
              value={draft.welcomeLine ?? ''}
              onChange={(e) => set('welcomeLine', e.target.value || undefined)}
              placeholder={
                draft.sundayNumber
                  ? `You are welcome to the ${ordinal(draft.sundayNumber)} Sunday.`
                  : 'You are welcome.'
              }
              hint="Leave blank and it is written from the Sunday number."
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Today's emphasis"
                value={draft.occasion ?? ''}
                onChange={(e) => set('occasion', e.target.value || undefined)}
                placeholder="2026 Social Ministries Emphasis Sunday"
              />
              <Input
                label="Emphasis subtitle"
                value={draft.occasionSubtitle ?? ''}
                onChange={(e) => set('occasionSubtitle', e.target.value || undefined)}
                placeholder="Deacons as Helpers in the Ministry of Care (Acts 6:1-7)"
              />
            </div>

            <ListEditor<BulletinScheduleRow>
              label="Timetable"
              hint="The times printed under the masthead."
              items={draft.schedule ?? []}
              onChange={(next) => set('schedule', next)}
              createItem={() => ({ id: newId('sch'), name: '', startTime: '' })}
              addLabel="Add a time"
              emptyLabel="No times listed."
              renderRow={(item, updateItem) => (
                <div className="grid gap-1.5 sm:grid-cols-[1fr_7rem_7rem]">
                  <RowInput
                    label="What"
                    value={item.name}
                    onChange={(e) => updateItem({ name: e.target.value })}
                  />
                  <RowInput
                    label="From"
                    type="time"
                    value={item.startTime}
                    onChange={(e) => updateItem({ startTime: e.target.value })}
                  />
                  <RowInput
                    label="To"
                    type="time"
                    value={item.endTime ?? ''}
                    onChange={(e) => updateItem({ endTime: e.target.value })}
                  />
                </div>
              )}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Venue"
                value={draft.venue ?? ''}
                onChange={(e) => set('venue', e.target.value || undefined)}
                placeholder="Church auditorium"
              />
              <Input
                label="Preacher"
                value={draft.preacher ?? ''}
                onChange={(e) => set('preacher', e.target.value || undefined)}
              />
            </div>
          </Group>

          {/* --------------------------------------------- Sunday School */}
          <Group
            title="Church in Classes"
            hint="The Sunday School lesson, in English and Yoruba."
          >
            <LessonFields
              value={draft.sundaySchool}
              onChange={(next) => set('sundaySchool', next)}
            />
          </Group>

          {/* ------------------------------------------ order of service */}
          <Group title="Order of service" hint="Grouped into the blocks the church prints.">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Service name"
                value={draft.serviceName}
                onChange={(e) => set('serviceName', e.target.value)}
                placeholder="Combined Service"
              />
              <Input
                label="Theme"
                value={draft.theme ?? ''}
                onChange={(e) => set('theme', e.target.value || undefined)}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Service motto"
                value={draft.serviceMotto ?? ''}
                onChange={(e) => set('serviceMotto', e.target.value || undefined)}
                placeholder="Encounters for Fruitful Outpouring!"
                hint="The boxed line above the order of service."
              />
              <Input
                label="Service motto (Yoruba)"
                value={draft.serviceMottoYoruba ?? ''}
                onChange={(e) => set('serviceMottoYoruba', e.target.value || undefined)}
                placeholder="Ibapade Agbara Fun Itujade Eso Pupo!"
              />
            </div>

            <SectionsEditor
              sections={draft.sections ?? []}
              onChange={(next) => set('sections', next)}
            />
          </Group>

          {/* ------------------------------------------------ teenagers */}
          <Group title="Teenagers' Church" hint="Their own order of service, one line each.">
            <Textarea
              label="Order of service"
              rows={6}
              value={(draft.teenagersOrder ?? []).join('\n')}
              onChange={(e) => set('teenagersOrder', splitLines(e.target.value))}
              hint="One line per item. Call to Worship, Call to Praise Him, and so on."
            />
          </Group>

          {/* -------------------------------------------- hymns/readings */}
          <Group
            title="Hymns and readings"
            hint="Only needed when the church lists them apart from the order of service."
          >
            <ListEditor<BulletinHymn>
              label="Hymns"
              items={draft.hymns ?? []}
              onChange={(next) => set('hymns', next)}
              createItem={() => ({ id: newId('hym'), title: '' })}
              addLabel="Add a hymn"
              emptyLabel="No hymns listed separately."
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
              value={(draft.readings ?? []).join('\n')}
              onChange={(e) => set('readings', splitLines(e.target.value))}
              hint="One reading per line."
            />
          </Group>

          {/* --------------------------------------------- announcements */}
          <Group title="Announcements / Ifilo">
            <AttendanceEditor
              rows={draft.attendanceSummary ?? []}
              onChange={(next) => set('attendanceSummary', next)}
            />

            <Textarea
              label="Notices"
              rows={8}
              value={(draft.notices ?? []).join('\n')}
              onChange={(e) => set('notices', splitLines(e.target.value))}
              hint="One notice per line. Published publicly, no personal phone numbers."
            />

            <ListEditor<Bulletin['weekAhead'][number]>
              label="The week ahead"
              items={draft.weekAhead ?? []}
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

            <ListEditor<BulletinProgramme>
              label="Our coming programmes"
              hint="Dates are free text, because the church writes them as “Sat., 1st. Mon., 3rd”."
              items={draft.comingProgrammes ?? []}
              onChange={(next) => set('comingProgrammes', next)}
              createItem={() => ({ id: newId('prg'), when: '', what: '' })}
              addLabel="Add a programme"
              emptyLabel="Nothing listed yet."
              renderRow={(item, updateItem) => (
                <div className="grid gap-1.5 sm:grid-cols-[7rem_9rem_1fr]">
                  <RowInput
                    label="Month"
                    value={item.month ?? ''}
                    onChange={(e) => updateItem({ month: e.target.value })}
                  />
                  <RowInput
                    label="When"
                    value={item.when}
                    onChange={(e) => updateItem({ when: e.target.value })}
                  />
                  <RowInput
                    label="What"
                    value={item.what}
                    onChange={(e) => updateItem({ what: e.target.value })}
                  />
                </div>
              )}
            />
          </Group>

          {/* ---------------------------------------------- birthdays */}
          <Group
            title="Birthday celebrants"
            hint="Typed in by hand on purpose, publishing a name is always a deliberate act, never something the member register does on its own."
          >
            <BirthdaysEditor
              rows={draft.birthdays ?? []}
              onChange={(next) => set('birthdays', next)}
            />
          </Group>

          {/* ------------------------------------------------ message */}
          <Group title="From the Throne of Glory" hint="The full message, as printed.">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Topic"
                value={draft.message?.topic ?? ''}
                onChange={(e) =>
                  set('message', { ...emptyMessage(draft), topic: e.target.value })
                }
              />
              <Input
                label="Text"
                value={draft.message?.text ?? ''}
                onChange={(e) => set('message', { ...emptyMessage(draft), text: e.target.value })}
                placeholder="Acts 6:1–7"
              />
            </div>

            <Textarea
              label="Message"
              rows={14}
              maxLength={40000}
              value={draft.message?.body ?? ''}
              onChange={(e) => set('message', { ...emptyMessage(draft), body: e.target.value })}
              hint="Headings start with #. Lists start with -. Quotes start with >."
            />

            <Input
              label="Written by"
              value={draft.message?.author ?? ''}
              onChange={(e) => set('message', { ...emptyMessage(draft), author: e.target.value })}
              placeholder="Rev Timothy Olatunde Tijani"
            />

            <Textarea
              label="Prayer points"
              rows={6}
              value={(draft.prayerPoints ?? []).join('\n')}
              onChange={(e) => set('prayerPoints', splitLines(e.target.value))}
              hint="One prayer point per line. They are numbered automatically."
            />
          </Group>

          {/* -------------------------------------------- next lessons */}
          <Group title="Coming up" hint="Trailed at the end of the sheet.">
            <p className="text-[0.8125rem] font-semibold text-ink">Next week's Sunday School</p>
            <LessonFields
              value={draft.nextSundaySchool}
              onChange={(next) => set('nextSundaySchool', next)}
              compact
            />

            <ThemesEditor
              label="Disciples' Lifestyle, this month"
              items={draft.disciplesThisMonth ?? []}
              onChange={(next) => set('disciplesThisMonth', next)}
            />
            <ThemesEditor
              label="Disciples' Lifestyle, next month"
              items={draft.disciplesNextMonth ?? []}
              onChange={(next) => set('disciplesNextMonth', next)}
            />
          </Group>

          {/* ---------------------------------------------- appeals */}
          <Group title="Appeals and projects">
            <Textarea
              label="Urgent needs"
              rows={3}
              value={(draft.urgentNeeds ?? []).join('\n')}
              onChange={(e) => set('urgentNeeds', splitLines(e.target.value))}
              hint="One per line."
            />
            <Textarea
              label="Church projects"
              rows={5}
              value={(draft.projects ?? []).join('\n')}
              onChange={(e) => set('projects', splitLines(e.target.value))}
              hint="One per line, roofing, generator, tiles, and so on."
            />
            <Textarea
              label="Offering note"
              rows={3}
              maxLength={1000}
              value={draft.offeringNote ?? ''}
              onChange={(e) => set('offeringNote', e.target.value || undefined)}
              hint="Account details themselves live under Church details, so they only need changing in one place."
            />
            <Input
              label="Closing line"
              value={draft.closingNote ?? ''}
              onChange={(e) => set('closingNote', e.target.value || undefined)}
              placeholder="Go, enjoy Fruitful Outpouring this year 2026 in Jesus name."
            />
          </Group>

          {/* ------------------------------------------------ publishing */}
          <Group title="Publishing">
            <Textarea
              label="Welcome note"
              rows={3}
              maxLength={1500}
              value={draft.welcomeNote ?? ''}
              onChange={(e) => set('welcomeNote', e.target.value || undefined)}
              hint="Read by first-time visitors more than anyone else."
            />
            <FileField
              label="Printed bulletin (PDF)"
              folder="downloads"
              accept=".pdf"
              value={draft.pdfUrl ?? ''}
              onChange={(next) => set('pdfUrl', next || undefined)}
              hint="Optional. The designed copy people can download."
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
          </Group>
        </>
      )}
    />
  )
}

// ---------------------------------------------------------------------------
// Pieces
// ---------------------------------------------------------------------------

function Group({
  title,
  hint,
  children,
}: {
  title: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <fieldset className="rounded-xl border border-line bg-sunken/25 p-3.5 sm:p-4">
      <legend className="px-1.5 font-display text-[0.9375rem] font-semibold text-ink">
        {title}
      </legend>
      {hint && <p className="mb-3 text-[0.75rem] leading-snug text-ink-faint">{hint}</p>}
      <div className="space-y-4">{children}</div>
    </fieldset>
  )
}

function LessonFields({
  value,
  onChange,
  compact = false,
}: {
  value?: SundaySchoolLesson
  onChange: (next: SundaySchoolLesson) => void
  compact?: boolean
}) {
  const lesson: SundaySchoolLesson = value ?? { topic: '', text: '' }
  const set = (patch: Partial<SundaySchoolLesson>) => onChange({ ...lesson, ...patch })

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Topic"
          value={lesson.topic}
          onChange={(e) => set({ topic: e.target.value })}
          placeholder="Thomas, the Honest Doubter"
        />
        <Input
          label="Ori Oro (Yoruba)"
          value={lesson.topicYoruba ?? ''}
          onChange={(e) => set({ topicYoruba: e.target.value })}
          placeholder="Toomasi: Oniyemeji Tooto"
        />
      </div>

      <Input
        label="Text"
        value={lesson.text}
        onChange={(e) => set({ text: e.target.value })}
        placeholder="John 11:14-16; 14:5-8; 20:24-29; 21:1-2"
      />

      {!compact && (
        <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
          <Textarea
            label="Memory verse"
            rows={3}
            maxLength={600}
            value={lesson.memoryVerse ?? ''}
            onChange={(e) => set({ memoryVerse: e.target.value })}
          />
          <Input
            label="Reference"
            value={lesson.memoryVerseRef ?? ''}
            onChange={(e) => set({ memoryVerseRef: e.target.value })}
            placeholder="John 20:27"
          />
        </div>
      )}
    </>
  )
}

/**
 * The order of service, block by block.
 *
 * Not a plain ListEditor because this is a list of lists — each named block
 * holds its own ordered items, and both levels need reordering.
 */
function SectionsEditor({
  sections,
  onChange,
}: {
  sections: OrderOfServiceSection[]
  onChange: (next: OrderOfServiceSection[]) => void
}) {
  const updateSection = (id: string, patch: Partial<OrderOfServiceSection>) =>
    onChange(sections.map((s) => (s.id === id ? { ...s, ...patch } : s)))

  const moveSection = (index: number, delta: number) => {
    const target = index + delta
    if (target < 0 || target >= sections.length) return
    const next = [...sections]
    ;[next[index], next[target]] = [next[target], next[index]]
    onChange(next)
  }

  return (
    <div className="space-y-3">
      {sections.length === 0 && (
        <p className="rounded-lg border border-dashed border-line-strong px-3 py-4 text-center text-[0.8125rem] text-ink-faint">
          No blocks yet.
        </p>
      )}

      {sections.map((section, index) => (
        <div key={section.id} className="rounded-lg border border-line bg-surface p-3">
          <div className="flex items-start gap-2">
            <div className="flex shrink-0 flex-col pt-1">
              <button
                type="button"
                onClick={() => moveSection(index, -1)}
                disabled={index === 0}
                aria-label={`Move ${section.heading || 'block'} up`}
                className="grid size-5 place-items-center rounded text-ink-faint hover:bg-sunken hover:text-ink disabled:opacity-25"
              >
                <ChevronDown className="size-3.5 rotate-180" aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => moveSection(index, 1)}
                disabled={index === sections.length - 1}
                aria-label={`Move ${section.heading || 'block'} down`}
                className="grid size-5 place-items-center rounded text-ink-faint hover:bg-sunken hover:text-ink disabled:opacity-25"
              >
                <ChevronDown className="size-3.5" aria-hidden />
              </button>
            </div>

            <div className="grid min-w-0 flex-1 gap-1.5 sm:grid-cols-2">
              <RowInput
                label="Block heading"
                value={section.heading}
                onChange={(e) => updateSection(section.id, { heading: e.target.value })}
              />
              <RowInput
                label="Heading (Yoruba)"
                value={section.headingYoruba ?? ''}
                onChange={(e) => updateSection(section.id, { headingYoruba: e.target.value })}
              />
            </div>

            <IconButton
              icon={Trash2}
              size="sm"
              tone="danger"
              label={`Remove the ${section.heading || 'block'} block`}
              onClick={() => onChange(sections.filter((s) => s.id !== section.id))}
            />
          </div>

          <div className="mt-3 pl-7">
            <ListEditor<OrderOfServiceItem>
              label={`${section.heading || 'Block'} items`}
              items={section.items}
              onChange={(next) => updateSection(section.id, { items: next })}
              createItem={() => ({ id: newId('oos'), item: '' })}
              addLabel="Add an item"
              emptyLabel="No items in this block yet."
              renderRow={(item, updateItem) => (
                <div className="space-y-1.5">
                  <div className="grid gap-1.5 sm:grid-cols-2">
                    <RowInput
                      label="Item (English)"
                      value={item.item}
                      onChange={(e) => updateItem({ item: e.target.value })}
                    />
                    <RowInput
                      label="Item (Yoruba)"
                      value={item.itemYoruba ?? ''}
                      onChange={(e) => updateItem({ itemYoruba: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-1.5 sm:grid-cols-4">
                    <RowInput
                      label="Time"
                      value={item.time ?? ''}
                      onChange={(e) => updateItem({ time: e.target.value })}
                    />
                    <RowInput
                      label="Hymn (BH)"
                      value={item.hymnNumber ?? ''}
                      onChange={(e) => updateItem({ hymnNumber: e.target.value })}
                    />
                    <RowInput
                      label="Hymn (YBH)"
                      value={item.hymnNumberYoruba ?? ''}
                      onChange={(e) => updateItem({ hymnNumberYoruba: e.target.value })}
                    />
                    <RowInput
                      label="Minister"
                      value={item.minister ?? ''}
                      onChange={(e) => updateItem({ minister: e.target.value })}
                    />
                  </div>
                </div>
              )}
            />
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={() =>
          onChange([...sections, { id: newId('sec'), heading: '', headingYoruba: '', items: [] }])
        }
        className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-line-strong px-3 py-2 text-[0.8125rem] font-medium text-ink-soft transition-colors hover:border-ornament hover:text-ink"
      >
        <Plus className="size-4" aria-hidden />
        Add a block
      </button>
    </div>
  )
}

function AttendanceEditor({
  rows,
  onChange,
}: {
  rows: BulletinAttendanceRow[]
  onChange: (next: BulletinAttendanceRow[]) => void
}) {
  const seed = () =>
    onChange(
      DEFAULT_ATTENDANCE_ROWS.map((label) => ({ id: newId('att'), label })),
    )

  return (
    <div>
      <ListEditor<BulletinAttendanceRow>
        label="Last Sunday's attendance"
        hint="Head counts only, no names. These are the figures already printed on the sheet."
        items={rows}
        onChange={onChange}
        createItem={() => ({ id: newId('att'), label: '' })}
        addLabel="Add a row"
        emptyLabel="No attendance figures yet."
        reorderable={false}
        renderRow={(item, updateItem) => (
          <div className="space-y-1.5">
            <RowInput
              label="Service"
              value={item.label}
              onChange={(e) => updateItem({ label: e.target.value })}
            />
            <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-6">
              {(
                [
                  ['men', 'Men'],
                  ['women', 'Women'],
                  ['youth', 'Youth'],
                  ['teenagers', 'Teens'],
                  ['children', 'Children'],
                  ['total', 'Total'],
                ] as const
              ).map(([key, label]) => (
                <RowInput
                  key={key}
                  label={label}
                  type="number"
                  min={0}
                  value={item[key] ?? ''}
                  onChange={(e) =>
                    updateItem({ [key]: e.target.value ? Number(e.target.value) : undefined })
                  }
                />
              ))}
            </div>
          </div>
        )}
      />
      {rows.length === 0 && (
        <button
          type="button"
          onClick={seed}
          className="mt-2 text-[0.75rem] font-semibold text-info underline underline-offset-2"
        >
          Add the four usual rows
        </button>
      )}
    </div>
  )
}

function BirthdaysEditor({
  rows,
  onChange,
}: {
  rows: BulletinBirthday[]
  onChange: (next: BulletinBirthday[]) => void
}) {
  const sorted = [...rows].sort((a, b) => a.day - b.day)

  return (
    <div className="space-y-2">
      <ListEditor<BulletinBirthday>
        label="Celebrants"
        items={rows}
        onChange={onChange}
        createItem={() => ({ id: newId('bd'), name: '', day: 1 })}
        addLabel="Add a celebrant"
        emptyLabel="No birthdays listed for this month."
        reorderable={false}
        renderRow={(item, updateItem) => (
          <div className="grid gap-1.5 sm:grid-cols-[1fr_6rem]">
            <RowInput
              label="Name"
              value={item.name}
              onChange={(e) => updateItem({ name: e.target.value })}
            />
            <RowInput
              label="Day"
              type="number"
              min={1}
              max={31}
              value={item.day || ''}
              onChange={(e) => updateItem({ day: Number(e.target.value) || 1 })}
            />
          </div>
        )}
      />

      {rows.length > 1 && (
        <button
          type="button"
          onClick={() => onChange(sorted)}
          className="text-[0.75rem] font-semibold text-info underline underline-offset-2"
        >
          Sort by day of the month
        </button>
      )}
    </div>
  )
}

function ThemesEditor({
  label,
  items,
  onChange,
}: {
  label: string
  items: BulletinTheme[]
  onChange: (next: BulletinTheme[]) => void
}) {
  return (
    <ListEditor<BulletinTheme>
      label={label}
      items={items}
      onChange={onChange}
      createItem={() => ({ id: newId('thm'), topic: '' })}
      addLabel="Add a topic"
      emptyLabel="No topic set."
      renderRow={(item, updateItem) => (
        <div className="grid gap-1.5 sm:grid-cols-2">
          <RowInput
            label="Topic"
            value={item.topic}
            onChange={(e) => updateItem({ topic: e.target.value })}
          />
          <RowInput
            label="Ori-oro (Yoruba)"
            value={item.topicYoruba ?? ''}
            onChange={(e) => updateItem({ topicYoruba: e.target.value })}
          />
        </div>
      )}
    />
  )
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function splitLines(value: string): string[] {
  return value.split('\n').map((line) => line.trim()).filter(Boolean)
}

function emptyMessage(draft: Bulletin) {
  return draft.message ?? { topic: '', body: '' }
}

function countItems(bulletin: Bulletin): number {
  return (bulletin.sections ?? []).reduce((total, section) => total + section.items.length, 0)
}

/** Which Sunday of the year a date falls in. Counts the first Sunday as 1. */
function sundayOfYear(iso: string): number {
  const date = new Date(`${iso}T00:00:00`)
  if (Number.isNaN(date.getTime())) return 1
  const firstDay = new Date(date.getFullYear(), 0, 1)
  // Days until the year's first Sunday.
  const offset = (7 - firstDay.getDay()) % 7
  const firstSunday = new Date(date.getFullYear(), 0, 1 + offset)
  if (date < firstSunday) return 1
  return Math.floor((date.getTime() - firstSunday.getTime()) / (7 * 86_400_000)) + 1
}

export function ordinal(n: number): string {
  const rem100 = n % 100
  if (rem100 >= 11 && rem100 <= 13) return `${n}th`
  switch (n % 10) {
    case 1:
      return `${n}st`
    case 2:
      return `${n}nd`
    case 3:
      return `${n}rd`
    default:
      return `${n}th`
  }
}

import { BookMarked, GraduationCap } from 'lucide-react'
import { Combobox, Input, Switch, Textarea } from '@/components/ui'
import { useContent } from '@/context/ContentContext'
import type { ReadingPlan, Teaching } from '@/lib/types'
import { formatDate, newId, slugify, todayIso } from '@/lib/utils'
import { CollectionManager, stamps } from './shared'

/**
 * The Bible half of the published content: a reading plan the church follows
 * together, and the teaching material it keeps available all year.
 */

// ---------------------------------------------------------------------------
// Reading plans
// ---------------------------------------------------------------------------

export function ReadingPlansEditor() {
  const { content, update } = useContent()

  return (
    <CollectionManager<ReadingPlan>
      noun="reading plans"
      singular="reading plan"
      icon={BookMarked}
      items={content.readingPlans}
      onChange={(next) => update('readingPlans', () => next)}
      emptyHint="A day-by-day journey through the Bible. Give it a start date and the app tells each member which day they are on."
      searchFields={(plan) => [plan.title, plan.description]}
      validate={(draft) =>
        !draft.title.trim()
          ? 'A reading plan needs a title.'
          : draft.days.length === 0
            ? 'Add at least one day of readings.'
            : null
      }
      createItem={() => ({
        id: newId('plan'),
        title: '',
        slug: '',
        description: '',
        startDate: todayIso(),
        days: [],
        published: true,
        ...stamps(),
      })}
      renderRow={(plan) => ({
        title: plan.title,
        meta: `${plan.days.length} days${
          plan.startDate ? `, from ${formatDate(plan.startDate, 'medium')}` : ''
        }`,
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
            placeholder="e.g. Through the Bible in a Year"
          />

          <Textarea
            label="Description"
            rows={3}
            maxLength={1000}
            value={draft.description}
            onChange={(e) => set('description', e.target.value)}
          />

          <Input
            label="Day 1 falls on"
            type="date"
            value={draft.startDate ?? ''}
            onChange={(e) => set('startDate', e.target.value || undefined)}
            hint="Used to work out today's reading. Leave blank to publish it as a plain list."
            className="max-w-xs"
          />

          {/*
            Entered as lines rather than a row editor on purpose: a year plan is
            365 days, and nobody is clicking "add row" 365 times. This way the
            church can paste a plan straight in from a document.
          */}
          <Textarea
            label="Readings"
            rows={14}
            value={draft.days.map((d) => d.references.join(', ')).join('\n')}
            onChange={(e) =>
              set(
                'days',
                e.target.value
                  .split('\n')
                  .map((line) => line.trim())
                  .filter(Boolean)
                  .map((line, index) => ({
                    id: newId('day'),
                    day: index + 1,
                    references: line
                      .split(',')
                      .map((r) => r.trim())
                      .filter(Boolean),
                  })),
              )
            }
            hint="One day per line. Separate passages for the same day with commas, e.g. Genesis 1-2, Matthew 1"
          />

          <p className="rounded-lg bg-sunken px-3 py-2.5 text-[0.8125rem] text-ink-soft">
            {draft.days.length} days entered.
            {draft.days.length > 0 && draft.startDate
              ? ` Runs to ${formatDate(
                  new Date(
                    new Date(`${draft.startDate}T00:00:00`).getTime() +
                      (draft.days.length - 1) * 86_400_000,
                  ),
                  'long',
                )}, then begins again.`
              : ''}
          </p>

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
// Teachings
// ---------------------------------------------------------------------------

export function TeachingsEditor() {
  const { content, update } = useContent()

  return (
    <CollectionManager<Teaching>
      noun="teachings"
      singular="teaching"
      icon={GraduationCap}
      items={content.teachings}
      onChange={(next) => update('teachings', () => next)}
      emptyHint="Reference material the church keeps available: doctrine, Christian living, how to study the Bible. Unlike a sermon, a teaching is not tied to a date."
      sortBy={(a, b) => a.order - b.order}
      searchFields={(t) => [t.title, t.topic, t.summary, t.scriptures.join(' ')]}
      validate={(draft) => (!draft.title.trim() ? 'A teaching needs a title.' : null)}
      createItem={() => ({
        id: newId('tch'),
        title: '',
        slug: '',
        topic: '',
        scriptures: [],
        summary: '',
        body: '',
        order: content.teachings.length + 1,
        published: true,
        ...stamps(),
      })}
      renderRow={(t) => ({
        title: t.title,
        meta: [t.topic, t.scriptures.join(', ')].filter(Boolean).join(' · '),
        trailing: `#${t.order}`,
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
            placeholder="e.g. What Baptists Believe About Baptism"
          />

          <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
            <Combobox
              label="Topic"
              value={draft.topic}
              onChange={(e) => set('topic', e.target.value)}
              hint="Pick one, or type your own."
              options={[
                { value: 'Doctrine', label: 'Doctrine' },
                { value: 'Christian Living', label: 'Christian Living' },
                { value: 'Bible Study', label: 'Bible Study' },
                { value: 'Baptist Faith', label: 'Baptist Faith' },
                { value: 'Discipleship', label: 'Discipleship' },
                { value: 'Family', label: 'Family' },
                { value: 'Stewardship', label: 'Stewardship' },
              ]}
            />
            <Input
              label="Order"
              type="number"
              min={1}
              value={draft.order}
              onChange={(e) => set('order', Number(e.target.value) || 1)}
              hint="Lower shows first."
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
            hint="Separate with commas."
          />

          <Textarea
            label="Summary"
            rows={3}
            maxLength={500}
            showCount
            value={draft.summary}
            onChange={(e) => set('summary', e.target.value)}
            hint="A few lines shown in the teaching list."
          />

          <Textarea
            label="Teaching"
            rows={14}
            maxLength={40000}
            value={draft.body}
            onChange={(e) => set('body', e.target.value)}
            hint="Headings start with #. Lists start with -. Quotes start with >."
          />

          <Input
            label="Written by"
            value={draft.author ?? ''}
            onChange={(e) => set('author', e.target.value || undefined)}
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

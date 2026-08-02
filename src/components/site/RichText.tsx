import { Fragment, useMemo } from 'react'
import { cx, safeUrl } from '@/lib/utils'

/**
 * Minimal Markdown renderer for admin-authored text (sermon notes, about
 * pages, devotionals).
 *
 * It builds React elements directly and never touches `dangerouslySetInnerHTML`,
 * so admin-entered content cannot inject script or markup regardless of what is
 * typed. Links are additionally allow-listed through `safeUrl`, closing off
 * `javascript:` hrefs.
 *
 * Supported, and deliberately no more: `#`/`##`/`###` headings, `-`/`*` and
 * `1.` lists, `>` blockquotes, `---` rules, `**bold**`, `*italic*`, `` `code` ``
 * and `[text](url)`.
 */

type Block =
  | { kind: 'heading'; level: 2 | 3 | 4; text: string }
  | { kind: 'paragraph'; text: string }
  | { kind: 'quote'; text: string }
  | { kind: 'list'; ordered: boolean; items: string[] }
  | { kind: 'rule' }

function parse(source: string): Block[] {
  const blocks: Block[] = []
  const lines = source.replace(/\r\n/g, '\n').split('\n')

  let paragraph: string[] = []
  let quote: string[] = []
  let list: { ordered: boolean; items: string[] } | null = null

  const flushParagraph = () => {
    if (paragraph.length) {
      blocks.push({ kind: 'paragraph', text: paragraph.join(' ').trim() })
      paragraph = []
    }
  }
  const flushQuote = () => {
    if (quote.length) {
      blocks.push({ kind: 'quote', text: quote.join(' ').trim() })
      quote = []
    }
  }
  const flushList = () => {
    if (list) {
      blocks.push({ kind: 'list', ...list })
      list = null
    }
  }
  const flushAll = () => {
    flushParagraph()
    flushQuote()
    flushList()
  }

  for (const raw of lines) {
    const line = raw.trimEnd()

    if (!line.trim()) {
      flushAll()
      continue
    }

    if (/^---+$/.test(line.trim())) {
      flushAll()
      blocks.push({ kind: 'rule' })
      continue
    }

    const heading = /^(#{1,3})\s+(.*)$/.exec(line)
    if (heading) {
      flushAll()
      const level = (heading[1].length + 1) as 2 | 3 | 4
      blocks.push({ kind: 'heading', level, text: heading[2].trim() })
      continue
    }

    if (line.startsWith('>')) {
      flushParagraph()
      flushList()
      quote.push(line.replace(/^>\s?/, ''))
      continue
    }

    const bullet = /^[-*]\s+(.*)$/.exec(line.trim())
    const numbered = /^\d+[.)]\s+(.*)$/.exec(line.trim())
    if (bullet || numbered) {
      flushParagraph()
      flushQuote()
      const ordered = Boolean(numbered)
      const text = (bullet?.[1] ?? numbered?.[1] ?? '').trim()
      if (list && list.ordered === ordered) list.items.push(text)
      else {
        flushList()
        list = { ordered, items: [text] }
      }
      continue
    }

    flushQuote()
    flushList()
    paragraph.push(line.trim())
  }

  flushAll()
  return blocks
}

/** Inline formatting. Returns React nodes; no HTML string is ever produced. */
function inline(text: string, keyPrefix: string): React.ReactNode[] {
  const pattern = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^)\s]+\))/g
  const parts = text.split(pattern).filter((p) => p !== '')

  return parts.map((part, i) => {
    const key = `${keyPrefix}-${i}`

    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={key}>{part.slice(2, -2)}</strong>
    }
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      return <em key={key}>{part.slice(1, -1)}</em>
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={key}>{part.slice(1, -1)}</code>
    }

    const link = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(part)
    if (link) {
      const href = safeUrl(link[2])
      // A rejected URL degrades to plain text rather than a broken or unsafe link.
      if (!href) return <Fragment key={key}>{link[1]}</Fragment>
      const external = /^https?:/i.test(href)
      return (
        <a
          key={key}
          href={href}
          {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
        >
          {link[1]}
        </a>
      )
    }

    return <Fragment key={key}>{part}</Fragment>
  })
}

export function RichText({ children, className }: { children: string; className?: string }) {
  const blocks = useMemo(() => parse(children ?? ''), [children])

  if (blocks.length === 0) return null

  return (
    <div className={cx('prose-chapel', className)}>
      {blocks.map((block, index) => {
        const key = `b${index}`
        switch (block.kind) {
          case 'heading': {
            const Tag = `h${block.level}` as 'h2' | 'h3' | 'h4'
            return <Tag key={key}>{inline(block.text, key)}</Tag>
          }
          case 'quote':
            return <blockquote key={key}>{inline(block.text, key)}</blockquote>
          case 'rule':
            return <div key={key} className="rule-gold my-7" role="separator" />
          case 'list':
            return block.ordered ? (
              <ol key={key}>
                {block.items.map((item, i) => (
                  <li key={i}>{inline(item, `${key}-${i}`)}</li>
                ))}
              </ol>
            ) : (
              <ul key={key}>
                {block.items.map((item, i) => (
                  <li key={i}>{inline(item, `${key}-${i}`)}</li>
                ))}
              </ul>
            )
          case 'paragraph':
          default:
            return <p key={key}>{inline(block.text, key)}</p>
        }
      })}
    </div>
  )
}

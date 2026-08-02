import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  CONTENT_DIR,
  CONTENT_FILES,
  EMPTY_CONTENT,
  clearDraft,
  loadContent,
  markDirty,
  readDraft,
  serialiseCollection,
  writeDraft,
  type ContentDraft,
} from '@/lib/content'
import { publishFiles, type PublishOutcome, type PublishProgress } from '@/lib/github'
import type { CollectionName, GitHubSettings, PublishedContent } from '@/lib/types'
import { nowIso } from '@/lib/utils'

interface ContentValue {
  /** What the app renders: the local draft if one exists, else what is published. */
  content: PublishedContent
  /** What is actually live on GitHub Pages right now. */
  published: PublishedContent
  loading: boolean
  error: string | null

  /** Collections edited but not yet published. */
  dirty: CollectionName[]
  hasUnpublished: boolean

  /** Edit a collection. Saves to the local draft; publishes nothing. */
  update: <K extends CollectionName>(
    name: K,
    recipe: (current: PublishedContent[K]) => PublishedContent[K],
  ) => Promise<void>

  /** Throw away local edits and go back to what is live. */
  discard: () => Promise<void>
  /** Re-fetch the published files. */
  refresh: () => Promise<void>

  publish: (
    github: GitHubSettings,
    message: string,
    onProgress?: (p: PublishProgress) => void,
  ) => Promise<PublishOutcome>
  publishing: boolean
}

const ContentContext = createContext<ContentValue | null>(null)

export function ContentProvider({ children }: { children: React.ReactNode }) {
  const [published, setPublished] = useState<PublishedContent>(EMPTY_CONTENT)
  const [draft, setDraft] = useState<ContentDraft | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [publishing, setPublishing] = useState(false)

  const draftRef = useRef<ContentDraft | null>(null)
  useEffect(() => {
    draftRef.current = draft
  }, [draft])

  const fetchPublished = useCallback(async (signal?: AbortSignal) => {
    setLoading(true)
    setError(null)
    try {
      const loaded = await loadContent(signal)
      setPublished(loaded)
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') return
      setError(
        'Church information could not be loaded. If you are offline, the last saved copy will be used.',
      )
      console.error('[content] load failed', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    void (async () => {
      const [storedDraft] = await Promise.all([readDraft(), fetchPublished(controller.signal)])
      if (!controller.signal.aborted && storedDraft) setDraft(storedDraft)
    })()
    return () => controller.abort()
  }, [fetchPublished])

  const content = draft?.content ?? published

  const update = useCallback<ContentValue['update']>(async (name, recipe) => {
    const base = draftRef.current
    const current: PublishedContent = base?.content ?? publishedRef.current
    const next: ContentDraft = {
      content: { ...current, [name]: recipe(current[name]) },
      dirty: markDirty(base?.dirty ?? [], name),
      savedAt: nowIso(),
    }
    draftRef.current = next
    setDraft(next)
    await writeDraft(next)
  }, [])

  // Kept in a ref so `update` does not need `published` in its dependency list,
  // which would rebuild the callback on every background refresh.
  const publishedRef = useRef(published)
  useEffect(() => {
    publishedRef.current = published
  }, [published])

  const discard = useCallback(async () => {
    draftRef.current = null
    setDraft(null)
    await clearDraft()
  }, [])

  const refresh = useCallback(async () => {
    await fetchPublished()
  }, [fetchPublished])

  const publish = useCallback<ContentValue['publish']>(
    async (github, message, onProgress) => {
      const current = draftRef.current
      if (!current || current.dirty.length === 0) {
        return { committed: [], failed: [] }
      }

      setPublishing(true)
      try {
        const items = current.dirty.map((name) => ({
          path: `${CONTENT_DIR}/${CONTENT_FILES[name]}`,
          text: serialiseCollection(current.content, name),
          label: name,
        }))

        const outcome = await publishFiles(
          github.token,
          { owner: github.owner, repo: github.repo, branch: github.branch },
          items,
          message,
          onProgress,
        )

        // Only clear the collections that actually landed. Anything that failed
        // stays dirty so a retry publishes exactly what is still outstanding.
        const failedLabels = new Set(outcome.failed.map((f) => f.label))
        const remaining = current.dirty.filter((name) => failedLabels.has(name))

        if (remaining.length === 0) {
          setPublished(current.content)
          await clearDraft()
          draftRef.current = null
          setDraft(null)
        } else {
          const next: ContentDraft = { ...current, dirty: remaining, savedAt: nowIso() }
          draftRef.current = next
          setDraft(next)
          await writeDraft(next)
        }

        return outcome
      } finally {
        setPublishing(false)
      }
    },
    [],
  )

  const value = useMemo<ContentValue>(
    () => ({
      content,
      published,
      loading,
      error,
      dirty: draft?.dirty ?? [],
      hasUnpublished: (draft?.dirty.length ?? 0) > 0,
      update,
      discard,
      refresh,
      publish,
      publishing,
    }),
    [content, published, loading, error, draft, update, discard, refresh, publish, publishing],
  )

  return <ContentContext.Provider value={value}>{children}</ContentContext.Provider>
}

export function useContent(): ContentValue {
  const ctx = useContext(ContentContext)
  if (!ctx) throw new Error('useContent must be used inside <ContentProvider>')
  return ctx
}

/** Convenience for the many read-only views that only need the church profile. */
export function useChurch() {
  return useContent().content.church
}

import { useCallback, useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Images, Play, X } from 'lucide-react'
import { ArchCard, Badge, EmptyState, IconButton, PageHeader } from '@/components/ui'
import { useContent } from '@/context/ContentContext'
import { useDocumentTitle, useLockBodyScroll, useRevealAll } from '@/hooks'
import { publishedAlbums } from '@/lib/content'
import type { GalleryPhoto } from '@/lib/types'
import { asset, cx, formatDate, pluralise, safeUrl } from '@/lib/utils'

export default function GalleryPage() {
  const { content } = useContent()
  useDocumentTitle('Gallery', 'Pictures and videos from church life at FBC Agbede.')

  const [openAlbum, setOpenAlbum] = useState<string | null>(null)
  const [lightbox, setLightbox] = useState<{ photos: GalleryPhoto[]; index: number } | null>(null)
  const revealRef = useRevealAll<HTMLDivElement>()

  const albums = useMemo(() => publishedAlbums(content.gallery), [content.gallery])
  const videos = content.gallery.videos ?? []
  const album = albums.find((a) => a.id === openAlbum)

  return (
    <>
      <PageHeader
        eyebrow="Church life"
        title="Gallery"
        description="Moments from our services, programmes and outreach, the family of God at the Chapel of Grace."
      />

      {/*
        Photos and videos share one page rather than sitting behind a tab.
        Nobody switches a tab they have no reason to believe holds anything, so
        a video the church published was simply never seen.
      */}
      <div ref={revealRef} className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12">
        {(
          album ? (
            <section>
              <button
                type="button"
                onClick={() => setOpenAlbum(null)}
                className="inline-flex items-center gap-1.5 text-[0.8125rem] font-medium text-ink-faint hover:text-ink"
              >
                <ChevronLeft className="size-4" aria-hidden />
                All albums
              </button>

              <h2 className="mt-4 font-display text-2xl font-semibold text-ink">{album.title}</h2>
              <p className="mt-1 text-[0.875rem] text-ink-faint">
                {formatDate(album.date, 'long')} · {pluralise(album.photos.length, 'photo')}
              </p>
              {album.description && (
                <p className="mt-3 max-w-2xl text-[0.9375rem] leading-relaxed text-ink-soft">
                  {album.description}
                </p>
              )}

              <ul className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {album.photos.map((photo, index) => (
                  <li key={photo.id}>
                    <button
                      type="button"
                      onClick={() => setLightbox({ photos: album.photos, index })}
                      className="group block w-full overflow-hidden rounded-xl border border-line focus-visible:ring-2 focus-visible:ring-info"
                    >
                      <img
                        src={asset(photo.url)}
                        alt={photo.caption ?? ''}
                        loading="lazy"
                        decoding="async"
                        width={photo.width}
                        height={photo.height}
                        className="aspect-square w-full bg-sunken object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ) : albums.length > 0 ? (
            <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {albums.map((item) => (
                <li key={item.id} className="reveal">
                  <button type="button" onClick={() => setOpenAlbum(item.id)} className="w-full text-left">
                    <ArchCard
                      image={item.cover ? asset(item.cover) : item.photos[0] ? asset(item.photos[0].url) : undefined}
                      imageAlt=""
                      fallbackIcon={Images}
                      aspect="square"
                    >
                      <h2 className="font-display text-[1.0625rem] font-semibold text-ink">
                        {item.title}
                      </h2>
                      <p className="mt-1 text-[0.8125rem] text-ink-faint">
                        {formatDate(item.date, 'long')} · {pluralise(item.photos.length, 'photo')}
                      </p>
                    </ArchCard>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              icon={Images}
              title="No photos yet"
              description="Pictures from services and programmes will appear here."
            />
          )
        )}

        {/* Videos, always visible, below the albums. */}
        {videos.length > 0 && !album && (
          <section className="mt-12" aria-labelledby="videos-heading">
            <h2
              id="videos-heading"
              className="flex items-center gap-2 font-display text-2xl font-semibold text-ink"
            >
              <Play className="size-5 text-ornament" aria-hidden />
              Videos
            </h2>
            <p className="mt-1 text-[0.9375rem] text-ink-soft">
              {pluralise(videos.length, 'recording')} from our services and programmes.
            </p>

            <ul className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {videos.map((video) => {
                const href = safeUrl(video.url)
                if (!href) return null
                return (
                  <li key={video.id} className="reveal">
                    <ArchCard
                      href={href}
                      image={video.thumbnail ? asset(video.thumbnail) : undefined}
                      imageAlt=""
                      fallbackIcon={Play}
                      aspect="square"
                    >
                      <Badge tone="accent">video</Badge>
                      <h3 className="mt-2 font-display text-[1.0625rem] font-semibold text-ink">
                        {video.title}
                      </h3>
                      {video.description && (
                        <p className="mt-1 line-clamp-2 text-[0.8125rem] leading-snug text-ink-soft">
                          {video.description}
                        </p>
                      )}
                      {video.date && (
                        <p className="mt-1 text-[0.8125rem] text-ink-faint">
                          {formatDate(video.date, 'long')}
                        </p>
                      )}
                    </ArchCard>
                  </li>
                )
              })}
            </ul>
          </section>
        )}
      </div>

      {lightbox && (
        <Lightbox
          photos={lightbox.photos}
          index={lightbox.index}
          onIndex={(next) => setLightbox({ ...lightbox, index: next })}
          onClose={() => setLightbox(null)}
        />
      )}
    </>
  )
}

function Lightbox({
  photos,
  index,
  onIndex,
  onClose,
}: {
  photos: GalleryPhoto[]
  index: number
  onIndex: (next: number) => void
  onClose: () => void
}) {
  useLockBodyScroll(true)
  const photo = photos[index]

  const go = useCallback(
    (delta: number) => onIndex((index + delta + photos.length) % photos.length),
    [index, onIndex, photos.length],
  )

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
      if (event.key === 'ArrowRight') go(1)
      if (event.key === 'ArrowLeft') go(-1)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [go, onClose])

  if (!photo) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={photo.caption ?? 'Photo'}
      className="fixed inset-0 z-[95] flex flex-col bg-vestry-950/95 backdrop-blur-sm"
    >
      <div className="flex items-center justify-between p-3">
        <p className="text-[0.8125rem] font-medium tabular-nums text-white/60">
          {index + 1} / {photos.length}
        </p>
        <IconButton
          icon={X}
          label="Close photo"
          onClick={onClose}
          className="text-white hover:bg-white/10 hover:text-white"
        />
      </div>

      <div className="relative flex min-h-0 flex-1 items-center justify-center px-2">
        <img
          src={asset(photo.url)}
          alt={photo.caption ?? ''}
          className="max-h-full max-w-full rounded-lg object-contain"
        />
        {photos.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label="Previous photo"
              className={cx(
                'absolute left-2 grid size-11 place-items-center rounded-full bg-black/40 text-white',
                'transition-colors hover:bg-black/60',
              )}
            >
              <ChevronLeft className="size-5" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label="Next photo"
              className="absolute right-2 grid size-11 place-items-center rounded-full bg-black/40 text-white transition-colors hover:bg-black/60"
            >
              <ChevronRight className="size-5" aria-hidden />
            </button>
          </>
        )}
      </div>

      {photo.caption && (
        <p className="p-4 text-center text-[0.875rem] text-white/80">{photo.caption}</p>
      )}
    </div>
  )
}

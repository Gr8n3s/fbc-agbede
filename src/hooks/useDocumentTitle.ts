import { useEffect } from 'react'

const SUFFIX = 'FBC Agbede'

/**
 * Sets the document title, and announces the page to screen readers.
 *
 * A single-page app does not re-announce on navigation the way a full page
 * load does, so we also write the title into a live region — otherwise a
 * screen-reader user gets no signal that the page changed at all.
 */
export function useDocumentTitle(title?: string, description?: string): void {
  useEffect(() => {
    const full = title ? `${title} — ${SUFFIX}` : `${SUFFIX} — Chapel of Grace`
    document.title = full

    if (description) {
      let meta = document.querySelector<HTMLMetaElement>('meta[name="description"]')
      if (!meta) {
        meta = document.createElement('meta')
        meta.name = 'description'
        document.head.appendChild(meta)
      }
      meta.content = description
    }

    const region = document.getElementById('route-announcer')
    if (region) region.textContent = title ? `${title} page` : 'Home page'
  }, [title, description])
}

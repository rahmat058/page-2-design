/**
 * Tracks scrollTop + viewport height for a scroll container (virtual lists).
 */
import { useEffect, useRef, useState, type RefObject } from 'react'

export function useVirtualScroll(maxHeight: number): {
  rootRef: RefObject<HTMLDivElement | null>
  scrollTop: number
  viewportH: number
} {
  const rootRef = useRef<HTMLDivElement>(null)
  const [scrollTop, setScrollTop] = useState(0)
  const [viewportH, setViewportH] = useState(maxHeight)

  useEffect(() => {
    const el = rootRef.current
    if (!el) return
    const onScroll = () => setScrollTop(el.scrollTop)
    const ro = new ResizeObserver(() => setViewportH(el.clientHeight || maxHeight))
    el.addEventListener('scroll', onScroll, { passive: true })
    ro.observe(el)
    setViewportH(el.clientHeight || maxHeight)
    return () => {
      el.removeEventListener('scroll', onScroll)
      ro.disconnect()
    }
  }, [maxHeight])

  return { rootRef, scrollTop, viewportH }
}

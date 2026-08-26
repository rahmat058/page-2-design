/**
 * Mounts once when the host first intersects the viewport.
 */
import { useEffect, useRef, useState, type RefObject } from 'react'

export function useIntersectionOnce(rootMargin = '160px'): {
  ref: RefObject<HTMLDivElement | null>
  visible: boolean
} {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el || visible) return
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true)
          io.disconnect()
        }
      },
      { rootMargin },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [rootMargin, visible])

  return { ref, visible }
}

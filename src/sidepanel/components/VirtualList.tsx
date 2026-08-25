import { useEffect, useRef, useState, type ReactNode } from 'react'

interface Props {
  count: number
  itemHeight: number
  renderItem: (index: number) => ReactNode
  overscan?: number
  className?: string
  maxHeight?: number
}

/** Windowed list — only mounts rows near the scroll viewport. */
export function VirtualList({ count, itemHeight, renderItem, overscan = 6, className, maxHeight = 360 }: Props) {
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

  if (count < 40) {
    return <div className={className ?? 'list'}>{Array.from({ length: count }, (_, index) => renderItem(index))}</div>
  }

  const start = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan)
  const end = Math.min(count, Math.ceil((scrollTop + viewportH) / itemHeight) + overscan)
  const items: ReactNode[] = []
  for (let index = start; index < end; index += 1) {
    items.push(
      <div
        key={index}
        className="virtual-item"
        style={{
          position: 'absolute',
          top: index * itemHeight,
          left: 0,
          right: 0,
          height: itemHeight,
        }}>
        {renderItem(index)}
      </div>,
    )
  }

  return (
    <div
      ref={rootRef}
      className={['virtual', className].filter(Boolean).join(' ')}
      style={{ height: Math.min(maxHeight, count * itemHeight) }}>
      <div style={{ height: count * itemHeight, position: 'relative' }}>{items}</div>
    </div>
  )
}

interface LazyMountProps {
  children: ReactNode
  placeholder?: ReactNode
  rootMargin?: string
  className?: string
}

/** Mount children only after the host intersects the viewport (once). */
export function LazyMount({ children, placeholder = null, rootMargin = '160px', className }: LazyMountProps) {
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

  return (
    <div ref={ref} className={className}>
      {visible ? children : placeholder}
    </div>
  )
}

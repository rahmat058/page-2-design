/**
 * Windowed list — only mounts rows near the scroll viewport.
 */
import { type ReactNode } from 'react'
import { useVirtualScroll } from '../../hooks'
import { visibleItemRange } from './lib/visible-range'

interface Props {
  count: number
  itemHeight: number
  renderItem: (index: number) => ReactNode
  overscan?: number
  className?: string
  maxHeight?: number
}

export function VirtualList({ count, itemHeight, renderItem, overscan = 6, className, maxHeight = 360 }: Props) {
  const { rootRef, scrollTop, viewportH } = useVirtualScroll(maxHeight)

  if (count < 40) {
    return <div className={className ?? 'list'}>{Array.from({ length: count }, (_, index) => renderItem(index))}</div>
  }

  const { start, end } = visibleItemRange(scrollTop, viewportH, itemHeight, count, overscan)
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

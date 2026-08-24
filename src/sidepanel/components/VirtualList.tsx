import type { ReactNode } from 'react'

interface Props {
  count: number
  itemHeight: number
  renderItem: (index: number) => ReactNode
}

export function VirtualList({ count, itemHeight, renderItem }: Props) {
  if (count < 40) {
    return <div className="list">{Array.from({ length: count }, (_, index) => renderItem(index))}</div>
  }
  return (
    <div className="virtual" style={{ height: Math.min(360, count * itemHeight) }}>
      <div style={{ height: count * itemHeight, position: 'relative' }}>
        {Array.from({ length: count }, (_, index) => (
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
          </div>
        ))}
      </div>
    </div>
  )
}

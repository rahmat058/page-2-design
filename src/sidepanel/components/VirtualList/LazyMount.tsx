/**
 * Mount children only after the host intersects the viewport (once).
 */
import type { ReactNode } from 'react'
import { useIntersectionOnce } from '../../hooks'

interface LazyMountProps {
  children: ReactNode
  placeholder?: ReactNode
  rootMargin?: string
  className?: string
}

export function LazyMount({ children, placeholder = null, rootMargin = '160px', className }: LazyMountProps) {
  const { ref, visible } = useIntersectionOnce(rootMargin)

  return (
    <div ref={ref} className={className}>
      {visible ? children : placeholder}
    </div>
  )
}

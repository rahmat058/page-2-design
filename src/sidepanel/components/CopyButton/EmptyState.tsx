/**
 * Simple empty placeholder for result tabs.
 */
import type { ReactNode } from 'react'

export function EmptyState({ children }: { children: ReactNode }) {
  return <div className="empty">{children}</div>
}

/**
 * Page title row with optional leading icon, count badge, and trailing action.
 */
import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { CountBadge } from './CountBadge'

interface Props {
  title: string
  icon?: LucideIcon
  count?: number | null
  action?: ReactNode
  overview?: boolean
  children?: ReactNode
}

export function PageHead({ title, icon: Icon, count, action, overview, children }: Props) {
  return (
    <div className={overview ? 'page-head overview-head' : 'page-head'}>
      <div className="head-row">
        <h1>
          {Icon ? <Icon className="page-head-icon" size={16} strokeWidth={2} aria-hidden="true" /> : null}
          {title}
          {count != null && !overview ? <CountBadge value={count} /> : null}
        </h1>
        {action}
      </div>
      {children}
    </div>
  )
}

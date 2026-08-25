import type { ReactNode } from 'react'
import { CountBadge } from './CountBadge'

interface Props {
  title: string
  count?: number | null
  action?: ReactNode
  overview?: boolean
  children?: ReactNode
}

export function PageHead({ title, count, action, overview, children }: Props) {
  return (
    <div className={overview ? 'page-head overview-head' : 'page-head'}>
      <div className="head-row">
        <h1>
          {title}
          {count != null && !overview ? <CountBadge value={count} /> : null}
        </h1>
        {action}
      </div>
      {children}
    </div>
  )
}

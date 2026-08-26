/**
 * Segmented tabs plus scrolling body used by Colors / Assets / Markdown shells.
 */
import type { ReactNode } from 'react'
import { Segmented, type SegmentedOption } from './Segmented'

interface CollectionShellProps<T extends string> {
  value: T
  options: ReadonlyArray<SegmentedOption<T>>
  onChange: (value: T) => void
  label: string
  className?: string
  children: ReactNode
}

export function CollectionShell<T extends string>({
  value,
  options,
  onChange,
  label,
  className,
  children,
}: CollectionShellProps<T>) {
  return (
    <div className={['collection-shell', className].filter(Boolean).join(' ')}>
      <Segmented value={value} options={options} onChange={onChange} label={label} />
      <div key={value} className="fade-pane collection-scroll">
        {children}
      </div>
    </div>
  )
}

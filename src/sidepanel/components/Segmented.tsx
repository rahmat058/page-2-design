import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'

export interface SegmentedOption<T extends string> {
  value: T
  label: string
  icon?: ReactNode
}

interface Props<T extends string> {
  value: T
  options: ReadonlyArray<SegmentedOption<T>>
  onChange: (value: T) => void
  label: string
  className?: string
}

export function Segmented<T extends string>({ value, options, onChange, label, className }: Props<T>) {
  const listRef = useRef<HTMLDivElement>(null)
  const [indicator, setIndicator] = useState({ left: 0, width: 0 })

  useLayoutEffect(() => {
    const list = listRef.current
    if (!list) return

    const update = () => {
      const active = list.querySelector<HTMLElement>('[aria-selected="true"]')
      if (!active) return
      setIndicator({ left: active.offsetLeft, width: active.offsetWidth })
    }

    update()
    const observer = new ResizeObserver(update)
    observer.observe(list)
    return () => observer.disconnect()
  }, [value, options])

  return (
    <div
      ref={listRef}
      className={['ui-segmented', className].filter(Boolean).join(' ')}
      role="tablist"
      aria-label={label}
      style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}>
      <span
        className="ui-segmented-indicator"
        aria-hidden="true"
        style={{
          transform: `translateX(${indicator.left}px)`,
          width: indicator.width,
          opacity: indicator.width ? 1 : 0,
        }}
      />
      {options.map((option) => {
        const selected = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            className={selected ? 'on' : ''}
            aria-selected={selected}
            onClick={() => {
              if (selected) return
              onChange(option.value)
            }}>
            {option.icon}
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

interface CollectionShellProps<T extends string> extends Props<T> {
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

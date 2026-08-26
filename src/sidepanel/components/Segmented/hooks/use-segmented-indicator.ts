/**
 * Keeps the sliding segmented indicator aligned with the selected tab.
 */
import { useLayoutEffect, useState, type RefObject } from 'react'

export function useSegmentedIndicator(
  listRef: RefObject<HTMLDivElement | null>,
  value: string,
  options: ReadonlyArray<unknown>,
): { left: number; width: number } {
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
  }, [listRef, value, options])

  return indicator
}

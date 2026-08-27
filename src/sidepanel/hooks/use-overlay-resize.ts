/**
 * Syncs floating-overlay width when markdown view / inspect / responsive flyout change.
 */
import { useEffect } from 'react'
import { postOverlayMessage } from '../lib/overlay-messages'

const IS_OVERLAY = typeof window !== 'undefined' && window !== window.top

export function useOverlayResize(width: number): void {
  useEffect(() => {
    if (!IS_OVERLAY) return
    postOverlayMessage({ type: 'resize', width })
  }, [width])
}

export function isOverlayFrame(): boolean {
  return IS_OVERLAY
}

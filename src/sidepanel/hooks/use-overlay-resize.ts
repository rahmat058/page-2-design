/**
 * Syncs floating-overlay width when markdown view / inspect mode changes.
 */
import { useEffect } from 'react'
import { OVERLAY_WIDE_WIDTH, OVERLAY_WIDTH } from '../../shared/constants'
import { postOverlayMessage } from '../lib/overlay-messages'

const IS_OVERLAY = typeof window !== 'undefined' && window !== window.top

export function useOverlayResize(wide: boolean): void {
  useEffect(() => {
    if (!IS_OVERLAY) return
    postOverlayMessage({
      type: 'resize',
      width: wide ? OVERLAY_WIDE_WIDTH : OVERLAY_WIDTH,
    })
  }, [wide])
}

export function isOverlayFrame(): boolean {
  return IS_OVERLAY
}

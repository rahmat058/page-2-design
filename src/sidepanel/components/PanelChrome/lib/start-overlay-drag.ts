/**
 * Pointer-drag for the floating overlay grip (iframe → parent host).
 */
import type { PointerEvent as ReactPointerEvent } from 'react'
import { postOverlayMessage } from '../../../lib/overlay-messages'

export function startOverlayDrag(event: ReactPointerEvent<HTMLButtonElement>): void {
  if (window === window.top) return
  event.preventDefault()
  event.stopPropagation()
  const target = event.currentTarget
  target.setPointerCapture(event.pointerId)
  postOverlayMessage({ type: 'dragstart', screenX: event.screenX, screenY: event.screenY })

  let latestX = event.screenX
  let latestY = event.screenY
  let frame = 0

  const flush = () => {
    frame = 0
    postOverlayMessage({ type: 'move', screenX: latestX, screenY: latestY })
  }

  const move = (next: PointerEvent) => {
    latestX = next.screenX
    latestY = next.screenY
    if (!frame) frame = requestAnimationFrame(flush)
  }

  const end = () => {
    if (frame) cancelAnimationFrame(frame)
    flush()
    postOverlayMessage({ type: 'dragend' })
    try {
      target.releasePointerCapture(event.pointerId)
    } catch {
      /* already released */
    }
    target.removeEventListener('pointermove', move)
    target.removeEventListener('pointerup', end)
    target.removeEventListener('pointercancel', end)
  }

  target.addEventListener('pointermove', move)
  target.addEventListener('pointerup', end)
  target.addEventListener('pointercancel', end)
}

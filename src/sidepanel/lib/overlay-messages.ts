/**
 * postMessage bridge from the sidepanel iframe to the page overlay host.
 * Contract must stay in sync with `content/overlay-host.ts`.
 */
export const OVERLAY_MESSAGE_SOURCE = 'page2design' as const

export type OverlayMessageType = 'dragstart' | 'move' | 'dragend' | 'resize' | 'close'

export interface OverlayMessage {
  type: OverlayMessageType
  screenX?: number
  screenY?: number
  width?: number
}

export function postOverlayMessage(payload: OverlayMessage): void {
  window.parent.postMessage({ source: OVERLAY_MESSAGE_SOURCE, ...payload }, '*')
}

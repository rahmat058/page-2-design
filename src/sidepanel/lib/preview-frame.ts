/**
 * Toggle DNR rules that allow the Responsive preview iframe to load the tab.
 */
import { createRequestId } from '../../shared/messages'
import { sendRuntime } from '../chrome-api'

export async function setPreviewFrameEnabled(enabled: boolean): Promise<void> {
  await sendRuntime({
    type: 'SET_PREVIEW_FRAME',
    requestId: createRequestId(),
    payload: { enabled },
  })
}

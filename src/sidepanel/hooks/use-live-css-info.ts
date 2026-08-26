/**
 * Live CSS Information for the Overview tab (refreshes after each ready scan).
 */
import { useEffect, useState } from 'react'
import { createRequestId } from '../../shared/messages'
import type { CssInformation } from '../../shared/types'
import { sendRuntime } from '../chrome-api'

export function useLiveCssInfo(phase: string, scanId: string | null): CssInformation | null {
  const [liveCss, setLiveCss] = useState<CssInformation | null>(null)

  useEffect(() => {
    if (phase !== 'ready' && phase !== 'complete') return
    let cancelled = false
    void (async () => {
      const response = await sendRuntime({ type: 'GET_CSS_INFO', requestId: createRequestId() })
      if (!cancelled && response?.type === 'CSS_INFO') setLiveCss(response.payload)
    })()
    return () => {
      cancelled = true
    }
  }, [phase, scanId])

  return liveCss
}

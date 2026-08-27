/**
 * Live CSS-pixel viewport emulation via the Chrome DevTools Protocol.
 * Detaches when the user stops preview or the tab closes.
 */
import { createMessage, createRequestId } from '../shared/messages'
import type { DeviceOrientation } from '../shared/device-presets'
import { identifyActiveTab } from './scan-orchestrator'

export interface DeviceEmulationState {
  active: boolean
  tabId: number | null
  deviceId: string | null
  width: number
  height: number
  deviceScaleFactor: number
  mobile: boolean
  orientation: DeviceOrientation
  error: string | null
}

export interface ApplyDeviceEmulationInput {
  deviceId: string
  width: number
  height: number
  deviceScaleFactor: number
  mobile: boolean
  orientation: DeviceOrientation
}

const PROTOCOL = '1.3'

const idle = (): DeviceEmulationState => ({
  active: false,
  tabId: null,
  deviceId: null,
  width: 800,
  height: 600,
  deviceScaleFactor: 1,
  mobile: false,
  orientation: 'portrait',
  error: null,
})

let state: DeviceEmulationState = idle()
let detachBound = false

export function getDeviceEmulation(): DeviceEmulationState {
  return { ...state }
}

export async function applyDeviceEmulation(input: ApplyDeviceEmulationInput): Promise<DeviceEmulationState> {
  if (!chrome.debugger?.attach) {
    state = { ...idle(), error: null }
    return getDeviceEmulation()
  }
  const tab = await identifyActiveTab()
  if (!tab.tabId || tab.restricted) {
    state = { ...idle(), error: 'Open an http(s) page to preview breakpoints.' }
    return getDeviceEmulation()
  }

  try {
    await chrome.storage.session.set({ panelView: 'responsive' })
  } catch {
    /* session storage may be unavailable in tests */
  }

  try {
    await chrome.sidePanel.open({ tabId: tab.tabId })
  } catch {
    /* already open, or gesture consumed — overlay still works if attach succeeds */
  }

  try {
    await chrome.tabs.sendMessage(tab.tabId, createMessage({ type: 'CLOSE_OVERLAY', requestId: createRequestId() }))
  } catch {
    /* overlay may already be closed */
  }

  const target: chrome.debugger.Debuggee = { tabId: tab.tabId }
  try {
    await attachDebugger(target)
    await chrome.debugger.sendCommand(target, 'Emulation.setDeviceMetricsOverride', {
      width: input.width,
      height: input.height,
      deviceScaleFactor: input.deviceScaleFactor,
      mobile: input.mobile,
      screenWidth: input.width,
      screenHeight: input.height,
    })
    if (input.mobile) {
      await chrome.debugger.sendCommand(target, 'Emulation.setTouchEmulationEnabled', {
        enabled: true,
        configuration: 'mobile',
      })
    } else {
      await chrome.debugger.sendCommand(target, 'Emulation.setTouchEmulationEnabled', { enabled: false })
    }
    state = {
      active: true,
      tabId: tab.tabId,
      deviceId: input.deviceId,
      width: input.width,
      height: input.height,
      deviceScaleFactor: input.deviceScaleFactor,
      mobile: input.mobile,
      orientation: input.orientation,
      error: null,
    }
    broadcastStatus()
  } catch (error) {
    state = { ...idle(), error: friendlyDebuggerError(error) }
    broadcastStatus()
  }
  return getDeviceEmulation()
}

export async function clearDeviceEmulation(): Promise<DeviceEmulationState> {
  if (!chrome.debugger?.attach) {
    state = idle()
    return getDeviceEmulation()
  }
  const tabId = state.tabId
  if (tabId != null) {
    const target: chrome.debugger.Debuggee = { tabId }
    try {
      await chrome.debugger.sendCommand(target, 'Emulation.clearDeviceMetricsOverride')
    } catch {
      /* already cleared */
    }
    try {
      await chrome.debugger.sendCommand(target, 'Emulation.setTouchEmulationEnabled', { enabled: false })
    } catch {
      /* already cleared */
    }
    try {
      await chrome.tabs.setZoom(tabId, 1)
    } catch {
      /* zoom APIs may be unavailable */
    }
    try {
      await chrome.debugger.detach(target)
    } catch {
      /* already detached */
    }
  }
  state = idle()
  broadcastStatus({ zoom: 1 })
  return getDeviceEmulation()
}

export async function reloadEmulatedTab(): Promise<void> {
  if (state.tabId == null) return
  await chrome.tabs.reload(state.tabId)
}

export async function setEmulatedZoom(factor: number): Promise<number> {
  const tab = await identifyActiveTab()
  if (!tab.tabId) return 1
  const next = Math.min(2, Math.max(0.5, Math.round(factor * 10) / 10))
  await chrome.tabs.setZoom(tab.tabId, next)
  return next
}

export async function getEmulatedZoom(): Promise<number> {
  const tab = await identifyActiveTab()
  if (!tab.tabId) return 1
  try {
    return await chrome.tabs.getZoom(tab.tabId)
  } catch {
    return 1
  }
}

function attachDebugger(target: chrome.debugger.Debuggee): Promise<void> {
  bindDetachListener()
  return new Promise((resolve, reject) => {
    chrome.debugger.attach(target, PROTOCOL, () => {
      const last = chrome.runtime.lastError?.message
      if (!last || (/already attached/i.test(last) && !/another debugger/i.test(last))) {
        resolve()
        return
      }
      reject(new Error(last))
    })
  })
}

function bindDetachListener(): void {
  if (detachBound) return
  detachBound = true
  chrome.debugger.onDetach.addListener((source) => {
    if (source.tabId == null || source.tabId !== state.tabId) return
    state = idle()
    broadcastStatus()
  })
}

function broadcastStatus(extra?: { zoom?: number }): void {
  void chrome.runtime
    .sendMessage(
      createMessage({
        type: 'DEVICE_EMULATION_STATUS',
        requestId: createRequestId(),
        payload: { ...getDeviceEmulation(), ...extra },
      }),
    )
    .catch(() => undefined)
}

function friendlyDebuggerError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)
  if (/another debugger|devtools/i.test(message)) {
    return 'Close Chrome DevTools on this tab to preview breakpoints.'
  }
  if (/not attached|debugger/i.test(message) && /permission/i.test(message)) {
    return 'Reload the extension after updating permissions, then try again.'
  }
  return message || 'Could not apply this breakpoint.'
}

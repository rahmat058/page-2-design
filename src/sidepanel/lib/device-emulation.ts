/**
 * Runtime helpers for live device emulation from the side panel.
 */
import type { DeviceEmulationPayload } from '../../shared/messages'
import { createRequestId } from '../../shared/messages'
import { sendRuntime } from '../chrome-api'

const idle: DeviceEmulationPayload = {
  active: false,
  tabId: null,
  deviceId: null,
  width: 800,
  height: 600,
  deviceScaleFactor: 1,
  mobile: false,
  orientation: 'portrait',
  error: null,
  zoom: 1,
}

function asStatus(message: { type: string; payload?: unknown } | null): DeviceEmulationPayload {
  if (message?.type !== 'DEVICE_EMULATION_STATUS' || !message.payload || typeof message.payload !== 'object') {
    return idle
  }
  return { ...idle, ...(message.payload as DeviceEmulationPayload) }
}

export async function fetchDeviceEmulation(): Promise<DeviceEmulationPayload> {
  const response = await sendRuntime({ type: 'GET_DEVICE_EMULATION', requestId: createRequestId() })
  return asStatus(response)
}

export async function applyDeviceEmulation(payload: {
  deviceId: string
  width: number
  height: number
  deviceScaleFactor: number
  mobile: boolean
  orientation: 'portrait' | 'landscape'
}): Promise<DeviceEmulationPayload> {
  const response = await sendRuntime({
    type: 'SET_DEVICE_EMULATION',
    requestId: createRequestId(),
    payload,
  })
  return asStatus(response)
}

export async function stopDeviceEmulation(): Promise<DeviceEmulationPayload> {
  const response = await sendRuntime({ type: 'CLEAR_DEVICE_EMULATION', requestId: createRequestId() })
  return asStatus(response)
}

export async function reloadEmulatedTab(): Promise<void> {
  await sendRuntime({ type: 'RELOAD_EMULATED_TAB', requestId: createRequestId() })
}

export async function setEmulatedZoom(factor: number): Promise<DeviceEmulationPayload> {
  const response = await sendRuntime({
    type: 'SET_EMULATED_ZOOM',
    requestId: createRequestId(),
    payload: { factor },
  })
  return asStatus(response)
}

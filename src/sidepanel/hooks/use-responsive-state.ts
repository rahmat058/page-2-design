/**
 * Selected device, orientation, and zoom for the Responsive preview.
 */
import { useEffect, useState, type Dispatch, type SetStateAction } from 'react'
import type { DeviceOrientation, DevicePreset } from '../../shared/device-presets'
import { defaultOrientation } from '../../shared/device-presets'
import { stopDeviceEmulation } from '../lib/device-emulation'

export interface ResponsiveState {
  selected: DevicePreset | null
  orientation: DeviceOrientation
  zoom: number
  previewKey: number
}

export function useResponsiveState(): ResponsiveState & {
  setSelected: Dispatch<SetStateAction<DevicePreset | null>>
  setOrientation: Dispatch<SetStateAction<DeviceOrientation>>
  setZoom: Dispatch<SetStateAction<number>>
  setPreviewKey: Dispatch<SetStateAction<number>>
  pick: (device: DevicePreset) => void
} {
  const [selected, setSelected] = useState<DevicePreset | null>(null)
  const [orientation, setOrientation] = useState<DeviceOrientation>('portrait')
  const [zoom, setZoom] = useState(1)
  const [previewKey, setPreviewKey] = useState(0)

  useEffect(() => {
    void stopDeviceEmulation()
  }, [])

  const pick = (device: DevicePreset) => {
    const nextOrientation = device.id === selected?.id ? orientation : defaultOrientation(device)
    setSelected(device)
    setOrientation(nextOrientation)
    setZoom(1)
    setPreviewKey((key) => key + 1)
  }

  return { selected, orientation, zoom, previewKey, setSelected, setOrientation, setZoom, setPreviewKey, pick }
}

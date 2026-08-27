import { describe, expect, it } from 'vitest'
import {
  DEVICE_PRESETS,
  DEFAULT_DEVICE_ID,
  categoryLabel,
  defaultOrientation,
  deviceById,
  devicesInCategory,
  filterDevices,
  formatDpr,
  formatViewport,
  orientedSize,
  previewWindowSize,
} from '../shared/device-presets'

describe('device presets', () => {
  it('includes the Wobolo-style breakpoint set', () => {
    expect(devicesInCategory(DEVICE_PRESETS, 'responsive')).toHaveLength(1)
    expect(devicesInCategory(DEVICE_PRESETS, 'phone')).toHaveLength(15)
    expect(devicesInCategory(DEVICE_PRESETS, 'tablet')).toHaveLength(5)
    expect(devicesInCategory(DEVICE_PRESETS, 'desktop')).toHaveLength(5)
    expect(deviceById(DEFAULT_DEVICE_ID)?.width).toBe(800)
    expect(deviceById('iphone-16-pro-max')).toMatchObject({ width: 430, height: 932, dpr: 3 })
    expect(deviceById('ipad-pro-13')).toMatchObject({ width: 1024, height: 1366, dpr: 2 })
    expect(deviceById('macbook-pro-16')).toMatchObject({ width: 1536, height: 960, dpr: 2 })
  })

  it('filters by name, size, and category', () => {
    expect(filterDevices(DEVICE_PRESETS, 'pixel 9').map((item) => item.id)).toEqual(['pixel-9-pro', 'pixel-9'])
    expect(filterDevices(DEVICE_PRESETS, '430x932').length).toBeGreaterThan(0)
    expect(filterDevices(DEVICE_PRESETS, 'tablet').every((item) => item.category === 'tablet')).toBe(true)
  })

  it('swaps dimensions on rotate', () => {
    const phone = deviceById('iphone-se')!
    expect(defaultOrientation(phone)).toBe('portrait')
    expect(orientedSize(phone, 'portrait')).toEqual({ width: 375, height: 667 })
    expect(orientedSize(phone, 'landscape')).toEqual({ width: 667, height: 375 })
    const desktop = deviceById('desktop-1080p')!
    expect(defaultOrientation(desktop)).toBe('landscape')
    expect(orientedSize(desktop, 'landscape')).toEqual({ width: 1920, height: 1080 })
    expect(orientedSize(desktop, 'portrait')).toEqual({ width: 1080, height: 1920 })
  })

  it('sizes the preview window to the breakpoint, capped for large desktops', () => {
    expect(previewWindowSize({ width: 375, height: 667 }, 1, 780, 700)).toEqual({
      width: 375,
      height: 667,
      scale: 1,
    })
    const desktop = previewWindowSize({ width: 1920, height: 1080 }, 1, 780, 700)
    expect(desktop.width).toBe(780)
    expect(desktop.scale).toBeCloseTo(780 / 1920)
  })

  it('formats labels for cards', () => {
    expect(formatViewport(430, 932)).toBe('430×932')
    expect(formatDpr(2.625)).toBe('@2.625x')
    expect(categoryLabel('phone')).toBe('Phone')
  })
})

/**
 * Device breakpoints for live responsive preview (CSS-pixel viewports).
 */

export type DeviceCategory = 'responsive' | 'phone' | 'tablet' | 'desktop'
export type DeviceOrientation = 'portrait' | 'landscape'

export interface DevicePreset {
  id: string
  name: string
  width: number
  height: number
  dpr: number
  category: DeviceCategory
  mobile: boolean
}

export const DEVICE_CATEGORIES: Array<{ id: DeviceCategory; label: string }> = [
  { id: 'responsive', label: 'Responsive' },
  { id: 'phone', label: 'Phones' },
  { id: 'tablet', label: 'Tablets' },
  { id: 'desktop', label: 'Desktop' },
]

export const DEVICE_PRESETS: DevicePreset[] = [
  { id: 'responsive', name: 'Responsive', width: 800, height: 600, dpr: 1, category: 'responsive', mobile: false },

  {
    id: 'iphone-16-pro-max',
    name: 'iPhone 16 Pro Max',
    width: 430,
    height: 932,
    dpr: 3,
    category: 'phone',
    mobile: true,
  },
  { id: 'iphone-16-pro', name: 'iPhone 16 Pro', width: 402, height: 874, dpr: 3, category: 'phone', mobile: true },
  { id: 'iphone-16', name: 'iPhone 16', width: 393, height: 852, dpr: 3, category: 'phone', mobile: true },
  {
    id: 'iphone-15-pro-max',
    name: 'iPhone 15 Pro Max',
    width: 430,
    height: 932,
    dpr: 3,
    category: 'phone',
    mobile: true,
  },
  { id: 'iphone-15-pro', name: 'iPhone 15 Pro', width: 393, height: 852, dpr: 3, category: 'phone', mobile: true },
  { id: 'iphone-15', name: 'iPhone 15', width: 393, height: 852, dpr: 3, category: 'phone', mobile: true },
  {
    id: 'iphone-14-pro-max',
    name: 'iPhone 14 Pro Max',
    width: 430,
    height: 932,
    dpr: 3,
    category: 'phone',
    mobile: true,
  },
  { id: 'iphone-14-pro', name: 'iPhone 14 Pro', width: 393, height: 852, dpr: 3, category: 'phone', mobile: true },
  { id: 'iphone-se', name: 'iPhone SE', width: 375, height: 667, dpr: 2, category: 'phone', mobile: true },
  { id: 'pixel-9-pro', name: 'Pixel 9 Pro', width: 412, height: 915, dpr: 3.5, category: 'phone', mobile: true },
  { id: 'pixel-9', name: 'Pixel 9', width: 412, height: 915, dpr: 2.625, category: 'phone', mobile: true },
  { id: 'pixel-8', name: 'Pixel 8', width: 412, height: 915, dpr: 2.625, category: 'phone', mobile: true },
  {
    id: 'galaxy-s24-ultra',
    name: 'Galaxy S24 Ultra',
    width: 412,
    height: 915,
    dpr: 3.5,
    category: 'phone',
    mobile: true,
  },
  { id: 'galaxy-s24', name: 'Galaxy S24', width: 360, height: 780, dpr: 3, category: 'phone', mobile: true },
  { id: 'galaxy-a54', name: 'Galaxy A54', width: 393, height: 851, dpr: 2.625, category: 'phone', mobile: true },

  { id: 'ipad-pro-13', name: 'iPad Pro 13"', width: 1024, height: 1366, dpr: 2, category: 'tablet', mobile: true },
  { id: 'ipad-pro-11', name: 'iPad Pro 11"', width: 834, height: 1194, dpr: 2, category: 'tablet', mobile: true },
  { id: 'ipad-air-13', name: 'iPad Air 13"', width: 1024, height: 1366, dpr: 2, category: 'tablet', mobile: true },
  { id: 'ipad-air', name: 'iPad Air 11"', width: 820, height: 1180, dpr: 2, category: 'tablet', mobile: true },
  { id: 'ipad-10', name: 'iPad (10th gen)', width: 820, height: 1180, dpr: 2, category: 'tablet', mobile: true },
  { id: 'ipad-mini', name: 'iPad Mini', width: 744, height: 1133, dpr: 2, category: 'tablet', mobile: true },
  { id: 'surface-pro', name: 'Surface Pro 11', width: 912, height: 1368, dpr: 2, category: 'tablet', mobile: true },
  { id: 'pixel-tablet', name: 'Pixel Tablet', width: 800, height: 1280, dpr: 2, category: 'tablet', mobile: true },
  {
    id: 'galaxy-tab-s9-ultra',
    name: 'Galaxy Tab S9 Ultra',
    width: 960,
    height: 1440,
    dpr: 2,
    category: 'tablet',
    mobile: true,
  },
  { id: 'galaxy-tab-s9', name: 'Galaxy Tab S9', width: 753, height: 1205, dpr: 2, category: 'tablet', mobile: true },
  { id: 'nest-hub-max', name: 'Nest Hub Max', width: 1280, height: 800, dpr: 2, category: 'tablet', mobile: true },

  {
    id: 'macbook-pro-16',
    name: 'MacBook Pro 16"',
    width: 1536,
    height: 960,
    dpr: 2,
    category: 'desktop',
    mobile: false,
  },
  {
    id: 'macbook-pro-14',
    name: 'MacBook Pro 14"',
    width: 1512,
    height: 982,
    dpr: 2,
    category: 'desktop',
    mobile: false,
  },
  {
    id: 'macbook-air-15',
    name: 'MacBook Air 15"',
    width: 1440,
    height: 932,
    dpr: 2,
    category: 'desktop',
    mobile: false,
  },
  {
    id: 'macbook-air-13',
    name: 'MacBook Air 13"',
    width: 1440,
    height: 900,
    dpr: 2,
    category: 'desktop',
    mobile: false,
  },
  { id: 'imac-24', name: 'iMac 24"', width: 2240, height: 1260, dpr: 2, category: 'desktop', mobile: false },
  { id: 'desktop-1080p', name: 'Desktop 1080p', width: 1920, height: 1080, dpr: 1, category: 'desktop', mobile: false },
  { id: 'desktop-1440p', name: 'Desktop 1440p', width: 2560, height: 1440, dpr: 1, category: 'desktop', mobile: false },
  { id: 'desktop-4k', name: 'Desktop 4K', width: 3840, height: 2160, dpr: 1, category: 'desktop', mobile: false },
  { id: 'laptop-1600', name: 'Laptop 1600', width: 1600, height: 900, dpr: 1, category: 'desktop', mobile: false },
  { id: 'laptop-1366', name: 'Laptop 1366', width: 1366, height: 768, dpr: 1, category: 'desktop', mobile: false },
  { id: 'laptop-1280', name: 'Laptop 1280', width: 1280, height: 800, dpr: 1, category: 'desktop', mobile: false },
  {
    id: 'ultrawide-1080',
    name: 'Ultrawide 2560',
    width: 2560,
    height: 1080,
    dpr: 1,
    category: 'desktop',
    mobile: false,
  },
]

export const DEFAULT_DEVICE_ID = 'responsive'

export function deviceById(id: string): DevicePreset | undefined {
  return DEVICE_PRESETS.find((device) => device.id === id)
}

export function categoryLabel(category: DeviceCategory): string {
  if (category === 'phone') return 'Phone'
  if (category === 'tablet') return 'Tablet'
  if (category === 'desktop') return 'Desktop'
  return 'Responsive'
}

export function formatDpr(dpr: number): string {
  return `@${dpr}x`
}

export function formatViewport(width: number, height: number): string {
  return `${width}×${height}`
}

export function orientedSize(
  device: Pick<DevicePreset, 'width' | 'height'>,
  orientation: DeviceOrientation,
): { width: number; height: number } {
  const listedPortrait = device.height >= device.width
  const listed = { width: device.width, height: device.height }
  const swapped = { width: device.height, height: device.width }
  return orientation === 'portrait' ? (listedPortrait ? listed : swapped) : listedPortrait ? swapped : listed
}

export function defaultOrientation(device: Pick<DevicePreset, 'width' | 'height'>): DeviceOrientation {
  return device.height >= device.width ? 'portrait' : 'landscape'
}

export function filterDevices(devices: DevicePreset[], query: string): DevicePreset[] {
  const needle = query.trim().toLowerCase()
  if (!needle) return devices
  return devices.filter((device) => {
    const haystack =
      `${device.name} ${device.width}x${device.height} ${device.width}×${device.height} ${categoryLabel(device.category)}`.toLowerCase()
    return haystack.includes(needle)
  })
}

export function devicesInCategory(devices: DevicePreset[], category: DeviceCategory): DevicePreset[] {
  return devices.filter((device) => device.category === category)
}

export function previewCap(category: DeviceCategory): { maxWidth: number; maxHeight: number } {
  if (category === 'desktop') return { maxWidth: 1280, maxHeight: 700 }
  if (category === 'tablet') return { maxWidth: 1024, maxHeight: 700 }
  if (category === 'phone') return { maxWidth: 430, maxHeight: 700 }
  return { maxWidth: 800, maxHeight: 700 }
}

export function previewFrame(
  device: Pick<DevicePreset, 'category'> | null,
  size: { width: number; height: number },
  zoom = 1,
): { width: number; height: number; scale: number } {
  const category = device?.category ?? 'responsive'
  const cap = previewCap(category)
  const fit = category === 'tablet' || category === 'desktop' ? 'width' : 'contain'
  return previewWindowSize(size, zoom, cap.maxWidth, cap.maxHeight, fit)
}

export function previewWindowSize(
  size: { width: number; height: number },
  zoom = 1,
  maxWidth = 1280,
  maxHeight = 700,
  fit: 'contain' | 'width' = 'contain',
): { width: number; height: number; scale: number } {
  const widthScale = Math.min(1, maxWidth / Math.max(size.width, 1))
  const heightScale = Math.min(1, maxHeight / Math.max(size.height, 1))
  const scale = (fit === 'width' ? widthScale : Math.min(widthScale, heightScale)) * zoom
  return {
    width: Math.max(1, Math.round(size.width * scale)),
    height: Math.max(1, Math.round(Math.min(size.height * scale, maxHeight))),
    scale,
  }
}

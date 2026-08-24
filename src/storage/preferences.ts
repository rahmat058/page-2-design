import { DEFAULT_SCAN_OPTIONS, type ScanOptions } from '../shared/types'

export interface Preferences extends ScanOptions {
  includeFailedAssets: boolean
}

const DEFAULTS: Preferences = {
  ...DEFAULT_SCAN_OPTIONS,
  includeFailedAssets: true,
}

export async function loadPreferences(): Promise<Preferences> {
  try {
    const stored = await chrome.storage.local.get('preferences')
    return { ...DEFAULTS, ...(stored.preferences as Partial<Preferences> | undefined) }
  } catch {
    return DEFAULTS
  }
}

export async function savePreferences(preferences: Preferences): Promise<void> {
  await chrome.storage.local.set({ preferences })
}

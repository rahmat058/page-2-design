import { create } from 'zustand';
import type {
  NormalizedDesign,
  PageScan,
  ScanCounts,
  ScanLimitation,
  ScanOptions,
  ScanPhase,
} from '../../shared/types';
import { DEFAULT_SCAN_OPTIONS, emptyCounts } from '../../shared/types';

export type PanelView =
  | 'overview'
  | 'content'
  | 'assets'
  | 'images'
  | 'icons'
  | 'colors'
  | 'typography'
  | 'layout'
  | 'export';

interface ScanStore {
  phase: ScanPhase;
  scanId: string | null;
  hostname: string | null;
  title: string | null;
  url: string | null;
  tabRestricted: boolean;
  progressMessage: string;
  completedChunks: number;
  totalChunks: number | null;
  counts: ScanCounts;
  limitations: ScanLimitation[];
  error: string | null;
  view: PanelView;
  options: ScanOptions;
  selectedAssetIds: string[];
  raw: PageScan | null;
  design: NormalizedDesign | null;
  setTabInfo: (info: {
    hostname: string | null;
    title: string | null;
    url: string | null;
    restricted: boolean;
  }) => void;
  setProgress: (payload: {
    phase: ScanPhase;
    message: string;
    completedChunks: number;
    totalChunks: number | null;
    counts: ScanCounts;
  }) => void;
  setReady: (scanId: string, raw: PageScan, design: NormalizedDesign) => void;
  setFailed: (message: string) => void;
  setCancelled: () => void;
  setPhase: (phase: ScanPhase) => void;
  setView: (view: PanelView) => void;
  setOptions: (options: Partial<ScanOptions>) => void;
  toggleAsset: (id: string) => void;
  setSelectedAssets: (ids: string[]) => void;
  reset: () => void;
}

export const useScanStore = create<ScanStore>((set) => ({
  phase: 'idle',
  scanId: null,
  hostname: null,
  title: null,
  url: null,
  tabRestricted: false,
  progressMessage: '',
  completedChunks: 0,
  totalChunks: null,
  counts: emptyCounts(),
  limitations: [],
  error: null,
  view: 'overview',
  options: DEFAULT_SCAN_OPTIONS,
  selectedAssetIds: [],
  raw: null,
  design: null,
  setTabInfo: (info) =>
    set({
      hostname: info.hostname,
      title: info.title,
      url: info.url,
      tabRestricted: info.restricted,
    }),
  setProgress: (payload) =>
    set({
      phase: payload.phase,
      progressMessage: payload.message,
      completedChunks: payload.completedChunks,
      totalChunks: payload.totalChunks,
      counts: payload.counts,
      error: null,
    }),
  setReady: (scanId, raw, design) =>
    set({
      scanId,
      raw,
      design,
      phase: 'ready',
      limitations: design.limitations,
      counts: {
        elements: design.coverage.relevantElements,
        textBlocks: design.coverage.visibleTextBlocks,
        images: design.assets.length,
        colors: design.tokens.colors.length,
        typography: design.tokens.typography.length,
      },
      selectedAssetIds: design.assets.map((asset) => asset.id),
      error: null,
    }),
  setFailed: (message) => set({ phase: 'failed', error: message }),
  setCancelled: () => set({ phase: 'cancelled', progressMessage: 'Scan cancelled.' }),
  setPhase: (phase) => set({ phase }),
  setView: (view) => set({ view }),
  setOptions: (options) => set((state) => ({ options: { ...state.options, ...options } })),
  toggleAsset: (id) =>
    set((state) => ({
      selectedAssetIds: state.selectedAssetIds.includes(id)
        ? state.selectedAssetIds.filter((item) => item !== id)
        : [...state.selectedAssetIds, id],
    })),
  setSelectedAssets: (ids) => set({ selectedAssetIds: ids }),
  reset: () =>
    set({
      phase: 'idle',
      scanId: null,
      raw: null,
      design: null,
      error: null,
      counts: emptyCounts(),
      limitations: [],
      completedChunks: 0,
      totalChunks: null,
      progressMessage: '',
    }),
}));

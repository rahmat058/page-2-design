import { MESSAGE_SCHEMA_VERSION } from './constants';
import type { SerializedError } from './errors';
import { isRecord, asString } from './utils';
import type {
  CompactFrameScan,
  ExportOptions,
  LayoutSnapshot,
  NormalizedDesign,
  PageScan,
  ScanCounts,
  ScanOptions,
  ScanPhase,
  ScanProgress,
} from './types';

export type MessageType =
  | 'PING'
  | 'PONG'
  | 'CONTENT_READY'
  | 'GET_ACTIVE_TAB'
  | 'ACTIVE_TAB_INFO'
  | 'START_SCAN'
  | 'CANCEL_SCAN'
  | 'SCAN_PROGRESS'
  | 'SCAN_CHUNK'
  | 'SCAN_COMPLETE'
  | 'SCAN_FAILED'
  | 'GET_SCAN'
  | 'SCAN_RECORD'
  | 'START_EXPORT'
  | 'EXPORT_PROGRESS'
  | 'EXPORT_COMPLETE'
  | 'EXPORT_FAILED'
  | 'CAPTURE_SCREENSHOT'
  | 'SCREENSHOT_RESULT'
  | 'CLEAR_SCANS'
  | 'SCANS_CLEARED'
  | 'FETCH_ASSET'
  | 'ASSET_BYTES'
  | 'LAYOUT_SNAPSHOT'
  | 'SCAN_FRAME'
  | 'TOGGLE_OVERLAY'
  | 'CLOSE_OVERLAY'
  | 'DOCK_SIDE_PANEL'
  | 'SET_INSPECT_MODE'
  | 'HIGHLIGHT_COLOR'
  | 'HIGHLIGHT_COLOR_RESULT';

interface MessageBase {
  schemaVersion: string;
  type: MessageType;
  requestId: string;
  scanId?: string;
}

export interface PingMessage extends MessageBase {
  type: 'PING';
}

export interface PongMessage extends MessageBase {
  type: 'PONG';
}

export interface ContentReadyMessage extends MessageBase {
  type: 'CONTENT_READY';
}

export interface GetActiveTabMessage extends MessageBase {
  type: 'GET_ACTIVE_TAB';
}

export interface ActiveTabInfoMessage extends MessageBase {
  type: 'ACTIVE_TAB_INFO';
  payload: {
    tabId: number | null;
    url: string | null;
    title: string | null;
    hostname: string | null;
    restricted: boolean;
  };
}

export interface StartScanMessage extends MessageBase {
  type: 'START_SCAN';
  scanId: string;
  payload: ScanOptions;
}

export interface CancelScanMessage extends MessageBase {
  type: 'CANCEL_SCAN';
  scanId: string;
}

export interface ScanProgressMessage extends MessageBase {
  type: 'SCAN_PROGRESS';
  scanId: string;
  payload: ScanProgress;
}

export interface ScanChunkMessage extends MessageBase {
  type: 'SCAN_CHUNK';
  scanId: string;
  payload: {
    kind: string;
    index: number;
    total: number;
    data: unknown;
  };
}

export interface ScanCompleteMessage extends MessageBase {
  type: 'SCAN_COMPLETE';
  scanId: string;
  payload: {
    counts: ScanCounts;
    assembled?: boolean;
  };
}

export interface ScanFailedMessage extends MessageBase {
  type: 'SCAN_FAILED';
  scanId?: string;
  payload: SerializedError;
}

export interface GetScanMessage extends MessageBase {
  type: 'GET_SCAN';
  scanId: string;
}

export interface ScanRecordMessage extends MessageBase {
  type: 'SCAN_RECORD';
  scanId: string;
  payload: {
    raw: PageScan | null;
    normalized: NormalizedDesign | null;
    phase: ScanPhase;
  };
}

export interface StartExportMessage extends MessageBase {
  type: 'START_EXPORT';
  scanId: string;
  payload: ExportOptions;
}

export interface ExportProgressMessage extends MessageBase {
  type: 'EXPORT_PROGRESS';
  scanId: string;
  payload: { message: string; completed: number; total: number | null };
}

export interface ExportCompleteMessage extends MessageBase {
  type: 'EXPORT_COMPLETE';
  scanId: string;
  payload: { filename: string };
}

export interface ExportFailedMessage extends MessageBase {
  type: 'EXPORT_FAILED';
  scanId: string;
  payload: SerializedError;
}

export interface CaptureScreenshotMessage extends MessageBase {
  type: 'CAPTURE_SCREENSHOT';
  scanId: string;
}

export interface ScreenshotResultMessage extends MessageBase {
  type: 'SCREENSHOT_RESULT';
  scanId: string;
  payload: {
    dataUrl: string | null;
    fullPageDataUrl: string | null;
    fullPageTruncated: boolean;
    error: string | null;
  };
}

export interface LayoutSnapshotMessage extends MessageBase {
  type: 'LAYOUT_SNAPSHOT';
  payload: { label: string; snapshot?: LayoutSnapshot };
}

export interface ScanFrameMessage extends MessageBase {
  type: 'SCAN_FRAME';
  payload?: { frame?: CompactFrameScan };
}

export interface ClearScansMessage extends MessageBase {
  type: 'CLEAR_SCANS';
}

export interface ScansClearedMessage extends MessageBase {
  type: 'SCANS_CLEARED';
}

export interface FetchAssetMessage extends MessageBase {
  type: 'FETCH_ASSET';
  payload: { url: string };
}

export interface AssetBytesMessage extends MessageBase {
  type: 'ASSET_BYTES';
  payload: { url: string; mimeType: string | null; base64: string | null; error: string | null };
}

export interface ToggleOverlayMessage extends MessageBase {
  type: 'TOGGLE_OVERLAY';
}

export interface CloseOverlayMessage extends MessageBase {
  type: 'CLOSE_OVERLAY';
}

export interface DockSidePanelMessage extends MessageBase {
  type: 'DOCK_SIDE_PANEL';
}

export interface SetInspectModeMessage extends MessageBase {
  type: 'SET_INSPECT_MODE';
  payload: { enabled: boolean };
}

export interface HighlightColorMessage extends MessageBase {
  type: 'HIGHLIGHT_COLOR';
  payload: { hex: string | null; css?: string | null };
}

export interface HighlightColorResultMessage extends MessageBase {
  type: 'HIGHLIGHT_COLOR_RESULT';
  payload: { index: number; total: number; done: boolean };
}

export type ExtensionMessage =
  | PingMessage
  | PongMessage
  | ContentReadyMessage
  | GetActiveTabMessage
  | ActiveTabInfoMessage
  | StartScanMessage
  | CancelScanMessage
  | ScanProgressMessage
  | ScanChunkMessage
  | ScanCompleteMessage
  | ScanFailedMessage
  | GetScanMessage
  | ScanRecordMessage
  | StartExportMessage
  | ExportProgressMessage
  | ExportCompleteMessage
  | ExportFailedMessage
  | CaptureScreenshotMessage
  | ScreenshotResultMessage
  | ClearScansMessage
  | ScansClearedMessage
  | FetchAssetMessage
  | AssetBytesMessage
  | LayoutSnapshotMessage
  | ScanFrameMessage
  | ToggleOverlayMessage
  | CloseOverlayMessage
  | DockSidePanelMessage
  | SetInspectModeMessage
  | HighlightColorMessage
  | HighlightColorResultMessage;

const MESSAGE_TYPES = new Set<MessageType>([
  'PING',
  'PONG',
  'CONTENT_READY',
  'GET_ACTIVE_TAB',
  'ACTIVE_TAB_INFO',
  'START_SCAN',
  'CANCEL_SCAN',
  'SCAN_PROGRESS',
  'SCAN_CHUNK',
  'SCAN_COMPLETE',
  'SCAN_FAILED',
  'GET_SCAN',
  'SCAN_RECORD',
  'START_EXPORT',
  'EXPORT_PROGRESS',
  'EXPORT_COMPLETE',
  'EXPORT_FAILED',
  'CAPTURE_SCREENSHOT',
  'SCREENSHOT_RESULT',
  'CLEAR_SCANS',
  'SCANS_CLEARED',
  'FETCH_ASSET',
  'ASSET_BYTES',
  'LAYOUT_SNAPSHOT',
  'SCAN_FRAME',
  'TOGGLE_OVERLAY',
  'CLOSE_OVERLAY',
  'DOCK_SIDE_PANEL',
  'SET_INSPECT_MODE',
  'HIGHLIGHT_COLOR',
  'HIGHLIGHT_COLOR_RESULT',
]);

export function createMessage(partial: {
  type: MessageType;
  requestId: string;
  scanId?: string;
  payload?: unknown;
  schemaVersion?: string;
}): ExtensionMessage {
  return {
    schemaVersion: MESSAGE_SCHEMA_VERSION,
    ...partial,
  } as ExtensionMessage;
}

export function createRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function createScanId(): string {
  return `scan_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function parseMessage(value: unknown): ExtensionMessage | null {
  if (!isRecord(value)) return null;
  if (asString(value.schemaVersion) !== MESSAGE_SCHEMA_VERSION) return null;
  const type = asString(value.type) as MessageType;
  if (!MESSAGE_TYPES.has(type)) return null;
  if (!asString(value.requestId)) return null;
  return value as unknown as ExtensionMessage;
}

export function isMalformedMessage(value: unknown): boolean {
  return parseMessage(value) === null;
}

export function progressPayload(
  phase: ScanPhase,
  counts: ScanCounts,
  completedChunks: number,
  totalChunks: number | null,
  message: string,
): ScanProgress {
  return { phase, counts, completedChunks, totalChunks, message };
}

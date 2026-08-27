/**
 * Top chrome: inspect toggle, overflow menu, dock/close, and scan shortcuts.
 */
import { useRef } from 'react'
import type { PanelView } from '../../store/useScanStore'
import { Switch } from '../Switch'
import {
  CancelMenuIcon,
  ClearMenuIcon,
  CloseIcon,
  DockIcon,
  ExportMenuIcon,
  GripIcon,
  IdentifyMenuIcon,
  ResponsiveMenuIcon,
  MenuIcon,
  ScanMenuIcon,
} from '../LucideIcons'
import { startOverlayDrag } from './lib/start-overlay-drag'

interface Props {
  inspectOn: boolean
  menuOpen: boolean
  overlay: boolean
  busy: boolean
  canExport: boolean
  onToggleInspect: () => void
  onToggleMenu: () => void
  onDock: () => void
  onClose: () => void
  onIdentify: () => void
  onScan: () => void
  onCancel: () => void
  onExport: () => void
  onClear: () => void
  onOpen: (view: PanelView) => void
}

export function PanelChrome(props: Props) {
  const grip = useRef<HTMLButtonElement>(null)

  return (
    <div className="chrome">
      <button
        ref={grip}
        type="button"
        className="icon-btn grip"
        aria-label="Move panel"
        onPointerDown={(event) => startOverlayDrag(event)}>
        <GripIcon />
        <span className="tip tip-below tip-start">Move panel</span>
      </button>
      <Switch checked={props.inspectOn} onChange={props.onToggleInspect} label="Inspect Mode" />
      <div className="chrome-spacer" />
      <div className="chrome-actions">
        <button type="button" className="icon-btn" aria-label="Open side panel" onClick={props.onDock}>
          <DockIcon />
          <span className="tip tip-below">Open side panel</span>
        </button>
        <div className="menu-wrap">
          <button
            type="button"
            className={props.menuOpen ? 'icon-btn on' : 'icon-btn'}
            aria-label="More Options"
            aria-expanded={props.menuOpen}
            onClick={props.onToggleMenu}>
            <MenuIcon />
            <span className="tip tip-below">More Options</span>
          </button>
          {props.menuOpen ? (
            <div className="menu" role="menu">
              <button type="button" onClick={props.onIdentify}>
                <IdentifyMenuIcon />
                Identify tab
              </button>
              <button type="button" onClick={props.onScan} disabled={props.busy}>
                <ScanMenuIcon />
                Scan page
              </button>
              <button type="button" onClick={props.onCancel} disabled={!props.busy}>
                <CancelMenuIcon />
                Cancel scan
              </button>
              <button type="button" onClick={props.onExport} disabled={!props.canExport}>
                <ExportMenuIcon />
                Export ZIP
              </button>
              <button type="button" onClick={() => props.onOpen('responsive')}>
                <ResponsiveMenuIcon />
                Responsive
              </button>
              <button type="button" onClick={props.onClear}>
                <ClearMenuIcon />
                Clear local scan data
              </button>
            </div>
          ) : null}
        </div>
        <button type="button" className="icon-btn" aria-label="Close" onClick={props.onClose}>
          <CloseIcon />
          <span className="tip tip-below tip-end">Close</span>
        </button>
      </div>
    </div>
  )
}

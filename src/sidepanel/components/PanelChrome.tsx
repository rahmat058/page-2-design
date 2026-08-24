import { useRef } from 'react';
import type { PanelView } from '../store/useScanStore';
import { CloseIcon, DockIcon, GripIcon, MenuIcon } from './LucideIcons';

interface Props {
  inspectOn: boolean;
  menuOpen: boolean;
  overlay: boolean;
  busy: boolean;
  canExport: boolean;
  onToggleInspect: () => void;
  onToggleMenu: () => void;
  onDock: () => void;
  onClose: () => void;
  onIdentify: () => void;
  onScan: () => void;
  onCancel: () => void;
  onExport: () => void;
  onClear: () => void;
  onOpen: (view: PanelView) => void;
}

export function PanelChrome(props: Props) {
  const grip = useRef<HTMLButtonElement>(null);

  return (
    <div className="chrome">
      <button
        ref={grip}
        type="button"
        className="icon-btn grip"
        aria-label="Move panel"
        onPointerDown={(event) => startDrag(event)}
      >
        <GripIcon />
      </button>
      <label className="inspect-toggle">
        <span>Inspect Mode</span>
        <input type="checkbox" checked={props.inspectOn} onChange={props.onToggleInspect} />
        <span className="switch" />
      </label>
      <div className="chrome-spacer" />
      <button type="button" className="icon-btn" aria-label="Dock to side panel" onClick={props.onDock}>
        <DockIcon />
      </button>
      <div className="menu-wrap">
        <button
          type="button"
          className="icon-btn"
          aria-label="More actions"
          aria-expanded={props.menuOpen}
          onClick={props.onToggleMenu}
        >
          <MenuIcon />
        </button>
        {props.menuOpen ? (
          <div className="menu" role="menu">
            <button type="button" onClick={props.onIdentify}>
              Identify tab
            </button>
            <button type="button" onClick={props.onScan} disabled={props.busy}>
              Scan page
            </button>
            <button type="button" onClick={props.onCancel} disabled={!props.busy}>
              Cancel scan
            </button>
            <button type="button" onClick={props.onExport} disabled={!props.canExport}>
              Export ZIP
            </button>
            <button type="button" onClick={() => props.onOpen('layout')}>
              Layout
            </button>
            <button type="button" onClick={props.onClear}>
              Clear local scan data
            </button>
          </div>
        ) : null}
      </div>
      <button type="button" className="icon-btn" aria-label="Close" onClick={props.onClose}>
        <CloseIcon />
      </button>
    </div>
  );
}

function startDrag(event: React.PointerEvent<HTMLButtonElement>): void {
  if (window === window.top) return;
  event.preventDefault();
  event.stopPropagation();
  const target = event.currentTarget;
  target.setPointerCapture(event.pointerId);
  postOverlay({ type: 'dragstart', screenX: event.screenX, screenY: event.screenY });

  let latestX = event.screenX;
  let latestY = event.screenY;
  let frame = 0;

  const flush = () => {
    frame = 0;
    postOverlay({ type: 'move', screenX: latestX, screenY: latestY });
  };

  const move = (next: PointerEvent) => {
    latestX = next.screenX;
    latestY = next.screenY;
    if (!frame) frame = requestAnimationFrame(flush);
  };

  const end = () => {
    if (frame) cancelAnimationFrame(frame);
    flush();
    postOverlay({ type: 'dragend' });
    try {
      target.releasePointerCapture(event.pointerId);
    } catch {
      /* already released */
    }
    target.removeEventListener('pointermove', move);
    target.removeEventListener('pointerup', end);
    target.removeEventListener('pointercancel', end);
  };

  target.addEventListener('pointermove', move);
  target.addEventListener('pointerup', end);
  target.addEventListener('pointercancel', end);
}

function postOverlay(payload: { type: string; screenX?: number; screenY?: number }): void {
  window.parent.postMessage({ source: 'page2design', ...payload }, '*');
}

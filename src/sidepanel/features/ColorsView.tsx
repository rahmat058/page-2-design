import { useState } from 'react';
import { isDarkHex } from '../../normalize/colors';
import { createRequestId } from '../../shared/messages';
import type { ColorToken } from '../../shared/types';
import { sendRuntime } from '../chrome-api';
import { CopyButton, ScanPrompt } from '../components/CopyButton';
import { CopyIcon, InspectIcon } from '../components/LucideIcons';
import { useScanStore } from '../store/useScanStore';
import { useToastStore } from '../toast';

export function ColorsView() {
  const colors = useScanStore((s) => s.design?.tokens.colors ?? []);
  const [tab, setTab] = useState<'palette' | 'categories'>('palette');
  if (colors.length === 0) return <ScanPrompt afterScan="No colors were captured." />;
  const grouped = groupByRole(colors);
  return (
    <div className="colors-wrap">
      <div className="segmented pill-tabs" role="tablist" aria-label="Color views">
        <button
          type="button"
          role="tab"
          className={tab === 'palette' ? 'on' : ''}
          aria-selected={tab === 'palette'}
          onClick={() => {
              if (tab === 'palette') return;
              setTab('palette');
              useToastStore.getState().showToast('Palette');
            }}
        >
          Palette
        </button>
        <button
          type="button"
          role="tab"
          className={tab === 'categories' ? 'on' : ''}
          aria-selected={tab === 'categories'}
          onClick={() => {
              if (tab === 'categories') return;
              setTab('categories');
              useToastStore.getState().showToast('Categories');
            }}
        >
          Categories
        </button>
      </div>
      <div key={tab} className="fade-pane">
        {tab === 'palette' ? (
          <div className="palette peeper-palette">
            {colors.map((color) => (
              <ColorCard key={color.id} color={color} />
            ))}
          </div>
        ) : (
          <div className="category-list">
            {Object.entries(grouped).map(([role, items]) => (
              <section key={role} className="category-block">
                <h3>{role}</h3>
                <div className="peeper-palette">
                  {items.map((color) => (
                    <ColorCard key={color.id} color={color} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ColorCard({ color }: { color: ColorToken }) {
  const ink = isDarkHex(color.hex) ? '#fff' : '#111';
  const translucent = color.hex.length > 7;
  return (
    <div
      className={translucent ? 'palette-card peeper-card checker' : 'palette-card peeper-card'}
      style={{ background: color.hex, color: ink }}
    >
      <div className="peeper-copy">
        <strong>{color.hex}</strong>
        <span>
          {color.count} {color.count === 1 ? 'instance' : 'instances'}
        </span>
      </div>
      <div className="peeper-actions">
        <button
          type="button"
          className="swatch-action"
          aria-label={`Inspect ${color.hex} on the page`}
          onClick={() => void inspectColor(color.hex)}
        >
          <InspectIcon />
        </button>
        <button
          type="button"
          className="swatch-action"
          aria-label={`Copy ${color.hex}`}
          onClick={() => void copyColor(color.hex)}
        >
          <CopyIcon />
        </button>
      </div>
    </div>
  );
}

async function copyColor(hex: string): Promise<void> {
  await navigator.clipboard.writeText(hex);
  useToastStore.getState().showToast(`${hex} copied`);
}

async function inspectColor(hex: string): Promise<void> {
  useToastStore.getState().showToast(`Inspecting ${hex}`);
  await sendRuntime({
    type: 'SET_INSPECT_MODE',
    requestId: createRequestId(),
    payload: { enabled: true },
  });
  await sendRuntime({
    type: 'HIGHLIGHT_COLOR',
    requestId: createRequestId(),
    payload: { hex },
  });
}

export function TypographyView() {
  const tokens = useScanStore((s) => s.design?.tokens.typography ?? []);
  if (tokens.length === 0) return <ScanPrompt afterScan="No typography was captured." />;
  return (
    <div className="type-list">
      {tokens.map((token) => (
        <article key={token.id} className="type-card">
          <div className="row">
            <h3>{prettyTypeName(token.name)}</h3>
            <span className="muted">
              {token.count} {token.count === 1 ? 'instance' : 'instances'}
            </span>
          </div>
          <p
            className="type-preview"
            style={{
              fontFamily: token.fontFamily,
              fontSize: token.fontSize,
              fontWeight: token.fontWeight as never,
              lineHeight: token.lineHeight,
            }}
          >
            AaBbCc
          </p>
          <p className="muted">
            {primaryFont(token.fontFamily)} · {token.fontSize} / {token.lineHeight} · {token.fontWeight}
          </p>
          {token.licenseReviewRequired ? (
            <span className="badge warning">Font license review</span>
          ) : null}
          <CopyButton
            value={`${token.fontFamily}; ${token.fontSize}; ${token.fontWeight}; ${token.lineHeight}`}
            label="Copy values"
          />
        </article>
      ))}
    </div>
  );
}

export function LayoutView() {
  const design = useScanStore((s) => s.design);
  if (!design) return <ScanPrompt afterScan="No layout data was captured." />;
  return (
    <>
      <section className="card">
        <h2>Sections</h2>
        <div className="list">
          {design.sections.map((section) => (
            <div key={section.id}>
              <strong>{section.name}</strong>
              <div className="muted">
                {section.provenance} · confidence {section.confidence} · {section.bounds.width}×
                {section.bounds.height}
              </div>
            </div>
          ))}
        </div>
      </section>
      <section className="card">
        <h2>Spacing / radius / shadow</h2>
        {[...design.tokens.spacing, ...design.tokens.radii, ...design.tokens.shadows].map((token) => (
          <div key={token.id} className="row">
            <span>
              {token.name}: {token.value}
            </span>
            <CopyButton value={token.value} label="Copy" />
          </div>
        ))}
      </section>
    </>
  );
}

function prettyTypeName(name: string): string {
  if (/h1|heading-1|display/i.test(name)) return 'Heading 1';
  if (/h2|heading-2/i.test(name)) return 'Heading 2';
  if (/h3|heading-3/i.test(name)) return 'Heading 3';
  if (/body|paragraph|text/i.test(name)) return 'Paragraph';
  return name.replace(/[-_]/g, ' ');
}

function primaryFont(stack: string): string {
  return stack.split(',')[0]?.replace(/['"]/g, '').trim() || stack;
}

function groupByRole(colors: ColorToken[]) {
  const groups: Record<string, ColorToken[]> = {};
  for (const color of colors) {
    const key = color.role || 'other';
    groups[key] ??= [];
    groups[key].push(color);
  }
  return groups;
}

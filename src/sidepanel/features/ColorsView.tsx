import { useState } from 'react';
import { isDarkHex, parseColor, pagePaletteGroups } from '../../normalize/colors';
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
  const [inspectingId, setInspectingId] = useState<string | null>(null);
  if (colors.length === 0) return <ScanPrompt afterScan="No colors were captured." />;
  const grouped = pagePaletteGroups(colors);
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
      <div key={tab} className="fade-pane colors-scroll">
        {tab === 'palette' ? (
          <div className="palette peeper-palette">
            {grouped.map((group) => (
              <section key={group.key} className="palette-group">
                <h3>{group.title}</h3>
                {group.ids.map((id) => {
                  const color = colors.find((item) => item.id === id);
                  if (!color) return null;
                  return (
                    <ColorCard
                      key={color.id}
                      color={color}
                      inspecting={inspectingId === color.id}
                      onInspect={() => void toggleInspectColor(color, inspectingId, setInspectingId)}
                    />
                  );
                })}
              </section>
            ))}
          </div>
        ) : (
          <div className="category-list">
            {grouped.map((group) => (
              <section key={group.key} className="category-block">
                <h3>{group.title}</h3>
                <div className="peeper-palette">
                  {group.ids.map((id) => {
                    const color = colors.find((item) => item.id === id);
                    if (!color) return null;
                    return (
                      <ColorCard
                        key={color.id}
                        color={color}
                        inspecting={inspectingId === color.id}
                        onInspect={() => void toggleInspectColor(color, inspectingId, setInspectingId)}
                      />
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ColorCard({
  color,
  inspecting,
  onInspect,
}: {
  color: ColorToken;
  inspecting: boolean;
  onInspect: () => void;
}) {
  const gradient = color.kind === 'gradient';
  const fill = color.css || color.rgba || color.hex;
  const ink = isDarkHex(color.hex) ? '#fff' : '#111';
  const parsed = parseColor(color.hex);
  const translucent = !gradient && Boolean(parsed && parsed.a < 0.96);
  const copyValue = gradient ? color.css : color.hex;
  const label = gradient ? color.name : color.hex;
  return (
    <div
      className={[
        'palette-card peeper-card',
        translucent ? 'checker' : '',
        isLightSwatch(color.hex) ? 'light-swatch' : '',
        inspecting ? 'inspecting' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      style={{ background: fill, color: ink, ['--swatch' as string]: color.rgba }}
    >
      <div className="peeper-copy">
        <strong>{label}</strong>
        <span>
          {color.count} {color.count === 1 ? 'instance' : 'instances'}
        </span>
      </div>
      <div className="peeper-actions">
        <button
          type="button"
          className={inspecting ? 'swatch-action on' : 'swatch-action'}
          aria-label={`Inspect ${label} on the page`}
          aria-pressed={inspecting}
          onClick={onInspect}
        >
          <InspectIcon />
        </button>
        <button
          type="button"
          className="swatch-action"
          aria-label={`Copy ${label}`}
          onClick={() => void copyColor(copyValue, label)}
        >
          <CopyIcon />
        </button>
      </div>
    </div>
  );
}

function isLightSwatch(hex: string): boolean {
  const parsed = parseColor(hex);
  if (!parsed) return false;
  const luminance = (0.2126 * parsed.r + 0.7152 * parsed.g + 0.0722 * parsed.b) / 255;
  return luminance > 0.9;
}

async function copyColor(value: string, label: string): Promise<void> {
  await navigator.clipboard.writeText(value);
  useToastStore.getState().showToast(`${label} copied`);
}

async function toggleInspectColor(
  color: ColorToken,
  inspectingId: string | null,
  setInspectingId: (id: string | null) => void,
): Promise<void> {
  const turningOff = inspectingId === color.id;
  if (turningOff) {
    await sendRuntime({
      type: 'HIGHLIGHT_COLOR',
      requestId: createRequestId(),
      payload: { hex: null },
    });
    setInspectingId(null);
    useToastStore.getState().showToast('Inspect off');
    return;
  }
  await sendRuntime({
    type: 'HIGHLIGHT_COLOR',
    requestId: createRequestId(),
    payload: { hex: color.hex, css: color.css ?? color.hex },
  });
  setInspectingId(color.id);
  useToastStore.getState().showToast(`Inspecting ${color.kind === 'gradient' ? color.name : color.hex}`);
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

import { useState } from 'react';
import { isDarkHex } from '../../normalize/colors';
import { CopyButton, ScanPrompt } from '../components/CopyButton';
import { useScanStore } from '../store/useScanStore';

export function ColorsView() {
  const colors = useScanStore((s) => s.design?.tokens.colors ?? []);
  const [tab, setTab] = useState<'palette' | 'categories'>('palette');
  if (colors.length === 0) return <ScanPrompt afterScan="No colors were captured." />;
  const grouped = groupByRole(colors);
  return (
    <div className="colors-wrap">
      <div className="segmented">
        <button type="button" className={tab === 'palette' ? 'on' : ''} onClick={() => setTab('palette')}>
          Palette
        </button>
        <button
          type="button"
          className={tab === 'categories' ? 'on' : ''}
          onClick={() => setTab('categories')}
        >
          Categories
        </button>
      </div>
      {tab === 'palette' ? (
        <div className="palette compact-palette">
          {colors.map((color) => (
            <button
              key={color.id}
              type="button"
              className="palette-card"
              style={{ background: color.hex, color: isDarkHex(color.hex) ? '#fff' : '#111' }}
              onClick={() => void navigator.clipboard.writeText(color.hex)}
            >
              <strong>{color.hex}</strong>
              <span>
                {color.count} {color.count === 1 ? 'instance' : 'instances'}
              </span>
            </button>
          ))}
        </div>
      ) : (
        <div className="category-list">
          {Object.entries(grouped).map(([role, items]) => (
            <section key={role} className="category-block">
              <h3>{role}</h3>
              <div className="swatch-grid">
                {items.map((color) => (
                  <button
                    key={color.id}
                    type="button"
                    className="mini-swatch"
                    title={`${color.hex} · ${color.count} instances`}
                    style={{ background: color.hex, color: isDarkHex(color.hex) ? '#fff' : '#111' }}
                    onClick={() => void navigator.clipboard.writeText(color.hex)}
                  >
                    <span>{color.hex}</span>
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
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

function groupByRole(colors: Array<{ id: string; hex: string; count: number; role: string }>) {
  const groups: Record<string, typeof colors> = {};
  for (const color of colors) {
    const key = color.role || 'other';
    groups[key] ??= [];
    groups[key].push(color);
  }
  return groups;
}

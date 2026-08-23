import { isDarkHex } from '../../normalize/colors';
import { CopyButton, EmptyState } from '../components/CopyButton';
import { useScanStore } from '../store/useScanStore';

export function ColorsView() {
  const colors = useScanStore((s) => s.design?.tokens.colors ?? []);
  if (colors.length === 0) return <EmptyState>No colors captured.</EmptyState>;
  return (
    <div className="palette">
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
      <p className="muted">Tap a color to copy its hex value.</p>
    </div>
  );
}

export function TypographyView() {
  const tokens = useScanStore((s) => s.design?.tokens.typography ?? []);
  if (tokens.length === 0) return <EmptyState>No typography captured.</EmptyState>;
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
            AaBbCcDdEeFfGgHhIiJjKkLlMmNnOoPpQq
          </p>
          <p className="muted">
            {token.fontFamily} · {token.fontSize} / {token.lineHeight} · {token.fontWeight}
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
  if (!design) return <EmptyState>No layout data yet.</EmptyState>;
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
        {[...design.tokens.spacing, ...design.tokens.radii, ...design.tokens.shadows].map(
          (token) => (
            <div key={token.id} className="row">
              <span>
                {token.name}: {token.value}
              </span>
              <CopyButton value={token.value} label="Copy" />
            </div>
          ),
        )}
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

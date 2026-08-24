import { coverageSummary } from '../../validation/coverage';
import { contrastPairs } from '../../normalize/colors';
import { CopyButton, EmptyState } from '../components/CopyButton';
import { useScanStore } from '../store/useScanStore';

export function OverviewView() {
  const design = useScanStore((s) => s.design);
  const phase = useScanStore((s) => s.phase);
  const progressMessage = useScanStore((s) => s.progressMessage);
  const completedChunks = useScanStore((s) => s.completedChunks);
  const totalChunks = useScanStore((s) => s.totalChunks);
  const error = useScanStore((s) => s.error);
  const options = useScanStore((s) => s.options);
  const setOptions = useScanStore((s) => s.setOptions);

  const width =
    totalChunks && totalChunks > 0
      ? Math.round((completedChunks / totalChunks) * 100)
      : phase === 'ready'
        ? 100
        : 0;

  const headingFont = primaryFont(
    design?.tokens.typography.find((token) => /heading|h1|display/i.test(token.name))?.fontFamily ??
      design?.tokens.typography[0]?.fontFamily,
  );
  const bodyFont = primaryFont(
    design?.tokens.typography.find((token) => /body|paragraph/i.test(token.name))?.fontFamily ??
      design?.tokens.typography[1]?.fontFamily,
  );

  return (
    <>
      {phase !== 'idle' && phase !== 'ready' && phase !== 'complete' ? (
        <section className="scan-strip">
          <span>{progressMessage || phase}</span>
          <div className="progress" aria-label="Scan progress">
            <span style={{ width: `${width}%` }} />
          </div>
        </section>
      ) : null}
      {error ? <p className="badge error">{error}</p> : null}

      {design ? (
        <>
          <section className="type-pair">
            <div>
              <span className="muted">Headings</span>
              <strong>{headingFont}</strong>
            </div>
            <div>
              <span className="muted">Body</span>
              <strong>{bodyFont}</strong>
            </div>
          </section>
          <section>
            <div className="row">
              <h2>Color Palette</h2>
              <button
                type="button"
                className="link"
                onClick={() => useScanStore.getState().setView('colors')}
              >
                Show all
              </button>
            </div>
            <div className="swatch-row">
              {design.tokens.colors.slice(0, 10).map((color) => (
                <span
                  key={color.id}
                  className="swatch"
                  style={{ background: color.hex }}
                  title={color.hex}
                />
              ))}
            </div>
          </section>
          <section>
            <div className="row">
              <h2>Contrast Scanner</h2>
              <span className="count-pill">{contrastPairs(design.tokens.colors).length}</span>
            </div>
            <div className="list compact">
              {contrastPairs(design.tokens.colors).map((item) => (
                <div key={`${item.fg}-${item.bg}`} className="contrast-row">
                  <span className="contrast-preview" style={{ color: item.fg, background: item.bg }}>
                    Aa
                  </span>
                  <span>
                    {item.ratio.toFixed(2)} : 1
                  </span>
                  <span className={`badge ${item.tone}`}>{item.label}</span>
                </div>
              ))}
            </div>
          </section>
        </>
      ) : (
        <EmptyState>
          {phase === 'idle' ? 'Opening this page…' : 'Scanning this page for fonts, colors, and assets.'}
        </EmptyState>
      )}

      <details className="more-details">
        <summary>Scan options</summary>
        <div className="option-grid">
          <label className="check">
            <input
              type="checkbox"
              checked={options.loadLazyContent}
              onChange={(e) => setOptions({ loadLazyContent: e.target.checked })}
            />
            <span>Load lazy content</span>
          </label>
          <label className="check">
            <input
              type="checkbox"
              checked={options.includeNavigationAndFooter}
              onChange={(e) => setOptions({ includeNavigationAndFooter: e.target.checked })}
            />
            <span>Include nav and footer</span>
          </label>
          <label className="check">
            <input
              type="checkbox"
              checked={options.includeHiddenStructural}
              onChange={(e) => setOptions({ includeHiddenStructural: e.target.checked })}
            />
            <span>Include hidden structure</span>
          </label>
          <label className="check wide">
            <input
              type="checkbox"
              checked={options.captureExtraViewports}
              onChange={(e) => setOptions({ captureExtraViewports: e.target.checked })}
            />
            <span>Record tablet and mobile breakpoints without resizing</span>
          </label>
        </div>
        {design ? (
          <>
            <p>{coverageSummary(design.coverage)}</p>
            <CopyButton value={JSON.stringify(design.coverage, null, 2)} label="Copy coverage JSON" />
          </>
        ) : null}
      </details>
    </>
  );
}

function primaryFont(stack: string | undefined): string {
  if (!stack) return '—';
  return stack.split(',')[0]?.replace(/['"]/g, '').trim() || stack;
}

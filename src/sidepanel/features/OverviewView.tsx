import { coverageSummary } from '../../validation/coverage';
import { contrastPairs } from '../../normalize/colors';
import { CopyButton, EmptyState } from '../components/CopyButton';
import { useScanStore } from '../store/useScanStore';

export function OverviewView() {
  const design = useScanStore((s) => s.design);
  const hostname = useScanStore((s) => s.hostname);
  const url = useScanStore((s) => s.url);
  const phase = useScanStore((s) => s.phase);
  const counts = useScanStore((s) => s.counts);
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

  return (
    <>
      <section className="card">
        <h2>Scan status</h2>
        <p className="host">{hostname ?? 'No tab identified yet'}</p>
        <p className="muted">{url}</p>
        <p>
          Phase: <strong>{phase}</strong>
        </p>
        {progressMessage ? <p className="muted">{progressMessage}</p> : null}
        <div className="progress" aria-label="Scan progress">
          <span style={{ width: `${width}%` }} />
        </div>
        <p className="muted">
          {totalChunks
            ? `Completed ${completedChunks} of ${totalChunks} known chunks.`
            : 'Progress is based on completed phases, not an estimated percentage.'}
        </p>
        {error ? <p className="badge error">{error}</p> : null}
      </section>

      {design ? (
        <>
          <section className="card">
            <h2>Typography</h2>
            <div className="font-pair">
              <div>
                <span className="muted">Headings</span>
                <strong>
                  {design.tokens.typography.find((token) => /heading|h1|display/i.test(token.name))
                    ?.fontFamily ??
                    design.tokens.typography[0]?.fontFamily ??
                    '—'}
                </strong>
              </div>
              <div>
                <span className="muted">Body</span>
                <strong>
                  {design.tokens.typography.find((token) => /body|paragraph/i.test(token.name))
                    ?.fontFamily ??
                    design.tokens.typography[1]?.fontFamily ??
                    '—'}
                </strong>
              </div>
            </div>
          </section>
          <section className="card">
            <div className="row">
              <h2>Colors</h2>
              <button
                type="button"
                className="link"
                onClick={() => useScanStore.getState().setView('colors')}
              >
                Show all
              </button>
            </div>
            <div className="swatch-row">
              {design.tokens.colors.slice(0, 9).map((color) => (
                <span
                  key={color.id}
                  className="swatch"
                  style={{ background: color.hex }}
                  title={color.hex}
                />
              ))}
            </div>
          </section>
          <section className="card">
            <div className="row">
              <h2>Contrast scanner</h2>
              <span className="count-pill">{contrastPairs(design.tokens.colors).length}</span>
            </div>
            <div className="list">
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
      ) : null}

      <section className="card">
        <h2>Counts</h2>
        <div className="counts">
          <div className="count">
            <strong>{counts.elements}</strong>
            <span className="muted">Elements</span>
          </div>
          <div className="count">
            <strong>{counts.textBlocks}</strong>
            <span className="muted">Text blocks</span>
          </div>
          <div className="count">
            <strong>{counts.images}</strong>
            <span className="muted">Images / assets</span>
          </div>
          <div className="count">
            <strong>{counts.colors}</strong>
            <span className="muted">Colors</span>
          </div>
          <div className="count">
            <strong>{counts.typography}</strong>
            <span className="muted">Typography</span>
          </div>
        </div>
      </section>

      <section className="card">
        <h2>Scan options</h2>
        <label className="checkbox">
          <input
            type="checkbox"
            checked={options.loadLazyContent}
            onChange={(e) => setOptions({ loadLazyContent: e.target.checked })}
          />
          Load lazy content
        </label>
        <label className="checkbox">
          <input
            type="checkbox"
            checked={options.includeNavigationAndFooter}
            onChange={(e) => setOptions({ includeNavigationAndFooter: e.target.checked })}
          />
          Include navigation and footer
        </label>
        <label className="checkbox">
          <input
            type="checkbox"
            checked={options.includeHiddenStructural}
            onChange={(e) => setOptions({ includeHiddenStructural: e.target.checked })}
          />
          Include hidden structural elements
        </label>
        <label className="checkbox">
          <input
            type="checkbox"
            checked={options.captureExtraViewports}
            onChange={(e) => setOptions({ captureExtraViewports: e.target.checked })}
          />
          Record tablet and mobile breakpoints without resizing the window
        </label>
        <label className="field">
          Content scope
          <select
            value={options.contentScope}
            onChange={(e) =>
              setOptions({ contentScope: e.target.value as typeof options.contentScope })
            }
          >
            <option value="visible">Visible content</option>
            <option value="main">Main content when detectable</option>
          </select>
        </label>
      </section>

      {design ? (
        <section className="card">
          <h2>Coverage</h2>
          <p>{coverageSummary(design.coverage)}</p>
          <p className="muted">This is capture coverage, not a visual-match score.</p>
          {design.coverage.notes.map((note) => (
            <p key={note} className="muted">
              {note}
            </p>
          ))}
          <CopyButton value={JSON.stringify(design.coverage, null, 2)} label="Copy coverage JSON" />
        </section>
      ) : (
        <EmptyState>Scan a page to see coverage and limitations.</EmptyState>
      )}

      {design?.limitations.length ? (
        <section className="card">
          <h2>Limitations</h2>
          <div className="list">
            {design.limitations.map((item) => (
              <div key={`${item.code}-${item.message}`}>
                <span className={`badge ${item.severity}`}>{item.code}</span> {item.message}
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}

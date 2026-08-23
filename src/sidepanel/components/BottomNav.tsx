import { useScanStore, type PanelView } from '../store/useScanStore';

const ITEMS: { id: PanelView; label: string; icon: 'grid' | 'drop' | 'type' | 'image' | 'user' }[] = [
  { id: 'overview', label: 'Overview', icon: 'grid' },
  { id: 'colors', label: 'Colors', icon: 'drop' },
  { id: 'typography', label: 'Typography', icon: 'type' },
  { id: 'assets', label: 'Assets', icon: 'image' },
  { id: 'export', label: 'Export', icon: 'user' },
];

export function BottomNav() {
  const view = useScanStore((s) => s.view);
  const setView = useScanStore((s) => s.setView);
  const active =
    view === 'images' || view === 'icons' ? 'assets' : view === 'content' || view === 'layout' ? 'overview' : view;

  return (
    <nav className="bottom-nav" aria-label="Primary">
      {ITEMS.map((item) => (
        <button
          key={item.id}
          type="button"
          className={active === item.id ? 'nav-btn on' : 'nav-btn'}
          aria-current={active === item.id ? 'page' : undefined}
          aria-label={item.label}
          onClick={() => setView(item.id)}
        >
          <NavIcon name={item.icon} />
        </button>
      ))}
    </nav>
  );
}

function NavIcon({ name }: { name: 'grid' | 'drop' | 'type' | 'image' | 'user' }) {
  if (name === 'grid') {
    return (
      <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
        <rect x="3" y="3" width="6" height="6" rx="1.2" fill="currentColor" />
        <rect x="11" y="3" width="6" height="6" rx="1.2" fill="currentColor" />
        <rect x="3" y="11" width="6" height="6" rx="1.2" fill="currentColor" />
        <rect x="11" y="11" width="6" height="6" rx="1.2" fill="currentColor" />
      </svg>
    );
  }
  if (name === 'drop') {
    return (
      <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
        <path
          d="M10 2.5c2.8 3.4 6 6.6 6 9.3A6 6 0 0 1 4 11.8C4 9.1 7.2 5.9 10 2.5Z"
          fill="currentColor"
        />
      </svg>
    );
  }
  if (name === 'type') {
    return (
      <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
        <path d="M4 4h12v2H12v10H8V6H4V4Z" fill="currentColor" />
      </svg>
    );
  }
  if (name === 'image') {
    return (
      <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
        <rect x="3" y="4" width="14" height="12" rx="2" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <circle cx="7.5" cy="8.2" r="1.3" fill="currentColor" />
        <path d="M4.5 14.5 8 11l3 3 2-2 3 2.5" stroke="currentColor" strokeWidth="1.4" fill="none" />
      </svg>
    );
  }
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
      <circle cx="10" cy="7" r="3" fill="currentColor" />
      <path d="M4 16.5c.8-3 3-4.5 6-4.5s5.2 1.5 6 4.5" fill="currentColor" />
    </svg>
  );
}

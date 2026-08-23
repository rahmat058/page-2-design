import { useScanStore, type PanelView } from '../store/useScanStore';
import { AssetsIcon, ColorsIcon, OverviewIcon, ProfileIcon, TypeIcon } from './LucideIcons';

const ITEMS: { id: PanelView; label: string; icon: typeof OverviewIcon }[] = [
  { id: 'overview', label: 'Overview', icon: OverviewIcon },
  { id: 'colors', label: 'Colors', icon: ColorsIcon },
  { id: 'typography', label: 'Typography', icon: TypeIcon },
  { id: 'assets', label: 'Assets', icon: AssetsIcon },
  { id: 'export', label: 'Export', icon: ProfileIcon },
];

export function BottomNav() {
  const view = useScanStore((s) => s.view);
  const setView = useScanStore((s) => s.setView);
  const active =
    view === 'images' || view === 'icons'
      ? 'assets'
      : view === 'content' || view === 'layout'
        ? 'overview'
        : view;

  return (
    <nav className="bottom-nav" aria-label="Primary">
      {ITEMS.map((item) => {
        const Icon = item.icon;
        return (
          <button
            key={item.id}
            type="button"
            className={active === item.id ? 'nav-btn on' : 'nav-btn'}
            aria-current={active === item.id ? 'page' : undefined}
            aria-label={item.label}
            onClick={() => setView(item.id)}
          >
            <Icon />
          </button>
        );
      })}
    </nav>
  );
}

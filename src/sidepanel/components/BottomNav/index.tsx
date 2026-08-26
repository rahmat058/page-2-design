/**
 * Primary bottom navigation between overview, content, tokens, markdown, and export.
 */
import { useScanStore } from '../../store/useScanStore'
import { BOTTOM_NAV_ITEMS, resolveActiveNav } from './lib/nav-items'

export function BottomNav() {
  const view = useScanStore((s) => s.view)
  const setView = useScanStore((s) => s.setView)
  const active = resolveActiveNav(view)

  return (
    <nav className="bottom-nav" aria-label="Primary">
      {BOTTOM_NAV_ITEMS.map((item) => {
        const Icon = item.icon
        return (
          <button
            key={item.id}
            type="button"
            className={active === item.id ? 'nav-btn on' : 'nav-btn'}
            aria-current={active === item.id ? 'page' : undefined}
            aria-label={item.label}
            onClick={() => {
              if (active === item.id) return
              setView(item.id)
            }}>
            <Icon />
            <span className="nav-tip">{item.label}</span>
          </button>
        )
      })}
    </nav>
  )
}

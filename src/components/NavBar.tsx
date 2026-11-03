import { motion } from 'framer-motion'
import {
  LayoutGrid,
  LockKeyhole,
  MousePointerClick,
  Search,
  Settings2,
  Vault,
  WandSparkles,
} from 'lucide-react'
import type { Page } from '../types'
import { useStore } from '../store'
import { Brand } from './Logo'
import { WindowControls } from './WindowControls'

const links: { page: Page; label: string; icon: typeof LayoutGrid }[] = [
  { page: 'home', label: 'Home', icon: LayoutGrid },
  { page: 'vault', label: 'Vault', icon: Vault },
  { page: 'generator', label: 'Forge', icon: WandSparkles },
  { page: 'autofill', label: 'Autofill', icon: MousePointerClick },
  { page: 'settings', label: 'Settings', icon: Settings2 },
]

export function NavBar({ page, onNavigate }: { page: Page; onNavigate: (page: Page) => void }) {
  const { openPalette, lock, info, isDesktop } = useStore()
  const shortcut = info?.platform === 'darwin' ? '⌘K' : 'Ctrl K'

  return (
    <div className="chrome">
      <span className="app-drag" aria-hidden="true" />
      <nav className="nav" aria-label="Primary">
        <Brand />
        <span className="nav-divider" aria-hidden="true" />
        <div className="nav-links">
          {links.map(({ page: target, label, icon: Icon }) => {
            const active = page === target
            return (
              <button
                key={target}
                type="button"
                className={`nav-link${active ? ' is-active' : ''}`}
                onClick={() => onNavigate(target)}
                aria-current={active ? 'page' : undefined}
                aria-label={label}
                title={label}
              >
                {active && (
                  <motion.span
                    layoutId="nav-active"
                    className="nav-pill"
                    transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                  />
                )}
                <span className="nav-link__inner">
                  <Icon strokeWidth={1.8} />
                  <span className="nav-label">{label}</span>
                </span>
              </button>
            )
          })}
        </div>
        <span className="nav-divider" aria-hidden="true" />
        <div className="nav-right">
          <button
            type="button"
            className="nav-search"
            onClick={openPalette}
            title="Quick search"
            aria-label="Quick search"
          >
            <Search strokeWidth={2} />
            <span>Search</span>
            <kbd className="kbd">{shortcut}</kbd>
          </button>
          <button
            type="button"
            className="nav-lock tip"
            data-tip="Lock vault"
            onClick={lock}
            aria-label="Lock vault"
          >
            <LockKeyhole strokeWidth={2.1} />
          </button>
        </div>
      </nav>
      {isDesktop && (
        <div className="chrome__controls">
          <WindowControls />
        </div>
      )}
    </div>
  )
}

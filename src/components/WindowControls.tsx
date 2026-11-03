import { useEffect, useState } from 'react'
import { Minus, Square, X } from 'lucide-react'
import { useStore } from '../store'

export function WindowControls() {
  const { isDesktop } = useStore()
  const [maximized, setMaximized] = useState(false)

  useEffect(() => {
    if (!isDesktop) return
    return window.vault.onWindowState((state) => setMaximized(state.maximized))
  }, [isDesktop])

  if (!isDesktop) return null

  return (
    <div className="win-controls" aria-label="Window controls">
      <button
        type="button"
        className="win-dot win-dot--min"
        aria-label="Minimize"
        title="Minimize"
        onClick={() => void window.vault.windowControl('minimize')}
      >
        <Minus strokeWidth={3} />
      </button>
      <button
        type="button"
        className="win-dot win-dot--max"
        aria-label={maximized ? 'Restore' : 'Maximize'}
        title={maximized ? 'Restore' : 'Maximize'}
        onClick={() => void window.vault.windowControl('maximize')}
      >
        <Square strokeWidth={3} />
      </button>
      <button
        type="button"
        className="win-dot win-dot--close"
        aria-label="Close"
        title="Close"
        onClick={() => void window.vault.windowControl('close')}
      >
        <X strokeWidth={3} />
      </button>
    </div>
  )
}

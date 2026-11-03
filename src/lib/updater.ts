import { useCallback, useEffect, useState } from 'react'
import type { UpdateState } from '../types'

const EMPTY: UpdateState = { status: 'idle', currentVersion: '' }

/**
 * Subscribes to the main-process updater. Every consumer gets the same
 * authoritative state; the main process only broadcasts when it changes.
 */
export function useUpdater() {
  const [state, setState] = useState<UpdateState>(EMPTY)
  const [checking, setChecking] = useState(false)

  useEffect(() => {
    if (!window.vault?.isElectron) return
    let active = true
    const apply = (next: UpdateState) => {
      if (active) setState(next)
    }
    window.vault
      .updaterState()
      .then(apply)
      .catch(() => {})
    const off = window.vault.onUpdaterState(apply)
    return () => {
      active = false
      off()
    }
  }, [])

  const check = useCallback(async () => {
    if (!window.vault?.isElectron) return null
    setChecking(true)
    try {
      const next = await window.vault.updaterCheck()
      setState(next)
      return next
    } catch {
      return null
    } finally {
      setChecking(false)
    }
  }, [])

  const download = useCallback(() => {
    if (!window.vault?.isElectron) return
    void window.vault.updaterDownload().catch(() => {})
  }, [])

  const install = useCallback(() => {
    if (!window.vault?.isElectron) return
    void window.vault.updaterInstall().catch(() => {})
  }, [])

  return { state, checking, check, download, install }
}

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import type {
  Activity,
  ActivityKind,
  AppInfo,
  CustomField,
  ItemType,
  Settings,
  VaultData,
  VaultItem,
  VaultStatus,
} from './types'
import { computeHealth, type VaultHealth } from './lib/health'
import { TYPES } from './lib/fields'
import { uid } from './lib/utils'

export type Phase = 'boot' | 'onboarding' | 'locked' | 'unlocked'

export interface Toast {
  id: string
  title: string
  detail?: string
  tone: 'success' | 'info' | 'error'
}

export interface BreachScan {
  running: boolean
  checked: number
  total: number
  errors: number
  done: boolean
}

interface EditorTarget {
  open: boolean
  itemId: string | null
  type: ItemType
}

interface CopyOptions {
  sensitive?: boolean
  label?: string
  item?: VaultItem
  silent?: boolean
}

interface StoreValue {
  phase: Phase
  status: VaultStatus | null
  info: AppInfo | null
  data: VaultData | null
  items: VaultItem[]
  settings: Settings
  profile: { name: string }
  health: VaultHealth
  toasts: Toast[]
  paletteOpen: boolean
  auditOpen: boolean
  editor: EditorTarget
  breaches: Record<string, number>
  breachScan: BreachScan
  isDesktop: boolean
  unlock: (password: string) => Promise<void>
  createVault: (password: string, hint: string, name: string) => Promise<void>
  lock: () => void
  addToast: (toast: Omit<Toast, 'id'>) => void
  dismissToast: (id: string) => void
  copy: (value: string, options?: CopyOptions) => Promise<void>
  saveItem: (item: VaultItem) => void
  deleteItem: (id: string) => void
  toggleFavorite: (id: string) => void
  updateSettings: (patch: Partial<Settings>) => void
  updateProfile: (name: string) => void
  openPalette: () => void
  closePalette: () => void
  setAuditOpen: (open: boolean) => void
  openEditor: (itemId?: string | null, type?: ItemType) => void
  closeEditor: () => void
  runBreachScan: () => Promise<void>
  exportBackup: (password: string) => Promise<{ cancelled: boolean; path?: string }>
  importBackup: (password: string) => Promise<boolean>
  changeMasterPassword: (current: string, next: string) => Promise<void>
  wipeVault: () => Promise<void>
  logActivity: (kind: ActivityKind, item?: VaultItem) => void
  markUsed: (item: VaultItem) => void
}

const DEFAULT_SETTINGS: Settings = {
  autoLockMinutes: 5,
  clipboardSeconds: 30,
  lockOnBlur: false,
  breachCheck: true,
  accent: 'mint',
  reduceMotion: false,
  compact: false,
  showStrength: true,
}

const StoreContext = createContext<StoreValue | null>(null)

const addActivity = (data: VaultData, kind: ActivityKind, item?: VaultItem): VaultData => {
  const entry: Activity = {
    id: uid('act'),
    kind,
    itemId: item?.id,
    itemName: item?.name,
    at: Date.now(),
  }
  return { ...data, activity: [entry, ...data.activity].slice(0, 200) }
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [phase, setPhase] = useState<Phase>('boot')
  const [status, setStatus] = useState<VaultStatus | null>(null)
  const [info, setInfo] = useState<AppInfo | null>(null)
  const [data, setData] = useState<VaultData | null>(null)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [auditOpen, setAuditOpen] = useState(false)
  const [editor, setEditor] = useState<EditorTarget>({ open: false, itemId: null, type: 'login' })
  const [breaches, setBreaches] = useState<Record<string, number>>({})
  const [breachScan, setBreachScan] = useState<BreachScan>({
    running: false,
    checked: 0,
    total: 0,
    errors: 0,
    done: false,
  })

  const pendingSave = useRef<VaultData | null>(null)
  const saving = useRef(false)
  const toastTimers = useRef<Map<string, number>>(new Map())
  const phaseRef = useRef<Phase>('boot')
  phaseRef.current = phase

  const isDesktop = Boolean(window.vault?.isElectron)

  const settings = data?.settings ?? DEFAULT_SETTINGS
  const items = useMemo(() => data?.items ?? [], [data?.items])
  const health = useMemo(() => computeHealth(items, breaches), [items, breaches])

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
    const timer = toastTimers.current.get(id)
    if (timer) window.clearTimeout(timer)
    toastTimers.current.delete(id)
  }, [])

  const addToast = useCallback(
    (toast: Omit<Toast, 'id'>) => {
      const id = uid('toast')
      setToasts((prev) => [...prev.slice(-2), { ...toast, id }])
      const timer = window.setTimeout(() => dismissToast(id), 4200)
      toastTimers.current.set(id, timer)
    },
    [dismissToast],
  )

  const pumpSaves = useCallback(async () => {
    if (saving.current) return
    saving.current = true
    try {
      while (pendingSave.current) {
        const payload = pendingSave.current
        pendingSave.current = null
        try {
          await window.vault.save(payload)
        } catch (error) {
          addToast({
            title: 'Save failed',
            detail: error instanceof Error ? error.message : 'The vault could not be written.',
            tone: 'error',
          })
          break
        }
      }
    } finally {
      saving.current = false
    }
  }, [addToast])

  const persist = useCallback(
    (next: VaultData) => {
      pendingSave.current = next
      void pumpSaves()
    },
    [pumpSaves],
  )

  const mutate = useCallback(
    (updater: (draft: VaultData) => VaultData) => {
      setData((prev) => {
        if (!prev) return prev
        const next = { ...updater(prev), updatedAt: Date.now() }
        persist(next)
        return next
      })
    },
    [persist],
  )

  const boot = useCallback(async () => {
    try {
      const [nextStatus, nextInfo] = await Promise.all([window.vault.status(), window.vault.appInfo()])
      setStatus(nextStatus)
      setInfo(nextInfo)
      if (!nextStatus.exists) {
        setPhase('onboarding')
        return
      }
      if (nextStatus.unlocked) {
        try {
          const nextData = await window.vault.data()
          setData(nextData)
          setPhase('unlocked')
          return
        } catch {
          /* fall through to lock */
        }
      }
      setPhase('locked')
    } catch {
      setPhase('onboarding')
    }
  }, [])

  useEffect(() => {
    void boot()
  }, [boot])

  const clearOverlays = useCallback(() => {
    setPaletteOpen(false)
    setAuditOpen(false)
    setEditor({ open: false, itemId: null, type: 'login' })
    setBreaches({})
    setBreachScan({ running: false, checked: 0, total: 0, errors: 0, done: false })
  }, [])

  const handleLocked = useCallback(
    (reason?: string) => {
      setPhase('locked')
      setData(null)
      clearOverlays()
      setStatus((prev) => (prev ? { ...prev, unlocked: false } : prev))
      if (reason === 'timeout') {
        addToast({ title: 'Vault locked', detail: 'Auto-lock kept things safe.', tone: 'info' })
      }
    },
    [addToast, clearOverlays],
  )

  useEffect(() => {
    const off = window.vault.onLocked((payload) => handleLocked(payload?.reason))
    return off
  }, [handleLocked])

  useEffect(() => {
    if (!isDesktop) return
    return window.vault.onPalette(() => {
      if (phaseRef.current === 'unlocked') setPaletteOpen(true)
    })
  }, [isDesktop])

  const unlock = useCallback(
    async (password: string) => {
      const result = await window.vault.unlock(password)
      const next = addActivity(result.data, 'unlocked')
      setData(next)
      setStatus((prev) => (prev ? { ...prev, unlocked: true } : prev))
      setPhase('unlocked')
      setBreaches({})
      persist(next)
    },
    [persist],
  )

  const createVault = useCallback(
    async (password: string, hint: string, name: string) => {
      const created = await window.vault.create(password, hint)
      const next: VaultData = {
        ...created,
        profile: { ...created.profile, name: name.trim() },
        activity: [],
      }
      await window.vault.save(next)
      setData(next)
      setStatus({
        exists: true,
        unlocked: true,
        hint,
        createdAt: next.createdAt,
        updatedAt: next.updatedAt,
      })
      setPhase('unlocked')
    },
    [],
  )

  const lock = useCallback(async () => {
    const started = Date.now()
    while ((saving.current || pendingSave.current) && Date.now() - started < 2500) {
      if (!saving.current && pendingSave.current) void pumpSaves()
      await new Promise((resolve) => setTimeout(resolve, 25))
    }
    try {
      await window.vault.lock()
    } catch {
      /* the UI still locks if the process is already closing */
    } finally {
      handleLocked('manual')
    }
  }, [handleLocked, pumpSaves])

  const copy = useCallback(
    async (value: string, options: CopyOptions = {}) => {
      if (!value) {
        addToast({ title: 'Nothing to copy', detail: 'This field is empty.', tone: 'error' })
        return
      }
      const clearAfter = options.sensitive ? settings.clipboardSeconds : 0
      try {
        await window.vault.copy(value, Boolean(options.sensitive), clearAfter)
      } catch {
        addToast({ title: 'Clipboard unavailable', detail: 'Could not write to the clipboard.', tone: 'error' })
        return
      }
      if (options.item) {
        mutate((prev) => {
          const withUse = {
            ...prev,
            items: prev.items.map((entry) =>
              entry.id === options.item?.id ? { ...entry, lastUsedAt: Date.now() } : entry,
            ),
          }
          return addActivity(withUse, 'copied', options.item)
        })
      }
      if (!options.silent) {
        addToast({
          title: `${options.label || 'Value'} copied`,
          detail:
            options.sensitive && settings.clipboardSeconds > 0
              ? `Clipboard clears in ${settings.clipboardSeconds}s`
              : 'Ready to paste anywhere.',
          tone: 'success',
        })
      }
    },
    [addToast, mutate, settings.clipboardSeconds],
  )

  const saveItem = useCallback(
    (item: VaultItem) => {
      const existed = items.some((entry) => entry.id === item.id)
      mutate((prev) => {
        const nextItem = { ...item, updatedAt: Date.now() }
        const itemsNext = existed
          ? prev.items.map((entry) => (entry.id === item.id ? nextItem : entry))
          : [nextItem, ...prev.items]
        return addActivity({ ...prev, items: itemsNext }, existed ? 'updated' : 'created', nextItem)
      })
      addToast({
        title: existed ? 'Changes saved' : 'Added to your vault',
        detail: item.name,
        tone: 'success',
      })
      setEditor({ open: false, itemId: null, type: item.type })
    },
    [addToast, items, mutate],
  )

  const deleteItem = useCallback(
    (id: string) => {
      const deleted = items.find((entry) => entry.id === id)
      mutate((prev) => {
        const next = { ...prev, items: prev.items.filter((entry) => entry.id !== id) }
        return deleted ? addActivity(next, 'deleted', deleted) : next
      })
      setEditor({ open: false, itemId: null, type: 'login' })
      if (deleted) addToast({ title: 'Moved out of your vault', detail: deleted.name, tone: 'info' })
    },
    [addToast, items, mutate],
  )

  const toggleFavorite = useCallback(
    (id: string) => {
      const item = items.find((entry) => entry.id === id)
      if (!item) return
      mutate((prev) => {
        const nextItems = prev.items.map((entry) =>
          entry.id === id ? { ...entry, favorite: !entry.favorite } : entry,
        )
        return addActivity({ ...prev, items: nextItems }, 'favorite', {
          ...item,
          favorite: !item.favorite,
        })
      })
    },
    [items, mutate],
  )

  const updateSettings = useCallback(
    (patch: Partial<Settings>) => {
      mutate((prev) => ({ ...prev, settings: { ...prev.settings, ...patch } }))
    },
    [mutate],
  )

  const updateProfile = useCallback(
    (name: string) => {
      mutate((prev) => ({ ...prev, profile: { ...prev.profile, name } }))
    },
    [mutate],
  )

  const openEditor = useCallback((itemId?: string | null, type: ItemType = 'login') => {
    setEditor({ open: true, itemId: itemId ?? null, type })
  }, [])

  const closeEditor = useCallback(() => {
    setEditor({ open: false, itemId: null, type: 'login' })
  }, [])

  const logActivity = useCallback(
    (kind: ActivityKind, item?: VaultItem) => {
      mutate((prev) => addActivity(prev, kind, item))
    },
    [mutate],
  )

  const markUsed = useCallback(
    (item: VaultItem) => {
      mutate((prev) => ({
        ...prev,
        items: prev.items.map((entry) =>
          entry.id === item.id ? { ...entry, lastUsedAt: Date.now() } : entry,
        ),
      }))
    },
    [mutate],
  )

  const runBreachScan = useCallback(async () => {
    if (!data || breachScan.running) return
    const targets = data.items
      .filter((item) => item.type === 'login' || item.type === 'apikey')
      .map((item) => ({
        id: item.id,
        secret: item.fields[TYPES[item.type].secretKey || ''] || '',
      }))
      .filter((target) => target.secret)

    if (!targets.length) {
      addToast({ title: 'Nothing to scan', detail: 'Add a login or API key first.', tone: 'info' })
      return
    }

    setBreachScan({ running: true, checked: 0, total: targets.length, errors: 0, done: false })
    const cache = new Map<string, number>()
    const next: Record<string, number> = { ...breaches }
    let errors = 0
    const chunkSize = 4

    for (let i = 0; i < targets.length; i += chunkSize) {
      const chunk = targets.slice(i, i + chunkSize)
      await Promise.all(
        chunk.map(async (target) => {
          try {
            let count = cache.get(target.secret)
            if (count === undefined) {
              count = await window.vault.breachCheck(target.secret)
              cache.set(target.secret, count)
            }
            next[target.id] = count
            setBreaches({ ...next })
          } catch {
            errors += 1
          } finally {
            setBreachScan((prev) => ({ ...prev, checked: prev.checked + 1 }))
          }
        }),
      )
    }

    const found = Object.values(next).filter((count) => count > 0).length
    setBreachScan({ running: false, checked: targets.length, total: targets.length, errors, done: true })
    if (errors) {
      addToast({
        title: 'Breach check incomplete',
        detail: 'The breach service could not be reached for some secrets.',
        tone: 'error',
      })
    } else {
      addToast({
        title: found ? `${found} breached ${found === 1 ? 'secret' : 'secrets'} found` : 'No breaches found',
        detail: found ? 'Rotate those credentials soon.' : 'Your audited secrets are in the clear.',
        tone: found ? 'error' : 'success',
      })
    }
  }, [addToast, breachScan.running, breaches, data])

  const exportBackup = useCallback(async (password: string) => {
    return window.vault.exportBackup(password)
  }, [])

  const importBackup = useCallback(
    async (password: string) => {
      const result = await window.vault.importBackup(password)
      if (result.cancelled || !result.data) return false
      const next = addActivity(result.data, 'imported')
      setData(next)
      persist(next)
      addToast({ title: 'Backup restored', detail: 'Your vault is up to date.', tone: 'success' })
      return true
    },
    [addToast, persist],
  )

  const changeMasterPassword = useCallback(
    async (current: string, next: string) => {
      await window.vault.changePassword(current, next)
      addToast({ title: 'Master password changed', detail: 'The vault was re-encrypted.', tone: 'success' })
    },
    [addToast],
  )

  const wipeVault = useCallback(async () => {
    await window.vault.wipe()
    setData(null)
    setPhase('onboarding')
    setStatus({
      exists: false,
      unlocked: false,
      hint: '',
      createdAt: null,
      updatedAt: null,
    })
    clearOverlays()
    addToast({ title: 'Vault erased', detail: 'The encrypted file was removed from this device.', tone: 'info' })
  }, [addToast, clearOverlays])

  useEffect(() => {
    let saved = 'mint'
    try {
      saved = window.localStorage.getItem('aegis-accent') || 'mint'
    } catch {
      /* storage can be unavailable in hardened contexts */
    }
    const accent = data ? settings.accent : saved
    document.documentElement.dataset.accent = accent
    if (data) {
      try {
        window.localStorage.setItem('aegis-accent', settings.accent)
      } catch {
        /* ignore */
      }
    }
    document.documentElement.classList.toggle('reduce-motion', settings.reduceMotion)
    document.documentElement.classList.toggle('compact', settings.compact)
  }, [data, settings.accent, settings.reduceMotion, settings.compact])

  useEffect(() => {
    if (!isDesktop) return
    if (phase === 'unlocked') {
      void window.vault.setAutoLock(settings.autoLockMinutes)
      void window.vault.setLockOnBlur(settings.lockOnBlur)
    }
  }, [isDesktop, phase, settings.autoLockMinutes, settings.lockOnBlur])

  useEffect(() => {
    if (phase !== 'unlocked') return
    let last = 0
    const ping = () => {
      const ts = Date.now()
      if (ts - last < 12000) return
      last = ts
      void window.vault.touch()
    }
    const events: (keyof WindowEventMap)[] = ['mousemove', 'keydown', 'pointerdown', 'wheel']
    events.forEach((name) => window.addEventListener(name, ping, { passive: true }))
    return () => events.forEach((name) => window.removeEventListener(name, ping))
  }, [phase])

  useEffect(
    () => () => {
      toastTimers.current.forEach((timer) => window.clearTimeout(timer))
    },
    [],
  )

  const value: StoreValue = {
    phase,
    status,
    info,
    data,
    items,
    settings,
    profile: data?.profile ?? { name: '' },
    health,
    toasts,
    paletteOpen,
    auditOpen,
    editor,
    breaches,
    breachScan,
    isDesktop,
    unlock,
    createVault,
    lock,
    addToast,
    dismissToast,
    copy,
    saveItem,
    deleteItem,
    toggleFavorite,
    updateSettings,
    updateProfile,
    openPalette: () => setPaletteOpen(true),
    closePalette: () => setPaletteOpen(false),
    setAuditOpen,
    openEditor,
    closeEditor,
    runBreachScan,
    exportBackup,
    importBackup,
    changeMasterPassword,
    wipeVault,
    logActivity,
    markUsed,
  }

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore() {
  const context = useContext(StoreContext)
  if (!context) throw new Error('useStore must be used inside StoreProvider')
  return context
}

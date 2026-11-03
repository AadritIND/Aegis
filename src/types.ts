export type ItemType = 'login' | 'apikey' | 'card' | 'note' | 'identity'

export type Page = 'home' | 'vault' | 'generator' | 'autofill' | 'settings'

export type AccentName = 'mint' | 'iris' | 'amber' | 'rose'

export interface CustomField {
  id: string
  label: string
  value: string
  secret: boolean
}

export interface VaultItem {
  id: string
  type: ItemType
  name: string
  favorite: boolean
  tags: string[]
  notes: string
  fields: Record<string, string>
  custom: CustomField[]
  createdAt: number
  updatedAt: number
  lastUsedAt?: number
}

export type ActivityKind =
  | 'created'
  | 'updated'
  | 'deleted'
  | 'copied'
  | 'favorite'
  | 'unlocked'
  | 'imported'
  | 'generated'
  | 'autofilled'

export interface Activity {
  id: string
  kind: ActivityKind
  itemId?: string
  itemName?: string
  at: number
}

export interface Settings {
  autoLockMinutes: number
  clipboardSeconds: number
  lockOnBlur: boolean
  breachCheck: boolean
  accent: AccentName
  reduceMotion: boolean
  compact: boolean
  showStrength: boolean
}

export interface Profile {
  name: string
}

export interface VaultData {
  version: number
  createdAt: number
  updatedAt: number
  profile: Profile
  settings: Settings
  items: VaultItem[]
  activity: Activity[]
}

export interface VaultStatus {
  exists: boolean
  unlocked: boolean
  hint: string
  createdAt: number | null
  updatedAt: number | null
}

export interface AppInfo {
  version: string
  platform: string
  electron: string
  isDev: boolean
  vaultPath: string
}

export type UpdateStatus =
  | 'idle'
  | 'checking'
  | 'available'
  | 'none'
  | 'downloading'
  | 'downloaded'
  | 'error'
  | 'disabled'

export interface UpdateState {
  status: UpdateStatus
  currentVersion: string
  version?: string
  releaseName?: string
  notes?: string
  releaseDate?: string | null
  checkedAt?: number
  reason?: string
  error?: string | null
  detail?: string
  progress?: number
  transferred?: number
  total?: number
  bytesPerSecond?: number
}

export interface VaultBridge {
  isElectron: boolean
  appInfo(): Promise<AppInfo>
  status(): Promise<VaultStatus>
  create(password: string, hint: string): Promise<VaultData>
  unlock(password: string): Promise<{ data: VaultData; hint: string }>
  data(): Promise<VaultData>
  hint(): Promise<string>
  lock(): Promise<void>
  save(data: VaultData): Promise<{ savedAt: number }>
  touch(): Promise<void>
  setAutoLock(minutes: number): Promise<void>
  setLockOnBlur(on: boolean): Promise<void>
  copy(text: string, sensitive?: boolean, clearAfter?: number): Promise<void>
  changePassword(current: string, next: string): Promise<void>
  breachCheck(password: string): Promise<number>
  exportBackup(password: string): Promise<{ cancelled: boolean; path?: string }>
  importBackup(password: string): Promise<{ cancelled: boolean; data?: VaultData }>
  wipe(): Promise<void>
  windowControl(action: 'minimize' | 'maximize' | 'close'): Promise<void>
  openExternal(url: string): Promise<void>
  updaterState(): Promise<UpdateState>
  updaterCheck(): Promise<UpdateState>
  updaterDownload(): Promise<UpdateState>
  updaterInstall(): Promise<{ ok: boolean; reason?: string }>
  onLocked(cb: (payload: { reason: string }) => void): () => void
  onPalette(cb: () => void): () => void
  onWindowState(cb: (state: { maximized: boolean; focused: boolean }) => void): () => void
  onUpdaterState(cb: (state: UpdateState) => void): () => void
}

declare global {
  interface Window {
    vault: VaultBridge
  }
}

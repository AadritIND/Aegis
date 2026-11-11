/* Browser-only demo bridge. Electron always provides the real, encrypted bridge. */
import type { Activity, Settings, VaultBridge, VaultData, VaultItem } from '../types'
import { uid } from './utils'

const DAY = 24 * 60 * 60 * 1000

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

const now = Date.now()

const item = (
  partial: Omit<VaultItem, 'id' | 'custom' | 'notes' | 'createdAt' | 'updatedAt'> &
    Partial<Pick<VaultItem, 'id' | 'custom' | 'notes' | 'createdAt' | 'updatedAt'>>,
): VaultItem => ({
  id: partial.id || uid('item'),
  custom: partial.custom || [],
  notes: partial.notes || '',
  createdAt: partial.createdAt || now - 90 * DAY,
  updatedAt: partial.updatedAt || now - 8 * DAY,
  ...partial,
})

const demoItems: VaultItem[] = [
  item({
    type: 'login',
    name: 'GitHub',
    favorite: true,
    tags: ['work', 'dev'],
    fields: {
      url: 'https://github.com',
      username: 'alex.rivera',
      password: 'vM7#qL2$wR9@xT4!',
      totp: 'JBSWY3DPEHPK3PXP',
    },
    createdAt: now - 280 * DAY,
    updatedAt: now - 12 * DAY,
    lastUsedAt: now - 45 * 60 * 1000,
  }),
  item({
    type: 'login',
    name: 'Google',
    favorite: true,
    tags: ['personal'],
    fields: {
      url: 'https://accounts.google.com',
      username: 'alex.rivera@gmail.com',
      password: 'N9!cF3@kP7#zR2$y',
      totp: 'JBSWY3DPEHPK3PXP',
    },
    createdAt: now - 310 * DAY,
    updatedAt: now - 40 * DAY,
    lastUsedAt: now - 2 * 60 * 60 * 1000,
  }),
  item({
    type: 'login',
    name: 'Figma',
    favorite: false,
    tags: ['work', 'design'],
    fields: {
      url: 'https://figma.com',
      username: 'alex@northstudio.co',
      password: 'Atelier2024!',
      totp: '',
    },
    createdAt: now - 150 * DAY,
    updatedAt: now - 95 * DAY,
    lastUsedAt: now - 1 * DAY,
  }),
  item({
    type: 'login',
    name: 'Linear',
    favorite: false,
    tags: ['work'],
    fields: {
      url: 'https://linear.app',
      username: 'alex@northstudio.co',
      password: 'lin-9Kf!2Qw#z8',
      totp: '',
    },
    createdAt: now - 120 * DAY,
    updatedAt: now - 21 * DAY,
    lastUsedAt: now - 3 * DAY,
  }),
  item({
    type: 'login',
    name: 'Coinbase',
    favorite: false,
    tags: ['finance', 'personal'],
    fields: {
      url: 'https://coinbase.com',
      username: 'alex.rivera@gmail.com',
      password: 'Atelier2024!',
      totp: '',
    },
    createdAt: now - 60 * DAY,
    updatedAt: now - 380 * DAY,
    lastUsedAt: now - 6 * DAY,
  }),
  item({
    type: 'apikey',
    name: 'Stripe — Production',
    favorite: true,
    tags: ['work', 'finance', 'dev'],
    fields: {
      keyId: 'pk_live_demo_5Hx92kQ',
      environment: 'production',
      secret: 'sk_test_demo_51NzR8kQ2mT4vW9p',
      scopes: 'charges:read, customers:write',
      endpoint: 'https://dashboard.stripe.com',
    },
    createdAt: now - 210 * DAY,
    updatedAt: now - 5 * DAY,
    lastUsedAt: now - 20 * 60 * 1000,
  }),
  item({
    type: 'apikey',
    name: 'OpenAI — Studio',
    favorite: false,
    tags: ['dev'],
    fields: {
      keyId: 'proj_demo_9Kx2',
      environment: 'production',
      secret: 'sk-demo',
      scopes: 'models:read, responses:write',
      endpoint: 'https://platform.openai.com',
    },
    createdAt: now - 70 * DAY,
    updatedAt: now - 70 * DAY,
  }),
  item({
    type: 'apikey',
    name: 'Supabase service role',
    favorite: false,
    tags: ['dev', 'client'],
    fields: {
      keyId: 'sbp_demo_8f2',
      environment: 'production',
      secret: 'sb-service-demo-Q2mT4vW9pX7rL3kN6b',
      scopes: 'db:all',
      endpoint: 'https://supabase.com/dashboard',
    },
    createdAt: now - 40 * DAY,
    updatedAt: now - 14 * DAY,
    lastUsedAt: now - 5 * DAY,
  }),
  item({
    type: 'card',
    name: 'Visa Signature',
    favorite: false,
    tags: ['finance', 'personal'],
    fields: {
      cardholder: 'ALEX RIVERA',
      brand: 'Visa',
      number: '4242424242424242',
      expiry: '08/29',
      cvv: '418',
    },
    createdAt: now - 190 * DAY,
    updatedAt: now - 190 * DAY,
  }),
  item({
    type: 'note',
    name: 'Recovery codes',
    favorite: true,
    tags: ['2fa', 'personal'],
    notes: 'Stored offline as a last resort.',
    fields: {
      body: 'AEG-9F2C-11KD\nAEG-7Q4M-82PX\nAEG-3T8N-56RZ\nAEG-6L1V-94WC\nAEG-2B5H-73QS\n\nEach code works once. Cross them off as you use them.',
    },
    createdAt: now - 330 * DAY,
    updatedAt: now - 330 * DAY,
  }),
  item({
    type: 'note',
    name: 'Home network & travel',
    favorite: false,
    tags: ['personal'],
    notes: '',
    fields: {
      body: 'Router admin: 192.168.1.1\nGuest network rotates every Sunday.\n\nTravel wifi passphrase lives in the fireproof box, not online.',
    },
    createdAt: now - 85 * DAY,
    updatedAt: now - 85 * DAY,
  }),
  item({
    type: 'identity',
    name: 'Personal details',
    favorite: false,
    tags: ['personal'],
    fields: {
      fullName: 'Alex Rivera',
      email: 'alex.rivera@gmail.com',
      phone: '+1 555 010 2048',
      dob: '1994-08-12',
      address: '48 Juniper Lane, Portland, OR 97205, United States',
    },
    createdAt: now - 300 * DAY,
    updatedAt: now - 60 * DAY,
  }),
]

function seedActivity(): Activity[] {
  const entries: Activity[] = []
  const templates = [
    { kind: 'copied' as const, itemId: demoItems[0].id, itemName: 'GitHub' },
    { kind: 'copied' as const, itemId: demoItems[5].id, itemName: 'Stripe — Production' },
    { kind: 'updated' as const, itemId: demoItems[2].id, itemName: 'Figma' },
    { kind: 'created' as const, itemId: demoItems[7].id, itemName: 'Supabase service role' },
    { kind: 'copied' as const, itemId: demoItems[1].id, itemName: 'Google' },
    { kind: 'favorite' as const, itemId: demoItems[9].id, itemName: 'Recovery codes' },
    { kind: 'copied' as const, itemId: demoItems[6].id, itemName: 'OpenAI — Studio' },
    { kind: 'updated' as const, itemId: demoItems[3].id, itemName: 'Linear' },
  ]
  let seed = 42
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296
    return seed / 4294967296
  }
  for (let i = 0; i < 46; i += 1) {
    const template = templates[Math.floor(rand() * templates.length)]
    const daysAgo = Math.floor(rand() * 75)
    entries.push({
      id: uid('act'),
      ...template,
      at: now - daysAgo * DAY - Math.floor(rand() * 20) * 3600 * 1000,
    })
  }
  entries.push({
    id: uid('act'),
    kind: 'unlocked',
    at: now - 2 * 60 * 1000,
  })
  return entries.sort((a, b) => b.at - a.at)
}

function blankVault(): VaultData {
  return {
    version: 1,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    profile: { name: 'Alex' },
    settings: { ...DEFAULT_SETTINGS },
    items: [],
    activity: [],
  }
}

let demoData: VaultData = {
  version: 1,
  createdAt: now - 340 * DAY,
  updatedAt: now,
  profile: { name: 'Alex' },
  settings: { ...DEFAULT_SETTINGS },
  items: demoItems,
  activity: seedActivity(),
}
const forceOnboarding =
  typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('onboarding')
let exists = !forceOnboarding
let unlocked = false

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export const mockBridge: VaultBridge = {
  isElectron: false,
  async appInfo() {
    return {
      version: '1.0.4',
      platform: 'web preview',
      electron: '—',
      isDev: true,
      vaultPath: 'Browser preview — changes are not written to disk',
    }
  },
  async status() {
    return {
      exists,
      unlocked,
      hint: '',
      createdAt: exists ? demoData.createdAt : null,
      updatedAt: exists ? demoData.updatedAt : null,
    }
  },
  async create(password) {
    if (exists) throw new Error('VAULT_EXISTS')
    if (password.length < 10) throw new Error('WEAK_MASTER_PASSWORD')
    demoData = blankVault()
    exists = true
    unlocked = true
    return demoData
  },
  async unlock(password) {
    if (!exists) throw new Error('NO_VAULT')
    await pause(520)
    if (password === 'wrong') throw new Error('BAD_PASSWORD')
    if (password.trim().length < 1) throw new Error('BAD_PASSWORD')
    unlocked = true
    return { data: demoData, hint: '' }
  },
  async data() {
    if (!unlocked) throw new Error('LOCKED')
    return demoData
  },
  async hint() {
    return 'The demo accepts anything'
  },
  async lock() {
    unlocked = false
  },
  async save(data) {
    demoData = data
    return { savedAt: Date.now() }
  },
  async touch() {},
  async setAutoLock() {},
  async setLockOnBlur() {},
  async copy(text) {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      /* clipboard access denied in preview */
    }
  },
  async changePassword() {},
  async breachCheck(password) {
    await pause(420)
    if (password.length <= 6) return 4821
    if (password.length <= 11) return 137
    return 0
  },
  async exportBackup() {
    return { cancelled: true }
  },
  async importBackup() {
    return { cancelled: true }
  },
  async wipe() {
    exists = false
    unlocked = false
    demoData = blankVault()
  },
  async windowControl() {},
  async openExternal(url) {
    window.open(url, '_blank', 'noopener,noreferrer')
  },
  async updaterState() {
    return { status: 'disabled', currentVersion: '1.0.4', reason: 'Browser preview' }
  },
  async updaterCheck() {
    return { status: 'disabled', currentVersion: '1.0.4', reason: 'Browser preview' }
  },
  async updaterDownload() {
    return { status: 'disabled', currentVersion: '1.0.4', reason: 'Browser preview' }
  },
  async updaterInstall() {
    return { ok: false, reason: 'preview' }
  },
  onLocked() {
    return () => {}
  },
  onPalette() {
    return () => {}
  },
  onWindowState() {
    return () => {}
  },
  onUpdaterState() {
    return () => {}
  },
}

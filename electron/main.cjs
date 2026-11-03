/*
 * Aegis vault — Electron main process.
 * All cryptography and disk access lives here. The renderer never touches the
 * filesystem, the master password, or the derived key.
 */
const {
  app,
  BrowserWindow,
  ipcMain,
  dialog,
  clipboard,
  shell,
  globalShortcut,
  Menu,
  powerMonitor,
  nativeTheme,
} = require('electron')
const path = require('path')
const fs = require('fs')
const fsp = fs.promises
const crypto = require('crypto')
const { autoUpdater } = require('electron-updater')

const APP_ID = 'app.aegis.vault'
const KDF = { name: 'scrypt', N: 32768, r: 8, p: 1, maxmem: 192 * 1024 * 1024 }
const VAULT_VERSION = 1
const DEFAULT_AUTO_LOCK_MINUTES = 5

const isDev = Boolean(process.env.VITE_DEV_SERVER_URL)
const devUrl = process.env.VITE_DEV_SERVER_URL || ''
const preloadPath = path.join(__dirname, 'preload.cjs')

let win = null
/** @type {{ key: Buffer, salt: string, createdAt: number, data: any, autoLockMinutes: number } | null} */
let session = null
let autoLockTimer = null
let lockOnBlur = false
let failedAttempts = 0
let clipboardTimer = null
let lastSensitiveCopy = null
let lastTouch = 0

const UPDATE_CHECK_INTERVAL = 6 * 60 * 60 * 1000
const UPDATE_CHECK_DELAY = 7000
let updateState = {
  status: 'idle',
  currentVersion: app.getVersion(),
}
let updateTimer = null

app.setAppUserModelId(APP_ID)

const vaultFile = () => path.join(app.getPath('userData'), 'aegis.vault')

/* ------------------------------------------------------------------ crypto */

function deriveKey(password, saltB64, params = KDF) {
  const N = Number(params.N) || KDF.N
  const r = Number(params.r) || KDF.r
  const p = Number(params.p) || KDF.p
  return crypto.scryptSync(password, Buffer.from(saltB64, 'base64'), 32, {
    N,
    r,
    p,
    maxmem: Math.max(KDF.maxmem, 128 * N * r + 32 * 1024 * 1024),
  })
}

function makeEnvelope(data, key, saltB64, hint, createdAt) {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  const plaintext = Buffer.from(JSON.stringify(data), 'utf8')
  const payload = Buffer.concat([cipher.update(plaintext), cipher.final()])
  const tag = cipher.getAuthTag()
  return {
    format: 'aegis-vault',
    version: VAULT_VERSION,
    hint: hint || '',
    createdAt: createdAt || Date.now(),
    updatedAt: Date.now(),
    kdf: { ...KDF, salt: saltB64 },
    cipher: { name: 'aes-256-gcm', iv: iv.toString('base64'), tag: tag.toString('base64') },
    payload: payload.toString('base64'),
  }
}

function openEnvelope(envelope, password) {
  if (!envelope || (envelope.format !== 'aegis-vault' && envelope.format !== 'aegis-backup'))
    throw new Error('NOT_A_VAULT')
  const salt = envelope.kdf && envelope.kdf.salt
  if (!salt) throw new Error('CORRUPT_VAULT')
  const key = deriveKey(password, salt, envelope.kdf)
  const iv = Buffer.from(envelope.cipher.iv, 'base64')
  const tag = Buffer.from(envelope.cipher.tag, 'base64')
  const payload = Buffer.from(envelope.payload, 'base64')
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(tag)
  let plainText
  try {
    plainText = Buffer.concat([decipher.update(payload), decipher.final()])
  } catch {
    throw new Error('BAD_PASSWORD')
  }
  let data
  try {
    data = JSON.parse(plainText.toString('utf8'))
  } catch {
    throw new Error('CORRUPT_PAYLOAD')
  }
  return { key, salt, data }
}

async function readEnvelope() {
  try {
    const raw = await fsp.readFile(vaultFile(), 'utf8')
    return JSON.parse(raw)
  } catch (err) {
    if (err.code === 'ENOENT') return null
    throw err
  }
}

async function writeEnvelope(envelope) {
  const file = vaultFile()
  const tmp = `${file}.tmp`
  await fsp.mkdir(path.dirname(file), { recursive: true })
  try {
    await fsp.copyFile(file, `${file}.bak`)
  } catch {
    /* first save */
  }
  await fsp.writeFile(tmp, JSON.stringify(envelope), { mode: 0o600 })
  await fsp.rename(tmp, file)
}

function blankVault() {
  return {
    version: VAULT_VERSION,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    profile: { name: '' },
    settings: {
      autoLockMinutes: DEFAULT_AUTO_LOCK_MINUTES,
      clipboardSeconds: 30,
      lockOnBlur: false,
      breachCheck: true,
      accent: 'mint',
      reduceMotion: false,
      compact: false,
      showStrength: true,
    },
    items: [],
    activity: [],
  }
}

function normaliseVault(data) {
  const base = blankVault()
  if (!data || typeof data !== 'object') return base
  return {
    ...base,
    ...data,
    profile: { ...base.profile, ...(data.profile || {}) },
    settings: { ...base.settings, ...(data.settings || {}) },
    items: Array.isArray(data.items) ? data.items : [],
    activity: Array.isArray(data.activity) ? data.activity.slice(0, 200) : [],
  }
}

/* ----------------------------------------------------------------- session */

function clearSensitiveClipboard() {
  if (clipboardTimer) {
    clearTimeout(clipboardTimer)
    clipboardTimer = null
  }
  if (!lastSensitiveCopy) return
  try {
    if (clipboard.readText() === lastSensitiveCopy) clipboard.clear()
  } catch {
    /* ignore */
  }
  lastSensitiveCopy = null
}

function armAutoLock(minutes) {
  if (autoLockTimer) clearTimeout(autoLockTimer)
  autoLockTimer = null
  if (!session) return
  const mins = Number(minutes)
  if (!Number.isFinite(mins) || mins <= 0) return
  autoLockTimer = setTimeout(() => lockVault('timeout'), Math.min(mins, 24 * 60) * 60 * 1000)
}

function lockVault(reason = 'manual') {
  session = null
  failedAttempts = 0
  if (autoLockTimer) {
    clearTimeout(autoLockTimer)
    autoLockTimer = null
  }
  clearSensitiveClipboard()
  if (win && !win.isDestroyed()) win.webContents.send('vault:locked', { reason })
}

function touchSession() {
  const now = Date.now()
  if (now - lastTouch < 4000) return
  lastTouch = now
  if (session) armAutoLock(session.autoLockMinutes)
}

/* ---------------------------------------------------------------- updater */

function cleanNotes(notes) {
  if (!notes) return ''
  const raw = Array.isArray(notes)
    ? notes.map((entry) => (typeof entry === 'string' ? entry : entry?.note || '')).join('\n\n')
    : String(notes)
  return raw
    .replace(/<[^>]+>/g, ' ')
    .replace(/\r/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, 1200)
}

function publishUpdateState(patch) {
  updateState = { ...updateState, ...patch, currentVersion: app.getVersion() }
  if (win && !win.isDestroyed()) win.webContents.send('updater:state', updateState)
  return updateState
}

function friendlyUpdateError(error) {
  const message = error instanceof Error ? error.message : String(error || '')
  if (/net::|ENOTFOUND|ETIMEDOUT|ECONN|EAI_AGAIN|network/i.test(message)) {
    return 'Could not reach GitHub. We will try again later.'
  }
  if (/404|latest\.yml|release/i.test(message)) {
    return 'No published release was found for this build.'
  }
  return 'The update could not be checked right now.'
}

function setupUpdater() {
  if (!app.isPackaged) {
    updateState = {
      status: 'disabled',
      currentVersion: app.getVersion(),
      reason: 'Updates are delivered in installed builds.',
    }
    return
  }

  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true
  autoUpdater.allowPrerelease = false
  autoUpdater.allowDowngrade = false
  autoUpdater.logger = console

  autoUpdater.on('checking-for-update', () => {
    publishUpdateState({ status: 'checking', error: null })
  })

  autoUpdater.on('update-available', (info) => {
    publishUpdateState({
      status: 'available',
      version: info.version,
      releaseName: info.releaseName || '',
      notes: cleanNotes(info.releaseNotes),
      releaseDate: info.releaseDate || null,
      error: null,
      progress: 0,
    })
  })

  autoUpdater.on('update-not-available', () => {
    publishUpdateState({ status: 'none', version: app.getVersion(), checkedAt: Date.now(), error: null })
  })

  autoUpdater.on('download-progress', (progress) => {
    publishUpdateState({
      status: 'downloading',
      progress: Math.max(0, Math.min(100, Math.round(progress.percent || 0))),
      transferred: progress.transferred || 0,
      total: progress.total || 0,
      bytesPerSecond: progress.bytesPerSecond || 0,
      error: null,
    })
  })

  autoUpdater.on('update-downloaded', (info) => {
    publishUpdateState({
      status: 'downloaded',
      version: info.version,
      progress: 100,
      error: null,
    })
  })

  autoUpdater.on('error', (error) => {
    console.error('[updater]', error?.message || error)
    publishUpdateState({
      status: 'error',
      error: friendlyUpdateError(error),
      detail: String(error?.message || error || '').slice(0, 300),
    })
  })

  const runCheck = () => {
    autoUpdater.checkForUpdates().catch((error) => {
      console.error('[updater] check failed', error?.message || error)
      publishUpdateState({ status: 'error', error: friendlyUpdateError(error) })
    })
  }

  setTimeout(runCheck, UPDATE_CHECK_DELAY)
  updateTimer = setInterval(runCheck, UPDATE_CHECK_INTERVAL)

  powerMonitor.on('resume', () => {
    if (updateState.status === 'idle' || updateState.status === 'none') runCheck()
  })
}

function stopUpdater() {
  if (updateTimer) clearInterval(updateTimer)
  updateTimer = null
}

/* ------------------------------------------------------------------ window */

function createWindow() {
  win = new BrowserWindow({
    width: 1360,
    height: 900,
    minWidth: 1040,
    minHeight: 700,
    show: false,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#06080f',
    icon: path.join(__dirname, '..', 'build', 'icon.png'),
    roundedCorners: true,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webviewTag: true,
      spellcheck: false,
      devTools: isDev,
    },
  })

  win.once('ready-to-show', () => {
    win.show()
  })

  if (isDev) {
    win.loadURL(devUrl)
  } else {
    win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
  }

  const emitState = () => {
    if (!win || win.isDestroyed()) return
    win.webContents.send('window:state', { maximized: win.isMaximized(), focused: win.isFocused() })
  }
  win.on('maximize', emitState)
  win.on('unmaximize', emitState)
  win.on('focus', emitState)
  win.on('blur', () => {
    emitState()
    if (lockOnBlur && session) lockVault('blur')
  })

  win.on('closed', () => {
    win = null
  })

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) shell.openExternal(url)
    return { action: 'deny' }
  })

  win.webContents.on('will-navigate', (event, url) => {
    const allowed = isDev ? url.startsWith(devUrl) : url.startsWith('file://')
    if (!allowed) event.preventDefault()
  })

  // Keep the embedded browser sandboxed: no preload, no Node, no local files.
  win.webContents.on('will-attach-webview', (event, webPreferences, params) => {
    delete webPreferences.preload
    webPreferences.nodeIntegration = false
    webPreferences.contextIsolation = true
    if (!/^https?:\/\//i.test(params.src || '')) event.preventDefault()
  })

  win.webContents.on('before-input-event', (event, input) => {
    if (input.type !== 'keyDown') return
    if (input.key === 'F12' && isDev) win.webContents.toggleDevTools()
  })

  win.webContents.on('did-finish-load', () => {
    win.webContents.send('window:state', { maximized: win.isMaximized(), focused: win.isFocused() })
  })
}

/* --------------------------------------------------------------------- ipc */

const handle = (channel, fn) =>
  ipcMain.handle(channel, async (event, ...args) => {
    if (typeof event.senderFrame?.url === 'string' && event.senderFrame.url.startsWith('http')) {
      // Only our own dev server may talk to the vault bridge.
      if (!isDev || !event.senderFrame.url.startsWith(devUrl)) throw new Error('FORBIDDEN')
    }
    return fn(...args)
  })

handle('app:info', async () => ({
  version: app.getVersion(),
  platform: process.platform,
  electron: process.versions.electron,
  isDev,
  vaultPath: vaultFile(),
}))

handle('vault:status', async () => {
  let envelope = null
  try {
    envelope = await readEnvelope()
  } catch {
    envelope = null
  }
  return {
    exists: Boolean(envelope),
    unlocked: Boolean(session),
    hint: envelope?.hint || '',
    createdAt: envelope?.createdAt || null,
    updatedAt: envelope?.updatedAt || null,
  }
})

handle('vault:create', async (password, hint) => {
  if (typeof password !== 'string' || password.length < 10) throw new Error('WEAK_MASTER_PASSWORD')
  const existing = await readEnvelope()
  if (existing) throw new Error('VAULT_EXISTS')
  const salt = crypto.randomBytes(16).toString('base64')
  const key = deriveKey(password, salt)
  const data = blankVault()
  const envelope = makeEnvelope(data, key, salt, typeof hint === 'string' ? hint.slice(0, 120) : '')
  await writeEnvelope(envelope)
  session = {
    key,
    salt,
    createdAt: envelope.createdAt,
    data,
    autoLockMinutes: DEFAULT_AUTO_LOCK_MINUTES,
  }
  failedAttempts = 0
  armAutoLock(DEFAULT_AUTO_LOCK_MINUTES)
  return data
})

handle('vault:unlock', async (password) => {
  const envelope = await readEnvelope()
  if (!envelope) throw new Error('NO_VAULT')
  if (typeof password !== 'string' || password.length === 0) throw new Error('BAD_PASSWORD')
  if (failedAttempts >= 4) {
    await new Promise((resolve) => setTimeout(resolve, Math.min(1200 * (failedAttempts - 3), 4000)))
  }
  try {
    const { key, salt, data } = openEnvelope(envelope, password)
    const normalised = normaliseVault(data)
    session = {
      key,
      salt,
      createdAt: envelope.createdAt,
      data: normalised,
      autoLockMinutes: normalised.settings.autoLockMinutes || DEFAULT_AUTO_LOCK_MINUTES,
    }
    failedAttempts = 0
    armAutoLock(session.autoLockMinutes)
    return { data: normalised, hint: failedAttempts >= 3 ? envelope.hint : '' }
  } catch (err) {
    if (err.message === 'BAD_PASSWORD') {
      failedAttempts += 1
      throw new Error('BAD_PASSWORD')
    }
    throw err
  }
})

handle('vault:hint', async () => {
  const envelope = await readEnvelope()
  if (!envelope || failedAttempts < 3) throw new Error('HINT_LOCKED')
  return envelope.hint || ''
})

handle('vault:data', async () => {
  if (!session) throw new Error('LOCKED')
  return session.data
})

handle('vault:lock', async () => {
  lockVault('manual')
})

handle('vault:save', async (incoming) => {
  if (!session) throw new Error('LOCKED')
  const data = normaliseVault(incoming)
  data.updatedAt = Date.now()
  const envelope = makeEnvelope(data, session.key, session.salt, undefined, session.createdAt)
  envelope.hint = (await readEnvelope())?.hint || ''
  await writeEnvelope(envelope)
  session.data = data
  return { savedAt: data.updatedAt }
})

handle('vault:touch', async () => {
  touchSession()
})

handle('vault:set-autolock', async (minutes) => {
  if (!session) return
  const mins = Math.max(1, Math.min(Number(minutes) || DEFAULT_AUTO_LOCK_MINUTES, 240))
  session.autoLockMinutes = mins
  armAutoLock(mins)
})

handle('vault:set-lock-on-blur', async (on) => {
  lockOnBlur = Boolean(on)
})

handle('clipboard:copy', async (text, sensitive, clearAfter) => {
  if (typeof text !== 'string') return
  clipboard.writeText(text)
  if (clipboardTimer) {
    clearTimeout(clipboardTimer)
    clipboardTimer = null
  }
  lastSensitiveCopy = null
  if (sensitive && Number(clearAfter) > 0) {
    lastSensitiveCopy = text
    clipboardTimer = setTimeout(() => {
      try {
        if (clipboard.readText() === text) clipboard.clear()
      } catch {
        /* ignore */
      }
      lastSensitiveCopy = null
      clipboardTimer = null
    }, Math.min(Number(clearAfter), 600) * 1000)
  }
})

handle('vault:change-password', async (currentPassword, nextPassword) => {
  if (!session) throw new Error('LOCKED')
  if (typeof nextPassword !== 'string' || nextPassword.length < 10)
    throw new Error('WEAK_MASTER_PASSWORD')
  const envelope = await readEnvelope()
  if (!envelope) throw new Error('NO_VAULT')
  openEnvelope(envelope, currentPassword) // verifies the current password
  const salt = crypto.randomBytes(16).toString('base64')
  const key = deriveKey(nextPassword, salt)
  const next = makeEnvelope(session.data, key, salt, envelope.hint, envelope.createdAt)
  await writeEnvelope(next)
  // Overwrite the recovery copy so it is encrypted with the new key too.
  try {
    await fsp.copyFile(vaultFile(), `${vaultFile()}.bak`)
  } catch {
    /* ignore */
  }
  session.key = key
  session.salt = salt
})

handle('vault:breach-check', async (password) => {
  if (typeof password !== 'string' || !password) return 0
  const hash = crypto.createHash('sha1').update(password, 'utf8').digest('hex').toUpperCase()
  const prefix = hash.slice(0, 5)
  const suffix = hash.slice(5)
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 9000)
  try {
    const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      signal: controller.signal,
      headers: { 'Add-Padding': 'true', 'User-Agent': 'Aegis-Vault' },
    })
    if (!res.ok) throw new Error('BREACH_SERVICE_UNAVAILABLE')
    const body = await res.text()
    let count = 0
    for (const line of body.split('\n')) {
      const [suf, value] = line.trim().split(':')
      if (suf === suffix) {
        count = Number(value) || 0
        break
      }
    }
    return count
  } catch (err) {
    if (err.name === 'AbortError') throw new Error('BREACH_TIMEOUT')
    throw new Error('BREACH_SERVICE_UNAVAILABLE')
  } finally {
    clearTimeout(timeout)
  }
})

handle('vault:export', async (password) => {
  if (!session) throw new Error('LOCKED')
  if (typeof password !== 'string' || password.length < 8) throw new Error('WEAK_BACKUP_PASSWORD')
  const result = await dialog.showSaveDialog(win, {
    title: 'Export encrypted backup',
    defaultPath: `aegis-backup-${new Date().toISOString().slice(0, 10)}.aegis`,
    filters: [{ name: 'Aegis backup', extensions: ['aegis'] }],
  })
  if (result.canceled || !result.filePath) return { cancelled: true }
  const salt = crypto.randomBytes(16).toString('base64')
  const key = deriveKey(password, salt)
  const envelope = makeEnvelope(session.data, key, salt, 'Aegis encrypted backup')
  envelope.format = 'aegis-backup'
  await fsp.writeFile(result.filePath, JSON.stringify(envelope), { mode: 0o600 })
  return { cancelled: false, path: result.filePath }
})

handle('vault:import', async (password) => {
  if (!session) throw new Error('LOCKED')
  const result = await dialog.showOpenDialog(win, {
    title: 'Import Aegis backup',
    properties: ['openFile'],
    filters: [{ name: 'Aegis backup', extensions: ['aegis', 'json'] }],
  })
  if (result.canceled || !result.filePaths[0]) return { cancelled: true }
  const raw = await fsp.readFile(result.filePaths[0], 'utf8')
  let envelope
  try {
    envelope = JSON.parse(raw)
  } catch {
    throw new Error('INVALID_BACKUP')
  }
  if (envelope.format !== 'aegis-backup') throw new Error('INVALID_BACKUP')
  const { data } = openEnvelope(envelope, password)
  const merged = normaliseVault(data)
  merged.updatedAt = Date.now()
  const next = makeEnvelope(merged, session.key, session.salt, undefined, session.createdAt)
  next.hint = (await readEnvelope())?.hint || ''
  await writeEnvelope(next)
  session.data = merged
  return { cancelled: false, data: merged }
})

handle('vault:wipe', async () => {
  lockVault('wipe')
  try {
    await fsp.rm(vaultFile(), { force: true })
    await fsp.rm(`${vaultFile()}.bak`, { force: true })
  } catch {
    /* ignore */
  }
})

handle('window:control', async (action) => {
  if (!win) return
  if (action === 'minimize') win.minimize()
  else if (action === 'maximize') win.isMaximized() ? win.unmaximize() : win.maximize()
  else if (action === 'close') win.close()
})

handle('shell:external', async (url) => {
  if (typeof url === 'string' && /^https?:\/\//i.test(url)) await shell.openExternal(url)
})

handle('updater:get-state', async () => updateState)

handle('updater:check', async () => {
  if (!app.isPackaged) return updateState
  if (updateState.status === 'downloading') return updateState
  publishUpdateState({ status: 'checking', error: null })
  try {
    await autoUpdater.checkForUpdates()
  } catch (error) {
    console.error('[updater] check failed', error?.message || error)
    publishUpdateState({ status: 'error', error: friendlyUpdateError(error) })
  }
  return updateState
})

handle('updater:download', async () => {
  if (!app.isPackaged || updateState.status === 'downloading') return updateState
  if (updateState.status !== 'available') return updateState
  publishUpdateState({ status: 'downloading', progress: 0, error: null })
  try {
    await autoUpdater.downloadUpdate()
  } catch (error) {
    console.error('[updater] download failed', error?.message || error)
    publishUpdateState({ status: 'error', error: friendlyUpdateError(error) })
  }
  return updateState
})

handle('updater:install', async () => {
  if (updateState.status !== 'downloaded') return { ok: false, reason: 'not-ready' }
  // Let the IPC reply reach the renderer before the process is replaced.
  setTimeout(() => {
    try {
      autoUpdater.quitAndInstall(false, true)
    } catch (error) {
      console.error('[updater] install failed', error?.message || error)
    }
  }, 120)
  return { ok: true }
})

/* -------------------------------------------------------------- app menu */

/* Windows and Linux run menu-less because the window chrome is custom.
   macOS keeps a real menu bar, so give it the standard roles (⌘Q, ⌘H, ⌘W,
   edit shortcuts, full screen) instead of removing the menu entirely. */
function applyApplicationMenu() {
  if (process.platform !== 'darwin') {
    Menu.setApplicationMenu(null)
    return
  }
  Menu.setApplicationMenu(
    Menu.buildFromTemplate([
      { role: 'appMenu' },
      { role: 'editMenu' },
      {
        label: 'View',
        submenu: [
          { role: 'reload' },
          { role: 'toggleDevTools', visible: isDev },
          { type: 'separator' },
          { role: 'resetZoom' },
          { role: 'zoomIn' },
          { role: 'zoomOut' },
          { type: 'separator' },
          { role: 'togglefullscreen' },
        ],
      },
      { role: 'windowMenu' },
    ]),
  )
}

/* ------------------------------------------------------------------ set up */

const gotSingleInstance = app.requestSingleInstanceLock()
if (!gotSingleInstance) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (win) {
      if (win.isMinimized()) win.restore()
      win.show()
      win.focus()
    }
  })

  app.on('web-contents-created', (_event, contents) => {
    if (contents.getType() !== 'webview') return
    contents.setWindowOpenHandler(({ url }) => {
      if (/^https?:\/\//i.test(url)) shell.openExternal(url)
      return { action: 'deny' }
    })
    contents.on('will-navigate', (event, url) => {
      if (!/^https?:\/\//i.test(url)) event.preventDefault()
    })
  })

  app.whenReady().then(() => {
    nativeTheme.themeSource = 'dark'
    applyApplicationMenu()
    createWindow()
    setupUpdater()

    const openPalette = () => {
      if (!win) return
      if (win.isMinimized()) win.restore()
      win.show()
      win.focus()
      win.webContents.send('palette:open')
    }
    try {
      globalShortcut.register('CommandOrControl+Shift+Space', openPalette)
      globalShortcut.register('CommandOrControl+Shift+L', () => {
        if (session) lockVault('shortcut')
      })
    } catch {
      /* shortcuts unavailable */
    }

    powerMonitor.on('lock-screen', () => lockVault('system'))
    powerMonitor.on('suspend', () => lockVault('system'))

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  })
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
  clearSensitiveClipboard()
  stopUpdater()
})

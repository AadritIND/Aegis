const { contextBridge, ipcRenderer } = require('electron')

const call = (channel, ...args) => ipcRenderer.invoke(channel, ...args)

const subscribe = (channel, callback) => {
  const handler = (_event, payload) => callback(payload)
  ipcRenderer.on(channel, handler)
  return () => ipcRenderer.removeListener(channel, handler)
}

contextBridge.exposeInMainWorld('vault', {
  isElectron: true,
  appInfo: () => call('app:info'),

  status: () => call('vault:status'),
  create: (password, hint) => call('vault:create', password, hint),
  unlock: (password) => call('vault:unlock', password),
  data: () => call('vault:data'),
  hint: () => call('vault:hint'),
  lock: () => call('vault:lock'),
  save: (data) => call('vault:save', data),
  touch: () => call('vault:touch'),
  setAutoLock: (minutes) => call('vault:set-autolock', minutes),
  setLockOnBlur: (on) => call('vault:set-lock-on-blur', on),
  copy: (text, sensitive = false, clearAfter = 0) =>
    call('clipboard:copy', text, sensitive, clearAfter),
  changePassword: (current, next) => call('vault:change-password', current, next),
  breachCheck: (password) => call('vault:breach-check', password),
  exportBackup: (password) => call('vault:export', password),
  importBackup: (password) => call('vault:import', password),
  wipe: () => call('vault:wipe'),

  windowControl: (action) => call('window:control', action),
  openExternal: (url) => call('shell:external', url),

  updaterState: () => call('updater:get-state'),
  updaterCheck: () => call('updater:check'),
  updaterDownload: () => call('updater:download'),
  updaterInstall: () => call('updater:install'),

  onLocked: (cb) => subscribe('vault:locked', cb),
  onPalette: (cb) => subscribe('palette:open', cb),
  onWindowState: (cb) => subscribe('window:state', cb),
  onUpdaterState: (cb) => subscribe('updater:state', cb),
})

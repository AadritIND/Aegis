/* Aegis Browser Companion — service worker.
 * The extension only talks to the desktop app on loopback. The app decides
 * which credentials match the current site; this worker never holds the vault.
 */

const APP = 'http://127.0.0.1:47831'
const TOKEN_KEY = 'aegisToken'
const BROWSER_KEY = 'aegisBrowser'
const AUTOSAVE_KEY = 'aegisAutoSave'

const recentSaves = new Map()

function browserName() {
  const ua = navigator.userAgent
  const browser = /Edg\//.test(ua)
    ? 'Edge'
    : /Brave/.test(ua)
      ? 'Brave'
      : /OPR\//.test(ua)
        ? 'Opera'
        : /Chrome\//.test(ua)
          ? 'Chrome'
          : 'Chromium'
  const os = /Windows/.test(ua)
    ? 'Windows'
    : /Mac OS X/.test(ua)
      ? 'macOS'
      : /Linux/.test(ua)
        ? 'Linux'
        : 'this computer'
  return `${browser} on ${os}`
}

async function token() {
  const stored = await chrome.storage.local.get(TOKEN_KEY)
  return typeof stored[TOKEN_KEY] === 'string' ? stored[TOKEN_KEY] : ''
}

async function request(path, options = {}) {
  const auth = await token()
  const headers = { Accept: 'application/json', ...(options.headers || {}) }
  if (options.body) headers['Content-Type'] = 'application/json'
  if (auth) headers.Authorization = `Bearer ${auth}`

  let response
  try {
    response = await fetch(`${APP}${path}`, {
      ...options,
      cache: 'no-store',
      headers,
    })
  } catch {
    const error = new Error('Aegis is not reachable. Open the desktop app and unlock it.')
    error.code = 'OFFLINE'
    throw error
  }

  let body = null
  try {
    body = await response.json()
  } catch {
    /* non-json errors still carry a status */
  }

  if (!response.ok) {
    const error = new Error(body?.error || `Aegis returned ${response.status}.`)
    error.status = response.status
    error.code = body?.code || (response.status === 423 ? 'LOCKED' : 'REQUEST_FAILED')
    throw error
  }
  return body
}

async function status() {
  try {
    const result = await request('/v1/status')
    return {
      ok: true,
      connected: true,
      locked: Boolean(result.locked),
      paired: Boolean(result.paired),
      version: result.version || '',
      error: '',
    }
  } catch (error) {
    return {
      ok: true,
      connected: false,
      locked: true,
      paired: Boolean(await token()),
      version: '',
      error: error.message,
    }
  }
}

async function pair(code) {
  const clean = String(code || '').replace(/\s+/g, '')
  if (!/^\d{6}$/.test(clean)) throw new Error('Enter the six-digit code from Aegis.')
  const result = await request('/v1/pair', {
    method: 'POST',
    body: JSON.stringify({ code: clean, browser: browserName() }),
  })
  if (!result.token) throw new Error('Aegis did not return a pairing token.')
  await chrome.storage.local.set({
    [TOKEN_KEY]: result.token,
    [BROWSER_KEY]: result.browser || browserName(),
  })
  return { ok: true, browser: result.browser || browserName() }
}

async function matches(url) {
  if (!url || !/^https?:\/\//i.test(url)) return { ok: true, items: [], url: '' }
  const result = await request(`/v1/matches?url=${encodeURIComponent(url)}`)
  return { ok: true, items: Array.isArray(result.items) ? result.items : [], url }
}

async function ensureContent(tabId) {
  try {
    await chrome.tabs.sendMessage(tabId, { type: 'AEGIS_PING' })
  } catch {
    await chrome.scripting.executeScript({ target: { tabId }, files: ['content.js'] })
  }
}

async function fill(id, url, tabId) {
  if (!id || !tabId) throw new Error('Choose a login to fill.')
  const result = await request('/v1/fill', {
    method: 'POST',
    body: JSON.stringify({ id, url }),
  })
  await ensureContent(tabId)
  const filled = await chrome.tabs.sendMessage(tabId, {
    type: 'AEGIS_FILL_VALUES',
    values: {
      username: result.username || '',
      password: result.password || '',
    },
    itemName: result.name || 'login',
  })
  if (filled && filled.ok === false) {
    throw new Error('No sign-in fields were found on this page.')
  }
  return { ok: true, name: result.name || 'login' }
}

async function fillFirst(tab) {
  if (!tab?.id || !tab.url) throw new Error('Open a website first.')
  const result = await matches(tab.url)
  if (!result.items.length) throw new Error('No Aegis login matches this site.')
  return fill(result.items[0].id, tab.url, tab.id)
}

async function autoSaveEnabled() {
  const stored = await chrome.storage.local.get(AUTOSAVE_KEY)
  return stored[AUTOSAVE_KEY] !== false
}

async function saveCandidate(payload, tab) {
  if (!(await autoSaveEnabled())) return { ok: true, skipped: true }
  const candidate = {
    url: String(payload?.url || tab?.url || ''),
    username: String(payload?.username || '').slice(0, 512),
    password: String(payload?.password || '').slice(0, 4096),
    name: String(payload?.name || '').slice(0, 100),
  }
  if (!candidate.password || !/^https?:\/\//i.test(candidate.url)) {
    return { ok: true, skipped: true }
  }

  const key = `${candidate.url}|${candidate.username}|${candidate.password}`
  const now = Date.now()
  for (const [entry, at] of recentSaves) {
    if (now - at > 20000) recentSaves.delete(entry)
  }
  if (recentSaves.has(key)) return { ok: true, skipped: true }
  recentSaves.set(key, now)

  try {
    const result = await request('/v1/save', {
      method: 'POST',
      body: JSON.stringify(candidate),
    })
    if (tab?.id) {
      try {
        await chrome.tabs.sendMessage(tab.id, {
          type: 'AEGIS_TOAST',
          message:
            result.action === 'updated'
              ? `Aegis updated ${result.name}`
              : `Aegis saved ${result.name}`,
          tone: 'success',
        })
      } catch {
        /* the page may have navigated */
      }
    }
    return { ok: true, action: result.action, name: result.name }
  } catch (error) {
    recentSaves.delete(key)
    throw error
  }
}

async function setBadge(tabId, count) {
  if (!tabId) return
  try {
    await chrome.action.setBadgeBackgroundColor({ tabId, color: '#9ff5d2' })
    await chrome.action.setBadgeText({ tabId, text: count > 0 ? String(Math.min(count, 9)) : '' })
  } catch {
    /* tab may have closed */
  }
}

async function updateBadgeForTab(tab) {
  if (!tab?.id || !tab.url || !/^https?:\/\//i.test(tab.url)) return
  if (!(await token())) {
    await setBadge(tab.id, 0)
    return
  }
  try {
    const result = await matches(tab.url)
    await setBadge(tab.id, result.items.length)
  } catch {
    await setBadge(tab.id, 0)
  }
}

function createContextMenu() {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: 'aegis-fill',
      title: 'Fill with Aegis',
      contexts: ['editable', 'page'],
    })
  })
}

chrome.runtime.onInstalled.addListener(async () => {
  const stored = await chrome.storage.local.get(AUTOSAVE_KEY)
  if (stored[AUTOSAVE_KEY] === undefined) {
    await chrome.storage.local.set({ [AUTOSAVE_KEY]: true })
  }
  createContextMenu()
})

chrome.runtime.onStartup.addListener(createContextMenu)

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== 'fill-login') return
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  try {
    await fillFirst(tab)
  } catch (error) {
    if (tab?.id) {
      try {
        await chrome.tabs.sendMessage(tab.id, {
          type: 'AEGIS_TOAST',
          message: error.message,
          tone: 'error',
        })
      } catch {
        /* page has no content script */
      }
    }
  }
})

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== 'aegis-fill' || !tab) return
  try {
    await fillFirst(tab)
  } catch (error) {
    if (tab.id) {
      try {
        await chrome.tabs.sendMessage(tab.id, {
          type: 'AEGIS_TOAST',
          message: error.message,
          tone: 'error',
        })
      } catch {
        /* ignore */
      }
    }
  }
})

chrome.tabs.onUpdated.addListener((_tabId, info, tab) => {
  if (info.status === 'complete') void updateBadgeForTab(tab)
})

chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  try {
    const tab = await chrome.tabs.get(tabId)
    await updateBadgeForTab(tab)
  } catch {
    /* tab closed */
  }
})

async function handleMessage(message, sender) {
  const type = message?.type
  if (type === 'AEGIS_STATUS') return status()

  if (type === 'AEGIS_PAIR') {
    try {
      return await pair(message.code)
    } catch (error) {
      return { ok: false, error: error.message, code: error.code || null, status: error.status || 0 }
    }
  }

  if (type === 'AEGIS_DISCONNECT') {
    await chrome.storage.local.remove([TOKEN_KEY, BROWSER_KEY])
    if (sender.tab?.id) await setBadge(sender.tab.id, 0)
    return { ok: true }
  }

  if (type === 'AEGIS_GET_MATCHES') {
    try {
      return await matches(message.url || sender.tab?.url || '')
    } catch (error) {
      return { ok: false, error: error.message, code: error.code || null, status: error.status || 0 }
    }
  }

  if (type === 'AEGIS_FILL') {
    try {
      return await fill(message.id, message.url || sender.tab?.url || '', message.tabId || sender.tab?.id)
    } catch (error) {
      return { ok: false, error: error.message, code: error.code || null, status: error.status || 0 }
    }
  }

  if (type === 'AEGIS_FILL_FIRST') {
    try {
      const tab =
        message.tabId != null
          ? await chrome.tabs.get(message.tabId)
          : (await chrome.tabs.query({ active: true, currentWindow: true }))[0]
      return await fillFirst(tab)
    } catch (error) {
      return { ok: false, error: error.message, code: error.code || null, status: error.status || 0 }
    }
  }

  if (type === 'AEGIS_SAVE_CANDIDATE') {
    try {
      return await saveCandidate(message, sender.tab)
    } catch (error) {
      return { ok: false, error: error.message, code: error.code || null, status: error.status || 0 }
    }
  }

  if (type === 'AEGIS_LOGIN_FORM') {
    const tab = sender.tab
    if (tab?.id) void updateBadgeForTab(tab)
    return { ok: true }
  }

  if (type === 'AEGIS_SETTINGS_GET') {
    return { ok: true, autoSave: await autoSaveEnabled() }
  }

  if (type === 'AEGIS_SETTINGS_SET') {
    await chrome.storage.local.set({ [AUTOSAVE_KEY]: Boolean(message.autoSave) })
    return { ok: true, autoSave: Boolean(message.autoSave) }
  }

  if (type === 'AEGIS_FOCUS') {
    try {
      await request('/v1/focus', { method: 'POST' })
      return { ok: true }
    } catch (error) {
      return { ok: false, error: error.message }
    }
  }

  if (type === 'AEGIS_LOCK') {
    try {
      await request('/v1/lock', { method: 'POST' })
      return { ok: true }
    } catch (error) {
      return { ok: false, error: error.message, code: error.code || null, status: error.status || 0 }
    }
  }

  return { ok: false, error: 'Unknown Aegis request.' }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || typeof message.type !== 'string' || !message.type.startsWith('AEGIS_')) {
    return false
  }
  void handleMessage(message, sender)
    .then(sendResponse)
    .catch((error) => sendResponse({ ok: false, error: error.message || 'Aegis request failed.' }))
  return true
})

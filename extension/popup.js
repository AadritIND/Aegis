/* Aegis Browser Companion — popup controller. */
(() => {
  const $ = (selector) => document.querySelector(selector)
  const pairView = $('#pair-view')
  const mainView = $('#main-view')
  const statusPill = $('#status-pill')
  const statusText = $('#status-text')
  const pairCode = $('#pair-code')
  const pairError = $('#pair-error')
  const pairButton = $('#pair-button')
  const matchesEl = $('#matches')
  const emptyEl = $('#empty')
  const matchCount = $('#match-count')
  const siteHost = $('#site-host')
  const lockedNote = $('#locked-note')
  const offlineNote = $('#offline-note')
  const autoSaveButton = $('#autosave')
  const messageEl = $('#message')

  let currentTab = null
  let autoSave = true

  function send(type, payload = {}) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({ type, ...payload }, (response) => {
        const runtimeError = chrome.runtime.lastError
        if (runtimeError) reject(new Error(runtimeError.message))
        else resolve(response)
      })
    })
  }

  function setStatus(text, kind = '') {
    statusText.textContent = text
    statusPill.className = `status${kind ? ` is-${kind}` : ''}`
  }

  function showMessage(text, isError = false) {
    messageEl.textContent = text
    messageEl.hidden = !text
    messageEl.className = `message${isError ? ' is-error' : ''}`
  }

  function hostOf(url) {
    try {
      return new URL(url).hostname.replace(/^www\./, '')
    } catch {
      return ''
    }
  }

  function initials(name) {
    return String(name || '?')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0].toUpperCase())
      .join('')
  }

  function renderMatches(items) {
    matchesEl.innerHTML = ''
    matchCount.textContent = String(items.length)
    emptyEl.hidden = items.length > 0
    for (const item of items) {
      const row = document.createElement('div')
      row.className = 'match'
      const badge = document.createElement('span')
      badge.className = 'match__badge'
      badge.textContent = initials(item.name)
      const text = document.createElement('span')
      text.className = 'match__text'
      const title = document.createElement('b')
      title.textContent = item.name || 'Saved login'
      const user = document.createElement('small')
      user.textContent = item.username || hostOf(item.url) || 'Saved in Aegis'
      text.append(title, user)
      const button = document.createElement('button')
      button.type = 'button'
      button.className = 'match__fill'
      button.textContent = 'Fill'
      button.addEventListener('click', () => void doFill(item, button))
      row.append(badge, text, button)
      matchesEl.append(row)
    }
  }

  async function refresh() {
    setStatus('Checking')
    const status = await send('AEGIS_STATUS')
    if (!status?.connected) {
      setStatus('Offline', 'error')
      offlineNote.hidden = false
      lockedNote.hidden = true
      showMessage(status?.error || 'Open Aegis to connect.', true)
      if (!status?.paired) {
        pairView.hidden = false
        mainView.hidden = true
        return
      }
    } else {
      offlineNote.hidden = true
      setStatus(status.locked ? 'Locked' : 'Connected', status.locked ? '' : 'live')
    }

    if (!status?.paired) {
      pairView.hidden = false
      mainView.hidden = true
      pairCode.focus()
      return
    }

    pairView.hidden = true
    mainView.hidden = false
    $('#version').textContent = `v${status.version || '1.0.5'} · loopback only`
    siteHost.textContent = currentTab?.url ? hostOf(currentTab.url) || 'This page' : 'No active website'
    lockedNote.hidden = !status.locked
    if (status.locked || !status.connected) {
      renderMatches([])
      matchCount.textContent = '—'
      return
    }
    if (!currentTab?.url || !/^https?:\/\//i.test(currentTab.url)) {
      renderMatches([])
      emptyEl.hidden = false
      emptyEl.querySelector('b').textContent = 'This page is not a website.'
      emptyEl.querySelector('span:last-child').textContent = 'Open a sign-in page to fill a saved login.'
      return
    }
    emptyEl.querySelector('b').textContent = 'No login for this site.'
    emptyEl.querySelector('span:last-child').textContent =
      'Save one in Aegis, or let auto-save catch it on your next sign-in.'
    const result = await send('AEGIS_GET_MATCHES', { url: currentTab.url })
    if (!result?.ok) {
      showMessage(result?.error || 'Could not load matches.', true)
      renderMatches([])
      if (result?.status === 423) lockedNote.hidden = false
      return
    }
    renderMatches(result.items || [])
  }

  async function doFill(item, button) {
    if (!currentTab?.url) return
    button.disabled = true
    button.textContent = '…'
    showMessage('')
    const result = await send('AEGIS_FILL', { id: item.id, url: currentTab.url, tabId: currentTab.id })
    if (!result?.ok) {
      button.disabled = false
      button.textContent = 'Fill'
      showMessage(result?.error || 'Could not fill this page.', true)
      if (result?.status === 423) await refresh()
      return
    }
    button.textContent = 'Done'
    setStatus('Filled', 'live')
    window.setTimeout(() => window.close(), 650)
  }

  async function doPair(event) {
    event.preventDefault()
    pairError.textContent = ''
    pairButton.disabled = true
    pairButton.textContent = 'Pairing…'
    const result = await send('AEGIS_PAIR', { code: pairCode.value })
    pairButton.disabled = false
    pairButton.textContent = 'Pair'
    if (!result?.ok) {
      pairError.textContent = result?.error || 'That code was not accepted.'
      pairCode.select()
      return
    }
    pairCode.value = ''
    await refresh()
  }

  function generatePassword(length = 20) {
    const groups = [
      'abcdefghijkmnopqrstuvwxyz',
      'ABCDEFGHJKLMNPQRSTUVWXYZ',
      '23456789',
      '!@#$%^&*()-_=+[]{};:,.?',
    ]
    const all = groups.join('')
    const bytes = new Uint32Array(length)
    crypto.getRandomValues(bytes)
    const chars = []
    for (let i = 0; i < length; i += 1) chars.push(all[bytes[i] % all.length])
    for (let i = 0; i < groups.length; i += 1) {
      const index = bytes[i] % length
      chars[index] = groups[i][bytes[i] % groups[i].length]
    }
    return chars.join('')
  }

  async function generate() {
    const value = generatePassword()
    const output = $('#generated')
    output.textContent = value
    output.hidden = false
    try {
      await navigator.clipboard.writeText(value)
      showMessage('New password copied to the clipboard.')
    } catch {
      showMessage('Password generated. Select it above to copy.', true)
    }
  }

  async function setAutoSave(next) {
    autoSave = next
    autoSaveButton.setAttribute('aria-checked', String(next))
    await send('AEGIS_SETTINGS_SET', { autoSave: next })
  }

  pairCode?.addEventListener('input', () => {
    pairCode.value = pairCode.value.replace(/\D/g, '').slice(0, 6)
  })
  $('#pair-form')?.addEventListener('submit', doPair)
  autoSaveButton?.addEventListener('click', () => void setAutoSave(!autoSave))
  $('#generate-button')?.addEventListener('click', () => void generate())
  $('[data-action="refresh"]')?.addEventListener('click', () => void refresh())
  document.querySelectorAll('[data-action="focus"]').forEach((button) => {
    button.addEventListener('click', () => {
      void send('AEGIS_FOCUS')
      window.setTimeout(() => window.close(), 300)
    })
  })
  $('[data-action="lock"]')?.addEventListener('click', async () => {
    await send('AEGIS_LOCK')
    await refresh()
  })
  $('[data-action="options"]')?.addEventListener('click', () => chrome.runtime.openOptionsPage())
  $('[data-action="disconnect"]')?.addEventListener('click', async () => {
    if (!window.confirm('Unpair this browser from Aegis?')) return
    await send('AEGIS_DISCONNECT')
    await refresh()
  })

  void (async () => {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
    currentTab = tabs[0] || null
    const settings = await send('AEGIS_SETTINGS_GET')
    autoSave = settings?.autoSave !== false
    autoSaveButton.setAttribute('aria-checked', String(autoSave))
    await refresh()
  })()
})()

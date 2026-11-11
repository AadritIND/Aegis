/* Aegis Browser Companion — options controller. */
(() => {
  const $ = (selector) => document.querySelector(selector)
  const status = $('#options-status')
  const statusText = $('#options-status-text')
  const detail = $('#connection-detail')
  const autosave = $('#options-autosave')

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
    status.className = `status${kind ? ` is-${kind}` : ''}`
  }

  async function refresh() {
    const result = await send('AEGIS_STATUS')
    if (!result?.connected) {
      setStatus('Offline', 'error')
      detail.textContent = 'The desktop app is not running on this computer.'
    } else if (!result.paired) {
      setStatus('Not paired', 'error')
      detail.textContent = 'Open Aegis → Settings → Browser extension to pair this browser.'
    } else if (result.locked) {
      setStatus('Locked')
      detail.textContent = 'Connected, but the vault is locked. Unlock Aegis to fill logins.'
    } else {
      setStatus('Connected', 'live')
      detail.textContent = 'Paired with Aegis on 127.0.0.1. Your vault stays in the desktop app.'
    }
    $('#options-version').textContent = `Aegis v${result?.version || '1.0.5'}`
    const settings = await send('AEGIS_SETTINGS_GET')
    autosave.setAttribute('aria-checked', String(settings?.autoSave !== false))
  }

  autosave.addEventListener('click', async () => {
    const next = autosave.getAttribute('aria-checked') !== 'true'
    autosave.setAttribute('aria-checked', String(next))
    await send('AEGIS_SETTINGS_SET', { autoSave: next })
  })

  $('#open-app').addEventListener('click', () => void send('AEGIS_FOCUS'))
  $('#unpair').addEventListener('click', async () => {
    if (!window.confirm('Unpair this browser from Aegis?')) return
    await send('AEGIS_DISCONNECT')
    await refresh()
  })

  void refresh()
})()

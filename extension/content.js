/* Aegis Browser Companion — content script.
 * Detects login forms, fills the fields the app returns, and forwards a
 * submitted credential to the extension worker for optional auto-save.
 */
(() => {
  if (window.__aegisCompanionLoaded) return
  window.__aegisCompanionLoaded = true

  const PREFIX = 'aegis-companion'
  let announceTimer = 0

  function safeSend(message) {
    try {
      return chrome.runtime.sendMessage(message).catch(() => null)
    } catch {
      return Promise.resolve(null)
    }
  }

  function visible(element) {
    if (!(element instanceof HTMLElement)) return false
    if (element.hidden || element.getAttribute('aria-hidden') === 'true') return false
    const style = window.getComputedStyle(element)
    if (style.display === 'none' || style.visibility === 'hidden') return false
    const rect = element.getBoundingClientRect()
    return rect.width > 0 && rect.height > 0
  }

  function passwordFields(root = document) {
    return [...root.querySelectorAll('input[type="password"]')].filter(
      (field) => visible(field) && !field.disabled && !field.readOnly,
    )
  }

  function usernameField(form, password) {
    const scope = form || password.closest('form') || document
    const inputs = [...scope.querySelectorAll('input')].filter((field) => {
      const type = (field.getAttribute('type') || 'text').toLowerCase()
      return visible(field) && !field.disabled && !field.readOnly && ['text', 'email', 'tel', ''].includes(type)
    })
    const scored = inputs.map((field) => {
      const haystack = `${field.name} ${field.id} ${field.getAttribute('autocomplete') || ''} ${field.placeholder || ''}`.toLowerCase()
      let score = 0
      if ((field.getAttribute('autocomplete') || '').toLowerCase() === 'username') score += 8
      if ((field.getAttribute('autocomplete') || '').toLowerCase() === 'email') score += 7
      if (field.type === 'email') score += 6
      if (/user|email|login|account/.test(haystack)) score += 4
      if (field.compareDocumentPosition(password) & Node.DOCUMENT_POSITION_FOLLOWING) score += 2
      return { field, score }
    })
    scored.sort((a, b) => b.score - a.score)
    return scored[0]?.score > 0 ? scored[0].field : null
  }

  function setValue(field, value) {
    if (!field) return false
    const proto =
      field instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
    const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set
    if (setter) setter.call(field, value)
    else field.value = value
    field.dispatchEvent(new Event('input', { bubbles: true }))
    field.dispatchEvent(new Event('change', { bubbles: true }))
    return true
  }

  function fill(values) {
    const passwords = passwordFields()
    const password = passwords[0]
    if (!password) return { user: false, pass: false }
    const form = password.closest('form')
    const user = usernameField(form, password)
    const userFilled = Boolean(values.username && user && setValue(user, values.username))
    const passFilled = Boolean(values.password && setValue(password, values.password))
    if (userFilled) user.focus()
    else if (passFilled) password.focus()
    return { user: userFilled, pass: passFilled }
  }

  function toast(message, tone = 'success') {
    const existing = document.getElementById(`${PREFIX}-toast-host`)
    if (existing) existing.remove()
    const host = document.createElement('div')
    host.id = `${PREFIX}-toast-host`
    host.style.cssText =
      'position:fixed;top:18px;right:18px;z-index:2147483647;pointer-events:none;font-family:ui-sans-serif,system-ui,sans-serif'
    const root = host.attachShadow({ mode: 'open' })
    const wrap = document.createElement('div')
    wrap.style.cssText = [
      'display:flex;align-items:center;gap:10px;max-width:360px;padding:11px 14px;border-radius:12px',
      'background:#0d1214;color:#eaf7f1;border:1px solid rgba(159,245,210,.34)',
      'box-shadow:0 20px 50px -24px rgba(0,0,0,.85);font-size:12px;line-height:1.4',
    ].join(';')
    if (tone === 'error') wrap.style.borderColor = 'rgba(255,107,87,.55)'
    const mark = document.createElement('span')
    mark.textContent = tone === 'error' ? '!' : '✓'
    mark.style.cssText = [
      'display:grid;place-items:center;width:20px;height:20px;flex:0 0 20px;border-radius:50%',
      `background:${tone === 'error' ? 'rgba(255,107,87,.18)' : 'rgba(159,245,210,.16)'}`,
      `color:${tone === 'error' ? '#ff9d8e' : '#9ff5d2'};font-weight:700;font-size:11px`,
    ].join(';')
    const text = document.createElement('span')
    text.textContent = message
    wrap.append(mark, text)
    root.append(wrap)
    ;(document.body || document.documentElement).append(host)
    window.setTimeout(() => host.remove(), 3200)
  }

  function capture(form) {
    if (!(form instanceof HTMLFormElement)) return
    const password = passwordFields(form)[0]
    if (!password || !password.value) return
    const user = usernameField(form, password)
    const username = user?.value?.trim() || ''
    if (!username && password.value.length < 4) return
    void safeSend({
      type: 'AEGIS_SAVE_CANDIDATE',
      url: location.href,
      username,
      password: password.value,
      name: document.title || location.hostname,
    })
  }

  function announceForm() {
    if (announceTimer) return
    announceTimer = window.setTimeout(() => {
      announceTimer = 0
      if (passwordFields().length) void safeSend({ type: 'AEGIS_LOGIN_FORM' })
    }, 450)
  }

  document.addEventListener(
    'submit',
    (event) => {
      if (event.target instanceof HTMLFormElement) capture(event.target)
    },
    true,
  )

  document.addEventListener(
    'click',
    (event) => {
      const target = event.target instanceof Element ? event.target : null
      const button = target?.closest('button, input[type="submit"]')
      if (!button) return
      const form = button.closest('form')
      if (!form) return
      window.setTimeout(() => capture(form), 80)
    },
    true,
  )

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter') return
    const target = event.target
    if (!(target instanceof HTMLInputElement) || target.type !== 'password') return
    const form = target.closest('form')
    if (form) window.setTimeout(() => capture(form), 80)
  })

  const observer = new MutationObserver(() => {
    if (passwordFields().length) announceForm()
  })
  if (document.documentElement) {
    observer.observe(document.documentElement, { childList: true, subtree: true })
  }
  announceForm()

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === 'AEGIS_PING') {
      sendResponse({ ok: true })
      return
    }
    if (message?.type === 'AEGIS_FILL_VALUES') {
      const result = fill(message.values || {})
      if (result.user || result.pass) {
        toast(`Filled by Aegis${message.itemName ? ` · ${message.itemName}` : ''}`)
      } else {
        toast('No sign-in fields found on this page.', 'error')
      }
      sendResponse({ ok: result.user || result.pass, ...result })
      return
    }
    if (message?.type === 'AEGIS_TOAST') {
      toast(message.message || 'Aegis', message.tone === 'error' ? 'error' : 'success')
      sendResponse({ ok: true })
    }
  })
})()

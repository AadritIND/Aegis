/* End-to-end check against the real Electron main process and encrypted vault. */
const { app } = require('electron')
const fs = require('fs')
const os = require('os')
const path = require('path')

const userData = path.join(os.tmpdir(), `aegis-e2e-${process.pid}`)
fs.rmSync(userData, { recursive: true, force: true })
app.setPath('userData', userData)
if (!process.env.E2E_PROD) process.env.VITE_DEV_SERVER_URL = 'http://127.0.0.1:5273'

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
let win = null
const errors = []

app.on('browser-window-created', (_event, created) => {
  win = created
  created.webContents.on('console-message', (_e, level, message) => {
    if (level >= 2) errors.push(message)
  })
})

require('../electron/main.cjs')

const run = (code) => win.webContents.executeJavaScript(code, true)

async function waitFor(selector, timeout = 12000) {
  const started = Date.now()
  while (Date.now() - started < timeout) {
    if (await run(`Boolean(document.querySelector(${JSON.stringify(selector)}))`)) return true
    await wait(200)
  }
  throw new Error(`Timed out waiting for ${selector}`)
}

async function main() {
  while (!win) await wait(100)
  await wait(1200)
  await waitFor('#gate-name')
  console.log('onboarding: visible')

  await run(`(() => {
    const set = (sel, value) => {
      const input = document.querySelector(sel);
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
      setter.call(input, value);
      input.dispatchEvent(new Event('input', { bubbles: true }));
    };
    set('#gate-name', 'E2E Tester');
    set('#gate-password', 'Sealed-master-9182!');
    set('#gate-confirm', 'Sealed-master-9182!');
    set('#gate-hint', 'the test password');
    document.querySelector('.gate-ack').click();
    return true;
  })()`)
  await wait(600)
  await run(`document.querySelector('.gate__submit').click()`)
  await wait(1800)
  try {
    await waitFor('.bento')
  } catch (error) {
    console.log('gate text:', await run(`document.querySelector('.gate-card')?.innerText`))
    throw error
  }
  console.log('vault created: dashboard visible')

  const status = await run(`window.vault.status()`)
  if (!status.exists || !status.unlocked) throw new Error('Status not unlocked after create')
  if (!status.hint) throw new Error('Hint was not persisted in the envelope')

  await run(`document.querySelector('.page-actions .btn-primary').click()`)
  await waitFor('.editor')
  await wait(250)
  await run(`(() => {
    const set = (sel, value) => {
      const input = document.querySelector(sel);
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
      setter.call(input, value);
      input.dispatchEvent(new Event('input', { bubbles: true }));
    };
    set('#editor-name', 'E2E Secret');
    set('#field-username', 'tester@aegis.local');
    set('#field-password', 'G7!vQ2#pL9@xR4$t');
    set('#field-url', 'example.com');
    return true;
  })()`)
  await wait(300)
  await run(`document.querySelector('.editor__foot .btn-primary').click()`)
  await wait(1200)
  const editorGone = await run(`!document.querySelector('.editor')`)
  if (!editorGone) throw new Error('Editor did not close after save')
  console.log('item saved through UI')

  const vaultPath = path.join(userData, 'aegis.vault')
  if (!fs.existsSync(vaultPath)) throw new Error('Vault file was not written')
  const raw = fs.readFileSync(vaultPath, 'utf8')
  if (raw.includes('E2E Secret') || raw.includes('G7!vQ2#pL9@xR4$t')) {
    throw new Error('Vault file contains plaintext secrets')
  }
  const envelope = JSON.parse(raw)
  if (envelope.format !== 'aegis-vault') throw new Error('Unexpected envelope format')
  if (envelope.kdf.name !== 'scrypt' || envelope.cipher.name !== 'aes-256-gcm') {
    throw new Error('Unexpected crypto envelope')
  }
  console.log('vault file encrypted: no plaintext, scrypt + aes-256-gcm')

  await run(`document.querySelector('.nav-lock').click()`)
  await wait(900)
  await waitFor('#gate-password')
  console.log('locked: gate visible')

  await run(`(() => {
    const input = document.querySelector('#gate-password');
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    setter.call(input, 'Sealed-master-9182!');
    input.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
  })()`)
  await wait(250)
  await run(`document.querySelector('.gate__submit').click()`)
  await wait(1700)
  await waitFor('.bento')
  const persisted = await run(`document.body.innerText.includes('E2E Secret')`)
  if (!persisted) throw new Error('Saved item was not visible after unlock')
  console.log('unlocked: persisted item is visible')

  await run(`document.querySelector('.nav-link[aria-label="Autofill"]').click()`)
  await wait(700)
  await run(`document.querySelector('.browser__suggestion').click()`)
  await wait(5000)
  const webviewUrl = await run(`(() => {
    const el = document.querySelector('webview');
    if (!el) return null;
    try { return el.getURL(); } catch (error) { return 'ERROR: ' + error.message; }
  })()`)
  console.log('webview url:', webviewUrl)

  if (errors.length) {
    console.log('renderer console errors:', errors.slice(0, 8))
  } else {
    console.log('renderer console: clean')
  }
  console.log('E2E PASS')
  win.destroy()
  app.quit()
}

main().catch((error) => {
  console.error('E2E FAIL:', error.message)
  if (errors.length) console.error(errors.slice(0, 8))
  app.exit(1)
})

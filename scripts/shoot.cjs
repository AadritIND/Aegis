/* Internal visual QA: render Aegis offscreen and capture each screen. */
const { app, BrowserWindow } = require('electron')
const fs = require('fs')
const path = require('path')

app.disableHardwareAcceleration()
app.on('window-all-closed', () => {})

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const outDir = path.join(process.cwd(), 'screenshots')
const BASE = 'http://127.0.0.1:5273/'

async function makeWindow(width, height, url) {
  const win = new BrowserWindow({
    width,
    height,
    show: false,
    backgroundColor: '#05070d',
    webPreferences: {
      offscreen: true,
      backgroundThrottling: false,
      contextIsolation: true,
      nodeIntegration: false,
    },
  })
  win.webContents.setFrameRate(30)
  await win.loadURL(url)
  await wait(1500)
  await win.webContents.executeJavaScript('document.fonts.ready.then(() => true)')
  return win
}

async function shot(win, name) {
  const image = await win.webContents.capturePage()
  fs.writeFileSync(path.join(outDir, name), image.toPNG())
  console.log('captured', name, image.getSize())
}

const run = (win, code) => win.webContents.executeJavaScript(code, true)

async function unlock(win) {
  await run(
    win,
    `(() => {
      const input = document.querySelector('#gate-password');
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
      setter.call(input, 'demo');
      input.dispatchEvent(new Event('input', { bubbles: true }));
      document.querySelector('.gate__submit').click();
      return true;
    })()`,
  )
  await wait(2200)
}

async function main() {
  fs.mkdirSync(outDir, { recursive: true })

  const win = await makeWindow(1440, 900, BASE)
  await shot(win, '01-gate.png')
  await unlock(win)
  await shot(win, '02-dashboard.png')

  await run(win, `document.querySelector('.nav-link[aria-label="Vault"]')?.click()`)
  await wait(1100)
  await shot(win, '03-vault.png')

  await run(win, `document.querySelector('.vault-row:nth-child(2)')?.click()`)
  await wait(500)
  await shot(win, '04-vault-detail.png')

  await run(win, `document.querySelector('.nav-link[aria-label="Forge"]')?.click()`)
  await wait(2000)
  await shot(win, '05-generator.png')

  await run(win, `document.querySelector('.nav-link[aria-label="Autofill"]')?.click()`)
  await wait(1000)
  await shot(win, '06-autofill.png')

  await run(win, `document.querySelector('.nav-link[aria-label="Settings"]')?.click()`)
  await wait(1000)
  await shot(win, '07-settings.png')

  await run(win, `document.querySelector('.nav-link[aria-label="Home"]')?.click()`)
  await wait(900)
  await run(win, `document.querySelector('.nav-search')?.click()`)
  await wait(800)
  await shot(win, '08-palette.png')
  await run(win, `window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))`)
  await wait(400)

  await run(win, `document.querySelector('.page-actions .btn-outline')?.click()`)
  await wait(900)
  await shot(win, '09-audit.png')
  await run(win, `document.querySelector('.audit__scan .btn')?.click()`)
  await wait(2800)
  await shot(win, '10-audit-scan.png')
  await run(win, `window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))`)
  await wait(500)

  await run(win, `document.querySelector('.page-actions .btn-primary')?.click()`)
  await wait(1000)
  await shot(win, '11-editor.png')
  await run(win, `document.querySelector('.editor .modal__head .icon-btn')?.click()`)
  await wait(500)

  await run(win, `document.querySelector('.tile-posture')?.scrollIntoView({ block: 'center' })`)
  await wait(500)
  await shot(win, '12-scrolled.png')
  win.destroy()

  /* onboarding + empty dashboard */
  const onboard = await makeWindow(1440, 900, `${BASE}?onboarding=1`)
  await shot(onboard, '13-onboarding.png')
  await run(
    onboard,
    `(() => {
      const setValue = (sel, value) => {
        const input = document.querySelector(sel);
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
        setter.call(input, value);
        input.dispatchEvent(new Event('input', { bubbles: true }));
      };
      setValue('#gate-name', 'Alex');
      setValue('#gate-password', 'mint-glacier-99!');
      setValue('#gate-confirm', 'mint-glacier-99!');
      setValue('#gate-hint', 'the cold one');
      document.querySelector('.gate-ack')?.click();
      return true;
    })()`,
  )
  await wait(500)
  await run(onboard, `document.querySelector('.gate__submit')?.click()`)
  await wait(2800)
  await shot(onboard, '14-empty-dashboard.png')
  onboard.destroy()

  /* minimum supported window */
  const small = await makeWindow(1040, 740, BASE)
  await shot(small, '15-gate-1040.png')
  await unlock(small)
  await shot(small, '16-dashboard-1040.png')
  await run(small, `document.querySelector('.nav-link[aria-label="Vault"]')?.click()`)
  await wait(1000)
  await shot(small, '17-vault-1040.png')
  small.destroy()

  app.quit()
}

app
  .whenReady()
  .then(main)
  .catch((err) => {
    console.error(err)
    app.exit(1)
  })

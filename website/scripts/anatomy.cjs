/* Screenshots the new anatomy section at several scroll positions. */
const { app, BrowserWindow } = require('electron')
const fs = require('fs')
const path = require('path')

const OUT = path.join(__dirname, '..', '..', 'shots-anatomy')
fs.mkdirSync(OUT, { recursive: true })
app.on('window-all-closed', () => {})
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

async function make(width, height) {
  const win = new BrowserWindow({
    width,
    height,
    show: false,
    backgroundColor: '#070706',
    webPreferences: { offscreen: true, backgroundThrottling: false },
  })
  win.webContents.setFrameRate(30)
  await win.loadURL('http://localhost:5310/?intro=off')
  await win.webContents.executeJavaScript('document.fonts.ready.then(() => true)', true)
  await wait(1200)
  return win
}

const run = (w, code) => w.webContents.executeJavaScript(code, true)

async function shot(win, name) {
  const img = await win.webContents.capturePage()
  fs.writeFileSync(path.join(OUT, `${name}.png`), img.toPNG())
  console.log('shot', name)
}

async function main() {
  const win = await make(1440, 950)
  const start = await run(
    win,
    `(() => {
      const el = document.querySelector('.anatomy__stage');
      if (!el) return -1;
      const top = el.getBoundingClientRect().top + window.scrollY;
      return Math.round(top);
    })()`,
  )
  console.log('stage top', start)
  for (const [name, f] of [
    ['anatomy-0', 0],
    ['anatomy-12', 0.12],
    ['anatomy-28', 0.28],
    ['anatomy-44', 0.44],
    ['anatomy-60', 0.6],
    ['anatomy-76', 0.76],
    ['anatomy-92', 0.92],
    ['anatomy-100', 1],
  ]) {
    await run(win, `window.scrollTo({ top: ${start + f * 2.1 * 950}, behavior: 'auto' })`)
    await wait(900)
    const state = await run(
      win,
      `JSON.stringify({ active: document.querySelector('.anatomy__counter b')?.textContent, title: document.querySelector('.anatomy__copy h3')?.textContent })`,
    )
    console.log(name, state)
    await shot(win, name)
  }
  await run(win, `window.scrollTo({ top: 0, behavior: 'auto' })`)
  await wait(700)
  await shot(win, 'hero-1440')

  const m = await make(420, 900)
  await run(m, `window.scrollTo({ top: 500, behavior: 'auto' })`)
  await wait(600)
  const mStart = await run(
    m,
    `(() => { const el = document.querySelector('.anatomy__stage'); return el ? Math.round(el.getBoundingClientRect().top + window.scrollY) : -1 })()`,
  )
  await run(m, `window.scrollTo({ top: ${mStart}, behavior: 'auto' })`)
  await wait(800)
  await shot(m, 'anatomy-mobile')
  m.destroy()

  app.quit()
}

app.whenReady().then(main)

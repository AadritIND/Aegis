/* Final visual QA: default tint, cold start, hero, section seams, mobile. */
const { app, BrowserWindow } = require('electron')
const fs = require('fs')
const path = require('path')

const OUT = path.join(__dirname, '..', '..', 'shots-final')
fs.mkdirSync(OUT, { recursive: true })
app.on('window-all-closed', () => {})
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const run = (w, code) => w.webContents.executeJavaScript(code, true)

async function make(width, height, url) {
  const win = new BrowserWindow({
    width,
    height,
    show: false,
    backgroundColor: '#070706',
    webPreferences: { offscreen: true, backgroundThrottling: false },
  })
  win.webContents.setFrameRate(30)
  await win.loadURL(url)
  return win
}

async function shot(win, name) {
  const img = await win.webContents.capturePage()
  fs.writeFileSync(path.join(OUT, `${name}.png`), img.toPNG())
  console.log('shot', name)
}

async function main() {
  const base = 'http://localhost:5310/'
  const win = await make(1440, 950, base)
  await run(win, `localStorage.removeItem('aegis.tint')`)
  await win.loadURL(base)
  await run(win, `document.fonts.ready.then(() => true)`)
  const start = Date.now()
  for (const beat of [900, 1900, 2900, 3500, 4000, 4600, 5400, 6800]) {
    const delay = beat - (Date.now() - start)
    if (delay > 0) await wait(delay)
    await shot(win, `boot-${beat}`)
  }

  const heroWin = await make(1440, 950, base + '?intro=off')
  await run(heroWin, `localStorage.removeItem('aegis.tint')`)
  await heroWin.loadURL(base + '?intro=off')
  await run(heroWin, `document.fonts.ready.then(() => true)`)
  await wait(1800)
  await shot(heroWin, 'hero-acid')
  await run(heroWin, `window.scrollTo({ top: 10800, behavior: 'auto' })`)
  await wait(900)
  await shot(heroWin, 'anatomy-head')
  await run(heroWin, `document.querySelector('#download').scrollIntoView({ block: 'start' })`)
  await wait(900)
  await shot(heroWin, 'download-acid')

  const mob = await make(390, 844, base + '?intro=off')
  await wait(1800)
  await shot(mob, 'm-hero')
  await run(mob, `document.querySelector('.nav__burger').click()`)
  await wait(700)
  await shot(mob, 'm-menu')
  await run(mob, `document.querySelector('.nav__burger').click()`)
  await wait(500)
  const tourTop = await run(
    mob,
    `(() => { const el = document.querySelector('.tour__stage'); return el ? Math.round(el.getBoundingClientRect().top + window.scrollY) : 0 })()`,
  )
  await run(mob, `window.scrollTo({ top: ${tourTop}, behavior: 'auto' })`)
  await wait(900)
  await shot(mob, 'm-tour-final')

  app.quit()
}

app.whenReady().then(main)

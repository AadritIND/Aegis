/* Screenshot the hero and the cinematic tour at four scroll beats. */
const { app, BrowserWindow } = require('electron')
const fs = require('fs')
const path = require('path')

const OUT = path.join(__dirname, '..', '..', 'shots-polish')
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
  await wait(1500)
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
  await shot(win, 'hero')
  const start = await run(
    win,
    `(() => {
      const el = document.querySelector('.tour__stage');
      return el ? Math.round(el.getBoundingClientRect().top + window.scrollY) : -1;
    })()`,
  )
  console.log('tour start', start)
  for (const [name, f] of [
    ['tour-0', 0],
    ['tour-30', 0.3],
    ['tour-60', 0.6],
    ['tour-90', 0.9],
  ]) {
    await run(win, `window.scrollTo({ top: ${start + f * 5 * 0.72 * 950}, behavior: 'auto' })`)
    await wait(1000)
    await shot(win, name)
  }

  await run(win, `document.querySelector('#download').scrollIntoView({ block: 'start' })`)
  await wait(900)
  await shot(win, 'download')

  const m = await make(420, 900)
  const mStart = await run(
    m,
    `(() => { const el = document.querySelector('.tour__stage'); return el ? Math.round(el.getBoundingClientRect().top + window.scrollY) : -1 })()`,
  )
  await run(m, `window.scrollTo({ top: ${mStart}, behavior: 'auto' })`)
  await wait(900)
  await shot(m, 'tour-mobile')
  app.quit()
}

app.whenReady().then(main)

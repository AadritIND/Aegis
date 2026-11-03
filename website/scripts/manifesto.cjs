/* Screenshots the two-act manifesto at several scroll positions. */
const { app, BrowserWindow } = require('electron')
const fs = require('fs')
const path = require('path')

const OUT = path.join(__dirname, '..', '..', 'shots-manifesto')
fs.mkdirSync(OUT, { recursive: true })
app.on('window-all-closed', () => {})
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

async function make(width, height) {
  const win = new BrowserWindow({
    width,
    height,
    show: false,
    backgroundColor: '#6c4bff',
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
  const top = await run(
    win,
    `(() => {
      const el = document.querySelector('.manifesto');
      return el ? Math.round(el.getBoundingClientRect().top + window.scrollY) : -1;
    })()`,
  )
  const range = 950
  console.log('manifesto top', top)

  for (const [name, f] of [
    ['manifesto-0', 0],
    ['manifesto-30', 0.3],
    ['manifesto-45', 0.45],
    ['manifesto-60', 0.6],
    ['manifesto-75', 0.75],
    ['manifesto-90', 0.9],
    ['manifesto-100', 1],
  ]) {
    await run(win, `window.scrollTo({ top: ${top + f * range}, behavior: 'auto' })`)
    await wait(1500)
    const state = await run(
      win,
      `JSON.stringify({
        scrollY: Math.round(scrollY),
        stageTop: Math.round(document.querySelector('.manifesto__stage').getBoundingClientRect().top),
        actOne: getComputedStyle(document.querySelector('.manifesto__inner')).opacity,
        actTwo: getComputedStyle(document.querySelector('.manifesto__ledger')).opacity,
        ledgerTop: Math.round(document.querySelector('.manifesto__ledger').getBoundingClientRect().top),
      })`,
    )
    console.log(name, state)
    await shot(win, name)
  }

  const m = await make(390, 844)
  const mTop = await run(
    m,
    `(() => {
      const el = document.querySelector('.manifesto');
      return el ? Math.round(el.getBoundingClientRect().top + window.scrollY) : -1;
    })()`,
  )
  console.log('mobile top', mTop)
  await run(m, `window.scrollTo({ top: ${mTop}, behavior: 'auto' })`)
  await wait(900)
  await shot(m, 'manifesto-mobile-a')
  const ledgerTop = await run(
    m,
    `(() => {
      const el = document.querySelector('.manifesto__ledger');
      return el ? Math.round(el.getBoundingClientRect().top + window.scrollY) : -1;
    })()`,
  )
  await run(m, `window.scrollTo({ top: ${ledgerTop - 40}, behavior: 'auto' })`)
  await wait(900)
  await shot(m, 'manifesto-mobile-b')
  await run(m, `window.scrollTo({ top: ${ledgerTop + 300}, behavior: 'auto' })`)
  await wait(900)
  await shot(m, 'manifesto-mobile-c')
  m.destroy()
  win.destroy()

  app.quit()
}

app.whenReady().then(main).catch((err) => {
  console.error(err)
  app.exit(1)
})

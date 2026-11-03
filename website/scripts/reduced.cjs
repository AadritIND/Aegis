const { app, BrowserWindow } = require('electron')
const fs = require('fs')
const path = require('path')

app.commandLine.appendSwitch('force-prefers-reduced-motion')
app.on('window-all-closed', () => {})
const OUT = path.join(__dirname, '..', '..', 'shots-v2')
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 1440,
    height: 950,
    show: false,
    backgroundColor: '#070706',
    webPreferences: { offscreen: true, backgroundThrottling: false },
  })
  win.webContents.setFrameRate(30)
  await win.loadURL('http://localhost:5310/')
  await wait(1500)
  const boot = await win.webContents.executeJavaScript(
    `JSON.stringify({ boot: !!document.querySelector('.bootv'), booted: document.querySelector('.app')?.dataset.booted })`,
  )
  console.log('BOOT:', boot)

  await win.webContents.executeJavaScript(
    `document.querySelector('#tour').scrollIntoView({ block: 'start' })`,
    true,
  )
  await wait(800)
  const state = await win.webContents.executeJavaScript(
    `JSON.stringify({
      activeShots: [...document.querySelectorAll('.tour__shot img')].filter(i => getComputedStyle(i).opacity === '1').length,
      hud: getComputedStyle(document.querySelector('.tour__hud')).display,
      stageH: Math.round(document.querySelector('.tour__stage').getBoundingClientRect().height),
      pin: !!document.querySelector('.tour__stage')?.parentElement?.style.pinSpacing
    })`,
  )
  console.log('TOUR:', state)
  await win.webContents.executeJavaScript(
    `document.querySelector('#anatomy').scrollIntoView({ block: 'start' })`,
    true,
  )
  await wait(900)
  const anatomy = await win.webContents.executeJavaScript(
    `JSON.stringify({
      static: document.querySelector('.anatomy')?.dataset.static,
      layers: document.querySelectorAll('.anatomy__layer').length,
      readout: getComputedStyle(document.querySelector('.anatomy__readout')).display,
      word: getComputedStyle(document.querySelector('.mword')).opacity,
      pin: !!document.querySelector('.anatomy__stage')?.parentElement?.style.pinSpacing
    })`,
  )
  console.log('ANATOMY:', anatomy)
  const img = await win.webContents.capturePage()
  fs.writeFileSync(path.join(OUT, 'reduced-tour.png'), img.toPNG())
  win.destroy()
  app.quit()
})

import { useEffect, useRef } from 'react'
import * as THREE from 'three'

type Props = {
  tint: string
  reduced: boolean
}

const TAU = Math.PI * 2

/* ------------------------------------------------------------------ *
 *  canvas helpers — every surface map is generated in the browser,
 *  so there is no texture download and no external asset in the door.
 * ------------------------------------------------------------------ */

function canvas2d(size: number) {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('2d context unavailable')
  return { canvas, ctx }
}

function rand(min: number, max: number) {
  return min + Math.random() * (max - min)
}

type FaceMaps = {
  color: THREE.CanvasTexture
  rough: THREE.CanvasTexture
  bump: THREE.CanvasTexture
}

/* Concentric lathe marks, radial scratches, wear patches and pitting.
   One texture is used for colour, one for roughness, one for bump, so
   the highlight breaks up across the face exactly like machined steel. */
function createFaceMaps(size: number, anisotropy: number): FaceMaps {
  const color = canvas2d(size)
  const rough = canvas2d(size)
  const bump = canvas2d(size)
  const c = color.ctx
  const r = rough.ctx
  const b = bump.ctx
  const half = size / 2

  const grad = c.createRadialGradient(half * 0.72, half * 0.62, 10, half, half, half)
  grad.addColorStop(0, '#5e6058')
  grad.addColorStop(0.42, '#4e5048')
  grad.addColorStop(0.72, '#42443d')
  grad.addColorStop(1, '#353732')
  c.fillStyle = grad
  c.fillRect(0, 0, size, size)

  r.fillStyle = '#4c4c4c'
  r.fillRect(0, 0, size, size)
  b.fillStyle = '#808080'
  b.fillRect(0, 0, size, size)

  /* concentric turning marks */
  for (let i = 0; i < 2200; i += 1) {
    const radius = rand(size * 0.08, size * 0.72)
    const shade = Math.random() > 0.55 ? 255 : 0
    const alpha = rand(0.008, 0.05)

    c.beginPath()
    c.arc(half, half, radius, rand(0, TAU), rand(0, TAU))
    c.strokeStyle = `rgba(${shade},${shade},${shade},${alpha})`
    c.lineWidth = rand(0.4, 1.8)
    c.stroke()

    r.beginPath()
    r.arc(half, half, radius, rand(0, TAU), rand(0, TAU))
    r.strokeStyle = `rgba(${Math.random() > 0.5 ? 168 : 58},${Math.random() > 0.5 ? 168 : 58},${Math.random() > 0.5 ? 168 : 58},${alpha * 4})`
    r.lineWidth = rand(0.4, 2)
    r.stroke()

    b.beginPath()
    b.arc(half, half, radius, rand(0, TAU), rand(0, TAU))
    b.strokeStyle = `rgba(${Math.random() > 0.5 ? 255 : 0},${Math.random() > 0.5 ? 255 : 0},${Math.random() > 0.5 ? 255 : 0},${alpha * 2})`
    b.lineWidth = rand(0.4, 2)
    b.stroke()
  }

  /* radial handling scratches, plus the long brushed grain a face
     like this actually leaves behind when it is turned on a lathe */
  for (let i = 0; i < 1250; i += 1) {
    const angle = rand(0, TAU)
    const from = rand(size * 0.02, size * 0.55)
    const to = from + rand(size * 0.03, size * 0.44)
    const x1 = half + Math.cos(angle) * from
    const y1 = half + Math.sin(angle) * from
    const x2 = half + Math.cos(angle) * to
    const y2 = half + Math.sin(angle) * to
    const alpha = rand(0.012, 0.068)

    c.beginPath()
    c.moveTo(x1, y1)
    c.lineTo(x2, y2)
    c.strokeStyle = `rgba(232,238,219,${alpha})`
    c.lineWidth = rand(0.25, 1.2)
    c.stroke()

    b.beginPath()
    b.moveTo(x1, y1)
    b.lineTo(x2, y2)
    b.strokeStyle = `rgba(255,255,255,${alpha * 3})`
    b.lineWidth = rand(0.4, 1.6)
    b.stroke()

    r.beginPath()
    r.moveTo(x1, y1)
    r.lineTo(x2, y2)
    r.strokeStyle = `rgba(190,190,190,${alpha * 2.4})`
    r.lineWidth = rand(0.4, 1.4)
    r.stroke()
  }

  /* soot and finger wear around the working radius */
  for (let i = 0; i < 26; i += 1) {
    const x = rand(size * 0.1, size * 0.9)
    const y = rand(size * 0.1, size * 0.9)
    const radius = rand(size * 0.025, size * 0.14)
    const dirty = c.createRadialGradient(x, y, 0, x, y, radius)
    dirty.addColorStop(0, `rgba(18,20,16,${rand(0.12, 0.3)})`)
    dirty.addColorStop(0.55, `rgba(24,26,21,${rand(0.04, 0.12)})`)
    dirty.addColorStop(1, 'rgba(20,22,18,0)')
    c.fillStyle = dirty
    c.fillRect(0, 0, size, size)

    const smear = b.createRadialGradient(x, y, 0, x, y, radius)
    smear.addColorStop(0, 'rgba(0,0,0,.26)')
    smear.addColorStop(1, 'rgba(0,0,0,0)')
    b.fillStyle = smear
    b.fillRect(0, 0, size, size)
  }

  /* pitting */
  for (let i = 0; i < 1600; i += 1) {
    const x = rand(0, size)
    const y = rand(0, size)
    c.fillStyle = `rgba(20,22,17,${rand(0.04, 0.16)})`
    c.fillRect(x, y, rand(0.6, 1.8), rand(0.6, 1.8))
    b.fillStyle = 'rgba(0,0,0,.3)'
    b.fillRect(x, y, 1.4, 1.4)
  }

  /* long polished arcs where the tool was held a little longer */
  for (let i = 0; i < 7; i += 1) {
    c.beginPath()
    c.arc(half, half, rand(size * 0.24, size * 0.62), rand(-2.2, -0.8), rand(-0.9, -0.2))
    c.strokeStyle = `rgba(242,247,231,${rand(0.04, 0.11)})`
    c.lineWidth = rand(1, 3.6)
    c.stroke()
  }

  /* a soft vignette at the machined edge keeps the flange from reading flat */
  const edge = c.createRadialGradient(half, half, size * 0.36, half, half, size * 0.51)
  edge.addColorStop(0, 'rgba(6,8,5,0)')
  edge.addColorStop(1, 'rgba(6,8,5,.2)')
  c.fillStyle = edge
  c.fillRect(0, 0, size, size)

  const make = (source: HTMLCanvasElement, srgb: boolean) => {
    const texture = new THREE.CanvasTexture(source)
    texture.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace
    texture.anisotropy = anisotropy
    texture.wrapS = THREE.ClampToEdgeWrapping
    texture.wrapT = THREE.ClampToEdgeWrapping
    texture.needsUpdate = true
    return texture
  }

  return {
    color: make(color.canvas, true),
    rough: make(rough.canvas, false),
    bump: make(bump.canvas, false),
  }
}

/* Fine grain for the cylindrical edge, coupling rods and casing. */
function createGrainTexture(size: number, anisotropy: number) {
  const { canvas, ctx } = canvas2d(size)
  ctx.fillStyle = '#686d62'
  ctx.fillRect(0, 0, size, size)

  for (let i = 0; i < 9000; i += 1) {
    const shade = Math.random() > 0.5 ? 255 : 0
    ctx.fillStyle = `rgba(${shade},${shade},${shade},${rand(0.01, 0.06)})`
    ctx.fillRect(rand(0, size), rand(0, size), rand(0.5, 2), rand(0.5, 2))
  }

  for (let i = 0; i < 850; i += 1) {
    ctx.beginPath()
    ctx.moveTo(0, rand(0, size))
    ctx.lineTo(size, rand(0, size))
    ctx.strokeStyle = `rgba(${Math.random() > 0.5 ? 220 : 22},${Math.random() > 0.5 ? 220 : 22},${Math.random() > 0.5 ? 220 : 22},${rand(0.01, 0.05)})`
    ctx.lineWidth = rand(0.3, 1.4)
    ctx.stroke()
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(3, 2)
  texture.anisotropy = anisotropy
  texture.needsUpdate = true
  return texture
}

function makeGlowTexture(size = 256) {
  const { canvas, ctx } = canvas2d(size)
  const half = size / 2
  const grad = ctx.createRadialGradient(half, half, 0, half, half, half)
  grad.addColorStop(0, 'rgba(255,255,255,1)')
  grad.addColorStop(0.18, 'rgba(255,255,255,.85)')
  grad.addColorStop(0.42, 'rgba(255,255,255,.26)')
  grad.addColorStop(0.72, 'rgba(255,255,255,.06)')
  grad.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, size, size)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.needsUpdate = true
  return texture
}

function makeContactTexture(size = 512) {
  const { canvas, ctx } = canvas2d(size)
  const half = size / 2
  const grad = ctx.createRadialGradient(half, half, 0, half, half, half)
  grad.addColorStop(0, 'rgba(0,0,0,.72)')
  grad.addColorStop(0.42, 'rgba(0,0,0,.5)')
  grad.addColorStop(0.76, 'rgba(0,0,0,.18)')
  grad.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, size, size)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.needsUpdate = true
  return texture
}

function arcText(
  ctx: CanvasRenderingContext2D,
  text: string,
  cx: number,
  cy: number,
  radius: number,
  centerAngle: number,
  font: string,
  fill: string,
  tracking = 2,
  offsetX = 0,
  offsetY = 0,
) {
  ctx.save()
  ctx.translate(offsetX, offsetY)
  ctx.font = font
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = fill
  const widths = Array.from(text).map((char) => ctx.measureText(char).width)
  const total = widths.reduce((sum, width) => sum + width, 0) + tracking * Math.max(0, widths.length - 1)
  let angle = centerAngle - total / radius / 2

  Array.from(text).forEach((char, index) => {
    const step = widths[index] / radius
    const at = angle + step / 2
    ctx.save()
    ctx.translate(cx + Math.sin(at) * radius, cy - Math.cos(at) * radius)
    ctx.rotate(at)
    ctx.fillText(char, 0, 0)
    ctx.restore()
    angle += step + tracking / radius
  })
  ctx.restore()
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.lineTo(x + width - radius, y)
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius)
  ctx.lineTo(x + width, y + height - radius)
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
  ctx.lineTo(x + radius, y + height)
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius)
  ctx.lineTo(x, y + radius)
  ctx.quadraticCurveTo(x, y, x + radius, y)
  ctx.closePath()
}

/* Etched lettering, serial plates, barcodes and index crosses on the
   outer flange. Drawn on a transparent plane a hair above the metal. */
function createDoorDecal(size = 2048) {
  const { canvas, ctx } = canvas2d(size)
  const cx = size / 2
  const cy = size / 2

  ctx.clearRect(0, 0, size, size)

  /* thin alignment circles */
  for (const radius of [934, 919, 700, 688]) {
    ctx.beginPath()
    ctx.arc(cx, cy, radius, 0, TAU)
    ctx.strokeStyle = radius > 900 ? 'rgba(228,235,214,.2)' : 'rgba(222,229,209,.11)'
    ctx.lineWidth = radius === 688 ? 2 : 1
    ctx.setLineDash(radius === 688 ? [2, 14] : [])
    ctx.stroke()
    ctx.setLineDash([])
  }

  /* index crosses at four quadrants */
  for (let i = 0; i < 4; i += 1) {
    const angle = (i / 4) * TAU + Math.PI / 4
    const x = cx + Math.cos(angle) * 934
    const y = cy + Math.sin(angle) * 934
    ctx.strokeStyle = 'rgba(236,242,222,.55)'
    ctx.lineWidth = 2.4
    ctx.beginPath()
    ctx.moveTo(x - 9, y)
    ctx.lineTo(x + 9, y)
    ctx.moveTo(x, y - 9)
    ctx.lineTo(x, y + 9)
    ctx.stroke()
  }

  /* Lettering is cut, not painted: a bright top edge is laid down first,
     then the dark throat of the groove sits over it. */
  const engrave = (
    text: string,
    radius: number,
    center: number,
    font: string,
    tracking: number,
    lightAlpha: number,
    darkAlpha: number,
  ) => {
    ctx.shadowColor = 'rgba(0,0,0,.9)'
    ctx.shadowBlur = 3
    ctx.shadowOffsetY = 3
    arcText(
      ctx,
      text,
      cx,
      cy,
      radius,
      center,
      font,
      `rgba(244,248,235,${lightAlpha})`,
      tracking,
      -1,
      -1.6,
    )
    ctx.shadowBlur = 1.5
    ctx.shadowOffsetY = 1
    arcText(
      ctx,
      text,
      cx,
      cy,
      radius,
      center,
      font,
      `rgba(5,7,4,${darkAlpha})`,
      tracking,
      0.8,
      1.4,
    )
    ctx.shadowBlur = 0
    ctx.shadowOffsetY = 0
  }

  engrave(
    'AEGIS',
    786,
    0,
    '700 108px "Bricolage Grotesque Variable", "Inter", sans-serif',
    26,
    0.62,
    0.56,
  )
  engrave(
    'LOCAL VOLUME · AES-256-GCM · NO NETWORK ·',
    718,
    0,
    '500 21px "JetBrains Mono", monospace',
    4,
    0.42,
    0.45,
  )
  engrave(
    'AEGIS · LOCAL VOLUME · AES-256-GCM · SCRYPT N=32768 · ZERO REMOTE ENDPOINTS · SERIES 01 ·',
    890,
    0,
    '600 26px "JetBrains Mono", monospace',
    3,
    0.5,
    0.62,
  )
  engrave(
    'MACHINED FROM A SINGLE BLOCK · SEALED AT REST · 8 BOLT CYLINDER · NO MASTER RESET ·',
    892,
    Math.PI,
    '500 19px "JetBrains Mono", monospace',
    4,
    0.38,
    0.5,
  )
  engrave(
    'TEMPERED STEEL · 42 HRC',
    800,
    Math.PI / 2,
    '500 22px "JetBrains Mono", monospace',
    3,
    0.34,
    0.46,
  )
  engrave(
    'INSPECTION 01 · 2026',
    800,
    -Math.PI / 2,
    '500 22px "JetBrains Mono", monospace',
    3,
    0.34,
    0.46,
  )

  /* inner register ring, just outside the flange bead */
  for (let i = 0; i < 180; i += 1) {
    const angle = (i / 180) * TAU
    const major = i % 15 === 0
    const mid = i % 5 === 0
    const r1 = 722
    const r2 = major ? 739 : mid ? 734 : 730
    ctx.beginPath()
    ctx.moveTo(cx + Math.cos(angle) * r1, cy + Math.sin(angle) * r1)
    ctx.lineTo(cx + Math.cos(angle) * r2, cy + Math.sin(angle) * r2)
    ctx.strokeStyle = major ? 'rgba(238,244,226,.4)' : mid ? 'rgba(228,235,214,.18)' : 'rgba(220,228,205,.1)'
    ctx.lineWidth = major ? 2.2 : 1
    ctx.stroke()
  }

  /* serial plate, bottom */
  const plateX = cx - 220
  const plateY = cy + 724
  roundRect(ctx, plateX, plateY, 440, 136, 10)
  ctx.fillStyle = 'rgba(7,9,6,.56)'
  ctx.fill()
  ctx.strokeStyle = 'rgba(226,234,211,.26)'
  ctx.lineWidth = 2
  ctx.stroke()

  ctx.fillStyle = 'rgba(240,246,229,.95)'
  ctx.font = '700 42px "Bricolage Grotesque Variable", "Inter", sans-serif'
  ctx.fillText('AEGIS', plateX + 22, plateY + 50)
  ctx.fillStyle = 'rgba(224,232,209,.62)'
  ctx.font = '500 15px "JetBrains Mono", monospace'
  ctx.fillText('VAULT CO. · SERIES 01', plateX + 24, plateY + 74)
  ctx.fillText('SN 01-0001-A · LOCAL ONLY · 2026', plateX + 24, plateY + 98)

  /* four countersunk screws on the plate */
  for (const [sx, sy] of [
    [plateX + 16, plateY + 16],
    [plateX + 424, plateY + 16],
    [plateX + 16, plateY + 120],
    [plateX + 424, plateY + 120],
  ]) {
    ctx.beginPath()
    ctx.arc(sx, sy, 5.5, 0, TAU)
    ctx.fillStyle = 'rgba(226,234,211,.42)'
    ctx.fill()
    ctx.beginPath()
    ctx.moveTo(sx - 3, sy)
    ctx.lineTo(sx + 3, sy)
    ctx.strokeStyle = 'rgba(8,10,6,.8)'
    ctx.lineWidth = 1.6
    ctx.stroke()
  }

  /* barcode, bottom right */
  const barX = cx + 370
  const barY = cy + 760
  ctx.fillStyle = 'rgba(226,234,211,.4)'
  let cursor = barX
  for (let i = 0; i < 38; i += 1) {
    const width = rand(1.5, 5.5)
    if (Math.random() > 0.28) ctx.fillRect(cursor, barY, width, 48)
    cursor += width + rand(2, 5)
  }
  ctx.font = '400 11px "JetBrains Mono", monospace'
  ctx.fillStyle = 'rgba(220,228,205,.38)'
  ctx.fillText('0 0 0 1 · A E G I S · 2 0 2 6', barX, barY + 66)

  /* small quadrant notes */
  ctx.font = '400 13px "JetBrains Mono", monospace'
  ctx.fillStyle = 'rgba(214,222,200,.28)'
  ctx.textAlign = 'left'
  ctx.fillText('TORQUE 42 N·M', cx - 500, cy - 700)
  ctx.fillText('PRESS. 1.0 ATM', cx - 500, cy - 682)
  ctx.textAlign = 'right'
  ctx.fillText('SHAFT A · 0 RPM', cx + 500, cy - 700)
  ctx.fillText('CLEARANCE .04', cx + 500, cy - 682)

  /* radial hash register on the outer band */
  for (let i = 0; i < 240; i += 1) {
    const angle = (i / 240) * TAU
    const major = i % 15 === 0
    const mid = i % 5 === 0
    const r1 = 916
    const r2 = major ? 934 : mid ? 929 : 925
    ctx.beginPath()
    ctx.moveTo(cx + Math.cos(angle) * r1, cy + Math.sin(angle) * r1)
    ctx.lineTo(cx + Math.cos(angle) * r2, cy + Math.sin(angle) * r2)
    ctx.strokeStyle = major ? 'rgba(238,244,226,.52)' : mid ? 'rgba(228,235,214,.24)' : 'rgba(220,228,205,.15)'
    ctx.lineWidth = major ? 2.4 : 1
    ctx.stroke()
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 8
  texture.needsUpdate = true
  return texture
}

/* Dial index markings, engraved into the recessed plate. */
function createDialDecal(size = 1024) {
  const { canvas, ctx } = canvas2d(size)
  const cx = size / 2
  const cy = size / 2
  ctx.clearRect(0, 0, size, size)

  /* faint machining guide rings */
  for (const radius of [458, 424, 366, 312, 254]) {
    ctx.beginPath()
    ctx.arc(cx, cy, radius, 0, TAU)
    ctx.strokeStyle = `rgba(230,238,218,${radius === 458 ? 0.3 : 0.13})`
    ctx.lineWidth = radius === 458 ? 2.4 : 1
    ctx.setLineDash(radius === 366 ? [1.5, 8] : [])
    ctx.stroke()
    ctx.setLineDash([])
  }

  /* quadrant register marks cut into the plate */
  for (let i = 0; i < 24; i += 1) {
    const angle = (i / 24) * TAU
    const inner = i % 6 === 0 ? 432 : 442
    ctx.beginPath()
    ctx.moveTo(cx + Math.cos(angle) * inner, cy + Math.sin(angle) * inner)
    ctx.lineTo(cx + Math.cos(angle) * 458, cy + Math.sin(angle) * 458)
    ctx.strokeStyle = i % 6 === 0 ? 'rgba(238,244,226,.42)' : 'rgba(228,235,214,.16)'
    ctx.lineWidth = i % 6 === 0 ? 2.2 : 1
    ctx.stroke()
  }

  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  for (let i = 0; i < 12; i += 1) {
    const angle = (i / 12) * TAU - Math.PI / 2
    const value = (i * 30).toString().padStart(3, '0')
    const x = cx + Math.cos(angle) * 392
    const y = cy + Math.sin(angle) * 392

    ctx.font = '600 22px "JetBrains Mono", monospace'
    ctx.fillStyle = 'rgba(240,246,228,.52)'
    ctx.fillText(value, x - 1, y - 1.4)
    ctx.fillStyle = 'rgba(4,6,3,.5)'
    ctx.fillText(value, x + 0.8, y + 1.2)
  }

  ctx.font = '600 15px "JetBrains Mono", monospace'
  ctx.fillStyle = 'rgba(238,244,226,.42)'
  ctx.fillText('AES · 256 · GCM', cx - 0.6, cy + 282 - 1)
  ctx.fillStyle = 'rgba(4,6,3,.44)'
  ctx.fillText('AES · 256 · GCM', cx + 0.6, cy + 282 + 1)
  ctx.fillStyle = 'rgba(238,244,226,.42)'
  ctx.fillText('KEY DERIVATION · SCRYPT', cx - 0.6, cy - 282 - 1)
  ctx.fillStyle = 'rgba(4,6,3,.44)'
  ctx.fillText('KEY DERIVATION · SCRYPT', cx + 0.6, cy - 282 + 1)

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 8
  texture.needsUpdate = true
  return texture
}

/* ------------------------------------------------------------------ */

export function VaultCore({ tint, reduced }: Props) {
  const host = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const mount = host.current
    if (!mount) return

    const accent = new THREE.Color(
      getComputedStyle(document.documentElement).getPropertyValue('--acid').trim() || '#c9f94d',
    )
    const violet = new THREE.Color(
      getComputedStyle(document.documentElement).getPropertyValue('--violet').trim() || '#6c4bff',
    )

    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' })
    } catch {
      mount.dataset.gl = 'off'
      return
    }

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(31, 1, 0.1, 60)
    camera.position.set(0, 0.08, 9.5)
    camera.lookAt(0, 0, 0)

    const anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy())
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6))
    renderer.setClearColor(0x000000, 0)
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.12
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFShadowMap
    renderer.domElement.style.width = '100%'
    renderer.domElement.style.height = '100%'
    mount.appendChild(renderer.domElement)
    mount.dataset.gl = 'ok'

    const garbage = new Set<THREE.Texture>()

    /* ---- environment: a dark studio with long strip softboxes ---- */
    const pmrem = new THREE.PMREMGenerator(renderer)
    const envScene = new THREE.Scene()
    envScene.add(
      new THREE.Mesh(
        new THREE.SphereGeometry(30, 32, 24),
        new THREE.MeshBasicMaterial({ color: 0x070805, side: THREE.BackSide }),
      ),
    )
    const panel = (
      color: number,
      intensity: number,
      pos: [number, number, number],
      size: [number, number],
    ) => {
      const mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(size[0], size[1]),
        new THREE.MeshBasicMaterial({
          color: new THREE.Color(color).multiplyScalar(intensity),
          side: THREE.DoubleSide,
        }),
      )
      mesh.position.set(...pos)
      mesh.lookAt(0, 0, 0)
      envScene.add(mesh)
    }
    /* Narrow strip lights, not big soft boxes. The narrow reflections are
       what make polished metal read as metal instead of grey plastic. */
    panel(0xfff1d8, 7.4, [0, 8.4, 2.6], [15, 0.85])
    panel(0xffffff, 6.4, [-7.6, 2.6, 4.2], [1.35, 7.4])
    panel(0xc9ddff, 4.2, [7.8, 2.1, 3.6], [1.8, 5.8])
    panel(accent.getHex(), 2.6, [-6.2, -3.9, 4.2], [4.8, 0.9])
    panel(violet.getHex(), 2.1, [6.4, -4.2, 3.8], [4.2, 1.1])
    panel(0xffffff, 1.8, [0, 1.4, 12], [8, 5])
    panel(0xfff8e8, 1.15, [3.4, -1.4, 10.2], [4.6, 3.4])
    panel(0xfff8e8, 3.1, [-1.9, -0.1, 9.4], [0.62, 5.4])
    panel(0xffffff, 0.9, [0, 2.2, -8], [6, 3])

    /* A black flag and a thin lamp in front of the door break the broad
       white softbox into bands, which is what gives chrome its shape. */
    const flag = new THREE.Mesh(
      new THREE.PlaneGeometry(13, 1.15),
      new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.DoubleSide }),
    )
    flag.position.set(0, -1.15, 6.6)
    flag.lookAt(0, 0, 0)
    envScene.add(flag)

    const lampStrip = new THREE.Mesh(
      new THREE.PlaneGeometry(13, 0.24),
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(0xfff0d8).multiplyScalar(5.5),
        side: THREE.DoubleSide,
      }),
    )
    lampStrip.position.set(0, 1.8, 6.6)
    lampStrip.lookAt(0, 0, 0)
    envScene.add(lampStrip)
    const envTarget = pmrem.fromScene(envScene, 0.025)
    const env = envTarget.texture
    scene.environment = env
    pmrem.dispose()

    /* ---- surface maps ---- */
    const faceMaps = createFaceMaps(1024, anisotropy)
    garbage.add(faceMaps.color)
    garbage.add(faceMaps.rough)
    garbage.add(faceMaps.bump)

    const grain = createGrainTexture(512, anisotropy)
    garbage.add(grain)

    const doorDecal = createDoorDecal(2048)
    const dialDecal = createDialDecal(1024)
    garbage.add(doorDecal)
    garbage.add(dialDecal)

    const glowTexture = makeGlowTexture()
    const contactTexture = makeContactTexture()
    garbage.add(glowTexture)
    garbage.add(contactTexture)

    /* ---- materials ---- */
    const faceMaterial = new THREE.MeshPhysicalMaterial({
      map: faceMaps.color,
      roughnessMap: faceMaps.rough,
      bumpMap: faceMaps.bump,
      bumpScale: 0.008,
      metalness: 0.98,
      roughness: 0.52,
      clearcoat: 0.52,
      clearcoatRoughness: 0.075,
      envMapIntensity: 2.15,
    })

    const dialMaterial = faceMaterial.clone()
    dialMaterial.color.set(0x8c9087)
    dialMaterial.roughness = 0.7
    dialMaterial.clearcoat = 0.3
    dialMaterial.clearcoatRoughness = 0.16
    dialMaterial.envMapIntensity = 1.65

    const edgeMaterial = new THREE.MeshPhysicalMaterial({
      map: grain,
      bumpMap: grain,
      bumpScale: 0.006,
      color: 0xc2c6bb,
      metalness: 0.98,
      roughness: 0.22,
      clearcoat: 0.4,
      clearcoatRoughness: 0.12,
      envMapIntensity: 2.3,
    })

    const steelMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x91958b,
      metalness: 0.98,
      roughness: 0.24,
      clearcoat: 0.28,
      clearcoatRoughness: 0.14,
      envMapIntensity: 1.75,
    })

    const chromeMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xe1e4db,
      metalness: 1,
      roughness: 0.09,
      clearcoat: 0.9,
      clearcoatRoughness: 0.05,
      envMapIntensity: 1.9,
    })

    const spokeMaterial = steelMaterial.clone()
    spokeMaterial.color.set(0x81857a)
    spokeMaterial.roughness = 0.2
    spokeMaterial.envMapIntensity = 1.5
    spokeMaterial.clearcoat = 0.34
    spokeMaterial.clearcoatRoughness = 0.1

    const darkMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x0a0c08,
      metalness: 0.84,
      roughness: 0.32,
      clearcoat: 0.2,
      clearcoatRoughness: 0.24,
      envMapIntensity: 0.62,
      side: THREE.DoubleSide,
    })

    const blackPlate = new THREE.MeshPhysicalMaterial({
      color: 0x050604,
      metalness: 0.42,
      roughness: 0.16,
      clearcoat: 0.9,
      clearcoatRoughness: 0.06,
      envMapIntensity: 1.1,
      side: THREE.DoubleSide,
    })

    const glassMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xe6ffd4,
      metalness: 0,
      roughness: 0.012,
      transmission: 0.95,
      thickness: 0.58,
      ior: 1.5,
      transparent: true,
      opacity: 1,
      envMapIntensity: 2.7,
      clearcoat: 1,
      clearcoatRoughness: 0.01,
      attenuationColor: accent.clone().lerp(new THREE.Color(0xffffff), 0.38),
      attenuationDistance: 0.42,
    })

    const tickMaterial = new THREE.MeshStandardMaterial({
      color: 0xbfc4b8,
      metalness: 0.38,
      roughness: 0.36,
      emissive: 0x596449,
      emissiveIntensity: 0.1,
      envMapIntensity: 1.65,
    })

    const majorTickMaterial = new THREE.MeshStandardMaterial({
      color: 0xe3e7db,
      metalness: 0.25,
      roughness: 0.3,
      emissive: accent,
      emissiveIntensity: 0.52,
      envMapIntensity: 1.8,
    })

    const microTickMaterial = tickMaterial.clone()
    microTickMaterial.color.set(0x7f837a)
    microTickMaterial.emissive.set(0x2e3626)
    microTickMaterial.emissiveIntensity = 0.08

    const coreMaterial = new THREE.MeshBasicMaterial({ color: accent.clone().multiplyScalar(0.95), toneMapped: false })
    const ledMaterial = new THREE.MeshBasicMaterial({ color: accent, toneMapped: false })
    const keyMaterial = new THREE.MeshBasicMaterial({ color: 0x020402, toneMapped: false })

    /* ---- the assembly ---- */
    const root = new THREE.Group()
    root.rotation.set(-0.055, 0.15, 0.012)
    root.position.set(-0.12, 0, 0)
    root.scale.setScalar(0.965)
    scene.add(root)

    const gantry = new THREE.Group()
    root.add(gantry)

    const door = new THREE.Group()
    root.add(door)

    const addMesh = (
      geometry: THREE.BufferGeometry,
      material: THREE.Material | THREE.Material[],
      parent: THREE.Object3D,
    ) => {
      const mesh = new THREE.Mesh(geometry, material)
      parent.add(mesh)
      return mesh
    }

    /* halos are additive, so they never build a dark rectangular plate
       behind the door the way a full-screen vignette sprite can. */
    const haloAcid = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glowTexture,
        color: accent,
        transparent: true,
        opacity: 0.14,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      }),
    )
    haloAcid.scale.setScalar(6.2)
    haloAcid.position.set(-0.8, 0.4, -1.05)
    root.add(haloAcid)

    const haloViolet = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glowTexture,
        color: violet,
        transparent: true,
        opacity: 0.12,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      }),
    )
    haloViolet.scale.setScalar(4.8)
    haloViolet.position.set(1.4, -0.8, -1.15)
    root.add(haloViolet)

    /* temporary seam diagnostic */
    /* casing and shadow gap */
    const casing = addMesh(
      new THREE.CylinderGeometry(2.11, 2.11, 0.64, 200, 1, true),
      edgeMaterial,
      door,
    )
    casing.rotation.x = Math.PI / 2
    casing.receiveShadow = true

    const casingFront = addMesh(new THREE.RingGeometry(2.015, 2.115, 200, 1), darkMaterial, door)
    casingFront.position.z = 0.318
    casingFront.receiveShadow = true

    const casingLip = addMesh(new THREE.TorusGeometry(2.112, 0.032, 20, 220), chromeMaterial, door)
    casingLip.position.z = 0.318

    const casingBack = addMesh(new THREE.RingGeometry(2.015, 2.115, 200, 1), darkMaterial, door)
    casingBack.position.z = -0.318

    const backPlate = addMesh(new THREE.CircleGeometry(2.12, 200), blackPlate, door)
    backPlate.position.z = -0.325
    backPlate.receiveShadow = true

    /* the heavy door body is an open shell: a capped cylinder would put
       a dark lid directly over the dial and swallow every machined mark. */
    const body = addMesh(
      new THREE.CylinderGeometry(1.962, 1.962, 0.54, 200, 1, true),
      edgeMaterial,
      door,
    )
    body.rotation.x = Math.PI / 2
    body.receiveShadow = true
    body.castShadow = true

    const backBead = addMesh(new THREE.TorusGeometry(1.962, 0.04, 20, 220), steelMaterial, door)
    backBead.position.z = -0.27

    /* deep shadow gap between casing and leaf */
    const gap = addMesh(new THREE.RingGeometry(1.958, 2.02, 200, 1), blackPlate, door)
    gap.position.z = 0.255

    /* front flange */
    const flange = addMesh(new THREE.RingGeometry(1.46, 1.952, 200, 1), faceMaterial, door)
    flange.position.z = 0.272
    flange.receiveShadow = true

    const flangeOuterBead = addMesh(new THREE.TorusGeometry(1.955, 0.045, 24, 220), chromeMaterial, door)
    flangeOuterBead.position.z = 0.278

    const flangeInnerBead = addMesh(new THREE.TorusGeometry(1.462, 0.032, 20, 200), steelMaterial, door)
    flangeInnerBead.position.z = 0.288

    /* two machined channels turn the wide flange into a stepped casting */
    for (const radius of [1.615, 1.9]) {
      const channel = addMesh(new THREE.TorusGeometry(radius, 0.017, 12, 220), darkMaterial, door)
      channel.position.z = 0.296
      const channelLip = addMesh(new THREE.TorusGeometry(radius + 0.012, 0.0045, 8, 220), steelMaterial, door)
      channelLip.position.z = 0.301
    }

    /* raised bezel around the recessed dial */
    const dialBezel = addMesh(new THREE.TorusGeometry(1.425, 0.033, 18, 220), steelMaterial, door)
    dialBezel.position.z = 0.292
    const dialBezelLip = addMesh(new THREE.TorusGeometry(1.448, 0.008, 10, 220), chromeMaterial, door)
    dialBezelLip.position.z = 0.303
    const dialBezelShadow = addMesh(new THREE.TorusGeometry(1.383, 0.012, 10, 220), darkMaterial, door)
    dialBezelShadow.position.z = 0.286

    /* recess wall and back */
    const recessWall = addMesh(
      new THREE.CylinderGeometry(1.46, 1.46, 0.125, 180, 1, true),
      darkMaterial,
      door,
    )
    recessWall.rotation.x = Math.PI / 2
    recessWall.position.z = 0.222
    recessWall.receiveShadow = true

    const recessBack = addMesh(new THREE.CircleGeometry(1.462, 180), blackPlate, door)
    recessBack.position.z = 0.158

    const dialPlate = addMesh(new THREE.RingGeometry(0.31, 1.425, 180, 1), dialMaterial, door)
    dialPlate.position.z = 0.186
    dialPlate.receiveShadow = true

    const centerWell = addMesh(new THREE.CircleGeometry(0.33, 120), blackPlate, door)
    centerWell.position.z = 0.184

    /* concentric grooves in the dial */
    const grooveMaterial = new THREE.MeshStandardMaterial({
      color: 0x1a1d16,
      metalness: 0.9,
      roughness: 0.5,
      envMapIntensity: 0.8,
    })
    for (const radius of [0.46, 0.64, 0.86, 1.04, 1.24, 1.4]) {
      const groove = addMesh(new THREE.TorusGeometry(radius, radius > 1.2 ? 0.006 : 0.008, 10, 200), grooveMaterial, door)
      groove.position.z = 0.19
    }
    for (const radius of [0.56, 0.75, 0.96, 1.14, 1.33]) {
      const polished = addMesh(new THREE.TorusGeometry(radius, 0.004, 8, 200), steelMaterial, door)
      polished.position.z = 0.193
    }

    /* tick register — raised, not painted, so each mark catches the key light */
    const tickCount = 96
    const tickGeo = new THREE.BoxGeometry(0.015, 0.1, 0.014)
    const tickMesh = new THREE.InstancedMesh(tickGeo, tickMaterial, tickCount)
    const majorCount = 12
    const majorGeo = new THREE.BoxGeometry(0.023, 0.152, 0.017)
    const majorMesh = new THREE.InstancedMesh(majorGeo, majorTickMaterial, majorCount)
    const microGeo = new THREE.BoxGeometry(0.005, 0.032, 0.008)
    const microMesh = new THREE.InstancedMesh(microGeo, microTickMaterial, tickCount)
    const matrix = new THREE.Matrix4()
    const quat = new THREE.Quaternion()
    const vec = new THREE.Vector3()
    const scale = new THREE.Vector3(1, 1, 1)
    const zAxis = new THREE.Vector3(0, 0, 1)
    let minorIndex = 0
    let majorIndex = 0
    for (let i = 0; i < tickCount; i += 1) {
      const angle = (i / tickCount) * TAU
      const isMajor = i % 8 === 0
      if (isMajor) {
        vec.set(Math.cos(angle) * 1.282, Math.sin(angle) * 1.282, 0.209)
        quat.setFromAxisAngle(zAxis, angle + Math.PI / 2)
        matrix.compose(vec, quat, scale)
        majorMesh.setMatrixAt(majorIndex, matrix)
        majorIndex += 1
      } else {
        vec.set(Math.cos(angle) * 1.276, Math.sin(angle) * 1.276, 0.207)
        quat.setFromAxisAngle(zAxis, angle + Math.PI / 2)
        matrix.compose(vec, quat, scale)
        tickMesh.setMatrixAt(minorIndex, matrix)
        minorIndex += 1
      }

      vec.set(Math.cos(angle) * 1.205, Math.sin(angle) * 1.205, 0.204)
      quat.setFromAxisAngle(zAxis, angle + Math.PI / 2)
      matrix.compose(vec, quat, scale)
      microMesh.setMatrixAt(i, matrix)
    }
    tickMesh.count = minorIndex
    majorMesh.count = majorIndex
    tickMesh.instanceMatrix.needsUpdate = true
    majorMesh.instanceMatrix.needsUpdate = true
    microMesh.instanceMatrix.needsUpdate = true
    door.add(tickMesh)
    door.add(majorMesh)
    door.add(microMesh)

    /* dial markings */
    const dialDecalMesh = addMesh(
      new THREE.PlaneGeometry(2.78, 2.78),
      new THREE.MeshBasicMaterial({
        map: dialDecal,
        transparent: true,
        opacity: 0.98,
        depthWrite: false,
        toneMapped: false,
      }),
      door,
    )
    dialDecalMesh.position.z = 0.197

    /* forged bolts */
    const boltGroup = new THREE.Group()
    door.add(boltGroup)

    const boltGeometry = {
      washer: new THREE.CylinderGeometry(0.122, 0.138, 0.028, 40),
      head: new THREE.CylinderGeometry(0.086, 0.1, 0.082, 6),
      socket: new THREE.CylinderGeometry(0.041, 0.041, 0.016, 6),
      pin: new THREE.CylinderGeometry(0.012, 0.012, 0.1, 12),
      seat: new THREE.TorusGeometry(0.132, 0.008, 8, 48),
      edge: new THREE.TorusGeometry(0.099, 0.0035, 6, 48),
    }

    const boltHeadMaterial = steelMaterial.clone()
    boltHeadMaterial.flatShading = true
    boltHeadMaterial.roughness = 0.28

    const makeBolt = () => {
      const group = new THREE.Group()
      const holder = new THREE.Group()
      group.add(holder)

      const seat = new THREE.Mesh(boltGeometry.seat, darkMaterial)
      seat.position.z = 0.004
      holder.add(seat)

      const washer = new THREE.Mesh(boltGeometry.washer, steelMaterial)
      washer.rotation.x = Math.PI / 2
      washer.position.z = 0.017
      washer.castShadow = true
      washer.receiveShadow = true
      holder.add(washer)

      const headHolder = new THREE.Group()
      headHolder.rotation.z = Math.PI / 6
      const head = new THREE.Mesh(boltGeometry.head, boltHeadMaterial)
      head.rotation.x = Math.PI / 2
      head.position.z = 0.068
      head.castShadow = true
      head.receiveShadow = true
      headHolder.add(head)
      holder.add(headHolder)

      const edge = new THREE.Mesh(boltGeometry.edge, chromeMaterial)
      edge.position.z = 0.107
      holder.add(edge)

      const socket = new THREE.Mesh(boltGeometry.socket, darkMaterial)
      socket.rotation.x = Math.PI / 2
      socket.position.z = 0.111
      holder.add(socket)

      const pin = new THREE.Mesh(boltGeometry.pin, darkMaterial)
      pin.rotation.x = Math.PI / 2
      pin.position.z = 0.062
      pin.scale.set(0.42, 1, 0.42)
      holder.add(pin)

      return group
    }

    for (let i = 0; i < 12; i += 1) {
      const angle = (i / 12) * TAU + Math.PI / 12
      const bolt = makeBolt()
      bolt.position.set(Math.cos(angle) * 1.79, Math.sin(angle) * 1.79, 0.286)
      bolt.rotation.z = angle
      boltGroup.add(bolt)
    }

    /* countersunk fasteners around the dial bezel */
    for (let i = 0; i < 8; i += 1) {
      const angle = (i / 8) * TAU + Math.PI / 8
      const screw = addMesh(new THREE.CylinderGeometry(0.019, 0.021, 0.013, 20), darkMaterial, door)
      screw.rotation.x = Math.PI / 2
      screw.position.set(Math.cos(angle) * 1.405, Math.sin(angle) * 1.405, 0.306)
      const screwHead = addMesh(new THREE.CylinderGeometry(0.015, 0.015, 0.008, 16), steelMaterial, door)
      screwHead.rotation.x = Math.PI / 2
      screwHead.position.set(Math.cos(angle) * 1.405, Math.sin(angle) * 1.405, 0.312)
    }

    /* rivets on the outer casing face */
    for (let i = 0; i < 24; i += 1) {
      const angle = (i / 24) * TAU + Math.PI / 24
      const rivet = addMesh(new THREE.SphereGeometry(0.017, 12, 8, 0, TAU, 0, Math.PI / 2), steelMaterial, door)
      rivet.rotation.x = Math.PI / 2
      rivet.position.set(Math.cos(angle) * 2.062, Math.sin(angle) * 2.062, 0.322)
    }

    /* contact shadow under the wheel gives the casting physical weight */
    const wheelShadow = addMesh(
      new THREE.PlaneGeometry(1.94, 1.94),
      new THREE.MeshBasicMaterial({
        map: contactTexture,
        transparent: true,
        opacity: 0.72,
        depthWrite: false,
        toneMapped: false,
      }),
      door,
    )
    wheelShadow.position.z = 0.2

    /* ---- the wheel ---- */
    const wheel = new THREE.Group()
    wheel.position.z = 0.3
    door.add(wheel)

    const rim = addMesh(new THREE.TorusGeometry(0.708, 0.073, 32, 220), chromeMaterial, wheel)
    rim.castShadow = true
    rim.receiveShadow = true

    const rimInner = addMesh(new THREE.TorusGeometry(0.638, 0.024, 18, 200), darkMaterial, wheel)
    rimInner.castShadow = true

    const rimGuard = addMesh(new THREE.TorusGeometry(0.782, 0.026, 18, 220), darkMaterial, wheel)
    rimGuard.position.z = -0.012
    rimGuard.castShadow = true

    const rimGuardLip = addMesh(new THREE.TorusGeometry(0.807, 0.007, 10, 220), chromeMaterial, wheel)
    rimGuardLip.position.z = -0.008

    /* knurled grip around the rim — alternating dark and bright teeth */
    const knurlGeometry = new THREE.BoxGeometry(0.014, 0.058, 0.034)
    const knurlDark = new THREE.InstancedMesh(knurlGeometry, darkMaterial, 66)
    const knurlLight = new THREE.InstancedMesh(knurlGeometry, steelMaterial, 66)
    for (let i = 0; i < 132; i += 1) {
      const angle = (i / 132) * TAU
      vec.set(Math.cos(angle) * 0.755, Math.sin(angle) * 0.755, 0.062)
      quat.setFromAxisAngle(zAxis, angle)
      matrix.compose(vec, quat, scale)
      if (i % 2 === 0) knurlDark.setMatrixAt(i / 2, matrix)
      else knurlLight.setMatrixAt((i - 1) / 2, matrix)
    }
    knurlDark.instanceMatrix.needsUpdate = true
    knurlLight.instanceMatrix.needsUpdate = true
    knurlDark.castShadow = true
    knurlLight.castShadow = true
    wheel.add(knurlDark)
    wheel.add(knurlLight)

    /* the three spokes are castings, not tubes: a tapered plan shape
       with a real bevel, a recessed inlay and a bolted end pad */
    const spokeShape = new THREE.Shape()
    spokeShape.moveTo(-0.078, 0.224)
    spokeShape.bezierCurveTo(-0.104, 0.35, -0.078, 0.545, -0.056, 0.668)
    spokeShape.lineTo(0.056, 0.668)
    spokeShape.bezierCurveTo(0.078, 0.545, 0.104, 0.35, 0.078, 0.224)
    spokeShape.closePath()

    const spokeGeometry = new THREE.ExtrudeGeometry(spokeShape, {
      depth: 0.074,
      bevelEnabled: true,
      bevelThickness: 0.014,
      bevelSize: 0.007,
      bevelSegments: 2,
      curveSegments: 12,
    })
    spokeGeometry.translate(0, 0, -0.037)

    const spokeInset = new THREE.BoxGeometry(0.034, 0.272, 0.012)
    const spokePad = new THREE.CylinderGeometry(0.058, 0.06, 0.052, 32)
    const spokeScrew = new THREE.CylinderGeometry(0.018, 0.018, 0.012, 6)

    for (let i = 0; i < 3; i += 1) {
      const holder = new THREE.Group()
      holder.rotation.z = (i / 3) * TAU
      wheel.add(holder)

      const spoke = new THREE.Mesh(spokeGeometry, spokeMaterial)
      spoke.castShadow = true
      spoke.receiveShadow = true
      holder.add(spoke)

      const inset = new THREE.Mesh(spokeInset, darkMaterial)
      inset.position.set(0, 0.452, 0.048)
      holder.add(inset)

      const pad = new THREE.Mesh(spokePad, steelMaterial)
      pad.rotation.x = Math.PI / 2
      pad.position.set(0, 0.667, 0.006)
      pad.castShadow = true
      pad.receiveShadow = true
      holder.add(pad)

      const screw = new THREE.Mesh(spokeScrew, darkMaterial)
      screw.rotation.x = Math.PI / 2
      screw.position.set(0, 0.667, 0.037)
      holder.add(screw)
    }

    /* hub collar, glass dome and keyhole port */
    const hubBoss = addMesh(new THREE.CylinderGeometry(0.262, 0.268, 0.028, 80), darkMaterial, wheel)
    hubBoss.rotation.x = Math.PI / 2
    hubBoss.position.z = 0.012
    hubBoss.castShadow = true

    const collar = addMesh(new THREE.RingGeometry(0.19, 0.292, 120, 1), chromeMaterial, wheel)
    collar.position.z = 0.032
    collar.castShadow = true

    const collarStep = addMesh(new THREE.TorusGeometry(0.196, 0.022, 18, 140), steelMaterial, wheel)
    collarStep.position.z = 0.044

    const collarOuter = addMesh(new THREE.TorusGeometry(0.292, 0.022, 18, 140), steelMaterial, wheel)
    collarOuter.position.z = 0.033

    for (let i = 0; i < 8; i += 1) {
      const angle = (i / 8) * TAU + Math.PI / 8
      const screwWell = addMesh(new THREE.CylinderGeometry(0.018, 0.02, 0.014, 20), darkMaterial, wheel)
      screwWell.rotation.x = Math.PI / 2
      screwWell.position.set(Math.cos(angle) * 0.245, Math.sin(angle) * 0.245, 0.05)
      const screwHead = addMesh(new THREE.CylinderGeometry(0.013, 0.013, 0.008, 6), steelMaterial, wheel)
      screwHead.rotation.x = Math.PI / 2
      screwHead.position.set(Math.cos(angle) * 0.245, Math.sin(angle) * 0.245, 0.057)
    }

    const glowRing = addMesh(new THREE.TorusGeometry(0.17, 0.004, 8, 100), ledMaterial, wheel)
    glowRing.position.z = 0.11

    const dome = addMesh(new THREE.SphereGeometry(0.205, 56, 44), glassMaterial, wheel)
    dome.position.z = 0.055
    dome.scale.z = 0.58

    const bezel = addMesh(new THREE.CylinderGeometry(0.128, 0.136, 0.062, 72, 1, true), chromeMaterial, wheel)
    bezel.rotation.x = Math.PI / 2
    bezel.position.z = 0.155
    bezel.castShadow = true

    const bezelLip = addMesh(new THREE.TorusGeometry(0.128, 0.016, 14, 100), chromeMaterial, wheel)
    bezelLip.position.z = 0.187

    const bezelSeat = addMesh(new THREE.TorusGeometry(0.143, 0.007, 10, 100), darkMaterial, wheel)
    bezelSeat.position.z = 0.174

    /* a real studio reflection caught on the dome, not a painted glow */
    const lensGlint = addMesh(
      new THREE.TorusGeometry(0.168, 0.0032, 6, 64, Math.PI * 0.62),
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.42,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      }),
      wheel,
    )
    lensGlint.position.z = 0.178
    lensGlint.rotation.z = 1.15

    const lensGlintSoft = addMesh(
      new THREE.TorusGeometry(0.177, 0.007, 8, 64, Math.PI * 0.4),
      new THREE.MeshBasicMaterial({
        color: 0xeafbd8,
        transparent: true,
        opacity: 0.12,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      }),
      wheel,
    )
    lensGlintSoft.position.z = 0.176
    lensGlintSoft.rotation.z = 3.1

    const port = addMesh(new THREE.CircleGeometry(0.121, 100), blackPlate, wheel)
    port.position.z = 0.191

    const keyRing = addMesh(new THREE.TorusGeometry(0.105, 0.006, 10, 80), chromeMaterial, wheel)
    keyRing.position.z = 0.194

    const keyDotFrame = addMesh(new THREE.CircleGeometry(0.04, 40), chromeMaterial, wheel)
    keyDotFrame.position.set(0, 0.019, 0.194)

    const keyDot = addMesh(new THREE.CircleGeometry(0.034, 40), keyMaterial, wheel)
    keyDot.position.set(0, 0.019, 0.196)

    const keyStemFrame = addMesh(new THREE.PlaneGeometry(0.038, 0.074), chromeMaterial, wheel)
    keyStemFrame.position.set(0, -0.043, 0.194)

    const keyStem = addMesh(new THREE.PlaneGeometry(0.03, 0.064), keyMaterial, wheel)
    keyStem.position.set(0, -0.043, 0.196)

    const core = addMesh(new THREE.SphereGeometry(0.062, 32, 24), coreMaterial, wheel)
    core.position.z = 0.035

    const coreRing = addMesh(new THREE.TorusGeometry(0.081, 0.006, 8, 64), chromeMaterial, wheel)
    coreRing.position.z = 0.028

    const coreGlow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glowTexture,
        color: accent,
        transparent: true,
        opacity: 0.32,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      }),
    )
    coreGlow.scale.setScalar(0.46)
    coreGlow.position.z = 0.12
    wheel.add(coreGlow)

    /* four powered indicator LEDs on the flange */
    const leds: THREE.Sprite[] = []
    for (let i = 0; i < 4; i += 1) {
      const angle = (i / 4) * TAU + Math.PI / 4
      const led = addMesh(new THREE.CylinderGeometry(0.022, 0.025, 0.027, 20), darkMaterial, door)
      led.rotation.x = Math.PI / 2
      led.position.set(Math.cos(angle) * 1.7, Math.sin(angle) * 1.7, 0.292)

      const diode = addMesh(new THREE.CircleGeometry(0.011, 20), ledMaterial, door)
      diode.position.set(Math.cos(angle) * 1.7, Math.sin(angle) * 1.7, 0.308)

      const glow = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: glowTexture,
          color: accent,
          transparent: true,
          opacity: 0.4,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          toneMapped: false,
        }),
      )
      glow.scale.setScalar(0.13)
      glow.position.set(Math.cos(angle) * 1.7, Math.sin(angle) * 1.7, 0.32)
      door.add(glow)
      leds.push(glow)
    }

    /* engraved outer text */
    const decalMesh = addMesh(
      new THREE.PlaneGeometry(4.26, 4.26),
      new THREE.MeshBasicMaterial({
        map: doorDecal,
        transparent: true,
        opacity: 0.98,
        depthWrite: false,
        toneMapped: false,
      }),
      door,
    )
    decalMesh.position.z = 0.304

    /* outer gantry rings and instrument arcs */
    const gantryRing = addMesh(new THREE.TorusGeometry(2.28, 0.009, 8, 240), darkMaterial, gantry)
    gantryRing.position.z = 0.02

    const gantryTicks = new THREE.InstancedMesh(new THREE.BoxGeometry(0.008, 0.052, 0.006), steelMaterial, 72)
    for (let i = 0; i < 72; i += 1) {
      const angle = (i / 72) * TAU
      vec.set(Math.cos(angle) * 2.255, Math.sin(angle) * 2.255, 0.02)
      quat.setFromAxisAngle(zAxis, angle + Math.PI / 2)
      matrix.compose(vec, quat, scale)
      gantryTicks.setMatrixAt(i, matrix)
    }
    gantryTicks.instanceMatrix.needsUpdate = true
    gantry.add(gantryTicks)

    const chromeArc = addMesh(
      new THREE.TorusGeometry(2.38, 0.008, 8, 260, Math.PI * 0.72),
      chromeMaterial,
      gantry,
    )
    chromeArc.rotation.z = 0.45

    const darkArc = addMesh(
      new THREE.TorusGeometry(2.46, 0.005, 6, 240, Math.PI * 0.28),
      darkMaterial,
      gantry,
    )
    darkArc.rotation.z = 2.2

    const acidArc = addMesh(
      new THREE.TorusGeometry(2.53, 0.006, 6, 220, Math.PI * 0.46),
      new THREE.MeshBasicMaterial({
        color: accent,
        transparent: true,
        opacity: 0.65,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      }),
      gantry,
    )
    acidArc.rotation.z = 3.05

    const sweep = addMesh(
      new THREE.TorusGeometry(2.05, 0.004, 5, 240, Math.PI * 0.5),
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.22,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      }),
      gantry,
    )
    sweep.rotation.z = 0.8

    /* calibration clamps and tiny status lamps on the outer gantry */
    for (let i = 0; i < 3; i += 1) {
      const angle = 0.8 + (i / 3) * TAU
      const clamp = new THREE.Group()
      clamp.position.set(Math.cos(angle) * 2.4, Math.sin(angle) * 2.4, 0.02)
      clamp.rotation.z = angle + Math.PI / 2
      gantry.add(clamp)

      const body = addMesh(new THREE.BoxGeometry(0.085, 0.15, 0.042), steelMaterial, clamp)
      body.castShadow = true
      const slot = addMesh(new THREE.BoxGeometry(0.016, 0.09, 0.006), darkMaterial, clamp)
      slot.position.z = 0.024
      const lamp = addMesh(new THREE.CircleGeometry(0.008, 16), ledMaterial, clamp)
      lamp.position.set(0, 0.052, 0.025)
    }

    /* atmosphere */
    const dustCount = 200
    const dustPositions = new Float32Array(dustCount * 3)
    for (let i = 0; i < dustCount; i += 1) {
      const radius = 2.3 + Math.random() * 2.4
      const theta = Math.random() * TAU
      dustPositions[i * 3] = Math.cos(theta) * radius
      dustPositions[i * 3 + 1] = Math.sin(theta) * radius
      dustPositions[i * 3 + 2] = (Math.random() - 0.5) * 3.4
    }
    const dustGeometry = new THREE.BufferGeometry()
    dustGeometry.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3))
    const dust = new THREE.Points(
      dustGeometry,
      new THREE.PointsMaterial({
        color: 0xdfe8d0,
        size: 0.012,
        transparent: true,
        opacity: 0.32,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        sizeAttenuation: true,
      }),
    )
    root.add(dust)

    /* ---- lighting ---- */
    scene.add(new THREE.AmbientLight(0x9fa98f, 0.055))

    const keyLight = new THREE.DirectionalLight(0xfff2dc, 5.2)
    keyLight.position.set(-4.2, 5.8, 7)
    keyLight.castShadow = true
    keyLight.shadow.mapSize.set(2048, 2048)
    keyLight.shadow.camera.left = -3.2
    keyLight.shadow.camera.right = 3.2
    keyLight.shadow.camera.top = 3.2
    keyLight.shadow.camera.bottom = -3.2
    keyLight.shadow.camera.near = 0.5
    keyLight.shadow.camera.far = 20
    keyLight.shadow.normalBias = 0.018
    keyLight.shadow.bias = -0.00035
    keyLight.shadow.camera.updateProjectionMatrix()
    scene.add(keyLight)

    const rimLight = new THREE.DirectionalLight(0xc8dcff, 2.8)
    rimLight.position.set(6, 2, 4.5)
    scene.add(rimLight)

    const lowerRim = new THREE.DirectionalLight(accent, 0.85)
    lowerRim.position.set(-3.5, -4.5, 3)
    scene.add(lowerRim)

    const frontFill = new THREE.DirectionalLight(0xfff6e6, 0.32)
    frontFill.position.set(0, 1.2, 10)
    scene.add(frontFill)

    const violetLight = new THREE.PointLight(violet, 34, 16, 2)
    violetLight.position.set(4.2, -3.2, 3.2)
    scene.add(violetLight)

    const coreLight = new THREE.PointLight(accent, 6.2, 3.4, 2)
    coreLight.position.set(0, 0, 0.85)
    scene.add(coreLight)

    /* ---- resize + pointer ---- */
    const resize = () => {
      const width = mount.clientWidth || 1
      const height = mount.clientHeight || 1
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      renderer.setSize(width, height, false)
    }
    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(mount)

    const pointer = { x: 0, y: 0 }
    const target = { x: 0, y: 0 }
    const onPointer = (event: PointerEvent) => {
      target.x = (event.clientX / window.innerWidth) * 2 - 1
      target.y = (event.clientY / window.innerHeight) * 2 - 1
    }
    window.addEventListener('pointermove', onPointer, { passive: true })

    const origin = performance.now()
    let raf = 0
    let running = false
    let inView = true
    let cleanupVisibility: (() => void) | undefined
    let cleanupObserver: (() => void) | undefined

    let firstFrame = true

    const render = () => {
      const t = (performance.now() - origin) / 1000
      pointer.x += (target.x - pointer.x) * 0.045
      pointer.y += (target.y - pointer.y) * 0.045

      root.rotation.y = 0.15 + pointer.x * 0.2 + Math.sin(t * 0.24) * 0.018
      root.rotation.x = -0.055 + pointer.y * 0.13 + Math.cos(t * 0.19) * 0.012
      root.position.set(-0.12, Math.sin(t * 0.45) * 0.035, 0)

      wheel.rotation.z = -t * 0.055 + pointer.x * 0.16
      gantry.rotation.z = t * 0.014
      sweep.rotation.z = 0.8 + t * 0.16

      const pulse = 1 + Math.sin(t * 1.6) * 0.06
      core.scale.setScalar(pulse)
      coreLight.intensity = 5.8 + Math.sin(t * 1.6) * 1.5
      coreGlow.material.opacity = 0.23 + Math.sin(t * 1.6) * 0.05
      haloAcid.material.opacity = 0.12 + Math.sin(t * 0.8) * 0.018

      dome.scale.set(1 + Math.sin(t * 1.1) * 0.006, 1 + Math.sin(t * 1.1) * 0.006, 0.62)

      leds.forEach((led, index) => {
        led.material.opacity = 0.28 + (Math.sin(t * 1.8 + index * 1.2) + 1) * 0.12
      })

      dust.rotation.z = t * 0.012
      dust.rotation.x = Math.sin(t * 0.1) * 0.05

      renderer.render(scene, camera)

      if (firstFrame) {
        firstFrame = false
        ;(window as unknown as Record<string, unknown>).__aegisVaultReady = true
        window.dispatchEvent(new Event('aegis:vault-ready'))
      }
    }

    const loop = () => {
      if (!running) return
      render()
      raf = requestAnimationFrame(loop)
    }

    const start = () => {
      if (running || reduced) return
      running = true
      raf = requestAnimationFrame(loop)
    }

    const stop = () => {
      running = false
      cancelAnimationFrame(raf)
    }

    if (reduced) {
      render()
    } else {
      start()

      const io = new IntersectionObserver(
        ([entry]) => {
          inView = entry.isIntersecting
          if (inView && !document.hidden) start()
          else stop()
        },
        { rootMargin: '140px' },
      )
      io.observe(mount)
      cleanupObserver = () => io.disconnect()

      const onVisibility = () => {
        if (document.hidden) stop()
        else if (inView) start()
      }
      document.addEventListener('visibilitychange', onVisibility)
      cleanupVisibility = () => document.removeEventListener('visibilitychange', onVisibility)
    }

    return () => {
      stop()
      cleanupVisibility?.()
      cleanupObserver?.()
      observer.disconnect()
      window.removeEventListener('pointermove', onPointer)
      scene.traverse((object) => {
        const mesh = object as THREE.Mesh
        if (mesh.geometry) mesh.geometry.dispose()
        const material = mesh.material as THREE.Material | THREE.Material[] | undefined
        if (Array.isArray(material)) material.forEach((item) => item.dispose())
        else if (material) material.dispose()
      })
      garbage.forEach((texture) => texture.dispose())
      env.dispose()
      envTarget.dispose()
      renderer.dispose()
      renderer.domElement.remove()
    }
  }, [tint, reduced])

  return <div ref={host} className="vault3d" aria-hidden="true" />
}

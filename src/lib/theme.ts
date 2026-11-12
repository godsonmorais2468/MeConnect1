import { useSyncExternalStore } from 'react'
import { ROLES } from './themeRoles'

/* ============================================================
   Colour themes.
   The design's teal family is held in numbered colour slots (see styles/theme-vars.css, one red/green/blue number each).
   A theme turns every slot to a new hue (keeping each colour's own lightness and relative saturation), so the whole app
   changes together and keeps its depth. The slots are registered numbers, so the browser eases them from one theme to the
   next: that is the smooth change. The gold accent, the status colours (red, green, amber) and the text colour never change.
   ============================================================ */

export type Selection = { id: string; hue: number; sat: number }
export type Theme = Selection & { name: string }

/** The hue of the original (Emerald) look. */
const BASE_HUE = 172
const KEY = 'me-connect:theme'
/** How long a change takes (ms). The stylesheet's transition is the same length. */
const EASE_MS = 600

export const THEMES: Theme[] = [
  { id: 'emerald', name: 'Emerald', hue: 172, sat: 1 },
  { id: 'forest', name: 'Forest', hue: 140, sat: 0.95 },
  { id: 'ocean', name: 'Ocean', hue: 200, sat: 1 },
  { id: 'sapphire', name: 'Sapphire', hue: 220, sat: 1.05 },
  { id: 'indigo', name: 'Indigo', hue: 242, sat: 0.95 },
  { id: 'violet', name: 'Violet', hue: 268, sat: 0.95 },
  { id: 'orchid', name: 'Orchid', hue: 295, sat: 0.9 },
  { id: 'rose', name: 'Rose', hue: 336, sat: 1 },
  { id: 'ruby', name: 'Ruby', hue: 355, sat: 1 },
  { id: 'copper', name: 'Copper', hue: 22, sat: 0.95 },
  { id: 'graphite', name: 'Graphite', hue: 210, sat: 0.12 },
]
const DEFAULT: Selection = { id: 'emerald', hue: BASE_HUE, sat: 1 }

type RGB = [number, number, number]

function toHsl([r, g, b]: RGB): [number, number, number] {
  r /= 255
  g /= 255
  b /= 255
  const mx = Math.max(r, g, b)
  const mn = Math.min(r, g, b)
  const l = (mx + mn) / 2
  let h = 0
  let s = 0
  if (mx !== mn) {
    const d = mx - mn
    s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn)
    if (mx === r) h = (g - b) / d + (g < b ? 6 : 0)
    else if (mx === g) h = (b - r) / d + 2
    else h = (r - g) / d + 4
    h *= 60
  }
  return [h, s * 100, l * 100]
}

function fromHsl(h: number, s: number, l: number): RGB {
  s /= 100
  l /= 100
  const k = (n: number) => (n + h / 30) % 12
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
  return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)]
}

/** The colour of every slot under a theme. */
export function paletteFor(sel: Selection): RGB[] {
  if (sel.hue === BASE_HUE && sel.sat === 1) return ROLES
  return ROLES.map((c) => {
    const [h, s, l] = toHsl(c)
    return fromHsl((h + sel.hue - BASE_HUE + 360) % 360, Math.min(100, s * sel.sat), l)
  })
}

/* the slot a given original colour lives in, so a few inline colours (the logo mark, the splash) can follow the theme too */
const SLOT = new Map(ROLES.map((c, i) => [c.join(','), i]))
/** A CSS colour for an original design colour, such as '#17403C'. It follows the theme. Colours that are not part of the themed family come back unchanged. */
export function tc(hex: string, alpha?: number): string {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  const i = SLOT.get(`${r},${g},${b}`)
  if (i === undefined) return hex
  return `rgb(var(--c${i}-r) var(--c${i}-g) var(--c${i}-b)${alpha === undefined ? '' : ` / ${alpha}`})`
}

/** Three colours that stand for a theme, for its preview swatch: light, mid, dark. */
export function swatchFor(sel: Selection): [string, string, string] {
  const pal = paletteFor(sel)
  const css = (c: RGB) => `rgb(${c[0]}, ${c[1]}, ${c[2]})`
  const at = (orig: RGB) => css(pal[SLOT.get(orig.join(',')) ?? 0])
  return [at([43, 196, 171]), at([13, 110, 97]), at([15, 46, 43])]
}

/* ---------- the current selection ---------- */
let current: Selection = DEFAULT
const listeners = new Set<() => void>()

function read(): Selection {
  try {
    const raw = window.localStorage.getItem(KEY)
    if (!raw) return DEFAULT
    const v = JSON.parse(raw) as Partial<Selection>
    if (typeof v.hue === 'number' && typeof v.sat === 'number' && typeof v.id === 'string') return { id: v.id, hue: v.hue, sat: v.sat }
  } catch {
    /* no storage or a broken value: the default look */
  }
  return DEFAULT
}

let easing = 0
function paint(sel: Selection, animated: boolean) {
  const root = document.documentElement
  /* while the numbers glide, the page's own colour transitions are paused: otherwise every button chases a moving target and the change stutters */
  if (animated) {
    root.classList.add('theming')
    window.clearTimeout(easing)
    easing = window.setTimeout(() => root.classList.remove('theming'), EASE_MS + 80)
  }
  const pal = paletteFor(sel)
  const isDefault = sel.hue === BASE_HUE && sel.sat === 1
  pal.forEach((c, i) => {
    ;(['r', 'g', 'b'] as const).forEach((ch, k) => {
      if (isDefault) root.style.removeProperty(`--c${i}-${ch}`)
      else root.style.setProperty(`--c${i}-${ch}`, String(c[k]))
    })
  })
  /* the phone's browser bar follows the theme too */
  const dark = pal[SLOT.get('15,46,43') ?? 0]
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', `rgb(${dark[0]}, ${dark[1]}, ${dark[2]})`)
}

/** Applies the saved theme before the first paint, with no easing. */
export function initTheme() {
  current = read()
  const root = document.documentElement
  root.classList.add('theme-instant')
  paint(current, false)
  /* easing is switched back on once the first frame is out (a timer, not an animation frame: a page opened in a background tab never gets frames) */
  window.setTimeout(() => root.classList.remove('theme-instant'), 150)
}

/** Changes the theme. With `animated` the colours glide to the new ones. */
export function setTheme(sel: Selection, animated = true) {
  current = sel
  paint(sel, animated)
  try {
    window.localStorage.setItem(KEY, JSON.stringify(sel))
  } catch {
    /* private mode: it lasts for this visit */
  }
  listeners.forEach((l) => l())
}

export function useTheme(): Selection {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    () => current,
  )
}

/** A custom colour from a picker (#rrggbb): its hue becomes the theme's hue, and its saturation scales the family. */
export function customFrom(hex: string): Selection {
  const h = hex.replace('#', '')
  const [hue, sat] = toHsl([parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)])
  return { id: 'custom', hue: Math.round(hue), sat: Math.max(0.15, Math.min(1.3, +(sat / 72).toFixed(2))) }
}

/** The picker colour that stands for a custom selection. */
export function customHex(sel: Selection): string {
  const [r, g, b] = fromHsl(sel.hue, Math.min(100, 72 * sel.sat), 45)
  return `#${[r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('')}`
}

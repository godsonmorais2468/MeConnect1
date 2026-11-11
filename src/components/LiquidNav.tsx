import { useCallback, useLayoutEffect, useRef } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { animate } from 'motion'
import type { NavItem } from '../data/nav'
import { getTier } from '../lib/perf'

/* The glass drop that marks the open page moves like liquid: the edge it heads for runs ahead and the edge it leaves
   follows a little later, so the drop stretches across the gap and then pulls itself together. Both edges ease out
   with no bounce, so it glides instead of wobbling, even over a long jump. */
const LEAD = { duration: 0.3, ease: [0.22, 1, 0.36, 1] } as const
const TRAIL = { duration: 0.5, ease: [0.22, 1, 0.36, 1] } as const

type Placed = { index: number; vertical: boolean; sig: string }

export default function LiquidNav({ items, dueCount }: { items: NavItem[]; dueCount: number }) {
  const { pathname } = useLocation()
  const navRef = useRef<HTMLElement>(null)
  const dropRef = useRef<HTMLSpanElement>(null)
  /* where the drop is (or is heading), and the measurements that placement was made from */
  const placed = useRef<Placed | null>(null)
  const running = useRef<{ stop: () => void }[]>([])

  /* Moves the drop under tab `index`. It does nothing when the drop is already there for the same measurements. That matters twice:
     a tap moves the drop at once (before the page behind it has finished loading), and the page change that follows must not
     start the move again; and the size watchers fire once as soon as they start, which must not snap a glide to its end. */
  const go = useCallback((index: number, glide: boolean) => {
    const nav = navRef.current
    const drop = dropRef.current
    if (!nav || !drop) return
    if (index < 0) {
      drop.style.opacity = '0'
      return
    }
    const link = nav.querySelectorAll<HTMLElement>('a')[index]
    if (!link) return
    drop.style.opacity = '1'

    /* a row of tabs on phones, a column on the desktop rail */
    const vertical = getComputedStyle(nav).flexDirection === 'column'
    const start = vertical ? link.offsetTop : link.offsetLeft
    const size = vertical ? link.offsetHeight : link.offsetWidth
    const total = vertical ? nav.clientHeight : nav.clientWidth
    const sig = `${vertical}|${total}|${start}|${size}`
    const before = placed.current
    if (before && before.index === index && before.sig === sig) return

    /* on the tab bar the drop is a little wider than its tab, so a long name like E-Directory sits well inside it (never past the bar's ends) */
    const bleed = vertical ? 0 : 4
    const from = Math.max(0, start - bleed)
    const to = Math.max(0, total - start - size - bleed)
    const [near, far] = vertical ? (['top', 'bottom'] as const) : (['left', 'right'] as const)

    placed.current = { index, vertical, sig }
    /* a new move replaces one still running, so quick taps from tab to tab never fight over the drop */
    running.current.forEach((a) => a.stop())
    running.current = []

    const still = !glide || !before || before.vertical !== vertical || before.index === index || getTier() === 'low' || window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (still) {
      drop.style.left = drop.style.right = drop.style.top = drop.style.bottom = ''
      drop.style[near] = `${from}px`
      drop.style[far] = `${to}px`
      return
    }

    const forward = index > before.index
    running.current = [animate(drop, { [near]: `${from}px` }, forward ? TRAIL : LEAD), animate(drop, { [far]: `${to}px` }, forward ? LEAD : TRAIL)]
  }, [])

  const activeIndex = () => [...(navRef.current?.querySelectorAll<HTMLElement>('a') ?? [])].findIndex((a) => a.classList.contains('active'))

  useLayoutEffect(() => {
    go(activeIndex(), true)
    const nav = navRef.current
    if (!nav) return
    /* the drop is placed in pixels, so it is placed again when the bar or any tab changes size: a scrollbar appearing, the phone turning, the fonts arriving */
    const again = () => go(activeIndex(), false)
    const watch = new ResizeObserver(again)
    watch.observe(nav)
    nav.querySelectorAll('a').forEach((a) => watch.observe(a))
    window.addEventListener('resize', again)
    void document.fonts?.ready.then(again)
    return () => {
      watch.disconnect()
      window.removeEventListener('resize', again)
    }
  }, [pathname, go])

  return (
    <nav className="nav" aria-label="Main" ref={navRef}>
      <span className="nav__liquid" ref={dropRef} aria-hidden />
      {items.map((n, i) => (
        <NavLink key={n.to} to={n.to} end={n.end} aria-label={n.short ? n.label : undefined} onClick={() => go(i, true)}>
          <span className="nav__ico">
            <n.icon size={20} strokeWidth={1.9} aria-hidden />
          </span>
          <span className="nav__label nav__label--full">{n.label}</span>
          {n.short && (
            <span className="nav__label nav__label--short" aria-hidden>
              {n.short}
            </span>
          )}
          {n.badge === 'dues' && dueCount > 0 && (
            <b className="nav__badge" aria-label={`${dueCount} pending ${dueCount === 1 ? 'due' : 'dues'}`}>
              {dueCount}
            </b>
          )}
        </NavLink>
      ))}
    </nav>
  )
}

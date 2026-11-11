import { useLayoutEffect, useRef } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { animate } from 'motion'
import type { NavItem } from '../data/nav'
import { getTier } from '../lib/perf'

/* The glass drop that marks the open page moves like liquid: the edge it heads for runs ahead and the edge it leaves
   follows a little later, so the drop stretches across the gap and then pulls itself together. Both edges ease out
   with no bounce, so it glides instead of wobbling, even over a long jump. */
const LEAD = { duration: 0.3, ease: [0.22, 1, 0.36, 1] } as const
const TRAIL = { duration: 0.5, ease: [0.22, 1, 0.36, 1] } as const

export default function LiquidNav({ items, dueCount }: { items: NavItem[]; dueCount: number }) {
  const { pathname } = useLocation()
  const navRef = useRef<HTMLElement>(null)
  const dropRef = useRef<HTMLSpanElement>(null)
  const last = useRef<{ index: number; vertical: boolean } | null>(null)

  useLayoutEffect(() => {
    const place = (glide: boolean) => {
      const nav = navRef.current
      const drop = dropRef.current
      if (!nav || !drop) return
      const links = [...nav.querySelectorAll<HTMLElement>('a')]
      const index = links.findIndex((a) => a.classList.contains('active'))
      drop.style.opacity = index < 0 ? '0' : '1'
      if (index < 0) return

      const link = links[index]
      /* a row of tabs on phones, a column on the desktop rail */
      const vertical = getComputedStyle(nav).flexDirection === 'column'
      const start = vertical ? link.offsetTop : link.offsetLeft
      const size = vertical ? link.offsetHeight : link.offsetWidth
      const total = vertical ? nav.clientHeight : nav.clientWidth
      /* on the tab bar the drop is a little wider than its tab, so a long name like E-Directory sits well inside it (never past the bar's ends) */
      const bleed = vertical ? 0 : 4
      const from = Math.max(0, start - bleed)
      const to = Math.max(0, total - start - size - bleed)
      const [near, far] = vertical ? (['top', 'bottom'] as const) : (['left', 'right'] as const)

      const before = last.current
      last.current = { index, vertical }

      const still = !glide || !before || before.vertical !== vertical || getTier() === 'low' || window.matchMedia('(prefers-reduced-motion: reduce)').matches
      if (still) {
        drop.style.left = drop.style.right = drop.style.top = drop.style.bottom = ''
        drop.style[near] = `${from}px`
        drop.style[far] = `${to}px`
        return
      }

      const forward = index > before.index
      void animate(drop, { [near]: `${from}px` }, forward ? TRAIL : LEAD)
      void animate(drop, { [far]: `${to}px` }, forward ? LEAD : TRAIL)
    }

    place(true)
    const nav = navRef.current
    if (!nav) return
    /* the drop is placed in pixels, so it is placed again whenever the bar or any tab changes size: a scrollbar appearing, the phone turning, the fonts arriving */
    const again = () => place(false)
    const watch = new ResizeObserver(again)
    watch.observe(nav)
    nav.querySelectorAll('a').forEach((a) => watch.observe(a))
    window.addEventListener('resize', again)
    void document.fonts?.ready.then(again)
    return () => {
      watch.disconnect()
      window.removeEventListener('resize', again)
    }
  }, [pathname])

  return (
    <nav className="nav" aria-label="Main" ref={navRef}>
      <span className="nav__liquid" ref={dropRef} aria-hidden />
      {items.map((n) => (
        <NavLink key={n.to} to={n.to} end={n.end} aria-label={n.short ? n.label : undefined}>
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

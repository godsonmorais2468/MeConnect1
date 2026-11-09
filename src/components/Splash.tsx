import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import { getTier } from '../lib/perf'

/* How long the splash plays before it leaves, and how long the leaving takes (ms). */
const HOLD = 3000
const LEAVE = 700
/* Reduced motion and weak devices get a still logo for a moment, then a plain fade. */
const HOLD_CALM = 800
const LEAVE_CALM = 300

const WORD = 'ME-CONNECT'
const CENTRE = 200
const SPOKE_RADIUS = 128
/* six people around the mark, two picked out in amber */
const NODES = Array.from({ length: 6 }, (_, i) => {
  const a = (Math.PI / 3) * i - Math.PI / 2 + Math.PI / 6
  return { x: +(CENTRE + SPOKE_RADIUS * Math.cos(a)).toFixed(1), y: +(CENTRE + SPOKE_RADIUS * Math.sin(a)).toFixed(1), lit: i === 1 || i === 4 }
})

const step = (i: number, base: number, gap: number) => ({ '--d': `${(base + i * gap).toFixed(2)}s` }) as CSSProperties

/** The opening screen: the mark draws itself inside rings, six people connect to it, the name and the tagline arrive, and the screen closes like an iris onto the app. Tap, click or any key skips it. */
export default function Splash() {
  const [phase, setPhase] = useState<'in' | 'out' | 'gone'>('in')
  const calm = getTier() === 'low' || window.matchMedia('(prefers-reduced-motion: reduce)').matches

  useEffect(() => {
    /* the plain cover from index.html hands over to this one at the same colour, so there is no flash */
    document.getElementById('boot')?.remove()
    const hold = calm ? HOLD_CALM : HOLD
    const leave = calm ? LEAVE_CALM : LEAVE
    const leaving = window.setTimeout(() => setPhase('out'), hold)
    const done = window.setTimeout(() => setPhase('gone'), hold + leave)
    return () => {
      window.clearTimeout(leaving)
      window.clearTimeout(done)
    }
  }, [calm])

  /* the page cannot scroll while the splash covers it, and must the moment it is gone (the component stays mounted after it hides, so this cannot wait for unmount) */
  useEffect(() => {
    if (phase === 'gone') return
    const root = document.documentElement
    root.classList.add('splash-on')
    return () => root.classList.remove('splash-on')
  }, [phase])

  /* skipping: close now, and drop the pending timers' work by moving straight to leaving */
  useEffect(() => {
    if (phase !== 'in') return
    const skip = () => setPhase('out')
    window.addEventListener('keydown', skip)
    return () => window.removeEventListener('keydown', skip)
  }, [phase])

  useEffect(() => {
    if (phase !== 'out') return
    const t = window.setTimeout(() => setPhase('gone'), calm ? LEAVE_CALM : LEAVE)
    return () => window.clearTimeout(t)
  }, [phase, calm])

  if (phase === 'gone') return null

  return (
    <div className={`splash${phase === 'out' ? ' splash--out' : ''}${calm ? ' splash--calm' : ''}`} role="status" aria-label="Loading ME-CONNECT" onPointerDown={() => phase === 'in' && setPhase('out')}>
      <div className="splash__glow" aria-hidden />
      <div className="splash__stage" aria-hidden>
        <svg className="splash__scene" viewBox="0 0 400 400">
          <defs>
            <linearGradient id="splash-core" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#1F6B60" />
              <stop offset="1" stopColor="#0A2E2B" />
            </linearGradient>
            <linearGradient id="splash-ring" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#F2B33D" stopOpacity="0.9" />
              <stop offset="0.5" stopColor="#FFFFFF" stopOpacity="0.35" />
              <stop offset="1" stopColor="#2DD4BF" stopOpacity="0.8" />
            </linearGradient>
          </defs>

          {/* three rings that draw themselves, with a small light travelling on two of them */}
          <circle className="splash__ring" style={step(0, 0.1, 0)} cx="200" cy="200" r="84" pathLength="1" />
          <circle className="splash__ring splash__ring--mid" style={step(1, 0.1, 0.18)} cx="200" cy="200" r="128" pathLength="1" />
          <circle className="splash__ring splash__ring--out" style={step(2, 0.1, 0.18)} cx="200" cy="200" r="172" pathLength="1" />
          <g className="splash__orbit splash__orbit--a">
            <circle cx="372" cy="200" r="4.5" fill="#F2B33D" />
          </g>
          <g className="splash__orbit splash__orbit--b">
            <circle cx="116" cy="200" r="3.5" fill="#fff" fillOpacity="0.85" />
          </g>

          {/* six people joined to the mark and to each other */}
          {NODES.map((n, i) => {
            const next = NODES[(i + 1) % NODES.length]
            return <line key={`e${i}`} className="splash__edge" style={step(i, 1.0, 0.07)} x1={n.x} y1={n.y} x2={next.x} y2={next.y} pathLength="1" />
          })}
          {NODES.map((n, i) => (
            <line key={`s${i}`} className="splash__spoke" style={step(i, 0.8, 0.08)} x1={CENTRE} y1={CENTRE} x2={n.x} y2={n.y} pathLength="1" />
          ))}
          {NODES.map((n, i) => (
            <circle key={`n${i}`} className={`splash__node${n.lit ? ' splash__node--lit' : ''}`} style={step(i, 1.2, 0.09)} cx={n.x} cy={n.y} r={n.lit ? 7 : 5} />
          ))}

          {/* two ripples leave the mark when its amber point lands */}
          <circle className="splash__ripple" style={step(0, 1.2, 0)} cx="200" cy="200" r="48" />
          <circle className="splash__ripple" style={step(1, 1.2, 0.3)} cx="200" cy="200" r="48" />

          {/* the mark itself */}
          <g className="splash__core">
            <rect x="148" y="148" width="104" height="104" rx="30" fill="url(#splash-core)" />
            <rect x="148.75" y="148.75" width="102.5" height="102.5" rx="29.25" fill="none" stroke="#fff" strokeOpacity="0.3" strokeWidth="1.5" />
            <g transform="translate(168 168) scale(1.0)">
              <path className="splash__m" d="M16 46V20l16 18 16-18v26" fill="none" stroke="#fff" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round" pathLength="1" />
              <circle className="splash__dot" cx="32" cy="38" r="6.5" fill="#F2B33D" />
            </g>
          </g>
        </svg>

        <h1 className="splash__word">
          {WORD.split('').map((ch, i) => (
            <span key={i} className={ch === '-' ? 'splash__dash' : undefined} style={step(i, 1.15, 0.05)}>
              {ch}
            </span>
          ))}
        </h1>
        <i className="splash__line" />
        <p className="splash__tag">
          <span style={step(0, 1.95, 0.2)}>Connect.</span>
          <span style={step(1, 1.95, 0.2)}>Collaborate.</span>
          <span style={step(2, 1.95, 0.2)}>Grow.</span>
        </p>
      </div>

      <div className="splash__foot" aria-hidden>
        <div className="splash__bar">
          <i style={{ '--t': `${calm ? HOLD_CALM : HOLD}ms` } as CSSProperties} />
        </div>
        <p>Powered By Geosys IT Solutions Pvt Ltd</p>
      </div>
    </div>
  )
}

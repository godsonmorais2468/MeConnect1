import { m, useMotionValue, useSpring } from 'motion/react'
import { useEffect } from 'react'
import { BrandMark } from './ui'

/* Node positions of the connection web behind the sign-in panel. */
const NODES: [number, number, number][] = [
  [70, 210, 5], [190, 130, 4], [300, 240, 7], [430, 150, 4], [520, 290, 5],
  [140, 360, 4], [270, 420, 5], [410, 390, 8], [90, 520, 6], [240, 590, 4],
  [380, 560, 5], [530, 500, 4],
]
const LINKS: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [5, 2], [2, 6], [6, 7], [7, 4], [5, 8],
  [6, 8], [8, 9], [6, 9], [9, 10], [7, 10], [10, 11], [7, 11], [4, 11],
]
/* the nodes picked out in amber */
const LIT = new Set([2, 7, 8])

/** The pine panel beside the sign-in form: the name, over a web of connected people. */
export default function AuthArt() {
  /* the web leans a little towards the pointer */
  const px = useMotionValue(0)
  const py = useMotionValue(0)
  const x = useSpring(px, { stiffness: 60, damping: 18 })
  const y = useSpring(py, { stiffness: 60, damping: 18 })
  useEffect(() => {
    const move = (e: PointerEvent) => {
      px.set((e.clientX / window.innerWidth - 0.5) * -26)
      py.set((e.clientY / window.innerHeight - 0.5) * -26)
    }
    window.addEventListener('pointermove', move, { passive: true })
    return () => window.removeEventListener('pointermove', move)
  }, [px, py])

  return (
    <aside className="login__art" aria-hidden>
      <m.svg className="login__web" viewBox="0 0 600 760" preserveAspectRatio="xMidYMid slice" style={{ x, y, scale: 1.08 }}>
        {LINKS.map(([a, b]) => (
          <line key={`${a}-${b}`} x1={NODES[a][0]} y1={NODES[a][1]} x2={NODES[b][0]} y2={NODES[b][1]} stroke="rgba(255,255,255,0.14)" strokeWidth="1" />
        ))}
        {NODES.map(([nx, ny, r], i) => (
          <circle key={i} className={LIT.has(i) ? 'web__node--lit' : undefined} cx={nx} cy={ny} r={r} fill={LIT.has(i) ? '#F2B33D' : 'rgba(255,255,255,0.34)'} />
        ))}
      </m.svg>
      <div className="login__logo">
        <BrandMark size={38} />
        ME-CONNECT
      </div>
    </aside>
  )
}

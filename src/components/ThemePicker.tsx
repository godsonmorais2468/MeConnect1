import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { Check, Palette } from 'lucide-react'
import { useDismiss } from '../lib/hooks'
import { THEMES, customFrom, customHex, setTheme, swatchFor, useTheme } from '../lib/theme'

/** The colour theme button and its panel: a grid of ready-made themes and a colour picker for any other colour. The whole app changes with a smooth glide. */
export default function ThemePicker({ floating = false }: { floating?: boolean }) {
  const sel = useTheme()
  const [open, setOpen] = useState(false)
  const [top, setTop] = useState(0)
  const wrapRef = useRef<HTMLDivElement>(null)
  const btnRef = useRef<HTMLButtonElement>(null)
  const close = useCallback(() => setOpen(false), [])
  useDismiss(wrapRef, open, close)

  /* on a phone the panel is as wide as the screen and sits just under the button */
  useLayoutEffect(() => {
    if (open && btnRef.current) setTop(Math.round(btnRef.current.getBoundingClientRect().bottom + 10))
  }, [open])

  const custom = sel.id === 'custom'
  const active = THEMES.find((t) => t.id === sel.id)

  return (
    <div className={`themes${floating ? ' themes--floating' : ''}`} ref={wrapRef}>
      <button ref={btnRef} type="button" className={`themebtn${open ? ' is-open' : ''}`} onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label="Colour theme">
        <Palette size={20} />
      </button>

      {open && (
        <section className="themepanel" aria-label="Colour theme" style={{ '--panel-top': `${top}px` } as CSSProperties}>
          <header className="themepanel__head">
            <h2>Colour theme</h2>
            <span>{custom ? 'Custom' : (active?.name ?? '')}</span>
          </header>

          <div className="themepanel__grid" role="radiogroup" aria-label="Themes">
            {THEMES.map((t) => {
              const [light, mid, dark] = swatchFor(t)
              const on = sel.id === t.id
              return (
                <button key={t.id} type="button" role="radio" aria-checked={on} className={`themesw${on ? ' is-on' : ''}`} onClick={() => setTheme({ id: t.id, hue: t.hue, sat: t.sat })}>
                  <span className="themesw__dot" style={{ background: `linear-gradient(135deg, ${light} 0%, ${mid} 52%, ${dark} 100%)` }}>
                    {on && <Check size={16} strokeWidth={3} />}
                  </span>
                  <span className="themesw__name">{t.name}</span>
                </button>
              )
            })}

            <label className={`themesw themesw--custom${custom ? ' is-on' : ''}`}>
              <span className="themesw__dot themesw__dot--wheel">{custom && <Check size={16} strokeWidth={3} />}</span>
              <span className="themesw__name">Custom</span>
              <input type="color" aria-label="Pick any colour" value={customHex(sel)} onInput={(e) => setTheme(customFrom(e.currentTarget.value), false)} onChange={(e) => setTheme(customFrom(e.currentTarget.value), false)} />
            </label>
          </div>
        </section>
      )}
    </div>
  )
}

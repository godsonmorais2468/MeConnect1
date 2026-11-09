/* The soft light on a glass card follows the pointer: this keeps --mx and --my up to date on the card under it. */
const CARDS =
  '.sheet,.strip,.cover,.hlist,.hcard,.plan,.ctrl__card,.crow,.row,.pcard,.meet,.state,.opt,.bcard,.wcard,.acc__item,.inv__row,.mode,.usum,.dues__sum'

export function installSpotlight() {
  if (typeof window === 'undefined' || window.matchMedia('(hover: none)').matches) return
  let frame = 0
  let last: PointerEvent | null = null

  const apply = () => {
    frame = 0
    const e = last
    if (!e) return
    const card = (e.target as Element | null)?.closest<HTMLElement>(CARDS)
    if (!card) return
    const r = card.getBoundingClientRect()
    card.style.setProperty('--mx', `${Math.round(e.clientX - r.left)}px`)
    card.style.setProperty('--my', `${Math.round(e.clientY - r.top)}px`)
  }

  window.addEventListener(
    'pointermove',
    (e) => {
      last = e
      if (!frame) frame = requestAnimationFrame(apply)
    },
    { passive: true },
  )
}

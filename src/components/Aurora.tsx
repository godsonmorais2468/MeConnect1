/* Slow-moving colour behind the whole app. The glass cards float over it, and it is what they pick up.
   Pure CSS transforms, so the browser moves it on the graphics chip and the page's own work never slows it. */
export default function Aurora() {
  return (
    <div className="aurora" aria-hidden>
      <span className="aurora__blob aurora__blob--a" />
      <span className="aurora__blob aurora__blob--b" />
      <span className="aurora__blob aurora__blob--c" />
      <span className="aurora__blob aurora__blob--d" />
      <span className="aurora__grain" />
    </div>
  )
}

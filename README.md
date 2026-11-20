# ME-CONNECT

Stand-alone UI prototype. It needs no backend and no login: every request is answered in the browser from sample data (`src/lib/demoApi.ts`), and changes you make are kept in this browser until the end of the day.

## Two modes

- **Prototype (default):** no backend, no real login. Everything is sample data in the browser.
- **Live:** point it at the Me-Connect member API (e.g. `https://api.example.com/api`, local `http://127.0.0.1:8001/api`). For a deployed
  site put the address in **`config.js`** (see below); `VITE_API_URL` at build time is only the fallback.
  The app then finds its client from the address it is opened on (or `tenantHost` in `config.js` / `VITE_TENANT_HOST`, or `?tenant=<client domain>` once while
  testing), shows that client's name, hides the modules the Superadmin has switched off, and signs in with a real mobile
  number and PIN. A live install keeps its own browser data (keys end in `:live`), so it never mixes with prototype data.

```bash
VITE_API_URL=http://127.0.0.1:8001/api npm run dev
```

## One build for every client: `config.js`

`public/config.js` is copied next to `index.html` and loaded as a plain script before the app starts:

```js
window.__APP_CONFIG__ = { apiUrl: 'https://api.example.com/api', tenantHost: '', demoHosts: ['my-template.onrender.com'] }
```

Edit that file **on the server** (no rebuild). Leave a value empty to use the build's `VITE_*` value. Because nothing
client-specific is baked into the build, the same files serve every client domain that uses this template: the client is
found from the address the site is opened on. The service worker always asks the network for `config.js` first
(and keeps a copy for offline starts), so an edit shows on the next load. Keep `config.js` and `index.html` out of long caching.
`VITE_GOOGLE_MAPS_API_KEY` and `VITE_ONESIGNAL_APP_ID` are still build-time values (one key for all clients).

### Preview = prototype, client domain = live

The mode is decided when the page opens, from the address:

| Address | `apiUrl` empty | `apiUrl` set |
| --- | --- | --- |
| listed in `demoHosts` (the template's preview address) | prototype | **prototype** |
| any other address (a client's domain) | prototype | **live**: finds its client, real sign-in |
| a preview address opened with `?tenant=<client domain>` | prototype | live as that client (remembered in this browser; `?tenant=demo` goes back) |

So one template can be both: assign it to a client and activate the client's domain, and that domain opens live while the
preview address keeps showing the prototype. In live mode a domain that is not set up, or a client that is switched off, shows a
plain message (never the prototype). The sample-data code is a separate file that a live page never downloads.
Two sites also work: a preview site whose `config.js` has no `apiUrl`, and the edge copy served on client domains whose `config.js` has it.
In live mode a page whose module is off for the client is not reachable (menu, home, tiles and typed addresses), and a client
without the Subscription module is never sent to the subscription page.

## Run it

```bash
npm install
npm run dev
```

On the sign-in screen, **Login Now** opens the app as a chapter member on the head table, with nothing typed in. There are no admin dashboards: the app is the member app only.

All names, numbers and payments are made up.

## Runs on any device

`src/lib/perf.ts` picks a visual tier for the device and sets `data-perf` on the page: `high` (everything), `mid` (lighter blur, fewer moving parts) or `low` (flat and still). It starts from a hardware guess, then watches the frame rate and steps down if the device cannot keep up, remembering that next time. To try a tier by hand, add `?perf=low`, `?perf=mid` or `?perf=high` to the address.

## Where the design lives

- `src/styles/tokens.css`: colours, type, radii, shadows ("Pine & Paper").
- `src/styles/components.css`: styles for each screen's pieces.
- `src/styles/design.css`: app frame, primitives, sign-in and home. Loaded last, so it wins.
- `src/components/Shell.tsx`: side rail on desktop, bottom tab bar on phones and tablets.
- `src/components/AuthArt.tsx`: pine panel beside the sign-in form.
- `src/pages/member/Home.tsx`: home layout.
- `src/lib/demoApi.ts`: sample data and the answers to every request.

## Colour themes

The palette button in the top bar (and in the corner of the sign-in page) opens the theme panel: eleven themes and a colour picker for any colour. The choice is saved in the browser.

- Every teal-family colour in the stylesheets is a numbered slot (`--c0-r`, `--c0-g`, `--c0-b`, ...), listed in `src/styles/theme-vars.css` and `src/lib/themeRoles.ts`. Both files are generated; to add a new colour to the family, put it in a stylesheet as a normal hex or `rgb()` value and re-run the theme tool (a one-off script), or edit the generated files together.
- `src/lib/theme.ts` turns every slot to the chosen hue (each colour keeps its own lightness) and writes the numbers on `<html>`. The slots are registered CSS numbers (`@property`), so the browser eases them from one theme to the next. Devices on the `low` tier, and people who ask for reduced motion, switch instantly.
- The gold accent, the status colours (red, green, amber) and the text colour do not change with the theme.

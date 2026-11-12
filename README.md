# ME-CONNECT

Stand-alone UI prototype. It needs no backend and no login: every request is answered in the browser from sample data (`src/lib/demoApi.ts`), and changes you make are kept in this browser until the end of the day.

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

# Pumpkin Paint Studio

An interactive 3D pumpkin you can turn and paint in your browser, drawn in a hand-inked sketchbook style.

**Live demo: https://erikatinkers.github.io/pumpkin-paint/**

<img width="1703" height="863" alt="Screenshot 2026-10-22 at 10 45 31 PM" src="https://github.com/user-attachments/assets/a578a495-b033-4134-a3ae-1bc4de326f57" />
<img width="1697" height="856" alt="Screenshot 2026-10-22 at 11 08 22 PM" src="https://github.com/user-attachments/assets/798fa346-0f72-4902-bb4b-7c113b5f0a91" />



## Features

- **Paint** with watercolors straight onto the pumpkin: pick a color, set the brush size, and paint with a raised, puffy feel and a matte-to-satin sheen.
- **Tools:** paint, erase, turn, undo/redo, and clear.
- **Surprise me:** open the gift box and see what happens!
- **Capture** a picture of your pumpkin.
- **Touch-friendly:** one finger paints on the pumpkin and turns it when you drag the background, and two fingers pinch-zoom.

## Built with
- Next.js (App Router)
- TypeScript
- react-three-fiber
- drei
- zustand

## Run it locally

```bash
npm install
npm run dev          # http://localhost:3000
```

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` | Production build. Static export to `out/`. Must pass before any push |
| `npm run typecheck` / `npm run lint` | `tsc --noEmit` / ESLint |
| `npm test` | Vitest unit tests (undo tiles, seam wrapping, pole stretch, stroke profile, detail map) |
| `npm run test:e2e` | Playwright against `next dev`, using software WebGL (SwiftShader). First time: `npx playwright install chromium` |

CI (`.github/workflows/ci.yml`) runs typecheck, lint, unit tests and build on every push.

## Testing the 3D scene

- `?debug&seed=1` fixes the camera, turns orbit off, renders at 1x pixel ratio and seeds the pigment detail, so screenshots are repeatable.
- In dev, `window.__pumpkin` exposes `paintStroke(points)` (UV coordinates), `setCamera(az, po, d)`, `reset()`, `settled()`, `stats()` (draw calls, texture size) and `perf()`.
- Screenshot baselines live in `tests/e2e/__screenshots__/`. After an intentional visual change, regenerate them with `npx playwright test --update-snapshots` and review the diff.

## Layout

- `app/` routes only. `components/scene/` the 3D scene (client-only, loaded with `dynamic(..., { ssr: false })`). `components/ui/` palette and toolbar.
- `lib/painting/` brush, strokes, undo, textures and the paint engine. `lib/shaders/` the pen-and-watercolor shader patch. `lib/store.ts` brush state.

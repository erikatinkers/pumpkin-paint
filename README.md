# Pumpkin Paint Studio

An interactive 3D pumpkin you can turn and paint in your browser, drawn in a hand-inked sketchbook style.

**Live demo: https://erikatinkers.github.io/pumpkin-paint/**

## Features

- **Paint** with watercolors straight onto the pumpkin: pick a color, set the brush size, and paint with a raised, puffy feel and a matte-to-satin sheen.
- **Tools:** paint, erase, turn, undo/redo, and clear.
- **Surprise me:** open the gift box and the pumpkin paints itself one of 10 designs (checkerboard, daisies, gingham, sugar skull, three cats, jack-o'-lantern, a web mask, and a monster).
- **Capture** a picture of your pumpkin.
- **Touch-friendly:** one finger paints on the pumpkin and turns it when you drag the background, and two fingers pinch-zoom.

Built with Next.js (App Router), TypeScript, react-three-fiber, drei and zustand. Surprise designs are small "recipes" in `lib/painting/surprise/`: add one with a single file and one line in the list.

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

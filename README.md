# Pumpkin Paint Studio

A 3D pumpkin you can rotate and paint, drawn in pen and watercolor. Next.js (App Router), TypeScript, react-three-fiber, drei, zustand.

```bash
npm install
npm run dev          # http://localhost:3000
```

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` | Production build. Must pass before any push; Pantheon runs it on deploy |
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

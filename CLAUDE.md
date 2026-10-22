# Pumpkin Paint Studio

Interactive 3D pumpkin you can rotate and paint. Next.js (App Router) + TypeScript, react-three-fiber, zustand. Hosted on Pantheon from GitHub.

## Commands
- `npm run dev` runs the app at http://localhost:3000
- `npm run typecheck`, `npm run lint`, `npm test` (Vitest), `npm run test:e2e` (Playwright)
- `npm run build` must pass before any push. Pantheon runs it on deploy.

## Layout
- `app/` routes only. `components/scene/` 3D (client-only). `components/ui/` palette and toolbar.
- `lib/` pure logic: `store.ts` (brush state), `pumpkinGeometry.ts`, `painting/` (brush, strokes, undo), `shaders/`.
- The 3D scene is loaded with `dynamic(..., { ssr: false })`. Never import three.js in a server component.

## Rules
- Painting renders into canvas textures in UV space (color, height, roughness). Keep texture size at 2048x1024 desktop, 1024x512 touch.
- Dispose geometries, materials and textures you create outside R3F's own lifecycle.
- Performance budget: 60fps on a mid-range phone. Max 1 pumpkin mesh + stem + shadow plane (3 draw calls).
- Touch: one finger paints or turns depending on the tool, two fingers pinch-zoom. Test pointer events on a phone early.
- No new dependency without a reason in the PR description.

## Testing the 3D scene
- Expose `window.__pumpkin` (dev only) with `paintStroke(points)`, `setCamera(az, po, d)`, `reset()`.
- `?debug&seed=1` freezes animation and fixes the camera so Playwright screenshots are repeatable.
- Headless Chromium needs software WebGL (SwiftShader).

## Pantheon
- Code comes from GitHub. Pushing deploys. Every PR gets a preview environment.
- No SFTP mode. All changes go through git.

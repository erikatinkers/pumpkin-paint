export interface Point {
  x: number;
  y: number;
}

/** Texture size by input type: 2048x1024 on desktop, 1024x512 on touch devices. */
export function textureSizeFor(coarsePointer: boolean): { width: number; height: number } {
  return coarsePointer ? { width: 1024, height: 512 } : { width: 2048, height: 1024 };
}

/** UV to canvas pixels. CanvasTexture flips Y, so v = 1 (north pole) is the top row. */
export function uvToPixel(u: number, v: number, width: number, height: number): Point {
  return { x: u * width, y: (1 - v) * height };
}

/**
 * Horizontal stretch that cancels UV pinching: a pixel row at latitude `theta` is only sin(theta) as wide on the surface
 * as at the equator, so dabs are widened by 1/sin(theta). Clamped so the pole itself stays finite.
 */
export function poleStretch(y: number, height: number, max = 10): number {
  const s = Math.sin((y / height) * Math.PI);
  return s <= 1 / max ? max : 1 / s;
}

/** X offsets at which to draw a dab so it wraps across the u seam: x - W, x, x + W, keeping only copies that reach the canvas. */
export function seamOffsets(x: number, halfWidth: number, width: number): number[] {
  const offsets = [0];
  if (x - halfWidth < 0) offsets.push(width);
  if (x + halfWidth > width) offsets.push(-width);
  return offsets;
}

/**
 * Dab positions between two stroke samples, `spacing` pixels apart, going the short way around the seam.
 * Excludes `from` (already drawn); x is wrapped into [0, width).
 */
export function interpolateDabs(from: Point, to: Point, spacing: number, width: number): Point[] {
  let dx = to.x - from.x;
  if (dx > width / 2) dx -= width;
  else if (dx < -width / 2) dx += width;
  const dy = to.y - from.y;
  const dist = Math.hypot(dx, dy);
  const out: Point[] = [];
  if (dist < spacing) return out;
  const n = Math.floor(dist / spacing);
  for (let i = 1; i <= n; i++) {
    const t = (i * spacing) / dist;
    const x = from.x + dx * t;
    out.push({ x: ((x % width) + width) % width, y: from.y + dy * t });
  }
  return out;
}

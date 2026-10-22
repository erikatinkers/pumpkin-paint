/** A soft contact shadow: centre, half-length and half-width along the object's own x and z, its yaw, and whether it lies on the top page or on the ground. */
export interface Shade {
  x: number;
  z: number;
  hl: number;
  hw: number;
  yaw: number;
  onPage: boolean;
}

/**
 * Paints one flat, hard-edged cast shadow into `ctx`, the same warm brown as the pumpkin's, with the light from the left so it falls to the right.
 * `px` is pixels per world unit. `soft` keeps the old blurred fall-off, for the wide halo under the notebook.
 */
export function paintShade(ctx: CanvasRenderingContext2D, s: Shade, cx: number, cz: number, px: number, strength = 1, soft = false) {
  ctx.save();
  ctx.translate(cx, cz);
  ctx.rotate(-s.yaw);
  ctx.scale(s.hl * px, s.hw * px);
  if (soft) {
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1.4);
    g.addColorStop(0, `rgba(70, 50, 35, ${0.42 * strength})`);
    g.addColorStop(0.55, `rgba(70, 50, 35, ${0.24 * strength})`);
    g.addColorStop(1, "rgba(70, 50, 35, 0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, 1.4, 0, Math.PI * 2);
  } else {
    ctx.fillStyle = `rgba(70, 50, 35, ${0.3 * strength})`;
    ctx.beginPath();
    ctx.ellipse(0, 0, 1.08, 1.08, 0, 0, Math.PI * 2);
  }
  ctx.fill();
  ctx.restore();
}

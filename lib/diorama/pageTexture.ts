import * as THREE from "three";
import { type Shade, paintShade } from "./shade";

export const PAGE_W = 11;
export const PAGE_D = 8;
const W = 2048;
const H = Math.round((W * PAGE_D) / PAGE_W);
const INK = "#2a1d1a";
const PENCIL = "rgba(109, 95, 82, 0.8)";
const PX_PER_UNIT = W / PAGE_W;
const MARGIN = 56; // transparent border of the texture, for the shadow

/** The paper itself, inside the texture's transparent margin: its size in world units, and where the binder holes are punched. */
export const PAPER_W = (PAGE_W * (W - 2 * MARGIN)) / W;
export const PAPER_D = (PAGE_D * (H - 2 * MARGIN)) / H;
export const HOLE_X = -PAPER_W / 2 + 0.28;

/** A loose, deterministic wobble so every "hand-drawn" edge is a little different. */
const wob = (t: number, seed: number) => Math.sin(t * 0.05 + seed) * 2.2 + Math.sin(t * 0.13 + seed * 2.1) * 1.4;

function wobblyLine(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, seed: number) {
  const n = Math.max(2, Math.round(Math.hypot(x1 - x0, y1 - y0) / 30));
  ctx.beginPath();
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const x = x0 + (x1 - x0) * t + wob(i * 30, seed);
    const y = y0 + (y1 - y0) * t + wob(i * 30 + 99, seed + 1);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
}

function leaf(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, rot: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(s, s);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(10, -50, 90, -50, 120, 0);
  ctx.bezierCurveTo(90, 50, 10, 50, 0, 0);
  ctx.moveTo(0, 0);
  ctx.lineTo(105, 0);
  ctx.moveTo(40, 0);
  ctx.lineTo(60, -22);
  ctx.moveTo(40, 0);
  ctx.lineTo(60, 22);
  ctx.moveTo(70, 0);
  ctx.lineTo(88, -16);
  ctx.moveTo(70, 0);
  ctx.lineTo(88, 16);
  ctx.stroke();
  ctx.restore();
}

function star(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.quadraticCurveTo(x, y, x, y + r);
  ctx.quadraticCurveTo(x, y, x - r, y);
  ctx.quadraticCurveTo(x, y, x, y - r);
  ctx.stroke();
}

function spiral(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath();
  for (let a = 0; a < Math.PI * 6; a += 0.2) {
    const rr = (a / (Math.PI * 6)) * r;
    const px = x + Math.cos(a) * rr;
    const py = y + Math.sin(a) * rr;
    if (a === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();
}

function tinyPumpkin(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  ctx.beginPath();
  ctx.ellipse(x, y, 52 * s, 40 * s, 0, 0, Math.PI * 2);
  ctx.moveTo(x - 18 * s, y - 38 * s);
  ctx.bezierCurveTo(x - 30 * s, y - 10 * s, x - 30 * s, y + 10 * s, x - 18 * s, y + 38 * s);
  ctx.moveTo(x + 18 * s, y - 38 * s);
  ctx.bezierCurveTo(x + 30 * s, y - 10 * s, x + 30 * s, y + 10 * s, x + 18 * s, y + 38 * s);
  ctx.moveTo(x, y - 40 * s);
  ctx.lineTo(x + 4 * s, y - 58 * s);
  ctx.stroke();
}

/**
 * A sketchbook page seen from above: cream paper, ruled lines, a margin, binder holes, tape and pencil doodles, an inked border and a soft shadow
 * on a transparent surround. The pumpkin stands in the middle; the doodles are kept out to the sides. The caller owns (and disposes) the texture.
 */
export function createPageTexture(shades: Shade[] = []): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const m = MARGIN;
  const pw = W - m * 2;
  const ph = H - m * 2;

  // Shadow and paper.
  ctx.save();
  ctx.shadowColor = "rgba(70, 50, 30, 0.35)";
  ctx.shadowBlur = 34;
  ctx.shadowOffsetX = 10;
  ctx.shadowOffsetY = 14;
  ctx.fillStyle = "#f8f2df";
  ctx.fillRect(m, m, pw, ph);
  ctx.restore();

  ctx.save();
  ctx.beginPath();
  ctx.rect(m, m, pw, ph);
  ctx.clip();

  // A few soft stains in the paper.
  for (const [x, y, r, c] of [[430, 360, 380, "rgba(247,200,150,0.18)"], [1650, 1150, 420, "rgba(190,170,225,0.14)"], [900, 1280, 360, "rgba(170,200,150,0.12)"]] as const) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, c);
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(m, m, pw, ph);
  }

  // Ruled lines and the margin.
  ctx.strokeStyle = "rgba(150, 175, 225, 0.75)";
  ctx.lineWidth = 3;
  for (let y = m + 120; y < H - m; y += 64) wobblyLine(ctx, m, y, W - m, y, y);
  ctx.strokeStyle = "rgba(225, 130, 120, 0.85)";
  ctx.lineWidth = 4;
  wobblyLine(ctx, m + 250, m, m + 250, H - m, 7);
  ctx.restore();

  // Soft shadows under the things lying on the page (the light is on the left, so they fall to the right).
  for (const s of shades) if (s.onPage) paintShade(ctx, s, ((s.x + 0.14) / PAGE_W + 0.5) * W, ((s.z - 0.04) / PAGE_D + 0.5) * H, PX_PER_UNIT);

  // Binder holes down the left edge: one for each turn of the coil binding (see props.ts), 0.4 apart.
  for (let k = 0; k < 18; k++) {
    const z = -3.4 + k * 0.4;
    const y = (z / PAGE_D + 0.5) * H;
    ctx.fillStyle = "#e3dac3";
    ctx.beginPath();
    ctx.arc((HOLE_X / PAGE_W + 0.5) * W, y, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 4;
    ctx.stroke();
  }

  // Pencil doodles. Offsets are from the page centre, in pixels (about 186 px per world unit).
  ctx.strokeStyle = PENCIL;
  ctx.lineWidth = 4;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  const cx = W / 2, cy = H / 2;
  leaf(ctx, cx - 640, cy - 330, 1.0, -0.4);
  leaf(ctx, cx + 520, cy + 300, 0.9, 2.6);
  leaf(ctx, cx - 380, cy + 420, 0.7, 0.9);
  star(ctx, cx + 600, cy - 300, 34);
  star(ctx, cx - 560, cy + 150, 24);
  star(ctx, cx + 300, cy + 470, 20);
  spiral(ctx, cx + 740, cy - 40, 60);
  tinyPumpkin(ctx, cx - 740, cy + 330, 0.9);
  tinyPumpkin(ctx, cx + 420, cy - 470, 0.7);
  ctx.beginPath();
  ctx.moveTo(cx + 620, cy + 120);
  ctx.quadraticCurveTo(cx + 660, cy + 80, cx + 700, cy + 120);
  ctx.moveTo(cx + 660, cy + 100);
  ctx.lineTo(cx + 660, cy + 70);
  ctx.stroke();

  // A sticky note, a taped-down polaroid and strips of washi tape.
  const cx2 = W / 2, cy2 = H / 2;
  ctx.save();
  ctx.translate(cx2 + 720, cy2 - 330);
  ctx.rotate(0.12);
  ctx.shadowColor = "rgba(70,50,35,0.3)";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 9;
  ctx.shadowOffsetY = 9;
  ctx.fillStyle = "#fbe58a";
  ctx.fillRect(-115, -115, 230, 230);
  ctx.shadowColor = "transparent";
  ctx.fillStyle = "#e9cf6a";
  ctx.beginPath();
  ctx.moveTo(115, 60);
  ctx.lineTo(60, 115);
  ctx.lineTo(115, 115);
  ctx.fill();
  ctx.strokeStyle = PENCIL;
  ctx.lineWidth = 5;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-80, -60);
  ctx.bezierCurveTo(-50, -90, -30, -30, 0, -60);
  ctx.bezierCurveTo(30, -90, 50, -30, 80, -60);
  ctx.moveTo(-80, -10);
  ctx.lineTo(50, -14);
  ctx.moveTo(-80, 35);
  ctx.lineTo(10, 32);
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.translate(cx2 - 700, cy2 - 330);
  ctx.rotate(-0.15);
  ctx.shadowColor = "rgba(70,50,35,0.3)";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 9;
  ctx.shadowOffsetY = 9;
  ctx.fillStyle = "#fffdf6";
  ctx.fillRect(-135, -150, 270, 310);
  ctx.shadowColor = "transparent";
  ctx.fillStyle = "#f7c99a";
  ctx.fillRect(-112, -128, 224, 224);
  ctx.strokeStyle = PENCIL;
  ctx.lineWidth = 5;
  tinyPumpkin(ctx, 0, -16, 1.2);
  ctx.fillStyle = "rgba(160, 200, 190, 0.8)";
  ctx.fillRect(-70, -176, 140, 46);
  ctx.restore();

  for (const [x, y, rot, c1, c2] of [[W - m - 130, cy2 + 40, 1.45, "#f4a9b8", "#fbd4dc"], [m + 420, m + 70, 0.05, "#a9d4c8", "#d4ece5"]] as const) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.fillStyle = c1;
    ctx.fillRect(-130, -26, 260, 52);
    ctx.fillStyle = c2;
    for (let sx = -130; sx < 130; sx += 36) ctx.fillRect(sx, -26, 14, 52);
    ctx.strokeStyle = "rgba(60, 40, 30, 0.35)";
    ctx.lineWidth = 3;
    ctx.strokeRect(-130, -26, 260, 52);
    ctx.restore();
  }

  // Tape on two corners.
  for (const [x, y, rot] of [[m + 60, m + 40, -0.7], [W - m - 60, H - m - 40, -0.7]] as const) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.fillStyle = "rgba(238, 208, 130, 0.72)";
    ctx.strokeStyle = "rgba(120, 90, 40, 0.4)";
    ctx.lineWidth = 3;
    ctx.fillRect(-120, -34, 240, 68);
    ctx.strokeRect(-120, -34, 240, 68);
    ctx.restore();
  }

  // Inked border, drawn by hand.
  ctx.strokeStyle = INK;
  ctx.lineWidth = 8;
  wobblyLine(ctx, m, m, W - m, m, 1);
  wobblyLine(ctx, W - m, m, W - m, H - m, 2);
  wobblyLine(ctx, W - m, H - m, m, H - m, 3);
  wobblyLine(ctx, m, H - m, m, m, 4);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

export const PAGE_PX_PER_UNIT = PX_PER_UNIT;

/**
 * The page's mesh: a plane with its bottom-right corner curled up off the table. Vertex colours darken the curl a little, since the page is unlit.
 * Local x and y become world x and -z once the mesh is laid flat, and local z becomes up.
 */
export function createPageGeometry(): THREE.PlaneGeometry {
  const geo = new THREE.PlaneGeometry(PAGE_W, PAGE_D, 44, 32);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3).fill(1);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i);
    const d = ((x - 4.4) + (-y - 3.0)) * 0.7; // distance past the fold line, toward the corner
    if (d > 0) {
      pos.setZ(i, d * d * 0.5);
      const shade = 1 - Math.min(0.14, d * 0.1);
      colors.fill(shade, i * 3, i * 3 + 3);
    }
  }
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  return geo;
}

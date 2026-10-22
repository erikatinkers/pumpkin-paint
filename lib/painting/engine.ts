import * as THREE from "three";
import { type Brush, brushRadius, gray, heightProfile, roughnessForSheen } from "./brush";
import { BASE_ROUGHNESS } from "@/lib/sketchMaterial";
import { type Point, interpolateDabs, poleStretch, seamOffsets, textureSizeFor, uvToPixel } from "./strokes";
import { softenStamp } from "./stamp";
import { CanvasMirror } from "./textures";
import { type Rect, type TileLayer, TileHistory } from "./undo";

export interface EngineOptions {
  /** Pixel size of the paint textures. Defaults by pointer type and density (see `textureSizeFor`): 2048x1024, or 1024x512 on a low-density touch screen. */
  width?: number;
  height?: number;
  baseColor: string;
}

function makeCanvas(w: number, h: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  // Layers are read back every frame (undo tiles, texture sync), so keep them CPU-side.
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  return { canvas, ctx };
}

/** Rounds a radius to a step of about 6%, so brushes of slightly different sizes share one height stamp (building a stamp is the costly part of a dab). */
function quantizeRadius(r: number): number {
  const step = Math.max(1, Math.round(r * 0.06));
  return Math.max(1, Math.round(r / step) * step);
}

function canvasLayer(ctx: CanvasRenderingContext2D): TileLayer {
  return {
    read: (x, y, w, h) => ctx.getImageData(x, y, w, h).data,
    write: (x, y, w, h, data) => ctx.putImageData(new ImageData(new Uint8ClampedArray(data), w, h), x, y),
  };
}

/**
 * Owns the paint canvases and the textures built from them. Pointer-speed state lives here (not in React):
 *  - color layer: the base skin with paint dabbed straight on top (a flat dab over the skin is the composite)
 *  - height layer (bumpMap) and roughness layer (roughnessMap)
 * Each layer is mirrored to the GPU through a CanvasMirror that uploads only the changed box.
 */
export class PaintEngine {
  readonly width: number;
  readonly height: number;
  readonly colorTexture: THREE.DataTexture;
  readonly heightTexture: THREE.DataTexture;
  readonly roughnessTexture: THREE.DataTexture;
  readonly history: TileHistory;

  private readonly baseColor: string;
  private readonly colorCtx: CanvasRenderingContext2D;
  private readonly heightCtx: CanvasRenderingContext2D;
  private readonly roughCtx: CanvasRenderingContext2D;
  private lastDab: Point | null = null;
  private readonly mirrors: CanvasMirror[];
  private readonly stamps = new Map<string, HTMLCanvasElement>();
  private stroking = false;
  private dirtyListener: (() => void) | null = null;
  private historyListener: ((canUndo: boolean, canRedo: boolean) => void) | null = null;

  constructor(opts: EngineOptions) {
    const coarse = window.matchMedia?.("(pointer: coarse)").matches ?? false;
    const size = textureSizeFor(coarse, window.devicePixelRatio || 1);
    this.width = opts.width ?? size.width;
    this.height = opts.height ?? size.height;
    this.baseColor = opts.baseColor;

    const color = makeCanvas(this.width, this.height);
    const height = makeCanvas(this.width, this.height);
    const rough = makeCanvas(this.width, this.height);
    this.colorCtx = color.ctx;
    this.heightCtx = height.ctx;
    this.roughCtx = rough.ctx;

    const mirrors = [
      new CanvasMirror(color.ctx, this.width, this.height, true),
      new CanvasMirror(height.ctx, this.width, this.height, false),
      new CanvasMirror(rough.ctx, this.width, this.height, false),
    ];
    this.mirrors = mirrors;
    [this.colorTexture, this.heightTexture, this.roughnessTexture] = mirrors.map((m) => m.texture);

    const touchDevice = coarse; // phones keep a smaller undo budget whatever the texture size
    this.history = new TileHistory(
      [canvasLayer(this.colorCtx), canvasLayer(this.heightCtx), canvasLayer(this.roughCtx)],
      this.width,
      this.height,
      { tileSize: 128, maxStrokes: 60, maxBytes: (touchDevice ? 64 : 160) * 1024 * 1024, onChange: (u, r) => this.historyListener?.(u, r) },
    );
    this.resetLayers();
  }

  /** Subscribe to undo/redo availability. Called once immediately with the current state. */
  setHistoryListener(fn: ((canUndo: boolean, canRedo: boolean) => void) | null): void {
    this.historyListener = fn;
    fn?.(this.history.canUndo, this.history.canRedo);
  }

  /** Called whenever pixels change and a GPU upload is pending, so an on-demand render loop knows to draw a frame. */
  setDirtyListener(fn: (() => void) | null): void {
    this.dirtyListener = fn;
  }

  /** Queue a changed pixel rect for GPU upload and wake the render loop. */
  private markDirty(x: number, y: number, w: number, h: number): void {
    for (const m of this.mirrors) m.mark(x, y, w, h);
    this.dirtyListener?.();
  }

  private resetLayers(): void {
    const { width: W, height: H } = this;
    this.colorCtx.fillStyle = this.baseColor;
    this.colorCtx.fillRect(0, 0, W, H);
    this.heightCtx.globalCompositeOperation = "source-over";
    this.heightCtx.fillStyle = "#000";
    this.heightCtx.fillRect(0, 0, W, H);
    this.roughCtx.fillStyle = gray(BASE_ROUGHNESS);
    this.roughCtx.fillRect(0, 0, W, H);
    this.markDirty(0, 0, W, H);
  }

  beginStroke(): void {
    if (this.stroking) this.endStroke();
    this.stroking = true;
    this.lastDab = null;
    this.history.begin();
  }

  /** Add a stroke sample at a UV coordinate. Dabs are interpolated from the previous sample. */
  strokeTo(u: number, v: number, brush: Brush): void {
    if (!this.stroking) return;
    const p = uvToPixel(u, v, this.width, this.height);
    const r = brushRadius(brush.size, this.width);
    if (!this.lastDab) {
      this.dab(p, brush);
      this.lastDab = p;
      return;
    }
    for (const q of interpolateDabs(this.lastDab, p, Math.max(1, r * (brush.spacing ?? 0.22)), this.width)) {
      this.dab(q, brush);
      this.lastDab = q;
    }
  }

  /** The pointer left the pumpkin mid-stroke: the next sample starts a fresh dab instead of bridging the gap. */
  breakPath(): void {
    this.lastDab = null;
  }

  endStroke(): void {
    if (!this.stroking) return;
    this.stroking = false;
    this.lastDab = null;
    this.history.commit();
  }

  /** Abort the stroke in progress (e.g. a second finger landed) and restore what it touched. */
  cancelStroke(): void {
    if (!this.stroking) return;
    this.stroking = false;
    this.lastDab = null;
    this.repaint(this.history.cancel());
  }

  undo(): void {
    this.repaint(this.history.undo());
  }

  redo(): void {
    this.repaint(this.history.redo());
  }

  /**
   * Begin a stroke that first puts the whole pumpkin back to bare skin; everything drawn until `endStroke` joins it,
   * so a whole generated painting (see `surprise/`) is one undo step that brings back what was there before.
   */
  beginFresh(): void {
    this.beginStroke();
    this.history.touch(0, 0, this.width, this.height);
    this.resetLayers();
  }

  /** Wipe all paint back to a bare pumpkin. Not undoable (the UI asks twice first). */
  clear(): void {
    this.stroking = false;
    this.lastDab = null;
    this.history.clear();
    this.resetLayers();
  }

  private repaint(rects: Rect[] | null): void {
    if (!rects) return;
    for (const r of rects) this.markDirty(r.x, r.y, r.w, r.h);
  }

  private dab(p: Point, brush: Brush): void {
    const { width: W, height: H } = this;
    const r = brushRadius(brush.size, W);
    const k = poleStretch(p.y, H);
    const rx = Math.min(r * k, W / 2);
    const rough = gray(roughnessForSheen(brush.sheen));

    for (const off of seamOffsets(p.x, rx, W)) {
      const cx = p.x + off;
      const bx = cx - rx - 1;
      const by = p.y - r - 1;
      const bw = rx * 2 + 2;
      const bh = r * 2 + 2;
      this.history.touch(bx, by, bw, bh);

      if (brush.erase) {
        // Put the bare skin back: base color, no height, base roughness.
        this.colorCtx.fillStyle = this.baseColor;
        this.disc(this.colorCtx, cx, p.y, rx, r);
        this.roughCtx.fillStyle = gray(BASE_ROUGHNESS);
        this.disc(this.roughCtx, cx, p.y, rx, r);
        this.heightCtx.fillStyle = "#000";
        this.disc(this.heightCtx, cx, p.y, rx, r);
        this.markDirty(bx, by, bw, bh);
        continue;
      }

      // Flat color and roughness: one disc.
      this.colorCtx.fillStyle = brush.color;
      this.disc(this.colorCtx, cx, p.y, rx, r);
      this.roughCtx.fillStyle = rough;
      this.disc(this.roughCtx, cx, p.y, rx, r);

      // Height: concentric strokes rising like the edge of a circle, blitted as one stamp with 'lighten' so overlaps keep the highest point.
      const stamp = this.heightStamp(rx, r, brush.puffiness);
      this.heightCtx.globalCompositeOperation = "lighten";
      // Whole-pixel placement keeps the blit on the canvas's fast path (fractional offsets are ~30x slower).
      this.heightCtx.drawImage(stamp, Math.round(cx - stamp.width / 2), Math.round(p.y - stamp.height / 2));
      this.heightCtx.globalCompositeOperation = "source-over";

      this.markDirty(bx, by, bw, bh);
    }
  }

  /** The 9 concentric height rings for one dab shape, drawn once and reused. Sizes and amplitude are quantized so the cache stays small. */
  private heightStamp(rx: number, ry: number, puffiness: number): HTMLCanvasElement {
    const qx = quantizeRadius(rx);
    const qy = quantizeRadius(ry);
    const amp = Math.round(puffiness * 64) / 64;
    const key = `${qx}|${qy}|${amp}`;
    let stamp = this.stamps.get(key);
    if (!stamp) {
      if (this.stamps.size >= 400) this.stamps.clear();
      stamp = document.createElement("canvas");
      stamp.width = qx * 2 + 2;
      stamp.height = qy * 2 + 2;
      const ctx = stamp.getContext("2d")!;
      for (const ring of heightProfile(amp)) {
        ctx.fillStyle = gray(ring.value);
        this.disc(ctx, stamp.width / 2, stamp.height / 2, qx * ring.radius, qy * ring.radius);
      }
      // Round off the ring steps and the wall: a soft edge reads better to the edge-detecting pen than a cliff.
      const img = ctx.getImageData(0, 0, stamp.width, stamp.height);
      softenStamp(img.data, stamp.width, stamp.height, Math.max(1, Math.round(Math.min(qx, qy) / 9)));
      ctx.putImageData(img, 0, 0);
      this.stamps.set(key, stamp);
    }
    return stamp;
  }

  private disc(ctx: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number): void {
    ctx.beginPath();
    ctx.ellipse(cx, cy, Math.max(0.5, rx), Math.max(0.5, ry), 0, 0, Math.PI * 2);
    ctx.fill();
  }

  /** Send changed pixels to the GPU. Call once per frame; does nothing if nothing was painted. */
  flush(): void {
    for (const m of this.mirrors) m.sync();
  }

  dispose(): void {
    for (const m of this.mirrors) m.dispose();
  }
}

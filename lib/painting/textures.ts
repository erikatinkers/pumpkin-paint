import * as THREE from "three";

/**
 * A GPU texture that mirrors a 2D canvas, uploading only the rows and columns that changed.
 *
 * A CanvasTexture re-uploads the whole canvas on every update (about 25ms for three 2048x1024 layers), far over a 60fps frame.
 * This keeps a DataTexture's byte array in step with the canvas and sends just the dirty box via update ranges.
 * Rows are stored bottom-up (row 0 is v = 0), so no flipY is needed.
 */
export class CanvasMirror {
  readonly texture: THREE.DataTexture;
  private readonly data: Uint8Array;
  private box: { x0: number; y0: number; x1: number; y1: number } | null = null;
  private gpuReady = false;

  constructor(
    private readonly ctx: CanvasRenderingContext2D,
    private readonly width: number,
    private readonly height: number,
    isColor: boolean,
  ) {
    this.data = new Uint8Array(width * height * 4);
    const tex = new THREE.DataTexture(this.data, width, height, THREE.RGBAFormat, THREE.UnsignedByteType);
    tex.colorSpace = isColor ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    tex.wrapS = THREE.RepeatWrapping; // u wraps around the pumpkin
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.generateMipmaps = true;
    tex.anisotropy = 4;
    // Until the first full upload has landed, partial updates would leave the rest of the texture empty.
    tex.onUpdate = () => {
      this.gpuReady = true;
    };
    this.texture = tex;
    this.markAll();
  }

  /** Note that this pixel rect (canvas coordinates) changed. */
  mark(x: number, y: number, w: number, h: number): void {
    const x0 = Math.max(0, Math.floor(x));
    const y0 = Math.max(0, Math.floor(y));
    const x1 = Math.min(this.width, Math.ceil(x + w));
    const y1 = Math.min(this.height, Math.ceil(y + h));
    if (x1 <= x0 || y1 <= y0) return;
    const b = this.box;
    this.box = b
      ? { x0: Math.min(b.x0, x0), y0: Math.min(b.y0, y0), x1: Math.max(b.x1, x1), y1: Math.max(b.y1, y1) }
      : { x0, y0, x1, y1 };
  }

  markAll(): void {
    this.box = { x0: 0, y0: 0, x1: this.width, y1: this.height };
  }

  get pending(): boolean {
    return this.box !== null;
  }

  /** Copy the dirty box from the canvas into the texture's bytes and queue the upload. */
  sync(): void {
    const b = this.box;
    if (!b) return;
    this.box = null;
    const { width: W, height: H, data } = this;
    const bw = b.x1 - b.x0;
    const bh = b.y1 - b.y0;
    const src = this.ctx.getImageData(b.x0, b.y0, bw, bh).data;
    const tex = this.texture;
    const partial = this.gpuReady && !(bw === W && bh === H);
    tex.clearUpdateRanges(); // a full upload (first time, or the whole canvas changed) sends everything
    for (let r = 0; r < bh; r++) {
      const row = H - 1 - (b.y0 + r); // canvas row -> bottom-up texture row
      const dst = (row * W + b.x0) * 4;
      data.set(src.subarray(r * bw * 4, (r + 1) * bw * 4), dst);
      if (partial) tex.addUpdateRange(dst, bw * 4);
    }
    tex.needsUpdate = true;
  }

  dispose(): void {
    this.texture.dispose();
  }
}

/** One paint layer the history can snapshot and restore, in tiles of RGBA bytes. */
export interface TileLayer {
  read(x: number, y: number, w: number, h: number): Uint8ClampedArray;
  write(x: number, y: number, w: number, h: number, data: Uint8ClampedArray): void;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface TileEntry {
  rect: Rect;
  before: Uint8ClampedArray[]; // one per layer
  after: Uint8ClampedArray[] | null; // read lazily the first time the stroke is undone
}

interface StrokeRecord {
  tiles: TileEntry[];
}

function strokeBytes(s: StrokeRecord): number {
  let n = 0;
  for (const t of s.tiles) {
    for (const b of t.before) n += b.byteLength;
    if (t.after) for (const b of t.after) n += b.byteLength;
  }
  return n;
}

export interface HistoryOptions {
  tileSize?: number;
  maxStrokes?: number;
  /** Soft memory cap; the oldest strokes are dropped first (the newest is always kept). */
  maxBytes?: number;
  onChange?: (canUndo: boolean, canRedo: boolean) => void;
}

/**
 * Copy-on-write undo: before a stroke first touches a tile, that tile's pixels are saved for every layer.
 * Ending a stroke copies nothing (so lifting the pointer never hitches); the "after" pixels are captured
 * the moment the stroke is undone, which is when redo first needs them.
 */
export class TileHistory {
  private readonly tileSize: number;
  private readonly maxStrokes: number;
  private readonly maxBytes: number;
  private undoStack: StrokeRecord[] = [];
  private redoStack: StrokeRecord[] = [];
  private pending: Map<number, { rect: Rect; before: Uint8ClampedArray[] }> | null = null;

  constructor(
    private readonly layers: TileLayer[],
    private readonly width: number,
    private readonly height: number,
    private readonly opts: HistoryOptions = {},
  ) {
    this.tileSize = opts.tileSize ?? 128;
    this.maxStrokes = opts.maxStrokes ?? 60;
    this.maxBytes = opts.maxBytes ?? 192 * 1024 * 1024;
  }

  get canUndo(): boolean {
    return this.undoStack.length > 0;
  }
  get canRedo(): boolean {
    return this.redoStack.length > 0;
  }
  get strokeCount(): number {
    return this.undoStack.length;
  }
  get bytes(): number {
    return this.undoStack.reduce((n, s) => n + strokeBytes(s), 0) + this.redoStack.reduce((n, s) => n + strokeBytes(s), 0);
  }

  begin(): void {
    this.pending = new Map();
  }

  /** Call before drawing into this pixel rect. Saves any tile it overlaps that this stroke has not touched yet. */
  touch(x: number, y: number, w: number, h: number): void {
    if (!this.pending) return;
    const ts = this.tileSize;
    const x0 = Math.max(0, Math.floor(x / ts));
    const y0 = Math.max(0, Math.floor(y / ts));
    const x1 = Math.min(Math.ceil(this.width / ts) - 1, Math.floor((x + w) / ts));
    const y1 = Math.min(Math.ceil(this.height / ts) - 1, Math.floor((y + h) / ts));
    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        const key = ty * 65536 + tx;
        if (this.pending.has(key)) continue;
        const rect = this.tileRect(tx, ty);
        this.pending.set(key, { rect, before: this.layers.map((l) => l.read(rect.x, rect.y, rect.w, rect.h)) });
      }
    }
  }

  /** Finish the stroke. Returns false (and records nothing) if it never touched a tile. */
  commit(): boolean {
    const pending = this.pending;
    this.pending = null;
    if (!pending || pending.size === 0) return false;
    const tiles: TileEntry[] = [];
    for (const { rect, before } of pending.values()) tiles.push({ rect, before, after: null });
    this.undoStack.push({ tiles });
    this.redoStack = [];
    this.trim();
    this.notify();
    return true;
  }

  /** Abandon the stroke in progress and restore what it touched. Returns the rects to repaint. */
  cancel(): Rect[] {
    const pending = this.pending;
    this.pending = null;
    if (!pending) return [];
    const rects: Rect[] = [];
    for (const { rect, before } of pending.values()) {
      this.layers.forEach((l, i) => l.write(rect.x, rect.y, rect.w, rect.h, before[i]));
      rects.push(rect);
    }
    return rects;
  }

  undo(): Rect[] | null {
    const stroke = this.undoStack.pop();
    if (!stroke) return null;
    for (const t of stroke.tiles) t.after = this.layers.map((l) => l.read(t.rect.x, t.rect.y, t.rect.w, t.rect.h));
    this.redoStack.push(stroke);
    this.notify();
    return this.apply(stroke, "before");
  }

  redo(): Rect[] | null {
    const stroke = this.redoStack.pop();
    if (!stroke) return null;
    this.undoStack.push(stroke);
    this.notify();
    return this.apply(stroke, "after");
  }

  clear(): void {
    this.pending = null;
    this.undoStack = [];
    this.redoStack = [];
    this.notify();
  }

  private apply(stroke: StrokeRecord, which: "before" | "after"): Rect[] {
    for (const t of stroke.tiles) {
      const data = t[which]!;
      this.layers.forEach((l, i) => l.write(t.rect.x, t.rect.y, t.rect.w, t.rect.h, data[i]));
    }
    return stroke.tiles.map((t) => t.rect);
  }

  private trim(): void {
    let total = this.undoStack.reduce((n, s) => n + strokeBytes(s), 0);
    while (this.undoStack.length > this.maxStrokes || (total > this.maxBytes && this.undoStack.length > 1)) {
      total -= strokeBytes(this.undoStack.shift()!);
    }
  }

  private tileRect(tx: number, ty: number): Rect {
    const x = tx * this.tileSize;
    const y = ty * this.tileSize;
    return { x, y, w: Math.min(this.tileSize, this.width - x), h: Math.min(this.tileSize, this.height - y) };
  }

  private notify(): void {
    this.opts.onChange?.(this.canUndo, this.canRedo);
  }
}

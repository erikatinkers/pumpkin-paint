/** Renders the scene once and hands back its canvas, so the viewfinder can crop a photo from it. */
let current: (() => HTMLCanvasElement) | null = null;

export const captureRegistry = {
  get: (): (() => HTMLCanvasElement) | null => current,
  set: (fn: (() => HTMLCanvasElement) | null): void => {
    current = fn;
  },
};

/** Crops the viewfinder's window out of the canvas and returns it as a PNG data URL. `rect` is in client pixels. */
export function takePhoto(rect: DOMRect): string | null {
  const source = captureRegistry.get()?.();
  if (!source) return null;
  const box = source.getBoundingClientRect();
  const sx = source.width / box.width;
  const sy = source.height / box.height;
  const out = document.createElement("canvas");
  out.width = Math.round(rect.width * sx);
  out.height = Math.round(rect.height * sy);
  const ctx = out.getContext("2d");
  if (!ctx) return null;
  // The canvas is transparent; the paper the pumpkin sits on is the stage behind it.
  ctx.fillStyle = "#f4ecd8";
  ctx.fillRect(0, 0, out.width, out.height);
  ctx.drawImage(source, (rect.left - box.left) * sx, (rect.top - box.top) * sy, out.width, out.height, 0, 0, out.width, out.height);
  return out.toDataURL("image/png");
}

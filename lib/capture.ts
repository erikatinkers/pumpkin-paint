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

/**
 * The PNG data URL as a File, built straight away: a share sheet has to be opened from inside the tap that asked for it, so there is no room to wait
 * for `toBlob`.
 */
export function dataUrlToFile(url: string, name: string): File {
  const comma = url.indexOf(",");
  const type = /^data:([^;,]+)/.exec(url.slice(0, comma))?.[1] ?? "image/png";
  const binary = atob(url.slice(comma + 1));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new File([bytes], name, { type });
}

/** `share`: the phone's share sheet (which can save to Photos). `preview`: show the photo big to press and hold. `download`: a plain file download. */
export type SaveRoute = "share" | "preview" | "download";

/**
 * How a photo gets to the person. A download goes to the Files app on a phone, where people don't look for pictures, so touch devices use the share sheet
 * (its Save Image goes to Photos), or, if the browser cannot share files, a big preview that can be pressed and held. Computers just download.
 */
export function chooseSaveRoute(env: { touch: boolean; canShareFiles: boolean }): SaveRoute {
  if (!env.touch) return "download";
  return env.canShareFiles ? "share" : "preview";
}

/** A phone or tablet (an iPad in desktop mode says it is a Mac, but has a touch screen). */
export function isTouchDevice(): boolean {
  return window.matchMedia("(pointer: coarse)").matches || (navigator.maxTouchPoints > 1 && /Mac/.test(navigator.platform));
}

/** Whether this browser can hand a file to the share sheet. */
export function canShareFile(file: File): boolean {
  return typeof navigator.share === "function" && typeof navigator.canShare === "function" && navigator.canShare({ files: [file] });
}

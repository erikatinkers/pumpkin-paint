export interface DebugOptions {
  /** `?debug`: fixed camera, controls off, 1x pixel ratio, so screenshots are repeatable. */
  enabled: boolean;
  /** `?seed=N`: seeds the procedural clay detail. Null means the default seed. */
  seed: number | null;
  /** `?confirm=MS` (debug only): how long Clear stays armed. Lets slow software-GL tests outlast the usual 3 seconds. */
  confirmMs: number | null;
}

export function parseDebug(search: string): DebugOptions {
  const params = new URLSearchParams(search);
  const whole = (raw: string | null) => (raw !== null && /^\d+$/.test(raw) ? Number(raw) : null);
  const enabled = params.has("debug");
  return { enabled, seed: whole(params.get("seed")), confirmMs: enabled ? whole(params.get("confirm")) : null };
}

/** Camera used in debug mode, in spherical coordinates around the origin. Matches the default view. */
export const FIXED_CAMERA = { azimuth: 0.0867, polar: 1.2535, distance: 5.2 };

let settled = false;

/** The scene calls this once its first frames (environment map, textures) have been rendered. */
export function markSettled(): void {
  settled = true;
}

export function isSettled(): boolean {
  return settled;
}

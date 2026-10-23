export interface DebugOptions {
  /** `?debug`: fixed camera, controls off, 1x pixel ratio, so screenshots are repeatable. */
  enabled: boolean;
  /** `?seed=N`: seeds the procedural pigment detail. Null means the default seed. */
  seed: number | null;
  /** `?confirm=MS` (debug only): how long Clear stays armed. Lets slow software-GL tests outlast the usual 3 seconds. */
  confirmMs: number | null;
  /** `?persist` (debug only): keep saving and restoring the painting, which debug mode otherwise leaves off so every run starts bare. */
  persist: boolean;
}

export function parseDebug(search: string): DebugOptions {
  const params = new URLSearchParams(search);
  const whole = (raw: string | null) => (raw !== null && /^\d+$/.test(raw) ? Number(raw) : null);
  const enabled = params.has("debug");
  return { enabled, seed: whole(params.get("seed")), confirmMs: enabled ? whole(params.get("confirm")) : null, persist: enabled && params.has("persist") };
}

/**
 * Camera used in debug mode, in spherical coordinates around the origin. Matches the default view: the distance is where `CameraFit` puts the camera
 * for a 1280x800 window (the size the e2e screenshots use), so the baselines frame the pumpkin the way a visitor sees it.
 */
export const FIXED_CAMERA = { azimuth: 0.0867, polar: 1.2535, distance: 19 };

let settled = false;

/** The scene calls this once its first frames (environment map, textures) have been rendered. */
export function markSettled(): void {
  settled = true;
}

export function isSettled(): boolean {
  return settled;
}

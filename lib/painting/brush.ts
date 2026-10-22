export interface Brush {
  color: string;
  /** Dab radius in pixels of a 2048-wide paint texture. */
  size: number;
  /** 0..1 height amplitude. */
  puffiness: number;
  /** 0..1, matte to satin. */
  sheen: number;
}

export const HEIGHT_RINGS = 9;
export const ROUGHNESS_MATTE = 0.95;
export const ROUGHNESS_SATIN = 0.62;
const REFERENCE_WIDTH = 2048;

export function roughnessForSheen(sheen: number): number {
  const s = Math.min(1, Math.max(0, sheen));
  return ROUGHNESS_MATTE + (ROUGHNESS_SATIN - ROUGHNESS_MATTE) * s;
}

/** Brush radius in pixels of the actual texture, so a dab covers the same surface area on 1024- and 2048-wide textures. */
export function brushRadius(size: number, textureWidth: number): number {
  return (size * textureWidth) / REFERENCE_WIDTH;
}

export interface HeightRing {
  /** Fraction of the dab radius, 1 (outermost) down to the innermost ring. */
  radius: number;
  /** Height written for this ring, 0..amplitude. */
  value: number;
}

/**
 * Height profile of one round clay "tube": concentric filled circles from outside in, each taller than the last,
 * following the rising edge of a circle: h(d) = sqrt(1 - d^2). Drawn with a 'lighten' blend so overlapping dabs keep the highest point.
 */
export function heightProfile(amplitude: number, rings: number = HEIGHT_RINGS): HeightRing[] {
  const out: HeightRing[] = [];
  for (let i = 0; i < rings; i++) {
    const outer = (rings - i) / rings;
    const inner = (rings - i - 1) / rings;
    const mid = (outer + inner) / 2;
    out.push({ radius: outer, value: amplitude * Math.sqrt(1 - mid * mid) });
  }
  return out;
}

/** CSS gray for a 0..1 value (used for height and roughness layers). */
export function gray(v: number): string {
  const b = Math.round(Math.min(1, Math.max(0, v)) * 255);
  return `rgb(${b},${b},${b})`;
}

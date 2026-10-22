"use client";

import { useEffect } from "react";

/**
 * The wobble filters (see `app/layout.tsx`) shift borders by whole pixels, which stair-steps them on a 1x screen; a touch of blur hides that.
 * On a high-density screen the steps are too small to see and the same blur would just soften the lines, so it only applies below 1.5x.
 * Follows the window between monitors of different density.
 */
export default function WobbleTuner() {
  useEffect(() => {
    const apply = () => {
      const blur = window.devicePixelRatio < 1.5;
      for (const [id, amount] of [["wobble-blur", 0.55], ["wobble-sm-blur", 0.5]] as const) {
        document.getElementById(id)?.setAttribute("stdDeviation", String(blur ? amount : 0));
      }
    };
    apply();
    let query = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
    const onChange = () => {
      apply();
      query.removeEventListener("change", onChange);
      query = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
      query.addEventListener("change", onChange);
    };
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);
  return null;
}

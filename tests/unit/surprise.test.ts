import { describe, expect, it } from "vitest";
import { RECIPES, nextRecipe, slug } from "@/lib/painting/surprise";

// A small deterministic generator, so a failure replays.
const seeded = (seed: number) => () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};

describe("surprise designs", () => {
  it("shows every design once before any repeats, and never the same one twice in a row", () => {
    const rng = seeded(7);
    const rounds = 6;
    const picks = Array.from({ length: RECIPES.length * rounds }, () => nextRecipe(rng)!);
    for (let r = 0; r < rounds; r++) {
      const round = picks.slice(r * RECIPES.length, (r + 1) * RECIPES.length);
      expect(new Set(round).size).toBe(RECIPES.length);
    }
    for (let i = 1; i < picks.length; i++) expect(picks[i]).not.toBe(picks[i - 1]);
  });

  it("gives every design a distinct link name", () => {
    const slugs = RECIPES.map((r) => slug(r.name));
    expect(new Set(slugs).size).toBe(RECIPES.length);
    expect(slugs).toContain("pumpkin-daisies");
  });
});

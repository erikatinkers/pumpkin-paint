import { describe, expect, it } from "vitest";
import { parseDebug } from "@/lib/debug";

describe("debug query", () => {
  it("is off by default", () => {
    expect(parseDebug("")).toEqual({ enabled: false, seed: null, confirmMs: null });
  });
  it("reads ?debug&seed=1", () => {
    expect(parseDebug("?debug&seed=1")).toEqual({ enabled: true, seed: 1, confirmMs: null });
  });
  it("ignores a seed that is not a whole number", () => {
    expect(parseDebug("?debug&seed=abc").seed).toBeNull();
    expect(parseDebug("?debug&seed=-3").seed).toBeNull();
  });
  it("reads ?confirm only in debug mode", () => {
    expect(parseDebug("?debug&confirm=800").confirmMs).toBe(800);
    expect(parseDebug("?confirm=800").confirmMs).toBeNull();
  });
});

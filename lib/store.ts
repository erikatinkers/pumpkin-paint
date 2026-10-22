import { create } from "zustand";

export const PAINTS = [
  { name: "Coral", hex: "#ee5f55" },
  { name: "Peach", hex: "#f7963f" },
  { name: "Butter", hex: "#f8cf3a" },
  { name: "Sage", hex: "#58a944" },
  { name: "Mint", hex: "#3fc6a0" },
  { name: "Baby blue", hex: "#4aaee8" },
  { name: "Periwinkle", hex: "#6577e2" },
  { name: "Lavender", hex: "#a577e3" },
  { name: "Rosy", hex: "#ec5f9e" },
  { name: "Cream", hex: "#fbecc8" },
  { name: "Cocoa", hex: "#8c5230" },
  { name: "Plum", hex: "#7b3f97" },
] as const;

export type Tool = "paint" | "turn";

interface BrushState {
  color: string;
  colorName: string;
  size: number; // dab radius in px of a 2048-wide paint texture
  puffiness: number; // 0..1 → height amplitude
  sheen: number; // 0..1 → matte (roughness 0.95) to satin (0.62)
  tool: Tool;
  canUndo: boolean;
  canRedo: boolean;
  setColor: (hex: string, name: string) => void;
  setSize: (v: number) => void;
  setPuffiness: (v: number) => void;
  setSheen: (v: number) => void;
  setTool: (t: Tool) => void;
  setHistory: (canUndo: boolean, canRedo: boolean) => void;
}

export const useBrush = create<BrushState>((set) => ({
  color: PAINTS[0].hex,
  colorName: PAINTS[0].name,
  size: 26,
  puffiness: 0.7,
  sheen: 0.1,
  tool: "paint",
  canUndo: false,
  canRedo: false,
  setColor: (color, colorName) => set({ color, colorName }),
  setSize: (size) => set({ size }),
  setPuffiness: (puffiness) => set({ puffiness }),
  setSheen: (sheen) => set({ sheen }),
  setTool: (tool) => set({ tool }),
  setHistory: (canUndo, canRedo) => set({ canUndo, canRedo }),
}));

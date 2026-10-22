import { create } from "zustand";

export const PAINTS = [
  { name: "Coral", hex: "#f08f84" },
  { name: "Peach", hex: "#f6b48f" },
  { name: "Butter", hex: "#f6e19a" },
  { name: "Sage", hex: "#a8cf9b" },
  { name: "Mint", hex: "#a6e0cc" },
  { name: "Baby blue", hex: "#a9d3ee" },
  { name: "Periwinkle", hex: "#9fa9e8" },
  { name: "Lavender", hex: "#c3a9e6" },
  { name: "Rosy", hex: "#f2a6c4" },
  { name: "Cream", hex: "#fbf1de" },
  { name: "Cocoa", hex: "#a07a68" },
  { name: "Plum", hex: "#8c6a9c" },
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

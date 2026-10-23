import { create } from "zustand";

export const PAINTS = [
  { name: "Coral", hex: "#ee5f55" },
  { name: "Peach", hex: "#f7963f" },
  { name: "Butter", hex: "#f8cf3a" },
  { name: "Sage", hex: "#58a944" },
  { name: "Baby blue", hex: "#4aaee8" },
  { name: "Periwinkle", hex: "#6577e2" },
  { name: "Rosy", hex: "#ec5f9e" },
  { name: "Cream", hex: "#fbecc8" },
  { name: "Cocoa", hex: "#8c5230" },
  { name: "Plum", hex: "#7b3f97" },
  { name: "Black", hex: "#26201f" },
  { name: "Stone", hex: "#9d958c" },
] as const;

export type Tool = "paint" | "pick" | "erase" | "turn";

interface BrushState {
  color: string;
  colorName: string;
  size: number; // dab radius in px of a 2048-wide paint texture
  puffiness: number; // 0..1 → height amplitude; fixed, since the pen outline around strokes reads from it
  sheen: number; // 0..1 → matte (roughness 0.95) to satin (0.62)
  tool: Tool;
  giftOpens: number; // counts openings of the gift box, so the box can play its animation
  paletteOpen: boolean; // the color window; Paint needs it, so closing it also drops the Paint tool
  camera: boolean; // viewfinder open: the windows hide and the pointer only turns the pumpkin
  canUndo: boolean;
  canRedo: boolean;
  setColor: (hex: string, name: string) => void;
  setSize: (v: number) => void;
  setSheen: (v: number) => void;
  setTool: (t: Tool) => void;
  setCamera: (on: boolean) => void;
  closePalette: () => void;
  setHistory: (canUndo: boolean, canRedo: boolean) => void;
}

let toolBeforeCamera: Tool = "paint";

export const useBrush = create<BrushState>((set) => ({
  color: PAINTS[0].hex,
  colorName: PAINTS[0].name,
  size: 26,
  puffiness: 0.7,
  sheen: 0.1,
  tool: "paint",
  giftOpens: 0,
  paletteOpen: true,
  camera: false,
  canUndo: false,
  canRedo: false,
  setColor: (color, colorName) => set({ color, colorName }),
  setSize: (size) => set({ size }),
  setSheen: (sheen) => set({ sheen }),
  setTool: (tool) => set(tool === "paint" ? { tool, paletteOpen: true } : { tool }),
  closePalette: () => set((s) => ({ paletteOpen: false, tool: s.tool === "paint" ? "turn" : s.tool })),
  // Opening the camera switches to Turn so a drag frames the shot; closing puts the tool back.
  setCamera: (on) =>
    set((s) => {
      if (on === s.camera) return s;
      if (on) {
        toolBeforeCamera = s.tool;
        return { camera: true, tool: "turn" };
      }
      return { camera: false, tool: toolBeforeCamera };
    }),
  setHistory: (canUndo, canRedo) => set({ canUndo, canRedo }),
}));

import { paintRegistry } from "@/lib/painting/registry";
import { startSurprise } from "@/lib/painting/surprise";
import { sound } from "@/lib/sound";
import { useBrush } from "@/lib/store";

/** Opens the present: the pumpkin paints itself something new, and the box (which watches `giftOpens`) pops its lid. */
export function openGift(): void {
  const engine = paintRegistry.get();
  if (!engine) return;
  sound.magic();
  startSurprise(engine);
  useBrush.setState((s) => ({ giftOpens: s.giftOpens + 1 }));
}

import { expect, test } from "@playwright/test";
import { button, canvas, expectNoErrors, openStudio, shot } from "./helpers";

test("high-density touch devices get the full-size textures and the same draw-call budget", async ({ page }) => {
  const errors = await openStudio(page);
  const stats = await page.evaluate(() => window.__pumpkin!.stats());
  expect(stats.textureWidth).toBe(2048);
  expect(stats.textureHeight).toBe(1024);
  expect(stats.drawCalls).toBe(6);
  await expectNoErrors(errors);
});

test("a tap on the pumpkin paints a dab", async ({ page }) => {
  await openStudio(page);
  const box = (await canvas(page).boundingBox())!;
  const before = await shot(page);
  await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
  expect((await shot(page)).equals(before)).toBe(false);
  await expect(button(page, "Undo")).toBeEnabled();
});

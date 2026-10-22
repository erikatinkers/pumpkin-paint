import { expect, test } from "@playwright/test";
import { HIDE_UI_CSS, WAVE, button, canvas, devBadge, expectNoErrors, nextFrames, openStudio, quickShot, shot } from "./helpers";

test("renders the seeded pumpkin within the draw-call budget", async ({ page }) => {
  const errors = await openStudio(page);
  const stats = await page.evaluate(() => window.__pumpkin!.stats());
  expect(stats.drawCalls).toBe(4); // pumpkin + stem + shadow plane, plus the leaf
  expect(stats.textureWidth).toBe(2048);
  expect(stats.textureHeight).toBe(1024);
  await expect(canvas(page)).toHaveScreenshot("seeded.png", { mask: [devBadge(page)], stylePath: HIDE_UI_CSS });
  await expectNoErrors(errors);
});

test("paints a stroke through the dev hook; undo and redo restore exact pixels", async ({ page }) => {
  const errors = await openStudio(page);
  const before = await shot(page);

  await page.evaluate((pts) => window.__pumpkin!.paintStroke(pts), WAVE);
  const painted = await shot(page);
  expect(painted.equals(before)).toBe(false);
  await expect(canvas(page)).toHaveScreenshot("stroke.png", { mask: [devBadge(page)], stylePath: HIDE_UI_CSS });

  await button(page, "Undo").click();
  expect((await shot(page)).equals(before)).toBe(true);

  await button(page, "Redo").click();
  expect((await shot(page)).equals(painted)).toBe(true);
  await expectNoErrors(errors);
});

test("a mouse drag on the pumpkin paints; a drag on the backdrop does not", async ({ page }) => {
  await openStudio(page);
  const box = (await canvas(page).boundingBox())!;
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  const before = await shot(page);

  await page.mouse.move(box.x + 20, box.y + 20);
  await page.mouse.down();
  await page.mouse.move(box.x + 260, box.y + 30, { steps: 8 });
  await page.mouse.up();
  expect((await shot(page)).equals(before)).toBe(true);
  await expect(button(page, "Undo")).toBeDisabled();

  await page.mouse.move(cx - 80, cy + 30);
  await page.mouse.down();
  await page.mouse.move(cx + 80, cy + 50, { steps: 12 });
  await page.mouse.up();
  expect((await shot(page)).equals(before)).toBe(false);
  await expect(button(page, "Undo")).toBeEnabled();
});

test("the Turn tool never paints", async ({ page }) => {
  await openStudio(page);
  await button(page, "Turn").click();
  const box = (await canvas(page).boundingBox())!;
  const before = await shot(page);
  await page.mouse.move(box.x + box.width / 2 - 60, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 60, box.y + box.height / 2 + 20, { steps: 8 });
  await page.mouse.up();
  expect((await shot(page)).equals(before)).toBe(true);
  await expect(button(page, "Undo")).toBeDisabled();
});

test("Clear takes two presses and wipes the paint", async ({ page }) => {
  await openStudio(page, "&confirm=60000"); // software GL is slow; keep the confirm armed while we take screenshots
  const seeded = await quickShot(page);

  await button(page, "Clear").click();
  await expect(button(page, "Really?")).toBeVisible();
  expect((await quickShot(page)).equals(seeded)).toBe(true); // first press only arms it

  await button(page, "Really?").click();
  await expect(button(page, "Clear")).toBeVisible();
  expect((await quickShot(page)).equals(seeded)).toBe(false);
  await expect(button(page, "Undo")).toBeDisabled();
});

test("the confirm on Clear times out without wiping", async ({ page }) => {
  await openStudio(page, "&confirm=700");
  const seeded = await shot(page);
  await button(page, "Clear").click();
  await expect(button(page, "Clear")).toBeVisible({ timeout: 6000 }); // reverts when the confirm window ends
  await nextFrames(page);
  expect((await shot(page)).equals(seeded)).toBe(true);
});

test("brush controls change what gets painted", async ({ page }) => {
  await openStudio(page);
  await page.evaluate((pts) => window.__pumpkin!.paintStroke(pts), WAVE);
  const coral = await shot(page);
  await button(page, "Undo").click();

  await page.getByRole("radio", { name: "Periwinkle" }).click();
  await page.getByLabel(/^Puffiness/).fill("100");
  await page.evaluate((pts) => window.__pumpkin!.paintStroke(pts), WAVE);
  expect((await shot(page)).equals(coral)).toBe(false);
});

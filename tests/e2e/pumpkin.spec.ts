import { expect, test } from "@playwright/test";
import { HIDE_UI_CSS, WAVE, button, canvas, devBadge, expectNoErrors, nextFrames, openStudio, quickShot, shot } from "./helpers";

test("renders the bare pumpkin within the draw-call budget", async ({ page }) => {
  const errors = await openStudio(page);
  const stats = await page.evaluate(() => window.__pumpkin!.stats());
  expect(stats.drawCalls).toBe(8); // pumpkin + stem + shadow plane, plus the top page, the ground shadows, the notebook body with its loose things, and the gift box's body and lid (the phone view crops the box out, so mobile.spec counts 6)
  expect(stats.textureWidth).toBe(2048);
  expect(stats.textureHeight).toBe(1024);
  await expect(canvas(page)).toHaveScreenshot("bare.png", { mask: [devBadge(page)], stylePath: HIDE_UI_CSS });
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

test("the painting is saved as you go and comes back after a reload", async ({ page }) => {
  await openStudio(page, "&persist"); // debug mode leaves saving off unless asked
  const bare = await shot(page);
  await page.evaluate((pts) => window.__pumpkin!.paintStroke(pts), WAVE);
  const painted = await shot(page);
  expect(painted.equals(bare)).toBe(false);

  // Saving waits a moment after the last edit; look in the browser's storage until the record is there.
  await expect
    .poll(
      () =>
        page.evaluate(
          () =>
            new Promise<boolean>((resolve) => {
              const open = indexedDB.open("pumpkin-paint", 1);
              open.onerror = () => resolve(false);
              open.onsuccess = () => {
                try {
                  const get = open.result.transaction("paint").objectStore("paint").get("current");
                  get.onsuccess = () => {
                    open.result.close();
                    resolve(Boolean(get.result));
                  };
                  get.onerror = () => resolve(false);
                } catch {
                  resolve(false);
                }
              };
            }),
        ),
      { timeout: 20_000, intervals: [250] },
    )
    .toBe(true);

  await page.reload();
  await page.waitForFunction(() => window.__pumpkin?.settled());
  await expect.poll(async () => (await shot(page)).equals(painted), { timeout: 20_000 }).toBe(true);
  await expect(button(page, "Undo")).toBeDisabled(); // the strokes come back as pixels, not as undo steps
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

test("the Erase tool takes paint off, and undo puts it back", async ({ page }) => {
  await openStudio(page);
  const box = (await canvas(page).boundingBox())!;
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  const bare = await shot(page);

  await page.evaluate((pts) => window.__pumpkin!.paintStroke(pts), WAVE);
  const painted = await shot(page);
  expect(painted.equals(bare)).toBe(false);

  await button(page, "Erase").click();
  await page.mouse.move(cx - 200, cy);
  await page.mouse.down();
  await page.mouse.move(cx + 200, cy, { steps: 30 });
  await page.mouse.up();
  const erased = await shot(page);
  expect(erased.equals(painted)).toBe(false);

  await button(page, "Undo").click();
  expect((await shot(page)).equals(painted)).toBe(true);
});

test("the Pick tool takes up the color under the pointer, then hands back to Paint", async ({ page }) => {
  await openStudio(page);
  const box = (await canvas(page).boundingBox())!;
  await expect(page.locator(".panel p")).toContainText("Coral");

  await button(page, "Pick").click();
  await expect(button(page, "Pick")).toHaveAttribute("aria-pressed", "true");
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2); // bare skin: not one of the twelve watercolors
  await expect(page.locator(".panel p")).toContainText("Picked");
  await expect(button(page, "Paint")).toHaveAttribute("aria-pressed", "true");
  await expect(button(page, "Undo")).toBeDisabled(); // picking never changes the painting
});

test("with no paint tool (the color window closed), a drag on the pumpkin turns it and never paints", async ({ page }) => {
  await openStudio(page);
  await page.getByRole("button", { name: "Close Paint palette" }).click();
  await expect(button(page, "Paint")).toHaveAttribute("aria-pressed", "false");
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
  await page.evaluate((pts) => window.__pumpkin!.paintStroke(pts), WAVE);
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
  await page.evaluate((pts) => window.__pumpkin!.paintStroke(pts), WAVE);
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
  await page.getByLabel(/^Size/).fill("60");
  await page.evaluate((pts) => window.__pumpkin!.paintStroke(pts), WAVE);
  expect((await shot(page)).equals(coral)).toBe(false);
});

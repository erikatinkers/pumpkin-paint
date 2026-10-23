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

/** The camera needs the Capture key, then the round shutter. */
async function openCameraAndShoot(page: import("@playwright/test").Page): Promise<void> {
  await button(page, "Capture").click();
  await page.locator(".shutter").click();
}

test("on a phone that can share files, Capture hands the photo to the share sheet (not a download)", async ({ page }) => {
  // A headless browser has no share sheet, so stand one in and record what it is given.
  await page.addInitScript(() => {
    const nav = navigator as unknown as { canShare: () => boolean; share: (data: ShareData) => Promise<void> };
    nav.canShare = () => true;
    nav.share = async (data) => {
      (window as unknown as { __shared: unknown }).__shared = (data.files ?? []).map((f) => ({ name: f.name, type: f.type, size: f.size }));
    };
  });
  let downloaded = false;
  page.on("download", () => (downloaded = true));
  await openStudio(page);
  await openCameraAndShoot(page);
  await page.waitForFunction(() => (window as unknown as { __shared?: unknown }).__shared !== undefined);
  const shared = await page.evaluate(() => (window as unknown as { __shared: { name: string; type: string; size: number }[] }).__shared);
  expect(shared).toHaveLength(1);
  expect(shared[0].name).toBe("my-pumpkin.png");
  expect(shared[0].type).toBe("image/png");
  expect(shared[0].size).toBeGreaterThan(1000);
  expect(downloaded).toBe(false);
});

test("on a phone that cannot share files, Capture shows the photo to press and hold", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "share", { value: undefined, configurable: true });
    Object.defineProperty(navigator, "canShare", { value: undefined, configurable: true });
  });
  await openStudio(page);
  await openCameraAndShoot(page);
  const sheet = page.getByRole("dialog", { name: "Save your photo" });
  await expect(sheet).toBeVisible();
  await expect(sheet).toContainText("Press and hold");
  await sheet.getByRole("button", { name: "Done" }).click();
  await expect(sheet).toBeHidden();
});

import { expect, type Page } from "@playwright/test";

/** Open the page in debug mode (fixed camera, seeded detail) and wait for the first frames. Returns the console errors seen. */
export async function openStudio(page: Page): Promise<string[]> {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  await page.goto("/?debug&seed=1");
  await page.waitForFunction(() => window.__pumpkin?.settled());
  await nextFrames(page);
  return errors;
}

/** Let the on-demand render loop draw whatever changed. */
export async function nextFrames(page: Page, n = 4): Promise<void> {
  await page.evaluate(
    (count) =>
      new Promise<void>((resolve) => {
        const step = (left: number) => (left === 0 ? resolve() : requestAnimationFrame(() => step(left - 1)));
        step(count);
      }),
    n,
  );
}

export const canvas = (page: Page) => page.locator("canvas");

export async function shot(page: Page): Promise<Buffer> {
  await nextFrames(page);
  return canvas(page).screenshot();
}

/** Next's dev-mode indicator floats over the canvas; mask it out of baselines. */
export const devBadge = (page: Page) => page.locator("nextjs-portal");

export const button = (page: Page, name: string) => page.getByRole("button", { name, exact: true });

/** A wavy stroke across the lower front of the pumpkin, in UV space. */
export const WAVE: [number, number][] = Array.from({ length: 50 }, (_, i) => [0.12 + (i / 49) * 0.3, 0.3 + 0.05 * Math.sin(i / 4)]);

export async function expectNoErrors(errors: string[]): Promise<void> {
  expect(errors, errors.join("\n")).toEqual([]);
}

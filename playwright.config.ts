import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.PORT ?? 3000);

// Software WebGL (SwiftShader) so the 3D scene renders in headless Chromium with no GPU.
const softwareGl = ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"];

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  expect: { toHaveScreenshot: { maxDiffPixelRatio: 0.03 } },
  // One baseline per project, not per OS: software GL renders the same pixels everywhere, and we only capture the canvas (no fonts).
  snapshotPathTemplate: "{testDir}/__screenshots__/{projectName}/{arg}{ext}",
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    launchOptions: { args: softwareGl },
  },
  projects: [
    { name: "desktop", testIgnore: /mobile/, use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } } },
    { name: "phone", testMatch: /mobile/, use: { ...devices["Pixel 7"] } },
  ],
  // `window.__pumpkin` only exists in dev, so the e2e suite runs against `next dev`. Reuses a server that is already running.
  webServer: {
    command: `npx next dev -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});

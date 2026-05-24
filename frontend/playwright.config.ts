/**
 * Playwright config for ELOT AI demo recording.
 *
 * Single project, headed Chromium, locked to a 1280×720 viewport (good for
 * GIF). Video recording is forced on every run.
 *
 * IMPORTANT: outputDir is a *sibling* of artifacts/demo (not artifacts/demo
 * itself). Playwright wipes outputDir at the start of every run, so pointing
 * it at artifacts/demo would delete the committed elot-demo.webm/.gif files
 * every time anyone ran a test. The demo spec copies the final video into
 * artifacts/demo/elot-demo.webm via page.video().saveAs() after the run.
 */
import { defineConfig, devices } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";

// `__dirname` isn't defined in ESM; derive it from import.meta.url so this
// config works under `"type": "module"`.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEST_RESULTS_DIR = path.resolve(__dirname, "../artifacts/test-results");

export default defineConfig({
  testDir: "./tests/demo",
  outputDir: TEST_RESULTS_DIR,
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: [["list"]],
  timeout: 240_000, // demo can run >2 minutes — give it room
  use: {
    baseURL: process.env.ELOT_BASE_URL ?? "http://localhost:5173",
    headless: true,
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1,
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    video: {
      mode: "on",
      size: { width: 1280, height: 720 },
    },
    trace: "off",
    screenshot: "off",
  },
  projects: [
    {
      name: "demo",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 720 } },
    },
  ],
});

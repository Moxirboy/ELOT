/**
 * Playwright config for ELOT AI demo recording.
 *
 * Single project, headed Chromium, locked to a 1280×720 viewport (good for
 * GIF). Video recording is forced on every run, so a single test produces
 * exactly one .webm in artifacts/demo/.
 */
import { defineConfig, devices } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";

// `__dirname` isn't defined in ESM; derive it from import.meta.url so this
// config works under `"type": "module"`.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.resolve(__dirname, "../artifacts/demo");

export default defineConfig({
  testDir: "./tests/demo",
  outputDir: OUTPUT_DIR,
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

/**
 * ELOT AI — end-to-end demo recording.
 *
 * Walks all seven scenes of the marketing demo:
 *   1. Login page (real UI flow)
 *   2. HR Onboarding-OS dashboard
 *   3. Instance detail + AI risk re-run
 *   4. Learner timeline + AI mentor ask
 *   5. Buddy dashboard
 *   6. IT dashboard
 *   7. Closing logo frame
 *
 * The spec records video at 1280×720 (configured in playwright.config.ts) and
 * copies the final .webm into ../artifacts/demo/elot-demo.webm so the GIF
 * script downstream has a stable path to pick up.
 *
 * Safety: only read or idempotent actions. We re-run the AI risk analysis
 * (writes a new OnbAIRecommendation row, fine to re-run) and ask one mentor
 * question (read-only). We never mark a task complete or mutate seed state.
 */
import { test, expect, type APIRequestContext, type Page } from "@playwright/test";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

// ---------------------------------------------------------------------------
// Config — environment-overridable so the same spec runs against staging/prod
// demo envs if we ever stand them up.
// ---------------------------------------------------------------------------
const FRONTEND_URL = process.env.ELOT_BASE_URL ?? "http://localhost:5173";
const API_URL = process.env.ELOT_API_URL ?? "http://localhost:8000/api/v1";
// ESM-safe __dirname (this project has "type": "module").
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.resolve(__dirname, "../../../artifacts/demo");
const VIDEO_PATH = path.join(OUTPUT_DIR, "elot-demo.webm");

// Pause helpers — different beats for different storytelling moments. The
// camera should breathe; AI work should look like AI work.
const BEAT = {
  micro: 600,   // small cursor pause
  short: 1200,  // page settled, reader catches up
  read: 2000,   // give the viewer time to read a heading/stat
  ai: 2800,     // simulated AI think — feels deliberate, not slow
  scene: 1800,  // scene transition
} as const;

// ---------------------------------------------------------------------------
// Auth helpers — bypass the UI for scenes 2-7 by writing the JWT directly to
// localStorage. Scene 1 still goes through the real Login page so the
// recording opens with a recognisable UI moment.
// ---------------------------------------------------------------------------
type StoredUser = {
  id: number;
  email: string;
  full_name: string;
  role: string;
  company_id: number;
  employee_id?: number | null;
};

type TokenPayload = { access_token: string; user: StoredUser };

async function fetchToken(
  req: APIRequestContext,
  body: { url: string; data?: unknown },
): Promise<TokenPayload> {
  const resp = await req.post(body.url, {
    data: body.data,
    headers: { "content-type": "application/json" },
  });
  if (!resp.ok()) {
    throw new Error(
      `Auth call failed: ${body.url} -> ${resp.status()} ${await resp.text()}`,
    );
  }
  return (await resp.json()) as TokenPayload;
}

async function setAuth(page: Page, payload: TokenPayload) {
  await page.evaluate(
    ({ token, user }) => {
      localStorage.setItem("elot_token", token);
      localStorage.setItem("elot_user", JSON.stringify(user));
    },
    { token: payload.access_token, user: payload.user },
  );
}

type OSRole = "manager" | "supervisor" | "buddy" | "it";

async function pickRoleEmployeeId(
  req: APIRequestContext,
  role: OSRole,
): Promise<number> {
  const resp = await req.get(`${API_URL}/auth/role-options`);
  if (!resp.ok()) {
    throw new Error(
      `Could not fetch role-options: ${resp.status()} ${await resp.text()}`,
    );
  }
  const data = (await resp.json()) as Record<string, { employee_id: number }[]>;
  const bucket =
    role === "manager"
      ? data.managers
      : role === "supervisor"
        ? data.supervisors
        : role === "buddy"
          ? data.buddies
          : data.it_owners;
  if (!bucket || bucket.length === 0) {
    throw new Error(`No seeded employees for role=${role}`);
  }
  return bucket[0].employee_id;
}

async function loginAs(
  page: Page,
  req: APIRequestContext,
  role: "admin" | "learner" | OSRole,
): Promise<TokenPayload> {
  let payload: TokenPayload;
  if (role === "admin") {
    payload = await fetchToken(req, { url: `${API_URL}/auth/demo-admin` });
  } else if (role === "learner") {
    payload = await fetchToken(req, { url: `${API_URL}/auth/demo-learner` });
  } else {
    const employee_id = await pickRoleEmployeeId(req, role);
    payload = await fetchToken(req, {
      url: `${API_URL}/auth/demo-role`,
      data: { role, employee_id },
    });
  }

  // We must already be on a page from FRONTEND_URL before localStorage writes
  // are scoped to the right origin. Caller does the navigation.
  await setAuth(page, payload);
  return payload;
}

// ---------------------------------------------------------------------------
// The recording test. Single test, single video, no parallelism.
// ---------------------------------------------------------------------------
test.describe.configure({ mode: "serial" });

test("ELOT AI — full product demo", async ({ page, request }, testInfo) => {
  testInfo.setTimeout(240_000);

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  // ─────────────────────────────────────────────────────────────────────────
  // Scene 1 — Login (real UI flow)
  // ─────────────────────────────────────────────────────────────────────────
  await page.goto(`${FRONTEND_URL}/login`, { waitUntil: "networkidle" });
  await expect(
    page.getByRole("heading", { name: /Start the ELOT AI demo/i }),
  ).toBeVisible();
  await page.waitForTimeout(BEAT.read);

  // Hover the role tiles to draw the eye, then click admin/HR.
  const hrButton = page.getByRole("button", { name: /Continue as Admin/i });
  await hrButton.hover();
  await page.waitForTimeout(BEAT.micro);
  await hrButton.click();

  await page.waitForURL(/\/admin\/onboarding-os(?:\/|$)/, { timeout: 15_000 });
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(BEAT.scene);

  // ─────────────────────────────────────────────────────────────────────────
  // Scene 2 — HR Onboarding-OS dashboard
  // ─────────────────────────────────────────────────────────────────────────
  await expect(
    page.getByRole("heading", { name: /Onboarding OS — HR/i }),
  ).toBeVisible();
  // Let the stat cards animate in / numbers settle.
  await page.waitForTimeout(BEAT.read);

  // Scroll slowly through the dashboard so the viewer sees:
  //   stats → compliance/reviews row → active onboarding cards
  await page.mouse.wheel(0, 350);
  await page.waitForTimeout(BEAT.short);
  await page.mouse.wheel(0, 350);
  await page.waitForTimeout(BEAT.short);
  await page.mouse.wheel(0, -700);
  await page.waitForTimeout(BEAT.scene);

  // ─────────────────────────────────────────────────────────────────────────
  // Scene 3 — Instance detail + AI risk recommendation
  // ─────────────────────────────────────────────────────────────────────────
  await page.goto(`${FRONTEND_URL}/admin/onboarding-os/instances/1`, {
    waitUntil: "networkidle",
  });
  await page.waitForTimeout(BEAT.read);

  // The "Re-run analysis" / "AI risk recommendation" card is the centerpiece
  // of this scene. Trigger the re-run and let the spinner play.
  const rerun = page.getByRole("button", { name: /Re-?run analysis/i });
  if (await rerun.isVisible().catch(() => false)) {
    await rerun.scrollIntoViewIfNeeded();
    await page.waitForTimeout(BEAT.micro);
    await rerun.click();
    // Visible "thinking" beat — even with the deterministic fallback the
    // server takes a moment, but we pad in case it returns instantly.
    await page.waitForTimeout(BEAT.ai);
  }
  await page.waitForTimeout(BEAT.scene);

  // ─────────────────────────────────────────────────────────────────────────
  // Scene 4 — Learner timeline + AI mentor
  // ─────────────────────────────────────────────────────────────────────────
  const learner = await loginAs(page, request, "learner");
  // After swapping the token in localStorage we need a fresh navigation so
  // React Query re-fetches with the new auth.
  await page.goto(`${FRONTEND_URL}/learner/onboarding-os/timeline`, {
    waitUntil: "networkidle",
  });
  await expect(
    page.getByRole("heading", { name: /Welcome,/i }),
  ).toBeVisible({ timeout: 15_000 });
  await page.waitForTimeout(BEAT.read);

  // Scroll through the timeline so viewers see the stages.
  await page.mouse.wheel(0, 400);
  await page.waitForTimeout(BEAT.short);
  await page.mouse.wheel(0, -400);
  await page.waitForTimeout(BEAT.micro);

  // Open the AI mentor modal and ask one safe question.
  const askBtn = page.getByRole("button", { name: /Ask AI mentor/i });
  await askBtn.scrollIntoViewIfNeeded();
  await askBtn.click();
  await expect(page.getByText(/AI onboarding mentor/i)).toBeVisible();
  await page.waitForTimeout(BEAT.short);

  const input = page.getByPlaceholder(/Type a question/i);
  await input.fill("What's next on my onboarding this week?");
  await page.waitForTimeout(BEAT.micro);
  await page.getByRole("button", { name: /^Ask$/ }).click();
  // Let the answer render.
  await page.waitForTimeout(BEAT.ai);

  // Close the modal cleanly. There are two "Close" controls in the modal
  // (the header X icon + the footer button), so we use the keyboard to
  // avoid an ambiguous locator.
  await page.keyboard.press("Escape");
  await page.waitForTimeout(BEAT.scene);
  void learner; // keep the inferred type used

  // ─────────────────────────────────────────────────────────────────────────
  // Scene 5 — Buddy dashboard
  // ─────────────────────────────────────────────────────────────────────────
  await loginAs(page, request, "buddy");
  await page.goto(`${FRONTEND_URL}/buddy/dashboard`, {
    waitUntil: "networkidle",
  });
  await expect(
    page.getByRole("heading", { name: /Welcome,/i }),
  ).toBeVisible({ timeout: 15_000 });
  await page.waitForTimeout(BEAT.read);
  await page.mouse.wheel(0, 350);
  await page.waitForTimeout(BEAT.short);
  await page.mouse.wheel(0, -350);
  await page.waitForTimeout(BEAT.scene);

  // ─────────────────────────────────────────────────────────────────────────
  // Scene 6 — IT dashboard
  // ─────────────────────────────────────────────────────────────────────────
  await loginAs(page, request, "it");
  await page.goto(`${FRONTEND_URL}/it/dashboard`, {
    waitUntil: "networkidle",
  });
  await expect(
    page.getByRole("heading", { name: /IT mode/i }),
  ).toBeVisible({ timeout: 15_000 });
  await page.waitForTimeout(BEAT.read);
  await page.mouse.wheel(0, 350);
  await page.waitForTimeout(BEAT.short);
  await page.mouse.wheel(0, -350);
  await page.waitForTimeout(BEAT.scene);

  // ─────────────────────────────────────────────────────────────────────────
  // Scene 7 — Closing frame (landing page hero with logo)
  // ─────────────────────────────────────────────────────────────────────────
  // Wipe auth so the landing renders in its marketing form.
  await page.evaluate(() => {
    localStorage.removeItem("elot_token");
    localStorage.removeItem("elot_user");
  });
  await page.goto(`${FRONTEND_URL}/`, { waitUntil: "networkidle" });
  await page.waitForTimeout(BEAT.read);
  // Give the hero a long-ish hold — this is the frame that survives in
  // most GIF previews.
  await page.waitForTimeout(2500);

  // ─────────────────────────────────────────────────────────────────────────
  // Save the recorded video into a stable, predictable path.
  // ─────────────────────────────────────────────────────────────────────────
  const video = page.video();
  if (!video) {
    throw new Error("page.video() returned null — is video recording enabled?");
  }
  // Close the page so the video file is finalised before we copy it.
  await page.close();
  await video.saveAs(VIDEO_PATH);
  // Best-effort cleanup of the original temp file (saveAs already copies).
  await video.delete().catch(() => undefined);

  // eslint-disable-next-line no-console
  console.log(`\n[demo] video saved → ${VIDEO_PATH}\n`);
});

/**
 * Marketing-screenshot capture.
 *
 * Walks every major surface of ELOT AI and writes a 1280×720 viewport
 * screenshot to artifacts/screenshots/NN-name.png. Pair with SCRIPT.md
 * in the same folder for a voiceover ready to feed into an AI video tool.
 *
 * Run with:
 *   cd frontend && npx playwright test tests/demo/screenshots.spec.ts
 *
 * Safe to run repeatedly. Only does read or idempotent actions (AI risk
 * re-run, mentor-modal open). No mutation of seeded state.
 */
import { test, type APIRequestContext, type Page } from "@playwright/test";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const FRONTEND_URL = process.env.ELOT_BASE_URL ?? "http://localhost:5173";
const API_URL = process.env.ELOT_API_URL ?? "http://localhost:8000/api/v1";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(__dirname, "../../../artifacts/screenshots");

// ---------------------------------------------------------------------------
// Auth — same approach as the demo spec.
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
type OSRole = "manager" | "supervisor" | "buddy" | "it";

async function postJSON(
  req: APIRequestContext,
  url: string,
  data?: unknown,
): Promise<TokenPayload> {
  const resp = await req.post(url, {
    data,
    headers: { "content-type": "application/json" },
  });
  if (!resp.ok()) {
    throw new Error(`auth ${url} -> ${resp.status()} ${await resp.text()}`);
  }
  return (await resp.json()) as TokenPayload;
}

async function pickEmployeeId(
  req: APIRequestContext,
  role: OSRole,
): Promise<number> {
  const resp = await req.get(`${API_URL}/auth/role-options`);
  const data = (await resp.json()) as Record<
    string,
    { employee_id: number }[]
  >;
  const bucket =
    role === "manager"
      ? data.managers
      : role === "supervisor"
        ? data.supervisors
        : role === "buddy"
          ? data.buddies
          : data.it_owners;
  return bucket[0].employee_id;
}

async function loginAs(
  page: Page,
  req: APIRequestContext,
  role: "admin" | "learner" | OSRole,
): Promise<void> {
  let payload: TokenPayload;
  if (role === "admin") {
    payload = await postJSON(req, `${API_URL}/auth/demo-admin`);
  } else if (role === "learner") {
    payload = await postJSON(req, `${API_URL}/auth/demo-learner`);
  } else {
    const employee_id = await pickEmployeeId(req, role);
    payload = await postJSON(req, `${API_URL}/auth/demo-role`, {
      role,
      employee_id,
    });
  }
  payload.user.role = role;
  await page.evaluate(
    ({ token, user }) => {
      localStorage.setItem("elot_token", token);
      localStorage.setItem("elot_user", JSON.stringify(user));
    },
    { token: payload.access_token, user: payload.user },
  );
}

// ---------------------------------------------------------------------------
// Snapshot helper — keeps file names predictable and consistent.
// ---------------------------------------------------------------------------
async function snap(page: Page, n: number, name: string) {
  const file = path.join(OUT_DIR, `${String(n).padStart(2, "0")}-${name}.png`);
  // Tiny stabilisation wait — React Query micro-renders settle here.
  await page.waitForLoadState("networkidle").catch(() => undefined);
  await page.waitForTimeout(400);
  await page.screenshot({ path: file, fullPage: false });
  // eslint-disable-next-line no-console
  console.log(`  ✓  ${path.basename(file)}`);
}

// ---------------------------------------------------------------------------
// The walk.
// ---------------------------------------------------------------------------
test("capture marketing screenshots", async ({ page, request }, testInfo) => {
  testInfo.setTimeout(240_000);

  fs.mkdirSync(OUT_DIR, { recursive: true });

  // 1. Landing
  await page.goto(`${FRONTEND_URL}/`, { waitUntil: "networkidle" });
  await snap(page, 1, "landing");

  // 2. Login picker (with role tiles visible)
  await page.goto(`${FRONTEND_URL}/login`, { waitUntil: "networkidle" });
  await snap(page, 2, "login");

  // ─── HR / Hiring (admin) ─────────────────────────────────────────────────
  await loginAs(page, request, "admin");

  // 3. Hiring dashboard
  await page.goto(`${FRONTEND_URL}/admin/hiring`, { waitUntil: "networkidle" });
  await snap(page, 3, "hiring-dashboard");

  // 4. Job roles
  await page.goto(`${FRONTEND_URL}/admin/hiring/roles`, {
    waitUntil: "networkidle",
  });
  await snap(page, 4, "job-roles");

  // 5. Candidates list
  await page.goto(`${FRONTEND_URL}/admin/hiring/candidates`, {
    waitUntil: "networkidle",
  });
  await snap(page, 5, "candidates");

  // 6. Candidate detail (AI interview / scoring view)
  await page.goto(`${FRONTEND_URL}/admin/hiring/candidates/1`, {
    waitUntil: "networkidle",
  });
  await snap(page, 6, "candidate-detail");

  // ─── Onboarding-OS (HR side) ─────────────────────────────────────────────

  // 7. HR Onboarding-OS dashboard
  await page.goto(`${FRONTEND_URL}/admin/onboarding-os`, {
    waitUntil: "networkidle",
  });
  await snap(page, 7, "onboarding-os-hr");

  // 8. Templates
  await page.goto(`${FRONTEND_URL}/admin/onboarding-os/templates`, {
    waitUntil: "networkidle",
  });
  await snap(page, 8, "templates");

  // 9. Instance detail + AI risk
  await page.goto(`${FRONTEND_URL}/admin/onboarding-os/instances/1`, {
    waitUntil: "networkidle",
  });
  await snap(page, 9, "instance-detail");

  // 10. Manager view (admin-side aggregate)
  await page.goto(`${FRONTEND_URL}/admin/onboarding-os/manager`, {
    waitUntil: "networkidle",
  });
  await snap(page, 10, "manager-view");

  // ─── Per-role surfaces ──────────────────────────────────────────────────

  // 11. Buddy dashboard
  await loginAs(page, request, "buddy");
  await page.goto(`${FRONTEND_URL}/buddy/dashboard`, {
    waitUntil: "networkidle",
  });
  await snap(page, 11, "buddy-dashboard");

  // 12. IT dashboard
  await loginAs(page, request, "it");
  await page.goto(`${FRONTEND_URL}/it/dashboard`, {
    waitUntil: "networkidle",
  });
  await snap(page, 12, "it-dashboard");

  // ─── New-hire / learner experience ──────────────────────────────────────
  await loginAs(page, request, "learner");

  // 13. Learner timeline
  await page.goto(`${FRONTEND_URL}/learner/onboarding-os/timeline`, {
    waitUntil: "networkidle",
  });
  await snap(page, 13, "learner-timeline");

  // 14. AI Mentor modal open
  const ask = page.getByRole("button", { name: /Ask AI mentor/i });
  if (await ask.isVisible().catch(() => false)) {
    await ask.click();
    // Wait for the modal to mount + animate in.
    await page.waitForTimeout(500);
    await snap(page, 14, "ai-mentor");
    await page.keyboard.press("Escape");
  }

  // ─── Training + security (admin again) ──────────────────────────────────
  await loginAs(page, request, "admin");

  // 15. AI Course Builder
  await page.goto(`${FRONTEND_URL}/admin/course-builder`, {
    waitUntil: "networkidle",
  });
  await snap(page, 15, "course-builder");

  // 16. AI Copilot
  await page.goto(`${FRONTEND_URL}/admin/copilot`, {
    waitUntil: "networkidle",
  });
  await snap(page, 16, "ai-copilot");

  // 17. Threat Intelligence
  await page.goto(`${FRONTEND_URL}/admin/threat-intelligence`, {
    waitUntil: "networkidle",
  });
  await snap(page, 17, "threat-intelligence");

  // 18. Admin analytics dashboard (closing summary screen)
  await page.goto(`${FRONTEND_URL}/admin/dashboard`, {
    waitUntil: "networkidle",
  });
  await snap(page, 18, "admin-dashboard");

  // eslint-disable-next-line no-console
  console.log(`\n  All screenshots saved to: ${OUT_DIR}\n`);
});

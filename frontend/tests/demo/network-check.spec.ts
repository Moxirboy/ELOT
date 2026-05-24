/**
 * Network-error diagnostic — walks every demo scene and reports any:
 *   - non-2xx HTTP responses (4xx, 5xx)
 *   - failed/aborted requests
 *   - browser console errors
 *   - uncaught page errors
 *
 * Not part of the demo recording. Run with:
 *   npx playwright test tests/demo/network-check.spec.ts --reporter=list
 *
 * Stays read-only (no API mutations beyond the standard demo auth + a
 * single AI risk re-run, which is idempotent).
 */
import { test, type APIRequestContext, type Page } from "@playwright/test";

const FRONTEND_URL = process.env.ELOT_BASE_URL ?? "http://localhost:5173";
const API_URL = process.env.ELOT_API_URL ?? "http://localhost:8000/api/v1";

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
  payload.user.role = role; // workaround for the backend role-staleness bug
  await page.evaluate(
    ({ token, user }) => {
      localStorage.setItem("elot_token", token);
      localStorage.setItem("elot_user", JSON.stringify(user));
    },
    { token: payload.access_token, user: payload.user },
  );
}

type Failure =
  | { kind: "http"; method: string; url: string; status: number; scene: string }
  | { kind: "console"; text: string; scene: string }
  | { kind: "pageerror"; text: string; scene: string }
  | { kind: "requestfailed"; url: string; failure: string; scene: string };

test("network error diagnostic", async ({ page, request }, testInfo) => {
  testInfo.setTimeout(180_000);

  const failures: Failure[] = [];
  let scene = "boot";

  page.on("response", (r) => {
    const status = r.status();
    if (status >= 400) {
      failures.push({
        kind: "http",
        method: r.request().method(),
        url: r.url(),
        status,
        scene,
      });
    }
  });
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      failures.push({ kind: "console", text: msg.text(), scene });
    }
  });
  page.on("pageerror", (err) => {
    failures.push({ kind: "pageerror", text: err.message, scene });
  });
  page.on("requestfailed", (req) => {
    failures.push({
      kind: "requestfailed",
      url: req.url(),
      failure: req.failure()?.errorText ?? "unknown",
      scene,
    });
  });

  // ─── Scene 1 — Login ────────────────────────────────────────────────────
  scene = "1-login";
  await page.goto(`${FRONTEND_URL}/login`, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);

  // ─── Scene 2 — HR dashboard ─────────────────────────────────────────────
  scene = "2-hr-dashboard";
  await loginAs(page, request, "admin");
  await page.goto(`${FRONTEND_URL}/admin/onboarding-os`, {
    waitUntil: "networkidle",
  });
  await page.waitForTimeout(800);

  // ─── Scene 3 — Instance detail + AI risk re-run ─────────────────────────
  scene = "3-instance-detail";
  await page.goto(`${FRONTEND_URL}/admin/onboarding-os/instances/1`, {
    waitUntil: "networkidle",
  });
  await page.waitForTimeout(800);
  scene = "3a-ai-risk-rerun";
  const rerun = page.getByRole("button", { name: /Re-?run analysis/i });
  if (await rerun.isVisible().catch(() => false)) {
    await rerun.click();
    // Wait for the AI call to settle — it's a real round trip even with the
    // deterministic fallback.
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1500);
  }

  // ─── Scene 4 — Learner timeline + AI mentor ─────────────────────────────
  scene = "4-learner-timeline";
  await loginAs(page, request, "learner");
  await page.goto(`${FRONTEND_URL}/learner/onboarding-os/timeline`, {
    waitUntil: "networkidle",
  });
  await page.waitForTimeout(800);
  scene = "4a-ai-mentor-ask";
  const askBtn = page.getByRole("button", { name: /Ask AI mentor/i });
  if (await askBtn.isVisible().catch(() => false)) {
    await askBtn.click();
    const input = page.getByPlaceholder(/Type a question/i);
    await input.fill("What is on my onboarding this week?");
    await page.getByRole("button", { name: /^Ask$/ }).click();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1500);
    await page.keyboard.press("Escape");
  }

  // ─── Scene 5 — Buddy dashboard ──────────────────────────────────────────
  scene = "5-buddy-dashboard";
  await loginAs(page, request, "buddy");
  await page.goto(`${FRONTEND_URL}/buddy/dashboard`, {
    waitUntil: "networkidle",
  });
  await page.waitForTimeout(800);

  // ─── Scene 6 — IT dashboard ─────────────────────────────────────────────
  scene = "6-it-dashboard";
  await loginAs(page, request, "it");
  await page.goto(`${FRONTEND_URL}/it/dashboard`, {
    waitUntil: "networkidle",
  });
  await page.waitForTimeout(800);

  // ─── Scene 7 — Landing ──────────────────────────────────────────────────
  scene = "7-landing";
  await page.evaluate(() => {
    localStorage.removeItem("elot_token");
    localStorage.removeItem("elot_user");
  });
  await page.goto(`${FRONTEND_URL}/`, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);

  // ─── Report ─────────────────────────────────────────────────────────────
  // eslint-disable-next-line no-console
  console.log("\n────── NETWORK-ERROR REPORT ──────");
  if (failures.length === 0) {
    // eslint-disable-next-line no-console
    console.log("✓ no errors across all 7 scenes\n");
    return;
  }
  // Group by scene for readability.
  const bySc: Record<string, Failure[]> = {};
  for (const f of failures) (bySc[f.scene] ??= []).push(f);
  for (const sc of Object.keys(bySc).sort()) {
    // eslint-disable-next-line no-console
    console.log(`\n[${sc}] ${bySc[sc].length} issue(s):`);
    for (const f of bySc[sc]) {
      if (f.kind === "http") {
        // eslint-disable-next-line no-console
        console.log(`  HTTP ${f.status}  ${f.method.padEnd(6)} ${f.url}`);
      } else if (f.kind === "console") {
        // eslint-disable-next-line no-console
        console.log(`  CONSOLE  ${f.text}`);
      } else if (f.kind === "pageerror") {
        // eslint-disable-next-line no-console
        console.log(`  PAGEERR  ${f.text}`);
      } else {
        // eslint-disable-next-line no-console
        console.log(`  REQFAIL  ${f.failure}  ${f.url}`);
      }
    }
  }
  // eslint-disable-next-line no-console
  console.log(`\n──────────────────────────────────\nTOTAL: ${failures.length}\n`);

  // Fail the test so CI catches regressions. Comment the next line out to
  // make this purely informational.
  throw new Error(`${failures.length} network/console issue(s) — see log above`);
});

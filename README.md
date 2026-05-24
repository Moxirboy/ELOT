# ELOT AI

**Employee Learning & Onboarding Trainer** — an AI-powered corporate training, onboarding, and compliance LMS.

> _Turn company policies into interactive AI training._

ELOT AI takes any internal policy (security, data, HR, AI usage…) and turns it into a structured micro-learning course with role-based examples, realistic scenarios, an AI coach, an analytics dashboard, and verifiable certificates.

---

## Watch the demo

A 12-second teaser of the full product loop — login → HR Onboarding-OS dashboard → instance detail → learner timeline:

![ELOT AI — 12-second teaser](artifacts/demo/elot-demo-short.gif)

The full ~50-second walkthrough goes all the way through Learner → Buddy → IT dashboards and back to the landing page:

![ELOT AI — full product demo](artifacts/demo/elot-demo.gif)

Prefer video? Grab [`artifacts/demo/elot-demo.webm`](artifacts/demo/elot-demo.webm) for the 1280×720 source recording.

> Want to re-record the demo against your local stack? See
> [`artifacts/demo/README.md`](artifacts/demo/README.md) — it's automated end-to-end
> with Playwright + ffmpeg (`cd frontend && npm run demo:all`).

---

## Hackathon track

**Corporate Education** — modern LMS / compliance training reimagined with AI.

## Problem

Corporate compliance training is expensive, generic and easy to forget. Most companies still rely on long PDFs, single-language slide decks, and one-size-fits-all videos. Employees skim, fail real-world tests, and admins have no signal on who actually understood the policy.

## Solution

ELOT AI lets a compliance admin paste a policy and get back a fully structured, role-aware micro-course in under a minute:

- **AI Course Generator** — lessons, role-based examples, realistic scenarios, and a quiz from any policy text
- **Scenario-Based Learning** — employees answer in their own words and get AI feedback grounded in the policy
- **Compliance Dashboard** — completion, average score, weakest topics, department risk, overdue tracking
- **AI Admin Copilot** — "Who needs retraining?" / "Generate a reminder message" with evidence and recommended actions
- **Auto-issued Certificates** — verifiable certificate IDs, learner-friendly
- **Multilingual Training** — English, Uzbek, Russian

## AI usage

All AI calls happen **server-side only** in [`backend/src/app/services/ai.py`](backend/src/app/services/ai.py). The frontend never sees an AI API key.

- Provider order: `OPENAI_API_KEY` → `GEMINI_API_KEY` → deterministic fallback.
- Models default to `gpt-4o-mini` / `gemini-1.5-flash-latest` and can be overridden via env.
- AI is asked to return strict JSON; the response is validated by Pydantic schemas.
- If the AI call fails for any reason the demo falls back to **sample content** so the hackathon demo never breaks. Sample content lives in [`backend/src/app/services/sample_data.py`](backend/src/app/services/sample_data.py).

### Prompt disclosure

The exact prompts ELOT AI sends to the model are open and live in [`backend/src/app/services/ai_prompts.py`](backend/src/app/services/ai_prompts.py):

- **Course generation** — turns a policy into the lesson/scenario/quiz JSON contract.
- **Scenario feedback** — evaluates a learner answer against the policy.
- **Admin copilot** — answers analytics questions from the provided training data only (no invented employees or scores).

## Tech stack

**Backend** — extended fork of [`benavlabs/FastAPI-boilerplate`](https://github.com/benavlabs/FastAPI-boilerplate)

- FastAPI · Pydantic v2 · SQLAlchemy 2.0 async ORM · PostgreSQL · Redis · Alembic
- JWT auth (plus demo-friendly admin/learner login)
- ARQ worker available for background jobs
- Docker Compose dev environment
- New ELOT modules:
  - `app/models/elot.py` — ten domain models
  - `app/schemas/elot.py` — Pydantic schemas
  - `app/api/v1/elot/` — one router per feature area
  - `app/services/ai.py` — OpenAI / Gemini wrapper + fallback
  - `app/seed.py` — demo data seeder

**Frontend** — Vite + React 18 + TypeScript

- Tailwind CSS · custom shadcn-style primitives
- React Router · TanStack Query · Axios
- Recharts for dashboards
- Lucide icons

## Project structure

```
ELOT/
├── backend/                # FastAPI-boilerplate extended for ELOT AI
│   ├── docker-compose.yml
│   ├── Dockerfile
│   ├── pyproject.toml
│   └── src/
│       ├── .env.example
│       └── app/
│           ├── api/v1/elot/      ← new ELOT routes
│           ├── models/elot.py    ← new ELOT tables
│           ├── schemas/elot.py
│           ├── services/         ← AI service + sample fallback
│           └── seed.py           ← demo data
├── frontend/               # Vite + React app
│   ├── package.json
│   ├── tailwind.config.js
│   └── src/
│       ├── components/     ← UI primitives + layouts
│       ├── pages/admin/    ← Dashboard, Employees, Course Library, Builder, Detail, Assignments, Copilot
│       ├── pages/learner/  ← Dashboard, Course Player, Certificate
│       ├── lib/api.ts      ← typed API client
│       └── lib/auth.tsx    ← auth context
└── README.md               ← you are here
```

## Local development

> Tested on macOS with Docker Desktop and Node 18+. The boilerplate is happy with `uv` for backend dependency management.

### 1. Backend

```bash
cd backend

# Copy the boilerplate's local deployment config into place. Already wired
# for ELOT AI — Dockerfile / docker-compose are pre-copied at the repo root.
cp src/.env.example src/.env   # edit if you want to add an AI key

# Bring up Postgres + Redis + the FastAPI worker stack
docker compose up --build
```

The API will be available on **<http://localhost:8000>** with OpenAPI docs at **<http://localhost:8000/docs>**.

Inside the running container the virtual env lives at `/app/.venv`. To run Alembic migrations:

```bash
docker compose exec web bash -lc 'cd /code && /app/.venv/bin/alembic revision --autogenerate -m "add elot models"'
docker compose exec web bash -lc 'cd /code && /app/.venv/bin/alembic upgrade head'
```

> The boilerplate also runs `Base.metadata.create_all` on startup, so for the
> hackathon demo migrations are optional — tables are created automatically the
> first time the API boots.

### 2. Seed demo data

Run the seed script — idempotent, safe to re-run:

```bash
docker compose exec web bash -lc 'cd /code && /app/.venv/bin/python -m app.seed'
```

Or, if you've added new fields and want a clean slate:

```bash
docker compose exec web bash -lc 'cd /code && /app/.venv/bin/python -m app.seed --reset'
```

This creates:

- **Company** — _GDG Demo Corp_
- **12 employees** across HR / Engineering / Sales / Operations / Management
- **1 demo policy** (data protection & acceptable use)
- **5 prebuilt courses** — Cybersecurity Basics, Data Privacy Essentials, AI Usage Policy, Workplace Conduct, New Employee Onboarding
- Mixed-status assignments and a handful of certificates so the dashboard has real numbers immediately.

### 3. Frontend

```bash
cd frontend
cp .env.example .env   # optional — defaults to http://localhost:8000/api/v1
npm install
npm run dev
```

Open **<http://localhost:5173>**.

## Demo credentials

The login screen has no signup. Click one of the two buttons:

- **Continue as Admin** → seeds `admin@gdgdemo.com` and drops you into `/admin/dashboard`.
- **Continue as Learner** → signs you in as the first seeded employee and drops you into `/learner/dashboard`.

Both tokens are JWTs scoped to `GDG Demo Corp`.

## Environment variables

### Backend (`backend/src/.env`)

```
DATABASE_URL inferred from POSTGRES_* settings
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_SERVER=db
POSTGRES_DB=elot
REDIS_CACHE_HOST=redis
REDIS_QUEUE_HOST=redis
REDIS_RATE_LIMIT_HOST=redis
SECRET_KEY=<openssl rand -hex 32>
ENVIRONMENT=local
CORS_ORIGINS=["http://localhost:5173","http://127.0.0.1:5173","*"]

# Optional AI providers — server side only
# OPENAI_API_KEY=sk-...
# OPENAI_MODEL=gpt-4o-mini
# GEMINI_API_KEY=...
# GEMINI_MODEL=gemini-1.5-flash-latest
```

### Frontend (`frontend/.env`)

```
VITE_API_BASE_URL=http://localhost:8000/api/v1
```

## API docs

Once the backend is running, the full OpenAPI spec is at **<http://localhost:8000/docs>**. The ELOT-specific endpoints live under the `auth`, `companies`, `employees`, `policies`, `courses`, `assignments`, `learner`, `dashboard`, `certificates`, and `ai` tags.

## Winning demo flow

1. Open the **landing page** at `/`.
2. Click **Try Demo** → **Continue as Admin**.
3. Admin dashboard shows live stats from seeded data (employees, completion rate, average score, high-risk, weakest topics, recent completions, department chart).
4. Open **AI Course Builder**.
5. The demo policy is pre-pasted. Click **Generate AI Course** → see lessons, scenarios, role-based examples, quiz and limitations appear.
6. Click **Save course**.
7. Open **Assignments** → assign the new course to a department with a 7-day due date.
8. Open `/login` in a new tab → **Continue as Learner**.
9. Open one of the assigned courses. Step through a lesson.
10. On the scenario, type an answer and click **Get AI feedback** → AI returns score, risk level, better answer, policy reference, coaching tip.
11. Finish the quiz, click **Mark course complete** → certificate auto-issued.
12. Open the certificate page from the learner dashboard.
13. Return to admin, open **AI Copilot**.
14. Ask **"Who needs retraining and why?"** → grounded answer + evidence + recommended actions + draft reminder message.

## Responsible AI

ELOT AI is a hackathon MVP. The system is designed to **never** make confident legal or HR judgments on behalf of a real compliance team. Specifically:

- AI-generated training requires **admin review before publishing**.
- ELOT AI is **not legal advice**. Consult your compliance officer for binding interpretations.
- The demo environment uses **sample / public policy content** only.
- **Do not upload private, sensitive, or personally identifying employee data** to the demo.
- AI can make mistakes — every generated course includes an explicit `limitations` array surfaced to the learner.

These notes are visible inside the app (admin sidebar, course builder, certificate footer, landing page).

## Roadmap

- SSO (Google Workspace / Microsoft 365) and SCIM provisioning
- Real Alembic migrations baseline (currently `create_all` on startup for hackathon speed)
- Role-aware AI generation pipeline (HR/Eng/Sales templates)
- Webhook + Slack reminders for overdue learners
- More rigorous AI evaluation harness with red-team prompts
- Export certificates as signed PDFs

## License

MIT — built on top of the MIT-licensed [`benavlabs/FastAPI-boilerplate`](https://github.com/benavlabs/FastAPI-boilerplate).

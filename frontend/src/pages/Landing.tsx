import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Award,
  BarChart3,
  BookOpenCheck,
  Bot,
  Briefcase,
  Building2,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  FileText,
  Globe2,
  Hospital,
  Landmark,
  Languages,
  Library,
  LockKeyhole,
  MessageSquareText,
  PlayCircle,
  PlugZap,
  School,
  SearchCheck,
  ShieldCheck,
  Sparkles,
  Star,
  Stethoscope,
  Timer,
  Truck,
  UsersRound,
  X,
} from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

const PLATFORM_STEPS = [
  {
    icon: SearchCheck,
    title: "Identify requirements",
    desc: "Turn policy text and role context into a clear training plan for HR, compliance, security, and operations teams.",
  },
  {
    icon: Sparkles,
    title: "Generate training faster",
    desc: "Create lessons, realistic workplace scenarios, quizzes, translations, and completion criteria from one source policy.",
  },
  {
    icon: ClipboardCheck,
    title: "Assign by role",
    desc: "Launch micro-courses by department, job family, risk level, or onboarding cohort with clear due dates.",
  },
  {
    icon: BarChart3,
    title: "Report audit-ready progress",
    desc: "Track completions, weakest topics, overdue learners, certificates, and AI copilot recommendations in one dashboard.",
  },
];

const FEATURES = [
  {
    icon: Library,
    title: "Course library foundation",
    desc: "Start with practical templates for AI usage, data privacy, cybersecurity, conduct, onboarding, and reporting.",
  },
  {
    icon: Bot,
    title: "AI admin copilot",
    desc: "Ask who needs retraining, why scores dropped, and which reminder message to send next.",
  },
  {
    icon: Globe2,
    title: "Multilingual delivery",
    desc: "Generate employee-ready training in English, Uzbek, or Russian without rewriting each module.",
  },
  {
    icon: Award,
    title: "Verifiable certificates",
    desc: "Issue shareable completion certificates with unique IDs and course-level evidence.",
  },
  {
    icon: PlugZap,
    title: "Integration-ready model",
    desc: "Designed around HRIS, LMS, payroll, and identity workflows so assignment data can move cleanly.",
  },
  {
    icon: ShieldCheck,
    title: "Human-reviewed AI",
    desc: "Every generated course stays in draft until an admin reviews the content, limitations, and publishing scope.",
  },
];

const COURSE_TOPICS = [
  "AI usage policy",
  "Cybersecurity basics",
  "Data privacy essentials",
  "Workplace conduct",
  "New employee onboarding",
  "Secure reporting",
  "Anti-harassment basics",
  "Safety procedures",
];

const METRICS = [
  { icon: Timer, value: "30s", label: "average draft generation" },
  { icon: UsersRound, value: "12", label: "demo employees tracked" },
  { icon: BookOpenCheck, value: "5", label: "sample courses live" },
  { icon: Languages, value: "3", label: "supported languages" },
];

const TEAM_INDUSTRIES = [
  { icon: Building2, label: "Tech & SaaS" },
  { icon: Hospital, label: "Healthcare" },
  { icon: Landmark, label: "Finance" },
  { icon: School, label: "Education" },
  { icon: Truck, label: "Logistics" },
  { icon: Stethoscope, label: "Pharma" },
  { icon: Briefcase, label: "Professional services" },
];

const COMPARISON = [
  {
    aspect: "Authoring time",
    legacy: "Days to weeks; designer + SME loop per course",
    elot: "~30 seconds from policy paste to draft course",
  },
  {
    aspect: "Scenario depth",
    legacy: "Static multiple-choice or pre-recorded vignettes",
    elot: "Adaptive AI coach that grades free-text answers against the policy",
  },
  {
    aspect: "Audit trail",
    legacy: "Completion dates and certificate IDs",
    elot: "Completion + per-question scores + AI feedback transcript + draft state",
  },
  {
    aspect: "Localization",
    legacy: "One language per course; rewrite to translate",
    elot: "Regenerate in English, Uzbek, or Russian from one source policy",
  },
  {
    aspect: "Updating training",
    legacy: "Re-record + re-upload every quarter",
    elot: "Edit policy text → regenerate the affected lesson in seconds",
  },
];

const FAQ = [
  {
    q: "Where does the AI run? Does it see our policy?",
    a: "AI calls happen server-side from your backend. The provider key (OpenAI or Gemini) lives only in your environment variables. We never ship the key to the browser. The policy text is sent in the model prompt only when you click 'Generate'.",
  },
  {
    q: "Is ELOT AI legal advice?",
    a: "No. ELOT AI produces training drafts that must be reviewed and approved by a human admin before publishing. The product is not a legal certification and the output is not a substitute for advice from your compliance counsel.",
  },
  {
    q: "Can we bring our own policy?",
    a: "Yes. Paste any policy text into the Course Builder. The AI generates lessons, role-based examples, scenarios, and a quiz keyed to that policy.",
  },
  {
    q: "What languages are supported in the demo?",
    a: "English, Uzbek, and Russian. The same source policy can be regenerated into any of these without rewriting. More languages are on the roadmap.",
  },
  {
    q: "What if the AI provider is offline or we don't have a key?",
    a: "ELOT AI ships a deterministic fallback so the demo never breaks. Sample lessons, scenarios, and feedback are returned instead — clearly labelled as sample content.",
  },
];

export function Landing() {
  // Show sticky CTA after user scrolls past the hero
  const [showStickyCTA, setShowStickyCTA] = useState(false);
  useEffect(() => {
    function onScroll() {
      setShowStickyCTA(window.scrollY > 480);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="border-b border-slate-200 bg-slate-950 px-4 py-2 text-center text-xs font-semibold uppercase text-indigo-100">
        Policy-to-course automation for HR, compliance, and security teams
      </div>

      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <Logo />
          <nav className="hidden gap-7 text-sm font-semibold text-slate-600 lg:flex">
            <a href="#platform" className="hover:text-brand-600">
              Platform
            </a>
            <a href="#courses" className="hover:text-brand-600">
              Training
            </a>
            <a href="#proof" className="hover:text-brand-600">
              Reporting
            </a>
            <a href="#responsible" className="hover:text-brand-600">
              Responsible AI
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/login">
              <Button variant="ghost" size="sm">
                Sign in
              </Button>
            </Link>
            <Link to="/login">
              <Button size="sm">
                Try Demo <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="relative isolate overflow-hidden bg-slate-950 text-white">
          <img
            src="/product-dashboard.png"
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-40 hidden w-[980px] max-w-none -translate-x-1/2 rounded-lg border border-white/10 opacity-20 shadow-2xl md:block"
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,6,23,0.72),rgba(2,6,23,0.96)_58%,#020617)]" />
          <div className="relative mx-auto max-w-7xl px-4 pb-20 pt-12 md:pb-24 md:pt-20">
            <div className="mx-auto max-w-4xl text-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-indigo-100 shadow-sm">
                <Sparkles className="h-3.5 w-3.5" />
                AI-powered compliance training platform
              </span>
              <h1 className="mt-6 text-4xl font-extrabold text-white md:text-6xl">
                Automate compliance training from policy to proof.
              </h1>
              <p className="mx-auto mt-5 max-w-3xl text-base leading-8 text-slate-200 md:text-lg">
                ELOT AI turns company policies into reviewable micro-courses,
                role-based scenarios, quizzes, certificates, and dashboard evidence
                so teams can reduce risk without manual LMS work.
              </p>

              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link to="/login">
                  <Button size="lg" className="px-8">
                    <PlayCircle className="h-5 w-5" /> Try live demo
                  </Button>
                </Link>
                <a href="#platform">
                  <Button
                    variant="outline"
                    size="lg"
                    className="border-white/25 bg-white/5 text-white hover:bg-white/10"
                  >
                    See platform
                  </Button>
                </a>
              </div>

            </div>

            <div className="mx-auto mt-8 max-w-6xl overflow-hidden rounded-lg border border-white/15 bg-white/5 shadow-2xl shadow-black/40 md:mt-14">
              <img
                src="/product-dashboard.png"
                alt="ELOT AI admin dashboard showing compliance metrics, department performance, weakest topics, and recent completions."
                className="w-full"
              />
            </div>

            <div className="mt-7 flex flex-wrap items-center justify-center gap-3 text-sm text-slate-300">
              {["Admin review before publishing", "Sample data demo", "Not legal advice"].map(
                (item) => (
                  <span key={item} className="inline-flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                    {item}
                  </span>
                ),
              )}
            </div>
          </div>
        </section>

        {/* Trusted by — industry strip */}
        <section className="border-b border-slate-200 bg-white py-10">
          <div className="mx-auto max-w-7xl px-4">
            <div className="text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
              Built for compliance teams across
            </div>
            <ul
              className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-7"
              aria-label="Industries served"
            >
              {TEAM_INDUSTRIES.map((t) => (
                <li
                  key={t.label}
                  className="flex items-center justify-center gap-2 rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2 text-sm font-medium text-slate-500 transition hover:border-brand-200 hover:text-brand-700"
                >
                  <t.icon className="h-4 w-4" aria-hidden="true" /> {t.label}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-center text-[11px] text-slate-400">
              Industry coverage examples — production logos arrive with real
              customers.
            </p>
          </div>
        </section>

        <section className="border-b border-slate-200 bg-white py-8">
          <div className="mx-auto grid max-w-7xl gap-4 px-4 sm:grid-cols-2 lg:grid-cols-4">
            {METRICS.map((metric) => (
              <div
                key={metric.label}
                className="flex items-center gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-brand-600 shadow-sm">
                  <metric.icon className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-slate-950">{metric.value}</div>
                    <div className="text-xs font-medium uppercase text-slate-500">
                    {metric.label}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section id="platform" className="mx-auto max-w-7xl px-4 py-20">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 text-sm font-semibold text-brand-700">
              <Building2 className="h-4 w-4" />
              All-in-one training operations
            </div>
            <h2 className="mt-3 text-3xl font-bold text-slate-950 md:text-4xl">
              One workflow for requirement intake, AI authoring, assignment, and reporting.
            </h2>
            <p className="mt-4 text-base leading-7 text-slate-600">
              ELOT does more than generate course text. It connects the complete
              compliance loop: policy intake, admin-reviewed lessons, employee
              assignment, completion evidence, and retraining actions.
            </p>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {PLATFORM_STEPS.map((step, index) => (
              <Card key={step.title} className="rounded-lg p-6">
                <div className="flex items-center justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-slate-950 text-white">
                    <step.icon className="h-5 w-5" />
                  </div>
                  <span className="text-sm font-bold text-slate-300">
                    0{index + 1}
                  </span>
                </div>
                <h3 className="mt-5 text-lg font-semibold text-slate-950">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{step.desc}</p>
              </Card>
            ))}
          </div>
        </section>

        <section id="courses" className="bg-white py-20">
          <div className="mx-auto grid max-w-7xl gap-10 px-4 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
                <Library className="h-4 w-4" />
                Training library plus custom generation
              </div>
              <h2 className="mt-3 text-3xl font-bold text-slate-950 md:text-4xl">
                Build the catalog teams expect, then customize each course faster.
              </h2>
              <p className="mt-4 text-base leading-7 text-slate-600">
                Start with practical coverage across common workplace policies,
                then use AI to adapt training to a company's own policy language,
                roles, and risk signals.
              </p>
              <div className="mt-7 grid gap-3 sm:grid-cols-2">
                {COURSE_TOPICS.map((topic) => (
                  <div
                    key={topic}
                    className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700"
                  >
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    {topic}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-950 p-5 text-white shadow-card">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <div className="text-sm font-semibold text-indigo-200">
                    AI course builder
                  </div>
                  <div className="text-xl font-bold">Data Privacy Essentials</div>
                </div>
                <span className="rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-semibold text-emerald-200">
                  Draft ready
                </span>
              </div>
              <div className="mt-5 grid gap-3">
                {[
                  ["Source policy", "Employee data handling policy"],
                  ["Learner role", "Sales, HR, Operations"],
                  ["Generated outputs", "4 lessons, 3 scenarios, 8 quiz items"],
                  ["Review gate", "Admin approval required"],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-lg border border-white/10 bg-white/5 p-4"
                  >
                    <div className="text-xs font-semibold uppercase text-slate-400">
                      {label}
                    </div>
                    <div className="mt-1 text-sm font-semibold text-slate-100">
                      {value}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-5 rounded-lg bg-white p-4 text-slate-900">
                <div className="flex items-center gap-2 text-sm font-bold">
                  <MessageSquareText className="h-4 w-4 text-brand-600" />
                  Scenario preview
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  A manager asks an employee to export customer records into a
                  personal spreadsheet for faster follow-up. What should the employee do?
                </p>
              </div>
            </div>
          </div>
        </section>

        <section id="proof" className="mx-auto max-w-7xl px-4 py-20">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-amber-700">
                <Star className="h-4 w-4" />
                Audit-ready platform signals
              </div>
              <h2 className="mt-3 text-3xl font-bold text-slate-950 md:text-4xl">
                Make risk reduction visible before the demo starts.
              </h2>
              <p className="mt-4 text-base leading-7 text-slate-600">
                ELOT surfaces the proof compliance teams look for: tracking,
                weak topic analysis, certificate evidence, and a responsible AI
                review model. The live dashboard gives evaluators a concrete
                product signal from the first visit.
              </p>
              <Link to="/login" className="mt-7 inline-flex">
                <Button size="lg">
                  Open demo dashboard <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              {FEATURES.map((feature) => (
                <Card key={feature.title} className="rounded-lg p-5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                    <feature.icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 text-base font-semibold text-slate-950">
                    {feature.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {feature.desc}
                  </p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Comparison: static LMS vs ELOT AI */}
        <section id="compare" className="bg-white py-20">
          <div className="mx-auto max-w-7xl px-4">
            <div className="text-center">
              <div className="inline-flex items-center gap-2 rounded-full border border-brand-100 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
                <Sparkles className="h-3.5 w-3.5" /> Why ELOT AI
              </div>
              <h2 className="mt-4 text-3xl font-bold text-slate-950 md:text-4xl">
                Static LMS vs ELOT AI
              </h2>
              <p className="mx-auto mt-3 max-w-2xl text-base text-slate-600">
                The same compliance topics — delivered as adaptive, AI-coached
                training instead of pre-recorded video.
              </p>
            </div>

            <div className="mt-10 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <th className="w-1/3 px-5 py-3">Aspect</th>
                    <th className="w-1/3 px-5 py-3">Static LMS</th>
                    <th className="w-1/3 bg-gradient-to-r from-brand-50 to-accent-50 px-5 py-3 text-brand-700">
                      ELOT AI
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {COMPARISON.map((row) => (
                    <tr key={row.aspect}>
                      <td className="px-5 py-4 font-semibold text-slate-900">
                        {row.aspect}
                      </td>
                      <td className="px-5 py-4 text-slate-600">
                        <span className="inline-flex items-start gap-2">
                          <X
                            className="mt-0.5 h-4 w-4 shrink-0 text-rose-500"
                            aria-hidden="true"
                          />
                          {row.legacy}
                        </span>
                      </td>
                      <td className="bg-gradient-to-r from-brand-50/40 to-accent-50/40 px-5 py-4 text-slate-800">
                        <span className="inline-flex items-start gap-2">
                          <CheckCircle2
                            className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600"
                            aria-hidden="true"
                          />
                          {row.elot}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="bg-slate-950 py-20 text-white">
          <div className="mx-auto grid max-w-7xl gap-8 px-4 lg:grid-cols-3">
            <div className="lg:col-span-1">
              <div className="flex items-center gap-2 text-sm font-semibold text-indigo-200">
                <FileText className="h-4 w-4" />
                Buyer-ready positioning
              </div>
              <h2 className="mt-3 text-3xl font-bold">
                Compliance teams need more than a course generator.
              </h2>
            </div>
            <div className="grid gap-4 lg:col-span-2 md:grid-cols-3">
              {[
                {
                  title: "Legal clarity",
                  desc: "Position AI as review support, not legal advice or automatic policy approval.",
                  icon: LockKeyhole,
                },
                {
                  title: "Operational control",
                  desc: "Show admins how assignments, reminders, due dates, and certificates stay organized.",
                  icon: ClipboardCheck,
                },
                {
                  title: "Employee retention",
                  desc: "Emphasize scenarios and feedback that help learners remember what to do at work.",
                  icon: BookOpenCheck,
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="rounded-lg border border-white/10 bg-white/5 p-5"
                >
                  <item.icon className="h-6 w-6 text-emerald-300" />
                  <h3 className="mt-4 font-semibold">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-300">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="border-t border-slate-200 bg-slate-50 py-20">
          <div className="mx-auto max-w-4xl px-4">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-slate-950 md:text-4xl">
                Questions compliance buyers ask
              </h2>
              <p className="mt-3 text-base text-slate-600">
                Straight answers on AI, data, language support, and what to do
                when the model misbehaves.
              </p>
            </div>
            <div className="mt-10 divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
              {FAQ.map((item, i) => (
                <details key={i} className="group">
                  <summary className="flex cursor-pointer list-none items-start justify-between gap-4 px-5 py-4 text-left">
                    <span className="text-base font-semibold text-slate-900">
                      {item.q}
                    </span>
                    <ChevronDown className="mt-0.5 h-5 w-5 shrink-0 text-slate-400 transition-transform group-open:rotate-180" />
                  </summary>
                  <p className="px-5 pb-4 text-sm leading-7 text-slate-600">
                    {item.a}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section id="responsible" className="bg-white py-20">
          <div className="mx-auto max-w-7xl px-4">
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-8">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                <div className="max-w-2xl">
                  <div className="flex items-center gap-2 text-sm font-semibold text-amber-800">
                    <ShieldCheck className="h-4 w-4" />
                    Responsible AI guardrails
                  </div>
                  <h2 className="mt-3 text-3xl font-bold text-slate-950">
                    AI speed with admin control.
                  </h2>
                  <p className="mt-3 text-sm leading-6 text-slate-700">
                    ELOT should be explicit about AI limitations because compliance
                    teams care about governance as much as speed.
                  </p>
                </div>
                <ul className="grid max-w-2xl gap-3 text-sm text-slate-700 sm:grid-cols-2">
                  {[
                    "Generated courses require admin review before publishing.",
                    "ELOT AI is not legal advice.",
                    "The demo uses sample and public-style policy data.",
                    "Admins approve lessons, quizzes, and scenarios.",
                    "Sensitive personal data should not be uploaded.",
                    "Certificates preserve completion evidence.",
                  ].map((item) => (
                    <li key={item} className="flex gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white py-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 text-sm text-slate-500 md:flex-row">
          <Logo />
          <div>
            © {new Date().getFullYear()} ELOT AI. AI-assisted training requires
            human review.
          </div>
        </div>
      </footer>

      {/* Sticky bottom CTA — appears after the hero, hidden on mobile keyboards */}
      <div
        aria-hidden={!showStickyCTA}
        className={`fixed inset-x-0 bottom-3 z-30 flex justify-center px-4 transition-all duration-300 print:hidden ${
          showStickyCTA
            ? "translate-y-0 opacity-100"
            : "pointer-events-none translate-y-6 opacity-0"
        }`}
      >
        <div className="flex items-center gap-3 rounded-full border border-slate-200 bg-white/95 px-3 py-2 shadow-soft backdrop-blur">
          <span className="hidden text-sm font-medium text-slate-700 sm:inline">
            Ready to see it live?
          </span>
          <Link to="/login">
            <Button size="sm">
              Try the live demo <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

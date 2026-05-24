import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Award,
  BookOpen,
  CheckCircle2,
  Clock,
  FishSymbol,
  PlayCircle,
  ShieldAlert,
} from "lucide-react";
import {
  Learner,
  PhishingTests,
  type LearnerCourseListItem,
} from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Empty } from "@/components/ui/Empty";
import { StatCard } from "@/components/ui/StatCard";
import { CourseCover } from "@/components/learning/CourseCover";
import { formatDate, prettyStatus, statusColor } from "@/lib/utils";

interface ResumeMarker {
  assignment: LearnerCourseListItem;
  stepIdx: number;
}

function loadResumeMarkers(courses: LearnerCourseListItem[]): ResumeMarker[] {
  const out: ResumeMarker[] = [];
  for (const c of courses) {
    if (c.status === "completed") continue;
    const key = `elot:resume:${c.assignment_id}:${c.course_id}`;
    const raw = localStorage.getItem(key);
    if (!raw) continue;
    const stepIdx = Number(raw);
    if (Number.isFinite(stepIdx) && stepIdx > 0) {
      out.push({ assignment: c, stepIdx });
    }
  }
  return out;
}

export function LearnerDashboard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["learner-dashboard"],
    queryFn: Learner.dashboard,
  });

  const challenges = useQuery({
    queryKey: ["phishing-tests-learner"],
    queryFn: PhishingTests.list,
  });

  const resumeMarkers = useMemo(
    () => (data ? loadResumeMarkers(data.courses) : []),
    [data],
  );

  const activeChallenges = useMemo(
    () => (challenges.data ?? []).filter((c) => c.status === "active").slice(0, 4),
    [challenges.data],
  );

  if (isLoading) return <div className="text-slate-500">Loading…</div>;
  if (error || !data)
    return (
      <Empty
        icon={<BookOpen className="h-5 w-5" />}
        title="Could not load your courses"
        description="Make sure your backend is running and seed data is loaded."
      />
    );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Welcome back, {data.employee_name.split(" ")[0]} 👋
        </h1>
        <p className="text-sm text-slate-500">
          {data.department} · Your training assignments
        </p>
      </div>

      {/* Resume banner */}
      {resumeMarkers[0] && (
        <Card className="overflow-hidden border-brand-200/60 bg-gradient-to-r from-brand-50 via-white to-white">
          <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <span
                className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-accent-500 text-white shadow-sm"
                aria-hidden="true"
              >
                <PlayCircle className="h-6 w-6" />
              </span>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-brand-600">
                  Pick up where you left off
                </div>
                <div className="mt-0.5 text-base font-semibold text-slate-900">
                  {resumeMarkers[0].assignment.title}
                </div>
                <div className="text-xs text-slate-500">
                  Resume at step {resumeMarkers[0].stepIdx + 1}
                  {resumeMarkers[0].assignment.due_date &&
                    ` · due ${formatDate(resumeMarkers[0].assignment.due_date)}`}
                </div>
              </div>
            </div>
            <Link
              to={`/learner/courses/${resumeMarkers[0].assignment.course_id}?assignment=${resumeMarkers[0].assignment.assignment_id}`}
              className="self-start sm:self-auto"
            >
              <Button>
                Resume course <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard
          label="Completed"
          value={data.completed}
          icon={<CheckCircle2 className="h-5 w-5" />}
          tone="success"
        />
        <StatCard
          label="In progress"
          value={data.in_progress}
          icon={<Clock className="h-5 w-5" />}
          tone="brand"
        />
        <StatCard
          label="Not started"
          value={data.not_started}
          icon={<BookOpen className="h-5 w-5" />}
        />
        <StatCard
          label="Overdue"
          value={data.overdue}
          icon={<Clock className="h-5 w-5" />}
          tone="danger"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Assigned courses</CardTitle>
          <Badge tone="brand">{data.courses.length}</Badge>
        </CardHeader>
        <CardContent>
          {data.courses.length === 0 ? (
            <Empty
              icon={<BookOpen className="h-5 w-5" />}
              title="No assignments yet"
              description="Your admin hasn't assigned any courses. Check back soon."
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {data.courses.map((c) => (
                <div
                  key={c.assignment_id}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white transition hover:border-brand-200 hover:shadow-card"
                >
                  <CourseCover title={c.title} subtitle={c.description} variant="tile" />
                  <div className="flex flex-1 flex-col p-4">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="line-clamp-2 font-semibold text-slate-900">
                        {c.title}
                      </h3>
                      <span
                        className={`shrink-0 rounded-full border px-2 py-0.5 text-xs ${statusColor(c.status)}`}
                      >
                        {prettyStatus(c.status)}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm text-slate-500">
                      {c.description}
                    </p>
                    <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                      <span>{c.estimated_minutes} min</span>
                      <span>Due {formatDate(c.due_date)}</span>
                    </div>
                    <div className="mt-auto pt-3">
                      <Link
                        to={`/learner/courses/${c.course_id}?assignment=${c.assignment_id}`}
                      >
                        <Button size="sm" className="w-full">
                          {c.status === "completed"
                            ? "Review"
                            : c.status === "in_progress"
                              ? "Continue"
                              : "Start course"}
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {activeChallenges.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
              <ShieldAlert className="mr-2 inline h-4 w-4 text-rose-600" />
              Security challenges
            </CardTitle>
            <Badge tone="danger">{activeChallenges.length}</Badge>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2">
              {activeChallenges.map((c) => (
                <Link
                  key={c.id}
                  to={`/learner/security-challenge/${c.id}`}
                  className="group flex items-start justify-between gap-3 rounded-2xl border border-rose-100 bg-rose-50/40 p-4 transition hover:border-rose-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300"
                >
                  <div className="flex items-start gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-amber-500 text-white">
                      <FishSymbol className="h-5 w-5" />
                    </span>
                    <div>
                      <div className="font-semibold text-slate-900">
                        {c.title}
                      </div>
                      <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">
                        Simulated phishing message — pick the safest response.
                      </p>
                      <div className="mt-1 text-xs text-slate-400">
                        {c.test_type.replace("_", " ")} ·{" "}
                        {formatDate(c.created_at)}
                      </div>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 self-center text-rose-500 transition group-hover:translate-x-0.5" />
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>
            <Award className="mr-2 inline h-4 w-4" /> Certificates
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.certificates.length === 0 ? (
            <p className="text-sm text-slate-500">
              Complete a course with score 60+ to earn your first certificate.
            </p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {data.certificates.map((c) => (
                <Link
                  key={c.id}
                  to={`/learner/certificates/${c.certificate_id}`}
                  className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4 transition hover:border-emerald-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
                >
                  <div className="text-sm font-semibold text-emerald-700">
                    {c.course_title}
                  </div>
                  <div className="mt-1 text-xs text-emerald-600">
                    {formatDate(c.issued_at)} · {c.certificate_id}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

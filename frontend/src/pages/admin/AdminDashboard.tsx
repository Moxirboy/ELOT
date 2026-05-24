import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  BarChart,
  Bar,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import {
  Users,
  CheckCircle2,
  Sparkles,
  ShieldAlert,
  Hourglass,
  Award,
  ArrowUpRight,
  Download,
  Send,
} from "lucide-react";
import { Dashboard } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Empty } from "@/components/ui/Empty";
import { ReminderModal } from "@/components/admin/ReminderModal";
import { formatDate, riskColor } from "@/lib/utils";

const BAR_COLORS = ["#6366f1", "#8b5cf6", "#a855f7", "#10b981", "#f59e0b", "#ef4444"];

function downloadCompliance() {
  const baseURL =
    (import.meta.env.VITE_API_BASE_URL as string | undefined) ??
    "http://localhost:8000/api/v1";
  const token = localStorage.getItem("elot_token");
  fetch(`${baseURL}/dashboard/admin/export.csv`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
    .then((r) => {
      if (!r.ok) throw new Error("Export failed");
      return r.blob();
    })
    .then((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `elot-compliance-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    })
    .catch((err) => alert(`Could not export CSV: ${err.message}`));
}

const DEFAULT_REMINDER = `Hi team,

Our compliance dashboard flagged a few outstanding trainings. Please complete the assigned course by end of week — it only takes ~12 minutes.

Thanks,
ELOT AI`;

export function AdminDashboard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: Dashboard.admin,
  });
  const [reminderOpen, setReminderOpen] = useState(false);

  if (isLoading) {
    return <div className="text-slate-500">Loading dashboard…</div>;
  }
  if (error || !data) {
    return (
      <Empty
        title="Couldn't load dashboard"
        description="Check that the backend is running and the demo data has been seeded."
      />
    );
  }

  const completionPct = Math.round((data.completion_rate ?? 0) * 100);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Compliance Dashboard</h1>
          <p className="text-sm text-slate-500">
            Live view of your training programme across the company.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={downloadCompliance}>
            <Download className="h-4 w-4" /> Export CSV
          </Button>
          {data.overdue_count > 0 && (
            <Button variant="outline" onClick={() => setReminderOpen(true)}>
              <Send className="h-4 w-4" /> Remind {data.overdue_count} overdue
            </Button>
          )}
          <Link to="/admin/course-builder">
            <Button>
              <Sparkles className="h-4 w-4" /> Generate New Course
            </Button>
          </Link>
        </div>
      </div>

      <ReminderModal
        open={reminderOpen}
        onClose={() => setReminderOpen(false)}
        initialMessage={DEFAULT_REMINDER}
        initialSubject="Training reminder — ELOT AI"
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-6">
        <StatCard
          label="Employees"
          value={data.total_employees}
          icon={<Users className="h-5 w-5" />}
          tone="brand"
        />
        <StatCard
          label="Courses"
          value={data.total_courses}
          icon={<Sparkles className="h-5 w-5" />}
        />
        <StatCard
          label="Completion"
          value={`${completionPct}%`}
          icon={<CheckCircle2 className="h-5 w-5" />}
          tone="success"
        />
        <StatCard
          label="Avg Score"
          value={Math.round(data.average_score)}
          icon={<Award className="h-5 w-5" />}
        />
        <StatCard
          label="High-risk"
          value={data.high_risk_count}
          icon={<ShieldAlert className="h-5 w-5" />}
          tone="danger"
        />
        <StatCard
          label="Overdue"
          value={data.overdue_count}
          icon={<Hourglass className="h-5 w-5" />}
          tone="warning"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Department performance</CardTitle>
            <Badge tone="brand">Live</Badge>
          </CardHeader>
          <CardContent>
            <div className="h-72 w-full">
              <ResponsiveContainer>
                <BarChart
                  data={data.department_stats.map((d) => ({
                    name: d.department,
                    completion: Math.round(d.completion_rate * 100),
                    score: Math.round(d.average_score),
                  }))}
                  margin={{ top: 10, right: 16, bottom: 0, left: -8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={12} domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0" }}
                    formatter={(v: number, k) => [`${v}${k === "score" ? "" : "%"}`, k]}
                  />
                  <Bar dataKey="completion" radius={[8, 8, 0, 0]}>
                    {data.department_stats.map((_, i) => (
                      <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Weakest topics</CardTitle>
          </CardHeader>
          <CardContent>
            {data.weakest_topics.length === 0 ? (
              <div className="text-sm text-slate-500">Not enough data yet.</div>
            ) : (
              <ul className="space-y-3">
                {data.weakest_topics.slice(0, 5).map((t) => (
                  <li key={t.topic} className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-slate-900">{t.topic}</div>
                      <div className="text-xs text-slate-500">
                        {t.attempts} attempts
                      </div>
                    </div>
                    <Badge
                      tone={
                        t.average_score < 60
                          ? "danger"
                          : t.average_score < 75
                            ? "warning"
                            : "success"
                      }
                    >
                      avg {Math.round(t.average_score)}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent completions</CardTitle>
          <Link to="/admin/assignments" className="text-sm font-medium text-brand-600 hover:underline">
            View all <ArrowUpRight className="ml-0.5 inline h-3.5 w-3.5" />
          </Link>
        </CardHeader>
        <CardContent>
          {data.recent_completions.length === 0 ? (
            <Empty
              title="No completions yet"
              description="Recent activity will appear here once employees complete their courses."
            />
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-100">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-2">Employee</th>
                    <th className="px-4 py-2">Course</th>
                    <th className="px-4 py-2">Completed</th>
                    <th className="px-4 py-2">Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.recent_completions.map((c, i) => (
                    <tr key={i}>
                      <td className="px-4 py-3 font-medium text-slate-900">{c.employee_name}</td>
                      <td className="px-4 py-3 text-slate-700">{c.course_title}</td>
                      <td className="px-4 py-3 text-slate-500">{formatDate(c.completed_at)}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full border px-2 py-0.5 text-xs font-medium ${riskColor(
                            c.score >= 80 ? "low" : c.score >= 60 ? "medium" : "high",
                          )}`}
                        >
                          {c.score}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  AlertOctagon,
  CheckCircle2,
  Radar,
  ShieldAlert,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Link } from "react-router-dom";
import { SecurityDashboard as Sec } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { Badge } from "@/components/ui/Badge";
import { Empty } from "@/components/ui/Empty";
import { Button } from "@/components/ui/Button";
import { riskColor } from "@/lib/utils";

const COLORS = ["#6366f1", "#a855f7", "#10b981", "#f59e0b", "#ef4444", "#0ea5e9"];

export function SecurityDashboardPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["security-awareness"],
    queryFn: Sec.awareness,
  });

  if (isLoading) {
    return <div className="text-slate-500">Loading…</div>;
  }
  if (error || !data) {
    return (
      <Empty
        title="Could not load the dashboard"
        description="Backend may be unreachable."
      />
    );
  }

  const correctPct = Math.round(data.correct_rate * 100);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            <ShieldCheck className="mr-2 inline h-6 w-6 text-emerald-600" />
            Security Awareness
          </h1>
          <p className="text-sm text-slate-500">
            How your team responds to in-app phishing challenges.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/admin/threat-intelligence">
            <Button variant="outline">
              <Radar className="h-4 w-4" /> Threats
            </Button>
          </Link>
          <Link to="/admin/phishing-tests">
            <Button>
              <ShieldAlert className="h-4 w-4" /> Phishing tests
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-6">
        <StatCard
          label="Active trends"
          value={data.active_trends}
          icon={<Radar className="h-5 w-5" />}
          tone="brand"
        />
        <StatCard
          label="Trainings drafted"
          value={data.drafts}
          icon={<ShieldAlert className="h-5 w-5" />}
        />
        <StatCard
          label="Trainings published"
          value={data.published_trainings}
          icon={<ShieldCheck className="h-5 w-5" />}
          tone="success"
        />
        <StatCard
          label="Tests run"
          value={data.tests_run}
          icon={<Activity className="h-5 w-5" />}
        />
        <StatCard
          label="Correct rate"
          value={`${correctPct}%`}
          icon={<CheckCircle2 className="h-5 w-5" />}
          tone={correctPct >= 70 ? "success" : correctPct >= 50 ? "warning" : "danger"}
        />
        <StatCard
          label="Avg score"
          value={Math.round(data.average_response_score)}
          icon={<Activity className="h-5 w-5" />}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Department response</CardTitle>
            <Badge tone="brand">Live</Badge>
          </CardHeader>
          <CardContent>
            {data.department_stats.length === 0 ? (
              <p className="text-sm text-slate-500">
                No responses yet. Roll out a phishing test to start collecting data.
              </p>
            ) : (
              <div className="h-72 w-full">
                <ResponsiveContainer>
                  <BarChart
                    data={data.department_stats.map((d) => ({
                      name: d.department,
                      correct: d.correct,
                      risky: d.risky,
                    }))}
                    margin={{ top: 10, right: 16, bottom: 0, left: -8 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#e2e8f0"
                      vertical={false}
                    />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
                    <YAxis stroke="#64748b" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        borderRadius: 12,
                        border: "1px solid #e2e8f0",
                      }}
                    />
                    <Bar dataKey="correct" radius={[6, 6, 0, 0]} stackId="x" fill="#10b981" />
                    <Bar dataKey="risky" radius={[6, 6, 0, 0]} stackId="x" fill="#ef4444" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              <AlertOctagon className="mr-2 inline h-4 w-4 text-rose-600" />
              Weakest methods
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.weak_methods.length === 0 ? (
              <p className="text-sm text-slate-500">
                No data yet. Run an in-app phishing test to see which attack
                methods your team handles worst.
              </p>
            ) : (
              <ul className="space-y-2 text-sm">
                {data.weak_methods.map((m, i) => (
                  <li
                    key={m.method}
                    className="flex items-center justify-between rounded-xl border border-slate-100 p-3"
                  >
                    <div>
                      <div className="font-medium text-slate-900">
                        {m.method}
                      </div>
                      <div className="text-xs text-slate-500">
                        {m.correct} correct · {m.risky} risky
                      </div>
                    </div>
                    <span
                      className="inline-flex h-2 w-16 overflow-hidden rounded-full bg-slate-100"
                      aria-hidden="true"
                    >
                      <span
                        className="block"
                        style={{
                          width: `${Math.min(
                            100,
                            (m.risky / Math.max(1, m.risky + m.correct)) * 100,
                          )}%`,
                          background: COLORS[i % COLORS.length],
                        }}
                      />
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            <XCircle className="mr-2 inline h-4 w-4 text-rose-600" />
            Riskiest employees
          </CardTitle>
          <Badge tone="danger">{data.riskiest_employees.length}</Badge>
        </CardHeader>
        <CardContent>
          {data.riskiest_employees.length === 0 ? (
            <p className="text-sm text-slate-500">
              No risky responses on file. 🎉
            </p>
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-100">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-2">Employee</th>
                    <th className="px-4 py-2">Department</th>
                    <th className="px-4 py-2">Risk</th>
                    <th className="px-4 py-2">Correct</th>
                    <th className="px-4 py-2">Risky</th>
                    <th className="px-4 py-2">Avg score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.riskiest_employees.map((e) => (
                    <tr key={e.employee_id}>
                      <td className="px-4 py-2 font-medium text-slate-900">
                        {e.name}
                      </td>
                      <td className="px-4 py-2 text-slate-700">
                        {e.department}
                      </td>
                      <td className="px-4 py-2">
                        <span
                          className={`rounded-full border px-2 py-0.5 text-xs capitalize ${riskColor(e.risk_level)}`}
                        >
                          {e.risk_level}
                        </span>
                      </td>
                      <td className="px-4 py-2">{e.correct_actions}</td>
                      <td className="px-4 py-2 text-rose-700">{e.risky_actions}</td>
                      <td className="px-4 py-2">{Math.round(e.average_score)}</td>
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

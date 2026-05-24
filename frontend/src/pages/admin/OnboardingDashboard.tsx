import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  ChevronRight,
  Rocket,
  ShieldCheck,
  TrendingDown,
} from "lucide-react";
import { Hiring } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { Empty } from "@/components/ui/Empty";
import { Badge } from "@/components/ui/Badge";
import { Progress } from "@/components/ui/Progress";
import { prettyStatus } from "@/lib/utils";

export function OnboardingDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["onboarding-readiness"],
    queryFn: Hiring.onboardingReadiness,
  });

  if (isLoading) return <div className="text-slate-500">Loading…</div>;
  if (!data) {
    return (
      <Empty
        title="Onboarding hasn't started yet"
        description="Mark a candidate as hired to create their onboarding plan automatically."
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            <Rocket className="mr-2 inline h-6 w-6 text-brand-600" />
            Onboarding
          </h1>
          <p className="text-sm text-slate-500">
            New hires, readiness score, and which onboarding topics need
            attention.
          </p>
        </div>
        <Link to="/admin/hiring/candidates">
          <Badge tone="brand">From hiring →</Badge>
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Active onboardings"
          value={data.total_onboardings}
          icon={<Rocket className="h-5 w-5" />}
          tone="brand"
        />
        <StatCard
          label="Avg readiness"
          value={Math.round(data.avg_readiness)}
          icon={<ShieldCheck className="h-5 w-5" />}
          tone={
            data.avg_readiness >= 80
              ? "success"
              : data.avg_readiness >= 60
                ? "warning"
                : "danger"
          }
        />
        <StatCard
          label="Weak topics"
          value={data.weak_topics.length}
          icon={<TrendingDown className="h-5 w-5" />}
        />
        <StatCard
          label="Employees in plan"
          value={data.employees.length}
          icon={<Rocket className="h-5 w-5" />}
        />
      </div>

      {data.weak_topics.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
              <TrendingDown className="mr-2 inline h-4 w-4 text-rose-600" />
              Weakest onboarding topics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="grid gap-2 md:grid-cols-3">
              {data.weak_topics.map((t) => (
                <li
                  key={t.topic}
                  className="rounded-xl border border-slate-100 p-3 text-sm"
                >
                  <div className="text-xs uppercase tracking-wide text-slate-500">
                    {prettyStatus(t.topic)}
                  </div>
                  <div className="mt-1 text-lg font-semibold text-slate-900">
                    avg {Math.round(t.average_score)}
                  </div>
                  <div className="text-xs text-slate-500">
                    {t.incidents} low-score completion(s)
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>New hires</CardTitle>
          <Badge tone="brand">{data.employees.length}</Badge>
        </CardHeader>
        <CardContent>
          {data.employees.length === 0 ? (
            <Empty
              title="No onboardings yet"
              description="Mark a candidate as hired to auto-create their onboarding plan."
              action={
                <Link to="/admin/hiring/candidates">
                  <Badge tone="brand">Open candidates</Badge>
                </Link>
              }
            />
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-100">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-2">Employee</th>
                    <th className="px-4 py-2">Department</th>
                    <th className="px-4 py-2">Plan</th>
                    <th className="px-4 py-2">Progress</th>
                    <th className="px-4 py-2">Avg score</th>
                    <th className="px-4 py-2">Readiness</th>
                    <th className="px-4 py-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.employees.map((e) => (
                    <tr key={e.employee_id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-2 font-medium text-slate-900">
                        {e.name}
                      </td>
                      <td className="px-4 py-2 text-slate-700">{e.department}</td>
                      <td className="px-4 py-2 text-slate-600">{e.title}</td>
                      <td className="px-4 py-2 w-40">
                        <div className="flex items-center gap-2">
                          <Progress
                            value={
                              e.modules_total
                                ? (e.modules_completed / e.modules_total) * 100
                                : 0
                            }
                            className="w-20"
                          />
                          <span className="text-xs text-slate-500">
                            {e.modules_completed}/{e.modules_total}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-2">{e.average_score || "—"}</td>
                      <td className="px-4 py-2 font-semibold text-slate-900">
                        {e.readiness_score || "—"}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <Link
                          to={`/admin/onboarding/${e.employee_id}`}
                          className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:underline"
                        >
                          Open <ChevronRight className="h-3.5 w-3.5" />
                        </Link>
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

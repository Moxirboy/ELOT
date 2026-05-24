import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Users } from "lucide-react";
import { OnboardingOS } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Empty } from "@/components/ui/Empty";
import { Button } from "@/components/ui/Button";
import { formatDate, formatDateTime, riskColor } from "@/lib/utils";

export function BuddyNewHires() {
  const { user } = useAuth();
  const employeeId = user?.employee_id;
  const dash = useQuery({
    queryKey: ["buddy-dash", employeeId],
    queryFn: () => OnboardingOS.buddyDashboard(employeeId!),
    enabled: !!employeeId,
  });

  if (dash.isLoading) return <div className="text-slate-500">Loading…</div>;
  if (!dash.data) return <Empty title="No buddy data" />;

  const d = dash.data;
  const lastByInst = (d.last_checkin_by_instance ?? {}) as Record<
    string,
    string | null
  >;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          <Users className="mr-2 inline h-6 w-6 text-pink-500" /> Assigned new
          hires
        </h1>
        <p className="text-sm text-slate-500">
          Every active onboarding where you're listed as the buddy.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>People paired with you</CardTitle>
          <Badge tone="brand">{d.new_hires.length}</Badge>
        </CardHeader>
        <CardContent>
          {d.new_hires.length === 0 ? (
            <Empty
              title="Nothing assigned yet"
              description="HR will let you know when you're paired with a new hire."
            />
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-100">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-2">Employee</th>
                    <th className="px-4 py-2">Role</th>
                    <th className="px-4 py-2">Department</th>
                    <th className="px-4 py-2">Start date</th>
                    <th className="px-4 py-2">Stage</th>
                    <th className="px-4 py-2">Last check-in</th>
                    <th className="px-4 py-2">Risk</th>
                    <th className="px-4 py-2">Status</th>
                    <th className="px-4 py-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {d.new_hires.map((c) => {
                    const last = lastByInst[String(c.id)];
                    return (
                      <tr key={c.id}>
                        <td className="px-4 py-3 font-medium text-slate-900">
                          {c.employee_name}
                        </td>
                        <td className="px-4 py-3 text-slate-700">{c.role_name}</td>
                        <td className="px-4 py-3 text-slate-700">{c.department}</td>
                        <td className="px-4 py-3 text-xs text-slate-500">
                          {formatDate(c.start_date)}
                        </td>
                        <td className="px-4 py-3 capitalize">
                          {c.current_stage.replace("_", " ")}
                        </td>
                        <td className="px-4 py-3 text-xs">
                          {last ? (
                            <span className="text-slate-700">
                              {formatDateTime(last)}
                            </span>
                          ) : (
                            <span className="text-rose-600">never</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded-full border px-2 py-0.5 text-xs capitalize ${riskColor(c.risk_level)}`}
                          >
                            {c.risk_level}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs capitalize text-slate-500">
                          {c.status.replace("_", " ")}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link to={`/buddy/new-hires/${c.id}`}>
                            <Button size="sm" variant="outline">
                              Open <ArrowRight className="h-4 w-4" />
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

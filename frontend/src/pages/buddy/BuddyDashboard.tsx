import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  AlertOctagon,
  ArrowRight,
  CheckCircle2,
  Hand,
  HandHelping,
  Heart,
  Sparkles,
  Users,
} from "lucide-react";
import { OnboardingOS } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { Badge } from "@/components/ui/Badge";
import { Empty } from "@/components/ui/Empty";
import { Button } from "@/components/ui/Button";
import { formatDate, formatDateTime, riskColor } from "@/lib/utils";

export function BuddyDashboard() {
  const { user } = useAuth();
  const employeeId = user?.employee_id;

  const dash = useQuery({
    queryKey: ["buddy-dash", employeeId],
    queryFn: () => OnboardingOS.buddyDashboard(employeeId!),
    enabled: !!employeeId,
  });
  const help = useQuery({
    queryKey: ["buddy-help-open"],
    queryFn: () => OnboardingOS.listHelpRequests({ target_role: "buddy", status: "open" }),
  });

  if (!employeeId) {
    return (
      <Empty
        title="No employee record linked"
        description="Ask HR to link your account to an Employee row."
      />
    );
  }
  if (dash.isLoading) return <div className="text-slate-500">Loading…</div>;
  if (!dash.data) return <Empty title="Could not load buddy dashboard" />;

  const d = dash.data;
  const lastByInst = (d.last_checkin_by_instance ?? {}) as Record<
    string,
    string | null
  >;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            <Hand className="mr-2 inline h-6 w-6 text-pink-500" />
            Welcome, {d.buddy_name.split(" ")[0]}
          </h1>
          <p className="text-sm text-slate-500">
            People paired with you, plus your most recent check-ins.
          </p>
        </div>
        <Link to="/buddy/check-ins/new">
          <Button>
            <Sparkles className="h-4 w-4" /> Log a check-in
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <StatCard
          label="New hires"
          value={d.new_hires.length}
          icon={<Users className="h-5 w-5" />}
          tone="brand"
        />
        <StatCard
          label="Check-ins logged"
          value={d.recent_checkins.length}
          icon={<CheckCircle2 className="h-5 w-5" />}
          tone="success"
        />
        <StatCard
          label="Help requests"
          value={help.data?.length ?? 0}
          icon={<HandHelping className="h-5 w-5" />}
          tone={help.data && help.data.length > 0 ? "warning" : "default"}
        />
        <StatCard
          label="At-risk"
          value={d.at_risk_hires}
          icon={<AlertOctagon className="h-5 w-5" />}
          tone={d.at_risk_hires > 0 ? "danger" : "success"}
        />
        <StatCard
          label="Open help"
          value={d.open_help_requests}
          icon={<Heart className="h-5 w-5" />}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your paired new hires</CardTitle>
          <Badge>{d.new_hires.length}</Badge>
        </CardHeader>
        <CardContent>
          {d.new_hires.length === 0 ? (
            <Empty
              title="No one paired with you yet"
              description="HR hasn't assigned you as a buddy on any active onboarding."
            />
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-100">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-2">Employee</th>
                    <th className="px-4 py-2">Role</th>
                    <th className="px-4 py-2">Department</th>
                    <th className="px-4 py-2">Stage</th>
                    <th className="px-4 py-2">Last check-in</th>
                    <th className="px-4 py-2">Risk</th>
                    <th className="px-4 py-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {d.new_hires.map((c) => {
                    const last = lastByInst[String(c.id)];
                    return (
                      <tr key={c.id}>
                        <td className="px-4 py-3 font-medium text-slate-900">
                          <Link
                            to={`/buddy/new-hires/${c.id}`}
                            className="hover:text-pink-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-300"
                          >
                            {c.employee_name}
                          </Link>
                          <div className="text-xs text-slate-500">
                            started {formatDate(c.start_date)}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-700">{c.role_name}</td>
                        <td className="px-4 py-3 text-slate-700">{c.department}</td>
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

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent check-ins</CardTitle>
            <Link
              to="/buddy/check-ins"
              className="text-xs font-medium text-pink-600 hover:underline"
            >
              See all →
            </Link>
          </CardHeader>
          <CardContent>
            {d.recent_checkins.length === 0 ? (
              <p className="text-sm text-slate-500">
                Nothing yet — log your first check-in.
              </p>
            ) : (
              <ul className="space-y-2 text-sm">
                {d.recent_checkins.slice(0, 5).map((c) => (
                  <li key={c.id} className="rounded-xl border border-slate-100 p-3">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>
                        Instance #{c.instance_id} ·{" "}
                        {formatDateTime(c.created_at)}
                      </span>
                      <span>
                        culture {c.culture_score}/5 · connection{" "}
                        {c.connection_score}/5
                      </span>
                    </div>
                    <p className="mt-1 text-slate-800">{c.comment}</p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              <HandHelping className="mr-2 inline h-4 w-4 text-pink-500" /> Help
              requests
            </CardTitle>
            <Link
              to="/buddy/help-requests"
              className="text-xs font-medium text-pink-600 hover:underline"
            >
              See all →
            </Link>
          </CardHeader>
          <CardContent>
            {help.isLoading ? (
              <p className="text-sm text-slate-500">Loading…</p>
            ) : !help.data || help.data.length === 0 ? (
              <p className="text-sm text-slate-500">No open help requests 🎉</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {help.data.slice(0, 4).map((h) => (
                  <li
                    key={h.id}
                    className="rounded-xl border border-slate-100 p-3"
                  >
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>{h.employee_name}</span>
                      <span className="capitalize">{h.priority} priority</span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-slate-800">
                      {h.message}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

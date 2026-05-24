import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Plus } from "lucide-react";
import { OnboardingOS } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Empty } from "@/components/ui/Empty";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { formatDateTime } from "@/lib/utils";

export function BuddyCheckIns() {
  const { user } = useAuth();
  const employeeId = user?.employee_id;
  const dash = useQuery({
    queryKey: ["buddy-dash", employeeId],
    queryFn: () => OnboardingOS.buddyDashboard(employeeId!),
    enabled: !!employeeId,
  });

  if (dash.isLoading) return <div className="text-slate-500">Loading…</div>;
  if (!dash.data) return <Empty title="No data" />;

  const d = dash.data;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            <CheckCircle2 className="mr-2 inline h-6 w-6 text-pink-500" />{" "}
            Check-ins
          </h1>
          <p className="text-sm text-slate-500">
            Every check-in you've logged across your paired new hires.
          </p>
        </div>
        <Link to="/buddy/check-ins/new">
          <Button>
            <Plus className="h-4 w-4" /> New check-in
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All check-ins</CardTitle>
          <Badge>{d.recent_checkins.length}</Badge>
        </CardHeader>
        <CardContent>
          {d.recent_checkins.length === 0 ? (
            <Empty
              title="Nothing logged yet"
              description="Log your first check-in to start building a culture record."
              action={
                <Link to="/buddy/check-ins/new">
                  <Button>
                    <Plus className="h-4 w-4" /> Log a check-in
                  </Button>
                </Link>
              }
            />
          ) : (
            <ul className="space-y-3">
              {d.recent_checkins.map((c) => (
                <li
                  key={c.id}
                  className="rounded-xl border border-slate-100 p-3 text-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                    <Link
                      to={`/buddy/new-hires/${c.instance_id}`}
                      className="font-medium text-pink-700 hover:underline"
                    >
                      Instance #{c.instance_id}
                    </Link>
                    <span>{formatDateTime(c.created_at)}</span>
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    culture {c.culture_score}/5 · connection{" "}
                    {c.connection_score}/5
                  </div>
                  <p className="mt-2 text-slate-800">{c.comment}</p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

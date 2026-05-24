import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  AlertOctagon,
  Briefcase,
  CheckCircle2,
  ClipboardCheck,
  Compass,
  Hourglass,
  Plus,
  ShieldCheck,
  Sparkles,
  Smile,
} from "lucide-react";
import { OnboardingOS, type OnbInstanceCard } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Empty } from "@/components/ui/Empty";
import { formatDate, prettyStatus, riskColor, statusColor } from "@/lib/utils";

export function HRDashboardOS() {
  const { data, isLoading } = useQuery({
    queryKey: ["os-hr"],
    queryFn: OnboardingOS.hrDashboard,
  });

  if (isLoading) return <div className="text-slate-500">Loading…</div>;
  if (!data)
    return (
      <Empty
        title="Could not load HR dashboard"
        description="Backend may be unreachable."
      />
    );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            <Compass className="mr-2 inline h-6 w-6 text-brand-600" />
            Onboarding OS — HR
          </h1>
          <p className="text-sm text-slate-500">
            Live view of every onboarding instance, owner chain and risk signal.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link to="/admin/onboarding-os/templates">
            <Button variant="outline">
              <ClipboardCheck className="h-4 w-4" /> Templates
            </Button>
          </Link>
          <Link to="/admin/onboarding-os/instances/new">
            <Button>
              <Plus className="h-4 w-4" /> New onboarding
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-6">
        <StatCard
          label="Active"
          value={data.total_active}
          icon={<Briefcase className="h-5 w-5" />}
          tone="brand"
        />
        <StatCard
          label="Completed"
          value={data.completed}
          icon={<CheckCircle2 className="h-5 w-5" />}
          tone="success"
        />
        <StatCard
          label="Avg progress"
          value={`${data.average_progress}%`}
          icon={<Sparkles className="h-5 w-5" />}
        />
        <StatCard
          label="Avg readiness"
          value={Math.round(data.average_readiness)}
          icon={<ShieldCheck className="h-5 w-5" />}
        />
        <StatCard
          label="High risk"
          value={data.high_risk_count}
          icon={<AlertOctagon className="h-5 w-5" />}
          tone={data.high_risk_count > 0 ? "danger" : "default"}
        />
        <StatCard
          label="Overdue tasks"
          value={data.overdue_tasks}
          icon={<Hourglass className="h-5 w-5" />}
          tone={data.overdue_tasks > 0 ? "warning" : "default"}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="p-4">
          <div className="text-xs uppercase text-slate-500">
            Compliance completion
          </div>
          <div className="mt-1 text-2xl font-bold text-slate-900">
            {Math.round(data.compliance_completion_rate * 100)}%
          </div>
          <div className="text-xs text-slate-500">
            Across every compliance task on every live instance.
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-xs uppercase text-slate-500">
            Reviews pending
          </div>
          <div className="mt-1 text-2xl font-bold text-slate-900">
            {data.manager_reviews_pending} <span className="text-slate-400">manager</span>{" "}
            · {data.supervisor_reviews_pending}{" "}
            <span className="text-slate-400">supervisor</span>
          </div>
          <div className="text-xs text-slate-500">
            Open 30/60/90 reviews + practical tasks awaiting sign-off.
          </div>
        </Card>
        <BuddyTrackingCard instances={data.instances} />
        <ITTrackingCard instances={data.instances} />
        <Card className="p-4 xl:col-span-2">
          <div className="text-xs uppercase text-slate-500">
            <Smile className="mr-1 inline h-3.5 w-3.5" /> Employee self-rating
          </div>
          <div className="mt-1 text-2xl font-bold text-slate-900">
            {data.employee_satisfaction.toFixed(2)} / 5
          </div>
          <div className="text-xs text-slate-500">
            Confidence + clarity + support averaged across self-feedback.
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Active onboardings</CardTitle>
          <Badge>{data.instances.length}</Badge>
        </CardHeader>
        <CardContent>
          {data.instances.length === 0 ? (
            <Empty
              icon={<Briefcase className="h-5 w-5" />}
              title="No onboardings yet"
              description="Start by creating an onboarding instance for a new hire."
              action={
                <Link to="/admin/onboarding-os/instances/new">
                  <Button>
                    <Plus className="h-4 w-4" /> Create onboarding
                  </Button>
                </Link>
              }
            />
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-100">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-2">Employee</th>
                    <th className="px-4 py-2">Role</th>
                    <th className="px-4 py-2">Stage</th>
                    <th className="px-4 py-2">Progress</th>
                    <th className="px-4 py-2">Risk</th>
                    <th className="px-4 py-2">Manager</th>
                    <th className="px-4 py-2">Started</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.instances.map((c) => (
                    <InstanceRow key={c.id} c={c} />
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

function InstanceRow({ c }: { c: OnbInstanceCard }) {
  return (
    <tr className="hover:bg-slate-50/60">
      <td className="px-4 py-3 font-medium text-slate-900">
        <Link
          to={`/admin/onboarding-os/instances/${c.id}`}
          className="hover:text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
        >
          {c.employee_name ?? `#${c.employee_id}`}
        </Link>
        <div className="text-xs text-slate-500">{c.department}</div>
      </td>
      <td className="px-4 py-3 text-slate-700">{c.role_name}</td>
      <td className="px-4 py-3">
        <span
          className={`rounded-full border px-2 py-0.5 text-xs capitalize ${statusColor(
            "in_progress",
          )}`}
        >
          {c.current_stage.replace("_", " ")}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full bg-gradient-to-r from-brand-500 to-accent-500"
              style={{ width: `${Math.min(100, c.overall_progress)}%` }}
            />
          </div>
          <span className="text-xs text-slate-600">{c.overall_progress}%</span>
        </div>
        <div className="mt-1 text-[11px] text-slate-500">
          {c.open_tasks} open · {c.overdue_tasks} overdue
        </div>
      </td>
      <td className="px-4 py-3">
        <span
          className={`rounded-full border px-2 py-0.5 text-xs capitalize ${riskColor(c.risk_level)}`}
        >
          {c.risk_level} · readiness {c.readiness_score}
        </span>
      </td>
      <td className="px-4 py-3 text-slate-700">{c.manager_name ?? "—"}</td>
      <td className="px-4 py-3 text-xs text-slate-500">
        {formatDate(c.start_date)}
        <div className="text-[11px] text-slate-400">
          status: {prettyStatus(c.status)}
        </div>
      </td>
    </tr>
  );
}

// ---------------------------------------------------------------------------
// Buddy + IT tracking summary tiles (PART 6)
// ---------------------------------------------------------------------------
function BuddyTrackingCard({
  instances,
}: {
  instances: OnbInstanceCard[];
}) {
  const missing = instances.filter((i) => !i.buddy_name).length;
  const checkinOverdue = instances.filter(
    (i) => i.risk_level === "medium" || i.risk_level === "high",
  ).length;
  const open = useQuery({
    queryKey: ["help-open"],
    queryFn: () =>
      OnboardingOS.listHelpRequests({ status: "open" }),
  });
  return (
    <Card className="p-4">
      <div className="text-xs uppercase text-slate-500">Buddy tracking</div>
      <div className="mt-1 flex items-baseline gap-3 text-2xl font-bold text-slate-900">
        {instances.length - missing}
        <span className="text-sm font-normal text-slate-500">/ {instances.length} paired</span>
      </div>
      <div className="mt-1 text-xs text-slate-500">
        {missing > 0 && (
          <span className="mr-2 inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-rose-700">
            {missing} missing buddy
          </span>
        )}
        {checkinOverdue > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-amber-700">
            {checkinOverdue} check-in overdue
          </span>
        )}
        {open.data && open.data.length > 0 && (
          <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-pink-50 px-2 py-0.5 text-pink-700">
            {open.data.length} open help requests
          </span>
        )}
      </div>
    </Card>
  );
}

function ITTrackingCard({
  instances,
}: {
  instances: OnbInstanceCard[];
}) {
  const blocked = useQuery({
    queryKey: ["it-blocked"],
    queryFn: OnboardingOS.itTasksBlocked,
  });
  const overdue = useQuery({
    queryKey: ["it-overdue"],
    queryFn: OnboardingOS.itTasksOverdue,
  });
  const missing = instances.filter((i) => !i.it_owner_id).length;
  return (
    <Card className="p-4">
      <div className="text-xs uppercase text-slate-500">IT setup</div>
      <div className="mt-1 flex items-baseline gap-3 text-2xl font-bold text-slate-900">
        {instances.length - missing}
        <span className="text-sm font-normal text-slate-500">/ {instances.length} owned</span>
      </div>
      <div className="mt-1 text-xs text-slate-500">
        {missing > 0 && (
          <span className="mr-2 inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-rose-700">
            {missing} missing IT owner
          </span>
        )}
        {blocked.data && blocked.data.length > 0 && (
          <span className="mr-2 inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-rose-700">
            {blocked.data.length} blocked
          </span>
        )}
        {overdue.data && overdue.data.length > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-amber-700">
            {overdue.data.length} overdue
          </span>
        )}
      </div>
    </Card>
  );
}

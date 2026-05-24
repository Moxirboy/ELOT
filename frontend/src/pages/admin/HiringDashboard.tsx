import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  Briefcase,
  ChevronRight,
  GraduationCap,
  ShieldCheck,
  Sparkles,
  UserPlus,
  Users,
} from "lucide-react";
import { Hiring } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { StatCard } from "@/components/ui/StatCard";
import { Empty } from "@/components/ui/Empty";
import { Button } from "@/components/ui/Button";
import { formatDateTime, prettyStatus, statusColor } from "@/lib/utils";

export function HiringDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["hiring-dashboard"],
    queryFn: Hiring.dashboard,
  });

  if (isLoading) return <div className="text-slate-500">Loading…</div>;
  if (!data) {
    return (
      <Empty
        title="No hiring data yet"
        description="Create your first role to start the hiring pipeline."
        action={
          <Link to="/admin/hiring/roles/new">
            <Button>
              <Sparkles className="h-4 w-4" /> Create role
            </Button>
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            <Briefcase className="mr-2 inline h-6 w-6 text-brand-600" />
            Hiring Dashboard
          </h1>
          <p className="text-sm text-slate-500">
            Open roles, candidate pipeline, AI interview activity, and readiness signals.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link to="/admin/hiring/roles">
            <Button variant="outline">
              <GraduationCap className="h-4 w-4" /> Roles
            </Button>
          </Link>
          <Link to="/admin/hiring/candidates">
            <Button variant="outline">
              <Users className="h-4 w-4" /> Candidates
            </Button>
          </Link>
          <Link to="/admin/hiring/roles/new">
            <Button>
              <Sparkles className="h-4 w-4" /> New role
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard
          label="Open roles"
          value={data.total_roles}
          icon={<Briefcase className="h-5 w-5" />}
          tone="brand"
        />
        <StatCard
          label="Candidates"
          value={data.total_candidates}
          icon={<UserPlus className="h-5 w-5" />}
        />
        <StatCard
          label="Avg readiness"
          value={Math.round(data.avg_readiness)}
          icon={<Sparkles className="h-5 w-5" />}
        />
        <StatCard
          label="Ready for HR"
          value={data.ready_for_hr_interview}
          icon={<ShieldCheck className="h-5 w-5" />}
          tone="success"
        />
        <StatCard
          label="Needs review"
          value={data.needs_review}
          icon={<UserPlus className="h-5 w-5" />}
          tone="warning"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Pipeline</CardTitle>
          </CardHeader>
          <CardContent>
            {data.pipeline.length === 0 ? (
              <p className="text-sm text-slate-500">No candidates yet.</p>
            ) : (
              <ul className="space-y-2">
                {data.pipeline.map((p) => (
                  <li
                    key={p.status}
                    className="flex items-center justify-between rounded-xl border border-slate-100 p-3 text-sm"
                  >
                    <span
                      className={`rounded-full border px-2 py-0.5 text-xs ${statusColor(p.status)}`}
                    >
                      {prettyStatus(p.status)}
                    </span>
                    <span className="font-semibold text-slate-900">{p.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent AI interviews</CardTitle>
            <Badge tone="brand">Last 5</Badge>
          </CardHeader>
          <CardContent>
            {data.recent_ai_interviews.length === 0 ? (
              <p className="text-sm text-slate-500">
                No AI interviews yet. Candidates will appear here once they finish the chat interview.
              </p>
            ) : (
              <div className="overflow-hidden rounded-xl border border-slate-100">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-2">Candidate</th>
                      <th className="px-4 py-2">Score</th>
                      <th className="px-4 py-2">Recommendation</th>
                      <th className="px-4 py-2">When</th>
                      <th className="px-4 py-2"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.recent_ai_interviews.map((iv) => (
                      <tr key={iv.interview_id} className="hover:bg-slate-50/50">
                        <td className="px-4 py-2 font-medium text-slate-900">
                          {iv.candidate_name}
                        </td>
                        <td className="px-4 py-2">{iv.overall_score}</td>
                        <td className="px-4 py-2 text-slate-700">
                          {iv.recommendation
                            ? prettyStatus(iv.recommendation)
                            : "—"}
                        </td>
                        <td className="px-4 py-2 text-xs text-slate-500">
                          {formatDateTime(iv.created_at)}
                        </td>
                        <td className="px-4 py-2 text-right">
                          <Link
                            to={`/admin/hiring/candidates/${iv.candidate_id}`}
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

      <Card className="bg-amber-50/60 p-3 text-xs text-amber-800">
        <strong>Responsible AI:</strong> ELOT AI provides readiness recommendations to assist HR.
        Final hiring decisions are always made by humans. Protected attributes are never scored.
      </Card>
    </div>
  );
}

import { useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { ChevronRight, UserPlus, Users } from "lucide-react";
import { Hiring } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Empty } from "@/components/ui/Empty";
import { Button } from "@/components/ui/Button";
import { Progress } from "@/components/ui/Progress";
import { prettyStatus, statusColor } from "@/lib/utils";

export function CandidatesList() {
  const [params] = useSearchParams();
  const roleId = params.get("role_id") ? Number(params.get("role_id")) : undefined;
  const candidates = useQuery({
    queryKey: ["candidates", { role_id: roleId }],
    queryFn: () =>
      Hiring.listCandidates(roleId ? { role_id: roleId } : {}),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            <Users className="mr-2 inline h-6 w-6 text-brand-600" />
            Candidates
          </h1>
          <p className="text-sm text-slate-500">
            Every applicant in the pipeline. Click into one to review the AI
            scorecard, transcript, and next-step recommendation.
          </p>
        </div>
        <Link to="/admin/hiring/roles">
          <Button variant="outline">
            <UserPlus className="h-4 w-4" /> Add via role
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Candidate pipeline</CardTitle>
          <Badge tone="brand">{candidates.data?.length ?? 0}</Badge>
        </CardHeader>
        <CardContent>
          {candidates.isLoading ? (
            <div className="text-sm text-slate-500">Loading…</div>
          ) : !candidates.data || candidates.data.length === 0 ? (
            <Empty
              icon={<Users className="h-5 w-5" />}
              title="No candidates yet"
              description="Create a role and add your first candidate."
              action={
                <Link to="/admin/hiring/roles">
                  <Button>
                    <UserPlus className="h-4 w-4" /> Open roles
                  </Button>
                </Link>
              }
            />
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-100">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-2">Name</th>
                    <th className="px-4 py-2">Role</th>
                    <th className="px-4 py-2">Status</th>
                    <th className="px-4 py-2">Training</th>
                    <th className="px-4 py-2">AI score</th>
                    <th className="px-4 py-2">Readiness</th>
                    <th className="px-4 py-2">Recommendation</th>
                    <th className="px-4 py-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {candidates.data.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900">
                          {c.full_name}
                        </div>
                        <div className="text-xs text-slate-500">{c.email}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {c.role_title ?? `#${c.job_role_id}`}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full border px-2 py-0.5 text-xs ${statusColor(c.status)}`}
                        >
                          {prettyStatus(c.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3 w-40">
                        <div className="flex items-center gap-2">
                          <Progress value={c.training_progress} className="w-24" />
                          <span className="text-xs text-slate-500">
                            {c.training_progress}%
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        {c.ai_interview_score || "—"}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        {c.readiness_score || "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {c.recommendation
                          ? prettyStatus(c.recommendation)
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          to={`/admin/hiring/candidates/${c.id}`}
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

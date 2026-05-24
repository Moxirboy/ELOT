import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { GraduationCap, Plus, Trash2, Sparkles } from "lucide-react";
import { Hiring } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Empty } from "@/components/ui/Empty";
import { formatDateTime } from "@/lib/utils";

export function HiringRolesList() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["job-roles"],
    queryFn: Hiring.listRoles,
  });
  const remove = useMutation({
    mutationFn: (id: number) => Hiring.deleteRole(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["job-roles"] }),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            <GraduationCap className="mr-2 inline h-6 w-6 text-brand-600" />
            Job roles
          </h1>
          <p className="text-sm text-slate-500">
            One role = one AI-generated training, interview, scorecard, and onboarding plan.
          </p>
        </div>
        <Link to="/admin/hiring/roles/new">
          <Button>
            <Plus className="h-4 w-4" /> New role
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="text-sm text-slate-500">Loading…</div>
      ) : !data || data.length === 0 ? (
        <Empty
          icon={<GraduationCap className="h-5 w-5" />}
          title="No roles yet"
          description="Create your first role to start the hiring workflow."
          action={
            <Link to="/admin/hiring/roles/new">
              <Button>
                <Sparkles className="h-4 w-4" /> Create role
              </Button>
            </Link>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.map((r) => (
            <Card key={r.id} className="flex flex-col">
              <CardHeader>
                <div className="min-w-0">
                  <CardTitle>{r.title}</CardTitle>
                  <p className="mt-1 text-xs text-slate-500">
                    {r.department} · {r.seniority}
                  </p>
                </div>
                <Badge tone="brand">
                  {r.training_map_json?.length || 0} modules
                </Badge>
              </CardHeader>
              <CardContent className="flex-1">
                <p className="text-sm text-slate-600 line-clamp-3">
                  {r.role_profile_json?.summary || r.description || "—"}
                </p>
                <div className="mt-3 flex flex-wrap gap-1 text-xs">
                  {(r.required_skills_json ?? []).slice(0, 4).map((s, i) => (
                    <span
                      key={i}
                      className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-slate-700"
                    >
                      {s.name}
                    </span>
                  ))}
                </div>
              </CardContent>
              <div className="flex items-center justify-between border-t border-slate-100 p-4 text-xs">
                <Link
                  to={`/admin/hiring/roles/${r.id}`}
                  className="font-medium text-brand-600 hover:underline"
                >
                  Open role →
                </Link>
                <div className="flex items-center gap-2 text-slate-500">
                  <span>{formatDateTime(r.created_at)}</span>
                  <button
                    onClick={() => {
                      if (confirm(`Delete "${r.title}"?`)) remove.mutate(r.id);
                    }}
                    className="rounded-md p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                    aria-label={`Delete ${r.title}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

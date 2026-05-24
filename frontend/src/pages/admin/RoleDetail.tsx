import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Edit3,
  GraduationCap,
  Lightbulb,
  Plus,
  Trash2,
  UserPlus,
} from "lucide-react";
import { Hiring } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Field, Input, Textarea } from "@/components/ui/Input";
import { Empty } from "@/components/ui/Empty";
import { cn, riskColor } from "@/lib/utils";

export function RoleDetail() {
  const { id } = useParams();
  const roleId = Number(id);
  const navigate = useNavigate();
  const qc = useQueryClient();

  const role = useQuery({
    queryKey: ["job-role", roleId],
    queryFn: () => Hiring.getRole(roleId),
    enabled: !Number.isNaN(roleId),
  });
  const candidates = useQuery({
    queryKey: ["candidates", { role_id: roleId }],
    queryFn: () => Hiring.listCandidates({ role_id: roleId }),
    enabled: !Number.isNaN(roleId),
  });

  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newNotes, setNewNotes] = useState("");

  const create = useMutation({
    mutationFn: () =>
      Hiring.createCandidate({
        job_role_id: roleId,
        full_name: newName,
        email: newEmail,
        notes: newNotes,
      }),
    onSuccess: async (cand) => {
      await Hiring.assignTraining(cand.id).catch(() => {});
      qc.invalidateQueries({ queryKey: ["candidates"] });
      setAddOpen(false);
      setNewName("");
      setNewEmail("");
      setNewNotes("");
      navigate(`/admin/hiring/candidates/${cand.id}`);
    },
  });

  if (role.isLoading || !role.data) {
    return (
      <div>
        <Link
          to="/admin/hiring/roles"
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-brand-600"
        >
          <ArrowLeft className="h-4 w-4" /> Back to roles
        </Link>
        <div className="mt-4 text-sm text-slate-500">Loading role…</div>
      </div>
    );
  }

  const r = role.data;
  const profile = r.role_profile_json;

  return (
    <div className="space-y-6">
      <Link
        to="/admin/hiring/roles"
        className="inline-flex items-center gap-2 text-sm text-slate-500 transition hover:text-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
      >
        <ArrowLeft className="h-4 w-4" /> Back to roles
      </Link>

      <Card className="overflow-hidden">
        <div className="bg-gradient-to-br from-brand-600 via-accent-600 to-emerald-500 px-6 py-7 text-white">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider opacity-90">
            <GraduationCap className="h-3.5 w-3.5" /> {r.department} · {r.seniority}
          </div>
          <h1 className="mt-2 text-2xl font-bold md:text-3xl">{r.title}</h1>
          <p className="mt-2 max-w-3xl text-sm text-white/90">
            {profile?.summary || r.description}
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button
              onClick={() => setAddOpen(true)}
              className="bg-white text-slate-900 hover:bg-slate-100"
            >
              <UserPlus className="h-4 w-4" /> Add candidate
            </Button>
            <Link to={`/admin/hiring/candidates?role_id=${r.id}`}>
              <Button variant="outline" className="border-white/30 bg-white/10 text-white hover:bg-white/20">
                View candidates ({candidates.data?.length ?? 0})
              </Button>
            </Link>
          </div>
        </div>
        <CardContent className="grid gap-6 p-6 md:grid-cols-2">
          <Section title="Ideal candidate">
            <p className="text-sm text-slate-700">
              {profile?.idealCandidate || "—"}
            </p>
            {profile?.successOutcomes && profile.successOutcomes.length > 0 && (
              <div className="mt-3">
                <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Success outcomes
                </div>
                <ul className="space-y-1 text-sm text-slate-700">
                  {profile.successOutcomes.map((o, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                      <span>{o}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Section>
          <Section title={`Required skills (${r.required_skills_json.length})`}>
            <ul className="grid gap-2 sm:grid-cols-2">
              {r.required_skills_json.map((s, i) => (
                <li
                  key={i}
                  className="rounded-xl border border-slate-100 p-3 text-sm"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-900">{s.name}</span>
                    <span
                      className={cn(
                        "rounded-full border px-2 py-0.5 text-xs capitalize",
                        s.importance === "high"
                          ? "bg-rose-50 text-rose-700 border-rose-100"
                          : s.importance === "medium"
                            ? "bg-amber-50 text-amber-700 border-amber-100"
                            : "bg-emerald-50 text-emerald-700 border-emerald-100",
                      )}
                    >
                      {s.importance}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{s.description}</p>
                </li>
              ))}
            </ul>
          </Section>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>
              <ClipboardCheck className="mr-2 inline h-4 w-4" /> Training map (
              {r.training_map_json.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-3 text-sm">
              {r.training_map_json.map((m, i) => (
                <li
                  key={i}
                  className="rounded-xl border border-slate-100 p-3 text-slate-700"
                >
                  <div className="text-xs uppercase tracking-wide text-slate-400">
                    Module {i + 1}
                  </div>
                  <div className="mt-0.5 font-medium text-slate-900">
                    {m.title}
                  </div>
                  <p className="mt-1 text-slate-600 line-clamp-3">
                    {m.content || m.description}
                  </p>
                  {m.quiz.length > 0 && (
                    <div className="mt-2 text-xs text-slate-500">
                      Quiz · {m.quiz.length} question(s)
                    </div>
                  )}
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              <Lightbulb className="mr-2 inline h-4 w-4" /> AI interview plan (
              {r.interview_plan_json.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-3 text-sm">
              {r.interview_plan_json.map((q, i) => (
                <li
                  key={i}
                  className="rounded-xl border border-slate-100 p-3 text-slate-700"
                >
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Q{i + 1}</span>
                    <span className="rounded-full bg-brand-50 px-2 py-0.5 text-brand-700">
                      {q.skillTested}
                    </span>
                  </div>
                  <div className="mt-1 font-medium text-slate-900">{q.question}</div>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Candidates in this role</CardTitle>
          <Badge tone="brand">{candidates.data?.length ?? 0}</Badge>
        </CardHeader>
        <CardContent>
          {candidates.isLoading ? (
            <div className="text-sm text-slate-500">Loading…</div>
          ) : !candidates.data || candidates.data.length === 0 ? (
            <Empty
              title="No candidates yet"
              description="Add your first candidate to start the training & AI interview flow."
              action={
                <Button onClick={() => setAddOpen(true)}>
                  <UserPlus className="h-4 w-4" /> Add candidate
                </Button>
              }
            />
          ) : (
            <ul className="grid gap-3 md:grid-cols-2">
              {candidates.data.map((c) => (
                <Link
                  key={c.id}
                  to={`/admin/hiring/candidates/${c.id}`}
                  className="group flex items-start justify-between rounded-xl border border-slate-100 p-3 transition hover:border-brand-200 hover:bg-brand-50/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
                >
                  <div>
                    <div className="font-medium text-slate-900">
                      {c.full_name}
                    </div>
                    <div className="text-xs text-slate-500">
                      {c.email} · readiness {c.readiness_score}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full border px-2 py-0.5 text-xs capitalize ${riskColor(
                        c.readiness_score >= 80
                          ? "low"
                          : c.readiness_score >= 60
                            ? "medium"
                            : "high",
                      )}`}
                    >
                      {c.status.replace("_", " ")}
                    </span>
                    <ChevronRight className="h-4 w-4 text-slate-400 transition group-hover:translate-x-0.5" />
                  </div>
                </Link>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add candidate"
        description="The candidate will be auto-assigned the role training."
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => create.mutate()}
              loading={create.isPending}
              disabled={!newName || !newEmail}
            >
              <Plus className="h-4 w-4" /> Add & assign training
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Field label="Full name" required>
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Ali Karimov"
            />
          </Field>
          <Field label="Email" required>
            <Input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="ali@example.com"
            />
          </Field>
          <Field label="Notes">
            <Textarea
              rows={3}
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value)}
              placeholder="Anything HR should remember about this candidate."
            />
          </Field>
          <Badge tone="warning" className="block w-fit">
            Do not include protected attributes.
          </Badge>
        </div>
      </Modal>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
        {title}
      </div>
      {children}
    </div>
  );
}

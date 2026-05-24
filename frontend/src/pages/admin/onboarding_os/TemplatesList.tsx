import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  ClipboardCheck,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react";
import { OnboardingOS } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Empty } from "@/components/ui/Empty";
import { Modal } from "@/components/ui/Modal";
import { Field, Input, Select, Textarea } from "@/components/ui/Input";
import { formatDate } from "@/lib/utils";

export function TemplatesList() {
  const qc = useQueryClient();
  const templates = useQuery({
    queryKey: ["os-templates"],
    queryFn: OnboardingOS.listTemplates,
  });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    role_name: "",
    department: "Engineering",
    duration_days: 90,
    description: "",
  });

  const generate = useMutation({
    mutationFn: () => OnboardingOS.generateTemplate(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["os-templates"] });
      setOpen(false);
      setForm({
        role_name: "",
        department: "Engineering",
        duration_days: 90,
        description: "",
      });
    },
  });

  const remove = useMutation({
    mutationFn: (id: number) => OnboardingOS.deleteTemplate(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["os-templates"] }),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            <ClipboardCheck className="mr-2 inline h-6 w-6 text-brand-600" />
            Onboarding templates
          </h1>
          <p className="text-sm text-slate-500">
            Reusable, stage-aware onboarding plans. AI helps you draft one in
            seconds — admin must review before publishing.
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Sparkles className="h-4 w-4" /> Generate with AI
        </Button>
      </div>

      {templates.isLoading ? (
        <div className="text-sm text-slate-500">Loading…</div>
      ) : !templates.data || templates.data.length === 0 ? (
        <Empty
          icon={<ClipboardCheck className="h-5 w-5" />}
          title="No templates yet"
          description="Use the AI generator to draft your first onboarding template."
          action={
            <Button onClick={() => setOpen(true)}>
              <Sparkles className="h-4 w-4" /> Generate
            </Button>
          }
        />
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {templates.data.map((t) => (
            <Card key={t.id} className="flex flex-col">
              <CardHeader>
                <div>
                  <CardTitle>{t.name}</CardTitle>
                  <p className="mt-1 text-xs text-slate-500">
                    {t.role_name} · {t.department}
                  </p>
                </div>
                <Badge tone={t.ai_generated ? "brand" : "default"}>
                  {t.ai_generated ? "AI draft" : "Custom"}
                </Badge>
              </CardHeader>
              <CardContent className="flex-1 space-y-2">
                <p className="text-sm text-slate-600 line-clamp-3">
                  {t.description || "No description."}
                </p>
                <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                  <span className="rounded-full bg-slate-100 px-2 py-0.5">
                    {t.duration_days} day plan
                  </span>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5">
                    Pass ≥ {t.required_score}
                  </span>
                  {t.final_approval_required && (
                    <span className="rounded-full bg-amber-50 px-2 py-0.5 text-amber-700">
                      Final approval required
                    </span>
                  )}
                </div>
              </CardContent>
              <div className="flex items-center justify-between border-t border-slate-100 p-3 text-xs">
                <Link
                  to={`/admin/onboarding-os/templates/${t.id}`}
                  className="font-medium text-brand-600 hover:underline"
                >
                  View tasks <ArrowRight className="ml-0.5 inline h-3 w-3" />
                </Link>
                <div className="flex items-center gap-2">
                  <Link to={`/admin/onboarding-os/instances/new?template=${t.id}`}>
                    <Button size="sm" variant="outline">
                      Use
                    </Button>
                  </Link>
                  <button
                    onClick={() => {
                      if (confirm(`Delete "${t.name}"?`)) remove.mutate(t.id);
                    }}
                    className="rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300"
                    aria-label="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="border-t border-slate-100 px-3 py-2 text-[11px] text-slate-400">
                Created {formatDate(t.created_at)}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="AI template generator"
        description="Describe the role; we'll draft a 14-task onboarding plan covering every stage. Admin review is required before publishing."
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => generate.mutate()}
              loading={generate.isPending}
              disabled={!form.role_name || !form.description}
            >
              <Sparkles className="h-4 w-4" /> Generate draft
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Field label="Role name" required>
            <Input
              value={form.role_name}
              onChange={(e) => setForm({ ...form, role_name: e.target.value })}
              placeholder="Junior Backend Developer"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Department">
              <Select
                value={form.department}
                onChange={(e) => setForm({ ...form, department: e.target.value })}
              >
                {[
                  "Engineering",
                  "HR",
                  "Sales",
                  "Operations",
                  "Management",
                  "Customer Support",
                ].map((d) => (
                  <option key={d}>{d}</option>
                ))}
              </Select>
            </Field>
            <Field label="Duration (days)">
              <Input
                type="number"
                value={form.duration_days}
                onChange={(e) =>
                  setForm({ ...form, duration_days: Number(e.target.value) || 90 })
                }
              />
            </Field>
          </div>
          <Field
            label="Role description"
            required
            description="What does this person do, what tools, what does success look like?"
          >
            <Textarea
              rows={6}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Junior engineer joining the platform team — ships small features end-to-end, pairs with seniors, handles on-call rotation in 6 months."
            />
          </Field>
          <p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-800">
            Responsible AI: do not include sensitive personal info or protected
            attributes. AI never makes final hiring or onboarding decisions —
            the manager and HR co-sign every sign-off.
          </p>
        </div>
      </Modal>
    </div>
  );
}

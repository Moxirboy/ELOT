import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Briefcase,
  CheckCircle2,
  ClipboardCheck,
  Compass,
  Plus,
} from "lucide-react";
import { Employees, OnboardingOS } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Field, Input, Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export function InstanceCreate() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const presetTemplate = Number(params.get("template") || 0) || null;

  const employees = useQuery({ queryKey: ["employees"], queryFn: Employees.list });
  const templates = useQuery({
    queryKey: ["os-templates"],
    queryFn: OnboardingOS.listTemplates,
  });

  const [form, setForm] = useState({
    employee_id: 0,
    template_id: presetTemplate,
    role_name: "",
    department: "",
    duration_days: 90,
    manager_id: 0,
    supervisor_id: 0,
    buddy_id: 0,
    it_owner_id: 0,
    start_date: new Date().toISOString().slice(0, 10),
  });

  useEffect(() => {
    if (form.template_id && templates.data) {
      const tpl = templates.data.find((t) => t.id === form.template_id);
      if (tpl) {
        setForm((f) => ({
          ...f,
          role_name: f.role_name || tpl.role_name,
          department: f.department || tpl.department,
          duration_days: tpl.duration_days,
        }));
      }
    }
  }, [form.template_id, templates.data]);

  const create = useMutation({
    mutationFn: () =>
      OnboardingOS.createInstance({
        employee_id: form.employee_id,
        template_id: form.template_id ?? null,
        role_name: form.role_name || undefined,
        department: form.department || undefined,
        duration_days: form.duration_days,
        manager_id: form.manager_id || undefined,
        supervisor_id: form.supervisor_id || undefined,
        buddy_id: form.buddy_id || undefined,
        it_owner_id: form.it_owner_id || undefined,
        start_date: new Date(form.start_date).toISOString(),
      }),
    onSuccess: (inst) => {
      qc.invalidateQueries({ queryKey: ["os-hr"] });
      navigate(`/admin/onboarding-os/instances/${inst.id}`);
    },
  });

  const employeeOptions = employees.data ?? [];

  return (
    <div className="space-y-6">
      <Link
        to="/admin/onboarding-os"
        className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
      >
        <ArrowLeft className="h-4 w-4" /> Back to dashboard
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          <Plus className="mr-2 inline h-6 w-6 text-brand-600" />
          Create onboarding
        </h1>
        <p className="text-sm text-slate-500">
          Pick the new hire, template, and owner chain. We'll clone the
          template's tasks onto the timeline with correct due dates.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <Card>
          <CardHeader>
            <CardTitle>
              <Briefcase className="mr-2 inline h-4 w-4" /> Onboarding details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field label="Employee" required>
              <Select
                value={form.employee_id || ""}
                onChange={(e) =>
                  setForm({ ...form, employee_id: Number(e.target.value) || 0 })
                }
              >
                <option value="">Pick an employee…</option>
                {employeeOptions.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name} — {e.department}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Template">
              <Select
                value={form.template_id ?? ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    template_id: e.target.value ? Number(e.target.value) : null,
                  })
                }
              >
                <option value="">No template (custom)</option>
                {(templates.data ?? []).map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </Select>
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Role name">
                <Input
                  value={form.role_name}
                  onChange={(e) => setForm({ ...form, role_name: e.target.value })}
                  placeholder="Junior Backend Developer"
                />
              </Field>
              <Field label="Department">
                <Input
                  value={form.department}
                  onChange={(e) => setForm({ ...form, department: e.target.value })}
                  placeholder="Engineering"
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Start date">
                <Input
                  type="date"
                  value={form.start_date}
                  onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                />
              </Field>
              <Field label="Duration (days)">
                <Input
                  type="number"
                  value={form.duration_days}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      duration_days: Number(e.target.value) || 90,
                    })
                  }
                />
              </Field>
            </div>

            <div className="border-t border-slate-100 pt-3">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Owner chain
              </div>
              <div className="grid grid-cols-2 gap-3">
                {(
                  [
                    ["manager_id", "Manager"],
                    ["supervisor_id", "Supervisor"],
                    ["buddy_id", "Buddy / mentor"],
                    ["it_owner_id", "IT owner"],
                  ] as [keyof typeof form, string][]
                ).map(([key, label]) => (
                  <Field key={key as string} label={label}>
                    <Select
                      value={(form[key] as number) || ""}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          [key]: Number(e.target.value) || 0,
                        } as typeof form)
                      }
                    >
                      <option value="">— unassigned —</option>
                      {employeeOptions
                        .filter((e) => e.id !== form.employee_id)
                        .map((e) => (
                          <option key={e.id} value={e.id}>
                            {e.name} — {e.department}
                          </option>
                        ))}
                    </Select>
                  </Field>
                ))}
              </div>
            </div>

            <Button
              size="lg"
              className="w-full"
              loading={create.isPending}
              onClick={() => create.mutate()}
              disabled={!form.employee_id}
            >
              <CheckCircle2 className="h-5 w-5" /> Assign onboarding
            </Button>
            {create.error && (
              <p className="text-sm text-rose-600">
                {(create.error as Error).message}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              <ClipboardCheck className="mr-2 inline h-4 w-4" /> What happens next
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-600">
            <p>When you click <strong>Assign onboarding</strong>, ELOT:</p>
            <ol className="space-y-1.5 pl-4 list-decimal">
              <li>Clones every task from the template onto the timeline.</li>
              <li>Sets due dates relative to the start date.</li>
              <li>Routes each task to its default reviewer role.</li>
              <li>Notifies manager, supervisor, buddy and the new hire.</li>
              <li>Opens the instance page where you can adjust everything.</li>
            </ol>
            <div className="rounded-xl bg-amber-50 p-3 text-xs text-amber-800">
              <Compass className="mr-1 inline h-3.5 w-3.5" />
              Responsible AI: ELOT never makes final hiring or sign-off
              decisions. Manager + HR co-sign every milestone.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

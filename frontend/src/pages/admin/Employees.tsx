import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Upload, Trash2, Users as UsersIcon } from "lucide-react";
import { Employees as EmployeesApi, type Employee } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { Field, Input, Select } from "@/components/ui/Input";
import { Empty } from "@/components/ui/Empty";
import { Badge } from "@/components/ui/Badge";
import { riskColor } from "@/lib/utils";

const DEPARTMENTS = ["HR", "Engineering", "Sales", "Operations", "Management"];

export function Employees() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["employees"],
    queryFn: EmployeesApi.list,
  });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<Employee>>({
    department: "Engineering",
    risk_level: "low",
  });

  const create = useMutation({
    mutationFn: (body: Partial<Employee>) => EmployeesApi.create(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["employees"] });
      setOpen(false);
      setForm({ department: "Engineering", risk_level: "low" });
    },
  });

  const remove = useMutation({
    mutationFn: (id: number) => EmployeesApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["employees"] }),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Employees</h1>
          <p className="text-sm text-slate-500">
            People in your company who can be assigned training.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() =>
              alert(
                "CSV import is mocked in this demo. In production this would parse and validate a CSV upload.",
              )
            }
          >
            <Upload className="h-4 w-4" /> CSV import (demo)
          </Button>
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> Add employee
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Roster ({data?.length ?? 0})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-sm text-slate-500">Loading…</div>
          ) : !data || data.length === 0 ? (
            <Empty
              icon={<UsersIcon className="h-5 w-5" />}
              title="No employees yet"
              description="Add your first employee to start assigning training."
              action={<Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Add employee</Button>}
            />
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-100">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-2">Name</th>
                    <th className="px-4 py-2">Email</th>
                    <th className="px-4 py-2">Department</th>
                    <th className="px-4 py-2">Role</th>
                    <th className="px-4 py-2">Risk</th>
                    <th className="px-4 py-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.map((e) => (
                    <tr key={e.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-medium text-slate-900">{e.name}</td>
                      <td className="px-4 py-3 text-slate-600">{e.email}</td>
                      <td className="px-4 py-3 text-slate-700">{e.department}</td>
                      <td className="px-4 py-3 text-slate-700">{e.job_role}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${riskColor(e.risk_level)}`}
                        >
                          {e.risk_level}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => {
                            if (confirm(`Remove ${e.name}?`)) remove.mutate(e.id);
                          }}
                          className="text-slate-400 hover:text-rose-600"
                          aria-label="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Add employee"
        description="They'll be added to your demo company roster."
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => create.mutate(form)}
              loading={create.isPending}
              disabled={!form.name || !form.email}
            >
              Add employee
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Full name" required>
            <Input
              value={form.name ?? ""}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Aziza Karimova"
            />
          </Field>
          <Field label="Email" required>
            <Input
              type="email"
              value={form.email ?? ""}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="name@company.com"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Department">
              <Select
                value={form.department}
                onChange={(e) => setForm({ ...form, department: e.target.value })}
              >
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Job role">
              <Input
                value={form.job_role ?? ""}
                onChange={(e) => setForm({ ...form, job_role: e.target.value })}
                placeholder="Engineer"
              />
            </Field>
          </div>
          <Field label="Risk level">
            <Select
              value={form.risk_level}
              onChange={(e) =>
                setForm({ ...form, risk_level: e.target.value as Employee["risk_level"] })
              }
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </Select>
          </Field>
          {create.error && (
            <Badge tone="danger">
              {(create.error as Error).message || "Failed to create employee"}
            </Badge>
          )}
        </div>
      </Modal>
    </div>
  );
}

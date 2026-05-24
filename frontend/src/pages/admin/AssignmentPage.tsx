import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ClipboardList, CheckCircle2 } from "lucide-react";
import {
  Assignments,
  Courses,
  Employees as EmployeesApi,
} from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Field, Input, Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { formatDate, prettyStatus, statusColor } from "@/lib/utils";

export function AssignmentPage() {
  const qc = useQueryClient();
  const { state } = useLocation() as {
    state: { course_id?: number } | null;
  };

  const employees = useQuery({ queryKey: ["employees"], queryFn: EmployeesApi.list });
  const courses = useQuery({ queryKey: ["courses"], queryFn: Courses.list });
  const assignments = useQuery({ queryKey: ["assignments"], queryFn: Assignments.list });

  const [courseId, setCourseId] = useState<number | null>(state?.course_id ?? null);
  const [department, setDepartment] = useState<string>("");
  const [employeeIds, setEmployeeIds] = useState<number[]>([]);
  const [dueDate, setDueDate] = useState<string>("");

  useEffect(() => {
    if (!courseId && courses.data && courses.data.length) {
      setCourseId(courses.data[0].id);
    }
  }, [courses.data, courseId]);

  const create = useMutation({
    mutationFn: () =>
      Assignments.create({
        course_id: courseId!,
        employee_ids: employeeIds.length ? employeeIds : undefined,
        department: department || undefined,
        due_date: dueDate ? new Date(dueDate).toISOString() : null,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["assignments"] });
      qc.invalidateQueries({ queryKey: ["admin-dashboard"] });
      setEmployeeIds([]);
      setDueDate("");
    },
  });

  const departments = useMemo(() => {
    if (!employees.data) return [];
    return Array.from(new Set(employees.data.map((e) => e.department))).sort();
  }, [employees.data]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Assignments</h1>
        <p className="text-sm text-slate-500">
          Assign training to individual employees or whole departments.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>New assignment</CardTitle>
            <Badge tone="brand">Setup</Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field label="Course" required>
              <Select
                value={courseId ?? ""}
                onChange={(e) => setCourseId(Number(e.target.value) || null)}
              >
                <option value="">Select a course…</option>
                {courses.data?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Assign to department (optional)">
              <Select value={department} onChange={(e) => setDepartment(e.target.value)}>
                <option value="">— None —</option>
                {departments.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Or pick individual employees">
              <div className="max-h-56 overflow-y-auto rounded-xl border border-slate-200 p-2">
                {employees.data?.map((e) => {
                  const checked = employeeIds.includes(e.id);
                  return (
                    <label
                      key={e.id}
                      className="flex cursor-pointer items-center gap-2 rounded-lg p-1.5 hover:bg-slate-50"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() =>
                          setEmployeeIds((prev) =>
                            checked ? prev.filter((id) => id !== e.id) : [...prev, e.id],
                          )
                        }
                      />
                      <span className="text-sm">
                        <span className="font-medium">{e.name}</span>
                        <span className="text-slate-500"> — {e.department}</span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </Field>

            <Field label="Due date">
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </Field>

            <Button
              size="lg"
              className="w-full"
              loading={create.isPending}
              onClick={() => create.mutate()}
              disabled={!courseId || (employeeIds.length === 0 && !department)}
            >
              <ClipboardList className="h-5 w-5" /> Assign training
            </Button>
            {create.isSuccess && (
              <p className="inline-flex items-center gap-1 text-sm text-emerald-700">
                <CheckCircle2 className="h-4 w-4" /> {create.data?.length ?? 0} assignment(s) created.
              </p>
            )}
            {create.error && (
              <p className="text-sm text-rose-600">{(create.error as Error).message}</p>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent assignments</CardTitle>
            <Badge>{assignments.data?.length ?? 0} total</Badge>
          </CardHeader>
          <CardContent>
            {!assignments.data || assignments.data.length === 0 ? (
              <p className="text-sm text-slate-500">No assignments yet.</p>
            ) : (
              <div className="overflow-hidden rounded-xl border border-slate-100">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-2">Employee</th>
                      <th className="px-4 py-2">Course</th>
                      <th className="px-4 py-2">Status</th>
                      <th className="px-4 py-2">Score</th>
                      <th className="px-4 py-2">Due</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {assignments.data.slice(0, 50).map((a) => {
                      const emp = employees.data?.find((e) => e.id === a.employee_id);
                      const course = courses.data?.find((c) => c.id === a.course_id);
                      return (
                        <tr key={a.id}>
                          <td className="px-4 py-3 font-medium text-slate-900">{emp?.name ?? `#${a.employee_id}`}</td>
                          <td className="px-4 py-3 text-slate-700">{course?.title ?? `#${a.course_id}`}</td>
                          <td className="px-4 py-3">
                            <span className={`rounded-full border px-2 py-0.5 text-xs ${statusColor(a.status)}`}>
                              {prettyStatus(a.status)}
                            </span>
                          </td>
                          <td className="px-4 py-3">{a.score || "—"}</td>
                          <td className="px-4 py-3 text-slate-500">{formatDate(a.due_date)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

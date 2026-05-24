import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Laptop } from "lucide-react";
import { OnboardingOS } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Empty } from "@/components/ui/Empty";
import { Badge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/utils";

/**
 * Pulls asset IDs out of the assignment_history_json of every it_setup task.
 * Cheap MVP — the proper asset registry would live in its own table.
 */
export function ITAssets() {
  const tasks = useQuery({
    queryKey: ["it-tasks", "all"],
    queryFn: () => OnboardingOS.itTasks(),
  });

  const assets = useMemo(() => {
    const out: {
      asset_id: string;
      employee_name: string | null;
      task_title: string;
      task_id: number;
      assigned_at: string;
      status: string;
    }[] = [];
    for (const t of tasks.data ?? []) {
      // Resources_json + assignment_history (we don't have direct access to
      // history here, so derive from `t.score` proxy is wrong) — the task
      // shape exposes resources_json only. Use that for asset-name hints.
      const resourceAssets = (t.resources_json ?? [])
        .map((r) => r.name)
        .filter((x): x is string => !!x && /(LPT|ASSET|MAC|PC|DEV)-/i.test(x));
      resourceAssets.forEach((asset_id) => {
        out.push({
          asset_id,
          employee_name: t.assigned_to_name,
          task_title: t.title,
          task_id: t.id,
          assigned_at: t.created_at,
          status: t.status,
        });
      });
    }
    return out;
  }, [tasks.data]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          <Laptop className="mr-2 inline h-6 w-6 text-cyan-600" /> Assets
        </h1>
        <p className="text-sm text-slate-500">
          Asset IDs captured on IT setup tasks. A proper asset registry is on
          the roadmap.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Issued devices / accounts</CardTitle>
          <Badge>{assets.length}</Badge>
        </CardHeader>
        <CardContent>
          {tasks.isLoading ? (
            <p className="text-sm text-slate-500">Loading…</p>
          ) : assets.length === 0 ? (
            <Empty
              icon={<Laptop className="h-5 w-5" />}
              title="No asset IDs captured yet"
              description="When you complete an IT setup task, pass an asset/device ID — it'll show up here."
            />
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-100">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-2">Asset ID</th>
                    <th className="px-4 py-2">Assigned to</th>
                    <th className="px-4 py-2">Setup task</th>
                    <th className="px-4 py-2">Assigned on</th>
                    <th className="px-4 py-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {assets.map((a) => (
                    <tr key={`${a.task_id}-${a.asset_id}`}>
                      <td className="px-4 py-2 font-mono text-xs">
                        {a.asset_id}
                      </td>
                      <td className="px-4 py-2 text-slate-700">
                        {a.employee_name ?? "—"}
                      </td>
                      <td className="px-4 py-2">{a.task_title}</td>
                      <td className="px-4 py-2 text-xs text-slate-500">
                        {formatDate(a.assigned_at)}
                      </td>
                      <td className="px-4 py-2 text-xs capitalize text-slate-500">
                        {a.status.replace("_", " ")}
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

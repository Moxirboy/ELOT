import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { HandHelping, MessageCircle } from "lucide-react";
import { OnboardingOS } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Empty } from "@/components/ui/Empty";
import { Textarea } from "@/components/ui/Input";
import { formatDateTime, riskColor } from "@/lib/utils";

export function BuddyHelpRequests() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<"open" | "responded" | "closed" | "all">("open");
  const reqs = useQuery({
    queryKey: ["buddy-help", filter],
    queryFn: () =>
      OnboardingOS.listHelpRequests({
        target_role: "buddy",
        status: filter === "all" ? undefined : filter,
      }),
  });
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const respond = useMutation({
    mutationFn: ({ id, text, close }: { id: number; text: string; close?: boolean }) =>
      OnboardingOS.respondHelpRequest(id, { response_text: text, close }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["buddy-help"] }),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          <HandHelping className="mr-2 inline h-6 w-6 text-pink-500" /> Help
          requests
        </h1>
        <p className="text-sm text-slate-500">
          New hires can ping you any time. Respond inline — the answer is
          delivered to them in their timeline.
        </p>
      </div>

      <div className="inline-flex rounded-full bg-slate-100 p-0.5">
        {(["open", "responded", "closed", "all"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-3 py-1 text-xs font-medium capitalize transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-300 ${
              filter === f ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Requests</CardTitle>
          <Badge>{reqs.data?.length ?? 0}</Badge>
        </CardHeader>
        <CardContent>
          {reqs.isLoading ? (
            <p className="text-sm text-slate-500">Loading…</p>
          ) : !reqs.data || reqs.data.length === 0 ? (
            <Empty
              icon={<MessageCircle className="h-5 w-5" />}
              title="No requests in this view"
              description="Nothing pending — caught up."
            />
          ) : (
            <ul className="space-y-3">
              {reqs.data.map((h) => (
                <li
                  key={h.id}
                  className="space-y-2 rounded-xl border border-slate-100 p-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                    <span>
                      From <strong>{h.employee_name}</strong> ·{" "}
                      {formatDateTime(h.created_at)}
                    </span>
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full border px-2 py-0.5 capitalize ${riskColor(
                          h.priority === "high" || h.priority === "critical"
                            ? "high"
                            : h.priority === "medium"
                              ? "medium"
                              : "low",
                        )}`}
                      >
                        {h.priority} priority
                      </span>
                      <Badge
                        tone={
                          h.status === "open"
                            ? "warning"
                            : h.status === "responded"
                              ? "brand"
                              : "success"
                        }
                      >
                        {h.status}
                      </Badge>
                    </div>
                  </div>
                  <p className="text-sm text-slate-800">{h.message}</p>
                  {h.response_text ? (
                    <div className="rounded-xl bg-emerald-50 p-2 text-xs text-emerald-800">
                      <strong>Your reply:</strong> {h.response_text}
                      {h.responded_at && (
                        <span className="ml-2 text-emerald-600/70">
                          ({formatDateTime(h.responded_at)})
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Textarea
                        rows={2}
                        placeholder="Type a quick answer…"
                        value={drafts[h.id] ?? ""}
                        onChange={(e) =>
                          setDrafts({ ...drafts, [h.id]: e.target.value })
                        }
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() =>
                            respond.mutate({
                              id: h.id,
                              text: drafts[h.id] ?? "",
                              close: false,
                            })
                          }
                          disabled={!drafts[h.id]?.trim()}
                          loading={respond.isPending}
                        >
                          Reply
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            respond.mutate({
                              id: h.id,
                              text: drafts[h.id] ?? "Resolved.",
                              close: true,
                            })
                          }
                          disabled={!drafts[h.id]?.trim()}
                          loading={respond.isPending}
                        >
                          Reply & close
                        </Button>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

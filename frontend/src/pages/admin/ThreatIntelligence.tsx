import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Radar,
  RefreshCw,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { Threats, type ThreatTrend } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Empty } from "@/components/ui/Empty";
import { formatDateTime, riskColor } from "@/lib/utils";

const METHOD_TONE: Record<string, string> = {
  Quishing: "from-purple-500 to-fuchsia-500",
  Smishing: "from-amber-500 to-orange-500",
  Vishing: "from-rose-500 to-red-500",
  "BEC / fake invoice": "from-cyan-500 to-blue-500",
  "AI-generated phishing": "from-indigo-500 to-violet-500",
  "Callback phishing": "from-emerald-500 to-teal-500",
};

function methodGradient(method: string): string {
  return METHOD_TONE[method] ?? "from-slate-500 to-slate-700";
}

export function ThreatIntelligence() {
  const qc = useQueryClient();
  const trends = useQuery({ queryKey: ["threat-trends"], queryFn: Threats.trends });
  const sources = useQuery({
    queryKey: ["threat-sources"],
    queryFn: Threats.sources,
  });

  const sync = useMutation({
    mutationFn: Threats.sync,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["threat-trends"] });
      qc.invalidateQueries({ queryKey: ["threat-sources"] });
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            <Radar className="mr-2 inline h-6 w-6 text-brand-600" />
            Threat Intelligence
          </h1>
          <p className="text-sm text-slate-500">
            Phishing trends across email, SMS, voice, BEC, AI-generated lures,
            and callback scams. All indicators are stored defanged so it's safe
            to read inside the product.
          </p>
        </div>
        <Button onClick={() => sync.mutate()} loading={sync.isPending} variant="outline">
          <RefreshCw className="h-4 w-4" /> Sync feeds
        </Button>
      </div>

      {/* Sources strip */}
      {sources.data && sources.data.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Monitored sources</CardTitle>
            <Badge tone="brand">{sources.data.length}</Badge>
          </CardHeader>
          <CardContent>
            <ul className="grid gap-2 md:grid-cols-3">
              {sources.data.map((s) => (
                <li
                  key={s.id}
                  className="rounded-xl border border-slate-100 p-3 text-sm"
                >
                  <div className="font-medium text-slate-900">{s.name}</div>
                  <div className="text-xs text-slate-500">
                    {s.source_type.toUpperCase()} ·{" "}
                    {s.last_checked_at
                      ? `last checked ${formatDateTime(s.last_checked_at)}`
                      : "never checked"}
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Recent trends</CardTitle>
          <Badge>{trends.data?.length ?? 0}</Badge>
        </CardHeader>
        <CardContent>
          {trends.isLoading ? (
            <div className="text-sm text-slate-500">Loading…</div>
          ) : !trends.data || trends.data.length === 0 ? (
            <Empty
              icon={<ShieldAlert className="h-5 w-5" />}
              title="No trends yet"
              description="Click Sync feeds to ingest the curated phishing-awareness bulletins."
              action={
                <Button onClick={() => sync.mutate()} loading={sync.isPending}>
                  <RefreshCw className="h-4 w-4" /> Sync now
                </Button>
              }
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {trends.data.map((t) => (
                <TrendCard key={t.id} trend={t} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {sync.isSuccess && (
        <Card className="bg-emerald-50/60 p-3 text-sm text-emerald-800">
          Synced — {sync.data?.fetched_reports ?? 0} new reports,{" "}
          {sync.data?.new_trends ?? 0} new trends.
        </Card>
      )}
    </div>
  );
}

function TrendCard({ trend }: { trend: ThreatTrend }) {
  return (
    <Link
      to={`/admin/threat-intelligence/${trend.id}`}
      className="group block overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card transition hover:border-brand-200 hover:shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
      aria-label={`Open ${trend.title}`}
    >
      <div
        className={`bg-gradient-to-br ${methodGradient(trend.method)} px-4 py-3 text-white`}
      >
        <div className="flex items-center justify-between text-xs">
          <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 font-semibold uppercase tracking-wide">
            {trend.method}
          </span>
          <span
            className={`rounded-full border border-white/30 bg-white/15 px-2 py-0.5 font-medium capitalize`}
          >
            {trend.risk_level} risk
          </span>
        </div>
        <h3 className="mt-2 text-base font-semibold leading-snug">
          {trend.title}
        </h3>
      </div>
      <div className="space-y-2 p-4 text-sm">
        <div className="text-xs uppercase tracking-wide text-slate-400">
          Channels
        </div>
        <div className="text-slate-700">{trend.channel}</div>
        {trend.target_roles_json?.length > 0 && (
          <>
            <div className="text-xs uppercase tracking-wide text-slate-400">
              Most at risk
            </div>
            <div className="flex flex-wrap gap-1">
              {trend.target_roles_json.slice(0, 4).map((r) => (
                <span
                  key={r}
                  className={`rounded-full border px-2 py-0.5 text-xs ${riskColor(
                    trend.risk_level,
                  )}`}
                >
                  {r}
                </span>
              ))}
            </div>
          </>
        )}
        <div className="flex items-center justify-between pt-2 text-xs">
          <span className="text-slate-500">
            {formatDateTime(trend.created_at)}
          </span>
          <span className="inline-flex items-center gap-1 text-brand-600 group-hover:gap-2 transition-all">
            <Sparkles className="h-3 w-3" /> Generate training
            <ArrowRight className="h-3 w-3" />
          </span>
        </div>
      </div>
    </Link>
  );
}

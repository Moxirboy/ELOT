import { useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  CheckCircle2,
  Eye,
  FishSymbol,
  Plus,
  Sparkles,
  XCircle,
} from "lucide-react";
import {
  PhishingTests as PT,
  Threats,
  type PhishingTest,
  type PhishingTestResult,
} from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Empty } from "@/components/ui/Empty";
import { Modal } from "@/components/ui/Modal";
import { Field, Select } from "@/components/ui/Input";
import { formatDateTime, riskColor } from "@/lib/utils";

export function PhishingTestsPage() {
  const qc = useQueryClient();
  const tests = useQuery({ queryKey: ["phishing-tests"], queryFn: PT.list });
  const trainings = useQuery({
    queryKey: ["threat-trainings"],
    queryFn: Threats.trainings,
  });

  const [openCreate, setOpenCreate] = useState(false);
  const [selectedTrainingId, setSelectedTrainingId] = useState<number | "">("");
  const [activeTest, setActiveTest] = useState<PhishingTest | null>(null);

  const create = useMutation({
    mutationFn: async () => {
      const training = trainings.data?.find(
        (t) => t.id === Number(selectedTrainingId),
      );
      if (!training) throw new Error("Pick a training first");
      return PT.create({
        training_id: training.id,
        title: `${training.title} — challenge`,
        test_type: "in_app",
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["phishing-tests"] });
      setOpenCreate(false);
      setSelectedTrainingId("");
    },
  });

  const publishedTrainings = (trainings.data ?? []).filter(
    (t) => t.status === "published" || t.status === "approved",
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            <FishSymbol className="mr-2 inline h-6 w-6 text-brand-600" />
            In-app phishing tests
          </h1>
          <p className="text-sm text-slate-500">
            Safe, in-product challenges based on published security trainings.
            Tracks click / report / correct-answer / risky-answer per employee.
          </p>
        </div>
        <Button onClick={() => setOpenCreate(true)} disabled={publishedTrainings.length === 0}>
          <Plus className="h-4 w-4" /> New phishing test
        </Button>
      </div>

      <div className="rounded-xl bg-amber-50 p-3 text-xs text-amber-800">
        <strong>Hackathon-safe defaults:</strong> in-app only · approved company
        domains only · no fake login pages · no collection of passwords or real
        sensitive data · learners always see the lesson after answering.
      </div>

      {tests.isLoading ? (
        <div className="text-sm text-slate-500">Loading…</div>
      ) : !tests.data || tests.data.length === 0 ? (
        <Empty
          icon={<FishSymbol className="h-5 w-5" />}
          title="No phishing tests yet"
          description="Publish a security training, then create a phishing test from it."
          action={
            <Link to="/admin/threat-intelligence">
              <Button>
                <Sparkles className="h-4 w-4" /> Open Threat Intelligence
              </Button>
            </Link>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {tests.data.map((t) => (
            <Card key={t.id} className="overflow-hidden">
              <CardHeader>
                <CardTitle>{t.title}</CardTitle>
                <Badge tone={t.status === "active" ? "success" : "default"} className="capitalize">
                  {t.status}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="text-xs uppercase tracking-wide text-slate-500">
                  Scenario
                </div>
                <p className="rounded-xl bg-slate-50 p-3 italic text-slate-700">
                  "{t.scenario_json?.message ?? "—"}"
                </p>
                <div className="text-xs text-slate-500">
                  Created {formatDateTime(t.created_at)} ·{" "}
                  <span className="capitalize">{t.test_type.replace("_", " ")}</span>
                </div>
                <div className="flex flex-wrap gap-2 pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setActiveTest(t)}
                  >
                    <Eye className="h-4 w-4" /> View results
                  </Button>
                  <Link
                    to={`/learner/security-challenge/${t.id}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Button size="sm" variant="ghost">
                      Open learner view ↗
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={openCreate}
        onClose={() => setOpenCreate(false)}
        title="New phishing test"
        description="Pick an approved or published security training to build the challenge from."
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setOpenCreate(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => create.mutate()}
              loading={create.isPending}
              disabled={!selectedTrainingId}
            >
              <Plus className="h-4 w-4" /> Create test
            </Button>
          </>
        }
      >
        <Field label="Source training">
          <Select
            value={selectedTrainingId}
            onChange={(e) =>
              setSelectedTrainingId(
                e.target.value ? Number(e.target.value) : "",
              )
            }
          >
            <option value="">Pick a training…</option>
            {publishedTrainings.map((t) => (
              <option key={t.id} value={t.id}>
                [{t.status}] {t.title}
              </option>
            ))}
          </Select>
        </Field>
        {publishedTrainings.length === 0 && (
          <p className="mt-2 text-xs text-amber-700">
            You need at least one approved training first.{" "}
            <Link
              to="/admin/threat-intelligence"
              className="font-medium underline"
            >
              Approve one from Threat Intelligence
            </Link>
            .
          </p>
        )}
      </Modal>

      {activeTest && (
        <ResultsModal
          test={activeTest}
          onClose={() => setActiveTest(null)}
        />
      )}
    </div>
  );
}

function ResultsModal({
  test,
  onClose,
}: {
  test: PhishingTest;
  onClose: () => void;
}) {
  const results = useQuery({
    queryKey: ["phishing-test-results", test.id],
    queryFn: () => PT.results(test.id),
  });

  const correct = results.data?.filter((r) => r.action === "answered_correctly") ?? [];
  const risky = results.data?.filter((r) => r.action === "answered_risky") ?? [];

  return (
    <Modal
      open={true}
      onClose={onClose}
      title={`Results — ${test.title}`}
      size="lg"
      footer={
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3 text-center">
          <StatTile label="Responses" value={results.data?.length ?? 0} />
          <StatTile label="Correct" value={correct.length} tone="success" />
          <StatTile label="Risky" value={risky.length} tone="danger" />
        </div>
        {results.isLoading ? (
          <div className="text-sm text-slate-500">Loading…</div>
        ) : !results.data || results.data.length === 0 ? (
          <p className="text-sm text-slate-500">
            No responses yet. Send the test to your team.
          </p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-100">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-2">Employee</th>
                  <th className="px-4 py-2">Action</th>
                  <th className="px-4 py-2">Risk</th>
                  <th className="px-4 py-2">Answer</th>
                  <th className="px-4 py-2">When</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {results.data.map((r: PhishingTestResult) => (
                  <tr key={r.id}>
                    <td className="px-4 py-2 font-medium text-slate-900">
                      {r.employee_name ?? `#${r.employee_id}`}
                    </td>
                    <td className="px-4 py-2">
                      {r.action === "answered_correctly" ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Correct
                        </span>
                      ) : r.action === "answered_risky" ? (
                        <span className="inline-flex items-center gap-1 text-rose-700">
                          <XCircle className="h-3.5 w-3.5" /> Risky
                        </span>
                      ) : (
                        r.action
                      )}
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className={`rounded-full border px-2 py-0.5 text-xs capitalize ${riskColor(r.risk_level)}`}
                      >
                        {r.risk_level}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-slate-600 max-w-[18rem]">
                      <span className="line-clamp-2">{r.answer || "—"}</span>
                    </td>
                    <td className="px-4 py-2 text-xs text-slate-500">
                      {formatDateTime(r.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Modal>
  );
}

function StatTile({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "success" | "danger";
}) {
  const cls =
    tone === "success"
      ? "bg-emerald-50 text-emerald-700 border-emerald-100"
      : tone === "danger"
        ? "bg-rose-50 text-rose-700 border-rose-100"
        : "bg-slate-50 text-slate-700 border-slate-100";
  return (
    <div className={`rounded-xl border p-3 ${cls}`}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-[11px] uppercase tracking-wide">{label}</div>
    </div>
  );
}

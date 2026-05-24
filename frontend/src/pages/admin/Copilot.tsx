import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Bot, Send, Sparkles, CheckCircle2, Copy, Mail } from "lucide-react";
import { AI } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Field, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ReminderModal } from "@/components/admin/ReminderModal";

const SUGGESTED = [
  "Who needs retraining?",
  "Which department has the highest risk?",
  "What is the weakest topic?",
  "Generate reminder message for incomplete employees.",
  "Summarize compliance status for leadership.",
];

type ChatTurn =
  | { role: "user"; text: string }
  | {
      role: "ai";
      answer: string;
      evidence: string[];
      actions: string[];
      draft: string;
    };

export function Copilot() {
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<ChatTurn[]>([]);
  const [reminder, setReminder] = useState<{ open: boolean; draft: string }>({
    open: false,
    draft: "",
  });

  const ask = useMutation({
    mutationFn: (q: string) => AI.copilot(q),
    onMutate: (q) => setHistory((h) => [...h, { role: "user", text: q }]),
    onSuccess: (r) =>
      setHistory((h) => [
        ...h,
        {
          role: "ai",
          answer: r.answer,
          evidence: r.evidence,
          actions: r.recommended_actions,
          draft: r.draft_message,
        },
      ]),
  });

  function send(text?: string) {
    const q = (text ?? input).trim();
    if (!q) return;
    setInput("");
    ask.mutate(q);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">AI Admin Copilot</h1>
        <p className="text-sm text-slate-500">
          Ask questions about your training programme. Answers are grounded in your real data.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>
              <Bot className="mr-2 inline h-4 w-4" /> Conversation
            </CardTitle>
            <Badge tone="brand">Grounded answers</Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="min-h-[20rem] space-y-3">
              {history.length === 0 && (
                <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
                  Ask a suggested question to start — answers cite your real training data.
                </div>
              )}
              {history.map((t, i) =>
                t.role === "user" ? (
                  <div
                    key={i}
                    className="ml-auto max-w-[80%] rounded-2xl rounded-br-md bg-brand-600 px-4 py-2 text-sm text-white"
                  >
                    {t.text}
                  </div>
                ) : (
                  <AIBubble
                    key={i}
                    turn={t}
                    onUseAsReminder={(draft) =>
                      setReminder({ open: true, draft })
                    }
                  />
                ),
              )}
              {ask.isPending && (
                <div className="text-sm text-slate-500">
                  <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-brand-500" /> Thinking…
                </div>
              )}
            </div>

            <Field label="Your question">
              <Textarea
                placeholder="e.g. Who hasn't completed Cybersecurity Basics?"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) send();
                }}
                rows={3}
              />
            </Field>
            <div className="flex justify-end">
              <Button onClick={() => send()} loading={ask.isPending}>
                <Send className="h-4 w-4" /> Ask Copilot
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              <Sparkles className="mr-2 inline h-4 w-4" /> Try
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {SUGGESTED.map((q) => (
                <li key={q}>
                  <button
                    onClick={() => send(q)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-left text-sm text-slate-700 transition hover:border-brand-300 hover:bg-brand-50"
                  >
                    {q}
                  </button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <ReminderModal
        open={reminder.open}
        onClose={() => setReminder({ open: false, draft: "" })}
        initialMessage={reminder.draft}
        initialSubject="Reminder from your training admin"
      />
    </div>
  );
}

function AIBubble({
  turn,
  onUseAsReminder,
}: {
  turn: Extract<ChatTurn, { role: "ai" }>;
  onUseAsReminder?: (draft: string) => void;
}) {
  return (
    <div className="max-w-[90%] rounded-2xl rounded-bl-md border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-800">
      <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-brand-600">
        <Bot className="h-3.5 w-3.5" /> ELOT Copilot
      </div>
      <p>{turn.answer}</p>

      {turn.evidence?.length > 0 && (
        <div className="mt-3">
          <div className="text-xs font-semibold text-slate-500">Evidence</div>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-slate-700">
            {turn.evidence.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>
      )}
      {turn.actions?.length > 0 && (
        <div className="mt-3">
          <div className="text-xs font-semibold text-slate-500">Recommended actions</div>
          <ul className="mt-1 space-y-1 text-slate-700">
            {turn.actions.map((a, i) => (
              <li key={i} className="inline-flex items-start gap-1">
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 text-emerald-600" /> <span>{a}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {turn.draft && (
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Draft message</span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => navigator.clipboard.writeText(turn.draft)}
                className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-slate-500 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
              >
                <Copy className="h-3 w-3" /> Copy
              </button>
              {onUseAsReminder && (
                <button
                  onClick={() => onUseAsReminder(turn.draft)}
                  className="inline-flex items-center gap-1 rounded-md bg-brand-600 px-2 py-0.5 text-white hover:bg-brand-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
                >
                  <Mail className="h-3 w-3" /> Send as reminder
                </button>
              )}
            </div>
          </div>
          <pre className="mt-1 whitespace-pre-wrap rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-700">
            {turn.draft}
          </pre>
        </div>
      )}
    </div>
  );
}

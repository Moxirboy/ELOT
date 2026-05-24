import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, GraduationCap, UserPlus } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field, Input } from "@/components/ui/Input";
import { useAuth } from "@/lib/auth";

const SEED_CANDIDATES = [
  { email: "ali.k@example.com", name: "Ali Karimov" },
  { email: "madina.t@example.com", name: "Madina Tursunova" },
  { email: "bekzod.r@example.com", name: "Bekzod Rustamov" },
];

export function CandidateLogin() {
  const navigate = useNavigate();
  const { loginCandidate } = useAuth();
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function go(addr: string) {
    setError(null);
    setPending(addr);
    try {
      await loginCandidate(addr);
      navigate("/candidate/dashboard");
    } catch (err) {
      const msg =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Could not log in.";
      setError(msg);
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="min-h-screen bg-hero bg-grid">
      <div className="mx-auto max-w-3xl px-4 pt-10">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-slate-600 transition hover:text-brand-600"
        >
          <ArrowLeft className="h-4 w-4" /> Back to landing
        </Link>
      </div>
      <div className="mx-auto flex max-w-md flex-col items-center px-4 py-16">
        <Logo />
        <h1 className="mt-6 text-center text-3xl font-bold tracking-tight text-slate-900">
          Candidate portal
        </h1>
        <p className="mt-2 text-center text-sm text-slate-600">
          Pick a seeded candidate or enter your email.
        </p>

        <Card className="mt-8 w-full p-6">
          <div className="space-y-3">
            {SEED_CANDIDATES.map((c) => (
              <Button
                key={c.email}
                variant="outline"
                size="lg"
                className="w-full"
                onClick={() => go(c.email)}
                loading={pending === c.email}
                disabled={pending !== null}
              >
                <GraduationCap className="h-5 w-5" /> Continue as {c.name}
              </Button>
            ))}
            <div className="my-4 flex items-center gap-3 text-xs text-slate-400">
              <span className="h-px flex-1 bg-slate-200" /> or
              <span className="h-px flex-1 bg-slate-200" />
            </div>
            <Field label="Candidate email">
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </Field>
            <Button
              size="lg"
              className="w-full"
              onClick={() => email && go(email)}
              disabled={!email || pending !== null}
              loading={pending === email}
            >
              <UserPlus className="h-5 w-5" /> Continue
            </Button>
            {error && <p className="text-center text-sm text-rose-600">{error}</p>}
            <p className="pt-2 text-center text-xs text-slate-500">
              Demo only — no password required. HR seeds candidates into the
              pipeline before they can log in.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}

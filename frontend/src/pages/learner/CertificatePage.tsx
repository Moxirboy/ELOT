import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Award, Printer, ShieldCheck, Share2 } from "lucide-react";
import { Certificates } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";
import { formatDate } from "@/lib/utils";

export function CertificatePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({
    queryKey: ["certificate", id],
    queryFn: () => Certificates.get(id!),
    enabled: !!id,
  });

  function shareLink() {
    const url = window.location.href;
    if (navigator.share) {
      navigator
        .share({
          title: `ELOT AI Certificate · ${data?.course_title ?? "Course"}`,
          text: `Verify ELOT AI certificate ${data?.certificate_id}`,
          url,
        })
        .catch(() => {});
    } else {
      navigator.clipboard.writeText(url).then(
        () => alert("Certificate link copied to clipboard."),
        () => {},
      );
    }
  }

  if (isLoading) {
    return <div className="text-slate-500">Loading certificate…</div>;
  }
  if (!data) {
    return (
      <Card className="p-8 text-center">
        <p className="text-slate-500">Certificate not found.</p>
        <Button className="mt-4" onClick={() => navigate("/learner/dashboard")}>
          Back to dashboard
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="no-print flex items-center justify-between gap-2">
        <button
          onClick={() => navigate("/learner/dashboard")}
          className="inline-flex items-center gap-2 rounded-md text-sm text-slate-500 transition hover:text-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
        >
          <ArrowLeft className="h-4 w-4" /> Back to dashboard
        </button>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={shareLink}>
            <Share2 className="h-4 w-4" /> Share link
          </Button>
          <Button onClick={() => window.print()}>
            <Printer className="h-4 w-4" /> Print / Save PDF
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="bg-gradient-to-br from-brand-600 via-accent-600 to-emerald-500 px-8 py-10 text-white print:py-16">
          <div className="flex items-center justify-between">
            <Logo className="text-white" showText={false} />
            <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-xs font-medium">
              <ShieldCheck className="h-3.5 w-3.5" /> Verified ELOT AI Certificate
            </span>
          </div>
          <div className="mt-12 text-center">
            <div className="text-sm uppercase tracking-widest text-white/80">
              Certificate of completion
            </div>
            <div className="mt-3 text-4xl font-bold">{data.course_title ?? "Course"}</div>
            <div className="mt-4 text-sm text-white/80">awarded to</div>
            <div className="mt-1 text-3xl font-semibold">{data.employee_name ?? "Employee"}</div>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-8 text-sm text-white/90">
              <div>
                <div className="text-xs uppercase tracking-widest text-white/70">Issued</div>
                <div className="mt-1">{formatDate(data.issued_at)}</div>
              </div>
              {typeof data.score === "number" && (
                <div>
                  <div className="text-xs uppercase tracking-widest text-white/70">Score</div>
                  <div className="mt-1">{data.score} / 100</div>
                </div>
              )}
              <div>
                <div className="text-xs uppercase tracking-widest text-white/70">Certificate ID</div>
                <div className="mt-1 font-mono text-xs">{data.certificate_id}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-100 bg-white p-6 text-center text-xs text-slate-500">
          <p>
            <Award className="mr-1 inline h-3.5 w-3.5 text-brand-600" />
            This certificate confirms completion of ELOT AI training. It is not a
            legal certification. Verify by certificate ID with your compliance team.
          </p>
          <p className="mt-2 font-mono text-[10px] text-slate-400">
            Verify: {window.location.origin}/learner/certificates/{data.certificate_id}
          </p>
        </div>
      </Card>
    </div>
  );
}

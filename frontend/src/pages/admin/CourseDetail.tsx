import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Clock, BookOpen, ShieldAlert, CheckCircle2, ListChecks, ClipboardList, ArrowLeft } from "lucide-react";
import { Courses } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { riskColor } from "@/lib/utils";

export function CourseDetail() {
  const { id } = useParams();
  const courseId = Number(id);
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({
    queryKey: ["course", courseId],
    queryFn: () => Courses.detail(courseId),
    enabled: !Number.isNaN(courseId),
  });

  if (isLoading) {
    return <div className="text-slate-500">Loading course…</div>;
  }
  if (!data) {
    return (
      <div className="space-y-4">
        <Link to="/admin/courses" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-brand-600">
          <ArrowLeft className="h-4 w-4" /> Back to courses
        </Link>
        <Card className="p-8 text-center">
          <p className="text-slate-500">Course not found.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          to="/admin/courses"
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-brand-600"
        >
          <ArrowLeft className="h-4 w-4" /> Back to courses
        </Link>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{data.title}</h1>
              <p className="mt-1 max-w-2xl text-sm text-slate-600">{data.description}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                <Badge tone="brand">
                  <Clock className="h-3 w-3" /> {data.estimated_minutes} min
                </Badge>
                <Badge tone="brand" className="capitalize">{data.difficulty}</Badge>
                <Badge>{data.language}</Badge>
              </div>
            </div>
            <Button onClick={() => navigate("/admin/assignments", { state: { course_id: data.id } })}>
              <ClipboardList className="h-4 w-4" /> Assign to employees
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle><BookOpen className="mr-2 inline h-4 w-4" /> Lessons ({data.lessons.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-3 text-sm">
              {data.lessons.map((l) => (
                <li key={l.id} className="rounded-xl border border-slate-100 p-3">
                  <div className="font-medium text-slate-900">
                    {l.order_index + 1}. {l.title}
                  </div>
                  <p className="mt-1 text-slate-600">{l.content}</p>
                  {l.key_takeaway && (
                    <p className="mt-2 inline-flex items-center gap-1 rounded-md bg-brand-50 px-2 py-1 text-xs text-brand-700">
                      <CheckCircle2 className="h-3.5 w-3.5" /> {l.key_takeaway}
                    </p>
                  )}
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle><ShieldAlert className="mr-2 inline h-4 w-4" /> Scenarios ({data.scenarios.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 text-sm">
              {data.scenarios.map((s) => (
                <li key={s.id} className="rounded-xl border border-slate-100 p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-900">{s.title}</span>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-xs capitalize ${riskColor(s.risk_level)}`}
                    >
                      {s.risk_level} risk
                    </span>
                  </div>
                  <p className="mt-1 text-slate-600">{s.situation}</p>
                  <p className="mt-2 text-xs italic text-slate-500">
                    Q: {s.question}
                  </p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle><ListChecks className="mr-2 inline h-4 w-4" /> Quiz ({data.quiz.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-3 text-sm">
            {data.quiz.map((q, idx) => (
              <li key={q.id} className="rounded-xl border border-slate-100 p-3">
                <div className="font-medium text-slate-900">
                  {idx + 1}. {q.question}
                </div>
                <ul className="mt-2 space-y-1">
                  {q.options.map((o, i) => (
                    <li
                      key={i}
                      className={
                        o === q.correct_answer
                          ? "text-emerald-700 font-medium"
                          : "text-slate-600"
                      }
                    >
                      • {o} {o === q.correct_answer && "✓"}
                    </li>
                  ))}
                </ul>
                {q.explanation && (
                  <p className="mt-2 text-xs text-slate-500">
                    Explanation: {q.explanation}
                  </p>
                )}
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}

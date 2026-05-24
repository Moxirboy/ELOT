import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { BookOpen, Clock, Sparkles, Trash2 } from "lucide-react";
import { Courses } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Empty } from "@/components/ui/Empty";
import { Button } from "@/components/ui/Button";
import { CourseCover } from "@/components/learning/CourseCover";

export function CourseLibrary() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["courses"],
    queryFn: Courses.list,
  });
  const remove = useMutation({
    mutationFn: (id: number) => Courses.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["courses"] }),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Course library</h1>
          <p className="text-sm text-slate-500">
            All published and AI-generated courses for your company.
          </p>
        </div>
        <Link to="/admin/course-builder">
          <Button>
            <Sparkles className="h-4 w-4" /> Generate new course
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="text-sm text-slate-500">Loading…</div>
      ) : !data || data.length === 0 ? (
        <Empty
          icon={<BookOpen className="h-5 w-5" />}
          title="No courses yet"
          description="Use the AI Course Builder to create your first one."
          action={
            <Link to="/admin/course-builder">
              <Button>
                <Sparkles className="h-4 w-4" /> Build with AI
              </Button>
            </Link>
          }
        />
      ) : (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {data.map((c) => (
            <Card key={c.id} className="group flex flex-col overflow-hidden">
              <Link
                to={`/admin/courses/${c.id}`}
                className="block transition group-hover:opacity-95"
                aria-label={`Open ${c.title}`}
              >
                <CourseCover
                  title={c.title}
                  subtitle={c.description}
                  variant="tile"
                />
              </Link>
              <div className="flex-1 p-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-base font-semibold text-slate-900 line-clamp-2">
                    {c.title}
                  </h3>
                  <Badge tone="brand" className="capitalize">
                    {c.difficulty}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-slate-500 line-clamp-2">
                  {c.description}
                </p>
                <div className="mt-3 flex items-center gap-3 text-xs text-slate-500">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" /> {c.estimated_minutes} min
                  </span>
                  <span>·</span>
                  <span>{c.language}</span>
                </div>
              </div>
              <div className="flex items-center justify-between border-t border-slate-100 p-4">
                <Link
                  to={`/admin/courses/${c.id}`}
                  className="text-sm font-medium text-brand-600 hover:underline"
                >
                  Open course →
                </Link>
                <button
                  onClick={() => {
                    if (confirm(`Delete "${c.title}"?`)) remove.mutate(c.id);
                  }}
                  className="rounded-lg p-1 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300"
                  aria-label={`Delete ${c.title}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

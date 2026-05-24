import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth";

export function RequireCandidate({ children }: { children: React.ReactNode }) {
  const { candidate, loading } = useAuth();
  const location = useLocation();
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-500">
        Loading…
      </div>
    );
  }
  if (!candidate) {
    return (
      <Navigate to="/candidate/login" replace state={{ from: location }} />
    );
  }
  return <>{children}</>;
}

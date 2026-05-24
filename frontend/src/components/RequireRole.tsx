import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import type { Role } from "@/lib/api";

/**
 * Gate that requires the logged-in user to have *one of* the listed roles.
 * Admin is automatically allowed.
 */
export function RequireRole({
  role,
  children,
}: {
  role: Role | Role[];
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-500">
        Loading…
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  const allowed = Array.isArray(role) ? role : [role];
  if (user.role !== "admin" && !allowed.includes(user.role)) {
    // Send users to their home page for their actual role.
    const fallback =
      user.role === "manager"
        ? "/manager"
        : user.role === "supervisor"
          ? "/supervisor"
          : user.role === "buddy"
            ? "/buddy"
            : user.role === "it"
              ? "/it"
              : user.role === "learner"
                ? "/learner/dashboard"
                : "/admin/dashboard";
    return <Navigate to={fallback} replace />;
  }
  return <>{children}</>;
}

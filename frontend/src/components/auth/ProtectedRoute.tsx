import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import type { Role } from "@/lib/api";
import { canonicalRole, homeForRole } from "@/lib/roleRedirect";

interface Props {
  children: React.ReactNode;
  /** One or more roles allowed to enter. Admin always passes. */
  roles?: Role | Role[];
  /** If true, only requires that the user is signed in (any role). */
  anyRole?: boolean;
}

/**
 * Wraps a route. Behaviour:
 *  • not signed in → /login
 *  • signed in but wrong role → /unauthorized
 *  • signed in + right role → renders children
 */
export function ProtectedRoute({ children, roles, anyRole }: Props) {
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
  if (anyRole) return <>{children}</>;
  if (!roles) return <>{children}</>;

  const allowed = (Array.isArray(roles) ? roles : [roles]).map(canonicalRole);
  if (user.role === "admin" || allowed.includes(user.role)) return <>{children}</>;
  // Optional UX: bounce to /unauthorized instead of the user's home so the
  // mistake is visible. Switch to homeForRole for silent redirect.
  void homeForRole;
  return <Navigate to="/unauthorized" replace />;
}

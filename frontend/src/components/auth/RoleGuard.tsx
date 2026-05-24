/**
 * Inline guard for individual UI affordances inside an otherwise-shared page.
 * Use ``<ProtectedRoute>`` for whole routes and ``<RoleGuard>`` for a button
 * or section visible to a subset of users.
 *
 *  <RoleGuard roles={["manager", "supervisor"]}>
 *    <ApproveButton />
 *  </RoleGuard>
 */
import type { ReactNode } from "react";
import { useAuth } from "@/lib/auth";
import type { Role } from "@/lib/api";
import { canonicalRole } from "@/lib/roleRedirect";

export function RoleGuard({
  roles,
  fallback = null,
  children,
}: {
  roles: Role | Role[];
  fallback?: ReactNode;
  children: ReactNode;
}) {
  const { user } = useAuth();
  if (!user) return <>{fallback}</>;
  const allowed = (Array.isArray(roles) ? roles : [roles]).map(canonicalRole);
  if (user.role === "admin" || allowed.includes(user.role)) return <>{children}</>;
  return <>{fallback}</>;
}

/**
 * Centralized post-login redirect rules.
 *
 * Role names accepted include both the backend canonical values
 * (admin / learner / it) and the spec-aligned aliases
 * (hr_admin / employee / it_admin). Any unknown role lands at "/".
 */

import type { Role } from "./api";

export const ROLE_HOME: Record<string, string> = {
  // Backend canonical
  admin: "/admin/onboarding-os",
  super_admin: "/admin/dashboard",
  hr_admin: "/admin/onboarding-os",
  // Manager + supervisor land on their own role-scoped layouts at the top
  // level. The admin-only versions (/admin/onboarding-os/manager etc.) stay
  // available to HR for "view-as-anyone" with the employee dropdown.
  manager: "/manager",
  supervisor: "/supervisor",
  buddy: "/buddy/dashboard",
  it: "/it/dashboard",
  it_admin: "/it/dashboard",
  learner: "/learner/onboarding-os/timeline",
  employee: "/learner/onboarding-os/timeline",
};

/** Where to send a user right after login. */
export function homeForRole(role: Role | string | null | undefined): string {
  if (!role) return "/";
  return ROLE_HOME[role] ?? "/";
}

/** Map any role alias to the backend canonical name we issue in JWTs. */
export function canonicalRole(role: string): Role {
  switch (role) {
    case "hr_admin":
    case "super_admin":
      return "admin";
    case "it_admin":
      return "it";
    case "employee":
      return "learner";
    default:
      return role as Role;
  }
}

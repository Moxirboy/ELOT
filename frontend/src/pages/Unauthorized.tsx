import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, ShieldOff } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { homeForRole } from "@/lib/roleRedirect";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Logo } from "@/components/ui/Logo";

export function Unauthorized() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-hero bg-grid">
      <div className="mx-auto max-w-2xl px-4 py-16">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
        >
          <ArrowLeft className="h-4 w-4" /> Back to landing
        </Link>

        <Card className="mt-10 p-10 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
            <ShieldOff className="h-7 w-7" />
          </div>
          <h1 className="mt-4 text-2xl font-bold text-slate-900">
            You don't have access to this page
          </h1>
          {user ? (
            <p className="mt-2 text-sm text-slate-600">
              You're signed in as <strong>{user.full_name}</strong> ({user.role}
              ). This route requires a different role.
            </p>
          ) : (
            <p className="mt-2 text-sm text-slate-600">
              You're not signed in. Pick a role on the login page.
            </p>
          )}
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {user ? (
              <>
                <Button onClick={() => navigate(homeForRole(user.role))}>
                  Go to my dashboard
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    logout();
                    navigate("/login");
                  }}
                >
                  Sign out
                </Button>
              </>
            ) : (
              <Button onClick={() => navigate("/login")}>Go to login</Button>
            )}
          </div>
          <Logo className="mx-auto mt-10 opacity-60" />
        </Card>
      </div>
    </div>
  );
}

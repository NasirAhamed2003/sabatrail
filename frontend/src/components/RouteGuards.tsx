import type { ReactNode } from "react";
import { Link, Navigate, useLocation } from "react-router";
import { useAuth } from "../lib/auth";
import { loginPath } from "../lib/routing";

// Signed-in visitors only; others go to login and come back afterwards
export function RequireAuth({ children }: { children: ReactNode }) {
  const { isLoggedIn } = useAuth();
  const location = useLocation();

  if (!isLoggedIn) {
    return <Navigate to={loginPath(location.pathname + location.search)} replace />;
  }

  return <>{children}</>;
}

// Administrators only. The API enforces this too; this keeps the UI honest.
export function RequireAdmin({ children }: { children: ReactNode }) {
  const { isLoggedIn, isAdmin } = useAuth();
  const location = useLocation();

  if (!isLoggedIn) {
    return <Navigate to={loginPath(location.pathname)} replace />;
  }

  if (!isAdmin) {
    return (
      <section className="container status-page">
        <h1>Administrators only</h1>
        <p>Your account doesn't have access to the management area.</p>
        <Link to="/">Back to destinations</Link>
      </section>
    );
  }

  return <>{children}</>;
}

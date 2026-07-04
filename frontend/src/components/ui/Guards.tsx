import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { Loading } from "./Primitives";
import type { UserRole } from "../../types";

export function ProtectedRoute() {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <Loading label="Checking session…" />;
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
}

export function RoleGuard({ roles }: { roles: UserRole[] }) {
  const { hasRole } = useAuth();
  if (!hasRole(...roles)) {
    return (
      <div className="card text-center py-12">
        <p className="font-display text-lg">Restricted</p>
        <p className="text-sm text-ink/50 mt-1">Your role doesn't have access to this page.</p>
      </div>
    );
  }
  return <Outlet />;
}

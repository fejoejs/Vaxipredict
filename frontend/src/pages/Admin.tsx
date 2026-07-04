import { useState } from "react";
import { apiClient } from "../api/client";
import { useApi } from "../hooks/useApi";
import { PageHeader, Loading, ErrorState } from "../components/ui/Primitives";
import type { UserRole } from "../types";

interface AdminUser { id: string; full_name: string; email: string; role: UserRole; is_active: boolean; }

const ROLES: UserRole[] = ["admin", "analyst", "health_worker", "viewer"];

export default function Admin() {
  const { data, loading, error, refetch } = useApi<AdminUser[]>(() => apiClient.get("/admin/users").then((r) => r.data), []);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function changeRole(id: string, role: UserRole) {
    setSuccessMsg(null);
    setErrorMsg(null);
    try {
      await apiClient.patch(`/admin/users/${id}/role`, null, { params: { role } });
      setSuccessMsg("User role updated successfully.");
      refetch();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || "Failed to update role.");
    }
  }
  async function toggleActive(id: string, isActive: boolean) {
    setSuccessMsg(null);
    setErrorMsg(null);
    try {
      await apiClient.patch(`/admin/users/${id}/status`, null, { params: { is_active: !isActive } });
      setSuccessMsg(isActive ? "User suspended successfully." : "User activated successfully.");
      refetch();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || "Failed to change user status.");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Admin Panel" description="Manage platform users, roles, and access." />

      {successMsg && (
        <p className="text-xs text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 rounded-md px-3 py-2.5">
          ✓ {successMsg}
        </p>
      )}
      
      {errorMsg && (
        <p className="text-xs text-coral bg-coral/10 border border-coral/20 rounded-md px-3 py-2.5">
          ✗ {errorMsg}
        </p>
      )}

      {loading && <Loading />}
      {error && <ErrorState message={error} onRetry={refetch} />}
      {data && (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-ink/50 border-b border-line">
                <th className="py-2 pr-4">Name</th>
                <th className="py-2 pr-4">Email</th>
                <th className="py-2 pr-4">Role</th>
                <th className="py-2 pr-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.map((u) => (
                <tr key={u.id} className="border-b border-line last:border-0">
                  <td className="py-2 pr-4">{u.full_name}</td>
                  <td className="py-2 pr-4">{u.email}</td>
                  <td className="py-2 pr-4">
                    <select className="input py-1" value={u.role} onChange={(e) => changeRole(u.id, e.target.value as UserRole)}>
                      {ROLES.map((r) => <option key={r} value={r}>{r.replace("_", " ")}</option>)}
                    </select>
                  </td>
                  <td className="py-2 pr-4">
                    <button
                      onClick={() => toggleActive(u.id, u.is_active)}
                      className={`badge ${u.is_active ? "badge-low" : "badge-high"}`}
                    >
                      {u.is_active ? "Active" : "Suspended"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

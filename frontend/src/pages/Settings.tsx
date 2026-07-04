import { useState, useEffect } from "react";
import { apiClient } from "../api/client";
import { PageHeader, Loading, ErrorState } from "../components/ui/Primitives";

export default function Settings() {
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    apiClient.get("/auth/me")
      .then((res) => {
        setFullName(res.data.full_name);
        setEmail(res.data.email);
        setRole(res.data.role);
        setLoading(false);
      })
      .catch((err) => {
        setError("Failed to load profile details");
        setLoading(false);
      });
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSuccess(null);
    setError(null);
    try {
      const payload: any = { full_name: fullName };
      if (password) {
        payload.password = password;
      }
      await apiClient.put("/auth/profile", payload);
      setSuccess("Profile settings updated successfully!");
      setPassword(""); // Clear password field
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to update profile settings");
    }
  }

  if (loading) return <Loading />;
  if (error && !fullName) return <ErrorState message={error} />;

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Manage your account profile details and authentication credentials." />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side: Profile Summary Card */}
        <div className="lg:col-span-1 space-y-4">
          <div className="card text-center py-8 relative overflow-hidden bg-slate-900/30 border border-violet-500/10">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-violet-600 to-pink-500"></div>
            
            {/* Avatar Placeholder */}
            <div className="w-20 h-20 bg-gradient-to-tr from-violet-600 to-pink-500 rounded-full mx-auto flex items-center justify-center shadow-lg shadow-violet-600/20 mb-4">
              <span className="text-white text-3xl font-display font-bold">
                {fullName ? fullName.charAt(0).toUpperCase() : "U"}
              </span>
            </div>

            <h3 className="text-lg font-semibold text-white">{fullName}</h3>
            <p className="text-xs text-slate-400 mt-1">{email}</p>
            
            <div className="mt-4">
              <span className="badge bg-violet-500/15 text-purple-300 border border-violet-500/20 px-3 py-1 rounded-full text-xs font-semibold capitalize">
                {role.replace("_", " ")}
              </span>
            </div>
          </div>
          
          <div className="card p-5 bg-slate-900/30 border border-line text-xs text-slate-400 space-y-2">
            <p className="font-semibold text-slate-300">Authentication Scheme</p>
            <p>Your session is secured using standard JSON Web Tokens (JWT) with secure HTTP headers.</p>
          </div>
        </div>

        {/* Right Side: Settings Actions Form */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSave} className="card p-6 bg-slate-900/30 border border-line space-y-6">
            <h2 className="font-display text-lg font-semibold text-white border-b border-line/40 pb-3 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded bg-violet-500"></span>
              Edit Account Preferences
            </h2>

            {success && (
              <p className="text-xs text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 rounded-md px-3 py-2.5">
                ✓ {success}
              </p>
            )}
            
            {error && (
              <p className="text-xs text-coral bg-coral/10 border border-coral/20 rounded-md px-3 py-2.5">
                ✗ {error}
              </p>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="input"
                  placeholder="Enter your full name"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">Email Address (Read-only)</label>
                <input
                  type="email"
                  value={email}
                  disabled
                  className="input opacity-50 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">New Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input"
                  placeholder="Leave blank to keep current password"
                />
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-line/30">
              <button type="submit" className="btn-primary">
                Update Settings
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

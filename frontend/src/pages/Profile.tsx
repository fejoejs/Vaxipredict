import { useState, useEffect } from "react";
import { apiClient } from "../api/client";
import { PageHeader, Loading, ErrorState } from "../components/ui/Primitives";
import { useAuth } from "../context/AuthContext";

interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  role: string;
  is_active: boolean;
}

export default function Profile() {
  const { user: authUser } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [avatarSeed, setAvatarSeed] = useState("");

  useEffect(() => {
    fetchProfile();
  }, []);

  async function fetchProfile() {
    setLoading(true);
    setError(null);
    try {
      const { data } = await apiClient.get<UserProfile>("/auth/me");
      setProfile(data);
      setFullName(data.full_name);
      setEmail(data.email);
      setAvatarSeed(data.full_name || data.email || "avatar");
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to load profile");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSuccess(null);
    setError(null);
    // Simulate saving profile updates
    try {
      setSuccess("Profile information updated successfully! (Simulation)");
      // Refresh local seed to update initials
      setAvatarSeed(fullName);
      // Update local storage user details if changed
      const localUser = localStorage.getItem("vaxipredict_user");
      if (localUser && profile) {
        const parsed = JSON.parse(localUser);
        parsed.fullName = fullName;
        localStorage.setItem("vaxipredict_user", JSON.stringify(parsed));
      }
    } catch (err) {
      setError("Failed to update profile information");
    }
  }

  if (loading) return <Loading label="Loading profile data..." />;
  if (error) return <ErrorState message={error} onRetry={fetchProfile} />;
  if (!profile) return null;

  // Initials for avatar
  const initials = fullName
    ? fullName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "U";

  return (
    <div>
      <PageHeader title="My Profile" description="Manage your account profile details, credentials, and settings." />

      <div className="grid grid-cols-1 md:grid-cols-[250px_1fr] gap-8">
        {/* Left Card: Avatar and Status */}
        <div className="card flex flex-col items-center text-center space-y-4">
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center text-3xl font-bold border-4 border-purple-500/20">
              {initials}
            </div>
            <span className="absolute bottom-1 right-1 w-5 h-5 bg-emerald-500 border-4 border-slate-900 rounded-full" title="Online Status" />
          </div>

          <div>
            <h3 className="font-semibold text-lg text-white">{fullName}</h3>
            <p className="text-xs text-purple-400 capitalize font-medium">{profile.role.replace("_", " ")}</p>
          </div>

          <div className="text-xs text-slate-400 pt-2 w-full border-t border-line/40">
            <p>System Status: <span className="text-emerald-400 font-semibold">Active</span></p>
            <p className="mt-1">User ID: <code className="bg-slate-950 px-1 py-0.5 rounded text-[10px] text-purple-400">{profile.id.substring(0, 8)}...</code></p>
          </div>

          <button className="btn-secondary w-full text-xs" onClick={() => alert("Image upload modal would open here.")}>
            Change Avatar
          </button>
        </div>

        {/* Right Card: Details Form */}
        <div className="card space-y-6">
          <h2 className="font-display text-xl text-white border-b border-line/40 pb-2">Profile Information</h2>

          {success && <p className="text-xs text-emerald-400 bg-emerald-500/10 rounded-md px-3 py-2">{success}</p>}

          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-slate-400">Full Name</label>
                <input
                  type="text"
                  required
                  className="input mt-1"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-400">Email Address</label>
                <input
                  type="email"
                  required
                  className="input mt-1"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-slate-400">Role</label>
                <input
                  type="text"
                  disabled
                  className="input mt-1 bg-slate-950/40 text-slate-400 cursor-not-allowed capitalize"
                  value={profile.role.replace("_", " ")}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-400">Account Status</label>
                <input
                  type="text"
                  disabled
                  className="input mt-1 bg-slate-950/40 text-slate-400 cursor-not-allowed"
                  value={profile.is_active ? "Active / Authorized" : "Inactive"}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-line/40">
              <button type="submit" className="btn-primary">
                Save Changes
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

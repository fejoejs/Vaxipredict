import { useState, useEffect } from "react";
import { apiClient } from "../api/client";
import { PageHeader, Loading, ErrorState } from "../components/ui/Primitives";
import { generateDefaultAvatar } from "../utils/avatar";

interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  role: string;
  is_active: boolean;
  avatar_url?: string | null;
}

export default function Profile() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [savingAvatar, setSavingAvatar] = useState(false);

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
      setAvatarUrl(data.avatar_url || null);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to load profile");
    } finally {
      setLoading(false);
    }
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setError("Image size must be less than 2MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      setSavingAvatar(true);
      setError(null);
      setSuccess(null);
      try {
        const { data } = await apiClient.put("/auth/profile", {
          avatar_url: base64
        });
        setAvatarUrl(data.avatar_url);
        setSuccess("Avatar updated successfully!");
        
        const localUser = localStorage.getItem("vaxipredict_user");
        if (localUser) {
          const parsed = JSON.parse(localUser);
          parsed.avatarUrl = data.avatar_url;
          localStorage.setItem("vaxipredict_user", JSON.stringify(parsed));
        }
      } catch (err: any) {
        setError(err.response?.data?.detail || "Failed to upload avatar");
      } finally {
        setSavingAvatar(false);
      }
    };
    reader.readAsDataURL(file);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSuccess(null);
    setError(null);
    try {
      const { data } = await apiClient.put("/auth/profile", {
        full_name: fullName,
      });
      setSuccess("Profile information updated successfully!");
      
      const localUser = localStorage.getItem("vaxipredict_user");
      if (localUser) {
        const parsed = JSON.parse(localUser);
        parsed.fullName = fullName;
        localStorage.setItem("vaxipredict_user", JSON.stringify(parsed));
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to update profile information");
    }
  }

  if (loading) return <Loading label="Loading profile data..." />;
  if (error) return <ErrorState message={error} onRetry={fetchProfile} />;
  if (!profile) return null;

  const avatarSrc = avatarUrl || generateDefaultAvatar(fullName);

  return (
    <div>
      <PageHeader title="My Profile" description="Manage your account profile details, credentials, and settings." />

      <div className="grid grid-cols-1 md:grid-cols-[250px_1fr] gap-8">
        {/* Left Card: Avatar and Status */}
        <div className="card flex flex-col items-center text-center space-y-4">
          <div className="relative">
            <img
              src={avatarSrc}
              alt="Avatar"
              className="w-24 h-24 rounded-full object-cover border-4 border-purple-500/20 shadow-lg"
            />
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

          <input
            type="file"
            id="avatar-upload-input"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarChange}
          />

          <button
            className="btn-secondary w-full text-xs"
            disabled={savingAvatar}
            onClick={() => document.getElementById("avatar-upload-input")?.click()}
          >
            {savingAvatar ? "Uploading..." : "Change Avatar"}
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
                <label className="text-xs font-medium text-slate-400">Email Address (Read-only)</label>
                <input
                  type="email"
                  disabled
                  className="input mt-1 bg-slate-950/40 text-slate-400 cursor-not-allowed"
                  value={email}
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

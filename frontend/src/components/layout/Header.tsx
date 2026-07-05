import { NavLink, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "../../context/AuthContext";
import { apiClient } from "../../api/client";
import type { UserRole } from "../../types";
import { generateDefaultAvatar } from "../../utils/avatar";

const NAV_ITEMS: { to: string; label: string; roles?: UserRole[] }[] = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/upload", label: "Upload", roles: ["admin", "analyst"] },
  { to: "/predictions", label: "Predictions", roles: ["admin", "analyst"] },
  { to: "/heatmap", label: "Heatmap" },
  { to: "/forecasting", label: "Forecasting" },
  { to: "/interventions", label: "Interventions", roles: ["admin", "analyst", "health_worker"] },
  { to: "/reminders", label: "Reminders", roles: ["admin", "analyst", "health_worker"] },
  { to: "/rumors", label: "Rumor Detection", roles: ["admin", "analyst", "health_worker"] },
  { to: "/knowledge", label: "Knowledge Library" },
  { to: "/analytics", label: "Analytics" },
  { to: "/reports", label: "Reports", roles: ["admin", "analyst"] },
];

interface UserProfile {
  full_name: string;
  email: string;
  role: string;
  avatar_url?: string | null;
}

interface NotificationItem {
  id: string;
  is_read: boolean;
}

export default function Header() {
  const { isAuthenticated, logout, hasRole } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const visibleNavItems = isAuthenticated
    ? NAV_ITEMS.filter((item) => {
        if (!item.roles) return true;
        return item.roles.some((r) => hasRole(r));
      })
    : [];

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch full profile and notifications when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchUserProfile();
      fetchNotificationsCount();
    }

    // Listen for notification updates dispatched from other pages
    const handleUpdate = () => fetchNotificationsCount();
    window.addEventListener("notifications_updated", handleUpdate);
    return () => window.removeEventListener("notifications_updated", handleUpdate);
  }, [isAuthenticated]);

  async function fetchUserProfile() {
    try {
      const { data } = await apiClient.get<UserProfile>("/auth/me");
      setProfile(data);
    } catch (err) {
      console.error("Failed to fetch header user profile:", err);
    }
  }

  async function fetchNotificationsCount() {
    try {
      const { data } = await apiClient.get<NotificationItem[]>("/notifications");
      const unread = data.filter((n) => !n.is_read).length;
      setUnreadCount(unread);
    } catch (err) {
      console.error("Failed to fetch notification counts:", err);
    }
  }

  function handleLogoutConfirm() {
    setShowLogoutModal(false);
    setDropdownOpen(false);
    logout();
    navigate("/login");
  }

  const initials = profile?.full_name
    ? profile.full_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "U";

  return (
    <>
      <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur border-b border-line">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <NavLink to="/" className="flex items-center gap-2 shrink-0">
          <span className="w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center font-display font-semibold shadow-lg shadow-purple-500/20">
            V
          </span>
          <span className="font-display text-lg font-semibold tracking-tight text-white">VaxiPredict</span>
        </NavLink>

        <nav className="hidden lg:flex items-center gap-1 overflow-x-auto scrollbar-none max-w-[60%]">
          {visibleNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `px-3 py-2 rounded-md text-xs font-semibold whitespace-nowrap transition-all ${
                  isActive
                    ? "bg-purple-600/20 text-purple-300 border border-purple-500/30"
                    : "text-slate-300 hover:text-white hover:bg-slate-900/60"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
          {isAuthenticated && hasRole("admin") && (
            <NavLink
              to="/admin"
              className={({ isActive }) =>
                `px-3 py-2 rounded-md text-xs font-semibold whitespace-nowrap transition-all ${
                  isActive
                    ? "bg-purple-600/20 text-purple-300 border border-purple-500/30"
                    : "text-slate-300 hover:text-white hover:bg-slate-900/60"
                }`
              }
            >
              Admin
            </NavLink>
          )}
        </nav>

        <div className="flex items-center gap-2 shrink-0 relative" ref={dropdownRef}>
          {isAuthenticated ? (
            <>
              {/* Profile Dropdown Container */}
              <div>
                {/* Profile Avatar Trigger */}
                <button
                  onClick={() => setDropdownOpen((v) => !v)}
                  className="flex items-center gap-2 p-0.5 rounded-full hover:bg-slate-900/60 transition-colors focus:outline-none"
                >
                   <div className="relative">
                    <img
                      src={profile?.avatar_url || generateDefaultAvatar(profile?.full_name || "")}
                      alt="Avatar"
                      className="w-8 h-8 rounded-full object-cover shadow border border-purple-500/30"
                    />
                    <span className="absolute bottom-0 right-0 w-2 h-2 bg-emerald-500 border border-slate-950 rounded-full" />
                  </div>
                  <span className="hidden md:inline text-xs font-medium text-slate-300 ml-2 select-none">
                    {profile?.full_name}
                  </span>
                  <span className="text-slate-400 text-[10px] ml-1.5 hidden md:inline">▼</span>
                </button>
 
                {/* Profile Dropdown Menu */}
                {dropdownOpen && (
                  <div className="absolute right-0 mt-2.5 w-64 bg-slate-900/95 backdrop-blur-xl border border-line rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-3 duration-200">
                    
                    {/* 1. User Information */}
                    <div className="p-4 bg-gradient-to-b from-purple-950/20 to-slate-900/40 border-b border-line flex gap-3 items-center">
                      <div className="relative">
                        <img
                          src={profile?.avatar_url || generateDefaultAvatar(profile?.full_name || "")}
                          alt="Avatar"
                          className="w-10 h-10 rounded-full object-cover border border-purple-500/35"
                        />
                        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-slate-950 rounded-full" />
                      </div>
                      <div className="overflow-hidden leading-tight">
                        <p className="text-xs font-semibold text-white truncate">{profile?.full_name}</p>
                        <p className="text-[10px] text-slate-400 truncate mt-0.5">{profile?.email}</p>
                        <span className="inline-block mt-1 text-[8px] font-bold bg-purple-500/20 text-purple-300 rounded px-1.5 py-0.5 uppercase tracking-wide">
                          {profile?.role.replace("_", " ")}
                        </span>
                      </div>
                    </div>

                    {/* Dropdown Items List */}
                    <div className="py-1 max-h-[300px] overflow-y-auto">
                      
                      {/* 2. Notifications */}
                      <div className="px-3 py-1 border-b border-line/40">
                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Alerts</p>
                        <NavLink
                          to="/notifications"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center justify-between px-2 py-1 rounded-md text-xs text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                        >
                          <span>Notifications</span>
                          {unreadCount > 0 && (
                            <span className="bg-purple-600 text-white font-bold text-[9px] rounded-full px-1.5 py-0.2">
                              {unreadCount}
                            </span>
                          )}
                        </NavLink>
                      </div>

                      {/* 3. My Profile */}
                      <div className="px-3 py-1 border-b border-line/40">
                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">My Profile</p>
                        <NavLink
                          to="/profile"
                          onClick={() => setDropdownOpen(false)}
                          className="flex flex-col"
                        >
                          <span className="px-2 py-1 rounded-md text-xs text-slate-300 hover:text-white hover:bg-slate-800 transition-colors">
                            View Profile
                          </span>
                        </NavLink>
                      </div>

                      {/* 4. Settings */}
                      <div className="px-3 py-1 border-b border-line/40">
                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Settings</p>
                        <NavLink
                          to="/settings"
                          onClick={() => setDropdownOpen(false)}
                          className="flex flex-col"
                        >
                          <span className="px-2 py-1 rounded-md text-xs text-slate-300 hover:text-white hover:bg-slate-800 transition-colors">
                            Account Settings
                          </span>
                        </NavLink>
                      </div>

                      {/* 5. Help & Support */}
                      <div className="px-3 py-1 border-b border-line/40">
                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Help & Support</p>
                        <NavLink
                          to="/help"
                          onClick={() => setDropdownOpen(false)}
                          className="flex flex-col"
                        >
                          <span className="px-2 py-1 rounded-md text-xs text-slate-300 hover:text-white hover:bg-slate-800 transition-colors">
                            Help Center & FAQ
                          </span>
                        </NavLink>
                      </div>

                      {/* 7. Logout */}
                      <div className="p-1.5">
                        <button
                          onClick={() => setShowLogoutModal(true)}
                          className="w-full text-left px-2.5 py-1.5 rounded-md text-xs font-semibold text-rose-400 hover:text-white hover:bg-rose-500/20 transition-all"
                        >
                          Secure Logout
                        </button>
                      </div>

                    </div>
                  </div>
                )}
              </div>

              {/* Mobile Navigation Menu Toggle */}
              <button
                className="lg:hidden btn-secondary p-2 ml-1 text-slate-300 hover:text-white"
                onClick={() => setMenuOpen((v) => !v)}
                aria-label="Toggle navigation"
              >
                {menuOpen ? (
                  <span className="text-base font-bold">✕</span>
                ) : (
                  <span className="text-base font-bold">☰</span>
                )}
              </button>
            </>
          ) : (
            <div className="flex items-center gap-3">
              <NavLink to="/login" className="text-xs text-slate-300 hover:text-white font-semibold transition-colors">
                Sign In
              </NavLink>
              <NavLink to="/register" className="btn-primary py-1 px-3 text-xs shadow-md">
                Sign Up
              </NavLink>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Nav Dropdown Popover */}
      {isAuthenticated && menuOpen && (
        <>
          {/* Transparent Backdrop to close when clicking outside */}
          <div 
            className="lg:hidden fixed inset-0 z-40 bg-transparent"
            onClick={() => setMenuOpen(false)}
          />
          <nav className="lg:hidden absolute right-6 top-16 z-50 w-48 bg-slate-900/98 backdrop-blur-xl border border-line rounded-xl flex flex-col p-2 gap-1 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200">
            {visibleNavItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                  `px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                    isActive 
                      ? "bg-purple-600/20 text-purple-300 border border-purple-500/20" 
                      : "text-slate-300 hover:bg-slate-800"
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
            {hasRole("admin") && (
              <NavLink
                to="/admin"
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                  `px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                    isActive 
                      ? "bg-purple-600/20 text-purple-300 border border-purple-500/20" 
                      : "text-slate-300 hover:bg-slate-800"
                  }`
                }
              >
                Admin
              </NavLink>
            )}
          </nav>
        </>
      )}
    </header>

    {/* Logout Confirmation Dialog (Modal) */}
    {showLogoutModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-slate-900 border border-line rounded-2xl shadow-2xl max-w-sm w-full p-6 mx-4 space-y-4 animate-in zoom-in-95 duration-200">
          <h3 className="font-display text-lg font-semibold text-white">Confirm Secure Logout</h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            Are you sure you want to end your current session? This will securely clear all cached user data, tokens, and active session states.
          </p>
          <div className="flex gap-3 justify-end pt-2">
            <button
              onClick={() => setShowLogoutModal(false)}
              className="btn-secondary text-xs"
            >
              Cancel
            </button>
            <button
              onClick={handleLogoutConfirm}
              className="bg-rose-600 hover:bg-rose-700 text-white rounded-md px-4 py-2 text-xs font-semibold shadow-md shadow-rose-600/20"
            >
              Yes, Logout
            </button>
          </div>
        </div>
      </div>
    )}
  </>
);
}

import { useState, useEffect } from "react";
import { apiClient } from "../api/client";
import { PageHeader, Loading, ErrorState, EmptyState } from "../components/ui/Primitives";

interface SystemNotification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchNotifications();
  }, []);

  async function fetchNotifications() {
    setLoading(true);
    setError(null);
    try {
      const { data } = await apiClient.get<SystemNotification[]>("/notifications");
      setNotifications(data);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to load notifications");
    } finally {
      setLoading(false);
    }
  }

  async function markRead(id: string) {
    try {
      await apiClient.put(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      // Dispatch custom event to trigger badge update in Header
      window.dispatchEvent(new Event("notifications_updated"));
    } catch (err) {
      console.error(err);
    }
  }

  async function markAllRead() {
    try {
      await apiClient.put("/notifications/read-all");
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      // Dispatch custom event to trigger badge update in Header
      window.dispatchEvent(new Event("notifications_updated"));
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <div>
      <PageHeader
        title="Notifications"
        description="System logs, dataset ingestions, and vaccine hesitancy alert reports."
        action={
          notifications.some((n) => !n.is_read) && (
            <button onClick={markAllRead} className="btn-secondary">
              Mark all as read
            </button>
          )
        }
      />

      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchNotifications} />
      ) : notifications.length === 0 ? (
        <EmptyState title="No notifications yet" description="You will receive notifications when dataset uploads or predictions complete." />
      ) : (
        <div className="card space-y-3">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`p-4 rounded-xl border flex items-start justify-between gap-4 transition-all ${
                n.is_read
                  ? "bg-slate-900/10 border-slate-800/40 opacity-70"
                  : "bg-purple-950/10 border-purple-500/20"
              }`}
            >
              <div>
                <div className="flex items-center gap-2">
                  {!n.is_read && <span className="w-2 h-2 bg-purple-500 rounded-full shrink-0" />}
                  <h4 className="font-semibold text-sm text-white">{n.title}</h4>
                </div>
                <p className="text-xs text-slate-300 mt-1">{n.message}</p>
                <p className="text-[10px] text-slate-500 mt-2">
                  {new Date(n.created_at).toLocaleString()}
                </p>
              </div>

              {!n.is_read && (
                <button
                  onClick={() => markRead(n.id)}
                  className="text-[10px] bg-purple-600/20 hover:bg-purple-600 text-purple-300 hover:text-white px-2 py-1 rounded transition-colors"
                >
                  Mark read
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

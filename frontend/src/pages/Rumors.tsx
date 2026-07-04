import { FormEvent, useState } from "react";
import { apiClient } from "../api/client";
import { useApi } from "../hooks/useApi";
import { useAuth } from "../context/AuthContext";
import { PageHeader, Loading, ErrorState, EmptyState } from "../components/ui/Primitives";

interface RumorRow {
  id: string;
  region_id: string;
  region_name: string;
  source: string;
  content: string;
  risk_score: number;
  status: string;
  created_at: string;
  classification?: string;
}

interface RegionItem {
  id: string;
  name: string;
}

const SOURCES = ["social_media", "community", "sms", "other"];

export default function Rumors() {
  const { hasRole } = useAuth();
  
  // Fetch regions from the public regions endpoint
  const { data: regions, loading: regionsLoading } = useApi<RegionItem[]>(
    () => apiClient.get("/dashboard/regions").then((r) => r.data),
    []
  );

  const { data, loading, error, refetch } = useApi<RumorRow[]>(
    () => apiClient.get("/rumors").then((r) => r.data),
    []
  );

  const [form, setForm] = useState({ region_id: "", source: SOURCES[0], content: "" });
  const [submitting, setSubmitting] = useState(false);
  const [scoreResult, setScoreResult] = useState<number | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.region_id) return;
    setSubmitting(true);
    try {
      const { data } = await apiClient.post("/rumors", form);
      setScoreResult(data.risk_score);
      setForm({ ...form, content: "" });
      refetch();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Submission failed");
    } finally {
      setSubmitting(false);
    }
  }

  async function updateStatus(id: string, status: string) {
    try {
      await apiClient.patch(`/rumors/${id}/status`, null, { params: { status } });
      refetch();
    } catch (err) {
      alert("Failed to update status");
    }
  }

  const regionList = regions || [];

  return (
    <div>
      <PageHeader
        title="Rumor Detection"
        description="Submit reported vaccine misinformation for GNN spatial scoring and route it for review."
      />

      <div className="grid lg:grid-cols-[380px_1fr] gap-6">
        {/* Left Column: Form */}
        <form onSubmit={handleSubmit} className="card space-y-4 h-fit">
          <h3 className="font-display text-base text-white border-b border-line/35 pb-2">Analyze Rumor</h3>
          <div>
            <label className="text-xs font-medium text-slate-400">Region</label>
            <select
              className="input mt-1"
              required
              value={form.region_id}
              onChange={(e) => setForm({ ...form, region_id: e.target.value })}
              disabled={regionsLoading}
            >
              <option value="">Select a region</option>
              {regionList.map((reg) => (
                <option key={reg.id} value={reg.id}>
                  {reg.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-400">Source</label>
            <select className="input mt-1" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })}>
              {SOURCES.map((s) => (
                <option key={s} value={s}>
                  {s.replace("_", " ").toUpperCase()}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-400">Reported content</label>
            <textarea
              className="input mt-1"
              rows={4}
              required
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              placeholder="Paste rumor content here..."
            />
          </div>
          <button type="submit" disabled={submitting} className="btn-primary w-full justify-center">
            {submitting ? "Scoring…" : "Submit for scoring"}
          </button>
          {scoreResult !== null && (
            <div className="text-xs bg-purple-500/10 border border-purple-500/25 rounded-md p-3">
              Calculated Risk Score: <span className="font-mono font-bold text-purple-300">{scoreResult}</span>
            </div>
          )}
        </form>

        {/* Right Column: List of Rumors */}
        <div>
          {loading && <Loading />}
          {error && <ErrorState message={error} onRetry={refetch} />}
          {data && data.length === 0 && <EmptyState title="No rumor reports yet" />}
          {data && data.length > 0 && (
            <div className="space-y-3">
              {data.map((r) => (
                <div key={r.id} className="card border-l-4 border-l-purple-500 hover:border-l-purple-400 transition-all">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] uppercase font-bold text-slate-400">
                          📱 {r.source.replace("_", " ")} • 🗺️ {r.region_name}
                        </span>
                        {r.classification && (
                          <span className="text-[9px] bg-purple-500/10 border border-purple-500/25 text-purple-300 px-1.5 py-0.5 rounded font-semibold">
                            {r.classification}
                          </span>
                        )}
                      </div>
                      <p className="text-xs mt-2 text-white leading-relaxed">{r.content}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-mono text-lg font-bold text-purple-300">{(r.risk_score * 100).toFixed(0)}%</p>
                      <p className="text-[10px] text-slate-500 mt-1">{new Date(r.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-line/20 pt-3">
                    {hasRole("admin", "analyst") ? (
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-400">Status:</span>
                        <select
                          className="input py-0.5 px-2 max-w-[120px] text-[10px] bg-slate-950 border-line"
                          value={r.status}
                          onChange={(e) => updateStatus(r.id, e.target.value)}
                        >
                          {["flagged", "reviewed", "dismissed"].map((s) => (
                            <option key={s} value={s}>
                              {s.toUpperCase()}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <p className="text-[10px] text-slate-400 capitalize">
                        Status: <span className="font-semibold text-purple-400">{r.status}</span>
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

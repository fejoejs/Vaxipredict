import { FormEvent, useState } from "react";
import { apiClient } from "../api/client";
import { useApi } from "../hooks/useApi";
import { PageHeader, Loading, ErrorState, EmptyState } from "../components/ui/Primitives";

const STRATEGIES = [
  { value: "awareness_campaign", label: "Awareness Campaign" },
  { value: "mobile_clinic", label: "Mobile Clinic" },
  { value: "sms_outreach", label: "SMS Outreach" },
  { value: "community_leader_engagement", label: "Community Leader Engagement" },
];

interface InterventionRow {
  id: string;
  region_id: string;
  region_name: string;
  strategy: string;
  target_group: string;
  projected_hesitancy_drop: number;
  budget_estimate: number;
  created_at: string;
}

interface RegionItem {
  id: string;
  name: string;
}

export default function Interventions() {
  // Fetch regions from the public regions endpoint
  const { data: regions, loading: regionsLoading } = useApi<RegionItem[]>(
    () => apiClient.get("/dashboard/regions").then((r) => r.data),
    []
  );

  const { data, loading, error, refetch } = useApi<InterventionRow[]>(
    () => apiClient.get("/interventions").then((r) => r.data),
    []
  );

  const [regionId, setRegionId] = useState("");
  const [strategy, setStrategy] = useState(STRATEGIES[0].value);
  const [targetGroup, setTargetGroup] = useState("general");
  const [result, setResult] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!regionId) return;
    setSubmitting(true);
    setResult(null);
    try {
      const { data } = await apiClient.post("/interventions/simulate", {
        region_id: regionId,
        strategy,
        target_group: targetGroup,
      });
      setResult(data);
      refetch();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Simulation failed");
    } finally {
      setSubmitting(false);
    }
  }

  const regionList = regions || [];

  return (
    <div>
      <PageHeader
        title="Intervention Planning"
        description="Simulate a campaign strategy for a region and get a projected hesitancy reduction and budget estimate."
      />

      <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6 w-full overflow-hidden">
        {/* Left Column: Form */}
        <div className="min-w-0 w-full">
          <form onSubmit={handleSubmit} className="card space-y-4 h-fit">
            <h3 className="font-display text-base text-white border-b border-line/35 pb-2">Simulate Strategy</h3>
            <div>
              <label className="text-xs font-medium text-slate-400">Region</label>
              <select
                className="input mt-1"
                value={regionId}
                onChange={(e) => setRegionId(e.target.value)}
                disabled={regionsLoading}
                required
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
              <label className="text-xs font-medium text-slate-400">Strategy</label>
              <select className="input mt-1" value={strategy} onChange={(e) => setStrategy(e.target.value)}>
                {STRATEGIES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-400">Target group</label>
              <input className="input mt-1" value={targetGroup} onChange={(e) => setTargetGroup(e.target.value)} required />
            </div>
            <button type="submit" disabled={submitting} className="btn-primary w-full justify-center">
              {submitting ? "Simulating…" : "Simulate campaign"}
            </button>

            {result && (
              <div className="text-xs bg-purple-500/10 border border-purple-500/25 rounded-md p-3 space-y-1.5 text-slate-300">
                <p>📍 Region: <span className="font-semibold text-white">{result.region_name}</span></p>
                <p>📉 Current Hesitancy: <span className="font-mono font-semibold text-white">{(result.current_hesitancy * 100).toFixed(1)}%</span></p>
                <p>✨ Projected Drop: <span className="font-mono font-semibold text-emerald-400">-{result.projected_hesitancy_drop * 100}%</span></p>
                <p>🔮 Hesitancy After: <span className="font-mono font-semibold text-purple-300">{(result.projected_hesitancy_after * 100).toFixed(1)}%</span></p>
                <p>💵 Budget Estimate: <span className="font-mono font-semibold text-white">₹{result.budget_estimate.toLocaleString()}</span></p>
              </div>
            )}
          </form>
        </div>

        {/* Right Column: History Table */}
        <div className="min-w-0 overflow-hidden w-full">
          {loading && <Loading />}
          {error && <ErrorState message={error} onRetry={refetch} />}
          {data && data.length === 0 && <EmptyState title="No intervention plans yet" />}
          {data && data.length > 0 && (
            <div className="card overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="text-slate-400 border-b border-line/40 font-medium">
                    <th className="py-2.5 pr-4">Region</th>
                    <th className="py-2.5 pr-4">Strategy</th>
                    <th className="py-2.5 pr-4">Target</th>
                    <th className="py-2.5 pr-4">Projected Drop</th>
                    <th className="py-2.5 pr-4">Budget</th>
                    <th className="py-2.5 pr-4">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((p) => (
                    <tr key={p.id} className="border-b border-line/20 hover:bg-slate-900/30 transition-colors">
                      <td className="py-3 pr-4 font-semibold text-white">{p.region_name}</td>
                      <td className="py-3 pr-4 capitalize text-slate-300">{p.strategy.replace(/_/g, " ")}</td>
                      <td className="py-3 pr-4 text-slate-400">{p.target_group}</td>
                      <td className="py-3 pr-4 font-mono text-emerald-400">-{p.projected_hesitancy_drop * 100}%</td>
                      <td className="py-3 pr-4 font-mono text-white">₹{p.budget_estimate.toLocaleString()}</td>
                      <td className="py-3 pr-4 text-slate-500">{new Date(p.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

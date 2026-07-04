import { apiClient } from "../api/client";
import { useApi } from "../hooks/useApi";
import { PageHeader, Loading, ErrorState, EmptyState, RiskBadge } from "../components/ui/Primitives";

interface HeatCell {
  region_id: string;
  region_name: string;
  state: string;
  latitude: number;
  longitude: number;
  hesitancy_score: number;
  risk_level: string;
}

const RISK_BG: Record<string, string> = {
  low: "bg-emerald-500/10 border-emerald-500/20 text-emerald-300",
  moderate: "bg-amber-500/10 border-amber-500/20 text-amber-300",
  high: "bg-orange-500/10 border-orange-500/20 text-orange-300",
  critical: "bg-purple-500/15 border-purple-500/25 text-purple-300 shadow-md shadow-purple-500/5",
};

export default function Heatmap() {
  const { data, loading, error, refetch } = useApi<HeatCell[]>(
    () => apiClient.get("/heatmap").then((r) => r.data),
    []
  );

  return (
    <div>
      <PageHeader
        title="Risk Heatmap"
        description="Latest hesitancy risk level per region. Darker / warmer cells indicate higher predicted hesitancy."
      />

      {loading && <Loading />}
      {error && <ErrorState message={error} onRetry={refetch} />}
      {data && data.length === 0 && (
        <EmptyState title="No risk data yet" description="Run the prediction pipeline from the AI Prediction page." />
      )}
      {data && data.length > 0 && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data
            .sort((a, b) => b.hesitancy_score - a.hesitancy_score)
            .map((cell) => (
              <div key={cell.region_id} className={`rounded-card border p-5 ${RISK_BG[cell.risk_level] || "bg-slate-900/40 border-line"}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-display text-lg font-bold text-white">{cell.region_name}</p>
                    <p className="text-xs text-slate-400">{cell.state}</p>
                  </div>
                  <RiskBadge level={cell.risk_level} />
                </div>
                <p className="font-mono text-2xl font-bold mt-4 text-purple-300">
                  {cell.hesitancy_score ? (cell.hesitancy_score * 100).toFixed(1) + "%" : "0.0%"}
                </p>
                <p className="text-xs text-slate-500 font-mono mt-1">
                  {cell.latitude.toFixed(3)}°N, {cell.longitude.toFixed(3)}°E
                </p>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

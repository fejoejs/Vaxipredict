import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { apiClient } from "../api/client";
import { useApi } from "../hooks/useApi";
import { PageHeader, Loading, ErrorState, RiskBadge } from "../components/ui/Primitives";

interface TopRegion {
  region_name: string;
  hesitancy_score: number;
  risk_level: string;
}

interface CoveragePoint {
  period: string;
  doses_administered: number;
  avg_hesitancy_rate: number;
}

export default function Analytics() {
  const { data: topRegions, loading: l1, error: e1 } = useApi<TopRegion[]>(
    () => apiClient.get("/analytics/top-regions", { params: { limit: 10 } }).then((r) => r.data), []
  );
  const { data: trend, loading: l2, error: e2 } = useApi<CoveragePoint[]>(
    () => apiClient.get("/analytics/coverage-trend").then((r) => r.data), []
  );

  const formattedTrend = (trend || []).map((pt) => ({
    ...pt,
    avg_hesitancy_percent: pt.avg_hesitancy_rate * 100,
  }));

  const formattedTopRegions = (topRegions || []).map((tr) => ({
    ...tr,
    hesitancy_percent: tr.hesitancy_score * 100,
  }));

  // Math aggregates for premium summary stats
  const avgHesitancy = topRegions && topRegions.length > 0
    ? (topRegions.reduce((sum, r) => sum + r.hesitancy_score, 0) / topRegions.length * 100).toFixed(1) + "%"
    : "N/A";

  const highRiskCount = topRegions
    ? topRegions.filter((r) => r.risk_level === "high" || r.risk_level === "critical").length
    : 0;

  const totalDoses = trend
    ? new Intl.NumberFormat("en-IN").format(trend.reduce((sum, pt) => sum + pt.doses_administered, 0))
    : "N/A";

  return (
    <div className="space-y-6">
      <PageHeader title="Analytics" description="Coverage trends over time and the regions with the highest predicted hesitancy." />

      {/* Premium Statistics Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="card bg-slate-900/30 border border-violet-500/10 backdrop-blur-md p-6 rounded-card relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-violet-600/5 rounded-full blur-xl pointer-events-none"></div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Average Predicted Hesitancy</p>
          <p className="text-3xl font-display font-bold text-white mt-2">{avgHesitancy}</p>
          <div className="flex items-center gap-1.5 mt-2.5">
            <span className="w-2 h-2 rounded-full bg-violet-400"></span>
            <span className="text-[11px] text-slate-400">Aggregated across all states</span>
          </div>
        </div>

        <div className="card bg-slate-900/30 border border-coral/10 backdrop-blur-md p-6 rounded-card relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-coral/5 rounded-full blur-xl pointer-events-none"></div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">High/Critical Risk Areas</p>
          <p className="text-3xl font-display font-bold text-white mt-2">{highRiskCount} <span className="text-sm font-normal text-slate-400">States</span></p>
          <div className="flex items-center gap-1.5 mt-2.5">
            <span className="w-2 h-2 rounded-full bg-coral"></span>
            <span className="text-[11px] text-slate-400">Requires urgent messaging campaigns</span>
          </div>
        </div>

        <div className="card bg-slate-900/30 border border-teal/10 backdrop-blur-md p-6 rounded-card relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-teal/5 rounded-full blur-xl pointer-events-none"></div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Doses Administered</p>
          <p className="text-3xl font-display font-bold text-white mt-2">{totalDoses}</p>
          <div className="flex items-center gap-1.5 mt-2.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span className="text-[11px] text-slate-400">Current reporting cycle count</span>
          </div>
        </div>
      </div>

      <div className="card">
        <h2 className="font-display text-lg mb-4 text-white font-semibold flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded bg-violet-500"></span>
          Doses Administered & Avg. Hesitancy Over Time
        </h2>
        {l2 ? <Loading /> : e2 ? <ErrorState message={e2} /> : (
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={formattedTrend} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
              <defs>
                <linearGradient id="colorDoses" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0.0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" />
              <XAxis dataKey="period" stroke="#94A3B8" fontSize={11} />
              <YAxis yAxisId="left" stroke="#94A3B8" fontSize={11} />
              <YAxis yAxisId="right" orientation="right" domain={[0, 100]} stroke="#94A3B8" fontSize={11} label={{ value: "Predicted Hesitancy %", angle: -90, position: "insideRight", fill: "#94A3B8", offset: 0, style: { textAnchor: "middle", fontSize: "11px" } }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(15, 23, 42, 0.95)",
                  borderColor: "rgba(124, 58, 237, 0.2)",
                  borderRadius: "8px",
                  color: "#fff",
                  fontSize: "11px",
                }}
              />
              <Line yAxisId="left" type="monotone" dataKey="doses_administered" stroke="#10B981" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: "#0B0F19" }} name="Doses Administered" />
              <Line yAxisId="right" type="monotone" dataKey="avg_hesitancy_percent" stroke="#8B5CF6" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: "#0B0F19" }} name="Avg. Hesitancy %" />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="card">
        <h2 className="font-display text-lg mb-4 text-white font-semibold flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded bg-pink-500"></span>
          Top States by Predicted Hesitancy Score
        </h2>
        {l1 ? <Loading /> : e1 ? <ErrorState message={e1} /> : (
          <>
            <ResponsiveContainer width="100%" height={340}>
              <BarChart data={formattedTopRegions} layout="vertical" margin={{ left: 10, right: 20, top: 10, bottom: 20 }}>
                <defs>
                  <linearGradient id="colorHesitancyGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.95}/>
                    <stop offset="95%" stopColor="#EC4899" stopOpacity={0.95}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" />
                <XAxis type="number" domain={[0, 100]} stroke="#94A3B8" fontSize={11} label={{ value: "Hesitancy Score %", position: "insideBottom", offset: -8, fill: "#94A3B8", style: { fontSize: "11px" } }} />
                <YAxis type="category" dataKey="region_name" width={110} stroke="#94A3B8" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(15, 23, 42, 0.95)",
                    borderColor: "rgba(236, 72, 153, 0.2)",
                    borderRadius: "8px",
                    color: "#fff",
                    fontSize: "11px",
                  }}
                />
                <Bar dataKey="hesitancy_percent" fill="url(#colorHesitancyGrad)" radius={[0, 4, 4, 0]} name="Hesitancy %" barSize={16} />
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-6 flex flex-wrap gap-2 pt-4 border-t border-line/30">
              {(topRegions || []).map((r) => (
                <span key={r.region_name} className="text-xs flex items-center gap-2 border border-line bg-slate-900/40 rounded-full px-3.5 py-1.5 text-slate-300">
                  {r.region_name} <RiskBadge level={r.risk_level} />
                </span>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

import { useState, useMemo } from "react";
import { NavLink } from "react-router-dom";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { apiClient } from "../api/client";
import { useApi } from "../hooks/useApi";
import { PageHeader, ErrorState, EmptyState, RiskBadge, StatCardSkeleton, TableSkeleton } from "../components/ui/Primitives";
import type { DashboardSummary, PredictionRow } from "../types";

const RISK_COLORS: Record<string, string> = {
  low: "#10B981",
  moderate: "#F59E0B",
  high: "#EF4444",
  critical: "#7C3AED",
};

export default function Dashboard() {
  // Fetch dashboard aggregate statistics
  const { data: stats, loading: statsLoading, error: statsError, refetch: refetchStats } = useApi<DashboardSummary>(
    () => apiClient.get("/dashboard/summary").then((r) => r.data),
    []
  );

  // Fetch prediction details for the interactive table and filters
  const { data: predictions, loading: predsLoading, error: predsError, refetch: refetchPreds } = useApi<PredictionRow[]>(
    () => apiClient.get("/predictions/latest").then((r) => r.data),
    []
  );

  // Filter States
  const [search, setSearch] = useState("");
  const [selectedRisk, setSelectedRisk] = useState("");
  const [selectedState, setSelectedState] = useState("");
  const [sortField, setSortField] = useState<keyof PredictionRow>("hesitancy_score");
  const [sortAsc, setSortAsc] = useState(false);
  const [page, setPage] = useState(1);
  const rowsPerPage = 5;

  const handleRefetch = () => {
    refetchStats();
    refetchPreds();
  };

  // Get unique states/regions for filters
  const uniqueStates = useMemo(() => {
    if (!predictions) return [];
    return Array.from(new Set(predictions.map((p) => p.region_name))).sort();
  }, [predictions]);

  // Process data with filtering and sorting
  const filteredPredictions = useMemo(() => {
    if (!predictions) return [];
    return predictions
      .filter((p) => {
        const matchesSearch = p.region_name.toLowerCase().includes(search.toLowerCase());
        const matchesRisk = selectedRisk ? p.risk_level === selectedRisk : true;
        const matchesState = selectedState ? p.region_name === selectedState : true;
        return matchesSearch && matchesRisk && matchesState;
      })
      .sort((a, b) => {
        let valA = a[sortField];
        let valB = b[sortField];

        if (typeof valA === "string" && typeof valB === "string") {
          return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }
        if (typeof valA === "number" && typeof valB === "number") {
          return sortAsc ? valA - valB : valB - valA;
        }
        return 0;
      });
  }, [predictions, search, selectedRisk, selectedState, sortField, sortAsc]);

  // Pagination calculations
  const paginatedPredictions = useMemo(() => {
    const start = (page - 1) * rowsPerPage;
    return filteredPredictions.slice(start, start + rowsPerPage);
  }, [filteredPredictions, page]);

  const totalPages = Math.ceil(filteredPredictions.length / rowsPerPage);

  // Handle Sort Toggle
  const handleSort = (field: keyof PredictionRow) => {
    if (sortField === field) {
      setSortAsc((v) => !v);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
    setPage(1);
  };

  if (statsError || predsError) {
    return <ErrorState message={statsError || predsError || "An error occurred"} onRetry={handleRefetch} />;
  }

  const chartData = stats
    ? Object.entries(stats.risk_breakdown).map(([level, count]) => ({ name: level, value: count }))
    : [];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        description="A live, AI-driven overview of routine vaccination coverage and vaccine hesitancy risk across tracked regions."
        action={
          <div className="flex gap-2">
            <NavLink to="/reports" className="btn-primary flex items-center gap-1.5 text-xs">
              📊 Generate Reports
            </NavLink>
          </div>
        }
      />

      {/* KPI Cards Section */}
      {statsLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, idx) => (
            <StatCardSkeleton key={idx} />
          ))}
        </div>
      ) : stats ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Total Regions */}
          <div className="card relative overflow-hidden bg-gradient-to-br from-slate-900/60 to-purple-950/20 hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(139,92,246,0.15)] transition-all duration-300 group">
            <div className="absolute top-3 right-3 text-2xl opacity-10 group-hover:opacity-25 group-hover:scale-110 transition-all select-none">🌍</div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Regions Tracked</p>
            <p className="font-display text-3xl font-bold mt-2 text-white">{stats.total_regions}</p>
            <p className="text-[10px] text-slate-500 mt-2">Active CDC region networks</p>
          </div>

          {/* Average Hesitancy */}
          <div className="card relative overflow-hidden bg-gradient-to-br from-slate-900/60 to-indigo-950/20 hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(99,102,241,0.15)] transition-all duration-300 group">
            <div className="absolute top-3 right-3 text-2xl opacity-10 group-hover:opacity-25 group-hover:scale-110 transition-all select-none">📉</div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Avg. predicted hesitancy</p>
            <p className="font-display text-3xl font-bold mt-2 text-purple-300">{(stats.average_hesitancy_score * 100).toFixed(1)}%</p>
            <p className="text-[10px] text-slate-500 mt-2">GNN+LSTM Spatial-temporal forecast</p>
          </div>

          {/* High Risk Regions */}
          <div className="card relative overflow-hidden bg-gradient-to-br from-slate-900/60 to-rose-950/20 hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(244,63,94,0.15)] transition-all duration-300 group">
            <div className="absolute top-3 right-3 text-2xl opacity-10 group-hover:opacity-25 group-hover:scale-110 transition-all select-none">🚨</div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">High Risk Alerts</p>
            <p className="font-display text-3xl font-bold mt-2 text-rose-400">{stats.high_risk_regions}</p>
            <p className="text-[10px] text-rose-500/80 mt-2">Regions rated High/Critical Risk</p>
          </div>

          {/* Doses Ingested */}
          <div className="card relative overflow-hidden bg-gradient-to-br from-slate-900/60 to-emerald-950/20 hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(16,185,129,0.15)] transition-all duration-300 group">
            <div className="absolute top-3 right-3 text-2xl opacity-10 group-hover:opacity-25 group-hover:scale-110 transition-all select-none">💉</div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Doses Administered</p>
            <p className="font-display text-3xl font-bold mt-2 text-emerald-400">
              {stats.total_doses_administered.toLocaleString()}
            </p>
            <p className="text-[10px] text-slate-500 mt-2">Aggregated doses from CDC uploads</p>
          </div>

        </div>
      ) : null}

      {/* Analytics Chart & Detail Section */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-6 w-full overflow-hidden">
        
        {/* Left: Interactive Details Table */}
        <div className="min-w-0 overflow-hidden w-full">
          {predsLoading ? (
            <TableSkeleton rows={rowsPerPage} cols={5} />
          ) : filteredPredictions.length === 0 && predictions?.length === 0 ? (
            <EmptyState title="No data loaded" description="Seeding or file upload has not populated predictions." />
          ) : (
            <div className="card space-y-4 w-full">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h2 className="font-display text-lg text-white">Region Details & Risk Matrix</h2>
                
                {/* Search Bar */}
                <input
                  type="text"
                  placeholder="Search state..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="input py-1 px-3 max-w-[200px] text-xs bg-slate-950 border-line"
                />
              </div>

              {/* Filters */}
              <div className="flex flex-wrap gap-2.5">
                <select
                  value={selectedRisk}
                  onChange={(e) => {
                    setSelectedRisk(e.target.value);
                    setPage(1);
                  }}
                  className="input py-1 px-2.5 text-[11px] max-w-[140px] bg-slate-950 border-line"
                >
                  <option value="">All Risk Levels</option>
                  <option value="low">Low Risk</option>
                  <option value="moderate">Moderate Risk</option>
                  <option value="high">High Risk</option>
                  <option value="critical">Critical Risk</option>
                </select>

                <select
                  value={selectedState}
                  onChange={(e) => {
                    setSelectedState(e.target.value);
                    setPage(1);
                  }}
                  className="input py-1 px-2.5 text-[11px] max-w-[140px] bg-slate-950 border-line"
                >
                  <option value="">All States</option>
                  {uniqueStates.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="text-slate-400 border-b border-line/40 font-medium">
                      <th className="py-2.5 pr-4 cursor-pointer hover:text-white" onClick={() => handleSort("region_name")}>
                        Region/State {sortField === "region_name" ? (sortAsc ? "▲" : "▼") : ""}
                      </th>
                      <th className="py-2.5 pr-4">Period</th>
                      <th className="py-2.5 pr-4 cursor-pointer hover:text-white" onClick={() => handleSort("hesitancy_score")}>
                        Hesitancy Score {sortField === "hesitancy_score" ? (sortAsc ? "▲" : "▼") : ""}
                      </th>
                      <th className="py-2.5 pr-4 cursor-pointer hover:text-white" onClick={() => handleSort("confidence")}>
                        Confidence {sortField === "confidence" ? (sortAsc ? "▲" : "▼") : ""}
                      </th>
                      <th className="py-2.5 pr-4 cursor-pointer hover:text-white" onClick={() => handleSort("risk_level")}>
                        Risk Level {sortField === "risk_level" ? (sortAsc ? "▲" : "▼") : ""}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedPredictions.map((p, idx) => {
                      const dotColor = RISK_COLORS[p.risk_level] || "#94A3B8";
                      return (
                        <tr key={idx} className="border-b border-line/20 hover:bg-slate-900/30 transition-colors">
                          <td className="py-3 pr-4 font-semibold text-white">
                            <div className="flex items-center gap-2">
                              <span 
                                className="w-1.5 h-1.5 rounded-full" 
                                style={{ backgroundColor: dotColor, boxShadow: `0 0 6px ${dotColor}` }}
                              />
                              {p.region_name}
                            </div>
                          </td>
                          <td className="py-3 pr-4 text-slate-400">{p.period}</td>
                          <td className="py-3 pr-4 font-mono text-purple-300">
                            {p.hesitancy_score ? (p.hesitancy_score * 100).toFixed(1) + "%" : "0.0%"}
                          </td>
                          <td className="py-3 pr-4 font-mono text-slate-400">
                            {p.confidence ? (p.confidence * 100).toFixed(0) + "%" : "0%"}
                          </td>
                          <td className="py-3 pr-4">
                            <div className="flex items-center justify-between gap-4">
                              <RiskBadge level={p.risk_level} />
                              {(p.risk_level === "critical" || p.risk_level === "high") && (
                                <NavLink
                                  to="/interventions"
                                  className="text-[9px] bg-purple-600/20 border border-purple-500/30 text-purple-300 px-2 py-0.5 rounded font-bold hover:bg-purple-600 hover:text-white transition-colors"
                                  title="Plan targeted campaign"
                                >
                                  ⚡ Act
                                </NavLink>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {filteredPredictions.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-slate-500">
                          No matches found for selected filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-3 border-t border-line/20 text-xs">
                  <span className="text-slate-400">
                    Showing {page * rowsPerPage - rowsPerPage + 1}-
                    {Math.min(page * rowsPerPage, filteredPredictions.length)} of {filteredPredictions.length} regions
                  </span>
                  <div className="flex gap-1.5">
                    <button
                      disabled={page === 1}
                      onClick={() => setPage((p) => p - 1)}
                      className="btn-secondary py-1 px-2.5 text-[11px] disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <button
                      disabled={page === totalPages}
                      onClick={() => setPage((p) => p + 1)}
                      className="btn-secondary py-1 px-2.5 text-[11px] disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Pie Chart Risk distribution breakdown */}
        <div className="min-w-0 overflow-hidden w-full">
          <div className="card space-y-4 flex flex-col justify-between w-full overflow-hidden">
            <div>
              <h2 className="font-display text-lg text-white">Risk Distribution</h2>
              <p className="text-[10px] text-slate-400">Aggregated alert segments based on AI predictions.</p>
            </div>

            {statsLoading ? (
              <div className="h-44 w-full flex items-center justify-center">
                <span className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : chartData.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-10">Run predictions to populate data</p>
            ) : (
              <div className="relative h-48 w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={3}
                    >
                      {chartData.map((entry) => (
                        <Cell key={entry.name} fill={RISK_COLORS[entry.name] || "#A78BFA"} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "rgba(15, 23, 42, 0.95)",
                        borderColor: "rgba(99, 102, 241, 0.2)",
                        borderRadius: "8px",
                        color: "#fff",
                        fontSize: "11px",
                      }}
                    />
                    <Legend
                      verticalAlign="bottom"
                      iconSize={8}
                      wrapperStyle={{ fontSize: "10px", color: "#94A3B8" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                
                {/* Inner Donut Central Summary */}
                <div className="absolute flex flex-col items-center justify-center pointer-events-none select-none">
                  <span className="text-2xl font-bold text-white tracking-tight">{stats?.total_regions}</span>
                  <span className="text-[8px] text-slate-500 uppercase tracking-widest font-semibold">Regions</span>
                </div>
              </div>
            )}
            
            <div className="bg-slate-950/40 p-3 rounded-lg border border-line text-[11px] text-slate-400">
              💡 **Model Tip:** Critical and high-risk states indicate significant spatial rumor spreading. Plan intervention targets accordingly.
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

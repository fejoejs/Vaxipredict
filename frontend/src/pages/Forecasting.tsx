import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { apiClient } from "../api/client";
import { useApi } from "../hooks/useApi";
import { PageHeader, Loading, ErrorState, EmptyState } from "../components/ui/Primitives";
import type { PredictionRow } from "../types";

interface ForecastResponse {
  region_id: string;
  base_score: number;
  forecast: { step: number; projected_hesitancy_score: number }[];
}

export default function Forecasting() {
  const { data: predictions, loading: loadingPreds } = useApi<PredictionRow[]>(
    () => apiClient.get("/predictions/latest").then((r) => r.data),
    []
  );
  const [regionId, setRegionId] = useState<string>("");
  const [forecast, setForecast] = useState<ForecastResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uniqueRegions = Array.from(
    new Map((predictions || []).map((p) => [p.region_id, p.region_name])).entries()
  );

  useEffect(() => {
    if (!regionId && uniqueRegions.length > 0) setRegionId(uniqueRegions[0][0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [predictions]);

  useEffect(() => {
    if (!regionId) return;
    setLoading(true);
    setError(null);
    apiClient
      .get(`/predictions/forecast/${regionId}`, { params: { horizon: 6 } })
      .then((r) => setForecast(r.data))
      .catch((e) => setError(e.response?.data?.detail || "Forecast failed"))
      .finally(() => setLoading(false));
  }, [regionId]);

  const chartData = forecast
    ? [
        { step: 0, value: (forecast.base_score ?? 0) * 100 },
        ...forecast.forecast.map((f) => ({ step: f.step, value: f.projected_hesitancy_score * 100 })),
      ]
    : [];

  return (
    <div>
      <PageHeader
        title="Trend Forecasting"
        description="Short-horizon projection of hesitancy score per region, extrapolated from the LSTM's learned trend slope."
      />

      {loadingPreds ? (
        <Loading />
      ) : uniqueRegions.length === 0 ? (
        <EmptyState title="No prediction history" description="Run the AI prediction pipeline first." />
      ) : (
        <>
          <select className="input max-w-xs mb-6 bg-slate-950 border-line" value={regionId} onChange={(e) => setRegionId(e.target.value)}>
            {uniqueRegions.map(([id, name]) => (
              <option key={id} value={id}>{name}</option>
            ))}
          </select>

          {loading && <Loading />}
          {error && <ErrorState message={error} />}
          {!loading && chartData.length > 0 && (
            <div className="card">
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(99, 102, 241, 0.15)" />
                  <XAxis dataKey="step" stroke="#94A3B8" label={{ value: "Months ahead", position: "insideBottom", offset: -5, fill: "#94A3B8" }} />
                  <YAxis domain={[0, 100]} stroke="#94A3B8" label={{ value: "Predicted Hesitancy %", angle: -90, position: "insideLeft", fill: "#94A3B8" }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(15, 23, 42, 0.95)",
                      borderColor: "rgba(99, 102, 241, 0.2)",
                      borderRadius: "8px",
                      color: "#fff",
                      fontSize: "11px",
                    }}
                  />
                  <Line type="monotone" dataKey="value" stroke="#7C3AED" strokeWidth={3} dot={{ r: 4, stroke: "#7C3AED", fill: "#090E1A" }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}
    </div>
  );
}

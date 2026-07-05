import { useState } from "react";
import { apiClient } from "../api/client";
import { useApi } from "../hooks/useApi";
import { PageHeader, Loading, ErrorState, EmptyState, RiskBadge } from "../components/ui/Primitives";
import type { PredictionRow } from "../types";

export default function Predictions() {
  const { data, loading, error, refetch } = useApi<PredictionRow[]>(
    () => apiClient.get("/predictions/latest").then((r) => r.data),
    []
  );
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressStatus, setProgressStatus] = useState("");
  const [runInfo, setRunInfo] = useState<string | null>(null);

  async function runPipeline() {
    setRunning(true);
    setProgress(0);
    setProgressStatus("Queued...");
    setRunInfo(null);
    try {
      const { data: runRes } = await apiClient.post("/predictions/run", null, { params: { period: "2026-06" } });
      const taskId = runRes.task_id;

      // Connect to WebSocket progress stream
      const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsHost = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
        ? "127.0.0.1:8001"
        : window.location.host;
      const wsUrl = `${wsProtocol}//${wsHost}/api/v1/predictions/ws/progress/${taskId}`;
      const ws = new WebSocket(wsUrl);

      ws.onmessage = (event) => {
        const task = JSON.parse(event.data);
        setProgress(task.progress);
        setProgressStatus(task.status);

        if (task.progress === 100) {
          setRunInfo(`Hybrid GNN+LSTM pipeline successfully scored ${task.count} regions in the background.`);
          setRunning(false);
          refetch();
          ws.close();
        } else if (task.progress === -1) {
          setRunInfo(`Prediction run failed: ${task.status}`);
          setRunning(false);
          ws.close();
        }
      };

      ws.onerror = () => {
        setRunInfo("WebSocket connection failed. Pipeline is running in the background.");
        setRunning(false);
        refetch();
      };
    } catch (err: any) {
      setRunInfo(err.response?.data?.detail || "Failed to start prediction pipeline.");
      setRunning(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Prediction"
        description="Runs the hybrid GNN (spatial) + LSTM (temporal) fusion model across all regions with uploaded data, producing a hesitancy score, confidence, and risk level."
        action={
          <button onClick={runPipeline} disabled={running} className="btn-primary">
            {running ? "Running model…" : "Run prediction pipeline"}
          </button>
        }
      />

      {running && (
        <div className="card p-6 bg-slate-900/40 border border-violet-500/20 space-y-4 mb-6">
          <div className="flex justify-between items-center text-xs">
            <span className="font-semibold text-purple-300 uppercase tracking-wider animate-pulse">
              ⚡ {progressStatus}
            </span>
            <span className="font-mono text-purple-400 font-bold">{progress}%</span>
          </div>
          <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden border border-line/40 p-0.5">
            <div 
              className="bg-gradient-to-r from-violet-600 to-pink-500 h-full transition-all duration-300 rounded-full shadow-[0_0_8px_rgba(139,92,246,0.5)]" 
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {runInfo && (
        <p className="text-xs text-purple-300 bg-purple-500/10 border border-purple-500/20 rounded-md px-3 py-2.5">
          {runInfo}
        </p>
      )}

      {loading && <Loading />}
      {error && <ErrorState message={error} onRetry={refetch} />}
      {data && data.length === 0 && (
        <EmptyState title="No predictions yet" description="Upload a dataset, then run the prediction pipeline above." />
      )}
      {data && data.length > 0 && (
        <div className="card overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="text-slate-400 border-b border-line/45 font-medium">
                <th className="py-2.5 pr-4">Region</th>
                <th className="py-2.5 pr-4">Period</th>
                <th className="py-2.5 pr-4">Hesitancy Score</th>
                <th className="py-2.5 pr-4">Confidence</th>
                <th className="py-2.5 pr-4">Risk Level</th>
                <th className="py-2.5 pr-4 font-mono">Model Version</th>
              </tr>
            </thead>
            <tbody>
              {data.map((p, i) => (
                <tr key={i} className="border-b border-line/20 hover:bg-slate-900/30 transition-colors">
                  <td className="py-3 pr-4 font-semibold text-white">{p.region_name}</td>
                  <td className="py-3 pr-4 text-slate-400">{p.period}</td>
                  <td className="py-3 pr-4 font-mono text-purple-300">
                    {p.hesitancy_score ? (p.hesitancy_score * 100).toFixed(1) + "%" : "0.0%"}
                  </td>
                  <td className="py-3 pr-4 font-mono text-slate-400">
                    {p.confidence ? (p.confidence * 100).toFixed(0) + "%" : "0%"}
                  </td>
                  <td className="py-3 pr-4">
                    <RiskBadge level={p.risk_level} />
                  </td>
                  <td className="py-3 pr-4 text-[10px] text-slate-500 font-mono">{p.model_version}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

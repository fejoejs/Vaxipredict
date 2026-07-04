import { useState } from "react";
import { apiClient } from "../api/client";
import { useApi } from "../hooks/useApi";
import { PageHeader, Loading, ErrorState, EmptyState } from "../components/ui/Primitives";

const REPORT_TYPES = [
  { value: "predictions", label: "Prediction Results" },
  { value: "interventions", label: "Intervention Plans" },
  { value: "rumors", label: "Rumor Reports" },
];
const FORMATS = [
  { value: "pdf", label: "PDF" },
  { value: "csv", label: "CSV" },
  { value: "excel", label: "Excel" },
];

interface ReportRow {
  id: string;
  report_type: string;
  file_format: string;
  created_at: string;
}

export default function Reports() {
  const { data, loading, error, refetch } = useApi<ReportRow[]>(() => apiClient.get("/reports").then((r) => r.data), []);
  const [reportType, setReportType] = useState(REPORT_TYPES[0].value);
  const [format, setFormat] = useState(FORMATS[0].value);
  const [generating, setGenerating] = useState(false);

  // Authenticated file download handler using Blob and axios
  async function downloadReport(reportId: string, type: string, fileFormat: string) {
    try {
      const response = await apiClient.get(`/reports/${reportId}/download`, {
        responseType: "blob",
      });
      
      const contentType = (response.headers["content-type"] as string) || "application/octet-stream";
      const blob = new Blob([response.data], { type: contentType });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      
      // Construct descriptive filename
      const filename = `${type}_report_${reportId.substring(0, 8)}.${fileFormat}`;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download failed:", err);
      alert("Failed to download file. Please try again.");
    }
  }

  async function generate() {
    setGenerating(true);
    try {
      const { data } = await apiClient.post("/reports/generate", null, {
        params: { report_type: reportType, file_format: format },
      });
      // Automatically download the newly generated report
      await downloadReport(data.report_id, reportType, format);
      refetch();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Report generation failed");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Reports"
        description="Generate downloadable PDF, CSV, or Excel reports from your prediction, intervention, and rumor data."
      />

      <div className="card flex flex-wrap items-end gap-4 mb-6">
        <div>
          <label className="text-xs font-medium text-slate-400">Report type</label>
          <select className="input mt-1" value={reportType} onChange={(e) => setReportType(e.target.value)}>
            {REPORT_TYPES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-slate-400">Format</label>
          <select className="input mt-1" value={format} onChange={(e) => setFormat(e.target.value)}>
            {FORMATS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
          </select>
        </div>
        <button onClick={generate} disabled={generating} className="btn-primary">
          {generating ? "Generating…" : "Generate & download"}
        </button>
      </div>

      {loading && <Loading />}
      {error && <ErrorState message={error} onRetry={refetch} />}
      {data && data.length === 0 && <EmptyState title="No reports generated yet" />}
      {data && data.length > 0 && (
        <div className="card overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="text-slate-400 border-b border-line/40 font-medium">
                <th className="py-2.5 pr-4">Type</th>
                <th className="py-2.5 pr-4">Format</th>
                <th className="py-2.5 pr-4">Created</th>
                <th className="py-2.5 pr-4"></th>
              </tr>
            </thead>
            <tbody>
              {data.map((r) => (
                <tr key={r.id} className="border-b border-line/20 hover:bg-slate-900/30 transition-colors">
                  <td className="py-3 pr-4 capitalize text-white font-semibold">{r.report_type}</td>
                  <td className="py-3 pr-4 uppercase font-semibold text-purple-400">{r.file_format}</td>
                  <td className="py-3 pr-4 text-slate-400">{new Date(r.created_at).toLocaleString()}</td>
                  <td className="py-3 pr-4">
                    <button
                      onClick={() => downloadReport(r.id, r.report_type, r.file_format)}
                      className="text-purple-400 font-semibold hover:text-purple-300 hover:underline bg-transparent border-0 cursor-pointer p-0"
                    >
                      Download
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

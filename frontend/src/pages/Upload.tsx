import { ChangeEvent, useState } from "react";
import { apiClient } from "../api/client";
import { useApi } from "../hooks/useApi";
import { PageHeader, Loading, ErrorState, EmptyState } from "../components/ui/Primitives";

interface DatasetRow {
  id: string;
  filename: string;
  file_type: string;
  row_count: number;
  status: string;
  quality_score: number;
  uploaded_at: string;
}

export default function Upload() {
  const { data, loading, error, refetch } = useApi<DatasetRow[]>(
    () => apiClient.get("/datasets").then((r) => r.data),
    []
  );
  const [uploading, setUploading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  async function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setFeedback(null);
    const form = new FormData();
    form.append("file", file);
    try {
      const { data } = await apiClient.post("/datasets/upload", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setFeedback(`Ingested ${data.records_created} records — quality score ${data.quality_score}`);
      refetch();
    } catch (err: any) {
      setFeedback(err.response?.data?.detail || "Upload failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  return (
    <div>
      <PageHeader
        title="Dataset Upload"
        description="Upload CSV, Excel, or JSON files with per-region, per-period vaccination records. Required columns: region, period, doses_administered, eligible_population."
      />

      <div className="card border-dashed border-2 border-teal/30 text-center py-10 mb-8">
        <p className="text-sm text-ink/60 mb-4">Drop a file or choose one to upload</p>
        <label className="btn-primary inline-block cursor-pointer">
          {uploading ? "Uploading…" : "Choose file"}
          <input type="file" accept=".csv,.xlsx,.xls,.json" className="hidden" onChange={handleFile} disabled={uploading} />
        </label>
        {feedback && <p className="text-xs text-ink/60 mt-4">{feedback}</p>}
      </div>

      {loading && <Loading />}
      {error && <ErrorState message={error} onRetry={refetch} />}
      {data && data.length === 0 && <EmptyState title="No datasets yet" description="Upload your first file above." />}
      {data && data.length > 0 && (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-ink/50 border-b border-line">
                <th className="py-2 pr-4">Filename</th>
                <th className="py-2 pr-4">Type</th>
                <th className="py-2 pr-4">Rows</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Quality</th>
                <th className="py-2 pr-4">Uploaded</th>
              </tr>
            </thead>
            <tbody>
              {data.map((d) => (
                <tr key={d.id} className="border-b border-line last:border-0">
                  <td className="py-2 pr-4">{d.filename}</td>
                  <td className="py-2 pr-4 uppercase text-xs">{d.file_type}</td>
                  <td className="py-2 pr-4">{d.row_count}</td>
                  <td className="py-2 pr-4 capitalize">{d.status}</td>
                  <td className="py-2 pr-4">{d.quality_score}</td>
                  <td className="py-2 pr-4 text-ink/50">{new Date(d.uploaded_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

import { FormEvent, useState } from "react";
import { apiClient } from "../api/client";
import { useApi } from "../hooks/useApi";
import { PageHeader, Loading, ErrorState, EmptyState } from "../components/ui/Primitives";

interface ReminderRow {
  id: string;
  region_id: string;
  region_name: string;
  beneficiary_name: string;
  contact: string;
  vaccine_name: string;
  due_date: string;
  status: string;
}

interface RegionItem {
  id: string;
  name: string;
}

const STATUS_OPTIONS = ["pending", "sent", "completed", "missed"];

export default function Reminders() {
  // Fetch regions from the public dashboard regions endpoint
  const { data: regions, loading: regionsLoading } = useApi<RegionItem[]>(
    () => apiClient.get("/dashboard/regions").then((r) => r.data),
    []
  );

  const { data, loading, error, refetch } = useApi<ReminderRow[]>(
    () => apiClient.get("/reminders").then((r) => r.data),
    []
  );

  const [form, setForm] = useState({ region_id: "", beneficiary_name: "", contact: "", vaccine_name: "", due_date: "" });
  const [submitting, setSubmitting] = useState(false);
  const [outreachResult, setOutreachResult] = useState<{ recipient: string; channel: string; template: string } | null>(null);

  async function sendOutreach(id: string, channel: string) {
    try {
      const { data } = await apiClient.post(`/reminders/${id}/outreach`, null, { params: { channel } });
      setOutreachResult({
        recipient: data.recipient,
        channel: data.channel.toUpperCase(),
        template: data.template
      });
      refetch();
      setTimeout(() => setOutreachResult(null), 10000); // Clear after 10s
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to trigger gateway outreach");
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.region_id) return;
    setSubmitting(true);
    try {
      await apiClient.post("/reminders", form);
      setForm({ region_id: "", beneficiary_name: "", contact: "", vaccine_name: "", due_date: "" });
      refetch();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to create reminder");
    } finally {
      setSubmitting(false);
    }
  }

  async function updateStatus(id: string, status: string) {
    try {
      await apiClient.patch(`/reminders/${id}/status`, null, { params: { status } });
      refetch();
    } catch (err) {
      alert("Failed to update status");
    }
  }

  const regionList = regions || [];

  return (
    <div>
      <PageHeader title="Vaccination Reminders" description="Schedule and track follow-up reminders for beneficiaries by region." />

      {outreachResult && (
        <div className="card p-4 bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-xs mb-6 space-y-1 animate-in fade-in duration-300">
          <p className="font-semibold">🚀 Dispatched {outreachResult.channel} notification to {outreachResult.recipient}!</p>
          <p className="opacity-80 font-mono italic bg-slate-950/40 p-2 rounded mt-1 border border-emerald-500/10">"{outreachResult.template}"</p>
        </div>
      )}

      <div className="grid lg:grid-cols-[380px_1fr] gap-6">
        {/* Left Column: Form */}
        <form onSubmit={handleSubmit} className="card space-y-4 h-fit">
          <h3 className="font-display text-base text-white border-b border-line/35 pb-2">Add Reminder</h3>
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
            <label className="text-xs font-medium text-slate-400">Beneficiary name</label>
            <input
              className="input mt-1"
              required
              value={form.beneficiary_name}
              onChange={(e) => setForm({ ...form, beneficiary_name: e.target.value })}
              placeholder="e.g. Alice Johnson"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-400">Contact</label>
            <input
              className="input mt-1"
              required
              value={form.contact}
              onChange={(e) => setForm({ ...form, contact: e.target.value })}
              placeholder="e.g. +1-555-0199"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-400">Vaccine</label>
            <input
              className="input mt-1"
              required
              value={form.vaccine_name}
              onChange={(e) => setForm({ ...form, vaccine_name: e.target.value })}
              placeholder="e.g. MMR"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-400">Due date</label>
            <input
              type="date"
              className="input mt-1"
              required
              value={form.due_date}
              onChange={(e) => setForm({ ...form, due_date: e.target.value })}
            />
          </div>
          <button type="submit" disabled={submitting} className="btn-primary w-full justify-center">
            {submitting ? "Saving…" : "Add reminder"}
          </button>
        </form>

        {/* Right Column: List of Reminders */}
        <div>
          {loading && <Loading />}
          {error && <ErrorState message={error} onRetry={refetch} />}
          {data && data.length === 0 && <EmptyState title="No reminders yet" />}
          {data && data.length > 0 && (
            <div className="card overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="text-slate-400 border-b border-line/40 font-medium">
                    <th className="py-2.5 pr-4">Beneficiary</th>
                    <th className="py-2.5 pr-4">Region</th>
                    <th className="py-2.5 pr-4">Vaccine</th>
                    <th className="py-2.5 pr-4">Due</th>
                    <th className="py-2.5 pr-4">Contact</th>
                    <th className="py-2.5 pr-4">Outreach</th>
                    <th className="py-2.5 pr-4">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((r) => (
                    <tr key={r.id} className="border-b border-line/20 hover:bg-slate-900/30 transition-colors">
                      <td className="py-3 pr-4 font-semibold text-white">{r.beneficiary_name}</td>
                      <td className="py-3 pr-4 text-slate-300">{r.region_name}</td>
                      <td className="py-3 pr-4 font-semibold text-purple-400">{r.vaccine_name}</td>
                      <td className="py-3 pr-4 text-slate-400">{r.due_date}</td>
                      <td className="py-3 pr-4 text-slate-400">{r.contact}</td>
                      <td className="py-3 pr-4">
                        <div className="flex gap-1">
                          <button
                            onClick={() => sendOutreach(r.id, "sms")}
                            className="bg-purple-600 hover:bg-purple-700 text-white rounded px-2 py-0.5 text-[9px] font-bold transition-all hover:scale-105 active:scale-95"
                            title="Mock Send SMS"
                          >
                            💬 SMS
                          </button>
                          <button
                            onClick={() => sendOutreach(r.id, "whatsapp")}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded px-2 py-0.5 text-[9px] font-bold transition-all hover:scale-105 active:scale-95"
                            title="Mock Send WhatsApp"
                          >
                            🟢 WA
                          </button>
                        </div>
                      </td>
                      <td className="py-3 pr-4">
                        <select
                          className="input py-0.5 px-2 text-[10px] max-w-[110px] bg-slate-950 border-line"
                          value={r.status}
                          onChange={(e) => updateStatus(r.id, e.target.value)}
                        >
                          {STATUS_OPTIONS.map((s) => (
                            <option key={s} value={s}>
                              {s.toUpperCase()}
                            </option>
                          ))}
                        </select>
                      </td>
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

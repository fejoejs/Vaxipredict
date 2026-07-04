import { useState } from "react";
import { apiClient } from "../api/client";
import { PageHeader } from "../components/ui/Primitives";

const FAQS = [
  {
    q: "How does the hybrid GNN + LSTM model predict vaccine hesitancy?",
    a: "The Spatial GNN (Graph Neural Network) aggregates neighbor features to understand how hesitancy spreads geographically, while the Temporal LSTM learns historical vaccination rates over time. A Fusion Head concatenates both embeddings to produce the predicted hesitancy score and model confidence.",
  },
  {
    q: "How do I upload new datasets?",
    a: "Navigate to the Upload tab, drop your CSV, Excel, or JSON files, and click upload. Ensure your file contains the required columns: 'region', 'period', 'doses_administered', and 'eligible_population'.",
  },
  {
    q: "What do the different user roles represent?",
    a: "Admins have full configuration control. Analysts can ingest data, run models, and plan interventions. Health Workers can schedule reminders and submit rumor logs. Viewers have read-only access to dashboards and analytics.",
  },
  {
    q: "How can I export reports?",
    a: "Go to the Reports page, select the data source (predictions, interventions, or rumors), select the desired format (PDF, Excel, or CSV), and click 'Generate & download'.",
  },
];

export default function Help() {
  const [success, setSuccess] = useState(false);
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSuccess(false);
    setError(null);
    try {
      await apiClient.post("/notifications/issue", { description });
      setSuccess(true);
      setDescription("");
      setTimeout(() => setSuccess(false), 4000);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to submit support ticket");
    }
  }

  return (
    <div>
      <PageHeader title="Help & Support" description="Browse FAQs, explore system specifications, or contact system support." />

      <div className="grid lg:grid-cols-[1.5fr_1fr] gap-8">
        {/* Left Column: FAQs */}
        <div className="space-y-4">
          <div className="card">
            <h2 className="font-display text-xl text-white border-b border-line/40 pb-2 mb-4">Frequently Asked Questions</h2>
            <div className="space-y-4">
              {FAQS.map((faq, idx) => (
                <div key={idx} className="border-b border-line/30 pb-3 last:border-0 last:pb-0">
                  <h4 className="font-semibold text-sm text-purple-300">❓ {faq.q}</h4>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Contact & Issue Reporter */}
        <div className="space-y-4">
          <div className="card space-y-4">
            <h2 className="font-display text-xl text-white border-b border-line/40 pb-2">Report an Issue</h2>
            {success && <p className="text-xs text-emerald-400 bg-emerald-500/10 rounded-md px-3 py-2">Thank you! Your ticket has been logged and sent to system administration.</p>}
            {error && <p className="text-xs text-coral bg-coral/10 rounded-md px-3 py-2">{error}</p>}
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-400">Describe the issue</label>
                <textarea
                  required
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the bug or feature request in detail..."
                  className="input mt-1"
                />
              </div>
              <button type="submit" className="btn-primary w-full justify-center">
                Submit Support Ticket
              </button>
            </form>
          </div>

          <div className="card space-y-2">
            <h3 className="font-semibold text-sm text-white">Direct Contact</h3>
            <p className="text-xs text-slate-400">If you are facing critical infrastructure failures, please contact support teams directly:</p>
            <div className="text-xs text-slate-200 pt-2 space-y-1">
              <p>📧 Email: vaxipredict@gmail.com</p>
              <p>📞 Phone: +91 9072849672</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

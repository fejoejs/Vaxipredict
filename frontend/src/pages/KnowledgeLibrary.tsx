import { useState } from "react";
import { NavLink } from "react-router-dom";
import { apiClient } from "../api/client";
import { useApi } from "../hooks/useApi";
import { PageHeader, Loading, ErrorState } from "../components/ui/Primitives";

interface Article {
  id: string;
  vaccine_name: string;
  category: string;
  summary: string;
  recommended_schedule: string;
  common_myths: string;
}

interface FactCheckResult {
  veracity: string;
  risk_score: number;
  category: string;
  counter_argument: string;
}

const CATEGORIES = ["all", "childhood", "adult", "travel", "outbreak-response"];
const QUICK_MYTH_TAGS = ["Microchip", "Sterility", "Gelatin", "Safety Concerns", "Side Effects"];

export default function KnowledgeLibrary() {
  const [activeTab, setActiveTab] = useState<"library" | "ai">("library");
  
  // Library States
  const [category, setCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  
  // AI Fact-Checker States
  const [customRumor, setCustomRumor] = useState("");
  const [checking, setChecking] = useState(false);
  const [checkResult, setCheckResult] = useState<FactCheckResult | null>(null);

  const { data, loading, error, refetch } = useApi<Article[]>(
    () => apiClient.get("/knowledge", { params: category === "all" ? {} : { category } }).then((r) => r.data),
    [category]
  );

  // Client-side filtering with highlight matches
  const filteredArticles = (data || []).filter((a) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      a.vaccine_name.toLowerCase().includes(q) ||
      a.summary.toLowerCase().includes(q) ||
      a.common_myths.toLowerCase().includes(q)
    );
  });

  // Text highlighter helper function
  function highlightText(text: string, highlight: string) {
    if (!highlight.trim()) return <span>{text}</span>;
    const regex = new RegExp(`(${highlight.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&")})`, "gi");
    const parts = text.split(regex);
    return (
      <>
        {parts.map((part, i) =>
          regex.test(part) ? (
            <mark key={i} className="bg-purple-500/40 text-white rounded px-0.5 font-bold">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </>
    );
  }

  async function handleAIFactCheck(e: React.FormEvent) {
    e.preventDefault();
    if (!customRumor.trim() || checking) return;
    setChecking(true);
    setCheckResult(null);
    try {
      const { data } = await apiClient.post("/knowledge/factcheck", { rumor: customRumor });
      setCheckResult(data);
    } catch (err: any) {
      alert(err.response?.data?.detail || "AI fact-checking request failed");
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Knowledge & Fact-Checking" 
        description="Search routines vaccine schedules or leverage NLP AI to audit and counter community rumors." 
      />

      {/* Tabs Switcher */}
      <div className="flex border-b border-line/40">
        <button
          onClick={() => setActiveTab("library")}
          className={`pb-3 px-6 text-xs font-semibold uppercase tracking-wider border-b-2 transition-all ${
            activeTab === "library"
              ? "border-purple-500 text-white"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          📚 Reference Library
        </button>
        <button
          onClick={() => setActiveTab("ai")}
          className={`pb-3 px-6 text-xs font-semibold uppercase tracking-wider border-b-2 transition-all ${
            activeTab === "ai"
              ? "border-purple-500 text-white"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          🤖 AI Fact-Checker
        </button>
      </div>

      {activeTab === "library" ? (
        <div className="space-y-6">
          {/* Fact-Checking Search Engine Bar */}
          <div className="card p-5 bg-slate-900/40 border border-line space-y-4">
            <h3 className="font-display text-sm font-semibold text-white">🔍 Search Reference Library</h3>
            <div className="flex gap-2">
              <input
                type="text"
                className="input flex-1"
                placeholder="Search vaccine schedules, summaries, or myths..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-400 px-3 rounded-lg border border-line"
                >
                  Clear
                </button>
              )}
            </div>
            
            {/* Quick Myth Recommendation Tags */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
              <span className="text-slate-400 font-medium mr-1">Quick Filters:</span>
              {QUICK_MYTH_TAGS.map((tag) => (
                <button
                  key={tag}
                  onClick={() => setSearchQuery(tag)}
                  className="bg-slate-950 border border-line hover:border-purple-500/50 hover:bg-slate-900 text-purple-300 rounded-full px-2.5 py-1 transition-colors font-medium text-[10px]"
                >
                  #{tag}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2 mb-6 flex-wrap">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => {
                  setCategory(c);
                  setSearchQuery(""); // Clear search on category toggle
                }}
                className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-all ${
                  category === c
                    ? "bg-violet-600 text-white border-violet-500 shadow-md shadow-violet-500/20"
                    : "bg-slate-900/60 border-line text-slate-400 hover:text-white hover:bg-slate-800"
                }`}
              >
                {c.replace("-", " ")}
              </button>
            ))}
          </div>

          {loading && <Loading />}
          {error && <ErrorState message={error} onRetry={refetch} />}
          
          {data && filteredArticles.length === 0 && (
            <div className="card text-center p-8 border border-line bg-slate-900/20 max-w-md mx-auto space-y-4">
              <p className="text-sm text-slate-400">🔍 No articles match "{searchQuery}".</p>
              <p className="text-xs text-slate-500 leading-relaxed">
                Try auditing this rumor using our AI Fact-Checker tab, or log it on the rumors panel.
              </p>
              <NavLink to="/rumors" className="btn-primary inline-flex justify-center text-xs px-4 py-2 rounded-lg">
                Log Rumor Report
              </NavLink>
            </div>
          )}

          {data && filteredArticles.length > 0 && (
            <div className="grid md:grid-cols-2 gap-4">
              {filteredArticles.map((a) => (
                <div key={a.id} className="card bg-slate-900/30 border border-line hover:border-violet-500/20 transition-colors flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <h3 className="font-display text-lg font-semibold text-white">
                        {highlightText(a.vaccine_name, searchQuery)}
                      </h3>
                      <span className="badge bg-violet-500/15 text-purple-300 border border-violet-500/20 text-[10px] capitalize px-2 py-0.5 rounded">
                        {a.category.replace("-", " ")}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {highlightText(a.summary, searchQuery)}
                    </p>
                  </div>
                  
                  <div className="border-t border-line/20 mt-4 pt-3 space-y-2">
                    {a.recommended_schedule && (
                      <p className="text-xs text-slate-400">
                        <span className="font-semibold text-slate-200">Recommended Schedule:</span>{" "}
                        {highlightText(a.recommended_schedule, searchQuery)}
                      </p>
                    )}
                    {a.common_myths && (
                      <p className="text-xs text-red-300 bg-red-500/5 border border-red-500/10 rounded px-2 py-1.5 mt-1 leading-relaxed">
                        <span className="font-semibold text-red-200">Common Myth / Fact:</span>{" "}
                        {highlightText(a.common_myths, searchQuery)}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* AI Fact-Checker Interface */
        <div className="grid lg:grid-cols-[1fr_400px] gap-6">
          {/* Left: Input Rumor Form */}
          <form onSubmit={handleAIFactCheck} className="card space-y-4 h-fit">
            <h3 className="font-display text-sm font-semibold text-white">🤖 Instant AI Rumor Audit</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Paste a custom message, flyer claim, or warning text circulating in local WhatsApp groups to run an automated veracity evaluation.
            </p>
            <div>
              <textarea
                className="input"
                rows={6}
                required
                value={customRumor}
                onChange={(e) => setCustomRumor(e.target.value)}
                placeholder="Paste rumor claims here (e.g., 'I heard that vaccines contain microchips to track people...')"
              />
            </div>
            <button
              type="submit"
              disabled={checking || !customRumor.trim()}
              className="btn-primary w-full justify-center text-xs py-2"
            >
              {checking ? "Checking Rumor..." : "Verify with VaxInsight AI"}
            </button>
          </form>

          {/* Right: AI Fact-Check Report */}
          <div className="space-y-4">
            {checkResult ? (
              <div className="card border-l-4 border-l-purple-500 bg-slate-900/30 border border-line space-y-6">
                <div>
                  <span className="text-[9px] bg-purple-500/10 border border-purple-500/25 text-purple-300 px-2 py-0.5 rounded font-bold uppercase">
                    AI Factcheck Report
                  </span>
                  <h3 className="font-display text-lg font-bold text-white mt-3 leading-tight">
                    {checkResult.category}
                  </h3>
                </div>

                <div className="border-t border-line/20 pt-4 space-y-3 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Veracity Audit:</span>
                    <span className={`font-semibold ${
                      checkResult.risk_score > 0.6 ? "text-rose-400" : "text-amber-400"
                    }`}>
                      {checkResult.veracity}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Misinformation Index:</span>
                    <span className="font-mono font-bold text-purple-300">
                      {(checkResult.risk_score * 100).toFixed(0)}% Risk
                    </span>
                  </div>
                </div>

                <div className="border-t border-line/20 pt-4 space-y-2 text-xs">
                  <p className="font-semibold text-slate-200">🛡️ Scientific Counter-Argument:</p>
                  <p className="text-slate-300 leading-relaxed bg-slate-950/40 p-3 rounded border border-line/40 italic">
                    "{checkResult.counter_argument}"
                  </p>
                </div>
              </div>
            ) : (
              <div className="card text-center p-8 border border-line bg-slate-900/10 text-slate-500 text-xs flex flex-col items-center justify-center min-h-[300px]">
                <span>🤖</span>
                <p className="mt-2 font-medium">No Report Evaluated</p>
                <p className="text-[10px] text-slate-600 mt-1 max-w-[200px]">Type in the rumor form and click Verify to run the GNN-NLP audit check.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

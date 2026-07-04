import { useState, useMemo, useEffect } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { apiClient } from "../api/client";

const GLOBAL_STATS = [
  { label: "Children under-vaccinated globally (2024)", value: "14.3M", source: "WHO/UNICEF" },
  { label: "WHO-listed top 10 global health threat", value: "Vaccine hesitancy", source: "WHO, 2019" },
  { label: "Diseases preventable by routine immunization", value: "20+", source: "WHO" },
];

interface ModelNode {
  name: string;
  x: number;
  y: number;
  hesitancy: string;
  risk: "low" | "moderate" | "high" | "critical";
  neighbors: string[];
}

const DEFAULT_MODEL_NODES: ModelNode[] = [
  { name: "Maharashtra", x: 80, y: 190, hesitancy: "12.0%", risk: "low", neighbors: ["Gujarat", "Madhya Pradesh"] },
  { name: "Gujarat", x: 40, y: 130, hesitancy: "16.0%", risk: "moderate", neighbors: ["Maharashtra", "Rajasthan", "Madhya Pradesh"] },
  { name: "Rajasthan", x: 60, y: 50, hesitancy: "19.0%", risk: "moderate", neighbors: ["Gujarat", "Madhya Pradesh", "Uttar Pradesh"] },
  { name: "Madhya Pradesh", x: 140, y: 110, hesitancy: "18.0%", risk: "moderate", neighbors: ["Gujarat", "Maharashtra", "Rajasthan", "Uttar Pradesh"] },
  { name: "Uttar Pradesh", x: 200, y: 60, hesitancy: "15.0%", risk: "moderate", neighbors: ["Rajasthan", "Madhya Pradesh", "Bihar"] },
  { name: "Bihar", x: 260, y: 80, hesitancy: "22.0%", risk: "high", neighbors: ["Uttar Pradesh"] }
];

const RISK_COLORS = {
  low: "#10B981",
  moderate: "#F59E0B",
  high: "#EF4444",
  critical: "#7C3AED",
};

const BENEFITS = [
  {
    icon: "🔬",
    title: "Hybrid Machine Learning",
    desc: "Combines spatial attributes (Graph Neural Networks) with historical immunisation records (Long Short-Term Memory) to provide ahead-of-time forecasting rather than simple reactive reports.",
  },
  {
    icon: "🔍",
    title: "Rumor Auditing",
    desc: "Enables field workers to log local misinformation reports in real time, run them through an automated GNN text analyzer, and evaluate regional threat levels before hesitancy starts to propagate.",
  },
  {
    icon: "💵",
    title: "Simulation & Planning",
    desc: "Allows analysts to simulate SMS outreach campaigns or mobile clinic drops with dynamic budget sliders, projecting drop margins and required outreach funds in Indian Rupees.",
  },
];

export default function Home() {
  const { isAuthenticated } = useAuth();
  const [nodes, setNodes] = useState<ModelNode[]>(DEFAULT_MODEL_NODES);
  
  // Model Visualizer States
  const [selectedNode, setSelectedNode] = useState<ModelNode>(DEFAULT_MODEL_NODES[3]); // Default Madhya Pradesh

  useEffect(() => {
    if (!isAuthenticated) {
      setNodes(DEFAULT_MODEL_NODES);
      setSelectedNode(DEFAULT_MODEL_NODES[3]);
      return;
    }
    apiClient
      .get("/predictions/latest")
      .then((res) => {
        const data = res.data;
        if (data && data.length > 0) {
          const mapped = DEFAULT_MODEL_NODES.map((node) => {
            const match = data.find((p: any) => p.region_name === node.name);
            if (match) {
              return {
                ...node,
                hesitancy: (match.hesitancy_score * 100).toFixed(1) + "%",
                risk: match.risk_level as any,
              };
            }
            return node;
          });
          setNodes(mapped);
          // Sync selected node with new values
          const activeMatch = mapped.find((n) => n.name === selectedNode.name);
          if (activeMatch) {
            setSelectedNode(activeMatch);
          }
        }
      })
      .catch(() => {
        // Fallback silently if not predicted yet
      });
  }, [isAuthenticated]);

  // Live Simulator Preview States
  const [simBudget, setSimBudget] = useState(35000);
  const [simStrategy, setSimStrategy] = useState("mobile_clinic");
  const [simDensity, setSimDensity] = useState(65);

  const simulatedResults = useMemo(() => {
    let baseDrop = 0.02;
    let costPerDrop = 15000;

    if (simStrategy === "sms_outreach") {
      baseDrop = 0.04;
      costPerDrop = 8000;
    } else if (simStrategy === "mobile_clinic") {
      baseDrop = 0.09;
      costPerDrop = 22000;
    } else if (simStrategy === "awareness_campaign") {
      baseDrop = 0.06;
      costPerDrop = 14000;
    }

    const efficiencyLog = Math.log10(simBudget / costPerDrop + 1);
    const drop = baseDrop + efficiencyLog * 0.06 * (simDensity / 100);
    const dropPercentage = Math.min(0.22, drop);
    const estimatedBeneficiaries = Math.round((simBudget / 120) * (simDensity / 50));

    return {
      drop: (dropPercentage * 100).toFixed(1),
      beneficiaries: estimatedBeneficiaries.toLocaleString(),
    };
  }, [simBudget, simStrategy, simDensity]);

  return (
    <div className="space-y-16">
      
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl bg-slate-900/20 border border-line p-8 md:p-12 lg:p-16">
        
        {/* Glow Effects */}
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-purple-600/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="grid lg:grid-cols-[1.3fr_1fr] gap-12 items-center relative z-10">
          
          <div className="space-y-6">
            
            {/* Logo + Brand Pill */}
            <div className="flex items-center gap-3">
              <svg
                className="w-10 h-10 text-purple-400 drop-shadow-[0_0_8px_rgba(167,139,250,0.35)]"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"
                />
              </svg>
              <span className="inline-block text-xs font-bold tracking-widest uppercase text-purple-400 bg-purple-500/10 rounded-full px-3 py-1 border border-purple-500/15">
                VaxiPredict India Platform
              </span>
            </div>

            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-[1.08] tracking-tight">
              See hesitancy spread
              <span className="block mt-2 bg-gradient-to-r from-purple-400 via-indigo-300 to-purple-300 bg-clip-text text-transparent">
                before it takes hold.
              </span>
            </h1>

            <p className="text-slate-300 text-sm md:text-base leading-relaxed max-w-xl">
              Fuses spatial GNN region networks with temporal vaccination trends to forecast
              vaccine hesitancy risk across India's states, audit rumors, and evaluate targeted interventions.
            </p>

            <div className="flex flex-wrap gap-4 pt-2">
              {isAuthenticated ? (
                <NavLink to="/dashboard" className="btn-primary px-6 py-3 text-sm shadow-lg shadow-purple-600/20">
                  Go to Dashboard
                </NavLink>
              ) : (
                <>
                  <NavLink to="/login" className="btn-primary px-6 py-3 text-sm shadow-lg shadow-purple-600/25">
                    Sign In to Account
                  </NavLink>
                  <NavLink to="/register" className="btn-secondary px-6 py-3 text-sm hover:border-purple-500/40">
                    Sign Up (Create Account)
                  </NavLink>
                </>
              )}
            </div>

          </div>

          {/* Stats Glassmorphism Grid */}
          <div className="grid gap-4">
            {GLOBAL_STATS.map((s, idx) => (
              <div
                key={idx}
                className="card bg-slate-900/40 border border-line/60 p-5 hover:border-purple-500/35 hover:-translate-y-0.5 transition-all duration-300 shadow-lg"
              >
                <p className="font-display text-2xl font-bold text-purple-300">{s.value}</p>
                <p className="text-xs text-slate-300 mt-1 font-medium">{s.label}</p>
                <p className="text-[10px] text-slate-500 mt-2 font-mono uppercase tracking-wider">{s.source}</p>
              </div>
            ))}
          </div>

        </div>

        {/* Scroll Indicator Arrow */}
        <div
          className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex flex-col items-center gap-1.5 opacity-60 hover:opacity-100 transition-opacity cursor-pointer hidden lg:flex"
          onClick={() => document.getElementById("why-vaxipredict")?.scrollIntoView({ behavior: "smooth" })}
        >
          <span className="text-[9px] font-mono text-purple-400 uppercase tracking-widest">Explore details</span>
          <svg className="w-4 h-4 text-purple-400 animate-pulse" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7" />
          </svg>
        </div>
      </section>

      {/* Why VaxiPredict Section */}
      <section id="why-vaxipredict" className="space-y-8">
        <div className="text-center max-w-lg mx-auto space-y-2">
          <h2 className="font-display text-2xl md:text-3xl font-bold text-white">Why VaxiPredict?</h2>
          <p className="text-xs text-slate-400">A proactive vaccine hesitancy mapping and intervention engine.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {BENEFITS.map((b, idx) => (
            <div key={idx} className="card bg-slate-900/10 border border-line/60 p-6 space-y-3 hover:border-purple-500/30 transition-colors">
              <span className="text-3xl">{b.icon}</span>
              <h3 className="font-semibold text-sm text-white">{b.title}</h3>
              <p className="text-xs text-slate-350 leading-relaxed">{b.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Unique Interactive Sandbox: Live Intervention Modeler */}
      <section className="card bg-slate-900/10 border border-line relative overflow-hidden p-6 md:p-10 space-y-8">
        <div className="grid lg:grid-cols-[1.1fr_1fr] gap-8 items-center">
          
          <div className="space-y-4">
            <span className="text-xs font-bold tracking-widest uppercase text-purple-400">Unique Simulation Preview</span>
            <h2 className="font-display text-2xl md:text-3xl font-bold text-white">Live Intervention Modeler</h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              Before running predictions on live state cohorts, analyze campaign variables here to estimate cost-benefit ratios. Adjust parameters to test expected hesitancy drops in real-time.
            </p>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="p-3 bg-slate-950/40 border border-line rounded-lg text-center">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Simulated Hesitancy Drop</p>
                <p className="text-2xl font-bold text-emerald-400 font-mono mt-1">-{simulatedResults.drop}%</p>
              </div>
              <div className="p-3 bg-slate-950/40 border border-line rounded-lg text-center">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Target Beneficiaries</p>
                <p className="text-2xl font-bold text-purple-300 font-mono mt-1">{simulatedResults.beneficiaries}</p>
              </div>
            </div>
          </div>

          <div className="card bg-slate-950/80 border border-line/60 p-5 space-y-4 shadow-xl">
            <h4 className="font-semibold text-xs text-white uppercase tracking-wider border-b border-line/40 pb-2">Simulation Parameters</h4>
            
            {/* Strategy Select */}
            <div className="space-y-1">
              <label className="text-[10px] font-medium text-slate-400 uppercase">Outreach Strategy</label>
              <select
                className="input py-1.5 px-2 bg-slate-900 border-line text-xs"
                value={simStrategy}
                onChange={(e) => setSimStrategy(e.target.value)}
              >
                <option value="sms_outreach">SMS Broadcasts (Low Cost)</option>
                <option value="awareness_campaign">Awareness Campaign (Medium Cost)</option>
                <option value="mobile_clinic">Mobile Clinic Drops (High Cost)</option>
              </select>
            </div>

            {/* Budget Slider */}
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] font-medium text-slate-400 uppercase">
                <span>Campaign Budget</span>
                <span className="text-purple-300 font-mono">₹{simBudget.toLocaleString()}</span>
              </div>
              <input
                type="range"
                min={5000}
                max={150000}
                step={5000}
                value={simBudget}
                onChange={(e) => setSimBudget(Number(e.target.value))}
                className="w-full accent-purple-500 cursor-pointer h-1.5 bg-slate-900 rounded-lg"
              />
            </div>

            {/* Target Density */}
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] font-medium text-slate-400 uppercase">
                <span>Population Density Reach</span>
                <span className="text-purple-300 font-mono">{simDensity}%</span>
              </div>
              <input
                type="range"
                min={10}
                max={100}
                step={5}
                value={simDensity}
                onChange={(e) => setSimDensity(Number(e.target.value))}
                className="w-full accent-purple-500 cursor-pointer h-1.5 bg-slate-900 rounded-lg"
              />
            </div>
          </div>

        </div>
      </section>

      {/* Highly Attractive GNN-LSTM Network Graph Visualizer */}
      <section className="card bg-gradient-to-br from-slate-900/30 to-purple-950/10 border border-line p-8 md:p-12 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-44 h-44 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="grid lg:grid-cols-[1.1fr_1fr] gap-10 items-center">
          
          <div className="space-y-6">
            <div className="space-y-3">
              <span className="text-xs font-bold tracking-widest uppercase text-purple-400">Interactive GNN-LSTM Visualizer</span>
              <h2 className="font-display text-2xl md:text-3xl font-bold text-white">Spatial Graph Message Passing</h2>
              <p className="text-xs text-slate-300 leading-relaxed">
                Click on any state node in the geographical connection graph on the right. See the Spatial GNN aggregate prediction signals from neighboring border connections (represented by the animated light pulses) to compute the final hesitancy risk score.
              </p>
            </div>

            {/* Selected Node Details Card */}
            <div className="p-4 bg-slate-950/80 border border-line/65 rounded-xl space-y-2.5 shadow-lg">
              <div className="flex justify-between items-center border-b border-line/35 pb-2">
                <span className="text-xs font-bold text-white">📍 Selected: {selectedNode.name}</span>
                <span
                  className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: `${RISK_COLORS[selectedNode.risk]}20`, color: RISK_COLORS[selectedNode.risk] }}
                >
                  {selectedNode.risk} risk
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <p className="text-[10px] text-slate-500 uppercase">Predicted Hesitancy</p>
                  <p className="text-lg font-bold text-purple-300 font-mono mt-0.5">{selectedNode.hesitancy}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 uppercase">Connected Neighbors</p>
                  <p className="text-[10px] font-semibold text-slate-300 mt-1 leading-normal truncate" title={selectedNode.neighbors.join(", ")}>
                    {selectedNode.neighbors.join(", ")}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Dynamic SVG Connection Map */}
          <div className="bg-slate-950/90 border border-line/60 rounded-2xl p-6 flex flex-col items-center justify-center relative shadow-inner">
            <p className="absolute top-3 left-3 text-[10px] font-mono text-slate-500">GNN Spatial Topology Graph</p>
            
            <svg viewBox="0 0 320 240" className="w-full max-w-[340px] h-auto">
              
              {/* Draw Edges */}
              {nodes.map((node) =>
                node.neighbors.map((neighborName) => {
                  const target = nodes.find((n) => n.name === neighborName);
                  if (!target) return null;
                  const isConnectionSelected = selectedNode.name === node.name || selectedNode.name === target.name;
                  
                  return (
                    <g key={`${node.name}-${neighborName}`}>
                      {/* Connection Line */}
                      <line
                        x1={node.x}
                        y1={node.y}
                        x2={target.x}
                        y2={target.y}
                        stroke={isConnectionSelected ? "#7C3AED" : "rgba(99, 102, 241, 0.15)"}
                        strokeWidth={isConnectionSelected ? "2" : "1.5"}
                        transition-all="true"
                        duration-200="true"
                      />
                      
                      {/* Animated GNN message flows toward the selected node */}
                      {selectedNode.name === node.name && (
                        <path
                          d={`M ${target.x} ${target.y} L ${node.x} ${node.y}`}
                          fill="none"
                          stroke="#C084FC"
                          strokeWidth="2.5"
                          strokeDasharray="4,6"
                        >
                          <animate
                            attributeName="stroke-dashoffset"
                            values="30;0"
                            dur="1.5s"
                            repeatCount="indefinite"
                          />
                        </path>
                      )}
                    </g>
                  );
                })
              )}

              {/* Draw Nodes */}
              {nodes.map((node) => {
                const isSelected = selectedNode.name === node.name;
                return (
                  <g
                    key={node.name}
                    className="cursor-pointer group"
                    onClick={() => setSelectedNode(node)}
                  >
                    {/* Glowing ring under selected node */}
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={isSelected ? "11" : "7"}
                      fill={RISK_COLORS[node.risk]}
                      opacity={isSelected ? "0.35" : "0"}
                      className="group-hover:opacity-20 transition-all duration-200"
                    />
                    
                    {/* Core node circle */}
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={isSelected ? "7" : "5"}
                      fill={isSelected ? "#7C3AED" : RISK_COLORS[node.risk]}
                      stroke={isSelected ? "#C084FC" : "#090E1A"}
                      strokeWidth={isSelected ? "1.5" : "1"}
                      className="transition-all duration-200"
                    />

                    {/* State text labels */}
                    <text
                      x={node.x}
                      y={node.y - 10}
                      textAnchor="middle"
                      fill={isSelected ? "#C084FC" : "#94A3B8"}
                      fontSize={isSelected ? "8px" : "7px"}
                      fontWeight={isSelected ? "bold" : "normal"}
                      className="select-none transition-all duration-200 pointer-events-none"
                    >
                      {node.name}
                    </text>
                  </g>
                );
              })}

            </svg>
          </div>

        </div>
      </section>

    </div>
  );
}

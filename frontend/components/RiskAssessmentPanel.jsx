import React, { useState } from "react";
import { AlertTriangle, CheckCircle2, ShieldAlert, Info, Activity, Clock, FileCheck2, ChevronDown, ChevronUp, Loader2, Sparkles, RefreshCw } from "lucide-react";

// Helper for the animated SVG Gauge
const CircularGauge = ({ score }) => {
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 10) * circumference;

  let colorClass = "text-emerald-400"; // Low Risk
  if (score >= 4.0 && score < 7.0) colorClass = "text-amber-400"; // Medium
  if (score >= 7.0) colorClass = "text-rose-400"; // High

  return (
    <div className="relative w-32 h-32 flex items-center justify-center">
      {/* Background Track */}
      <svg className="w-full h-full transform -rotate-90">
        <circle
          cx="64"
          cy="64"
          r={radius}
          stroke="currentColor"
          strokeWidth="8"
          fill="transparent"
          className="text-[#2a3040]"
        />
        {/* Progress Track */}
        <circle
          cx="64"
          cy="64"
          r={radius}
          stroke="currentColor"
          strokeWidth="8"
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className={`transition-all duration-1000 ease-out ${colorClass}`}
          strokeLinecap="round"
        />
      </svg>
      {/* Center Text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-black text-white">{score.toFixed(1)}</span>
        <span className="text-[10px] uppercase tracking-wider text-gray-500 font-bold mt-1">/ 10</span>
      </div>
    </div>
  );
};

export default function RiskAssessmentPanel({ campaign: initialCampaign }) {
  const [campaign, setCampaign] = useState(initialCampaign);
  const [expandedMetric, setExpandedMetric] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState("");

  const handleAnalyze = async () => {
    if (!campaign?.id) return;
    setAnalyzing(true);
    setAnalyzeError("");
    try {
      const res = await fetch(`http://localhost:5000/api/campaigns/${campaign.id}/analyze`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "AI Analysis failed");
      if (data.campaign) {
        setCampaign(data.campaign);
      }
    } catch (err) {
      console.error(err);
      setAnalyzeError(err.message || "Failed to trigger AI risk assessment.");
    } finally {
      setAnalyzing(false);
    }
  };

  if (!campaign || campaign.risk_score === null || campaign.risk_score === undefined) {
    return (
      <div className="bg-[#1a2030] rounded-2xl border border-white/5 p-6 mt-6">
        <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
          <Activity className="w-5 h-5 text-[#a78bfa]" />
          AI Risk Assessment
        </h2>
        <div className="flex flex-col items-center justify-center py-10 bg-[#121622] rounded-xl border border-white/5 p-6">
          {analyzing ? (
            <>
              <Loader2 className="w-10 h-10 text-[#a78bfa] mb-3 animate-spin" />
              <p className="text-white font-bold text-sm">Evaluating Pitch &amp; Financials with AI…</p>
              <p className="text-xs text-gray-400 mt-1">Calling Gemini LLM &amp; Random Forest model</p>
            </>
          ) : (
            <>
              <Clock className="w-10 h-10 text-gray-400 mb-3 animate-pulse" />
              <p className="text-gray-300 font-medium">Analysis Pending</p>
              <p className="text-xs text-gray-500 mt-2 text-center max-w-xs mb-4">
                Our AI model evaluates this campaign's pitch clarity, financials, and risk profile.
              </p>
              <button
                onClick={handleAnalyze}
                disabled={analyzing}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#6f42c1] to-[#a78bfa] hover:from-[#5a3599] hover:to-[#906ffa] text-white font-bold rounded-xl text-xs transition shadow-lg shadow-[#6f42c1]/20 cursor-pointer"
              >
                <Sparkles className="w-4 h-4" /> Run / Retry AI Analysis
              </button>
              {analyzeError && (
                <p className="text-xs text-red-400 mt-3">{analyzeError}</p>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  const score = parseFloat(campaign.risk_score);
  
  // Risk Tier Logic
  let tier = "Low Risk";
  let tierColor = "text-emerald-400";
  let Icon = CheckCircle2;
  if (score >= 4.0 && score < 7.0) {
    tier = "Medium Risk";
    tierColor = "text-amber-400";
    Icon = AlertTriangle;
  } else if (score >= 7.0) {
    tier = "High Risk";
    tierColor = "text-rose-400";
    Icon = ShieldAlert;
  }

  // Formatting Sub-scores
  const metrics = [
    { key: "idea_clarity", label: "Idea Clarity" },
    { key: "business_model", label: "Business Model" },
    { key: "gtm_strategy", label: "Market Strategy" },
    { key: "proof_of_capability", label: "Proof of Capability" },
    { key: "credibility", label: "Credibility" },
    { key: "differentiation", label: "Differentiation" },
    { key: "problem_statement", label: "Problem Validty" },
    { key: "vagueness", label: "Vagueness (Reverse)", reverse: true }, // Higher is worse
  ];

  // Logic to generate dynamic AI narrative
  const generateNarrative = () => {
    // Collect non-null metrics
    const validMetrics = metrics.map(m => {
      let val = parseFloat(campaign[m.key]);
      if (isNaN(val)) val = 5.0; // Fail safe
      // If river-scored (like vagueness), a 10 means highly vague (bad), 1 means clear (good).
      // We invert it purely for the comparative sorting of "Strengths vs Weaknesses".
      const compareScore = m.reverse ? (10 - val + 1) : val;
      return { ...m, val, compareScore };
    });

    // Sort by compareScore to find highest and lowest
    validMetrics.sort((a, b) => b.compareScore - a.compareScore);
    
    // Top 2 strengths (scores > 6)
    const strengths = validMetrics.filter(m => m.compareScore > 6.0).slice(0, 2);
    // Bottom 2 weaknesses (scores < 5)
    const weaknesses = validMetrics.filter(m => m.compareScore < 5.0).reverse().slice(0, 2);

    let narrative = `This campaign demonstrates an overall ${tier} profile. `;
    
    if (strengths.length > 0) {
      narrative += `The AI model identified ${strengths.map(s => s.label).join(" and ")} as primary strengths. `;
    }
    
    if (weaknesses.length > 0) {
      narrative += `However, significant risks were flagged regarding ${weaknesses.map(w => w.label).join(" and ")}. `;
    } else {
      narrative += `The pitch is remarkably balanced with no severe single points of failure detected. `;
    }

    return narrative;
  };

  return (
    <div className="bg-[#1a2030] rounded-2xl border border-white/5 overflow-hidden mt-6">
      {/* Header */}
      <div className="border-b border-white/5 p-4 flex justify-between items-center bg-[#151a28]">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Activity className="w-5 h-5 text-[#a78bfa]" />
          Platform AI Assessment
        </h2>
        <div className="group relative cursor-help">
          <Info className="w-4 h-4 text-gray-400 hover:text-white" />
          <div className="absolute right-0 top-6 w-64 bg-gray-900 border border-gray-700 p-3 rounded-lg shadow-xl text-xs text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none hidden sm:block">
            Score evaluated using an institutional Random Forest model trained on 5,000+ historical crowdfunding campaigns, heavily weighting NLP sentiment of the pitch description.
          </div>
        </div>
      </div>

      <div className="p-6 md:p-8 flex flex-col md:flex-row gap-8 items-center md:items-start">
        
        {/* Left Column: Gauge & High Level Summary */}
        <div className="flex flex-col items-center flex-shrink-0">
          <CircularGauge score={score} />
          
          <div className={`flex items-center gap-2 mt-4 px-3 py-1.5 rounded-full border bg-[#121622] shadow-inner ${tierColor} border-current/20`}>
            <Icon className="w-4 h-4" />
            <span className="text-sm font-bold">{tier}</span>
          </div>

          <div className="mt-6 text-center text-xs text-gray-500 w-40">
            <div className="flex justify-between border-b border-gray-800 pb-2 mb-2">
              <span>Campaign Focus</span>
              <span className="text-gray-300">{campaign.ai_video_present ? "Has Demo" : "Text Heavy"}</span>
            </div>
            <div className="flex justify-between">
              <span>Setup Time</span>
              <span className="text-gray-300">{campaign.ai_prep_time_days ? Math.round(campaign.ai_prep_time_days) : "<1"} days</span>
            </div>
          </div>
        </div>

        {/* Right Column: Narrative and Metrics */}
        <div className="flex-1 w-full">
          {/* AI Narrative */}
          <div className="bg-[#121622] rounded-xl p-4 mb-6 border border-white/5">
            <h3 className="text-xs font-bold uppercase tracking-widest text-[#a78bfa] mb-2 flex items-center gap-1.5">
              <FileCheck2 className="w-3.5 h-3.5" />
              Algorithmic Summary
            </h3>
            <p className="text-sm text-gray-300 leading-relaxed">
              {generateNarrative()}
            </p>
          </div>

          {/* Sub-score Bars */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
            {metrics.map((metric) => {
              const val = parseFloat(campaign[metric.key]) || 5.0; // fallback to 5.0
              // Calculate bar color dynamically. 
              // Usually: >7 Green, 4-7 Amber, <4 Red. 
              // Reverse if Vagueness.
              const isBad = metric.reverse ? (val > 6) : (val < 4);
              const isGood = metric.reverse ? (val < 4) : (val > 7);
              
              const barColor = isBad ? "bg-rose-500" : isGood ? "bg-emerald-500" : "bg-amber-400";
              const percent = (val / 10) * 100;
              const isExpanded = expandedMetric === metric.key;

              return (
                <div 
                  key={metric.key} 
                  onClick={() => setExpandedMetric(isExpanded ? null : metric.key)}
                  className={`p-3.5 rounded-xl border transition-all duration-300 cursor-pointer ${
                    isExpanded 
                      ? "col-span-1 sm:col-span-2 bg-[#1f2638] border-white/20 shadow-xl ring-1 ring-[#6f42c1]/30" 
                      : "col-span-1 bg-[#131926]/40 border-transparent hover:bg-[#1a2030]/50 hover:border-white/5"
                  }`}
                >
                  <div className="flex justify-between items-center text-xs font-medium text-gray-400 mb-1.5">
                    <span className="flex items-center gap-1 text-gray-300 font-semibold text-sm">
                      {metric.label}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-100 font-bold bg-[#121622] px-2.5 py-0.5 rounded-md text-xs border border-white/10">
                        {val.toFixed(1)}
                      </span>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-[#a78bfa] transition-transform" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-gray-500 hover:text-gray-300 transition-transform" />
                      )}
                    </div>
                  </div>
                  
                  <div className="h-1.5 w-full bg-gray-800/80 rounded-full overflow-hidden mb-1">
                    <div 
                      className={`h-full ${barColor} transition-all duration-1000 ease-in-out`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>

                  <div 
                    className={`overflow-hidden transition-all duration-300 ease-in-out ${
                      isExpanded ? "max-h-[500px] opacity-100 mt-3" : "max-h-0 opacity-0 pointer-events-none"
                    }`}
                  >
                    <div className="p-4 rounded-xl bg-[#0f121d] border border-white/10 text-xs text-gray-200 leading-relaxed font-normal shadow-inner">
                      <div className="font-bold text-[#a78bfa] mb-1.5 text-xs uppercase tracking-wider flex items-center gap-1.5">
                        <FileCheck2 className="w-4 h-4" />
                        AI Analysis Reasoning
                      </div>
                      <p className="text-gray-300 text-xs leading-relaxed">
                        {campaign.ai_reasons?.[metric.key] || "No detailed reasoning provided for this score."}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      </div>
    </div>
  );
}

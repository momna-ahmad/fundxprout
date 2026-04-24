import { AlertTriangle, CheckCircle2, ShieldAlert, Clock } from "lucide-react";

export default function RiskBadge({ score }) {
  // If score is null or undefined, the AI hasn't processed it yet
  if (score === null || score === undefined) {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-500/10 border border-gray-500/20 text-gray-400 text-xs font-semibold backdrop-blur-sm shadow-sm transition-all hover:bg-gray-500/20">
        <Clock className="w-3.5 h-3.5" />
        <span>Pending Analysis</span>
      </div>
    );
  }

  // Parse the float score
  const numericScore = parseFloat(score);

  // Determine Tier
  let config;
  if (numericScore < 4.0) {
    // 0 - 3.9: Low Risk
    config = {
      label: "Low Risk",
      wrapperClass: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20",
      icon: <CheckCircle2 className="w-3.5 h-3.5" />,
    };
  } else if (numericScore < 7.0) {
    // 4.0 - 6.9: Medium Risk
    config = {
      label: "Medium Risk",
      wrapperClass: "bg-amber-500/10 border-amber-500/20 text-amber-400 hover:bg-amber-500/20",
      icon: <AlertTriangle className="w-3.5 h-3.5" />,
    };
  } else {
    // 7.0 - 10: High Risk
    config = {
      label: "High Risk",
      wrapperClass: "bg-rose-500/10 border-rose-500/20 text-rose-400 hover:bg-rose-500/20",
      icon: <ShieldAlert className="w-3.5 h-3.5" />,
    };
  }

  return (
    <div
      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold backdrop-blur-sm shadow-sm transition-all cursor-default ${config.wrapperClass}`}
      title={`AI Risk Score: ${numericScore.toFixed(2)}/10`}
    >
      {config.icon}
      <span>{config.label}</span>
      <span className="opacity-70 ml-0.5 hidden sm:inline-block">({numericScore.toFixed(1)})</span>
    </div>
  );
}

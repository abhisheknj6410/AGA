import React, { useState, useEffect } from 'react';
import {
  Cpu,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Scale,
  Sparkles,
  Layers,
  Activity,
  GitBranch,
  Shield,
  Compass,
  Zap,
  Info,
  ChevronRight,
  AlertCircle
} from 'lucide-react';
import {
  AlgorithmComparativeReport,
  SingleAlgorithmComparison,
  AlgorithmValueVerdict
} from '../../types/graph';
import { fetchAlgorithmComparative } from '../../api/client';

interface AlgorithmValueLabViewProps {
  caseId: string;
}

export const AlgorithmValueLabView: React.FC<AlgorithmValueLabViewProps> = ({ caseId }) => {
  const [report, setReport] = useState<AlgorithmComparativeReport | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedKey, setSelectedKey] = useState<string>('YEN_K_SHORTEST');

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchAlgorithmComparative(caseId);
      setReport(res);
      if (res.comparisons && res.comparisons.length > 0) {
        setSelectedKey(res.comparisons[0].algorithmKey);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load algorithm comparative evaluation.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [caseId]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center h-full bg-zinc-50 dark:bg-zinc-950">
        <div className="flex flex-col items-center gap-3 text-zinc-500 dark:text-zinc-400">
          <Cpu className="w-8 h-8 animate-spin text-teal-500" />
          <p className="text-sm font-medium">Running Baseline vs Graph Algorithm Comparative Evaluation...</p>
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="flex-1 p-6 bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center justify-center">
        <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 p-6 rounded-xl max-w-lg text-center">
          <AlertCircle className="w-8 h-8 text-rose-500 mx-auto mb-2" />
          <h3 className="font-semibold text-rose-900 dark:text-rose-200 mb-1">Comparative Engine Error</h3>
          <p className="text-xs text-rose-700 dark:text-rose-400 mb-4">{error || 'No comparative data available.'}</p>
          <button
            onClick={loadData}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg shadow-sm transition"
          >
            Retry Evaluation
          </button>
        </div>
      </div>
    );
  }

  const selectedComp = report.comparisons.find(c => c.algorithmKey === selectedKey) || report.comparisons[0];

  const getVerdictBadge = (verdict: AlgorithmValueVerdict) => {
    switch (verdict) {
      case 'SIGNIFICANT_VALUE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Significant Value
          </span>
        );
      case 'MODERATE_VALUE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-300 dark:border-blue-800">
            <Sparkles className="w-3.5 h-3.5" />
            Moderate Value
          </span>
        );
      case 'BASELINE_SUFFICIENT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800">
            <Info className="w-3.5 h-3.5" />
            Baseline Sufficient
          </span>
        );
      case 'NO_ADDITIONAL_VALUE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-zinc-200 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300 border border-zinc-300 dark:border-zinc-700">
            <Scale className="w-3.5 h-3.5" />
            No Additional Value
          </span>
        );
      case 'ASSUMPTION_VIOLATED':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
            <AlertTriangle className="w-3.5 h-3.5" />
            Assumption Violated
          </span>
        );
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 overflow-y-auto">
      {/* Header Bar */}
      <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800/80 text-teal-600 dark:text-teal-400">
                <Scale className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                  Algorithm Value Lab
                </h1>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Comparative validation: proves whether sophisticated graph algorithms uncover investigative structure simpler baselines miss.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadData}
              className="px-3.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700/60 text-xs font-semibold text-zinc-700 dark:text-zinc-300 transition shadow-xs"
            >
              Re-Evaluate
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 space-y-6 w-full">
        {/* Top KPI Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
          <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs">
            <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block">Algorithms Evaluated</span>
            <div className="text-2xl font-black text-zinc-900 dark:text-zinc-100 mt-1 font-mono">
              {report.summary.totalAlgorithmsEvaluated}
            </div>
            <span className="text-[10px] text-zinc-500">Consequential algorithms</span>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs">
            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">With Additional Value</span>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1 font-mono">
              {report.summary.withAdditionalValue}
            </div>
            <span className="text-[10px] text-zinc-500">Uncovers hidden structure</span>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs">
            <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block">Baseline Sufficient / None</span>
            <div className="text-2xl font-black text-zinc-700 dark:text-zinc-300 mt-1 font-mono">
              {report.summary.withNoAdditionalValue}
            </div>
            <span className="text-[10px] text-zinc-500">Honest reporting</span>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs">
            <span className="text-[11px] font-semibold text-teal-600 dark:text-teal-400 uppercase tracking-wider block">Unique Outputs Discovered</span>
            <div className="text-2xl font-black text-teal-600 dark:text-teal-400 mt-1 font-mono">
              {report.summary.totalUniqueOutputs}
            </div>
            <span className="text-[10px] text-zinc-500">Beyond simple traversal</span>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs">
            <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block">Downstream Decisions</span>
            <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1 font-mono">
              {report.summary.downstreamDecisionsAffected}
            </div>
            <span className="text-[10px] text-zinc-500">Actions & candidates steered</span>
          </div>
        </div>

        {/* Methodological Integrity Notice */}
        <div className="p-3.5 rounded-xl bg-teal-50/70 dark:bg-teal-950/20 border border-teal-200/80 dark:border-teal-800/40 text-xs flex items-center gap-2.5 text-teal-900 dark:text-teal-200">
          <Info className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
          <p>{report.methodologicalIntegrityNotice}</p>
        </div>

        {/* Main Grid: Left Selector List, Right Detailed Comparison */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Algorithm Selector List */}
          <div className="lg:col-span-4 space-y-2.5">
            <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400 px-1">
              Consequential Algorithms
            </h2>
            <div className="space-y-2">
              {report.comparisons.map(item => (
                <div
                  key={item.algorithmKey}
                  onClick={() => setSelectedKey(item.algorithmKey)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                    selectedKey === item.algorithmKey
                      ? 'bg-white dark:bg-zinc-900 border-teal-500 dark:border-teal-500 shadow-sm ring-1 ring-teal-500/20'
                      : 'bg-white dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="font-bold text-xs text-zinc-900 dark:text-zinc-100 truncate">
                      {item.algorithm}
                    </span>
                    {getVerdictBadge(item.verdict)}
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-zinc-500">
                    <span className="text-zinc-400">vs:</span>
                    <span className="truncate">{item.baselineName}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: In-Depth Comparison Details */}
          {selectedComp && (
            <div className="lg:col-span-8 space-y-6">
              {/* Detailed Card */}
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-xs space-y-5">
                {/* Title & Verdict */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-100 dark:border-zinc-800">
                  <div>
                    <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                      {selectedComp.algorithm}
                    </h2>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      Evaluated against simpler baseline: <span className="font-semibold text-zinc-700 dark:text-zinc-300">{selectedComp.baselineName}</span>
                    </p>
                  </div>
                  {getVerdictBadge(selectedComp.verdict)}
                </div>

                {/* Side-by-Side Capability Comparison */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800">
                    <div className="flex items-center gap-1.5 mb-2 text-zinc-500 text-xs font-semibold uppercase tracking-wider">
                      <Scale className="w-3.5 h-3.5" />
                      Baseline Capability
                    </div>
                    <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed">
                      {selectedComp.baselineCapability}
                    </p>
                  </div>

                  <div className="p-4 rounded-lg bg-teal-50/50 dark:bg-teal-950/20 border border-teal-200/80 dark:border-teal-800/50">
                    <div className="flex items-center gap-1.5 mb-2 text-teal-700 dark:text-teal-400 text-xs font-semibold uppercase tracking-wider">
                      <Sparkles className="w-3.5 h-3.5" />
                      Sophisticated Algorithm Capability
                    </div>
                    <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed">
                      {selectedComp.algorithmCapability}
                    </p>
                  </div>
                </div>

                {/* Additional Insight Banner */}
                <div className="p-4 rounded-lg bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 text-xs">
                  <span className="font-semibold text-amber-900 dark:text-amber-200 block mb-1">
                    Investigative Value Delivered:
                  </span>
                  <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed">
                    {selectedComp.additionalInsight}
                  </p>
                </div>

                {/* Quantitative Metric Delta Table */}
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2.5">
                    Quantitative Delta vs Baseline
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-400 font-medium">
                          <th className="pb-2">Metric</th>
                          <th className="pb-2 text-center">Baseline</th>
                          <th className="pb-2 text-center">Algorithm</th>
                          <th className="pb-2 text-right">Delta (Net Gain)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60 font-mono">
                        <tr>
                          <td className="py-2.5 font-sans font-medium text-zinc-700 dark:text-zinc-300">Possibilities Discovered</td>
                          <td className="py-2.5 text-center text-zinc-500">{selectedComp.metrics.possibilitiesDiscovered.baseline}</td>
                          <td className="py-2.5 text-center font-bold text-zinc-900 dark:text-zinc-100">{selectedComp.metrics.possibilitiesDiscovered.algorithm}</td>
                          <td className="py-2.5 text-right font-bold text-teal-600 dark:text-teal-400">+{selectedComp.metrics.possibilitiesDiscovered.delta}</td>
                        </tr>
                        <tr>
                          <td className="py-2.5 font-sans font-medium text-zinc-700 dark:text-zinc-300">Possibilities Eliminated</td>
                          <td className="py-2.5 text-center text-zinc-500">{selectedComp.metrics.possibilitiesEliminated.baseline}</td>
                          <td className="py-2.5 text-center font-bold text-zinc-900 dark:text-zinc-100">{selectedComp.metrics.possibilitiesEliminated.algorithm}</td>
                          <td className="py-2.5 text-right font-bold text-emerald-600 dark:text-emerald-400">+{selectedComp.metrics.possibilitiesEliminated.delta}</td>
                        </tr>
                        <tr>
                          <td className="py-2.5 font-sans font-medium text-zinc-700 dark:text-zinc-300">Structural Distinctions</td>
                          <td className="py-2.5 text-center text-zinc-500">{selectedComp.metrics.structuralDistinctionsDiscovered.baseline}</td>
                          <td className="py-2.5 text-center font-bold text-zinc-900 dark:text-zinc-100">{selectedComp.metrics.structuralDistinctionsDiscovered.algorithm}</td>
                          <td className="py-2.5 text-right font-bold text-teal-600 dark:text-teal-400">+{selectedComp.metrics.structuralDistinctionsDiscovered.delta}</td>
                        </tr>
                        <tr>
                          <td className="py-2.5 font-sans font-medium text-zinc-700 dark:text-zinc-300">Resolution Candidates</td>
                          <td className="py-2.5 text-center text-zinc-500">{selectedComp.metrics.resolutionCandidates.baseline}</td>
                          <td className="py-2.5 text-center font-bold text-zinc-900 dark:text-zinc-100">{selectedComp.metrics.resolutionCandidates.algorithm}</td>
                          <td className="py-2.5 text-right font-bold text-teal-600 dark:text-teal-400">+{selectedComp.metrics.resolutionCandidates.delta}</td>
                        </tr>
                        <tr>
                          <td className="py-2.5 font-sans font-medium text-zinc-700 dark:text-zinc-300">Investigation Actions</td>
                          <td className="py-2.5 text-center text-zinc-500">{selectedComp.metrics.investigationActions.baseline}</td>
                          <td className="py-2.5 text-center font-bold text-zinc-900 dark:text-zinc-100">{selectedComp.metrics.investigationActions.algorithm}</td>
                          <td className="py-2.5 text-right font-bold text-teal-600 dark:text-teal-400">+{selectedComp.metrics.investigationActions.delta}</td>
                        </tr>
                        <tr>
                          <td className="py-2.5 font-sans font-medium text-zinc-700 dark:text-zinc-300">Entropy Reduction (bits)</td>
                          <td className="py-2.5 text-center text-zinc-500">{selectedComp.metrics.entropyReduction.baseline.toFixed(2)}</td>
                          <td className="py-2.5 text-center font-bold text-zinc-900 dark:text-zinc-100">{selectedComp.metrics.entropyReduction.algorithm.toFixed(2)}</td>
                          <td className="py-2.5 text-right font-bold text-indigo-600 dark:text-indigo-400">+{selectedComp.metrics.entropyReduction.delta.toFixed(2)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Unique Investigative Outputs */}
                {selectedComp.uniqueInvestigativeOutputs && selectedComp.uniqueInvestigativeOutputs.length > 0 && (
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">
                      Unique Findings Simple Baselines Would Miss
                    </h3>
                    <ul className="space-y-1.5">
                      {selectedComp.uniqueInvestigativeOutputs.map((item, idx) => (
                        <li key={idx} className="p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-700 dark:text-zinc-300 flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-teal-500 shrink-0 mt-0.5" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Downstream Effect & Ablation */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                  <div className="space-y-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                      Downstream Pipeline Effect
                    </span>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400">
                      {selectedComp.downstreamEffect}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-rose-500">
                      Ablation Impact (If Bypassed)
                    </span>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400">
                      {selectedComp.ablationResult}
                    </p>
                  </div>
                </div>

                {/* Assumption Risks */}
                {selectedComp.assumptionRisks && selectedComp.assumptionRisks.length > 0 && (
                  <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-500 flex items-center gap-1 mb-1.5">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Assumptions & Potential Failure Modes
                    </span>
                    <ul className="space-y-1">
                      {selectedComp.assumptionRisks.map((risk, idx) => (
                        <li key={idx} className="text-[11px] text-zinc-500 dark:text-zinc-400 flex items-start gap-1.5">
                          <span className="text-amber-500 font-bold">•</span>
                          <span>{risk}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

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
  AlertCircle,
  Network,
  RefreshCw,
  Clock,
  Filter
} from 'lucide-react';
import {
  GeneralizationBenchmarkReport,
  AlgorithmTopologyEvaluation,
  AlgorithmAggregatePerformance,
  TopologyClass,
  GeneralizationClassification
} from '../../types/graph';
import { fetchAlgorithmBenchmark } from '../../api/client';

interface AlgorithmGeneralizationLabViewProps {
  caseId?: string;
}

export const AlgorithmGeneralizationLabView: React.FC<AlgorithmGeneralizationLabViewProps> = () => {
  const [report, setReport] = useState<GeneralizationBenchmarkReport | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'BY_TOPOLOGY' | 'BY_ALGORITHM'>('BY_TOPOLOGY');
  const [selectedTopologyId, setSelectedTopologyId] = useState<string>('topo-linear-chain');
  const [selectedAlgorithmKey, setSelectedAlgorithmKey] = useState<string>('YEN_K_SHORTEST');

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchAlgorithmBenchmark();
      setReport(res);
      if (res.topologies && res.topologies.length > 0) {
        setSelectedTopologyId(res.topologies[0].id);
      }
      if (res.aggregateSummaries && res.aggregateSummaries.length > 0) {
        setSelectedAlgorithmKey(res.aggregateSummaries[0].algorithmKey);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load generalization benchmark.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center h-full bg-zinc-50 dark:bg-zinc-950">
        <div className="flex flex-col items-center gap-3 text-zinc-500 dark:text-zinc-400">
          <Cpu className="w-8 h-8 animate-spin text-indigo-500" />
          <p className="text-sm font-medium">Running 84 Deterministic Benchmark Evaluations Across 12 Topologies...</p>
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="flex-1 p-6 bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center justify-center">
        <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 p-6 rounded-xl max-w-lg text-center">
          <AlertCircle className="w-8 h-8 text-rose-500 mx-auto mb-2" />
          <h3 className="font-semibold text-rose-900 dark:text-rose-200 mb-1">Benchmark Engine Error</h3>
          <p className="text-xs text-rose-700 dark:text-rose-400 mb-4">{error || 'No benchmark data available.'}</p>
          <button
            onClick={loadData}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg shadow-sm transition"
          >
            Retry Benchmark
          </button>
        </div>
      </div>
    );
  }

  const selectedTopology = report.topologies.find(t => t.id === selectedTopologyId) || report.topologies[0];
  const topoEvaluations = report.evaluations.filter(e => e.topologyId === selectedTopologyId);

  const selectedAlgSummary =
    report.aggregateSummaries.find(s => s.algorithmKey === selectedAlgorithmKey) || report.aggregateSummaries[0];
  const algEvaluations = report.evaluations.filter(e => e.algorithmKey === selectedAlgorithmKey);

  const avgValueRate = (
    report.aggregateSummaries.reduce((acc, s) => acc + s.valueRatePercent, 0) /
    (report.aggregateSummaries.length || 1)
  ).toFixed(1);

  const totalSig = report.evaluations.filter(e => e.classification === 'SIGNIFICANT_VALUE').length;
  const totalBase = report.evaluations.filter(e => e.classification === 'BASELINE_SUFFICIENT').length;
  const totalNA = report.evaluations.filter(e => e.classification === 'NOT_APPLICABLE').length;
  const totalViol = report.evaluations.filter(e => e.classification === 'ASSUMPTION_VIOLATED').length;

  const renderBadge = (classification: GeneralizationClassification) => {
    switch (classification) {
      case 'SIGNIFICANT_VALUE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
            <CheckCircle2 className="w-3.5 h-3.5" /> Significant Value
          </span>
        );
      case 'SOME_VALUE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-300 dark:border-blue-800">
            <Sparkles className="w-3.5 h-3.5" /> Some Value
          </span>
        );
      case 'BASELINE_SUFFICIENT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
            <Scale className="w-3.5 h-3.5" /> Baseline Sufficient
          </span>
        );
      case 'NOT_APPLICABLE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 border border-zinc-300 dark:border-zinc-700">
            <XCircle className="w-3.5 h-3.5" /> Not Applicable
          </span>
        );
      case 'ASSUMPTION_VIOLATED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
            <AlertTriangle className="w-3.5 h-3.5" /> Assumption Violated
          </span>
        );
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-zinc-50 dark:bg-zinc-950 overflow-hidden">
      {/* Top Header */}
      <div className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase rounded bg-indigo-100 text-indigo-800 dark:bg-indigo-950/80 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
              Phase 11 Benchmark
            </span>
            <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Network className="w-5 h-5 text-indigo-500" />
              Algorithm Generalization & Topology Benchmark Lab
            </h1>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-3xl">
            Empirical comparative evaluation across 12 diverse investigation graph topologies answering:
            <strong className="text-zinc-700 dark:text-zinc-300 ml-1">
              "Do our graph algorithms consistently provide value across diverse structures, or only on demo cases?"
            </strong>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="inline-flex rounded-lg border border-zinc-200 dark:border-zinc-800 p-1 bg-zinc-100 dark:bg-zinc-900">
            <button
              onClick={() => setViewMode('BY_TOPOLOGY')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition ${
                viewMode === 'BY_TOPOLOGY'
                  ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm font-semibold'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
            >
              By Topology (12)
            </button>
            <button
              onClick={() => setViewMode('BY_ALGORITHM')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition ${
                viewMode === 'BY_ALGORITHM'
                  ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm font-semibold'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
            >
              By Algorithm (7)
            </button>
          </div>

          <button
            onClick={loadData}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Re-run Benchmark
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="px-6 py-3 bg-zinc-100/50 dark:bg-zinc-900/30 border-b border-zinc-200 dark:border-zinc-800 grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-white dark:bg-zinc-900 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <div className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Topologies Tested</div>
          <div className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mt-0.5">{report.totalTopologiesEvaluated}</div>
          <div className="text-[10px] text-zinc-500 mt-0.5">Synthetic & canonical</div>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <div className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Total Evaluations</div>
          <div className="text-xl font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">{report.totalEvaluations}</div>
          <div className="text-[10px] text-zinc-500 mt-0.5">12 topologies x 7 algorithms</div>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <div className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Significant Value</div>
          <div className="text-xl font-bold text-emerald-700 dark:text-emerald-300 mt-0.5">{totalSig} <span className="text-xs text-zinc-500 font-normal">cases</span></div>
          <div className="text-[10px] text-emerald-600 dark:text-emerald-500 mt-0.5">Outperformed baseline</div>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <div className="text-[11px] font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wider">Baseline Sufficient</div>
          <div className="text-xl font-bold text-amber-700 dark:text-amber-300 mt-0.5">{totalBase} <span className="text-xs text-zinc-500 font-normal">cases</span></div>
          <div className="text-[10px] text-amber-600 dark:text-amber-500 mt-0.5">Linear chains / trivial</div>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <div className="text-[11px] font-medium text-rose-600 dark:text-rose-400 uppercase tracking-wider">Violated / N.A.</div>
          <div className="text-xl font-bold text-rose-700 dark:text-rose-300 mt-0.5">{totalNA + totalViol} <span className="text-xs text-zinc-500 font-normal">cases</span></div>
          <div className="text-[10px] text-rose-600 dark:text-rose-500 mt-0.5">Cycles ({totalViol}) & Islands ({totalNA})</div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {viewMode === 'BY_TOPOLOGY' ? (
          <>
            {/* Sidebar: Topology Selection */}
            <div className="w-80 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 flex flex-col overflow-y-auto">
              <div className="p-3 border-b border-zinc-200 dark:border-zinc-800 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider flex items-center justify-between">
                <span>Topologies ({report.topologies.length})</span>
                <Filter className="w-3.5 h-3.5" />
              </div>
              <div className="p-2 space-y-1">
                {report.topologies.map(t => {
                  const isSelected = t.id === selectedTopologyId;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setSelectedTopologyId(t.id)}
                      className={`w-full text-left p-3 rounded-lg border transition ${
                        isSelected
                          ? 'bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800/80 shadow-sm'
                          : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800/80 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-semibold ${isSelected ? 'text-indigo-900 dark:text-indigo-200' : 'text-zinc-800 dark:text-zinc-200'}`}>
                          {t.name}
                        </span>
                        <ChevronRight className={`w-3.5 h-3.5 ${isSelected ? 'text-indigo-600 dark:text-indigo-400' : 'text-zinc-400'}`} />
                      </div>
                      <div className="flex items-center gap-2 mt-1.5 text-[10px] text-zinc-500 dark:text-zinc-400">
                        <span className="font-mono bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-600 dark:text-zinc-300">
                          {t.topologyClass}
                        </span>
                        <span>{t.nodeCount} nodes</span>
                        <span>•</span>
                        <span>{t.edgeCount} edges</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Detail Pane: Topology Evaluations */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Selected Topology Header Card */}
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-mono font-bold tracking-wider text-indigo-600 dark:text-indigo-400 uppercase">
                      {selectedTopology.topologyClass}
                    </span>
                    <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mt-0.5">
                      {selectedTopology.name}
                    </h2>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400">
                    <span className="px-2 py-1 bg-zinc-100 dark:bg-zinc-800 rounded-md font-mono">
                      {selectedTopology.nodeCount} Nodes
                    </span>
                    <span className="px-2 py-1 bg-zinc-100 dark:bg-zinc-800 rounded-md font-mono">
                      {selectedTopology.edgeCount} Edges
                    </span>
                  </div>
                </div>
              </div>

              {/* Evaluations on this Topology */}
              <div className="space-y-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Algorithm Evaluations on This Topology ({topoEvaluations.length})
                </h3>

                <div className="grid grid-cols-1 gap-4">
                  {topoEvaluations.map(ev => (
                    <div
                      key={ev.algorithmKey}
                      className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm space-y-4"
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-zinc-100 dark:border-zinc-800/60 pb-3">
                        <div>
                          <div className="text-[11px] font-mono text-zinc-400 uppercase">{ev.algorithmKey}</div>
                          <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{ev.algorithm}</h4>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-[11px] text-zinc-400 flex items-center gap-1 font-mono">
                            <Clock className="w-3.5 h-3.5" />
                            {ev.runtimeMs}ms
                          </span>
                          {renderBadge(ev.classification)}
                        </div>
                      </div>

                      {/* Baseline vs Algorithm Comparison Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                        <div className="p-3 bg-zinc-50 dark:bg-zinc-800/40 rounded-lg border border-zinc-200/80 dark:border-zinc-800/80">
                          <div className="font-semibold text-zinc-600 dark:text-zinc-400 mb-1">Baseline Result:</div>
                          <p className="text-zinc-800 dark:text-zinc-200">{ev.baselineResultSummary}</p>
                        </div>
                        <div className="p-3 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-lg border border-indigo-200/60 dark:border-indigo-800/60">
                          <div className="font-semibold text-indigo-700 dark:text-indigo-300 mb-1">Algorithm Result:</div>
                          <p className="text-zinc-800 dark:text-zinc-200">{ev.algorithmResultSummary}</p>
                        </div>
                      </div>

                      {/* Insight & Downstream Impact */}
                      <div className="text-xs space-y-1.5">
                        <div className="flex items-start gap-1.5 text-zinc-700 dark:text-zinc-300">
                          <Info className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                          <span><strong>Investigative Insight:</strong> {ev.additionalInsight}</span>
                        </div>
                        <div className="flex items-start gap-1.5 text-zinc-600 dark:text-zinc-400">
                          <ArrowRight className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" />
                          <span><strong>Downstream Effect:</strong> {ev.downstreamInvestigativeEffect}</span>
                        </div>
                        {ev.failureModeOrLimitation && (
                          <div className="flex items-start gap-1.5 text-amber-700 dark:text-amber-400 text-[11px] bg-amber-50/60 dark:bg-amber-950/30 p-2 rounded border border-amber-200 dark:border-amber-900/40">
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                            <span><strong>Limitation / Condition:</strong> {ev.failureModeOrLimitation}</span>
                          </div>
                        )}
                      </div>

                      {/* Unique Findings Pills */}
                      {ev.uniqueInvestigativeFindings.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-1 border-t border-zinc-100 dark:border-zinc-800/60">
                          {ev.uniqueInvestigativeFindings.map((finding, idx) => (
                            <span
                              key={idx}
                              className="text-[11px] px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1"
                            >
                              <Sparkles className="w-3 h-3 text-emerald-500" />
                              {finding}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        ) : (
          /* View Mode: BY_ALGORITHM */
          <>
            {/* Sidebar: Algorithm Selection */}
            <div className="w-80 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 flex flex-col overflow-y-auto">
              <div className="p-3 border-b border-zinc-200 dark:border-zinc-800 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider flex items-center justify-between">
                <span>Algorithms ({report.aggregateSummaries.length})</span>
                <Cpu className="w-3.5 h-3.5" />
              </div>
              <div className="p-2 space-y-1">
                {report.aggregateSummaries.map(s => {
                  const isSelected = s.algorithmKey === selectedAlgorithmKey;
                  return (
                    <button
                      key={s.algorithmKey}
                      onClick={() => setSelectedAlgorithmKey(s.algorithmKey)}
                      className={`w-full text-left p-3 rounded-lg border transition ${
                        isSelected
                          ? 'bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800/80 shadow-sm'
                          : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800/80 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-semibold ${isSelected ? 'text-indigo-900 dark:text-indigo-200' : 'text-zinc-800 dark:text-zinc-200'}`}>
                          {s.algorithm}
                        </span>
                        <ChevronRight className={`w-3.5 h-3.5 ${isSelected ? 'text-indigo-600 dark:text-indigo-400' : 'text-zinc-400'}`} />
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-[10px] text-zinc-500 font-mono">
                          Value: {s.valueRatePercent}%
                        </span>
                        <div className="flex gap-1 text-[9px] font-semibold">
                          <span className="text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-1 py-0.2 rounded">
                            {s.casesWithSignificantValue} Sig
                          </span>
                          <span className="text-amber-600 bg-amber-50 dark:bg-amber-950/40 px-1 py-0.2 rounded">
                            {s.casesBaselineSufficient} Base
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Detail Pane: Algorithm Aggregate Analysis */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Algorithm Summary Card */}
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-mono font-bold tracking-wider text-indigo-600 dark:text-indigo-400 uppercase">
                      {selectedAlgSummary.algorithmKey}
                    </span>
                    <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mt-0.5">
                      {selectedAlgSummary.algorithm}
                    </h2>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
                      {selectedAlgSummary.aggregateInsight}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800">
                    <div className="text-center">
                      <div className="text-[10px] uppercase text-zinc-500 font-medium">Value Rate</div>
                      <div className="text-xl font-bold text-indigo-600 dark:text-indigo-400">{selectedAlgSummary.valueRatePercent}%</div>
                    </div>
                    <div className="border-l border-zinc-200 dark:border-zinc-700 pl-4 space-y-1 text-[11px]">
                      <div className="text-emerald-600 font-medium">{selectedAlgSummary.casesWithSignificantValue} Significant</div>
                      <div className="text-amber-600 font-medium">{selectedAlgSummary.casesBaselineSufficient} Baseline Sufficient</div>
                      <div className="text-rose-600 font-medium">{selectedAlgSummary.casesAssumptionViolated + selectedAlgSummary.casesNotApplicable} Violated / N.A.</div>
                    </div>
                  </div>
                </div>

                {/* Structural Conditions Where Algorithm Adds Value vs Fails */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-3 border-t border-zinc-100 dark:border-zinc-800">
                  <div className="p-3 bg-emerald-50/40 dark:bg-emerald-950/20 rounded-lg border border-emerald-200/60 dark:border-emerald-800/60">
                    <div className="font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5 mb-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      Structural Conditions Where Algorithm Excels:
                    </div>
                    <ul className="space-y-1 text-emerald-950 dark:text-emerald-200 list-disc list-inside">
                      {selectedAlgSummary.keyStructuralConditionsForValue.map((c, i) => (
                        <li key={i}>{c}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-3 bg-amber-50/40 dark:bg-amber-950/20 rounded-lg border border-amber-200/60 dark:border-amber-800/60">
                    <div className="font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-1.5 mb-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      Conditions Where Baseline Is Sufficient or Fails:
                    </div>
                    <ul className="space-y-1 text-amber-950 dark:text-amber-200 list-disc list-inside">
                      {selectedAlgSummary.structuralConditionsWhereFails.map((c, i) => (
                        <li key={i}>{c}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              {/* Matrix of Evaluations Across All Topologies */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Performance Matrix Across Topologies ({algEvaluations.length})
                </h3>

                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-800 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                      <tr>
                        <th className="py-2.5 px-4">Topology</th>
                        <th className="py-2.5 px-4">Class</th>
                        <th className="py-2.5 px-4">Verdict</th>
                        <th className="py-2.5 px-4">Baseline vs Algorithm</th>
                        <th className="py-2.5 px-4">Investigative Insight</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                      {algEvaluations.map(ev => (
                        <tr key={ev.topologyId} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition">
                          <td className="py-3 px-4 font-semibold text-zinc-900 dark:text-zinc-100">
                            {ev.topologyName}
                          </td>
                          <td className="py-3 px-4 font-mono text-[11px] text-zinc-500">
                            {ev.topologyClass}
                          </td>
                          <td className="py-3 px-4">
                            {renderBadge(ev.classification)}
                          </td>
                          <td className="py-3 px-4 text-zinc-700 dark:text-zinc-300">
                            <div className="text-[11px] text-zinc-500">Base: {ev.baselineResultSummary}</div>
                            <div className="font-medium text-indigo-600 dark:text-indigo-400">Alg: {ev.algorithmResultSummary}</div>
                          </td>
                          <td className="py-3 px-4 text-zinc-600 dark:text-zinc-400 text-[11px] max-w-xs">
                            {ev.additionalInsight}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Footer Notice */}
      <div className="px-6 py-2.5 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 text-[11px] text-zinc-500 dark:text-zinc-400 flex items-center justify-between">
        <span>{report.methodologicalIntegrityNotice}</span>
        <span className="font-mono text-zinc-400">Benchmark Evaluated: {new Date(report.timestamp).toLocaleTimeString()}</span>
      </div>
    </div>
  );
};

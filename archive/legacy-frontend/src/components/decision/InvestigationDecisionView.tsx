import React, { useState, useEffect } from 'react';
import {
  Compass,
  HelpCircle,
  CheckCircle2,
  XCircle,
  AlertCircle,
  GitBranch,
  ArrowRight,
  Clock,
  Sparkles,
  Cpu,
  Layers,
  Shield,
  Zap,
  Play,
  RotateCcw,
  Target,
  FileText,
  DollarSign,
  TrendingDown
} from 'lucide-react';
import {
  InvestigativeDecisionResult,
  InvestigationStrategy,
  StrategySimulationResult,
  UnresolvedInvestigativeQuestion,
  GraphEvidenceTarget,
  AlgorithmDecisionTrace
} from '../../types/graph';
import { fetchInvestigativeDecisions, simulateInvestigativeStrategy } from '../../api/client';

interface InvestigationDecisionViewProps {
  caseId: string;
}

export const InvestigationDecisionView: React.FC<InvestigationDecisionViewProps> = ({ caseId }) => {
  const [data, setData] = useState<InvestigativeDecisionResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selected Strategy for detail / simulation
  const [selectedStrategyId, setSelectedStrategyId] = useState<string>('STRAT-A');
  const [simOutcome, setSimOutcome] = useState<'CONFIRMED' | 'REFUTED'>('CONFIRMED');
  const [simResult, setSimResult] = useState<StrategySimulationResult | null>(null);
  const [simulating, setSimulating] = useState(false);
  const [simError, setSimError] = useState<string | null>(null);

  const loadDecisions = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchInvestigativeDecisions(caseId);
      setData(res);
      if (res.strategies && res.strategies.length > 0) {
        setSelectedStrategyId(res.strategies[0].id);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load investigative decisions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDecisions();
  }, [caseId]);

  const handleRunSimulation = async (stratId: string, outcome: 'CONFIRMED' | 'REFUTED') => {
    try {
      setSimulating(true);
      setSimError(null);
      const res = await simulateInvestigativeStrategy(caseId, stratId, outcome);
      setSimResult(res);
    } catch (err: any) {
      setSimError(err.message || 'Failed to run strategy simulation.');
    } finally {
      setSimulating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center h-full bg-zinc-50 dark:bg-zinc-950">
        <div className="flex flex-col items-center gap-3 text-zinc-500 dark:text-zinc-400">
          <Compass className="w-8 h-8 animate-spin text-teal-500" />
          <p className="text-sm font-medium">Synthesizing Investigative Decisions from Graph Topology...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 p-6 bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center justify-center">
        <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 p-6 rounded-xl max-w-lg text-center">
          <AlertCircle className="w-8 h-8 text-rose-500 mx-auto mb-2" />
          <h3 className="font-semibold text-rose-900 dark:text-rose-200 mb-1">Decision Engine Error</h3>
          <p className="text-xs text-rose-700 dark:text-rose-400 mb-4">{error}</p>
          <button
            onClick={loadDecisions}
            className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-medium transition"
          >
            Retry Analysis
          </button>
        </div>
      </div>
    );
  }

  if (!data || data.unresolvedQuestions.length === 0) {
    return (
      <div className="flex-1 p-8 bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center justify-center">
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-8 rounded-2xl max-w-md text-center shadow-xs">
          <CheckCircle2 className="w-12 h-12 text-teal-500 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Zero Unresolved Uncertainties</h2>
          <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-2 leading-relaxed">
            The possibility space is currently fully resolved (Current Entropy: 0.000 bits). There are either 0 or 1 surviving hypotheses. No further differentiating actions are required.
          </p>
        </div>
      </div>
    );
  }

  const selectedStrategy = data.strategies.find(s => s.id === selectedStrategyId) || data.strategies[0];
  const topQuestion = data.unresolvedQuestions[0];

  return (
    <div className="flex-1 flex flex-col h-full bg-zinc-50 dark:bg-zinc-950 overflow-y-auto">
      {/* Header Bar */}
      <div className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-50 dark:bg-indigo-950/60 rounded-xl border border-indigo-200 dark:border-indigo-800/50">
            <Compass className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                Investigative Decision Intelligence
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                Phase 8
              </span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Deterministic graph-derived evidence targets, competing strategies & algorithm-to-decision traces
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-[10px] uppercase font-mono tracking-wider text-zinc-400">Search Space Entropy</div>
            <div className="text-sm font-bold font-mono text-zinc-900 dark:text-zinc-100">
              {data.currentEntropy} bits
            </div>
          </div>
          <div className="h-8 w-px bg-zinc-200 dark:bg-zinc-800" />
          <button
            onClick={loadDecisions}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg text-xs font-medium transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Recalculate</span>
          </button>
        </div>
      </div>

      <div className="p-6 space-y-6 max-w-7xl mx-auto w-full">
        {/* Banner: Primary Unresolved Uncertainty */}
        {topQuestion && (
          <div className="bg-gradient-to-r from-indigo-900/10 via-zinc-900/5 to-teal-900/10 dark:from-indigo-950/40 dark:via-zinc-900/30 dark:to-teal-950/40 border border-indigo-200/80 dark:border-indigo-800/50 rounded-2xl p-5 shadow-xs">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2 max-w-4xl">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-indigo-600 text-white">
                    Primary Uncertainty to Resolve
                  </span>
                  <span className="text-xs font-mono text-indigo-700 dark:text-indigo-400 font-semibold">
                    Importance Score: {topQuestion.importanceScore}/100
                  </span>
                </div>
                <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 leading-snug">
                  {topQuestion.question}
                </h2>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-600 dark:text-zinc-300">
                  <span className="flex items-center gap-1">
                    <Target className="w-3.5 h-3.5 text-indigo-500" />
                    <strong>Target:</strong> {topQuestion.target.elementLabel} ({topQuestion.target.targetType})
                  </span>
                  <span className="flex items-center gap-1">
                    <GitBranch className="w-3.5 h-3.5 text-teal-500" />
                    <strong>Separates:</strong> {topQuestion.target.separates.possibilityA} vs {topQuestion.target.separates.possibilityB}
                  </span>
                  {topQuestion.target.temporalWindow?.start && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-amber-500" />
                      <strong>Time Window:</strong> {topQuestion.target.temporalWindow.start.slice(11, 19)}–{(topQuestion.target.temporalWindow.end || '').slice(11, 19)}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Cpu className="w-3.5 h-3.5 text-purple-500" />
                    <strong>Algorithm:</strong> {topQuestion.algorithmBasis}
                  </span>
                </div>
              </div>

              {data.topRecommendation && (
                <div className="shrink-0 bg-white dark:bg-zinc-900 border border-indigo-200 dark:border-indigo-800/80 rounded-xl p-3 text-right">
                  <div className="text-[10px] uppercase font-mono tracking-wider text-zinc-400">Max Entropy Drop</div>
                  <div className="text-lg font-bold text-teal-600 dark:text-teal-400 flex items-center justify-end gap-1">
                    <TrendingDown className="w-4 h-4" />
                    <span>-{data.topRecommendation.expectedEntropyReduction} bits</span>
                  </div>
                  <div className="text-[10px] text-zinc-500 mt-0.5">via {data.topRecommendation.id}</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Section 1: Competing Investigation Strategies Side-by-Side */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-500" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-200">
                Alternative Investigation Strategies
              </h2>
              <span className="text-xs text-zinc-500">
                ({data.strategies.length} distinct paths derived from graph structure)
              </span>
            </div>
            <div className="text-xs text-zinc-500">
              Select a strategy to inspect decision trace and simulate outcomes
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {data.strategies.map((strat, idx) => {
              const isSelected = strat.id === selectedStrategyId;
              const isTop = idx === 0;

              return (
                <div
                  key={strat.id}
                  onClick={() => {
                    setSelectedStrategyId(strat.id);
                    setSimResult(null);
                  }}
                  className={`cursor-pointer rounded-xl border p-4 transition-all relative flex flex-col justify-between ${
                    isSelected
                      ? 'bg-white dark:bg-zinc-900 border-indigo-500 dark:border-indigo-500 ring-2 ring-indigo-500/20 shadow-md'
                      : 'bg-white/80 dark:bg-zinc-900/80 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
                  }`}
                >
                  {isTop && (
                    <div className="absolute -top-2.5 right-3 bg-indigo-600 text-white text-[9px] font-bold uppercase px-2 py-0.5 rounded-full shadow-xs">
                      Top Recommendation
                    </div>
                  )}

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                        {strat.id}
                      </span>
                      <span className="text-[10px] font-semibold text-zinc-500">
                        Cost: {strat.totalEstimatedCost}/5
                      </span>
                    </div>

                    <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 mb-1 leading-snug">
                      {strat.name}
                    </h3>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400 mb-3 line-clamp-2">
                      {strat.objective}
                    </p>

                    <div className="bg-zinc-50 dark:bg-zinc-950/60 rounded-lg p-2.5 mb-3 border border-zinc-200/60 dark:border-zinc-800/60 space-y-1.5 text-[11px]">
                      <div className="flex items-center justify-between text-zinc-600 dark:text-zinc-400">
                        <span>Expected Entropy Drop:</span>
                        <strong className="text-teal-600 dark:text-teal-400 font-mono">
                          {strat.expectedEntropyReduction} bits
                        </strong>
                      </div>
                      <div className="flex items-center justify-between text-zinc-600 dark:text-zinc-400">
                        <span>Targeted Distinction:</span>
                        <span className="font-mono text-zinc-800 dark:text-zinc-200 font-medium">
                          {strat.targetedPossibilities.join(' vs ')}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-zinc-600 dark:text-zinc-400">
                        <span>Algorithm Basis:</span>
                        <span className="text-zinc-700 dark:text-zinc-300 truncate max-w-[150px]" title={strat.algorithmBasis}>
                          {strat.algorithmBasis}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-zinc-100 dark:border-zinc-800/80">
                    <div className="text-[11px] text-zinc-700 dark:text-zinc-300">
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">Pro: </span>
                      {strat.tradeoffSummary.pros[0]}
                    </div>
                    <div className="text-[11px] text-zinc-600 dark:text-zinc-400">
                      <span className="font-semibold text-amber-600 dark:text-amber-400">Con: </span>
                      {strat.tradeoffSummary.cons[0]}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Section 2: Selected Strategy Detail & Algorithm Decision Trace */}
        {selectedStrategy && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Box: 5-Stage Algorithm -> Decision Provenance Trace */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
                <div className="flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-purple-500" />
                  <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                    Algorithm → Decision Trace ({selectedStrategy.id})
                  </h3>
                </div>
                <span className="text-[10px] font-mono uppercase bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded border border-purple-200 dark:border-purple-800">
                  Fully Deterministic
                </span>
              </div>

              <div className="space-y-3 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-zinc-200 dark:before:bg-zinc-800">
                {/* Stage 1: Graph Structure */}
                <div className="flex items-start gap-3 relative">
                  <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-950 border border-blue-300 dark:border-blue-700 flex items-center justify-center shrink-0 z-10 text-[10px] font-bold text-blue-700 dark:text-blue-300">
                    1
                  </div>
                  <div>
                    <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">Graph Structure</div>
                    <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                      {selectedStrategy.decisionTrace.graphStructure}
                    </div>
                  </div>
                </div>

                {/* Stage 2: Algorithm Execution & Result */}
                <div className="flex items-start gap-3 relative">
                  <div className="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-950 border border-purple-300 dark:border-purple-700 flex items-center justify-center shrink-0 z-10 text-[10px] font-bold text-purple-700 dark:text-purple-300">
                    2
                  </div>
                  <div>
                    <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">
                      Algorithm Result ({selectedStrategy.decisionTrace.algorithmUsed})
                    </div>
                    <div className="text-xs text-zinc-700 dark:text-zinc-300">
                      {selectedStrategy.decisionTrace.algorithmResult}
                    </div>
                  </div>
                </div>

                {/* Stage 3: Possibility Distinction */}
                <div className="flex items-start gap-3 relative">
                  <div className="w-6 h-6 rounded-full bg-teal-100 dark:bg-teal-950 border border-teal-300 dark:border-teal-700 flex items-center justify-center shrink-0 z-10 text-[10px] font-bold text-teal-700 dark:text-teal-300">
                    3
                  </div>
                  <div>
                    <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">Possibility Distinction</div>
                    <div className="text-xs font-semibold text-teal-700 dark:text-teal-300">
                      {selectedStrategy.decisionTrace.possibilityDistinction}
                    </div>
                  </div>
                </div>

                {/* Stage 4: Evidence Target */}
                <div className="flex items-start gap-3 relative">
                  <div className="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-950 border border-amber-300 dark:border-amber-700 flex items-center justify-center shrink-0 z-10 text-[10px] font-bold text-amber-700 dark:text-amber-300">
                    4
                  </div>
                  <div>
                    <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">Concrete Evidence Target</div>
                    <div className="text-xs text-zinc-800 dark:text-zinc-200">
                      {selectedStrategy.decisionTrace.evidenceTarget}
                    </div>
                  </div>
                </div>

                {/* Stage 5: Investigation Action */}
                <div className="flex items-start gap-3 relative">
                  <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-700 flex items-center justify-center shrink-0 z-10 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                    5
                  </div>
                  <div>
                    <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">Prioritized Action</div>
                    <div className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                      {selectedStrategy.decisionTrace.investigationAction}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Box: Strategy Simulation Lab */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
                <div className="flex items-center gap-2">
                  <Play className="w-4 h-4 text-teal-500" />
                  <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                    Counterfactual Strategy Simulation
                  </h3>
                </div>
                <span className="text-[10px] text-zinc-500">
                  Evaluate consequences before executing action
                </span>
              </div>

              <div className="bg-zinc-50 dark:bg-zinc-950/60 rounded-xl p-3 border border-zinc-200 dark:border-zinc-800 space-y-2">
                <div className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                  Simulate verification for primary action:
                </div>
                <div className="text-xs text-zinc-600 dark:text-zinc-400">
                  {selectedStrategy.primaryAction.question}
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <div className="flex items-center rounded-lg bg-zinc-200 dark:bg-zinc-800 p-0.5">
                    <button
                      onClick={() => setSimOutcome('CONFIRMED')}
                      className={`px-3 py-1 rounded text-xs font-medium transition ${
                        simOutcome === 'CONFIRMED'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
                      }`}
                    >
                      If CONFIRMED
                    </button>
                    <button
                      onClick={() => setSimOutcome('REFUTED')}
                      className={`px-3 py-1 rounded text-xs font-medium transition ${
                        simOutcome === 'REFUTED'
                          ? 'bg-rose-600 text-white shadow-xs'
                          : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
                      }`}
                    >
                      If REFUTED
                    </button>
                  </div>

                  <button
                    onClick={() => handleRunSimulation(selectedStrategy.id, simOutcome)}
                    disabled={simulating}
                    className="flex-1 flex items-center justify-center gap-1.5 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-medium transition disabled:opacity-50"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>{simulating ? 'Simulating...' : 'Run Simulation'}</span>
                  </button>
                </div>
              </div>

              {simError && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-lg text-xs text-rose-700 dark:text-rose-400">
                  {simError}
                </div>
              )}

              {/* Simulation Result Display */}
              {simResult ? (
                <div className="space-y-3 pt-2">
                  <div className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/80 space-y-2">
                    <div className="text-xs font-medium text-zinc-800 dark:text-zinc-200">
                      {simResult.explanation}
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-1 text-center font-mono">
                      <div className="bg-white dark:bg-zinc-900 p-2 rounded-lg border border-zinc-200 dark:border-zinc-800">
                        <div className="text-[9px] uppercase tracking-wider text-zinc-400">Surviving Hypotheses</div>
                        <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                          {simResult.afterPossibilityCount} / {simResult.beforePossibilityCount}
                        </div>
                      </div>

                      <div className="bg-white dark:bg-zinc-900 p-2 rounded-lg border border-zinc-200 dark:border-zinc-800">
                        <div className="text-[9px] uppercase tracking-wider text-zinc-400">Pruned Hypotheses</div>
                        <div className="text-sm font-bold text-rose-600 dark:text-rose-400">
                          {simResult.eliminatedPossibilityIds.length}
                        </div>
                      </div>

                      <div className="bg-white dark:bg-zinc-900 p-2 rounded-lg border border-zinc-200 dark:border-zinc-800">
                        <div className="text-[9px] uppercase tracking-wider text-zinc-400">Entropy Δ</div>
                        <div className="text-sm font-bold text-teal-600 dark:text-teal-400">
                          -{simResult.entropyReduction} bits
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 space-y-1 text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="text-zinc-500">Surviving Hypotheses:</span>
                        <span className="font-mono text-emerald-600 dark:text-emerald-400">
                          [{simResult.survivingPossibilityIds.join(', ')}]
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-zinc-500">Eliminated Branches:</span>
                        <span className="font-mono text-rose-600 dark:text-rose-400">
                          [{simResult.eliminatedPossibilityIds.join(', ')}]
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-zinc-500">Surviving Structural Families:</span>
                        <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                          {simResult.survivingFamilies.join(', ')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-6 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl text-center text-xs text-zinc-400">
                  Select outcome (CONFIRMED or REFUTED) and click "Run Simulation" to inspect candidate survival and entropy reduction.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Section 3: All Unresolved Graph Uncertainties Catalog */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
            <div className="flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-teal-500" />
              <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                All Unresolved Graph Uncertainties
              </h3>
            </div>
            <span className="text-xs text-zinc-500">
              Ranked by measurable information gain & resolution utility
            </span>
          </div>

          <div className="space-y-3">
            {data.unresolvedQuestions.map((q, idx) => (
              <div
                key={q.id}
                className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/40 hover:bg-zinc-50 dark:hover:bg-zinc-950 transition flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 max-w-3xl">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200">
                      {q.id}
                    </span>
                    <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                      {q.question}
                    </span>
                  </div>

                  <div className="text-xs text-zinc-600 dark:text-zinc-400">
                    {q.distinction}
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-zinc-500 pt-1">
                    <span>
                      <strong>Target:</strong> {q.target.elementLabel} ({q.target.targetType})
                    </span>
                    <span>•</span>
                    <span>
                      <strong>Evidence Class:</strong> {q.target.suggestedEvidenceClass}
                    </span>
                    {q.target.temporalWindow?.start && (
                      <>
                        <span>•</span>
                        <span>
                          <strong>Window:</strong> {q.target.temporalWindow.start.slice(11, 16)}–{(q.target.temporalWindow.end || '').slice(11, 16)}
                        </span>
                      </>
                    )}
                    <span>•</span>
                    <span>
                      <strong>Basis:</strong> {q.algorithmBasis}
                    </span>
                  </div>
                </div>

                <div className="flex md:flex-col items-center md:items-end justify-between shrink-0">
                  <div className="text-[10px] uppercase font-mono tracking-wider text-zinc-400">Importance</div>
                  <div className="text-base font-bold text-indigo-600 dark:text-indigo-400 font-mono">
                    {q.importanceScore}/100
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

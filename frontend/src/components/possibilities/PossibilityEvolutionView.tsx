import React, { useState, useEffect } from 'react';
import {
  GraphVersion,
  IncrementalImpactReport,
  SimulationResult,
  GraphPayload
} from '../../types/graph';
import {
  fetchGraphVersions,
  fetchLatestIncrementalImpact,
  runWhatIfSimulation
} from '../../api/client';
import {
  GitCommit,
  GitCompare,
  FlaskConical,
  Activity,
  PlusCircle,
  MinusCircle,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ArrowRight,
  ShieldAlert,
  Zap,
  Play,
  Layers,
  ChevronRight
} from 'lucide-react';

interface PossibilityEvolutionViewProps {
  caseId: string;
  graph: GraphPayload | null;
  onRefreshGraph?: () => void;
}

export const PossibilityEvolutionView: React.FC<PossibilityEvolutionViewProps> = ({
  caseId,
  graph,
  onRefreshGraph
}) => {
  const [versions, setVersions] = useState<GraphVersion[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);
  const [impactReport, setImpactReport] = useState<IncrementalImpactReport | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Simulation Lab State
  const [simAction, setSimAction] = useState<'REMOVE_EVIDENCE' | 'ADD_EVIDENCE' | 'MERGE_ENTITIES'>('REMOVE_EVIDENCE');
  const [simTargetId, setSimTargetId] = useState<string>('');
  const [simMergeWithId, setSimMergeWithId] = useState<string>('');
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);

  useEffect(() => {
    loadData();
  }, [caseId]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const vers = await fetchGraphVersions(caseId);
      setVersions(vers);
      if (vers.length > 0) {
        setSelectedVersion(vers[vers.length - 1].versionNumber);
      }
      const rep = await fetchLatestIncrementalImpact(caseId);
      setImpactReport(rep);
    } catch (err) {
      console.error('Failed to load incremental data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const evidenceNodes = graph?.nodes.filter(n => n.category === 'EVIDENCE') || [];
  const entityNodes = graph?.nodes.filter(n => n.category === 'ENTITY') || [];

  const handleRunSimulation = async () => {
    if (!simTargetId) return;
    setIsSimulating(true);
    try {
      const res = await runWhatIfSimulation(caseId, {
        action: simAction,
        targetId: simTargetId,
        parameters: simAction === 'MERGE_ENTITIES' ? { mergeWithId: simMergeWithId } : undefined
      });
      setSimulationResult(res);
    } catch (err: any) {
      alert(`Simulation failed: ${err.message}`);
    } finally {
      setIsSimulating(false);
    }
  };

  const evolution = impactReport?.possibilityEvolution;

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-zinc-50 dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200">
      {/* Top Header */}
      <div className="h-16 border-b border-zinc-200 dark:border-zinc-800 px-6 flex items-center justify-between bg-white dark:bg-zinc-950 shrink-0">
        <div className="flex items-center gap-3.5">
          <div className="p-2.5 rounded-xl bg-teal-50 dark:bg-teal-950/50 border border-teal-200 dark:border-teal-800 text-teal-600 dark:text-teal-400">
            <GitCompare className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
              Possibility Space Evolution & Versioning
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Deterministic tracking of how graph mutations causally add, remove, and alter possibilities
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800 transition cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Sync Versions</span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 scrollbar-thin space-y-6">
        {/* Version Timeline Ribbon */}
        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400 flex items-center gap-1.5">
              <GitCommit className="w-4 h-4" /> Graph Version Lineage ({versions.length} versions)
            </span>
            <span className="text-xs text-zinc-400 font-mono">
              Active: V{selectedVersion || 1}
            </span>
          </div>

          <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-thin">
            {versions.map((ver, idx) => {
              const isSelected = selectedVersion === ver.versionNumber;
              return (
                <button
                  key={ver.id}
                  onClick={() => setSelectedVersion(ver.versionNumber)}
                  className={`flex-shrink-0 flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-mono transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-teal-50 dark:bg-teal-950/60 border-teal-500 text-teal-800 dark:text-teal-200 ring-2 ring-teal-500/20 font-bold'
                      : 'bg-zinc-50 dark:bg-zinc-950/80 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 text-zinc-600 dark:text-zinc-400'
                  }`}
                >
                  <span className="w-5 h-5 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-[10px]">
                    {ver.versionNumber}
                  </span>
                  <span className="max-w-[140px] truncate">{ver.changeSummary || `Version ${ver.versionNumber}`}</span>
                  {idx < versions.length - 1 && <ChevronRight className="w-3.5 h-3.5 text-zinc-400 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Version Impact & Delta */}
        {impactReport && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Column 1: Delta & Propagation Breakdown */}
            <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                <Activity className="w-4 h-4 text-teal-600" />
                <span>Mutation Delta & Affected Region</span>
              </div>

              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-mono space-y-2">
                <div className="flex justify-between">
                  <span className="text-zinc-400">Mutation Type:</span>
                  <span className="font-bold text-zinc-800 dark:text-zinc-200">{impactReport.mutation.action}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Target:</span>
                  <span className="font-bold text-teal-600 dark:text-teal-400">{impactReport.mutation.targetId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Changed Elements:</span>
                  <span>{impactReport.deltaSummary.changedNodes} nodes, {impactReport.deltaSummary.changedEdges} edges</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Affected Subgraph:</span>
                  <span className="font-bold">{impactReport.affectedSubgraph.nodeCount} nodes, {impactReport.affectedSubgraph.edgeCount} edges</span>
                </div>
              </div>

              {/* Algorithms Reused vs Invalidated */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block">
                  Algorithm Dependency Tracking:
                </span>
                <div className="p-3 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 text-xs">
                  <span className="font-bold text-emerald-800 dark:text-emerald-300 block mb-1">
                    Reused (Computation Saved):
                  </span>
                  <div className="flex flex-wrap gap-1 font-mono text-[11px] text-emerald-700 dark:text-emerald-400">
                    {impactReport.algorithmsReused.map((a, i) => (
                      <span key={i} className="px-1.5 py-0.5 rounded bg-white dark:bg-zinc-900 border border-emerald-300 dark:border-emerald-800">
                        {a}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800/40 text-xs">
                  <span className="font-bold text-rose-800 dark:text-rose-300 block mb-1">
                    Invalidated & Recomputed:
                  </span>
                  <div className="flex flex-wrap gap-1 font-mono text-[11px] text-rose-700 dark:text-rose-400">
                    {impactReport.algorithmsInvalidated.map((a, i) => (
                      <span key={i} className="px-1.5 py-0.5 rounded bg-white dark:bg-zinc-900 border border-rose-300 dark:border-rose-800">
                        {a}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Column 2 & 3: Possibility Evolution Cards */}
            <div className="lg:col-span-2 p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-teal-600" />
                  <span>Possibility Space Evolution: V{impactReport.fromVersion} → V{impactReport.toVersion}</span>
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 font-mono text-xs font-bold">
                  {impactReport.validPossibilitiesBefore} → {impactReport.validPossibilitiesAfter} Surviving
                </span>
              </div>

              {evolution && (
                <div className="space-y-3">
                  {/* Added Possibilities */}
                  {evolution.addedPossibilities.map((rec, i) => (
                    <div
                      key={`add-${i}`}
                      className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 flex items-start gap-3"
                    >
                      <PlusCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-xs text-emerald-900 dark:text-emerald-200 font-mono">
                            + {rec.possibility.name}
                          </span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-mono bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200">
                            Spawned by {rec.spawningAlgorithm}
                          </span>
                        </div>
                        <p className="text-xs text-emerald-800/80 dark:text-emerald-300/80 leading-relaxed">
                          {rec.causalReason}
                        </p>
                      </div>
                    </div>
                  ))}

                  {/* Removed Possibilities */}
                  {evolution.removedPossibilities.map((rec, i) => (
                    <div
                      key={`rem-${i}`}
                      className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 flex items-start gap-3"
                    >
                      <MinusCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-xs text-rose-900 dark:text-rose-200 font-mono">
                            - {rec.possibilityName}
                          </span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-mono bg-rose-100 dark:bg-rose-900 text-rose-800 dark:text-rose-200">
                            Pruned by {rec.eliminatingAlgorithm}
                          </span>
                        </div>
                        <p className="text-xs text-rose-800/80 dark:text-rose-300/80 leading-relaxed">
                          {rec.causalReason}
                        </p>
                      </div>
                    </div>
                  ))}

                  {/* Modified Possibilities */}
                  {evolution.modifiedPossibilities.map((rec, i) => (
                    <div
                      key={`mod-${i}`}
                      className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 flex items-start gap-3"
                    >
                      <RefreshCw className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-xs text-amber-900 dark:text-amber-200 font-mono">
                            ~ {rec.possibilityName}
                          </span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-mono bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200">
                            {rec.statusBefore} → {rec.statusAfter}
                          </span>
                        </div>
                        <p className="text-xs text-amber-800/80 dark:text-amber-300/80 leading-relaxed">
                          {rec.causalReason}
                        </p>
                      </div>
                    </div>
                  ))}

                  {/* Unchanged Invariant Possibilities */}
                  {evolution.unchangedPossibilities.length > 0 && (
                    <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs">
                      <span className="font-bold text-zinc-600 dark:text-zinc-400 block mb-1">
                        = Unchanged Invariant Possibilities ({evolution.unchangedPossibilities.length}):
                      </span>
                      <div className="flex flex-wrap gap-2 text-zinc-700 dark:text-zinc-300 font-mono text-[11px]">
                        {evolution.unchangedPossibilities.map((p, idx) => (
                          <span key={idx} className="px-2 py-1 rounded bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                            {p.possibilityName} [{p.status}]
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* "What-If" Simulation Laboratory */}
        <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FlaskConical className="w-5 h-5 text-teal-600" />
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                Counterfactual Simulation Laboratory ("What-If?")
              </h3>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
              In-Memory • 0 DB Mutations
            </span>
          </div>

          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Simulate hypothetical evidence revocations, corroborations, or identity merges on an isolated in-memory graph clone. Observe the resulting algorithmic possibility space diff without altering the real investigation.
          </p>

          {/* Simulation Controls */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Hypothetical Action:
              </label>
              <select
                value={simAction}
                onChange={e => setSimAction(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-semibold cursor-pointer"
              >
                <option value="REMOVE_EVIDENCE">Remove Evidence (Test Provenance Fragility)</option>
                <option value="ADD_EVIDENCE">Add Verified Evidence (Test Corroboration)</option>
                <option value="MERGE_ENTITIES">Merge Entities (Test Identity Unification)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Target Element:
              </label>
              <select
                value={simTargetId}
                onChange={e => setSimTargetId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-semibold cursor-pointer"
              >
                <option value="">Select target node...</option>
                {simAction === 'REMOVE_EVIDENCE' &&
                  evidenceNodes.map(ev => (
                    <option key={ev.id} value={ev.id}>
                      {ev.label} ({ev.id})
                    </option>
                  ))}
                {simAction === 'ADD_EVIDENCE' && (
                  <option value="ev-simulated-new">Hypothetical Intercept Keycard (ev-simulated-new)</option>
                )}
                {simAction === 'MERGE_ENTITIES' &&
                  entityNodes.map(en => (
                    <option key={en.id} value={en.id}>
                      {en.label} ({en.id})
                    </option>
                  ))}
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={handleRunSimulation}
                disabled={!simTargetId || isSimulating}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white transition-all shadow-sm disabled:opacity-50 cursor-pointer"
              >
                <Play className={`w-3.5 h-3.5 ${isSimulating ? 'animate-spin' : ''}`} />
                <span>{isSimulating ? 'Simulating...' : 'Run What-If Simulation'}</span>
              </button>
            </div>
          </div>

          {/* Simulation Output */}
          {simulationResult && (
            <div className="mt-4 p-4 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 space-y-3 animate-in fade-in duration-150">
              <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-2">
                <span className="text-xs font-mono font-bold text-teal-600 dark:text-teal-400">
                  Simulation Outcome ({simulationResult.simulationId})
                </span>
                <span className="text-xs font-mono">
                  Possibility delta: {simulationResult.baselinePossibilityCount} → {simulationResult.simulatedPossibilityCount} (
                  {simulationResult.simulatedPossibilityCount - simulationResult.baselinePossibilityCount >= 0 ? '+' : ''}
                  {simulationResult.simulatedPossibilityCount - simulationResult.baselinePossibilityCount})
                </span>
              </div>

              <p className="text-xs text-zinc-600 dark:text-zinc-400 italic">
                "{simulationResult.explanation}"
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                {simulationResult.removedPossibilities.length > 0 && (
                  <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800">
                    <span className="font-bold text-rose-800 dark:text-rose-300 block mb-1">
                      Eliminated Under Simulation:
                    </span>
                    <ul className="space-y-1 font-mono text-[11px] text-rose-700 dark:text-rose-400">
                      {simulationResult.removedPossibilities.map((r, i) => (
                        <li key={i}>• {r.name}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {simulationResult.addedPossibilities.length > 0 && (
                  <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                    <span className="font-bold text-emerald-800 dark:text-emerald-300 block mb-1">
                      Spawned Under Simulation:
                    </span>
                    <ul className="space-y-1 font-mono text-[11px] text-emerald-700 dark:text-emerald-400">
                      {simulationResult.addedPossibilities.map((a, i) => (
                        <li key={i}>• {a.name}</li>
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

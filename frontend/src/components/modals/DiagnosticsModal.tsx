import React, { useEffect, useState } from 'react';
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  X,
  Share2,
  Clock,
  Zap,
  Layers,
  GitFork,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import { fetchGraphDiagnostics } from '../../api/client';

interface DiagnosticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  caseId: string;
  onSelectNode?: (nodeId: string) => void;
}

export const DiagnosticsModal: React.FC<DiagnosticsModalProps> = ({
  isOpen,
  onClose,
  caseId,
  onSelectNode
}) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && caseId) {
      setLoading(true);
      setError(null);
      fetchGraphDiagnostics(caseId)
        .then(res => {
          setData(res);
          setLoading(false);
        })
        .catch(err => {
          setError(err.message || 'Failed to load diagnostics.');
          setLoading(false);
        });
    }
  }, [isOpen, caseId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden text-slate-800 dark:text-slate-100 animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold tracking-wide">Graph Topology & Algorithm Readiness</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Mathematical invariants and structural pre-conditions</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 scrollbar-thin">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-3">
              <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs">Analyzing graph topology & causality invariants...</span>
            </div>
          ) : error ? (
            <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          ) : data ? (
            <>
              {/* Summary Banner */}
              <div className="p-3.5 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-900/40 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-indigo-900 dark:text-indigo-200">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>{data.phase2Readiness.summary}</span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-semibold">
                  TOPOLOGY READY
                </span>
              </div>

              {/* 1. Algorithm Pre-condition Cards */}
              <div>
                <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                  Algorithm Compatibility
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  {/* Dijkstra */}
                  <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-800 dark:text-slate-200">Dijkstra & K-Paths</span>
                      {data.phase2Readiness.dijkstraCompatible ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      All edge weights non-negative (w &ge; 0). Min cost: {data.costIntegrity.minCost}, Max: {data.costIntegrity.maxCost}.
                    </p>
                  </div>

                  {/* DAG Analysis */}
                  <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-800 dark:text-slate-200">Causal DAG & Temporal</span>
                      {data.causalDagAnalysis.isAcyclic ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {data.causalDagAnalysis.isAcyclic
                        ? 'Causal subgraph is strictly acyclic; partial-order verified.'
                        : `Contains ${data.causalDagAnalysis.detectedCycles.length} cycle(s).`}
                    </p>
                  </div>

                  {/* Min-Cut / Max-Flow */}
                  <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-800 dark:text-slate-200">Min-Cut & Flow</span>
                      {data.phase2Readiness.minCutMaxFlowCompatible ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {data.overview.nodeCount} vertices, {data.overview.edgeCount} directed edges ready for capacity cuts.
                    </p>
                  </div>
                </div>
              </div>

              {/* 2. Structural Topology & Centrality */}
              <div>
                <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                  <GitFork className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  Topology & High-Degree Hubs
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {/* Topology Stats */}
                  <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-slate-400">Connected Components:</span>
                      <span className="font-mono text-slate-800 dark:text-slate-200 font-semibold">{data.connectivity.componentCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-slate-400">Component Sizes:</span>
                      <span className="font-mono text-slate-700 dark:text-slate-300">[{data.connectivity.componentSizes.join(', ')}]</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-slate-400">Graph Density:</span>
                      <span className="font-mono text-slate-800 dark:text-slate-200">{data.overview.density}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-slate-400">Average Edge Cost:</span>
                      <span className="font-mono text-slate-800 dark:text-slate-200">{data.costIntegrity.averageCost}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-slate-400">Isolated Nodes:</span>
                      <span className="font-mono text-slate-800 dark:text-slate-200">{data.overview.isolatedNodeCount}</span>
                    </div>
                  </div>

                  {/* Top Hubs */}
                  <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-medium">
                      Top Connected Vertices:
                    </span>
                    <div className="space-y-1 max-h-36 overflow-y-auto scrollbar-thin">
                      {data.degreeDistribution.topHubs.map((h: any) => (
                        <div
                          key={h.nodeId}
                          onClick={() => {
                            if (onSelectNode) {
                              onSelectNode(h.nodeId);
                              onClose();
                            }
                          }}
                          className="flex items-center justify-between p-1.5 rounded-md hover:bg-slate-200/50 dark:hover:bg-slate-700/50 cursor-pointer text-xs transition"
                        >
                          <span className="text-slate-800 dark:text-slate-200 truncate max-w-[180px] font-medium">{h.label}</span>
                          <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400">
                            <span>in:{h.inDegree}</span>
                            <span>out:{h.outDegree}</span>
                            <span className="px-1.5 py-0.2 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-semibold border border-indigo-200 dark:border-indigo-800">
                              deg:{h.degree}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. Contradictions & Temporal Causality */}
              <div>
                <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  Causality & Evidence Contradictions
                </h3>
                <div className="space-y-2">
                  {/* Temporal Check */}
                  <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-medium text-slate-800 dark:text-slate-200">Temporal Causality Validation</span>
                      <span className="block text-[11px] text-slate-500 dark:text-slate-400">
                        {data.temporalCausality.evaluatedCount} causal event intervals evaluated for negative time travel
                      </span>
                    </div>
                    {data.temporalCausality.violations.length === 0 ? (
                      <span className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[11px] font-mono border border-emerald-200 dark:border-emerald-800 font-semibold">
                        0 Violations
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300 text-[11px] font-mono border border-rose-200 dark:border-rose-800 font-semibold">
                        {data.temporalCausality.violations.length} Inversions
                      </span>
                    )}
                  </div>

                  {/* Contradictions */}
                  <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-slate-800 dark:text-slate-200">Evidence Contradiction Links</span>
                      <span className="font-mono text-amber-600 dark:text-amber-400 text-[11px]">
                        {data.contradictions.length} Active Conflict(s)
                      </span>
                    </div>
                    {data.contradictions.map((c: any) => (
                      <div
                        key={c.edgeId}
                        className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] flex items-center justify-between text-slate-700 dark:text-slate-300"
                      >
                        <span className="text-amber-700 dark:text-amber-300 font-medium truncate max-w-[200px]">{c.sourceLabel}</span>
                        <span className="px-1.5 py-0.2 rounded bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-400 font-mono text-[10px] border border-rose-200 dark:border-rose-800">
                          CONTRADICTS
                        </span>
                        <span className="text-rose-700 dark:text-rose-300 font-medium truncate max-w-[200px]">{c.targetLabel}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end bg-slate-50/50 dark:bg-slate-900/50">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 transition"
          >
            Close Diagnostics
          </button>
        </div>
      </div>
    </div>
  );
};

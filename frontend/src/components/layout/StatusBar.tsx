import React from 'react';
import { ShieldCheck, AlertTriangle, Layers, GitCommit, CheckCircle2, Activity } from 'lucide-react';
import { GraphPayload } from '../../types/graph';

interface StatusBarProps {
  graph: GraphPayload | null;
  validation: { valid: boolean; errors: string[] } | null;
  onOpenDiagnostics?: () => void;
}

export const StatusBar: React.FC<StatusBarProps> = ({ graph, validation, onOpenDiagnostics }) => {
  if (!graph) return null;

  const observedEdges = graph.edges.filter(e => e.status === 'OBSERVED').length;
  const derivedEdges = graph.edges.filter(e => e.status === 'DERIVED').length;
  const hypoEdges = graph.edges.filter(e => e.status === 'HYPOTHESIZED').length;
  const contradictions = graph.edges.filter(e => e.type === 'CONTRADICTS').length;

  return (
    <footer className="h-7 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-t border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between px-3 text-[11px] text-slate-500 dark:text-slate-400 select-none z-20">
      {/* Left: Summary Metrics */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-slate-700 dark:text-slate-300 font-medium">{graph.nodes.length}</span>
          <span className="text-slate-400 text-[10px]">
            ({graph.metadata.entityCount} ent · {graph.metadata.eventCount} evt · {graph.metadata.evidenceCount} evi)
          </span>
        </div>

        <span className="text-slate-300 dark:text-slate-700">/</span>

        <div className="flex items-center gap-1.5">
          <GitCommit className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-slate-700 dark:text-slate-300 font-medium">{graph.edges.length}</span>
          <span className="text-slate-400 text-[10px]">
            ({observedEdges} obs · {derivedEdges} der · {hypoEdges} hyp)
          </span>
        </div>

        {contradictions > 0 && (
          <>
            <span className="text-slate-300 dark:text-slate-700">/</span>
            <div className="flex items-center gap-1 text-rose-600 dark:text-rose-400 font-medium text-[11px]">
              <AlertTriangle className="w-3 h-3" />
              <span>{contradictions} Contradiction{contradictions > 1 ? 's' : ''}</span>
            </div>
          </>
        )}
      </div>

      {/* Right: Validation & Diagnostics */}
      <div className="flex items-center gap-3">
        {onOpenDiagnostics && (
          <button
            onClick={onOpenDiagnostics}
            className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            title="Inspect Graph Topology & Algorithm Diagnostics"
          >
            <Activity className="w-3 h-3 text-indigo-500" />
            <span>Diagnostics</span>
          </button>
        )}

        {validation?.valid ? (
          <button
            onClick={onOpenDiagnostics}
            className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium hover:underline transition"
            title="Strict Graph Constraints Validated"
          >
            <CheckCircle2 className="w-3 h-3" />
            <span>Topology Valid</span>
          </button>
        ) : validation && !validation.valid ? (
          <button
            onClick={onOpenDiagnostics}
            className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium hover:underline transition"
            title={validation.errors.join('; ')}
          >
            <AlertTriangle className="w-3 h-3" />
            <span>{validation.errors.length} Integrity Warning{validation.errors.length > 1 ? 's' : ''}</span>
          </button>
        ) : null}

        <span className="text-slate-300 dark:text-slate-700">/</span>

        <span className="text-[10px] text-slate-400 font-mono">
          Case: {graph.metadata.caseId.slice(0, 8)}
        </span>
      </div>
    </footer>
  );
};

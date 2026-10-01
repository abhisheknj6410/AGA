import React from 'react';
import { AlertTriangle, Layers, GitCommit, CheckCircle2, Activity } from 'lucide-react';
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
    <footer className="h-9 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between px-5 text-xs text-zinc-500 dark:text-zinc-400 select-none z-20">
      {/* Left: Summary Metrics */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Layers className="w-3.5 h-3.5 text-zinc-400" />
          <span className="text-zinc-800 dark:text-zinc-200 font-semibold">{graph.nodes.length} Nodes</span>
          <span className="text-zinc-400 text-xs">
            ({graph.metadata.entityCount} entities · {graph.metadata.eventCount} events · {graph.metadata.evidenceCount} evidence)
          </span>
        </div>

        <span className="text-zinc-300 dark:text-zinc-700">|</span>

        <div className="flex items-center gap-2">
          <GitCommit className="w-3.5 h-3.5 text-zinc-400" />
          <span className="text-zinc-800 dark:text-zinc-200 font-semibold">{graph.edges.length} Links</span>
          <span className="text-zinc-400 text-xs">
            ({observedEdges} observed · {derivedEdges} derived · {hypoEdges} hypo)
          </span>
        </div>

        {contradictions > 0 && (
          <>
            <span className="text-zinc-300 dark:text-zinc-700">|</span>
            <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-semibold text-xs">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{contradictions} Contradiction{contradictions > 1 ? 's' : ''}</span>
            </div>
          </>
        )}
      </div>

      {/* Right: Validation & Diagnostics */}
      <div className="flex items-center gap-4">
        {onOpenDiagnostics && (
          <button
            onClick={onOpenDiagnostics}
            className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:text-teal-600 dark:hover:text-teal-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
            title="Inspect Graph Topology & Algorithm Diagnostics"
          >
            <Activity className="w-3.5 h-3.5 text-teal-500" />
            <span>Diagnostics</span>
          </button>
        )}

        {validation?.valid ? (
          <button
            onClick={onOpenDiagnostics}
            className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold hover:underline transition cursor-pointer text-xs"
            title="Strict Graph Constraints Validated"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Topology Valid</span>
          </button>
        ) : validation && !validation.valid ? (
          <button
            onClick={onOpenDiagnostics}
            className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-semibold hover:underline transition cursor-pointer text-xs"
            title={validation.errors.join('; ')}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>{validation.errors.length} Integrity Warning{validation.errors.length > 1 ? 's' : ''}</span>
          </button>
        ) : null}

        <span className="text-zinc-300 dark:text-zinc-700">|</span>

        <span className="text-xs text-zinc-400 font-mono">
          Case: {graph.metadata.caseId.slice(0, 8)}
        </span>
      </div>
    </footer>
  );
};

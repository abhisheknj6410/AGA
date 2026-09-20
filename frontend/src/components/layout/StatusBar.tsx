import React from 'react';
import { ShieldCheck, AlertTriangle, Layers, GitCommit, CheckCircle2 } from 'lucide-react';
import { GraphPayload } from '../../types/graph';

interface StatusBarProps {
  graph: GraphPayload | null;
  validation: { valid: boolean; errors: string[] } | null;
}

export const StatusBar: React.FC<StatusBarProps> = ({ graph, validation }) => {
  if (!graph) return null;

  const observedEdges = graph.edges.filter(e => e.status === 'OBSERVED').length;
  const derivedEdges = graph.edges.filter(e => e.status === 'DERIVED').length;
  const hypoEdges = graph.edges.filter(e => e.status === 'HYPOTHESIZED').length;
  const contradictions = graph.edges.filter(e => e.type === 'CONTRADICTS').length;

  return (
    <footer className="h-8 bg-slate-950 border-t border-slate-800 flex items-center justify-between px-4 text-[11px] text-slate-400 select-none z-20">
      {/* Left: Summary Metrics */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-slate-500" />
          <span>Nodes:</span>
          <span className="font-mono text-slate-200 font-semibold">{graph.nodes.length}</span>
          <span className="text-slate-600">
            ({graph.metadata.entityCount} Ent, {graph.metadata.eventCount} Evt, {graph.metadata.evidenceCount} Evi)
          </span>
        </div>

        <div className="h-3 w-[1px] bg-slate-800" />

        <div className="flex items-center gap-1.5">
          <GitCommit className="w-3.5 h-3.5 text-slate-500" />
          <span>Relationships:</span>
          <span className="font-mono text-slate-200 font-semibold">{graph.edges.length}</span>
          <span className="text-slate-600">
            ({observedEdges} Obs, {derivedEdges} Der, {hypoEdges} Hyp)
          </span>
        </div>

        {contradictions > 0 && (
          <>
            <div className="h-3 w-[1px] bg-slate-800" />
            <div className="flex items-center gap-1 text-red-400 font-medium">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{contradictions} Evidence Contradiction Detected</span>
            </div>
          </>
        )}
      </div>

      {/* Right: Validation & Integrity Status */}
      <div className="flex items-center gap-3">
        {validation?.valid ? (
          <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Strict Graph Constraints Validated</span>
          </div>
        ) : validation && !validation.valid ? (
          <div className="flex items-center gap-1.5 text-red-400 font-medium" title={validation.errors.join('; ')}>
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>{validation.errors.length} Integrity Warnings</span>
          </div>
        ) : null}

        <div className="h-3 w-[1px] bg-slate-800" />

        <div className="text-[10px] text-slate-500 font-mono">
          Case: {graph.metadata.caseId.slice(0, 8)}...
        </div>
      </div>
    </footer>
  );
};

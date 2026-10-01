import React, { useState } from 'react';
import { X, Users, Check, AlertTriangle, ArrowRight, ShieldAlert } from 'lucide-react';
import { ResolutionCandidate, GraphNode } from '../../types/graph';
import { mergeCandidates, rejectCandidate } from '../../api/client';

interface ResolutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  caseId: string;
  candidates: ResolutionCandidate[];
  nodes: GraphNode[];
  onResolved: () => void;
}

export const ResolutionModal: React.FC<ResolutionModalProps> = ({
  isOpen,
  onClose,
  caseId,
  candidates,
  nodes,
  onResolved
}) => {
  if (!isOpen) return null;

  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pendingCandidates = candidates.filter(c => c.status === 'PENDING');

  const handleMerge = async (candidateId: string) => {
    try {
      setLoadingId(candidateId);
      setError(null);
      await mergeCandidates(caseId, candidateId, 'Investigator verified duplicate identity match');
      onResolved();
    } catch (err: any) {
      setError(err.message || 'Failed to merge entities.');
    } finally {
      setLoadingId(null);
    }
  };

  const handleReject = async (candidateId: string) => {
    try {
      setLoadingId(candidateId);
      setError(null);
      await rejectCandidate(caseId, candidateId, 'Investigator confirmed separate unique individuals/entities');
      onResolved();
    } catch (err: any) {
      setError(err.message || 'Failed to reject candidate.');
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Safe Entity Resolution Review ({pendingCandidates.length} Pending)
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4 text-xs scrollbar-thin">
          <div className="p-3 bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-900/40 rounded-xl text-indigo-900 dark:text-indigo-300 text-[11px] leading-relaxed">
            <strong>Investigative Safeguard:</strong> The system strictly prohibits automated entity collapsing based purely on fuzzy heuristics. Review prospective duplicate identities below. Merging will preserve aliases and rewire graph edges to the canonical entity with a persistent audit trail.
          </div>

          {error && (
            <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300">
              {error}
            </div>
          )}

          {pendingCandidates.length === 0 ? (
            <div className="text-center py-10 text-slate-400">
              <Check className="w-8 h-8 mx-auto text-emerald-500 mb-2 opacity-80" />
              <p className="font-medium text-slate-700 dark:text-slate-300">No Pending Identity Candidates</p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500">All registered entities are resolved or distinct.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingCandidates.map(candidate => {
                const srcNode = nodes.find(n => n.id === candidate.sourceNodeId);
                const tgtNode = nodes.find(n => n.id === candidate.targetNodeId);

                return (
                  <div
                    key={candidate.id}
                    className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3"
                  >
                    {/* Candidate Banner */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${
                            candidate.matchType === 'EXACT_MATCH'
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                              : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                          }`}
                        >
                          {candidate.matchType}
                        </span>
                        <span className="font-mono text-slate-500 dark:text-slate-400 text-[11px]">
                          Similarity: {Math.round(candidate.similarityScore * 100)}%
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(candidate.createdAt).toLocaleTimeString()}
                      </span>
                    </div>

                    {/* Side-by-Side Comparison */}
                    <div className="grid grid-cols-2 gap-3 p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-bold block mb-0.5">
                          Candidate (Duplicate)
                        </span>
                        <span className="text-slate-900 dark:text-slate-100 font-semibold text-xs block truncate">
                          {srcNode?.label || candidate.sourceNodeId}
                        </span>
                        <span className="text-slate-400 font-mono text-[10px] block">
                          Type: {srcNode?.type}
                        </span>
                      </div>

                      <div className="border-l border-slate-100 dark:border-slate-800 pl-3">
                        <span className="text-[10px] text-slate-400 uppercase font-bold block mb-0.5">
                          Canonical (Existing)
                        </span>
                        <span className="text-slate-900 dark:text-slate-100 font-semibold text-xs block truncate">
                          {tgtNode?.label || candidate.targetNodeId}
                        </span>
                        <span className="text-slate-400 font-mono text-[10px] block">
                          Type: {tgtNode?.type}
                        </span>
                      </div>
                    </div>

                    {/* Reason */}
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 italic">
                      &ldquo;{candidate.reason}&rdquo;
                    </p>

                    {/* Actions */}
                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        onClick={() => handleReject(candidate.id)}
                        disabled={loadingId === candidate.id}
                        className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition text-[11px] font-medium"
                      >
                        Keep Separate
                      </button>
                      <button
                        onClick={() => handleMerge(candidate.id)}
                        disabled={loadingId === candidate.id}
                        className="px-3 py-1 rounded-md bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-semibold transition text-[11px] flex items-center gap-1"
                      >
                        <Check className="w-3 h-3" />
                        <span>Confirm & Merge</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 border-t border-slate-100 dark:border-slate-800 flex justify-end bg-slate-50/50 dark:bg-slate-900/50">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium transition text-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

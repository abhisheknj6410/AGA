import React from 'react';
import { PossibilityComparison } from '../../types/graph';
import { Scale, ArrowLeft, Check, X, AlertTriangle, Layers, ShieldCheck } from 'lucide-react';

interface ComparisonViewProps {
  comparison: PossibilityComparison | null;
  onBack: () => void;
}

export const ComparisonView: React.FC<ComparisonViewProps> = ({ comparison, onBack }) => {
  if (!comparison) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-400">
        <Scale className="w-10 h-10 mb-3 text-slate-300 dark:text-slate-600 stroke-1" />
        <p className="text-xs text-slate-600 dark:text-slate-400">No comparison data available.</p>
        <button
          onClick={onBack}
          className="mt-3 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
        >
          Return to Possibilities
        </button>
      </div>
    );
  }

  const { possibilities, structuralDiff } = comparison;

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200">
      {/* Top Header */}
      <div className="h-14 border-b border-slate-200/80 dark:border-slate-800/80 px-6 flex items-center justify-between bg-white dark:bg-slate-900">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
            title="Back to Possibilities"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Scale className="w-4 h-4 text-indigo-600 dark:text-indigo-400" /> Possibility Space Side-by-Side Comparison
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Comparing {possibilities.length} competing structural interpretations
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-5 scrollbar-thin">
        {/* Comparison Matrix Table */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
          <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" /> Analytical Comparison Matrix
            </h3>
            <span className="text-[11px] font-mono text-slate-400">Deterministic metrics · No AI rankings</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400">
                  <th className="py-2.5 px-4 font-semibold w-1/4">Evaluation Metric</th>
                  {possibilities.map(p => (
                    <th key={p.id} className="py-2.5 px-4 font-semibold text-slate-800 dark:text-slate-200">
                      {p.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-mono text-slate-700 dark:text-slate-300">
                {/* Status */}
                <tr>
                  <td className="py-2.5 px-4 font-sans text-slate-600 dark:text-slate-400 font-medium">Status</td>
                  {possibilities.map(p => (
                    <td key={p.id} className="py-2.5 px-4">
                      <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        {p.status}
                      </span>
                    </td>
                  ))}
                </tr>

                {/* Temporal Validity */}
                <tr>
                  <td className="py-2.5 px-4 font-sans text-slate-600 dark:text-slate-400 font-medium">Temporal Validity</td>
                  {possibilities.map(p => (
                    <td key={p.id} className="py-2.5 px-4">
                      {p.temporalValidity === 'VALID' ? (
                        <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-semibold text-[11px]">
                          <Check className="w-3 h-3" /> VALID
                        </span>
                      ) : (
                        <span className="text-rose-600 dark:text-rose-400 flex items-center gap-1 font-semibold text-[11px]">
                          <X className="w-3 h-3" /> INVALID
                        </span>
                      )}
                    </td>
                  ))}
                </tr>

                {/* Evidence Sources */}
                <tr>
                  <td className="py-2.5 px-4 font-sans text-slate-600 dark:text-slate-400 font-medium">Evidence Sources</td>
                  {possibilities.map(p => (
                    <td key={p.id} className="py-2.5 px-4 font-semibold text-emerald-600 dark:text-emerald-400">
                      {p.evidenceSupportCount} items
                    </td>
                  ))}
                </tr>

                {/* Conflicts */}
                <tr>
                  <td className="py-2.5 px-4 font-sans text-slate-600 dark:text-slate-400 font-medium">Evidence Conflicts</td>
                  {possibilities.map(p => (
                    <td key={p.id} className="py-2.5 px-4">
                      <span className={p.conflictingEvidenceCount > 0 ? 'text-rose-600 dark:text-rose-400 font-semibold' : 'text-slate-400'}>
                        {p.conflictingEvidenceCount}
                      </span>
                    </td>
                  ))}
                </tr>

                {/* Independent Paths */}
                <tr>
                  <td className="py-2.5 px-4 font-sans text-slate-600 dark:text-slate-400 font-medium">Corroboration Paths</td>
                  {possibilities.map(p => (
                    <td key={p.id} className="py-2.5 px-4 text-indigo-600 dark:text-indigo-400 font-semibold">
                      {p.independentPathCount ?? 'N/A'}
                    </td>
                  ))}
                </tr>

                {/* Critical Intermediaries */}
                <tr>
                  <td className="py-2.5 px-4 font-sans text-slate-600 dark:text-slate-400 font-medium">Cut Vertices</td>
                  {possibilities.map(p => (
                    <td key={p.id} className="py-2.5 px-4 text-amber-600 dark:text-amber-400">
                      {p.criticalNodeCount ?? 0}
                    </td>
                  ))}
                </tr>

                {/* Required Assumptions */}
                <tr>
                  <td className="py-2.5 px-4 font-sans text-slate-600 dark:text-slate-400 font-medium">Required Assumptions</td>
                  {possibilities.map(p => (
                    <td key={p.id} className="py-2.5 px-4 text-slate-600 dark:text-slate-300">
                      {p.assumptionCount}
                    </td>
                  ))}
                </tr>

                {/* Investigative Route Cost */}
                <tr>
                  <td className="py-2.5 px-4 font-sans text-slate-600 dark:text-slate-400 font-medium">Dijkstra Cost</td>
                  {possibilities.map(p => (
                    <td key={p.id} className="py-2.5 px-4 text-slate-800 dark:text-slate-200 font-semibold">
                      {p.pathCost !== undefined ? p.pathCost.toFixed(1) : 'N/A'}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Structural Diff Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Common Ground */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4.5 shadow-xs">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5 mb-2.5">
              <ShieldCheck className="w-4 h-4" /> Common Invariants (Shared Across Selected)
            </h4>
            <div className="space-y-2.5 text-xs">
              <div>
                <span className="text-slate-500 block font-medium mb-1 text-[11px]">Common Evidence References ({structuralDiff.commonEvidence.length}):</span>
                {structuralDiff.commonEvidence.length > 0 ? (
                  <div className="flex flex-wrap gap-1 font-mono text-[11px]">
                    {structuralDiff.commonEvidence.map(ev => (
                      <span key={ev} className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                        {ev}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-400 italic text-[11px]">No common evidence items shared across all branches.</p>
                )}
              </div>

              <div>
                <span className="text-slate-500 block font-medium mb-0.5 text-[11px]">Common Directed Edges ({structuralDiff.commonEdges.length}):</span>
                <p className="text-slate-600 dark:text-slate-300 font-mono text-[11px]">
                  {structuralDiff.commonEdges.length} relationship links are universally present in all evaluated models.
                </p>
              </div>
            </div>
          </div>

          {/* Distinguishing Elements */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4.5 shadow-xs">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-indigo-700 dark:text-indigo-400 flex items-center gap-1.5 mb-2.5">
              <AlertTriangle className="w-4 h-4" /> Distinguishing Differences
            </h4>
            <div className="space-y-2 text-xs">
              {possibilities.map(p => {
                const distEdges = structuralDiff.distinguishingEdges[p.id] || [];
                const distEvidence = structuralDiff.distinguishingEvidence[p.id] || [];

                return (
                  <div key={p.id} className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                    <span className="font-semibold text-slate-800 dark:text-slate-200 block mb-0.5">{p.name}:</span>
                    <p className="text-slate-500 dark:text-slate-400 text-[11px] font-mono">
                      • {distEdges.length} unique edges specific to this branch
                      <br />
                      • {distEvidence.length} unique supporting evidence sources
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

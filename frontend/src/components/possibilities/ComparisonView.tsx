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
      <div className="flex-1 flex flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-950 text-zinc-400 py-20">
        <Scale className="w-12 h-12 mb-3 text-zinc-300 dark:text-zinc-700 stroke-1" />
        <p className="text-sm font-semibold text-zinc-600 dark:text-zinc-400">No comparison data available.</p>
        <button
          onClick={onBack}
          className="mt-4 px-4 py-2 rounded-xl text-xs font-semibold bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 transition-colors cursor-pointer"
        >
          Return to Possibilities
        </button>
      </div>
    );
  }

  const { possibilities, structuralDiff } = comparison;

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-zinc-50 dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200">
      {/* Top Header */}
      <div className="h-16 border-b border-zinc-200 dark:border-zinc-800 px-6 flex items-center justify-between bg-white dark:bg-zinc-950">
        <div className="flex items-center gap-3.5">
          <button
            onClick={onBack}
            className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 transition-colors cursor-pointer"
            title="Back to Possibility Space"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Scale className="w-5 h-5 text-teal-600 dark:text-teal-400" />
              <span>Possibility Space Side-by-Side Comparison</span>
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Evaluating {possibilities.length} competing structural interpretations using deterministic graph metrics
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin max-w-6xl mx-auto w-full">
        {/* Comparison Matrix Table */}
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-xs">
          <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-900/50">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
              <Layers className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              <span>Analytical Comparison Matrix</span>
            </h3>
            <span className="text-xs font-mono text-zinc-400 font-medium">Deterministic graph metrics · Zero arbitrary rankings</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-800/40 text-zinc-500 dark:text-zinc-400">
                  <th className="py-3.5 px-6 font-bold text-xs uppercase tracking-wider w-1/4">Evaluation Metric</th>
                  {possibilities.map(p => (
                    <th key={p.id} className="py-3.5 px-6 font-bold text-sm text-zinc-900 dark:text-zinc-100">
                      {p.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/80 font-mono text-zinc-700 dark:text-zinc-300 text-xs">
                {/* Status */}
                <tr>
                  <td className="py-3 px-6 font-sans text-zinc-600 dark:text-zinc-400 font-semibold text-xs">Epistemic Status</td>
                  {possibilities.map(p => (
                    <td key={p.id} className="py-3 px-6">
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                        p.status === 'VALID'
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                          : p.status === 'CONDITIONAL'
                          ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                          : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                      }`}>
                        {p.status}
                      </span>
                    </td>
                  ))}
                </tr>

                {/* Temporal Validity */}
                <tr>
                  <td className="py-3 px-6 font-sans text-zinc-600 dark:text-zinc-400 font-semibold text-xs">Temporal Causality</td>
                  {possibilities.map(p => (
                    <td key={p.id} className="py-3 px-6">
                      {p.temporalValidity === 'VALID' ? (
                        <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 font-bold text-xs">
                          <Check className="w-3.5 h-3.5" /> VALID
                        </span>
                      ) : (
                        <span className="text-rose-600 dark:text-rose-400 flex items-center gap-1.5 font-bold text-xs">
                          <X className="w-3.5 h-3.5" /> INVALID
                        </span>
                      )}
                    </td>
                  ))}
                </tr>

                {/* Evidence Sources */}
                <tr>
                  <td className="py-3 px-6 font-sans text-zinc-600 dark:text-zinc-400 font-semibold text-xs">Supporting Evidence</td>
                  {possibilities.map(p => (
                    <td key={p.id} className="py-3 px-6 font-bold text-emerald-600 dark:text-emerald-400 text-xs">
                      {p.evidenceSupportCount} items
                    </td>
                  ))}
                </tr>

                {/* Conflicts */}
                <tr>
                  <td className="py-3 px-6 font-sans text-zinc-600 dark:text-zinc-400 font-semibold text-xs">Evidence Contradictions</td>
                  {possibilities.map(p => (
                    <td key={p.id} className="py-3 px-6">
                      <span className={`font-bold text-xs ${p.conflictingEvidenceCount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-zinc-400'}`}>
                        {p.conflictingEvidenceCount} items
                      </span>
                    </td>
                  ))}
                </tr>

                {/* Independent Paths */}
                <tr>
                  <td className="py-3 px-6 font-sans text-zinc-600 dark:text-zinc-400 font-semibold text-xs">Corroboration Paths</td>
                  {possibilities.map(p => (
                    <td key={p.id} className="py-3 px-6 text-teal-600 dark:text-teal-400 font-bold text-xs">
                      {p.independentPathCount ?? 'N/A'}
                    </td>
                  ))}
                </tr>

                {/* Critical Intermediaries */}
                <tr>
                  <td className="py-3 px-6 font-sans text-zinc-600 dark:text-zinc-400 font-semibold text-xs">Articulation Bottlenecks</td>
                  {possibilities.map(p => (
                    <td key={p.id} className="py-3 px-6 text-amber-600 dark:text-amber-400 font-bold text-xs">
                      {p.criticalNodeCount ?? 0}
                    </td>
                  ))}
                </tr>

                {/* Required Assumptions */}
                <tr>
                  <td className="py-3 px-6 font-sans text-zinc-600 dark:text-zinc-400 font-semibold text-xs">Required Hypotheses</td>
                  {possibilities.map(p => (
                    <td key={p.id} className="py-3 px-6 text-zinc-600 dark:text-zinc-300 font-medium text-xs">
                      {p.assumptionCount}
                    </td>
                  ))}
                </tr>

                {/* Investigative Route Cost */}
                <tr>
                  <td className="py-3 px-6 font-sans text-zinc-600 dark:text-zinc-400 font-semibold text-xs">Dijkstra Traversal Cost</td>
                  {possibilities.map(p => (
                    <td key={p.id} className="py-3 px-6 text-zinc-900 dark:text-zinc-100 font-bold text-xs">
                      {p.pathCost !== undefined ? p.pathCost.toFixed(1) : 'N/A'}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Structural Diff Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Common Ground */}
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-xs">
            <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-2 mb-3">
              <ShieldCheck className="w-4 h-4" />
              <span>Common Invariants (Universal Across Selected)</span>
            </h4>
            <div className="space-y-3 text-xs">
              <div>
                <span className="text-zinc-500 dark:text-zinc-400 block font-semibold mb-1.5 text-xs">
                  Shared Evidence References ({structuralDiff.commonEvidence.length}):
                </span>
                {structuralDiff.commonEvidence.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 font-mono text-xs">
                    {structuralDiff.commonEvidence.map(ev => (
                      <span key={ev} className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        {ev}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-zinc-400 italic text-xs">No common evidence items shared across all selected models.</p>
                )}
              </div>

              <div>
                <span className="text-zinc-500 dark:text-zinc-400 block font-semibold mb-1 text-xs">
                  Universally Present Edges ({structuralDiff.commonEdges.length}):
                </span>
                <p className="text-zinc-600 dark:text-zinc-300 font-mono text-xs">
                  {structuralDiff.commonEdges.length} relationship links are present in all evaluated models.
                </p>
              </div>
            </div>
          </div>

          {/* Distinguishing Elements */}
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-xs">
            <h4 className="text-xs font-bold uppercase tracking-wider text-teal-700 dark:text-teal-400 flex items-center gap-2 mb-3">
              <AlertTriangle className="w-4 h-4" />
              <span>Distinguishing Structural Diffs</span>
            </h4>
            <div className="space-y-2.5 text-xs">
              {possibilities.map(p => {
                const distEdges = structuralDiff.distinguishingEdges[p.id] || [];
                const distEvidence = structuralDiff.distinguishingEvidence[p.id] || [];

                return (
                  <div key={p.id} className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800">
                    <span className="font-bold text-zinc-900 dark:text-zinc-100 block mb-1 text-xs">{p.name}:</span>
                    <p className="text-zinc-500 dark:text-zinc-400 text-xs font-mono space-y-0.5">
                      <span>• {distEdges.length} unique directed links specific to this branch</span>
                      <br />
                      <span>• {distEvidence.length} unique supporting evidence references</span>
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

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
      <div className="flex-1 flex flex-col items-center justify-center bg-slate-950 text-slate-500">
        <Scale className="w-12 h-12 mb-3 text-slate-600 stroke-1" />
        <p className="text-sm">No comparison data available.</p>
        <button
          onClick={onBack}
          className="mt-4 px-4 py-2 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
        >
          Return to Possibilities
        </button>
      </div>
    );
  }

  const { possibilities, structuralDiff } = comparison;

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-950 text-slate-200">
      {/* Top Header */}
      <div className="h-14 border-b border-slate-800/80 px-6 flex items-center justify-between bg-slate-900/60 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors border border-slate-700"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h2 className="text-base font-semibold text-white tracking-wide flex items-center gap-2">
              <Scale className="w-4 h-4 text-blue-400" /> Possibility Space Side-by-Side Comparison
            </h2>
            <p className="text-xs text-slate-400">
              Comparing {possibilities.length} competing structural interpretations
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Comparison Matrix Table */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-lg">
          <div className="px-5 py-3 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-400" /> Analytical Comparison Matrix
            </h3>
            <span className="text-[11px] font-mono text-slate-500">Deterministic metrics only — No AI rankings</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400">
                  <th className="py-3 px-4 font-semibold w-1/4">Evaluation Metric</th>
                  {possibilities.map(p => (
                    <th key={p.id} className="py-3 px-4 font-semibold text-slate-200">
                      {p.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {/* Status */}
                <tr>
                  <td className="py-3 px-4 font-sans text-slate-300">Possibility Status</td>
                  {possibilities.map(p => (
                    <td key={p.id} className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-800 border border-slate-700 text-slate-200">
                        {p.status}
                      </span>
                    </td>
                  ))}
                </tr>

                {/* Temporal Validity */}
                <tr>
                  <td className="py-3 px-4 font-sans text-slate-300">Temporal Validity</td>
                  {possibilities.map(p => (
                    <td key={p.id} className="py-3 px-4">
                      {p.temporalValidity === 'VALID' ? (
                        <span className="text-emerald-400 flex items-center gap-1 font-bold">
                          <Check className="w-3.5 h-3.5" /> VALID
                        </span>
                      ) : (
                        <span className="text-rose-400 flex items-center gap-1 font-bold">
                          <X className="w-3.5 h-3.5" /> INVALID
                        </span>
                      )}
                    </td>
                  ))}
                </tr>

                {/* Evidence Sources */}
                <tr>
                  <td className="py-3 px-4 font-sans text-slate-300">Evidence Sources</td>
                  {possibilities.map(p => (
                    <td key={p.id} className="py-3 px-4 font-bold text-emerald-400">
                      {p.evidenceSupportCount} items
                    </td>
                  ))}
                </tr>

                {/* Conflicts */}
                <tr>
                  <td className="py-3 px-4 font-sans text-slate-300">Evidence Conflicts</td>
                  {possibilities.map(p => (
                    <td key={p.id} className="py-3 px-4">
                      <span className={p.conflictingEvidenceCount > 0 ? 'text-rose-400 font-bold' : 'text-slate-400'}>
                        {p.conflictingEvidenceCount}
                      </span>
                    </td>
                  ))}
                </tr>

                {/* Independent Paths */}
                <tr>
                  <td className="py-3 px-4 font-sans text-slate-300">Independent Corroboration Paths</td>
                  {possibilities.map(p => (
                    <td key={p.id} className="py-3 px-4 text-cyan-400 font-bold">
                      {p.independentPathCount ?? 'N/A'}
                    </td>
                  ))}
                </tr>

                {/* Critical Intermediaries */}
                <tr>
                  <td className="py-3 px-4 font-sans text-slate-300">Critical Intermediaries (Cut Vertices)</td>
                  {possibilities.map(p => (
                    <td key={p.id} className="py-3 px-4 text-amber-300">
                      {p.criticalNodeCount ?? 0}
                    </td>
                  ))}
                </tr>

                {/* Required Assumptions */}
                <tr>
                  <td className="py-3 px-4 font-sans text-slate-300">Required Assumptions</td>
                  {possibilities.map(p => (
                    <td key={p.id} className="py-3 px-4 text-indigo-300">
                      {p.assumptionCount}
                    </td>
                  ))}
                </tr>

                {/* Investigative Route Cost */}
                <tr>
                  <td className="py-3 px-4 font-sans text-slate-300">Dijkstra Investigative Cost</td>
                  {possibilities.map(p => (
                    <td key={p.id} className="py-3 px-4 text-slate-300 font-bold">
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
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-emerald-400 flex items-center gap-2 mb-3">
              <ShieldCheck className="w-4 h-4" /> Common Invariants (Shared Across All Selected)
            </h4>
            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-400 block font-medium mb-1">Common Evidence References ({structuralDiff.commonEvidence.length}):</span>
                {structuralDiff.commonEvidence.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 font-mono text-[11px]">
                    {structuralDiff.commonEvidence.map(ev => (
                      <span key={ev} className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {ev}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500 italic">No common evidence items shared across all branches.</p>
                )}
              </div>

              <div>
                <span className="text-slate-400 block font-medium mb-1">Common Directed Edges ({structuralDiff.commonEdges.length}):</span>
                <p className="text-slate-300 font-mono text-[11px]">
                  {structuralDiff.commonEdges.length} relationship links are universally present in all evaluated models.
                </p>
              </div>
            </div>
          </div>

          {/* Distinguishing Elements */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-indigo-400 flex items-center gap-2 mb-3">
              <AlertTriangle className="w-4 h-4" /> Distinguishing Differences
            </h4>
            <div className="space-y-3 text-xs">
              {possibilities.map(p => {
                const distEdges = structuralDiff.distinguishingEdges[p.id] || [];
                const distEvidence = structuralDiff.distinguishingEvidence[p.id] || [];

                return (
                  <div key={p.id} className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
                    <span className="font-semibold text-slate-200 block mb-1">{p.name}:</span>
                    <p className="text-slate-400 text-[11px] font-mono">
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

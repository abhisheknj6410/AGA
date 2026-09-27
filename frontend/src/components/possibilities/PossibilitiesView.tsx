import React, { useState } from 'react';
import {
  Possibility,
  PossibilityStatus,
  GraphPayload
} from '../../types/graph';
import {
  Sparkles,
  GitBranch,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  ArrowRight,
  Filter,
  Layers,
  Scale
} from 'lucide-react';

interface PossibilitiesViewProps {
  possibilities: Possibility[];
  graph: GraphPayload | null;
  onSelectPossibilityForGraph: (p: Possibility) => void;
  onCompare: (selectedIds: string[]) => void;
  onGenerate: () => void;
  isGenerating: boolean;
}

export const PossibilitiesView: React.FC<PossibilitiesViewProps> = ({
  possibilities,
  onSelectPossibilityForGraph,
  onCompare,
  onGenerate,
  isGenerating
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const toggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : prev.length < 5 ? [...prev, id] : prev
    );
  };

  const filtered = possibilities.filter(p => {
    if (statusFilter !== 'ALL' && p.status !== statusFilter) return false;
    return true;
  });

  const getStatusBadge = (status: PossibilityStatus) => {
    switch (status) {
      case 'VALID':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            <CheckCircle2 className="w-3.5 h-3.5" /> VALID
          </span>
        );
      case 'CONDITIONAL':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            <AlertTriangle className="w-3.5 h-3.5" /> CONDITIONAL
          </span>
        );
      case 'CONFLICTING':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
            <XCircle className="w-3.5 h-3.5" /> CONFLICTING
          </span>
        );
      case 'INVALID':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-400 border border-rose-300 dark:border-rose-900">
            <XCircle className="w-3.5 h-3.5" /> INVALID
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">
            <HelpCircle className="w-3.5 h-3.5" /> {status}
          </span>
        );
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-zinc-50 dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200">
      {/* Top Action Bar */}
      <div className="h-16 border-b border-zinc-200 dark:border-zinc-800 px-6 flex items-center justify-between bg-white dark:bg-zinc-950">
        <div className="flex items-center gap-3.5">
          <div className="p-2.5 rounded-xl bg-teal-50 dark:bg-teal-950/50 border border-teal-200 dark:border-teal-800 text-teal-600 dark:text-teal-400">
            <GitBranch className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">Investigation Possibility Space</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {possibilities.length} mathematically bounded graph possibilities derived from evidence constraints
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Status Filter */}
          <div className="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-zinc-600 dark:text-zinc-300">
            <Filter className="w-3.5 h-3.5 text-zinc-400" />
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="bg-transparent border-none text-zinc-800 dark:text-zinc-200 text-xs font-semibold focus:outline-hidden cursor-pointer"
            >
              <option value="ALL">All ({possibilities.length})</option>
              <option value="VALID">Valid</option>
              <option value="CONDITIONAL">Conditional</option>
              <option value="CONFLICTING">Conflicting</option>
              <option value="INVALID">Invalid</option>
            </select>
          </div>

          {/* Compare Button */}
          <button
            onClick={() => onCompare(selectedIds)}
            disabled={selectedIds.length < 2}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              selectedIds.length >= 2
                ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-xs'
                : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-400 dark:text-zinc-600 cursor-not-allowed border border-zinc-200 dark:border-zinc-800'
            }`}
          >
            <Scale className="w-3.5 h-3.5" /> Compare ({selectedIds.length}/5)
          </button>

          {/* Recalculate / Generate Button */}
          <button
            onClick={onGenerate}
            disabled={isGenerating}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white transition-all shadow-sm disabled:opacity-50 cursor-pointer"
          >
            <Sparkles className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
            <span>{isGenerating ? 'Computing...' : 'Recalculate Space'}</span>
          </button>
        </div>
      </div>

      {/* Possibility Cards Grid */}
      <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
        {filtered.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-zinc-400 py-16">
            <Layers className="w-12 h-12 mb-3 text-zinc-300 dark:text-zinc-700 stroke-1" />
            <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">No possibilities match current filter.</p>
            <button
              onClick={onGenerate}
              className="mt-4 px-4 py-2 rounded-xl text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white transition-colors cursor-pointer"
            >
              Generate Possibilities Now
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map(p => {
              const isSelected = selectedIds.includes(p.id);
              const results = p.algorithmResults || {};

              return (
                <div
                  key={p.id}
                  className={`flex flex-col justify-between rounded-2xl border p-5 transition-all duration-150 ${
                    isSelected
                      ? 'bg-white dark:bg-zinc-900 border-teal-500 ring-2 ring-teal-500/20 shadow-md'
                      : 'bg-white dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700 border-zinc-200 dark:border-zinc-800 shadow-xs'
                  }`}
                >
                  <div>
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(p.id)}
                          className="w-4 h-4 rounded border-zinc-300 dark:border-zinc-700 text-teal-600 focus:ring-teal-500 accent-teal-600 cursor-pointer"
                        />
                        <span className="text-xs font-mono uppercase tracking-wider text-zinc-400 dark:text-zinc-500 font-semibold">
                          {p.generationMethod.replace(/_/g, ' ')}
                        </span>
                      </div>
                      {getStatusBadge(p.status)}
                    </div>

                    <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mb-1.5 leading-snug line-clamp-1">
                      {p.name}
                    </h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4 line-clamp-2 leading-relaxed">
                      {p.description}
                    </p>

                    {/* Transparent Fact Badges */}
                    <div className="grid grid-cols-2 gap-2 text-xs mb-4 bg-zinc-50 dark:bg-zinc-900/60 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 font-mono">
                      <div>
                        <span className="text-zinc-400 block text-xs">Evidence Support:</span>
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">{p.supportingEvidence.length} items</span>
                      </div>
                      <div>
                        <span className="text-zinc-400 block text-xs">Conflicts:</span>
                        <span className={`font-semibold ${p.conflictingEvidence.length > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-zinc-500'}`}>
                          {p.conflictingEvidence.length} items
                        </span>
                      </div>
                      <div>
                        <span className="text-zinc-400 block text-xs">Assumptions:</span>
                        <span className="font-semibold text-amber-600 dark:text-amber-400">{p.assumptions.length}</span>
                      </div>
                      <div>
                        <span className="text-zinc-400 block text-xs">Corroboration:</span>
                        <span className="font-semibold text-teal-600 dark:text-teal-400">
                          {results.independentCorroboration?.independentCorroborationCount ?? 'N/A'}
                        </span>
                      </div>
                    </div>

                    {/* Assumptions Preview */}
                    {p.assumptions.length > 0 && (
                      <div className="mb-4">
                        <span className="text-xs uppercase font-bold tracking-wider text-zinc-400 dark:text-zinc-500 mb-1 block">
                          Key Assumption:
                        </span>
                        <p className="text-xs text-zinc-600 dark:text-zinc-300 italic line-clamp-1 bg-zinc-50 dark:bg-zinc-900 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800">
                          "{p.assumptions[0]}"
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                    <span className="text-xs text-zinc-400 font-mono">
                      sig: {p.canonicalSignature.slice(0, 8)}
                    </span>
                    <button
                      onClick={() => onSelectPossibilityForGraph(p)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 transition cursor-pointer"
                    >
                      <span>Overlay in Graph</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

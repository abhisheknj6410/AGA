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
  graph,
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
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            <CheckCircle2 className="w-3 h-3" /> VALID
          </span>
        );
      case 'CONDITIONAL':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            <AlertTriangle className="w-3 h-3" /> CONDITIONAL
          </span>
        );
      case 'CONFLICTING':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
            <XCircle className="w-3 h-3" /> CONFLICTING
          </span>
        );
      case 'INVALID':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-400 border border-rose-300 dark:border-rose-900">
            <XCircle className="w-3 h-3" /> INVALID
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
            <HelpCircle className="w-3 h-3" /> {status}
          </span>
        );
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200">
      {/* Top Action Bar */}
      <div className="h-14 border-b border-slate-200/80 dark:border-slate-800/80 px-6 flex items-center justify-between bg-white dark:bg-slate-900">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400">
            <GitBranch className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Investigation Possibility Space</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {possibilities.length} bounded graph possibilities derived from evidence constraints & structural alternatives
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Status Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-600 dark:text-slate-300">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="bg-transparent border-none text-slate-700 dark:text-slate-200 text-xs focus:outline-hidden cursor-pointer"
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
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              selectedIds.length >= 2
                ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed'
            }`}
          >
            <Scale className="w-3.5 h-3.5" /> Compare ({selectedIds.length}/5)
          </button>

          {/* Recalculate / Generate Button */}
          <button
            onClick={onGenerate}
            disabled={isGenerating}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 transition-all shadow-xs disabled:opacity-50"
          >
            <Sparkles className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
            {isGenerating ? 'Computing...' : 'Recalculate Possibilities'}
          </button>
        </div>
      </div>

      {/* Possibility Cards Grid */}
      <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
        {filtered.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 py-12">
            <Layers className="w-10 h-10 mb-3 text-slate-300 dark:text-slate-600 stroke-1" />
            <p className="text-xs font-medium text-slate-600 dark:text-slate-400">No possibilities matching current filter.</p>
            <button
              onClick={onGenerate}
              className="mt-3 px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
            >
              Generate Possibilities Now
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(p => {
              const isSelected = selectedIds.includes(p.id);
              const results = p.algorithmResults || {};

              return (
                <div
                  key={p.id}
                  className={`flex flex-col justify-between rounded-xl border p-4.5 transition-all duration-150 ${
                    isSelected
                      ? 'bg-white dark:bg-slate-900 border-indigo-500 ring-1 ring-indigo-500/20 shadow-md'
                      : 'bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 border-slate-200 dark:border-slate-800 shadow-xs'
                  }`}
                >
                  <div>
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3 mb-2.5">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(p.id)}
                          className="w-3.5 h-3.5 rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                        <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 dark:text-slate-500">
                          {p.generationMethod.replace(/_/g, ' ')}
                        </span>
                      </div>
                      {getStatusBadge(p.status)}
                    </div>

                    <h3 className="text-xs font-semibold text-slate-900 dark:text-slate-100 mb-1 leading-snug line-clamp-1">
                      {p.name}
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-3 line-clamp-2 leading-relaxed">
                      {p.description}
                    </p>

                    {/* Transparent Fact Badges */}
                    <div className="grid grid-cols-2 gap-2 text-[11px] mb-3 bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-lg border border-slate-200/80 dark:border-slate-800 font-mono">
                      <div>
                        <span className="text-slate-400 block text-[10px]">Evidence Support:</span>
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">{p.supportingEvidence.length} items</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Conflicts:</span>
                        <span className={`font-semibold ${p.conflictingEvidence.length > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500'}`}>
                          {p.conflictingEvidence.length} items
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Assumptions:</span>
                        <span className="font-semibold text-amber-600 dark:text-amber-400">{p.assumptions.length}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Corroboration:</span>
                        <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                          {results.independentCorroboration?.independentCorroborationCount ?? 'N/A'}
                        </span>
                      </div>
                    </div>

                    {/* Assumptions Preview */}
                    {p.assumptions.length > 0 && (
                      <div className="mb-3">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500 mb-0.5 block">
                          Key Assumption:
                        </span>
                        <p className="text-[11px] text-slate-600 dark:text-slate-300 italic line-clamp-1 bg-slate-50 dark:bg-slate-800/40 px-2 py-1 rounded border border-slate-100 dark:border-slate-800">
                          "{p.assumptions[0]}"
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 font-mono">
                      sig: {p.canonicalSignature.slice(0, 8)}
                    </span>
                    <button
                      onClick={() => onSelectPossibilityForGraph(p)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
                    >
                      Inspect in Graph <ArrowRight className="w-3 h-3" />
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

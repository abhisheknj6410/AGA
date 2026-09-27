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
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3.5 h-3.5" /> VALID
          </span>
        );
      case 'CONDITIONAL':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <AlertTriangle className="w-3.5 h-3.5" /> CONDITIONAL
          </span>
        );
      case 'CONFLICTING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30">
            <XCircle className="w-3.5 h-3.5" /> CONFLICTING
          </span>
        );
      case 'INVALID':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-950/60 text-red-500 border border-red-800">
            <XCircle className="w-3.5 h-3.5" /> INVALID
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700">
            <HelpCircle className="w-3.5 h-3.5" /> {status}
          </span>
        );
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-950 text-slate-200">
      {/* Top Action Bar */}
      <div className="h-14 border-b border-slate-800/80 px-6 flex items-center justify-between bg-slate-900/60 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
            <GitBranch className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white tracking-wide">Investigation Possibility Space</h2>
            <p className="text-xs text-slate-400">
              {possibilities.length} bounded graph possibilities derived from evidence constraints & structural alternatives
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Status Filter */}
          <div className="flex items-center gap-1.5 bg-slate-800/80 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-300">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="bg-transparent border-none text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Statuses ({possibilities.length})</option>
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
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              selectedIds.length >= 2
                ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20'
                : 'bg-slate-800 text-slate-500 border border-slate-700/50 cursor-not-allowed'
            }`}
          >
            <Scale className="w-4 h-4" /> Compare Selected ({selectedIds.length}/5)
          </button>

          {/* Recalculate / Generate Button */}
          <button
            onClick={onGenerate}
            disabled={isGenerating}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-lg shadow-indigo-500/25 transition-all disabled:opacity-50"
          >
            <Sparkles className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
            {isGenerating ? 'Computing Possibilities...' : 'Recalculate Possibility Space'}
          </button>
        </div>
      </div>

      {/* Possibility Cards Grid */}
      <div className="flex-1 overflow-y-auto p-6">
        {filtered.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 py-12">
            <Layers className="w-12 h-12 mb-3 text-slate-600 stroke-1" />
            <p className="text-sm font-medium">No possibilities matching current filter.</p>
            <button
              onClick={onGenerate}
              className="mt-4 px-4 py-2 rounded-lg text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
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
                  className={`flex flex-col justify-between rounded-xl border p-5 transition-all duration-200 ${
                    isSelected
                      ? 'bg-slate-900 border-indigo-500/80 shadow-lg shadow-indigo-500/10'
                      : 'bg-slate-900/60 hover:bg-slate-900/90 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div>
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(p.id)}
                          className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-0 cursor-pointer"
                        />
                        <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
                          {p.generationMethod.replace(/_/g, ' ')}
                        </span>
                      </div>
                      {getStatusBadge(p.status)}
                    </div>

                    <h3 className="text-sm font-semibold text-slate-100 mb-1.5 leading-snug line-clamp-1">
                      {p.name}
                    </h3>
                    <p className="text-xs text-slate-400 mb-4 line-clamp-2 leading-relaxed">
                      {p.description}
                    </p>

                    {/* Transparent Fact Badges */}
                    <div className="grid grid-cols-2 gap-2 text-[11px] mb-4 bg-slate-950/60 p-3 rounded-lg border border-slate-800/80 font-mono">
                      <div>
                        <span className="text-slate-500 block">Evidence Support:</span>
                        <span className="font-semibold text-emerald-400">{p.supportingEvidence.length} items</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Conflicts:</span>
                        <span className={`font-semibold ${p.conflictingEvidence.length > 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                          {p.conflictingEvidence.length} items
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Assumptions:</span>
                        <span className="font-semibold text-amber-300">{p.assumptions.length}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Corroborating Paths:</span>
                        <span className="font-semibold text-cyan-400">
                          {results.independentCorroboration?.independentCorroborationCount ?? 'N/A'}
                        </span>
                      </div>
                    </div>

                    {/* Assumptions Preview */}
                    {p.assumptions.length > 0 && (
                      <div className="mb-3">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-1 block">
                          Key Assumption:
                        </span>
                        <p className="text-xs text-slate-300 italic line-clamp-1 bg-slate-800/40 px-2 py-1 rounded">
                          "{p.assumptions[0]}"
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="pt-3 border-t border-slate-800/70 flex items-center justify-between">
                    <span className="text-[10px] text-slate-500 font-mono">
                      sig: {p.canonicalSignature.slice(0, 8)}...
                    </span>
                    <button
                      onClick={() => onSelectPossibilityForGraph(p)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white transition-colors border border-slate-700"
                    >
                      Inspect in Graph <ArrowRight className="w-3.5 h-3.5" />
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

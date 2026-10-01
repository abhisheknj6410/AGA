import React, { useState, useEffect } from 'react';
import {
  Possibility,
  PossibilityStatus,
  GraphPayload,
  AlgorithmImpactReport
} from '../../types/graph';
import { fetchAlgorithmImpact } from '../../api/client';
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
  Scale,
  ShieldCheck,
  Clock,
  ChevronDown,
  ChevronUp,
  Activity,
  Network,
  Zap,
  Info
} from 'lucide-react';

interface PossibilitiesViewProps {
  caseId?: string;
  possibilities: Possibility[];
  graph: GraphPayload | null;
  onSelectPossibilityForGraph: (p: Possibility) => void;
  onCompare: (selectedIds: string[]) => void;
  onGenerate: () => void;
  isGenerating: boolean;
}

export const PossibilitiesView: React.FC<PossibilitiesViewProps> = ({
  caseId,
  possibilities,
  onSelectPossibilityForGraph,
  onCompare,
  onGenerate,
  isGenerating
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [expandedTraceId, setExpandedTraceId] = useState<string | null>(null);
  const [showEliminatedDrawer, setShowEliminatedDrawer] = useState<boolean>(false);
  const [impactReport, setImpactReport] = useState<AlgorithmImpactReport | null>(null);

  useEffect(() => {
    if (caseId) {
      fetchAlgorithmImpact(caseId)
        .then(data => setImpactReport(data))
        .catch(() => setImpactReport(null));
    }
  }, [caseId, possibilities.length]);

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
              {possibilities.length} mathematically bounded possibilities dynamically filtered by graph algorithms
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

      {/* Causal Algorithm Impact Pipeline Banner */}
      {impactReport && (
        <div className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 px-6 py-3.5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5" /> Algorithm Causal Pipeline
              </span>
              <span className="text-xs text-zinc-400 dark:text-zinc-500">•</span>
              <span className="text-xs text-zinc-600 dark:text-zinc-400 font-mono">
                {impactReport.inputCandidatesCount} raw candidates → {impactReport.survivingPossibilitiesCount} surviving possibilities
              </span>
            </div>

            {/* Stages Flow Badges */}
            <div className="flex items-center gap-2 text-xs font-mono">
              <div className="px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300">
                1. K-Paths: <span className="font-bold">{impactReport.stages[0]?.candidatesAfter ?? impactReport.inputCandidatesCount}</span>
              </div>
              <span className="text-zinc-400">→</span>
              <div className="px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300">
                2. Chronology: <span className="font-bold text-rose-600 dark:text-rose-400">-{impactReport.stages[1]?.candidatesEliminated ?? 0}</span>
              </div>
              <span className="text-zinc-400">→</span>
              <div className="px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300">
                3. Provenance: <span className="font-bold text-rose-600 dark:text-rose-400">-{impactReport.stages[2]?.candidatesEliminated ?? 0}</span>
              </div>
              <span className="text-zinc-400">→</span>
              <div className="px-2.5 py-1 rounded-lg bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 text-teal-800 dark:text-teal-200 font-bold">
                4. Valid Space: {impactReport.survivingPossibilitiesCount}
              </div>

              {impactReport.eliminatedCandidates.length > 0 && (
                <button
                  onClick={() => setShowEliminatedDrawer(!showEliminatedDrawer)}
                  className="ml-2 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 hover:bg-rose-100 transition cursor-pointer text-xs font-sans font-semibold"
                >
                  <span>{impactReport.eliminatedCandidates.length} Pruned</span>
                  {showEliminatedDrawer ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
              )}
            </div>
          </div>

          {/* Pruned Candidates Rejection Details Drawer */}
          {showEliminatedDrawer && impactReport.eliminatedCandidates.length > 0 && (
            <div className="mt-3 pt-3 border-t border-zinc-200 dark:border-zinc-800 grid grid-cols-1 md:grid-cols-2 gap-2 text-xs animate-in fade-in duration-150">
              {impactReport.eliminatedCandidates.map((elim, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 flex items-start gap-2.5"
                >
                  <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-bold text-zinc-900 dark:text-zinc-100 font-mono text-xs">{elim.candidateSummary}</span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono uppercase bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300">
                        {elim.eliminatedBy}
                      </span>
                    </div>
                    <p className="text-zinc-600 dark:text-zinc-400 text-xs leading-relaxed">{elim.reason}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

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
              const isTraceExpanded = expandedTraceId === p.id;

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
                    <div className="grid grid-cols-2 gap-2 text-xs mb-3 bg-zinc-50 dark:bg-zinc-900/60 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 font-mono">
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
                        <span className="text-zinc-400 block text-xs">Independent Paths:</span>
                        <span className="font-semibold text-teal-600 dark:text-teal-400">
                          {p.independentSupportPaths ?? results.independentCorroboration?.independentCorroborationCount ?? 1}
                        </span>
                      </div>
                    </div>

                    {/* Consequential Graph Algorithm Properties */}
                    {(p.criticalDependency && p.criticalDependency.length > 0 || (p.criticalCut && p.criticalCut.length > 0)) && (
                      <div className="mb-3 p-2.5 rounded-xl bg-teal-50/50 dark:bg-teal-950/20 border border-teal-200/60 dark:border-teal-800/40 text-xs">
                        {p.criticalDependency && p.criticalDependency.length > 0 && (
                          <div className="flex items-center gap-1.5 mb-1 text-teal-900 dark:text-teal-200">
                            <Zap className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                            <span className="font-bold">Unavoidable Chokepoint:</span>
                            <span className="font-mono">{p.criticalDependency.join(', ')}</span>
                          </div>
                        )}
                        {p.criticalCut && p.criticalCut.length > 0 && (
                          <div className="flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300 font-mono text-[11px]">
                            <Network className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                            <span>Min-Cut: {p.criticalCut.length} edges</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Assumptions Preview */}
                    {p.assumptions.length > 0 && (
                      <div className="mb-3">
                        <span className="text-xs uppercase font-bold tracking-wider text-zinc-400 dark:text-zinc-500 mb-1 block">
                          Key Assumption:
                        </span>
                        <p className="text-xs text-zinc-600 dark:text-zinc-300 italic line-clamp-1 bg-zinc-50 dark:bg-zinc-900 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800">
                          "{p.assumptions[0]}"
                        </p>
                      </div>
                    )}

                    {/* Generation Trace Accordion */}
                    {p.generationTrace && p.generationTrace.length > 0 && (
                      <div className="mb-3 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
                        <button
                          onClick={() => setExpandedTraceId(isTraceExpanded ? null : p.id)}
                          className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-900/80 flex items-center justify-between text-xs text-zinc-700 dark:text-zinc-300 font-semibold hover:bg-zinc-100 transition cursor-pointer"
                        >
                          <span className="flex items-center gap-1.5">
                            <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
                            <span>Algorithm Verification Trace ({p.generationTrace.length} steps)</span>
                          </span>
                          {isTraceExpanded ? <ChevronUp className="w-3.5 h-3.5 text-zinc-400" /> : <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />}
                        </button>

                        {isTraceExpanded && (
                          <div className="p-2.5 bg-white dark:bg-zinc-950 divide-y divide-zinc-100 dark:divide-zinc-900 text-xs">
                            {p.generationTrace.map((step, sIdx) => (
                              <div key={sIdx} className="py-1.5 flex items-start gap-2">
                                <div className="mt-0.5 shrink-0">
                                  {step.status === 'PASSED' ? (
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                  ) : (
                                    <Info className="w-3.5 h-3.5 text-amber-500" />
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-bold text-zinc-900 dark:text-zinc-100">{step.algorithm}</span>
                                    <span className="text-[10px] font-mono text-zinc-400 uppercase">[{step.phase}]</span>
                                  </div>
                                  <p className="text-zinc-600 dark:text-zinc-400 text-[11px] leading-tight mt-0.5">{step.detail}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
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

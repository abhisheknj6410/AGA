import React, { useState } from 'react';
import {
  Filter,
  Layers,
  Clock,
  Activity,
  Sliders,
  RotateCcw,
  CheckSquare,
  Square,
  ChevronLeft,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import {
  GraphNode,
  GraphEdge
} from '../../types/graph';

export interface FilterState {
  visibleCategories: {
    ENTITY: boolean;
    EVENT: boolean;
    EVIDENCE: boolean;
  };
  visibleEntityTypes: Set<string>;
  visibleEventTypes: Set<string>;
  visibleEvidenceTypes: Set<string>;
  visibleEdgeTypes: Set<string>;
  visibleStatuses: Set<string>;
  temporalRange: {
    enabled: boolean;
    start: string;
    end: string;
  };
  layout: 'dagre' | 'cose' | 'concentric' | 'circle';
}

interface SidebarFiltersProps {
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  nodes: GraphNode[];
  edges: GraphEdge[];
  onResetFilters: () => void;
}

export const SidebarFilters: React.FC<SidebarFiltersProps> = ({
  filters,
  setFilters,
  nodes,
  edges,
  onResetFilters
}) => {
  const [collapsed, setCollapsed] = useState(false);

  // Compute counts
  const entityCount = nodes.filter(n => n.category === 'ENTITY').length;
  const eventCount = nodes.filter(n => n.category === 'EVENT').length;
  const evidenceCount = nodes.filter(n => n.category === 'EVIDENCE').length;

  const toggleCategory = (cat: 'ENTITY' | 'EVENT' | 'EVIDENCE') => {
    setFilters(prev => ({
      ...prev,
      visibleCategories: {
        ...prev.visibleCategories,
        [cat]: !prev.visibleCategories[cat]
      }
    }));
  };

  const toggleStatus = (status: string) => {
    setFilters(prev => {
      const next = new Set(prev.visibleStatuses);
      if (next.has(status)) next.delete(status);
      else next.add(status);
      return { ...prev, visibleStatuses: next };
    });
  };

  if (collapsed) {
    return (
      <aside className="w-12 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-r border-slate-200/80 dark:border-slate-800/80 flex flex-col items-center py-3 select-none transition-all duration-200 z-10">
        <button
          onClick={() => setCollapsed(false)}
          title="Expand Filters & Layers"
          className="p-2 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        <div className="h-px w-6 bg-slate-200 dark:bg-slate-800 my-2" />

        <button
          onClick={() => setCollapsed(false)}
          title="Filters Active"
          className="p-2 rounded-lg text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 relative transition"
        >
          <Filter className="w-4 h-4" />
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-indigo-500 ring-2 ring-white dark:ring-slate-900" />
        </button>

        <button
          onClick={() => setCollapsed(false)}
          title="Graph Layers"
          className="p-2 mt-2 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
        >
          <Layers className="w-4 h-4" />
        </button>

        <div className="mt-auto">
          <button
            onClick={onResetFilters}
            title="Reset All Filters"
            className="p-2 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </aside>
    );
  }

  return (
    <aside className="w-64 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md border-r border-zinc-200 dark:border-zinc-800 flex flex-col h-[calc(100vh-3.5rem-1.75rem)] select-none transition-all duration-200 z-10">
      {/* Filter Header */}
      <div className="h-12 px-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
          <Filter className="w-3.5 h-3.5 text-zinc-900 dark:text-zinc-100" />
          <span>Layers & Scope</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onResetFilters}
            title="Reset Filters"
            className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setCollapsed(true)}
            title="Collapse Sidebar"
            className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5 text-xs scrollbar-thin">
        {/* Layout Selector */}
        <div>
          <label className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-zinc-400" />
            Graph Layout
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            {[
              { id: 'dagre', label: 'Hierarchy' },
              { id: 'cose', label: 'Force' },
              { id: 'concentric', label: 'Concentric' },
              { id: 'circle', label: 'Radial' }
            ].map(l => (
              <button
                key={l.id}
                onClick={() => setFilters(prev => ({ ...prev, layout: l.id as any }))}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border text-center transition ${
                  filters.layout === l.id
                    ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 border-zinc-900 dark:border-white shadow-xs'
                    : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-700 hover:text-zinc-900 dark:hover:text-zinc-200'
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>

        {/* Node Categories */}
        <div>
          <label className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-zinc-400" />
            Node Categories
          </label>
          <div className="space-y-1.5">
            {/* Entities */}
            <button
              onClick={() => toggleCategory('ENTITY')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border text-left transition ${
                filters.visibleCategories.ENTITY
                  ? 'bg-zinc-100 dark:bg-zinc-800/80 border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 font-medium'
                  : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-400 opacity-50'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-zinc-500 dark:bg-zinc-400" />
                <span className="font-semibold text-xs">Entities</span>
              </div>
              <span className="text-[11px] px-2 py-0.5 rounded-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 font-mono font-medium">
                {entityCount}
              </span>
            </button>

            {/* Events */}
            <button
              onClick={() => toggleCategory('EVENT')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border text-left transition ${
                filters.visibleCategories.EVENT
                  ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 font-medium'
                  : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-400 opacity-50'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span className="font-semibold text-xs">Events</span>
              </div>
              <span className="text-[11px] px-2 py-0.5 rounded-md bg-white dark:bg-amber-950 border border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-300 font-mono font-medium">
                {eventCount}
              </span>
            </button>

            {/* Evidence */}
            <button
              onClick={() => toggleCategory('EVIDENCE')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border text-left transition ${
                filters.visibleCategories.EVIDENCE
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 font-medium'
                  : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-400 opacity-50'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="font-semibold text-xs">Evidence</span>
              </div>
              <span className="text-[11px] px-2 py-0.5 rounded-md bg-white dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 font-mono font-medium">
                {evidenceCount}
              </span>
            </button>
          </div>
        </div>

        {/* Relationship Statuses */}
        <div>
          <label className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-zinc-400" />
            Relationship Epistemics
          </label>
          <div className="space-y-1.5">
            {[
              { id: 'OBSERVED', label: 'Observed', desc: 'Direct proof', dot: 'bg-zinc-900 dark:bg-zinc-100' },
              { id: 'DERIVED', label: 'Derived', desc: 'Algorithm deduction', dot: 'bg-zinc-500' },
              { id: 'HYPOTHESIZED', label: 'Hypothesized', desc: 'Unproven scenario', dot: 'bg-zinc-400' }
            ].map(s => {
              const active = filters.visibleStatuses.has(s.id);
              return (
                <button
                  key={s.id}
                  onClick={() => toggleStatus(s.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border text-left transition ${
                    active
                      ? 'bg-zinc-100 dark:bg-zinc-800/60 border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100'
                      : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-400 opacity-50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${s.dot}`} />
                    <span className="font-semibold text-xs">{s.label}</span>
                  </div>
                  <span className="text-[11px] text-zinc-400 dark:text-zinc-500 font-mono">{s.desc}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Temporal Scope Window */}
        <div>
          <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
            <Clock className="w-3 h-3 text-slate-400" />
            Temporal Scope
          </label>
          <div className="bg-slate-50 dark:bg-slate-800/40 p-2 rounded-lg border border-slate-200 dark:border-slate-800 space-y-2">
            <label className="flex items-center justify-between text-[11px] cursor-pointer">
              <span className="text-slate-600 dark:text-slate-300 font-medium">Filter Timestamps</span>
              <input
                type="checkbox"
                checked={filters.temporalRange.enabled}
                onChange={e =>
                  setFilters(prev => ({
                    ...prev,
                    temporalRange: { ...prev.temporalRange, enabled: e.target.checked }
                  }))
                }
                className="w-3.5 h-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
            </label>
            {filters.temporalRange.enabled && (
              <div className="space-y-1.5 pt-1 border-t border-slate-200 dark:border-slate-700/60">
                <div>
                  <span className="text-[10px] text-slate-400 block mb-0.5">Start</span>
                  <input
                    type="datetime-local"
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[10px] rounded px-2 py-1 text-slate-700 dark:text-slate-300 focus:outline-hidden focus:border-indigo-500"
                    value={filters.temporalRange.start.slice(0, 16)}
                    onChange={e =>
                      setFilters(prev => ({
                        ...prev,
                        temporalRange: { ...prev.temporalRange, start: new Date(e.target.value).toISOString() }
                      }))
                    }
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block mb-0.5">End</span>
                  <input
                    type="datetime-local"
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[10px] rounded px-2 py-1 text-slate-700 dark:text-slate-300 focus:outline-hidden focus:border-indigo-500"
                    value={filters.temporalRange.end.slice(0, 16)}
                    onChange={e =>
                      setFilters(prev => ({
                        ...prev,
                        temporalRange: { ...prev.temporalRange, end: new Date(e.target.value).toISOString() }
                      }))
                    }
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
};

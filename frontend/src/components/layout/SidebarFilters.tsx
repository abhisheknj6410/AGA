import React, { useState } from 'react';
import {
  Filter,
  Layers,
  Clock,
  Activity,
  Sliders,
  RotateCcw,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { GraphNode, GraphEdge } from '../../types/graph';

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
      <aside className="w-14 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md border-r border-zinc-200 dark:border-zinc-800 flex flex-col items-center py-4 select-none transition-all duration-200 z-10">
        <button
          onClick={() => setCollapsed(false)}
          title="Expand Layers & Scope"
          className="p-2.5 rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
        >
          <ChevronRight className="w-5 h-5" />
        </button>

        <div className="h-px w-8 bg-zinc-200 dark:bg-zinc-800 my-3" />

        <button
          onClick={() => setCollapsed(false)}
          title="Filter Scope"
          className="p-2.5 rounded-lg text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-950/40 relative transition cursor-pointer"
        >
          <Filter className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-teal-500 ring-2 ring-white dark:ring-zinc-950" />
        </button>

        <div className="mt-auto">
          <button
            onClick={onResetFilters}
            title="Reset Scope"
            className="p-2.5 rounded-lg text-zinc-400 hover:text-teal-600 dark:hover:text-teal-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </aside>
    );
  }

  return (
    <aside className="w-72 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md border-r border-zinc-200 dark:border-zinc-800 flex flex-col h-[calc(100vh-3.5rem)] select-none transition-all duration-200 z-10">
      {/* Filter Header */}
      <div className="h-14 px-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5 text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
          <Filter className="w-4 h-4 text-teal-600 dark:text-teal-400" />
          <span>Layers & Scope</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={onResetFilters}
            title="Reset All Filters"
            className="p-2 rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs transition cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setCollapsed(true)}
            title="Collapse Sidebar"
            className="p-2 rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-6 text-sm scrollbar-thin">
        {/* Layout Selector */}
        <div>
          <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2.5 flex items-center gap-2">
            <Sliders className="w-4 h-4 text-zinc-400" />
            Graph Layout
          </label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: 'dagre', label: 'Hierarchy' },
              { id: 'cose', label: 'Force' },
              { id: 'concentric', label: 'Concentric' },
              { id: 'circle', label: 'Radial' }
            ].map(l => (
              <button
                key={l.id}
                onClick={() => setFilters(prev => ({ ...prev, layout: l.id as any }))}
                className={`px-3 py-2 rounded-xl text-xs font-semibold border text-center transition cursor-pointer ${
                  filters.layout === l.id
                    ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 border-zinc-900 dark:border-white shadow-xs'
                    : 'bg-zinc-50 dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-700 hover:text-zinc-900 dark:hover:text-zinc-200'
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>

        {/* Node Categories */}
        <div>
          <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2.5 flex items-center gap-2">
            <Layers className="w-4 h-4 text-zinc-400" />
            Node Categories
          </label>
          <div className="space-y-2">
            {/* Entities */}
            <button
              onClick={() => toggleCategory('ENTITY')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-left transition cursor-pointer ${
                filters.visibleCategories.ENTITY
                  ? 'bg-zinc-100 dark:bg-zinc-800/80 border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 font-semibold'
                  : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-400 opacity-50'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className="w-3 h-3 rounded-full bg-zinc-500 dark:bg-zinc-400" />
                <span className="font-semibold text-sm">Entities</span>
              </div>
              <span className="text-xs px-2 py-0.5 rounded-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 font-mono font-medium">
                {entityCount}
              </span>
            </button>

            {/* Events */}
            <button
              onClick={() => toggleCategory('EVENT')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-left transition cursor-pointer ${
                filters.visibleCategories.EVENT
                  ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 font-semibold'
                  : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-400 opacity-50'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className="w-3 h-3 rounded-full bg-amber-500" />
                <span className="font-semibold text-sm">Events</span>
              </div>
              <span className="text-xs px-2 py-0.5 rounded-md bg-white dark:bg-amber-950 border border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-300 font-mono font-medium">
                {eventCount}
              </span>
            </button>

            {/* Evidence */}
            <button
              onClick={() => toggleCategory('EVIDENCE')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-left transition cursor-pointer ${
                filters.visibleCategories.EVIDENCE
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 font-semibold'
                  : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-400 opacity-50'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className="w-3 h-3 rounded-full bg-emerald-500" />
                <span className="font-semibold text-sm">Evidence Items</span>
              </div>
              <span className="text-xs px-2 py-0.5 rounded-md bg-white dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 font-mono font-medium">
                {evidenceCount}
              </span>
            </button>
          </div>
        </div>

        {/* Relationship Epistemics */}
        <div>
          <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2.5 flex items-center gap-2">
            <Activity className="w-4 h-4 text-zinc-400" />
            Relationship Epistemics
          </label>
          <div className="space-y-2">
            {[
              { id: 'OBSERVED', label: 'Observed', desc: 'Direct proof', dot: 'bg-teal-600 dark:bg-teal-400' },
              { id: 'DERIVED', label: 'Derived', desc: 'Algorithmic deduction', dot: 'bg-zinc-500' },
              { id: 'HYPOTHESIZED', label: 'Hypothesized', desc: 'Unproven scenario', dot: 'bg-zinc-400' }
            ].map(s => {
              const active = filters.visibleStatuses.has(s.id);
              return (
                <button
                  key={s.id}
                  onClick={() => toggleStatus(s.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-left transition cursor-pointer ${
                    active
                      ? 'bg-zinc-100 dark:bg-zinc-800/60 border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100'
                      : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-400 opacity-50'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className={`w-2.5 h-2.5 rounded-full ${s.dot}`} />
                    <span className="font-semibold text-sm">{s.label}</span>
                  </div>
                  <span className="text-xs text-zinc-400 dark:text-zinc-500 font-mono">{s.desc}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Temporal Scope Window */}
        <div>
          <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2.5 flex items-center gap-2">
            <Clock className="w-4 h-4 text-zinc-400" />
            Temporal Scope
          </label>
          <div className="bg-zinc-50 dark:bg-zinc-900/40 p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-3">
            <label className="flex items-center justify-between text-xs cursor-pointer">
              <span className="text-zinc-700 dark:text-zinc-300 font-medium">Filter Timestamps</span>
              <input
                type="checkbox"
                checked={filters.temporalRange.enabled}
                onChange={e =>
                  setFilters(prev => ({
                    ...prev,
                    temporalRange: { ...prev.temporalRange, enabled: e.target.checked }
                  }))
                }
                className="w-4 h-4 rounded border-zinc-300 text-teal-600 focus:ring-teal-500 accent-teal-600 cursor-pointer"
              />
            </label>
            {filters.temporalRange.enabled && (
              <div className="space-y-2.5 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                <div>
                  <span className="text-xs text-zinc-400 block mb-1">Start</span>
                  <input
                    type="datetime-local"
                    className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-xs rounded-lg px-2.5 py-1.5 text-zinc-700 dark:text-zinc-300 focus:outline-hidden focus:border-teal-500"
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
                  <span className="text-xs text-zinc-400 block mb-1">End</span>
                  <input
                    type="datetime-local"
                    className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-xs rounded-lg px-2.5 py-1.5 text-zinc-700 dark:text-zinc-300 focus:outline-hidden focus:border-teal-500"
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

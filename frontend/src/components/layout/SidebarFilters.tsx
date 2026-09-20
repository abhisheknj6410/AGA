import React from 'react';
import {
  Filter,
  Layers,
  Clock,
  Activity,
  Sliders,
  RotateCcw,
  CheckSquare,
  Square
} from 'lucide-react';
import {
  ENTITY_TYPES,
  EVENT_TYPES,
  EVIDENCE_TYPES,
  EDGE_TYPES,
  EDGE_STATUSES,
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

  return (
    <aside className="w-64 bg-slate-900/95 border-r border-slate-800 flex flex-col h-[calc(100vh-3.5rem-2rem)] select-none">
      {/* Filter Header */}
      <div className="p-3 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
          <Filter className="w-3.5 h-3.5 text-indigo-400" />
          <span>Filters & Graph Layers</span>
        </div>
        <button
          onClick={onResetFilters}
          title="Reset All Filters"
          className="text-[11px] text-slate-400 hover:text-indigo-400 flex items-center gap-1 transition"
        >
          <RotateCcw className="w-3 h-3" />
          Reset
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-5 text-xs">
        {/* Layout Selector */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
            <Sliders className="w-3 h-3 text-slate-400" />
            Graph Layout
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            {[
              { id: 'dagre', label: 'Hierarchical' },
              { id: 'cose', label: 'Force (CoSE)' },
              { id: 'concentric', label: 'Concentric' },
              { id: 'circle', label: 'Radial' }
            ].map(l => (
              <button
                key={l.id}
                onClick={() => setFilters(prev => ({ ...prev, layout: l.id as any }))}
                className={`px-2 py-1.5 rounded text-[11px] font-medium border transition ${
                  filters.layout === l.id
                    ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300 font-semibold'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>

        {/* Node Categories */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
            <Layers className="w-3 h-3 text-slate-400" />
            Node Categories
          </label>
          <div className="space-y-1.5">
            {/* Entities */}
            <button
              onClick={() => toggleCategory('ENTITY')}
              className={`w-full flex items-center justify-between p-2 rounded border transition text-left ${
                filters.visibleCategories.ENTITY
                  ? 'bg-blue-950/40 border-blue-800/60 text-blue-300'
                  : 'bg-slate-950/40 border-slate-800 text-slate-500'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded bg-blue-500" />
                <span className="font-medium">Entities</span>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-950/80 text-blue-400 font-mono">
                {entityCount}
              </span>
            </button>

            {/* Events */}
            <button
              onClick={() => toggleCategory('EVENT')}
              className={`w-full flex items-center justify-between p-2 rounded border transition text-left ${
                filters.visibleCategories.EVENT
                  ? 'bg-amber-950/40 border-amber-800/60 text-amber-300'
                  : 'bg-slate-950/40 border-slate-800 text-slate-500'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded bg-amber-500" />
                <span className="font-medium">Events (First-Class)</span>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-950/80 text-amber-400 font-mono">
                {eventCount}
              </span>
            </button>

            {/* Evidence */}
            <button
              onClick={() => toggleCategory('EVIDENCE')}
              className={`w-full flex items-center justify-between p-2 rounded border transition text-left ${
                filters.visibleCategories.EVIDENCE
                  ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
                  : 'bg-slate-950/40 border-slate-800 text-slate-500'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded bg-emerald-500" />
                <span className="font-medium">Evidence Nodes</span>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950/80 text-emerald-400 font-mono">
                {evidenceCount}
              </span>
            </button>
          </div>
        </div>

        {/* Relationship Statuses */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
            <Activity className="w-3 h-3 text-slate-400" />
            Relationship Status
          </label>
          <div className="space-y-1.5">
            {[
              { id: 'OBSERVED', label: 'OBSERVED', desc: 'Direct evidence', color: 'border-indigo-500 text-indigo-300' },
              { id: 'DERIVED', label: 'DERIVED', desc: 'Algorithm graph fact', color: 'border-purple-500 text-purple-300' },
              { id: 'HYPOTHESIZED', label: 'HYPOTHESIZED', desc: 'Unproven scenario', color: 'border-amber-500 text-amber-300' }
            ].map(s => {
              const active = filters.visibleStatuses.has(s.id);
              return (
                <button
                  key={s.id}
                  onClick={() => toggleStatus(s.id)}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded border text-left text-xs transition ${
                    active ? `bg-slate-800 ${s.color}` : 'bg-slate-950/40 border-slate-800 text-slate-500'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {active ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                    <span>{s.label}</span>
                  </div>
                  <span className="text-[10px] text-slate-500">{s.desc}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Temporal Filter Window */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
            <Clock className="w-3 h-3 text-slate-400" />
            Temporal Scope
          </label>
          <div className="bg-slate-950/60 p-2.5 rounded border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400">Filter Event Timestamps</span>
              <input
                type="checkbox"
                checked={filters.temporalRange.enabled}
                onChange={e =>
                  setFilters(prev => ({
                    ...prev,
                    temporalRange: { ...prev.temporalRange, enabled: e.target.checked }
                  }))
                }
                className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500"
              />
            </div>
            {filters.temporalRange.enabled && (
              <div className="space-y-1.5 pt-1">
                <div>
                  <span className="text-[10px] text-slate-500 block">Start Time</span>
                  <input
                    type="datetime-local"
                    className="w-full bg-slate-900 border border-slate-700 text-[11px] rounded px-2 py-1 text-slate-300"
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
                  <span className="text-[10px] text-slate-500 block">End Time</span>
                  <input
                    type="datetime-local"
                    className="w-full bg-slate-900 border border-slate-700 text-[11px] rounded px-2 py-1 text-slate-300"
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

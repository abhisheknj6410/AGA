import React, { useState } from 'react';
import { Case, GraphNode, GraphEdge } from '../../types/graph';
import {
  FolderOpen,
  Plus,
  Search,
  Upload,
  Users,
  History,
  ShieldAlert,
  Database,
  Link,
  FileCheck,
  Download,
  Clock,
  ChevronDown,
  Network,
  GitBranch,
  Cpu,
  Bot
} from 'lucide-react';

interface HeaderProps {
  cases: Case[];
  currentCase: Case | null;
  onSelectCase: (c: Case) => void;
  onNewCase: () => void;
  onAddNode: (category: 'ENTITY' | 'EVENT' | 'EVIDENCE') => void;
  onAddEdge: () => void;
  onOpenImport: () => void;
  onOpenResolution: () => void;
  onOpenAudit: () => void;
  pendingResolutionCount: number;
  allNodes: GraphNode[];
  allEdges: GraphEdge[];
  onSelectElement: (type: 'node' | 'edge', id: string) => void;
  isTimelineOpen?: boolean;
  onToggleTimeline?: () => void;
  activeTab: 'GRAPH' | 'POSSIBILITIES' | 'COMPARISON' | 'ANALYSIS' | 'AGENT';
  onTabChange: (tab: 'GRAPH' | 'POSSIBILITIES' | 'COMPARISON' | 'ANALYSIS' | 'AGENT') => void;
  possibilityCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  cases,
  currentCase,
  onSelectCase,
  onNewCase,
  onAddNode,
  onAddEdge,
  onOpenImport,
  onOpenResolution,
  onOpenAudit,
  pendingResolutionCount,
  allNodes,
  allEdges,
  onSelectElement,
  isTimelineOpen,
  onToggleTimeline,
  activeTab,
  onTabChange,
  possibilityCount
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  const filteredNodes = searchQuery.trim()
    ? allNodes.filter(
        n =>
          n.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
          n.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
          n.id.toLowerCase().includes(searchQuery.toLowerCase())
      ).slice(0, 8)
    : [];

  const filteredEdges = searchQuery.trim()
    ? allEdges.filter(
        e =>
          e.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
          e.id.toLowerCase().includes(searchQuery.toLowerCase())
      ).slice(0, 4)
    : [];

  return (
    <header className="h-14 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-4 z-20 select-none">
      {/* Left: Brand & Case Selector */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-indigo-600 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-500/20">
            EG
          </div>
          <div>
            <h1 className="text-sm font-semibold tracking-wide text-slate-100 flex items-center gap-1.5">
              Evidence Graph
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-950 text-indigo-400 border border-indigo-800/60 font-mono">
                PHASE 2
              </span>
            </h1>
          </div>
        </div>

        <div className="h-5 w-[1px] bg-slate-800" />

        {/* Case Switcher */}
        <div className="flex items-center gap-2">
          <FolderOpen className="w-4 h-4 text-slate-400" />
          <select
            className="bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded px-2.5 py-1.5 focus:outline-none focus:border-indigo-500 max-w-[220px]"
            value={currentCase?.id || ''}
            onChange={e => {
              const selected = cases.find(c => c.id === e.target.value);
              if (selected) onSelectCase(selected);
            }}
          >
            {cases.map(c => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <button
            onClick={onNewCase}
            title="Create New Investigation Case"
            className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="h-5 w-[1px] bg-slate-800" />

        {/* Primary View Switcher Tabs */}
        <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-0.5 text-xs">
          <button
            onClick={() => onTabChange('GRAPH')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded font-medium transition ${
              activeTab === 'GRAPH'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Network className="w-3.5 h-3.5" />
            <span>Graph</span>
          </button>

          <button
            onClick={() => onTabChange('POSSIBILITIES')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded font-medium transition ${
              activeTab === 'POSSIBILITIES'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <GitBranch className="w-3.5 h-3.5" />
            <span>Possibilities</span>
            {possibilityCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-indigo-500/30 text-indigo-300 text-[10px] font-mono">
                {possibilityCount}
              </span>
            )}
          </button>

          <button
            onClick={() => onTabChange('ANALYSIS')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded font-medium transition ${
              activeTab === 'ANALYSIS'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Algorithms</span>
          </button>

          <button
            onClick={() => onTabChange('AGENT')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded font-medium transition ${
              activeTab === 'AGENT'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Bot className="w-3.5 h-3.5" />
            <span>Query Agent</span>
          </button>
        </div>
      </div>

      {/* Middle: Graph Search */}
      <div className="relative w-80">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search nodes, events, evidence, edges..."
            className="w-full bg-slate-950 border border-slate-800 text-xs rounded pl-8 pr-3 py-1.5 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
            value={searchQuery}
            onChange={e => {
              setSearchQuery(e.target.value);
              setShowSearchResults(true);
            }}
            onFocus={() => setShowSearchResults(true)}
          />
        </div>

        {/* Search Results Dropdown */}
        {showSearchResults && searchQuery.trim() && (
          <div className="absolute left-0 right-0 top-10 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl py-1.5 max-h-72 overflow-y-auto z-50">
            {filteredNodes.length === 0 && filteredEdges.length === 0 ? (
              <div className="px-3 py-2 text-xs text-slate-400 text-center">No matching elements found</div>
            ) : (
              <>
                {filteredNodes.map(node => (
                  <button
                    key={node.id}
                    onClick={() => {
                      onSelectElement('node', node.id);
                      setShowSearchResults(false);
                      setSearchQuery('');
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-slate-800 flex items-center justify-between text-xs transition"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          node.category === 'ENTITY'
                            ? 'bg-blue-400'
                            : node.category === 'EVENT'
                            ? 'bg-amber-400'
                            : 'bg-emerald-400'
                        }`}
                      />
                      <span className="text-slate-200 font-medium truncate">{node.label}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">{node.type}</span>
                  </button>
                ))}

                {filteredEdges.map(edge => (
                  <button
                    key={edge.id}
                    onClick={() => {
                      onSelectElement('edge', edge.id);
                      setShowSearchResults(false);
                      setSearchQuery('');
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-slate-800 flex items-center justify-between text-xs transition border-t border-slate-800"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Link className="w-3 h-3 text-slate-400" />
                      <span className="text-slate-300 truncate">Edge: {edge.type}</span>
                    </div>
                    <span className="text-[10px] text-indigo-400 font-mono">{edge.status}</span>
                  </button>
                ))}
              </>
            )}
          </div>
        )}
      </div>

      {/* Right: Manual Creation & Utility Actions */}
      <div className="flex items-center gap-2">
        {/* Node & Edge Creation Dropdown / Buttons */}
        <div className="flex items-center rounded border border-slate-700 bg-slate-950 p-0.5 text-xs">
          <button
            onClick={() => onAddNode('ENTITY')}
            className="px-2 py-1 rounded hover:bg-slate-800 text-blue-400 hover:text-blue-300 font-medium transition"
          >
            + Entity
          </button>
          <div className="w-[1px] h-3 bg-slate-800 mx-0.5" />
          <button
            onClick={() => onAddNode('EVENT')}
            className="px-2 py-1 rounded hover:bg-slate-800 text-amber-400 hover:text-amber-300 font-medium transition"
          >
            + Event
          </button>
          <div className="w-[1px] h-3 bg-slate-800 mx-0.5" />
          <button
            onClick={() => onAddNode('EVIDENCE')}
            className="px-2 py-1 rounded hover:bg-slate-800 text-emerald-400 hover:text-emerald-300 font-medium transition"
          >
            + Evidence
          </button>
          <div className="w-[1px] h-3 bg-slate-800 mx-0.5" />
          <button
            onClick={onAddEdge}
            className="px-2 py-1 rounded hover:bg-slate-800 text-indigo-400 hover:text-indigo-300 font-medium transition flex items-center gap-1"
          >
            <Link className="w-3 h-3" />
            + Relationship
          </button>
        </div>

        <div className="h-5 w-[1px] bg-slate-800 mx-1" />

        {/* Structured Import */}
        <button
          onClick={onOpenImport}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition"
          title="Import Structured JSON or CSV Dataset"
        >
          <Upload className="w-3.5 h-3.5" />
          <span>Import</span>
        </button>

        {/* Safe Entity Resolution Review */}
        <button
          onClick={onOpenResolution}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium border transition ${
            pendingResolutionCount > 0
              ? 'bg-amber-950/60 border-amber-700 text-amber-300 hover:bg-amber-900/60'
              : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
          }`}
          title="Safe Entity Resolution Review"
        >
          <Users className="w-3.5 h-3.5" />
          <span>Resolution</span>
          {pendingResolutionCount > 0 && (
            <span className="ml-1 px-1.5 py-0.2 rounded-full bg-amber-500 text-black text-[10px] font-bold">
              {pendingResolutionCount}
            </span>
          )}
        </button>

        {/* Timeline Playback Toggle */}
        <button
          onClick={onToggleTimeline}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium border transition ${
            isTimelineOpen
              ? 'bg-amber-950/70 border-amber-500/70 text-amber-300 shadow-md shadow-amber-900/30'
              : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
          }`}
          title="Toggle Chronological Timeline Stepper"
        >
          <Clock className={`w-3.5 h-3.5 ${isTimelineOpen ? 'text-amber-400' : 'text-slate-400'}`} />
          <span>Timeline</span>
        </button>

        {/* Audit Log */}
        <button
          onClick={onOpenAudit}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition"
          title="Investigation Audit Trail"
        >
          <History className="w-3.5 h-3.5" />
          <span>Audit</span>
        </button>

        {/* Export Formats Dropdown */}
        {currentCase && (
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition"
              title="Export Investigation in Multiple Formats"
            >
              <Download className="w-3.5 h-3.5 text-indigo-400" />
              <span>Export</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {showExportMenu && (
              <div
                className="absolute right-0 mt-1.5 w-48 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl py-1 text-xs z-50 divide-y divide-slate-800"
                onClick={() => setShowExportMenu(false)}
              >
                <a
                  href={`/api/cases/${currentCase.id}/export?format=json`}
                  download={`case-${currentCase.id.slice(0, 8)}-snapshot.json`}
                  className="flex items-center justify-between px-3 py-2 hover:bg-slate-800 text-slate-200 transition"
                >
                  <span className="font-medium">JSON Snapshot</span>
                  <span className="text-[10px] text-indigo-400 font-mono">.json</span>
                </a>
                <a
                  href={`/api/cases/${currentCase.id}/export?format=graphml`}
                  download={`case-${currentCase.id.slice(0, 8)}.graphml`}
                  className="flex items-center justify-between px-3 py-2 hover:bg-slate-800 text-slate-200 transition"
                >
                  <span className="font-medium">GraphML (Standard)</span>
                  <span className="text-[10px] text-amber-400 font-mono">.graphml</span>
                </a>
                <a
                  href={`/api/cases/${currentCase.id}/export?format=dot`}
                  download={`case-${currentCase.id.slice(0, 8)}.dot`}
                  className="flex items-center justify-between px-3 py-2 hover:bg-slate-800 text-slate-200 transition"
                >
                  <span className="font-medium">Graphviz DOT</span>
                  <span className="text-[10px] text-emerald-400 font-mono">.dot</span>
                </a>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
};

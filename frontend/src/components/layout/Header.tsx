import React, { useState, useRef, useEffect } from 'react';
import { Case, GraphNode, GraphEdge } from '../../types/graph';
import {
  FolderOpen,
  Plus,
  Search,
  Upload,
  Users,
  History,
  Download,
  Clock,
  ChevronDown,
  Network,
  GitBranch,
  GitCompare,
  Cpu,
  Bot,
  Sun,
  Moon,
  Activity,
  MoreHorizontal,
  Link2,
  FileCheck,
  Calendar,
  Layers,
  Sliders,
  X
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
  onOpenDiagnostics: () => void;
  pendingResolutionCount: number;
  allNodes: GraphNode[];
  allEdges: GraphEdge[];
  onSelectElement: (type: 'node' | 'edge', id: string) => void;
  isTimelineOpen?: boolean;
  onToggleTimeline?: () => void;
  activeTab: 'GRAPH' | 'POSSIBILITIES' | 'EVOLUTION' | 'COMPARISON' | 'ANALYSIS' | 'INGEST' | 'QUERY';
  onTabChange: (tab: 'GRAPH' | 'POSSIBILITIES' | 'EVOLUTION' | 'COMPARISON' | 'ANALYSIS' | 'INGEST' | 'QUERY') => void;
  possibilityCount: number;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  advancedMode?: boolean;
  onToggleAdvancedMode?: () => void;
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
  onOpenDiagnostics,
  pendingResolutionCount,
  allNodes,
  allEdges,
  onSelectElement,
  isTimelineOpen,
  onToggleTimeline,
  activeTab,
  onTabChange,
  possibilityCount,
  theme,
  onToggleTheme,
  advancedMode = false,
  onToggleAdvancedMode
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showToolsMenu, setShowToolsMenu] = useState(false);

  const addMenuRef = useRef<HTMLDivElement>(null);
  const toolsMenuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (addMenuRef.current && !addMenuRef.current.contains(e.target as Node)) {
        setShowAddMenu(false);
      }
      if (toolsMenuRef.current && !toolsMenuRef.current.contains(e.target as Node)) {
        setShowToolsMenu(false);
      }
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearchResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredNodes = searchQuery.trim()
    ? allNodes
        .filter(
          n =>
            n.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
            n.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
            n.id.toLowerCase().includes(searchQuery.toLowerCase())
        )
        .slice(0, 6)
    : [];

  const filteredEdges = searchQuery.trim()
    ? allEdges
        .filter(
          e =>
            e.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
            e.id.toLowerCase().includes(searchQuery.toLowerCase())
        )
        .slice(0, 3)
    : [];

  return (
    <header className="h-14 bg-white dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between px-5 z-30 select-none transition-colors duration-150">
      {/* Left: Brand & Case Selector */}
      <div className="flex items-center gap-3.5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center text-white shadow-sm">
            <Network className="w-4 h-4" />
          </div>
          <span className="text-sm font-bold tracking-tight text-zinc-900 dark:text-white">
            Evidence Studio
          </span>
        </div>

        <div className="h-4 w-[1px] bg-zinc-200 dark:bg-zinc-800" />

        {/* Case Switcher */}
        <div className="flex items-center gap-1.5">
          <div className="relative flex items-center">
            <select
              className="appearance-none bg-zinc-100 hover:bg-zinc-200/70 dark:bg-zinc-800 dark:hover:bg-zinc-700/80 border border-zinc-200 dark:border-zinc-700/80 text-zinc-900 dark:text-zinc-100 text-xs font-semibold rounded-lg pl-3 pr-8 py-1.5 focus:outline-none focus:ring-1 focus:ring-teal-500 cursor-pointer max-w-[200px] truncate transition-colors"
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
            <ChevronDown className="w-3.5 h-3.5 text-zinc-400 absolute right-2.5 pointer-events-none" />
          </div>

          <button
            onClick={onNewCase}
            title="Create New Case"
            className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Center: Vercel Teal Segmented Navigation */}
      <div className="flex items-center bg-zinc-100 dark:bg-zinc-900 p-1 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs font-medium">
        <button
          onClick={() => onTabChange('GRAPH')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all ${
            activeTab === 'GRAPH'
              ? 'bg-white dark:bg-zinc-800 text-teal-600 dark:text-teal-400 shadow-xs font-semibold'
              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
          }`}
        >
          <Network className="w-3.5 h-3.5" />
          <span>Graph</span>
        </button>

        <button
          onClick={() => onTabChange('POSSIBILITIES')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all ${
            activeTab === 'POSSIBILITIES' || activeTab === 'COMPARISON'
              ? 'bg-white dark:bg-zinc-800 text-teal-600 dark:text-teal-400 shadow-xs font-semibold'
              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
          }`}
        >
          <GitBranch className="w-3.5 h-3.5" />
          <span>Possibilities</span>
          {possibilityCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-300 dark:border-zinc-700">
              {possibilityCount}
            </span>
          )}
        </button>

        <button
          onClick={() => onTabChange('EVOLUTION')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all ${
            activeTab === 'EVOLUTION'
              ? 'bg-white dark:bg-zinc-800 text-teal-600 dark:text-teal-400 shadow-xs font-semibold'
              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
          }`}
        >
          <GitCompare className="w-3.5 h-3.5" />
          <span>Evolution & What-If</span>
        </button>

        <button
          onClick={() => onTabChange('ANALYSIS')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all ${
            activeTab === 'ANALYSIS'
              ? 'bg-white dark:bg-zinc-800 text-teal-600 dark:text-teal-400 shadow-xs font-semibold'
              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
          }`}
        >
          <Cpu className="w-3.5 h-3.5" />
          <span>Algorithms</span>
        </button>

        <button
          onClick={() => onTabChange('INGEST')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all ${
            activeTab === 'INGEST'
              ? 'bg-white dark:bg-zinc-800 text-teal-600 dark:text-teal-400 shadow-xs font-semibold'
              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
          }`}
        >
          <Upload className="w-3.5 h-3.5" />
          <span>Ingest Agent</span>
        </button>

        <button
          onClick={() => onTabChange('QUERY')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all ${
            activeTab === 'QUERY'
              ? 'bg-white dark:bg-zinc-800 text-teal-600 dark:text-teal-400 shadow-xs font-semibold'
              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
          }`}
        >
          <Bot className="w-3.5 h-3.5" />
          <span>Query Agent</span>
        </button>
      </div>

      {/* Right: Search, Add Fact, Tools Drawer, Theme */}
      <div className="flex items-center gap-2.5">
        {/* Search */}
        <div ref={searchRef} className="relative w-56">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-zinc-400" />
            <input
              type="text"
              placeholder="Search graph..."
              className="w-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs rounded-lg pl-8 pr-3 py-1.5 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600 focus:bg-white dark:focus:bg-zinc-950 transition"
              value={searchQuery}
              onChange={e => {
                setSearchQuery(e.target.value);
                setShowSearchResults(true);
              }}
              onFocus={() => setShowSearchResults(true)}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Search Dropdown */}
          {showSearchResults && searchQuery.trim() && (
            <div className="absolute left-0 right-0 top-9 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl py-1 max-h-64 overflow-y-auto z-50 text-xs">
              {filteredNodes.length === 0 && filteredEdges.length === 0 ? (
                <div className="px-3 py-2 text-slate-400 text-center">No elements match search</div>
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
                      className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between transition"
                    >
                      <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                        {node.label}
                      </span>
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
                      className="w-full text-left px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center justify-between transition border-t border-zinc-100 dark:border-zinc-800"
                    >
                      <span className="text-zinc-600 dark:text-zinc-300 truncate">
                        {edge.type}
                      </span>
                      <span className="text-xs text-teal-600 dark:text-teal-400 font-mono">{edge.status}</span>
                    </button>
                  ))}
                </>
              )}
            </div>
          )}
        </div>

        {/* Studio Mode Toggle (Agent Mode vs Studio Mode) */}
        <button
          onClick={onToggleAdvancedMode}
          title={advancedMode ? "Switch to Automated Agent Mode" : "Switch to Studio Mode (Manual Editing)"}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
            advancedMode
              ? 'bg-zinc-900 text-white border-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 dark:border-zinc-100 shadow-xs'
              : 'bg-zinc-100 text-zinc-600 border-zinc-200 hover:text-zinc-900 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700 dark:hover:text-zinc-100'
          }`}
        >
          <Sliders className="w-3.5 h-3.5 text-teal-500" />
          <span>{advancedMode ? 'Studio Mode' : 'Agent Mode'}</span>
        </button>

        {/* Unified + Add Fact Dropdown - Studio Mode Only */}
        {advancedMode && (
          <div ref={addMenuRef} className="relative">
            <button
              onClick={() => setShowAddMenu(!showAddMenu)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white shadow-sm transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Fact</span>
              <ChevronDown className="w-3 h-3 ml-0.5 opacity-70" />
            </button>

            {showAddMenu && (
              <div className="absolute right-0 top-9 w-48 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl py-1.5 z-50 text-xs font-medium">
                <button
                  onClick={() => {
                    onAddNode('ENTITY');
                    setShowAddMenu(false);
                  }}
                  className="w-full text-left px-3.5 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-2.5 text-zinc-700 dark:text-zinc-200 transition"
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-zinc-400 dark:bg-zinc-500" />
                  <span>Add Entity...</span>
                </button>
                <button
                  onClick={() => {
                    onAddNode('EVENT');
                    setShowAddMenu(false);
                  }}
                  className="w-full text-left px-3.5 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-2.5 text-zinc-700 dark:text-zinc-200 transition"
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <span>Add Event Node...</span>
                </button>
                <button
                  onClick={() => {
                    onAddNode('EVIDENCE');
                    setShowAddMenu(false);
                  }}
                  className="w-full text-left px-3.5 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-2.5 text-zinc-700 dark:text-zinc-200 transition"
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span>Add Evidence Item...</span>
                </button>
                <div className="my-1 border-t border-zinc-100 dark:border-zinc-800" />
                <button
                  onClick={() => {
                    onAddEdge();
                    setShowAddMenu(false);
                  }}
                  className="w-full text-left px-3.5 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-2.5 text-zinc-700 dark:text-zinc-200 transition"
                >
                  <Link2 className="w-3.5 h-3.5 text-zinc-600 dark:text-zinc-400" />
                  <span>Connect Relationship...</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Tools Menu (Import, Resolution, Timeline, Diagnostics, Export) */}
        <div ref={toolsMenuRef} className="relative">
          <button
            onClick={() => setShowToolsMenu(!showToolsMenu)}
            title="Investigation Tools"
            className="p-1.5 rounded-lg text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 transition relative"
          >
            <MoreHorizontal className="w-4 h-4" />
            {pendingResolutionCount > 0 && (
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            )}
          </button>

          {showToolsMenu && (
            <div className="absolute right-0 top-8 w-56 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl py-1.5 z-50 text-xs font-medium">
              <button
                onClick={() => {
                  onOpenResolution();
                  setShowToolsMenu(false);
                }}
                className="w-full text-left px-3.5 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center justify-between text-zinc-700 dark:text-zinc-200 transition"
              >
                <div className="flex items-center gap-2.5">
                  <Users className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Entity Resolution</span>
                </div>
                {pendingResolutionCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 font-mono text-xs">
                    {pendingResolutionCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => {
                  if (onToggleTimeline) onToggleTimeline();
                  setShowToolsMenu(false);
                }}
                className="w-full text-left px-3.5 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center justify-between text-zinc-700 dark:text-zinc-200 transition"
              >
                <div className="flex items-center gap-2.5">
                  <Clock className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Timeline Playback</span>
                </div>
                {isTimelineOpen && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                )}
              </button>

              <button
                onClick={() => {
                  onOpenDiagnostics();
                  setShowToolsMenu(false);
                }}
                className="w-full text-left px-3.5 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-2.5 text-zinc-700 dark:text-zinc-200 transition"
              >
                <Activity className="w-3.5 h-3.5 text-zinc-400" />
                <span>Topology & Diagnostics</span>
              </button>

              <div className="my-1 border-t border-zinc-100 dark:border-zinc-800" />

              <button
                onClick={() => {
                  onOpenImport();
                  setShowToolsMenu(false);
                }}
                className="w-full text-left px-3.5 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-2.5 text-zinc-700 dark:text-zinc-200 transition"
              >
                <Upload className="w-3.5 h-3.5 text-zinc-400" />
                <span>Import Dataset (JSON/CSV)</span>
              </button>

              <button
                onClick={() => {
                  onOpenAudit();
                  setShowToolsMenu(false);
                }}
                className="w-full text-left px-3.5 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-2.5 text-zinc-700 dark:text-zinc-200 transition"
              >
                <History className="w-3.5 h-3.5 text-zinc-400" />
                <span>Forensic Audit Trail</span>
              </button>

              <button
                onClick={() => {
                  if (currentCase) {
                    window.open(`/api/cases/${currentCase.id}/export`, '_blank');
                  }
                  setShowToolsMenu(false);
                }}
                className="w-full text-left px-3.5 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-2.5 text-zinc-700 dark:text-zinc-200 transition"
              >
                <Download className="w-3.5 h-3.5 text-zinc-400" />
                <span>Export Snapshot (JSON)</span>
              </button>
            </div>
          )}
        </div>

        {/* Theme Toggle (Light / Dark) */}
        <button
          onClick={onToggleTheme}
          title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
          className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 transition"
        >
          {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
        </button>
      </div>
    </header>
  );
};

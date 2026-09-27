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
  activeTab: 'GRAPH' | 'POSSIBILITIES' | 'COMPARISON' | 'ANALYSIS' | 'AGENT';
  onTabChange: (tab: 'GRAPH' | 'POSSIBILITIES' | 'COMPARISON' | 'ANALYSIS' | 'AGENT') => void;
  possibilityCount: number;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
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
  onToggleTheme
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
    <header className="h-13 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800/80 flex items-center justify-between px-4 z-30 select-none transition-colors duration-150">
      {/* Left: Brand & Case Selector */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-indigo-600 dark:bg-indigo-500 flex items-center justify-center text-white shadow-sm">
            <Network className="w-4 h-4" />
          </div>
          <span className="text-xs font-semibold tracking-tight text-slate-900 dark:text-white">
            Evidence Studio
          </span>
        </div>

        <div className="h-4 w-[1px] bg-slate-200 dark:bg-slate-800" />

        {/* Case Switcher */}
        <div className="flex items-center gap-1.5">
          <div className="relative flex items-center">
            <select
              className="appearance-none bg-slate-100 hover:bg-slate-200/70 dark:bg-slate-800/80 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/60 text-slate-800 dark:text-slate-200 text-xs font-medium rounded-md pl-2.5 pr-7 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer max-w-[180px] truncate transition-colors"
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
            <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2 pointer-events-none" />
          </div>

          <button
            onClick={onNewCase}
            title="Create New Case"
            className="p-1 rounded-md text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Center: Clean Segmented View Navigation */}
      <div className="flex items-center bg-slate-100 dark:bg-slate-950 p-0.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-medium">
        <button
          onClick={() => onTabChange('GRAPH')}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition-all ${
            activeTab === 'GRAPH'
              ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs font-semibold'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Network className="w-3.5 h-3.5" />
          <span>Graph</span>
        </button>

        <button
          onClick={() => onTabChange('POSSIBILITIES')}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition-all ${
            activeTab === 'POSSIBILITIES' || activeTab === 'COMPARISON'
              ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs font-semibold'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <GitBranch className="w-3.5 h-3.5" />
          <span>Possibilities</span>
          {possibilityCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/50">
              {possibilityCount}
            </span>
          )}
        </button>

        <button
          onClick={() => onTabChange('ANALYSIS')}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition-all ${
            activeTab === 'ANALYSIS'
              ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs font-semibold'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Cpu className="w-3.5 h-3.5" />
          <span>Algorithms</span>
        </button>

        <button
          onClick={() => onTabChange('AGENT')}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition-all ${
            activeTab === 'AGENT'
              ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs font-semibold'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Bot className="w-3.5 h-3.5" />
          <span>Query Agent</span>
        </button>
      </div>

      {/* Right: Search, Add Fact, Tools Drawer, Theme */}
      <div className="flex items-center gap-2">
        {/* Search */}
        <div ref={searchRef} className="relative w-56">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-400" />
            <input
              type="text"
              placeholder="Search graph..."
              className="w-full bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs rounded-md pl-8 pr-3 py-1 text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 transition"
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
                      className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between transition border-t border-slate-100 dark:border-slate-800"
                    >
                      <span className="text-slate-600 dark:text-slate-300 truncate">
                        {edge.type}
                      </span>
                      <span className="text-[10px] text-indigo-500 font-mono">{edge.status}</span>
                    </button>
                  ))}
                </>
              )}
            </div>
          )}
        </div>

        {/* Unified + Add Fact Dropdown */}
        <div ref={addMenuRef} className="relative">
          <button
            onClick={() => setShowAddMenu(!showAddMenu)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Fact</span>
            <ChevronDown className="w-3 h-3 ml-0.5 opacity-80" />
          </button>

          {showAddMenu && (
            <div className="absolute right-0 top-8 w-44 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl py-1 z-50 text-xs font-medium">
              <button
                onClick={() => {
                  onAddNode('ENTITY');
                  setShowAddMenu(false);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 text-slate-700 dark:text-slate-200 transition"
              >
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                <span>Add Entity...</span>
              </button>
              <button
                onClick={() => {
                  onAddNode('EVENT');
                  setShowAddMenu(false);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 text-slate-700 dark:text-slate-200 transition"
              >
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span>Add Event Node...</span>
              </button>
              <button
                onClick={() => {
                  onAddNode('EVIDENCE');
                  setShowAddMenu(false);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 text-slate-700 dark:text-slate-200 transition"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>Add Evidence Item...</span>
              </button>
              <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
              <button
                onClick={() => {
                  onAddEdge();
                  setShowAddMenu(false);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 text-slate-700 dark:text-slate-200 transition"
              >
                <Link2 className="w-3.5 h-3.5 text-indigo-500" />
                <span>Connect Relationship...</span>
              </button>
            </div>
          )}
        </div>

        {/* Tools Menu (Import, Resolution, Timeline, Diagnostics, Export) */}
        <div ref={toolsMenuRef} className="relative">
          <button
            onClick={() => setShowToolsMenu(!showToolsMenu)}
            title="Investigation Tools"
            className="p-1.5 rounded-md text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 transition relative"
          >
            <MoreHorizontal className="w-4 h-4" />
            {pendingResolutionCount > 0 && (
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            )}
          </button>

          {showToolsMenu && (
            <div className="absolute right-0 top-8 w-52 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl py-1 z-50 text-xs font-medium">
              <button
                onClick={() => {
                  onOpenResolution();
                  setShowToolsMenu(false);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between text-slate-700 dark:text-slate-200 transition"
              >
                <div className="flex items-center gap-2">
                  <Users className="w-3.5 h-3.5 text-slate-400" />
                  <span>Entity Resolution</span>
                </div>
                {pendingResolutionCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 font-mono text-[10px]">
                    {pendingResolutionCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => {
                  if (onToggleTimeline) onToggleTimeline();
                  setShowToolsMenu(false);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between text-slate-700 dark:text-slate-200 transition"
              >
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
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
                className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 text-slate-700 dark:text-slate-200 transition"
              >
                <Activity className="w-3.5 h-3.5 text-slate-400" />
                <span>Topology & Diagnostics</span>
              </button>

              <div className="my-1 border-t border-slate-100 dark:border-slate-800" />

              <button
                onClick={() => {
                  onOpenImport();
                  setShowToolsMenu(false);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 text-slate-700 dark:text-slate-200 transition"
              >
                <Upload className="w-3.5 h-3.5 text-slate-400" />
                <span>Import Dataset (JSON/CSV)</span>
              </button>

              <button
                onClick={() => {
                  onOpenAudit();
                  setShowToolsMenu(false);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 text-slate-700 dark:text-slate-200 transition"
              >
                <History className="w-3.5 h-3.5 text-slate-400" />
                <span>Forensic Audit Trail</span>
              </button>

              <button
                onClick={() => {
                  if (currentCase) {
                    window.open(`/api/cases/${currentCase.id}/export`, '_blank');
                  }
                  setShowToolsMenu(false);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 text-slate-700 dark:text-slate-200 transition"
              >
                <Download className="w-3.5 h-3.5 text-slate-400" />
                <span>Export Snapshot (JSON)</span>
              </button>
            </div>
          )}
        </div>

        {/* Theme Toggle (Light / Dark) */}
        <button
          onClick={onToggleTheme}
          title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
          className="p-1.5 rounded-md text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 transition"
        >
          {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
        </button>
      </div>
    </header>
  );
};

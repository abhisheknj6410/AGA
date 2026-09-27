import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Layers, Plus, Sparkles, Bot, Clock, Upload } from 'lucide-react';
import { Header } from './components/layout/Header';
import { SidebarFilters, FilterState } from './components/layout/SidebarFilters';
import { CytoscapeCanvas } from './components/graph/CytoscapeCanvas';
import { InspectorPanel } from './components/inspector/InspectorPanel';
import { StatusBar } from './components/layout/StatusBar';
import { TimelinePlayback } from './components/timeline/TimelinePlayback';
import { AddNodeModal } from './components/modals/AddNodeModal';
import { AddEdgeModal } from './components/modals/AddEdgeModal';
import { ImportModal } from './components/modals/ImportModal';
import { ResolutionModal } from './components/modals/ResolutionModal';
import { AuditModal } from './components/modals/AuditModal';
import { NewCaseModal } from './components/modals/NewCaseModal';
import { DiagnosticsModal } from './components/modals/DiagnosticsModal';
import { PossibilitiesView } from './components/possibilities/PossibilitiesView';
import { ComparisonView } from './components/possibilities/ComparisonView';
import { AnalysisView } from './components/analysis/AnalysisView';
import { CaseIngestionView } from './components/agent/CaseIngestionView';
import { InvestigationQueryView } from './components/agent/InvestigationQueryView';
import { PossibilityEvolutionView } from './components/possibilities/PossibilityEvolutionView';
import { ResolutionLabView } from './components/resolution/ResolutionLabView';
import { InvestigationPlanView } from './components/planning/InvestigationPlanView';
import { AlgorithmLabView } from './components/effectiveness/AlgorithmLabView';
import { ClosedLoopView } from './components/closed-loop/ClosedLoopView';
import { InvestigationDecisionView } from './components/decision/InvestigationDecisionView';
import { ValidationLabView } from './components/validation/ValidationLabView';
import { AlgorithmValueLabView } from './components/effectiveness/AlgorithmValueLabView';
import {
  Case,
  GraphPayload,
  GraphNode,
  GraphEdge,
  ResolutionCandidate,
  NodeCategory,
  ENTITY_TYPES,
  EVENT_TYPES,
  EVIDENCE_TYPES,
  EDGE_TYPES,
  Possibility,
  PossibilityComparison
} from './types/graph';
import {
  fetchCases,
  fetchCaseGraph,
  createNode,
  updateNode,
  deleteNode,
  createEdge,
  updateEdge,
  deleteEdge,
  validateGraph,
  fetchResolutionCandidates,
  fetchPossibilities,
  generatePossibilities,
  comparePossibilities
} from './api/client';

const INITIAL_FILTERS: FilterState = {
  visibleCategories: {
    ENTITY: true,
    EVENT: true,
    EVIDENCE: true
  },
  visibleEntityTypes: new Set(ENTITY_TYPES),
  visibleEventTypes: new Set(EVENT_TYPES),
  visibleEvidenceTypes: new Set(EVIDENCE_TYPES),
  visibleEdgeTypes: new Set(EDGE_TYPES),
  visibleStatuses: new Set(['OBSERVED', 'DERIVED', 'HYPOTHESIZED']),
  temporalRange: {
    enabled: false,
    start: '2026-09-10T12:00:00Z',
    end: '2026-09-10T18:00:00Z'
  },
  layout: 'dagre'
};

export const App: React.FC = () => {
  const [cases, setCases] = useState<Case[]>([]);
  const [currentCase, setCurrentCase] = useState<Case | null>(null);
  const [graph, setGraph] = useState<GraphPayload | null>(null);
  const [validation, setValidation] = useState<{ valid: boolean; errors: string[] } | null>(null);
  const [resolutionCandidates, setResolutionCandidates] = useState<ResolutionCandidate[]>([]);
  const [selectedElement, setSelectedElement] = useState<{ type: 'node' | 'edge'; id: string } | null>(null);
  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS);

  const [activeTab, setActiveTab] = useState<'GRAPH' | 'POSSIBILITIES' | 'EVOLUTION' | 'RESOLUTION' | 'PLAN' | 'CLOSED_LOOP' | 'DECISION' | 'VALIDATION' | 'VALUE_LAB' | 'COMPARISON' | 'ANALYSIS' | 'INGEST' | 'QUERY'>('GRAPH');
  const [possibilities, setPossibilities] = useState<Possibility[]>([]);
  const [activePossibility, setActivePossibility] = useState<Possibility | null>(null);
  const [comparisonData, setComparisonData] = useState<PossibilityComparison | null>(null);
  const [isGeneratingPossibilities, setIsGeneratingPossibilities] = useState(false);

  // Timeline playback state
  const [isTimelineOpen, setIsTimelineOpen] = useState(false);
  const [timelineStep, setTimelineStep] = useState(0);
  const [isTimelinePlaying, setIsTimelinePlaying] = useState(false);
  const [cumulativeTimeline, setCumulativeTimeline] = useState(false);

  // Modals state
  const [nodeModalOpen, setNodeModalOpen] = useState(false);
  const [nodeModalCategory, setNodeModalCategory] = useState<NodeCategory>('ENTITY');
  const [edgeModalOpen, setEdgeModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [resolutionModalOpen, setResolutionModalOpen] = useState(false);
  const [auditModalOpen, setAuditModalOpen] = useState(false);
  const [diagnosticsModalOpen, setDiagnosticsModalOpen] = useState(false);
  const [newCaseModalOpen, setNewCaseModalOpen] = useState(false);

  // Clean Theme State (default Light Mode)
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('gis-theme');
    return (saved === 'dark' || saved === 'light') ? saved : 'light';
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('gis-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  // Advanced Studio Mode State (default false: Agent Mode)
  const [advancedMode, setAdvancedMode] = useState<boolean>(() => {
    return localStorage.getItem('gis-advanced-mode') === 'true';
  });

  const toggleAdvancedMode = () => {
    setAdvancedMode(prev => {
      const next = !prev;
      localStorage.setItem('gis-advanced-mode', String(next));
      return next;
    });
  };

  // Load initial cases
  useEffect(() => {
    fetchCases().then(list => {
      setCases(list);
      if (list.length > 0) {
        setCurrentCase(list[0]);
      }
    }).catch(console.error);
  }, []);

  // Load case graph and data when currentCase changes
  const loadCaseData = useCallback(async () => {
    if (!currentCase) return;
    try {
      const [g, v, r, pList] = await Promise.all([
        fetchCaseGraph(currentCase.id),
        validateGraph(currentCase.id),
        fetchResolutionCandidates(currentCase.id),
        fetchPossibilities(currentCase.id)
      ]);
      setGraph(g);
      setValidation(v);
      setResolutionCandidates(r);
      setPossibilities(pList);
    } catch (err) {
      console.error('Failed to load case data:', err);
    }
  }, [currentCase]);

  useEffect(() => {
    loadCaseData();
    setSelectedElement(null);
    setActivePossibility(null);
    setTimelineStep(0);
    setIsTimelinePlaying(false);
  }, [loadCaseData]);

  const handleGeneratePossibilities = async () => {
    if (!currentCase) return;
    setIsGeneratingPossibilities(true);
    try {
      const res = await generatePossibilities(currentCase.id);
      setPossibilities(res.possibilities || []);
    } catch (err) {
      console.error('Failed to generate possibilities:', err);
    } finally {
      setIsGeneratingPossibilities(false);
    }
  };

  const handleComparePossibilities = async (selectedIds: string[]) => {
    if (!currentCase) return;
    try {
      const comp = await comparePossibilities(currentCase.id, selectedIds);
      setComparisonData(comp);
      setActiveTab('COMPARISON');
    } catch (err) {
      console.error('Failed to compare possibilities:', err);
    }
  };

  const handleSelectPossibilityForGraph = (p: Possibility) => {
    setActivePossibility(p);
    setActiveTab('GRAPH');
  };

  // Extract sorted chronological events for timeline playback
  const chronologicalEvents = useMemo(() => {
    if (!graph) return [];
    return graph.nodes
      .filter(n => n.category === 'EVENT')
      .slice()
      .sort((a, b) => {
        const ta = a.time?.start ? new Date(a.time.start).getTime() : 0;
        const tb = b.time?.start ? new Date(b.time.start).getTime() : 0;
        if (ta !== tb) return ta - tb;
        return a.label.localeCompare(b.label);
      });
  }, [graph]);

  // Handle timeline step change and auto-focus
  const handleTimelineStepChange = useCallback((newStep: number) => {
    setTimelineStep(newStep);
    if (chronologicalEvents[newStep]) {
      setSelectedElement({ type: 'node', id: chronologicalEvents[newStep].id });
    }
  }, [chronologicalEvents]);

  // Filtered graph computation
  const filteredElements = useMemo(() => {
    if (!graph) return { nodes: [], edges: [] };

    // Cumulative timeline filtering (if enabled)
    let allowedConnectedNodeIds: Set<string> | null = null;
    if (isTimelineOpen && cumulativeTimeline && chronologicalEvents.length > 0) {
      const activeSlice = chronologicalEvents.slice(0, timelineStep + 1);
      const allowedEventIds = new Set(activeSlice.map(e => e.id));
      allowedConnectedNodeIds = new Set<string>(allowedEventIds);

      // Include entities & evidence directly linked to visible events
      for (const edge of graph.edges) {
        if (allowedEventIds.has(edge.source)) {
          allowedConnectedNodeIds.add(edge.target);
        }
        if (allowedEventIds.has(edge.target)) {
          allowedConnectedNodeIds.add(edge.source);
        }
      }
    }

    // 1. Filter Nodes
    const visibleNodes = graph.nodes.filter(n => {
      // Cumulative playback filter
      if (allowedConnectedNodeIds && !allowedConnectedNodeIds.has(n.id)) {
        return false;
      }

      // Category filter
      if (!filters.visibleCategories[n.category]) return false;

      // Temporal range filter for events
      if (filters.temporalRange.enabled && n.category === 'EVENT' && n.time?.start) {
        const eventTime = new Date(n.time.start).getTime();
        const startTime = new Date(filters.temporalRange.start).getTime();
        const endTime = new Date(filters.temporalRange.end).getTime();
        if (eventTime < startTime || eventTime > endTime) return false;
      }

      return true;
    });

    const visibleNodeIds = new Set(visibleNodes.map(n => n.id));

    // 2. Filter Edges
    const visibleEdges = graph.edges.filter(e => {
      if (!filters.visibleStatuses.has(e.status)) return false;
      if (!filters.visibleEdgeTypes.has(e.type)) return false;
      // Both source and target must be visible
      return visibleNodeIds.has(e.source) && visibleNodeIds.has(e.target);
    });

    return { nodes: visibleNodes, edges: visibleEdges };
  }, [graph, filters, isTimelineOpen, cumulativeTimeline, chronologicalEvents, timelineStep]);

  // Handlers
  const handleAddNodeOpen = (cat: NodeCategory) => {
    setNodeModalCategory(cat);
    setNodeModalOpen(true);
  };

  const handleCreateNodeSubmit = async (nodeData: Partial<GraphNode>) => {
    if (!currentCase) return;
    await createNode(currentCase.id, nodeData);
    await loadCaseData();
  };

  const handleDeleteNode = async (nodeId: string) => {
    if (!currentCase) return;
    if (confirm('Are you sure you want to delete this node and its connected edges?')) {
      await deleteNode(currentCase.id, nodeId);
      setSelectedElement(null);
      await loadCaseData();
    }
  };

  const handleCreateEdgeSubmit = async (edgeData: Partial<GraphEdge>) => {
    if (!currentCase) return;
    await createEdge(currentCase.id, edgeData);
    await loadCaseData();
  };

  const handleDeleteEdge = async (edgeId: string) => {
    if (!currentCase) return;
    if (confirm('Are you sure you want to delete this relationship?')) {
      await deleteEdge(currentCase.id, edgeId);
      setSelectedElement(null);
      await loadCaseData();
    }
  };

  const handleUpdateNode = async (nodeId: string, updates: Partial<GraphNode>) => {
    if (!currentCase) return;
    await updateNode(currentCase.id, nodeId, updates);
    await loadCaseData();
  };

  const handleUpdateEdge = async (edgeId: string, updates: Partial<GraphEdge>) => {
    if (!currentCase) return;
    await updateEdge(currentCase.id, edgeId, updates);
    await loadCaseData();
  };

  const pendingResolutionCount = resolutionCandidates.filter(c => c.status === 'PENDING').length;

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-zinc-50 dark:bg-zinc-950 font-sans text-zinc-900 dark:text-zinc-100">
      {/* Investigation Header */}
      <Header
        cases={cases}
        currentCase={currentCase}
        onSelectCase={setCurrentCase}
        onNewCase={() => setNewCaseModalOpen(true)}
        onAddNode={handleAddNodeOpen}
        onAddEdge={() => setEdgeModalOpen(true)}
        onOpenImport={() => setImportModalOpen(true)}
        onOpenResolution={() => setResolutionModalOpen(true)}
        onOpenAudit={() => setAuditModalOpen(true)}
        onOpenDiagnostics={() => setDiagnosticsModalOpen(true)}
        pendingResolutionCount={pendingResolutionCount}
        allNodes={graph?.nodes || []}
        allEdges={graph?.edges || []}
        onSelectElement={(type, id) => setSelectedElement({ type, id })}
        isTimelineOpen={isTimelineOpen}
        onToggleTimeline={() => {
          const next = !isTimelineOpen;
          setIsTimelineOpen(next);
          if (!next) {
            setIsTimelinePlaying(false);
          }
        }}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        possibilityCount={possibilities.length}
        theme={theme}
        onToggleTheme={toggleTheme}
        advancedMode={advancedMode}
        onToggleAdvancedMode={toggleAdvancedMode}
      />

      {/* Main Workspace Layout by Active View */}
      {activeTab === 'GRAPH' && (
        <div className="flex flex-1 overflow-hidden relative">
          {/* Active Possibility Overlay Banner */}
          {activePossibility && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-white/95 dark:bg-zinc-900/95 border border-zinc-200 dark:border-zinc-800 shadow-md backdrop-blur-md text-xs">
              <span className="font-semibold text-teal-600 dark:text-teal-400">Overlay:</span>
              <span className="text-zinc-800 dark:text-zinc-200 font-medium">{activePossibility.name}</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950 text-xs text-emerald-700 dark:text-emerald-400 font-mono font-medium border border-emerald-200 dark:border-emerald-800">
                {activePossibility.status}
              </span>
              <button
                onClick={() => setActivePossibility(null)}
                className="ml-1 px-2 py-0.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 text-xs font-medium transition cursor-pointer"
              >
                Reset
              </button>
            </div>
          )}

          {/* Left Filter & Layer Sidebar */}
          <SidebarFilters
            filters={filters}
            setFilters={setFilters}
            nodes={graph?.nodes || []}
            edges={graph?.edges || []}
            onResetFilters={() => setFilters(INITIAL_FILTERS)}
          />

          {/* Center Cytoscape Canvas & Floating Overlays */}
          <div className="relative flex-1 h-full overflow-hidden">
            <CytoscapeCanvas
              nodes={filteredElements.nodes}
              edges={filteredElements.edges}
              selectedElement={selectedElement}
              onSelectElement={setSelectedElement}
              layoutType={filters.layout}
              theme={theme}
            />

            {/* Floating Top Control Dock */}
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 px-3 py-1.5 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 rounded-full shadow-lg text-xs font-semibold text-zinc-800 dark:text-zinc-200">
              <button
                onClick={() => setFilters(prev => ({ ...prev, layout: prev.layout === 'dagre' ? 'cose' : 'dagre' }))}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition text-xs cursor-pointer"
                title="Toggle Graph Layout (Flow vs Organic)"
              >
                <Layers className="w-3.5 h-3.5 text-zinc-600 dark:text-zinc-400" />
                <span>{filters.layout === 'dagre' ? 'Flow Layout' : 'Organic'}</span>
              </button>

              {/* Studio Mode Manual Fact Controls */}
              {advancedMode && (
                <>
                  <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-800" />
                  <button
                    onClick={() => {
                      setNodeModalCategory('ENTITY');
                      setNodeModalOpen(true);
                    }}
                    className="flex items-center gap-1 px-3 py-1 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition text-xs cursor-pointer"
                    title="Add Node Fact (Studio Mode)"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Fact</span>
                  </button>

                  <button
                    onClick={() => setEdgeModalOpen(true)}
                    className="flex items-center gap-1 px-3 py-1 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition text-xs cursor-pointer"
                    title="Connect Relationship (Studio Mode)"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>Connect</span>
                  </button>
                </>
              )}

              <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-800" />

              <button
                onClick={() => setIsTimelineOpen(!isTimelineOpen)}
                className={`flex items-center gap-1 px-3 py-1 rounded-full transition text-xs cursor-pointer ${
                  isTimelineOpen
                    ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 font-semibold'
                    : 'hover:bg-zinc-100 dark:hover:bg-zinc-800'
                }`}
                title="Toggle Timeline Playback"
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Timeline</span>
              </button>

              <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-800" />

              {/* Direct Ingestion & Query Agent buttons */}
              <button
                onClick={() => setActiveTab('INGEST')}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100 transition text-xs font-semibold shadow-xs cursor-pointer"
                title="Input Case Documents & Extract Facts"
              >
                <Upload className="w-3.5 h-3.5 text-teal-400 dark:text-teal-600" />
                <span>Ingest Agent</span>
              </button>

              <button
                onClick={() => setActiveTab('QUERY')}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-600 text-white hover:bg-teal-700 transition text-xs font-semibold shadow-xs cursor-pointer"
                title="Query Graph & Reason with Agent"
              >
                <Bot className="w-3.5 h-3.5" />
                <span>Query Agent</span>
              </button>
            </div>

            {/* Chronological Event Stepper & Playback Toolbar */}
            {isTimelineOpen && (
              <TimelinePlayback
                events={chronologicalEvents}
                allNodes={graph?.nodes || []}
                allEdges={graph?.edges || []}
                currentStep={timelineStep}
                onStepChange={handleTimelineStepChange}
                isPlaying={isTimelinePlaying}
                onTogglePlay={() => setIsTimelinePlaying(!isTimelinePlaying)}
                cumulativeMode={cumulativeTimeline}
                onToggleCumulative={() => setCumulativeTimeline(!cumulativeTimeline)}
                onClose={() => {
                  setIsTimelineOpen(false);
                  setIsTimelinePlaying(false);
                }}
              />
            )}

            {/* Floating Slide-over Inspector */}
            {selectedElement && (
              <div className="absolute top-3 right-3 bottom-12 z-30 transition-all duration-200 animate-in fade-in slide-in-from-right-6 pointer-events-auto">
                <InspectorPanel
                  selectedElement={selectedElement}
                  onClose={() => setSelectedElement(null)}
                  nodes={graph?.nodes || []}
                  edges={graph?.edges || []}
                  onSelectElement={setSelectedElement}
                  onDeleteNode={handleDeleteNode}
                  onDeleteEdge={handleDeleteEdge}
                  onUpdateNode={handleUpdateNode}
                  onUpdateEdge={handleUpdateEdge}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'POSSIBILITIES' && (
        <PossibilitiesView
          caseId={currentCase?.id}
          possibilities={possibilities}
          graph={graph}
          onSelectPossibilityForGraph={handleSelectPossibilityForGraph}
          onCompare={handleComparePossibilities}
          onGenerate={handleGeneratePossibilities}
          isGenerating={isGeneratingPossibilities}
        />
      )}

      {activeTab === 'EVOLUTION' && (
        <PossibilityEvolutionView
          caseId={currentCase?.id || ''}
          graph={graph}
          onRefreshGraph={loadCaseData}
        />
      )}

      {activeTab === 'RESOLUTION' && currentCase && (
        <ResolutionLabView
          currentCase={currentCase}
        />
      )}

      {activeTab === 'PLAN' && currentCase && (
        <InvestigationPlanView
          caseId={currentCase.id}
        />
      )}

      {activeTab === 'CLOSED_LOOP' && currentCase && (
        <ClosedLoopView
          caseId={currentCase.id}
        />
      )}

      {activeTab === 'DECISION' && currentCase && (
        <InvestigationDecisionView
          caseId={currentCase.id}
        />
      )}

      {activeTab === 'VALIDATION' && currentCase && (
        <ValidationLabView
          caseId={currentCase.id}
        />
      )}

      {activeTab === 'VALUE_LAB' && currentCase && (
        <AlgorithmValueLabView
          caseId={currentCase.id}
        />
      )}

      {activeTab === 'COMPARISON' && (
        <ComparisonView
          comparison={comparisonData}
          onBack={() => setActiveTab('POSSIBILITIES')}
        />
      )}

      {activeTab === 'ANALYSIS' && currentCase && (
        <AlgorithmLabView
          caseId={currentCase.id}
        />
      )}

      {activeTab === 'INGEST' && (
        <CaseIngestionView
          caseId={currentCase?.id || ''}
          onDataIngested={loadCaseData}
          onSwitchToGraph={() => setActiveTab('GRAPH')}
        />
      )}

      {activeTab === 'QUERY' && (
        <InvestigationQueryView
          caseId={currentCase?.id || ''}
          onSwitchToGraph={() => setActiveTab('GRAPH')}
        />
      )}

      {/* Bottom Status Bar */}
      <StatusBar
        graph={graph}
        validation={validation}
        onOpenDiagnostics={() => setDiagnosticsModalOpen(true)}
      />

      {/* Modals */}
      {currentCase && (
        <>
          <AddNodeModal
            isOpen={nodeModalOpen}
            onClose={() => setNodeModalOpen(false)}
            category={nodeModalCategory}
            onSubmit={handleCreateNodeSubmit}
          />

          <AddEdgeModal
            isOpen={edgeModalOpen}
            onClose={() => setEdgeModalOpen(false)}
            nodes={graph?.nodes || []}
            onSubmit={handleCreateEdgeSubmit}
          />

          <ImportModal
            isOpen={importModalOpen}
            onClose={() => setImportModalOpen(false)}
            caseId={currentCase.id}
            onImportSuccess={loadCaseData}
          />

          <ResolutionModal
            isOpen={resolutionModalOpen}
            onClose={() => setResolutionModalOpen(false)}
            caseId={currentCase.id}
            candidates={resolutionCandidates}
            nodes={graph?.nodes || []}
            onResolved={loadCaseData}
          />

          <AuditModal
            isOpen={auditModalOpen}
            onClose={() => setAuditModalOpen(false)}
            caseId={currentCase.id}
          />

          <DiagnosticsModal
            isOpen={diagnosticsModalOpen}
            onClose={() => setDiagnosticsModalOpen(false)}
            caseId={currentCase.id}
            onSelectNode={nodeId => setSelectedElement({ type: 'node', id: nodeId })}
          />
        </>
      )}

      <NewCaseModal
        isOpen={newCaseModalOpen}
        onClose={() => setNewCaseModalOpen(false)}
        onCaseCreated={newCase => {
          setCases(prev => [newCase, ...prev]);
          setCurrentCase(newCase);
        }}
      />
    </div>
  );
};

export default App;

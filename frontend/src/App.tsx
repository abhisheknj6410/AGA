import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Header } from './components/layout/Header';
import { SidebarFilters, FilterState } from './components/layout/SidebarFilters';
import { CytoscapeCanvas } from './components/graph/CytoscapeCanvas';
import { InspectorPanel } from './components/inspector/InspectorPanel';
import { StatusBar } from './components/layout/StatusBar';
import { AddNodeModal } from './components/modals/AddNodeModal';
import { AddEdgeModal } from './components/modals/AddEdgeModal';
import { ImportModal } from './components/modals/ImportModal';
import { ResolutionModal } from './components/modals/ResolutionModal';
import { AuditModal } from './components/modals/AuditModal';
import { NewCaseModal } from './components/modals/NewCaseModal';
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
  EDGE_TYPES
} from './types/graph';
import {
  fetchCases,
  fetchCaseGraph,
  createNode,
  deleteNode,
  createEdge,
  deleteEdge,
  validateGraph,
  fetchResolutionCandidates
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

  // Modals state
  const [nodeModalOpen, setNodeModalOpen] = useState(false);
  const [nodeModalCategory, setNodeModalCategory] = useState<NodeCategory>('ENTITY');
  const [edgeModalOpen, setEdgeModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [resolutionModalOpen, setResolutionModalOpen] = useState(false);
  const [auditModalOpen, setAuditModalOpen] = useState(false);
  const [newCaseModalOpen, setNewCaseModalOpen] = useState(false);

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
      const [g, v, r] = await Promise.all([
        fetchCaseGraph(currentCase.id),
        validateGraph(currentCase.id),
        fetchResolutionCandidates(currentCase.id)
      ]);
      setGraph(g);
      setValidation(v);
      setResolutionCandidates(r);
    } catch (err) {
      console.error('Failed to load case data:', err);
    }
  }, [currentCase]);

  useEffect(() => {
    loadCaseData();
    setSelectedElement(null);
  }, [loadCaseData]);

  // Filtered graph computation
  const filteredElements = useMemo(() => {
    if (!graph) return { nodes: [], edges: [] };

    // 1. Filter Nodes
    const visibleNodes = graph.nodes.filter(n => {
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
  }, [graph, filters]);

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

  const pendingResolutionCount = resolutionCandidates.filter(c => c.status === 'PENDING').length;

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-950 font-sans text-slate-100">
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
        pendingResolutionCount={pendingResolutionCount}
        allNodes={graph?.nodes || []}
        allEdges={graph?.edges || []}
        onSelectElement={(type, id) => setSelectedElement({ type, id })}
      />

      {/* Main Workspace Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Filter & Layer Sidebar */}
        <SidebarFilters
          filters={filters}
          setFilters={setFilters}
          nodes={graph?.nodes || []}
          edges={graph?.edges || []}
          onResetFilters={() => setFilters(INITIAL_FILTERS)}
        />

        {/* Center Cytoscape Canvas */}
        <CytoscapeCanvas
          nodes={filteredElements.nodes}
          edges={filteredElements.edges}
          selectedElement={selectedElement}
          onSelectElement={setSelectedElement}
          layoutType={filters.layout}
        />

        {/* Right Inspector & Provenance Panel */}
        <InspectorPanel
          selectedElement={selectedElement}
          onClose={() => setSelectedElement(null)}
          nodes={graph?.nodes || []}
          edges={graph?.edges || []}
          onSelectElement={setSelectedElement}
          onDeleteNode={handleDeleteNode}
          onDeleteEdge={handleDeleteEdge}
        />
      </div>

      {/* Bottom Status Bar */}
      <StatusBar graph={graph} validation={validation} />

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

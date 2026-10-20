"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from '../components/layout/Navbar';
import { CytoscapeCanvas } from '../components/graph/CytoscapeCanvas';
import { CaseIngestionView } from '../components/agent/CaseIngestionView';
import { InvestigatorChatView } from '../components/agent/InvestigatorChatView';
import { PossibilitiesView } from '../components/possibilities/PossibilitiesView';
import { InvestigationPlanView } from '../components/planning/InvestigationPlanView';
import { EvaluationLabView } from '../components/evaluation/EvaluationLabView';
import { AddFactModal } from '../components/modals/AddFactModal';
import { ResolutionLabView } from '../components/resolution/ResolutionLabView';
import { TimelinePlayback } from '../components/timeline/TimelinePlayback';
import { AlgorithmSimulationDeck, SimulationState } from '../components/graph/AlgorithmSimulationDeck';
import { Zap } from 'lucide-react';
import {
  Case,
  GraphPayload,
  GraphNode,
  GraphEdge,
  Possibility
} from '../types/graph';
import {
  fetchCases,
  fetchCaseGraph,
  createNode,
  updateNode,
  deleteNode,
  createEdge,
  deleteEdge,
  fetchPossibilities,
  generatePossibilities,
  createCase
} from '../api/client';
import { Spinner } from '@heroui/react';

export default function Home() {
  const [cases, setCases] = useState<Case[]>([]);
  const [currentCase, setCurrentCase] = useState<Case | null>(null);
  const [graph, setGraph] = useState<GraphPayload | null>(null);
  const [possibilities, setPossibilities] = useState<Possibility[]>([]);
  const [selectedElement, setSelectedElement] = useState<{ type: 'node' | 'edge'; id: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'GRAPH' | 'CHAT' | 'INGEST' | 'POSSIBILITIES' | 'INTELLIGENCE' | 'EVALUATION' | 'RESOLUTION'>('GRAPH');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [loading, setLoading] = useState(true);

  // Add Fact Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addCategory, setAddCategory] = useState<'ENTITY' | 'EVENT' | 'EVIDENCE' | 'EDGE'>('ENTITY');

  // Algorithm highlight state
  const [highlightNodeIds, setHighlightNodeIds] = useState<string[]>([]);

  // Timeline playback state
  const [timelineActive, setTimelineActive] = useState(false);
  const [timelineStep, setTimelineStep] = useState(0);
  const [timelinePlaying, setTimelinePlaying] = useState(false);
  const [timelineCumulative, setTimelineCumulative] = useState(false);

  // Algorithm Simulation state
  const [simulationActive, setSimulationActive] = useState(false);
  const [simulationState, setSimulationState] = useState<SimulationState | null>(null);

  // Derive chronologically sorted EVENT nodes for timeline
  const timelineEvents = React.useMemo(() => {
    if (!graph?.nodes) return [];
    return graph.nodes
      .filter(n => n.type === 'EVENT' && n.time?.start)
      .sort((a, b) => new Date(a.time!.start!).getTime() - new Date(b.time!.start!).getTime());
  }, [graph]);

  // Initial load
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('gis_theme') as 'light' | 'dark' | null;
      if (savedTheme) {
        setTheme(savedTheme);
        document.documentElement.classList.toggle('dark', savedTheme === 'dark');
        document.documentElement.classList.toggle('light', savedTheme === 'light');
      }
    }

    async function init() {
      try {
        const caseList = await fetchCases();
        setCases(caseList);
        if (caseList.length > 0) {
          setCurrentCase(caseList[0]);
        }
      } catch (err) {
        console.warn("Failed to fetch initial cases", err);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  // Load graph and possibilities when currentCase changes
  const loadCaseData = useCallback(async () => {
    if (!currentCase) return;
    try {
      const [g, pList] = await Promise.all([
        fetchCaseGraph(currentCase.id),
        fetchPossibilities(currentCase.id)
      ]);
      setGraph(g);
      if (pList && pList.length > 0) {
        setPossibilities(pList);
      } else {
        // Auto-generate possibilities in the background so Hypotheses tab is never empty
        try {
          const genResult = await generatePossibilities(currentCase.id);
          setPossibilities(genResult.possibilities || []);
        } catch {
          setPossibilities([]);
        }
      }
    } catch (e) {
      console.warn("Error loading case data", e);
    }
  }, [currentCase]);

  useEffect(() => {
    loadCaseData();
  }, [loadCaseData]);

  const handleToggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    if (typeof window !== 'undefined') {
      localStorage.setItem('gis_theme', next);
      document.documentElement.classList.toggle('dark', next === 'dark');
      document.documentElement.classList.toggle('light', next === 'light');
    }
  };

  const handleAddNodeTrigger = (category: 'ENTITY' | 'EVENT' | 'EVIDENCE') => {
    setAddCategory(category);
    setIsAddModalOpen(true);
  };

  const handleAddEdgeTrigger = () => {
    setAddCategory('EDGE');
    setIsAddModalOpen(true);
  };

  const handleAddNode = async (nodeData: Partial<GraphNode>) => {
    if (!currentCase) return;
    await createNode(currentCase.id, nodeData);
    await loadCaseData();
  };

  const handleAddEdge = async (edgeData: { source: string; target: string; type: string }) => {
    if (!currentCase) return;
    await createEdge(currentCase.id, edgeData as Partial<GraphEdge>);
    await loadCaseData();
  };

  const handleDeleteNode = async (nodeId: string) => {
    if (!currentCase) return;
    await deleteNode(currentCase.id, nodeId);
    await loadCaseData();
  };

  const handleDeleteEdge = async (edgeId: string) => {
    if (!currentCase) return;
    await deleteEdge(currentCase.id, edgeId);
    await loadCaseData();
  };

  const handleUpdateNode = async (nodeId: string, updates: Partial<GraphNode>) => {
    if (!currentCase) return;
    await updateNode(currentCase.id, nodeId, updates);
    await loadCaseData();
  };

  const handleGeneratePossibilities = async () => {
    if (!currentCase) return;
    await generatePossibilities(currentCase.id);
    await loadCaseData();
  };

  const handleSelectPossibilityForGraph = (p: Possibility) => {
    const traversedIds: string[] = (p.constraints as any)?.traversedNodeIds || [];
    if (traversedIds.length > 0) {
      setHighlightNodeIds(traversedIds);
    } else if (p.graphChanges?.addedNodes?.length) {
      setHighlightNodeIds(p.graphChanges.addedNodes.map(n => n.id));
    } else if (p.criticalDependency?.length) {
      setHighlightNodeIds(p.criticalDependency.map(c => c.nodeId));
    } else if (p.assumptions && p.assumptions[0] && p.assumptions[0].includes('sequence:')) {
      const parts = p.assumptions[0].replace(/.*sequence:\s*/i, '').split(' → ');
      const matchedIds = parts
        .map(name => graph?.nodes?.find(n => n.label.trim().toLowerCase() === name.trim().toLowerCase())?.id)
        .filter(Boolean) as string[];
      if (matchedIds.length > 0) {
        setHighlightNodeIds(matchedIds);
      }
    }
    setActiveTab('GRAPH');
  };

  const handleNewCase = async () => {
    const name = prompt("Enter new case name:") || `Case ${Date.now()}`;
    const newCase = await createCase(name, "Forensic investigation");
    setCases(prev => [newCase, ...prev]);
    setCurrentCase(newCase);
  };

  if (loading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center space-y-4 bg-slate-50 dark:bg-zinc-950">
        <Spinner size="lg" color="primary" />
        <span className="text-xs text-slate-500 font-medium">Initializing Evidence Studio...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-50 dark:bg-zinc-950">
      {/* Top HeroUI Navbar */}
      <Navbar
        cases={cases}
        currentCase={currentCase}
        onSelectCase={setCurrentCase}
        onNewCase={handleNewCase}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onAddNode={handleAddNodeTrigger}
        onAddEdge={handleAddEdgeTrigger}
        possibilityCount={possibilities.length}
        nodeCount={graph?.nodes?.length || 0}
        edgeCount={graph?.edges?.length || 0}
        theme={theme}
        onToggleTheme={handleToggleTheme}
      />

      {/* Main View Area */}
      <main className="flex-1 w-full h-[calc(100vh-4rem)] relative overflow-hidden">
        {activeTab === 'GRAPH' && (
          <div className="relative w-full h-full">
            <CytoscapeCanvas
              caseId={currentCase?.id}
              nodes={graph?.nodes || []}
              edges={graph?.edges || []}
              selectedElement={selectedElement}
              onSelectElement={setSelectedElement}
              onDeleteNode={handleDeleteNode}
              onDeleteEdge={handleDeleteEdge}
              onUpdateNode={handleUpdateNode}
              theme={theme}
              highlightNodeIds={highlightNodeIds}
              simulationState={simulationState}
            />

            {/* Bottom Right Floating Timeline Button */}
            {!timelineActive && timelineEvents.length > 0 && (
              <div className="absolute bottom-6 right-6 z-20">
                <button
                  onClick={() => {
                    setTimelineActive(true);
                    setTimelineStep(0);
                  }}
                  className="flex items-center gap-2 px-3.5 py-2 bg-white/95 dark:bg-zinc-900/95 border border-slate-200/80 dark:border-zinc-800 rounded-xl shadow-lg backdrop-blur text-xs font-semibold text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-all duration-200"
                >
                  <svg className="w-3.5 h-3.5 text-teal-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  Replay Timeline ({timelineEvents.length})
                </button>
              </div>
            )}

            {/* Timeline overlay */}
            {timelineActive && (
              <TimelinePlayback
                events={timelineEvents}
                allNodes={graph?.nodes || []}
                allEdges={graph?.edges || []}
                currentStep={timelineStep}
                onStepChange={(s) => {
                  setTimelineStep(s);
                  if (timelineEvents[s]) {
                    setHighlightNodeIds([timelineEvents[s].id]);
                  }
                }}
                isPlaying={timelinePlaying}
                onTogglePlay={() => setTimelinePlaying(p => !p)}
                cumulativeMode={timelineCumulative}
                onToggleCumulative={() => setTimelineCumulative(c => !c)}
                onClose={() => { setTimelineActive(false); setTimelinePlaying(false); setHighlightNodeIds([]); }}
              />
            )}
          </div>
        )}

        {activeTab === 'CHAT' && (
          <InvestigatorChatView
            currentCase={currentCase}
            graph={graph}
            onNavigateToGraph={() => setActiveTab('GRAPH')}
          />
        )}

        {activeTab === 'INGEST' && (
          <CaseIngestionView
            caseId={currentCase?.id}
            onNavigateToGraph={() => {
              loadCaseData();
              setActiveTab('GRAPH');
            }}
          />
        )}

        {activeTab === 'POSSIBILITIES' && (
          <PossibilitiesView
            caseId={currentCase?.id}
            possibilities={possibilities}
            graph={graph}
            onGeneratePossibilities={handleGeneratePossibilities}
            onSelectPossibilityForGraph={handleSelectPossibilityForGraph}
          />
        )}

        {activeTab === 'INTELLIGENCE' && (
          <InvestigationPlanView
            caseId={currentCase?.id}
            graph={graph}
            onHighlightNodes={(ids) => {
              setHighlightNodeIds(ids);
              setActiveTab('GRAPH');
            }}
          />
        )}

        {activeTab === 'EVALUATION' && (
          <EvaluationLabView />
        )}

        {activeTab === 'RESOLUTION' && currentCase && (
          <ResolutionLabView currentCase={currentCase} />
        )}
      </main>

      {/* Add Fact Modal */}
      <AddFactModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        category={addCategory}
        onAddNode={handleAddNode}
        onAddEdge={handleAddEdge}
        existingNodes={graph?.nodes || []}
      />
    </div>
  );
}

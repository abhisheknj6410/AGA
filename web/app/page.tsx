"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from '../components/layout/Navbar';
import { CytoscapeCanvas } from '../components/graph/CytoscapeCanvas';
import { CaseIngestionView } from '../components/agent/CaseIngestionView';
import { PossibilitiesView } from '../components/possibilities/PossibilitiesView';
import { InvestigationPlanView } from '../components/planning/InvestigationPlanView';
import { EvaluationLabView } from '../components/evaluation/EvaluationLabView';
import { AddFactModal } from '../components/modals/AddFactModal';
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
  createEdge,
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
  const [activeTab, setActiveTab] = useState<'GRAPH' | 'INGEST' | 'POSSIBILITIES' | 'INTELLIGENCE' | 'EVALUATION'>('GRAPH');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [loading, setLoading] = useState(true);

  // Add Fact Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addCategory, setAddCategory] = useState<'ENTITY' | 'EVENT' | 'EVIDENCE' | 'EDGE'>('ENTITY');

  // Algorithm highlight state
  const [highlightNodeIds, setHighlightNodeIds] = useState<string[]>([]);

  // Initial load
  useEffect(() => {
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
      setPossibilities(pList);
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
    if (typeof document !== 'undefined') {
      if (next === 'dark') {
        document.documentElement.classList.add('dark');
        document.documentElement.classList.remove('light');
      } else {
        document.documentElement.classList.add('light');
        document.documentElement.classList.remove('dark');
      }
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

  const handleGeneratePossibilities = async () => {
    if (!currentCase) return;
    await generatePossibilities(currentCase.id);
    await loadCaseData();
  };

  const handleSelectPossibilityForGraph = (p: Possibility) => {
    if (p.graphChanges?.addedNodes) {
      setHighlightNodeIds(p.graphChanges.addedNodes.map(n => n.id));
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
          <CytoscapeCanvas
            nodes={graph?.nodes || []}
            edges={graph?.edges || []}
            selectedElement={selectedElement}
            onSelectElement={setSelectedElement}
            theme={theme}
            highlightNodeIds={highlightNodeIds}
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

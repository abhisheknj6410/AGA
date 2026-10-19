"use client";

import React, { useEffect, useRef, useState, useMemo } from 'react';
import cytoscape, { Core, EventObject } from 'cytoscape';
import dagre from 'cytoscape-dagre';
import { GraphNode, GraphEdge } from '../../types/graph';
import { Button, Chip, Card, CardBody, Tooltip, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from '@heroui/react';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Crosshair,
  Layers,
  Sparkles,
  Info,
  Calendar,
  Tag,
  ShieldAlert,
  ArrowRight,
  Trash2,
  Edit3,
  Check
} from 'lucide-react';

import { SimulationState } from './AlgorithmSimulationDeck';
import { runAlgorithm } from '../../api/client';
import {
  ForensicMode,
  ForensicStep,
  compileDijkstraSteps,
  compileDominatorSteps,
  compileMinCutSteps,
  detectCandidatePair
} from './forensic-simulation';
import { ForensicTelemetryBar } from './ForensicTelemetryBar';

if (typeof window !== 'undefined') {
  try {
    cytoscape.use(dagre);
  } catch (e) {
    // Already registered
  }
}

interface CytoscapeCanvasProps {
  caseId?: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  selectedElement: { type: 'node' | 'edge'; id: string } | null;
  onSelectElement: (element: { type: 'node' | 'edge'; id: string } | null) => void;
  onDeleteNode?: (nodeId: string) => Promise<void>;
  onDeleteEdge?: (edgeId: string) => Promise<void>;
  onUpdateNode?: (nodeId: string, updates: Partial<GraphNode>) => Promise<void>;
  layoutType?: 'dagre' | 'cose' | 'concentric' | 'circle';
  theme?: 'light' | 'dark';
  highlightNodeIds?: string[];
  highlightEdgeIds?: string[];
  simulationState?: SimulationState | null;
}

export const CytoscapeCanvas: React.FC<CytoscapeCanvasProps> = ({
  caseId,
  nodes,
  edges,
  selectedElement,
  onSelectElement,
  onDeleteNode,
  onDeleteEdge,
  onUpdateNode,
  layoutType = 'dagre',
  theme = 'light',
  highlightNodeIds = [],
  highlightEdgeIds = [],
  simulationState = null
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);
  const [activeLayout, setActiveLayout] = useState<'dagre' | 'cose' | 'concentric' | 'circle'>(layoutType);
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [isEditingLabel, setIsEditingLabel] = useState<boolean>(false);
  const [editLabelValue, setEditLabelValue] = useState<string>('');
  const [neighborhoodMode, setNeighborhoodMode] = useState<boolean>(false);

  // Forensic Investigation Mode State
  const [forensicMode, setForensicMode] = useState<ForensicMode>('NORMAL');
  const [forensicSteps, setForensicSteps] = useState<ForensicStep[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [isSevered, setIsSevered] = useState<boolean>(false);
  const [isModeLoading, setIsModeLoading] = useState<boolean>(false);
  const [isLegendOpen, setIsLegendOpen] = useState<boolean>(false);

  const isLight = theme === 'light';

  // Initialize and update Cytoscape
  useEffect(() => {
    if (!containerRef.current) return;

    const cy = cytoscape({
      container: containerRef.current,
      boxSelectionEnabled: false,
      autounselectify: false,
      wheelSensitivity: 0.25,
      style: ([
        // Base Node Style - Modern Rounded Card with subtle border and crisp typography
        {
          selector: 'node',
          style: {
            'label': 'data(label)',
            'font-family': 'Inter, system-ui, -apple-system, sans-serif',
            'font-size': '11px',
            'font-weight': 600,
            'text-valign': 'center',
            'text-halign': 'center',
            'color': isLight ? '#0f172a' : '#f8fafc',
            'text-wrap': 'wrap',
            'text-max-width': '140px',
            'border-width': 1.5,
            'border-color': isLight ? '#cbd5e1' : '#334155',
            'background-color': isLight ? '#ffffff' : '#1e293b',
            'width': '160px',
            'height': '46px',
            'shape': 'round-rectangle',
            'shadow-blur': 10,
            'shadow-color': isLight ? 'rgba(0, 0, 0, 0.04)' : 'rgba(0, 0, 0, 0.4)',
            'shadow-opacity': 1,
            'transition-property': 'background-color, border-color, width, height, opacity, shadow-blur, border-width',
            'transition-duration': 0.18
          }
        },
        // Category Specific Accents
        {
          selector: 'node[category = "ENTITY"]',
          style: {
            'border-color': isLight ? '#0d9488' : '#14b8a6',
            'border-width': 2,
            'background-color': isLight ? '#f0fdfa' : '#042f2e',
            'color': isLight ? '#134e4a' : '#ccfbf1'
          }
        },
        {
          selector: 'node[category = "EVENT"]',
          style: {
            'border-color': isLight ? '#f59e0b' : '#fbbf24',
            'border-width': 2,
            'background-color': isLight ? '#fffbeb' : '#451a03',
            'color': isLight ? '#78350f' : '#fef3c7',
            'shape': 'round-rectangle'
          }
        },
        {
          selector: 'node[category = "EVIDENCE"]',
          style: {
            'border-color': isLight ? '#3b82f6' : '#60a5fa',
            'border-width': 2,
            'background-color': isLight ? '#eff6ff' : '#172554',
            'color': isLight ? '#1e3a8a' : '#dbeafe'
          }
        },
        // Edge Styles - Directional Sleek Curves
        {
          selector: 'edge',
          style: {
            'width': 1.75,
            'line-color': isLight ? '#94a3b8' : '#475569',
            'target-arrow-color': isLight ? '#94a3b8' : '#475569',
            'target-arrow-shape': 'triangle',
            'arrow-scale': 1.1,
            'curve-style': 'bezier',
            'label': 'data(type)',
            'font-family': 'Inter, system-ui, sans-serif',
            'font-size': '9px',
            'font-weight': 500,
            'color': isLight ? '#64748b' : '#94a3b8',
            'text-rotation': 'autorotate',
            'text-margin-y': -8,
            'text-background-opacity': 0.9,
            'text-background-color': isLight ? '#f8fafc' : '#09090b',
            'text-background-padding': '3px',
            'text-background-shape': 'roundrectangle',
            'opacity': 0.85
          }
        },
        // Edge Status Variations
        {
          selector: 'edge[status = "DERIVED"]',
          style: {
            'line-style': 'dashed',
            'line-dash-pattern': [5, 4],
            'line-color': isLight ? '#0d9488' : '#2dd4bf',
            'target-arrow-color': isLight ? '#0d9488' : '#2dd4bf'
          }
        },
        {
          selector: 'edge[status = "HYPOTHESIZED"]',
          style: {
            'line-style': 'dotted',
            'line-color': isLight ? '#f59e0b' : '#fbbf24',
            'target-arrow-color': isLight ? '#f59e0b' : '#fbbf24'
          }
        },
        // Selected States
        {
          selector: 'node:selected',
          style: {
            'border-color': '#6366f1',
            'border-width': 3,
            'shadow-blur': 16,
            'shadow-color': 'rgba(99, 102, 241, 0.4)'
          }
        },
        {
          selector: 'edge:selected',
          style: {
            'width': 3,
            'line-color': '#6366f1',
            'target-arrow-color': '#6366f1'
          }
        },
        // Algorithm Highlight Overlays
        {
          selector: '.algorithm-highlighted-node',
          style: {
            'border-color': '#ec4899',
            'border-width': 3,
            'shadow-blur': 20,
            'shadow-color': 'rgba(236, 72, 153, 0.6)'
          }
        },
        {
          selector: '.algorithm-highlighted-edge',
          style: {
            'width': 3.5,
            'line-color': '#ec4899',
            'target-arrow-color': '#ec4899',
            'opacity': 1
          }
        },
        {
          selector: '.dimmed',
          style: {
            'opacity': 0.15
          }
        },
        // Interactive Algorithm Simulation Classes
        {
          selector: '.sim-frontier-node',
          style: {
            'border-color': '#06b6d4',
            'border-width': 3.5,
            'shadow-blur': 25,
            'shadow-color': 'rgba(6, 182, 212, 0.85)',
            'background-color': isLight ? '#ecfeff' : '#083344',
            'color': isLight ? '#0e7490' : '#a5f3fc'
          }
        },
        {
          selector: '.sim-visited-node',
          style: {
            'border-color': '#10b981',
            'border-width': 3,
            'shadow-blur': 16,
            'shadow-color': 'rgba(16, 185, 129, 0.6)',
            'background-color': isLight ? '#f0fdf4' : '#064e3b',
            'color': isLight ? '#047857' : '#a7f3d0'
          }
        },
        {
          selector: '.sim-choke-node',
          style: {
            'border-color': '#ef4444',
            'border-width': 4.5,
            'shadow-blur': 30,
            'shadow-color': 'rgba(239, 68, 68, 0.95)',
            'background-color': isLight ? '#fef2f2' : '#450a0a',
            'color': isLight ? '#b91c1c' : '#fca5a5'
          }
        },
        {
          selector: '.sim-severed-node',
          style: {
            'opacity': 0.3,
            'border-style': 'dashed',
            'border-color': '#dc2626',
            'background-color': '#292524'
          }
        },
        {
          selector: '.sim-path-edge',
          style: {
            'width': 4.5,
            'line-color': '#10b981',
            'target-arrow-color': '#10b981',
            'shadow-blur': 16,
            'shadow-color': 'rgba(16, 185, 129, 0.8)',
            'opacity': 1
          }
        },
        {
          selector: '.sim-cut-edge',
          style: {
            'width': 4.5,
            'line-style': 'dashed',
            'line-dash-pattern': [8, 5],
            'line-color': '#f43f5e',
            'target-arrow-color': '#f43f5e',
            'shadow-blur': 20,
            'shadow-color': 'rgba(244, 63, 94, 0.9)',
            'opacity': 1
          }
        },
        {
          selector: '.sim-source-partition',
          style: {
            'border-color': '#0284c7',
            'border-width': 2.5,
            'background-color': isLight ? '#e0f2fe' : '#082f49',
            'color': isLight ? '#0369a1' : '#bae6fd'
          }
        },
        {
          selector: '.sim-target-partition',
          style: {
            'border-color': '#9333ea',
            'border-width': 2.5,
            'background-color': isLight ? '#f3e8ff' : '#3b0764',
            'color': isLight ? '#7e22ce' : '#e9d5ff'
          }
        },
        {
          selector: '.sim-dimmed',
          style: {
            'opacity': 0.12
          }
        }
      ] as any),
      elements: []
    });

    cy.on('tap', 'node', (evt: EventObject) => {
      onSelectElement({ type: 'node', id: evt.target.id() });
    });

    cy.on('tap', 'edge', (evt: EventObject) => {
      onSelectElement({ type: 'edge', id: evt.target.id() });
    });

    cy.on('tap', (evt: EventObject) => {
      if (evt.target === cy) {
        onSelectElement(null);
      }
    });

    cy.on('zoom', () => {
      setZoomLevel(Math.round(cy.zoom() * 100));
    });

    cyRef.current = cy;

    return () => {
      cy.destroy();
    };
  }, [isLight, onSelectElement]);

  // Update elements when nodes/edges change
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;

    cy.batch(() => {
      cy.elements().remove();

      const elements: cytoscape.ElementDefinition[] = [];

      nodes.forEach(n => {
        elements.push({
          group: 'nodes',
          data: {
            id: n.id,
            label: n.label,
            category: n.category,
            type: n.type,
            time: n.time
          }
        });
      });

      edges.forEach(e => {
        elements.push({
          group: 'edges',
          data: {
            id: e.id,
            source: e.source,
            target: e.target,
            type: e.type,
            status: e.status
          }
        });
      });

      cy.add(elements);
    });

    // Run layout
    runLayout(activeLayout);
  }, [nodes, edges, activeLayout]);

  // Highlight synchronization
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;

    cy.batch(() => {
      cy.elements().removeClass('algorithm-highlighted-node algorithm-highlighted-edge dimmed');

      const hasHighlights = (highlightNodeIds && highlightNodeIds.length > 0) || (highlightEdgeIds && highlightEdgeIds.length > 0);

      if (hasHighlights) {
        cy.elements().addClass('dimmed');

        highlightNodeIds?.forEach(id => {
          cy.$id(id).removeClass('dimmed').addClass('algorithm-highlighted-node');
        });

        highlightEdgeIds?.forEach(id => {
          cy.$id(id).removeClass('dimmed').addClass('algorithm-highlighted-edge');
        });
      }
    });
  }, [highlightNodeIds, highlightEdgeIds]);

  // Timer loop for simulation playback
  useEffect(() => {
    if (!isPlaying || forensicSteps.length <= 1) return;
    const delay = Math.max(500, Math.round(1800 / playbackSpeed));
    const interval = setInterval(() => {
      setCurrentStepIndex(prev => {
        if (prev >= forensicSteps.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, delay);
    return () => clearInterval(interval);
  }, [isPlaying, forensicSteps.length, playbackSpeed]);

  const activeStep = forensicMode !== 'NORMAL' ? forensicSteps[currentStepIndex] : simulationState?.currentStep;
  const activeSevered = forensicMode !== 'NORMAL' ? isSevered : simulationState?.isSevered;

  // Algorithm Simulation Synchronization
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;

    cy.batch(() => {
      cy.elements().removeClass(
        'sim-frontier-node sim-visited-node sim-choke-node sim-severed-node sim-path-edge sim-cut-edge sim-source-partition sim-target-partition sim-dimmed'
      );

      if (!activeStep) return;

      const step = activeStep;

      // Dim non-participating elements
      const allActiveNodeIds = new Set([
        ...(step.activeNodeIds || []),
        ...(step.frontierNodeIds || []),
        ...(step.visitedNodeIds || []),
        ...(step.chokeNodeIds || []),
        ...(step.sourcePartitionIds || []),
        ...(step.targetPartitionIds || [])
      ]);
      const allActiveEdgeIds = new Set([
        ...(step.activeEdgeIds || []),
        ...(step.cutEdgeIds || [])
      ]);

      if (allActiveNodeIds.size > 0 || allActiveEdgeIds.size > 0) {
        cy.nodes().forEach(n => {
          if (!allActiveNodeIds.has(n.id())) n.addClass('sim-dimmed');
        });
        cy.edges().forEach(e => {
          if (!allActiveEdgeIds.has(e.id())) e.addClass('sim-dimmed');
        });
      }

      step.frontierNodeIds?.forEach(id => cy.$id(id).removeClass('sim-dimmed').addClass('sim-frontier-node'));
      step.visitedNodeIds?.forEach(id => cy.$id(id).removeClass('sim-dimmed').addClass('sim-visited-node'));
      step.chokeNodeIds?.forEach(id => {
        if (activeSevered) {
          cy.$id(id).addClass('sim-severed-node');
        } else {
          cy.$id(id).removeClass('sim-dimmed').addClass('sim-choke-node');
        }
      });
      step.activeEdgeIds?.forEach(id => cy.$id(id).removeClass('sim-dimmed').addClass('sim-path-edge'));
      step.cutEdgeIds?.forEach(id => cy.$id(id).removeClass('sim-dimmed').addClass('sim-cut-edge'));
      step.sourcePartitionIds?.forEach(id => cy.$id(id).removeClass('sim-dimmed').addClass('sim-source-partition'));
      step.targetPartitionIds?.forEach(id => cy.$id(id).removeClass('sim-dimmed').addClass('sim-target-partition'));

      if (activeSevered && step.chokeNodeIds && step.chokeNodeIds.length > 0) {
        step.targetPartitionIds?.forEach(id => cy.$id(id).addClass('sim-dimmed'));
      }
    });

    if (activeStep?.frontierNodeIds && activeStep.frontierNodeIds.length === 1) {
      const targetCyNode = cy.$id(activeStep.frontierNodeIds[0]);
      if (targetCyNode && targetCyNode.length > 0) {
        cy.animate({
          center: { eles: targetCyNode },
          duration: 350
        });
      }
    }
  }, [activeStep, activeSevered]);

  const handleSelectMode = async (mode: ForensicMode) => {
    if (mode === 'NORMAL') {
      setForensicMode('NORMAL');
      setForensicSteps([]);
      setCurrentStepIndex(0);
      setIsPlaying(false);
      setIsSevered(false);
      const cy = cyRef.current;
      if (cy) {
        cy.batch(() => {
          cy.elements().removeClass(
            'sim-frontier-node sim-visited-node sim-choke-node sim-severed-node sim-path-edge sim-cut-edge sim-source-partition sim-target-partition sim-dimmed'
          );
        });
      }
      return;
    }

    if (!caseId) {
      alert("No active case selected.");
      return;
    }

    setIsModeLoading(true);
    setIsSevered(false);
    try {
      const { sourceId, targetId } = detectCandidatePair(nodes, edges);
      if (!sourceId || !targetId) {
        alert("At least 2 nodes are required to trace causal corridors.");
        return;
      }

      let compiledSteps: ForensicStep[] = [];

      if (mode === 'CAUSAL_PATH') {
        const res = await runAlgorithm(caseId, 'DIJKSTRA', { sourceNodeId: sourceId, targetNodeId: targetId });
        compiledSteps = compileDijkstraSteps(nodes, edges, res, sourceId, targetId);
      } else if (mode === 'DOMINATORS') {
        const res = await runAlgorithm(caseId, 'DOMINATORS', { rootNodeId: sourceId, targetNodeId: targetId });
        compiledSteps = compileDominatorSteps(nodes, edges, res, sourceId, targetId);
      } else if (mode === 'MIN_CUT') {
        const res = await runAlgorithm(caseId, 'MIN_CUT', { sourceNodeId: sourceId, sinkNodeId: targetId });
        compiledSteps = compileMinCutSteps(nodes, edges, res, sourceId, targetId);
      }

      setForensicSteps(compiledSteps);
      setCurrentStepIndex(0);
      setForensicMode(mode);
      setIsPlaying(false);
    } catch (e: any) {
      alert(`Simulation error: ${e.message}`);
    } finally {
      setIsModeLoading(false);
    }
  };

  const runLayout = (layoutName: string) => {
    const cy = cyRef.current;
    if (!cy) return;

    let layoutOptions: any = { name: layoutName, animate: true, animationDuration: 400 };

    if (layoutName === 'dagre') {
      layoutOptions = {
        name: 'dagre',
        rankDir: 'TB',
        nodeSep: 60,
        rankSep: 80,
        edgeSep: 40,
        padding: 50,
        animate: true,
        animationDuration: 400
      };
    } else if (layoutName === 'cose') {
      layoutOptions = {
        name: 'cose',
        animate: true,
        idealEdgeLength: 120,
        nodeOverlap: 40,
        padding: 50,
        randomize: false
      };
    }

    try {
      cy.layout(layoutOptions).run();
    } catch (e) {
      console.warn("Layout run fallback", e);
    }
  };

  const selectedNodeData = useMemo(() => {
    if (!selectedElement || selectedElement.type !== 'node') return null;
    return nodes.find(n => n.id === selectedElement.id) || null;
  }, [selectedElement, nodes]);

  const selectedEdgeData = useMemo(() => {
    if (!selectedElement || selectedElement.type !== 'edge') return null;
    return edges.find(e => e.id === selectedElement.id) || null;
  }, [selectedElement, edges]);

  return (
    <div className="relative w-full h-full overflow-hidden bg-slate-50 dark:bg-zinc-950">
      {/* Canvas viewport */}
      <div 
        ref={containerRef} 
        className={`w-full h-full ${isLight ? 'investigation-grid-light' : 'investigation-grid-dark'}`}
      />

      {/* Floating Modern HeroUI Floating Control Bar (Top Left) */}
      <div className="absolute top-4 left-4 z-20 flex items-center gap-2 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md p-1.5 rounded-2xl border border-slate-200/80 dark:border-zinc-800 shadow-sm">
        <Tooltip content="Zoom In">
          <Button
            isIconOnly
            size="sm"
            variant="light"
            radius="full"
            onPress={() => cyRef.current?.zoom(cyRef.current.zoom() * 1.25)}
          >
            <ZoomIn className="w-4 h-4 text-slate-700 dark:text-zinc-300" />
          </Button>
        </Tooltip>

        <Tooltip content="Zoom Out">
          <Button
            isIconOnly
            size="sm"
            variant="light"
            radius="full"
            onPress={() => cyRef.current?.zoom(cyRef.current.zoom() * 0.8)}
          >
            <ZoomOut className="w-4 h-4 text-slate-700 dark:text-zinc-300" />
          </Button>
        </Tooltip>

        <span className="text-[11px] font-mono font-medium text-slate-500 dark:text-zinc-400 px-1 select-none">
          {zoomLevel}%
        </span>

        <Tooltip content="Fit Graph to Screen">
          <Button
            isIconOnly
            size="sm"
            variant="light"
            radius="full"
            onPress={() => cyRef.current?.fit(undefined, 50)}
          >
            <Maximize2 className="w-4 h-4 text-slate-700 dark:text-zinc-300" />
          </Button>
        </Tooltip>

        <div className="w-[1px] h-4 bg-slate-200 dark:bg-zinc-800 mx-0.5" />

        <Dropdown>
          <DropdownTrigger>
            <Button
              size="sm"
              variant="flat"
              radius="lg"
              className="text-xs capitalize font-medium h-7 px-2.5"
              startContent={<Layers className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />}
            >
              Layout: {activeLayout}
            </Button>
          </DropdownTrigger>
          <DropdownMenu
            aria-label="Graph Layouts"
            selectedKeys={[activeLayout]}
            selectionMode="single"
            onSelectionChange={(keys) => {
              const val = Array.from(keys)[0] as any;
              if (val) {
                setActiveLayout(val);
                runLayout(val);
              }
            }}
          >
            <DropdownItem key="dagre">Dagre (Causal Hierarchy)</DropdownItem>
            <DropdownItem key="cose">CoSE (Physics Force)</DropdownItem>
            <DropdownItem key="concentric">Concentric (Centrality)</DropdownItem>
            <DropdownItem key="circle">Circle</DropdownItem>
          </DropdownMenu>
        </Dropdown>
      </div>

      {/* Top Center Investigation Mode Bar */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md p-1.5 rounded-2xl border border-slate-200/80 dark:border-zinc-800 shadow-sm">
        <Button
          size="sm"
          variant={forensicMode === 'NORMAL' ? 'solid' : 'light'}
          color={forensicMode === 'NORMAL' ? 'primary' : 'default'}
          radius="full"
          className="text-xs font-semibold h-7 px-3"
          onPress={() => handleSelectMode('NORMAL')}
        >
          Normal
        </Button>

        <Button
          size="sm"
          variant={forensicMode === 'CAUSAL_PATH' ? 'solid' : 'light'}
          color={forensicMode === 'CAUSAL_PATH' ? 'success' : 'default'}
          radius="full"
          className="text-xs font-semibold h-7 px-3"
          isLoading={isModeLoading && forensicMode === 'CAUSAL_PATH'}
          onPress={() => handleSelectMode('CAUSAL_PATH')}
        >
          ⚡ Causal Corridor
        </Button>

        <Button
          size="sm"
          variant={forensicMode === 'DOMINATORS' ? 'solid' : 'light'}
          color={forensicMode === 'DOMINATORS' ? 'danger' : 'default'}
          radius="full"
          className="text-xs font-semibold h-7 px-3"
          isLoading={isModeLoading && forensicMode === 'DOMINATORS'}
          onPress={() => handleSelectMode('DOMINATORS')}
        >
          🎯 Choke Points
        </Button>

        <Button
          size="sm"
          variant={forensicMode === 'MIN_CUT' ? 'solid' : 'light'}
          color={forensicMode === 'MIN_CUT' ? 'warning' : 'default'}
          radius="full"
          className="text-xs font-semibold h-7 px-3"
          isLoading={isModeLoading && forensicMode === 'MIN_CUT'}
          onPress={() => handleSelectMode('MIN_CUT')}
        >
          ✂️ Containment Cut
        </Button>
      </div>

      {/* Floating Mini Inspector Slide-over (Top Right) */}
      {(selectedNodeData || selectedEdgeData) && (
        <Card className="absolute top-4 right-4 z-30 w-80 shadow-xl border border-slate-200/80 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md animate-in fade-in slide-in-from-right-4">
          <CardBody className="p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <Chip
                  size="sm"
                  variant="flat"
                  color={
                    selectedNodeData?.category === 'ENTITY' ? 'success' :
                    selectedNodeData?.category === 'EVENT' ? 'warning' : 'primary'
                  }
                  className="font-semibold uppercase tracking-wider text-[10px] mb-1"
                >
                  {selectedNodeData ? selectedNodeData.category : 'RELATIONSHIP'}
                </Chip>
                <h4 className="font-bold text-sm text-slate-900 dark:text-zinc-100">
                  {selectedNodeData?.label || selectedEdgeData?.type}
                </h4>
              </div>
              <Button
                isIconOnly
                size="sm"
                variant="light"
                radius="full"
                onPress={() => onSelectElement(null)}
              >
                ✕
              </Button>
            </div>

            {selectedNodeData && (
              <div className="space-y-2 text-xs text-slate-600 dark:text-zinc-400">
                <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-zinc-800">
                  <span className="flex items-center gap-1.5"><Tag className="w-3.5 h-3.5 text-slate-400" /> Type</span>
                  <span className="font-semibold text-slate-800 dark:text-zinc-200">{selectedNodeData.type}</span>
                </div>
                {selectedNodeData.time?.start && (
                  <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-zinc-800">
                    <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-slate-400" /> Timestamp</span>
                    <span className="font-mono text-[11px] text-slate-800 dark:text-zinc-200">
                      {new Date(selectedNodeData.time.start).toLocaleTimeString()}
                    </span>
                  </div>
                )}
                <div className="pt-2 text-[11px] text-slate-500">
                  ID: <span className="font-mono text-slate-700 dark:text-zinc-300">{selectedNodeData.id}</span>
                </div>

                {onDeleteNode && (
                  <div className="pt-2 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-end">
                    <Button
                      size="sm"
                      color="danger"
                      variant="light"
                      className="text-xs h-7 px-2 font-medium"
                      startContent={<Trash2 className="w-3.5 h-3.5" />}
                      onPress={async () => {
                        if (confirm(`Delete node "${selectedNodeData.label}"?`)) {
                          await onDeleteNode(selectedNodeData.id);
                          onSelectElement(null);
                        }
                      }}
                    >
                      Delete Node
                    </Button>
                  </div>
                )}
              </div>
            )}

            {selectedEdgeData && (
              <div className="space-y-2 text-xs text-slate-600 dark:text-zinc-400">
                <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-zinc-800">
                  <span>Status</span>
                  <Chip size="sm" variant="dot" color="primary" className="text-[10px]">
                    {selectedEdgeData.status}
                  </Chip>
                </div>
                <div className="p-2 bg-slate-50 dark:bg-zinc-800/60 rounded-lg text-xs space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium text-slate-700 dark:text-zinc-300">{selectedEdgeData.source}</span>
                    <ArrowRight className="w-3 h-3 text-slate-400" />
                    <span className="font-medium text-slate-700 dark:text-zinc-300">{selectedEdgeData.target}</span>
                  </div>
                </div>

                {onDeleteEdge && (
                  <div className="pt-2 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-end">
                    <Button
                      size="sm"
                      color="danger"
                      variant="light"
                      className="text-xs h-7 px-2 font-medium"
                      startContent={<Trash2 className="w-3.5 h-3.5" />}
                      onPress={async () => {
                        if (confirm(`Delete relationship "${selectedEdgeData.type}"?`)) {
                          await onDeleteEdge(selectedEdgeData.id);
                          onSelectElement(null);
                        }
                      }}
                    >
                      Delete Relationship
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardBody>
        </Card>
      )}

      {/* Consolidated Bottom-Left Stats & Legend Popover */}
      <div className="absolute bottom-4 left-4 z-20 flex flex-col items-start gap-2">
        {/* Expandable Legend Popover */}
        {isLegendOpen && (
          <div className="bg-white/95 dark:bg-zinc-900/95 border border-slate-200/80 dark:border-zinc-800/80 rounded-2xl shadow-xl backdrop-blur-md p-3.5 text-xs space-y-2.5 min-w-[190px] animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-zinc-800">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">Forensic Graph Legend</span>
              <button onClick={() => setIsLegendOpen(false)} className="text-slate-400 hover:text-slate-600 text-xs font-bold">✕</button>
            </div>
            {[
              { color: 'bg-teal-500', label: 'Entity (Person/Org/Asset)' },
              { color: 'bg-amber-500', label: 'Event (Action/Occurrence)' },
              { color: 'bg-blue-500', label: 'Evidence (Document/Log)' },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${item.color}`} />
                <span className="text-slate-600 dark:text-zinc-400 font-medium leading-tight">{item.label}</span>
              </div>
            ))}
            <div className="border-t border-slate-100 dark:border-zinc-800 pt-2 space-y-1.5">
              {[
                { color: 'bg-indigo-400', label: 'Causal Link' },
                { color: 'bg-red-400', label: 'Contradiction' },
                { color: 'bg-emerald-400', label: 'Supports / Corroborates' },
              ].map(item => (
                <div key={item.label} className="flex items-center gap-2">
                  <span className={`w-4 h-0.5 shrink-0 ${item.color}`} />
                  <span className="text-slate-500 dark:text-zinc-500 text-[11px] leading-tight">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bottom-left pill */}
        <div className="flex items-center gap-2 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-slate-200/80 dark:border-zinc-800 shadow-sm text-xs text-slate-600 dark:text-zinc-400 font-medium">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-teal-500" />
            {nodes.length} Nodes
          </span>
          <span className="text-slate-300 dark:text-zinc-700">•</span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-indigo-500" />
            {edges.length} Relationships
          </span>
          <span className="text-slate-300 dark:text-zinc-700">•</span>
          <button
            onClick={() => setIsLegendOpen(!isLegendOpen)}
            className="text-[11px] font-semibold text-slate-700 dark:text-zinc-300 hover:text-teal-600 dark:hover:text-teal-400 transition-colors"
          >
            Legend {isLegendOpen ? '▴' : '▾'}
          </button>
        </div>
      </div>

      {/* Docked Forensic Telemetry Bar */}
      <ForensicTelemetryBar
        mode={forensicMode}
        currentStep={activeStep || null}
        currentStepIndex={currentStepIndex}
        totalSteps={forensicSteps.length}
        isPlaying={isPlaying}
        playbackSpeed={playbackSpeed}
        isSevered={isSevered}
        onTogglePlay={() => setIsPlaying(!isPlaying)}
        onStepBack={() => setCurrentStepIndex(prev => Math.max(0, prev - 1))}
        onStepForward={() => setCurrentStepIndex(prev => Math.min(forensicSteps.length - 1, prev + 1))}
        onToggleSpeed={() => setPlaybackSpeed(s => s === 1 ? 2 : 1)}
        onToggleSever={() => setIsSevered(!isSevered)}
        onClose={() => handleSelectMode('NORMAL')}
      />
    </div>
  );
};

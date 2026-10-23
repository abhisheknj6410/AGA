"use client";

import React, { useEffect, useRef, useState, useMemo } from 'react';
import cytoscape, { Core, EventObject } from 'cytoscape';
import dagre from 'cytoscape-dagre';
import { GraphNode, GraphEdge, Case } from '../../types/graph';
import { CaseBriefingDrawer } from '../briefing/CaseBriefingDrawer';
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
  Check,
  Zap,
  Target,
  Scissors,
  X,
  ChevronUp,
  ChevronDown,
  FileText
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
  currentCase?: Case | null;
  onNavigateToChat?: () => void;
}

export const CytoscapeCanvas: React.FC<CytoscapeCanvasProps> = ({
  caseId,
  currentCase = null,
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
  simulationState = null,
  onNavigateToChat
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);
  const [activeLayout, setActiveLayout] = useState<'dagre' | 'cose' | 'concentric' | 'circle'>(layoutType);
  const [isBriefingOpen, setIsBriefingOpen] = useState(false);
  const [hoveredElement, setHoveredElement] = useState<{
    type: 'node' | 'edge';
    id: string;
    x: number;
    y: number;
  } | null>(null);
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
  const [loadingMode, setLoadingMode] = useState<ForensicMode | null>(null);
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
        // Distinct Alibi Node Accent
        {
          selector: 'node[isAlibi = "true"]',
          style: {
            'border-color': '#059669',
            'border-width': 3,
            'background-color': isLight ? '#ecfdf5' : '#064e3b',
            'color': isLight ? '#065f46' : '#a7f3d0'
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
        // Algorithm Highlight Overlays (Refined Forensic Focus)
        {
          selector: '.algorithm-highlighted-node',
          style: {
            'border-color': isLight ? '#0284c7' : '#38bdf8',
            'border-width': 2.5,
            'shadow-blur': 16,
            'shadow-color': isLight ? 'rgba(2, 132, 199, 0.35)' : 'rgba(56, 189, 248, 0.45)',
            'font-weight': 700
          }
        },
        {
          selector: '.algorithm-highlighted-edge',
          style: {
            'width': 2.75,
            'line-color': isLight ? '#0284c7' : '#38bdf8',
            'target-arrow-color': isLight ? '#0284c7' : '#38bdf8',
            'shadow-blur': 10,
            'shadow-color': isLight ? 'rgba(2, 132, 199, 0.35)' : 'rgba(56, 189, 248, 0.45)',
            'opacity': 1
          }
        },
        {
          selector: '.dimmed',
          style: {
            'opacity': 0.45
          }
        },
        // Interactive Algorithm Simulation Classes
        {
          selector: '.sim-frontier-node',
          style: {
            'border-color': isLight ? '#0284c7' : '#38bdf8',
            'border-width': 2.5,
            'shadow-blur': 16,
            'shadow-color': isLight ? 'rgba(2, 132, 199, 0.4)' : 'rgba(56, 189, 248, 0.5)',
            'background-color': isLight ? '#f0f9ff' : '#0c2a4a',
            'color': isLight ? '#0369a1' : '#e0f2fe'
          }
        },
        {
          selector: '.sim-visited-node',
          style: {
            'border-color': isLight ? '#059669' : '#10b981',
            'border-width': 2,
            'shadow-blur': 12,
            'shadow-color': isLight ? 'rgba(5, 150, 105, 0.3)' : 'rgba(16, 185, 129, 0.4)',
            'background-color': isLight ? '#f0fdf4' : '#063f2e',
            'color': isLight ? '#047857' : '#a7f3d0'
          }
        },
        {
          selector: '.sim-choke-node',
          style: {
            'border-color': isLight ? '#e11d48' : '#f43f5e',
            'border-width': 2.5,
            'shadow-blur': 16,
            'shadow-color': isLight ? 'rgba(225, 29, 72, 0.4)' : 'rgba(244, 63, 94, 0.5)',
            'background-color': isLight ? '#fff1f2' : '#4c0519',
            'color': isLight ? '#be123c' : '#fecdd3'
          }
        },
        {
          selector: '.sim-severed-node',
          style: {
            'opacity': 0.35,
            'border-style': 'dashed',
            'border-color': isLight ? '#e11d48' : '#f43f5e',
            'background-color': isLight ? '#f8fafc' : '#18181b'
          }
        },
        {
          selector: '.sim-path-edge',
          style: {
            'width': 2.75,
            'line-color': isLight ? '#059669' : '#10b981',
            'target-arrow-color': isLight ? '#059669' : '#10b981',
            'shadow-blur': 10,
            'shadow-color': isLight ? 'rgba(5, 150, 105, 0.3)' : 'rgba(16, 185, 129, 0.4)',
            'opacity': 1
          }
        },
        {
          selector: '.sim-cut-edge',
          style: {
            'width': 2.5,
            'line-style': 'dashed',
            'line-dash-pattern': [6, 4],
            'line-color': isLight ? '#e11d48' : '#f43f5e',
            'target-arrow-color': isLight ? '#e11d48' : '#f43f5e',
            'shadow-blur': 10,
            'shadow-color': isLight ? 'rgba(225, 29, 72, 0.4)' : 'rgba(244, 63, 94, 0.5)',
            'opacity': 1
          }
        },
        {
          selector: '.sim-source-partition',
          style: {
            'border-color': '#0284c7',
            'border-width': 2,
            'background-color': isLight ? '#e0f2fe' : '#082f49',
            'color': isLight ? '#0369a1' : '#bae6fd'
          }
        },
        {
          selector: '.sim-target-partition',
          style: {
            'border-color': '#7c3aed',
            'border-width': 2,
            'background-color': isLight ? '#f5f3ff' : '#2e1065',
            'color': isLight ? '#6d28d9' : '#ddd6fe'
          }
        },
        {
          selector: '.sim-dimmed',
          style: {
            'opacity': 0.45
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

    cy.on('mouseover', 'node', (evt: EventObject) => {
      const node = evt.target;
      const pos = node.renderedPosition();
      setHoveredElement({
        type: 'node',
        id: node.id(),
        x: pos.x,
        y: pos.y
      });
    });

    cy.on('mouseout', 'node', () => {
      setHoveredElement(null);
    });

    cy.on('mouseover', 'edge', (evt: EventObject) => {
      const edge = evt.target;
      const midpoint = edge.renderedMidpoint();
      setHoveredElement({
        type: 'edge',
        id: edge.id(),
        x: midpoint.x,
        y: midpoint.y
      });
    });

    cy.on('mouseout', 'edge', () => {
      setHoveredElement(null);
    });

    cy.on('pan zoom', () => {
      setHoveredElement(null);
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
        const isAlibi = n.label.toLowerCase().includes('alibi') ||
                        n.id.toLowerCase().includes('alibi') ||
                        Boolean(n.properties?.alibi) ||
                        Boolean(n.properties?.verifiedBy);
        elements.push({
          group: 'nodes',
          data: {
            id: n.id,
            label: isAlibi && !n.label.includes('ALIBI') ? `🛡️ [ALIBI] ${n.label}` : n.label,
            category: n.category,
            type: n.type,
            time: n.time,
            isAlibi: isAlibi ? 'true' : 'false'
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
  }, [nodes, edges, activeLayout, isLight]);

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
  }, [highlightNodeIds, highlightEdgeIds, isLight]);

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
    setLoadingMode(mode);
    setIsSevered(false);
    try {
      const { sourceId, targetId } = detectCandidatePair(
        nodes,
        edges,
        selectedElement?.type === 'node' ? selectedElement.id : undefined
      );
      if (!sourceId || !targetId) {
        alert("At least 2 nodes are required to trace causal corridors.");
        return;
      }

      let compiledSteps: ForensicStep[] = [];

      if (mode === 'CAUSAL_PATH') {
        const res = await runAlgorithm(caseId, 'DIJKSTRA', {
          sourceId,
          targetId,
          sourceNodeId: sourceId,
          targetNodeId: targetId
        });
        compiledSteps = compileDijkstraSteps(nodes, edges, res?.output || res, sourceId, targetId);
      } else if (mode === 'DOMINATORS') {
        const res = await runAlgorithm(caseId, 'DOMINATORS', {
          rootId: sourceId,
          targetId,
          rootNodeId: sourceId,
          targetNodeId: targetId
        });
        compiledSteps = compileDominatorSteps(nodes, edges, res?.output || res, sourceId, targetId);
      } else if (mode === 'MIN_CUT') {
        const res = await runAlgorithm(caseId, 'MIN_CUT', {
          sourceId,
          targetId,
          sourceNodeId: sourceId,
          sinkNodeId: targetId
        });
        compiledSteps = compileMinCutSteps(nodes, edges, res?.output || res, sourceId, targetId);
      }

      setForensicSteps(compiledSteps);
      setCurrentStepIndex(0);
      setForensicMode(mode);
      setIsPlaying(compiledSteps.length > 1);
    } catch (e: any) {
      alert(`Simulation error: ${e.message}`);
    } finally {
      setIsModeLoading(false);
      setLoadingMode(null);
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

  const hoveredNodeData = useMemo(() => {
    if (!hoveredElement || hoveredElement.type !== 'node') return null;
    return nodes.find(n => n.id === hoveredElement.id) || null;
  }, [hoveredElement, nodes]);

  const hoveredEdgeData = useMemo(() => {
    if (!hoveredElement || hoveredElement.type !== 'edge') return null;
    return edges.find(e => e.id === hoveredElement.id) || null;
  }, [hoveredElement, edges]);

  const getNodeForensicExplanation = (node: GraphNode): { status: string; note: string; color: 'success' | 'warning' | 'danger' | 'primary' } => {
    const label = node.label.toLowerCase();
    const role = (node.properties?.role || '').toLowerCase();

    if (node.category === 'ENTITY') {
      if (label.includes('bob')) {
        return {
          status: 'CLEARED (VERIFIED ALIBI)',
          note: 'Bob was logged on CCTV cleaning the 1st floor at 10:00 AM. Zero physical path to 4th floor.',
          color: 'success'
        };
      }
      if (label.includes('alice')) {
        return {
          status: 'PRIME SUSPECT',
          note: 'Alice swiped into Room 404 at 10:02 AM right before laptop disappeared. Unbroken causal corridor.',
          color: 'danger'
        };
      }
      if (label.includes('laptop') || label.includes('thinkpad')) {
        return {
          status: 'STOLEN ASSET',
          note: 'Target of theft from Room 404. Last access event connected directly to Alice.',
          color: 'warning'
        };
      }
      if (label.includes('room 404')) {
        return {
          status: 'CRIME SCENE',
          note: 'Executive office requiring keycard credential access. Choke point for asset containment.',
          color: 'primary'
        };
      }
      if (label.includes('viktor')) {
        return {
          status: 'PRIMARY HEIST LEAD',
          note: 'Breach leader identified via North Gate telemetry and DNA on cut padlock.',
          color: 'danger'
        };
      }
      return {
        status: node.type,
        note: role ? `Role: ${role}. Recorded entity in case graph.` : `${node.type} recorded in case graph.`,
        color: 'primary'
      };
    }

    if (node.category === 'EVENT') {
      if (label.includes('alibi') || label.includes('hallway')) {
        return {
          status: 'EXCULPATORY ALIBI',
          note: 'Confirmed by camera feed. Severes reachability between suspect and crime scene.',
          color: 'success'
        };
      }
      if (label.includes('badge') || label.includes('swipes') || label.includes('enters')) {
        return {
          status: 'ACCESS CHOKE POINT',
          note: 'Required bottleneck event. Without this keycard event, theft is physically impossible.',
          color: 'warning'
        };
      }
      if (label.includes('takes') || label.includes('theft') || label.includes('breach')) {
        return {
          status: 'INCIDENT OUTCOME',
          note: 'Direct action resulting in asset exfiltration or security violation.',
          color: 'danger'
        };
      }
      return {
        status: node.type,
        note: `Event recorded at ${node.time?.start || 'unspecified time'}.`,
        color: 'warning'
      };
    }

    return {
      status: 'VERIFIED EVIDENCE',
      note: `Custody artifact from ${(node as any).source?.name || 'sensor'}. 100% cryptographic reliability.`,
      color: 'primary'
    };
  };

  const handleFindAlibi = () => {
    const alibiNodes = nodes.filter(n =>
      n.label.toLowerCase().includes('alibi') ||
      n.id.toLowerCase().includes('alibi') ||
      Boolean(n.properties?.alibi) ||
      Boolean(n.properties?.verifiedBy)
    );
    if (alibiNodes.length === 0) {
      alert("No alibi recorded in this active case.\n\nPlease select 'The Stolen CEO Laptop' (Bob's Alibi) or 'Operation Grand Meridian' (Diner Alibi) from the top-left case dropdown.");
      return;
    }
    const target = alibiNodes[0];
    onSelectElement({ type: 'node', id: target.id });
    if (cyRef.current) {
      const cyEle = cyRef.current.$id(target.id);
      if (cyEle.length > 0) {
        cyRef.current.animate({
          center: { eles: cyEle },
          zoom: 1.25
        }, { duration: 400 });
      }
    }
  };

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

        <div className="w-[1px] h-4 bg-slate-200 dark:bg-zinc-800 mx-0.5" />

        <Button
          size="sm"
          variant="flat"
          radius="lg"
          color="primary"
          className="text-xs font-semibold h-7 px-2.5 bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300 border border-teal-200/60 dark:border-teal-800/60"
          startContent={<FileText className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />}
          onPress={() => setIsBriefingOpen(true)}
          title="Open Case Briefing & Suspect Dossier"
        >
          Case Briefing
        </Button>
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
          Overview
        </Button>

        <Button
          size="sm"
          variant={forensicMode === 'CAUSAL_PATH' ? 'solid' : 'light'}
          color={forensicMode === 'CAUSAL_PATH' ? 'success' : 'default'}
          radius="full"
          className="text-xs font-semibold h-7 px-3"
          isLoading={isModeLoading && loadingMode === 'CAUSAL_PATH'}
          startContent={<Zap className="w-3.5 h-3.5" />}
          onPress={() => handleSelectMode('CAUSAL_PATH')}
        >
          Most Likely Route
        </Button>

        <Button
          size="sm"
          variant={forensicMode === 'DOMINATORS' ? 'solid' : 'light'}
          color={forensicMode === 'DOMINATORS' ? 'danger' : 'default'}
          radius="full"
          className="text-xs font-semibold h-7 px-3"
          isLoading={isModeLoading && loadingMode === 'DOMINATORS'}
          startContent={<Target className="w-3.5 h-3.5" />}
          onPress={() => handleSelectMode('DOMINATORS')}
        >
          Bottlenecks
        </Button>

        <Button
          size="sm"
          variant={forensicMode === 'MIN_CUT' ? 'solid' : 'light'}
          color={forensicMode === 'MIN_CUT' ? 'warning' : 'default'}
          radius="full"
          className="text-xs font-semibold h-7 px-3"
          isLoading={isModeLoading && loadingMode === 'MIN_CUT'}
          startContent={<Scissors className="w-3.5 h-3.5" />}
          onPress={() => handleSelectMode('MIN_CUT')}
        >
          Perimeter Barriers
        </Button>

        <div className="w-[1px] h-4 bg-slate-200 dark:bg-zinc-800 mx-0.5" />

        <Button
          size="sm"
          variant="flat"
          color="success"
          radius="full"
          className="text-xs font-semibold h-7 px-3 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60"
          startContent={<ShieldAlert className="w-3.5 h-3.5 text-emerald-600" />}
          onPress={handleFindAlibi}
          title="Zoom directly to the suspect alibi in this case"
        >
          🛡️ Find Alibi
        </Button>
      </div>

      {/* Floating Mini Inspector Slide-over (Top Right) */}
      {(selectedNodeData || selectedEdgeData) && (
        <Card className="absolute top-4 right-4 z-30 w-80 shadow-xl border border-slate-200/80 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md animate-in fade-in slide-in-from-right-4">
          <CardBody className="p-4 space-y-3">
            {selectedNodeData && (selectedNodeData.label?.toLowerCase().includes('alibi') || selectedNodeData.id?.toLowerCase().includes('alibi') || selectedNodeData.properties?.verifiedBy) && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-xl space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                  <ShieldAlert className="w-4 h-4 text-emerald-600" />
                  <span>SUSPECT ALIBI RECORD</span>
                </div>
                <p className="text-[11px] text-emerald-800 dark:text-emerald-200 leading-snug">
                  {selectedNodeData.properties?.verifiedBy ? `Verified by ${selectedNodeData.properties.verifiedBy}. Isolates suspect from crime location.` : 'Claimed alibi timeline event recorded for case evaluation.'}
                </p>
              </div>
            )}
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
                <X className="w-3.5 h-3.5" />
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
              <button
                onClick={() => setIsLegendOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors p-0.5 rounded"
                aria-label="Close legend"
              >
                <X className="w-3.5 h-3.5" />
              </button>
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
            className="text-[11px] font-semibold text-slate-700 dark:text-zinc-300 hover:text-teal-600 dark:hover:text-teal-400 transition-colors inline-flex items-center gap-1"
          >
            Legend {isLegendOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
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

      {/* Dynamic Hover Tooltip for Nodes and Edges */}
      {hoveredElement && (hoveredNodeData || hoveredEdgeData) && (
        <div
          style={{
            left: Math.min(Math.max(16, hoveredElement.x + 16), typeof window !== 'undefined' ? window.innerWidth - 320 : 800),
            top: Math.max(70, Math.min(hoveredElement.y - 20, typeof window !== 'undefined' ? window.innerHeight - 240 : 600))
          }}
          className="absolute z-40 pointer-events-none w-72 rounded-2xl p-3.5 shadow-2xl bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border border-teal-500/30 text-xs animate-in fade-in zoom-in-95 duration-150 space-y-2"
        >
          {hoveredNodeData ? (
            <>
              <div className="flex items-center justify-between">
                <Chip
                  size="sm"
                  variant="flat"
                  color={
                    hoveredNodeData.category === 'ENTITY' ? 'success' :
                    hoveredNodeData.category === 'EVENT' ? 'warning' : 'primary'
                  }
                  className="text-[9px] font-bold uppercase tracking-wider h-4 px-1"
                >
                  {hoveredNodeData.category}: {hoveredNodeData.type}
                </Chip>
                {hoveredNodeData.time?.start && (
                  <span className="text-[10px] text-teal-600 dark:text-teal-400 font-mono">
                    {new Date(hoveredNodeData.time.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                )}
              </div>

              <div>
                <h4 className="font-bold text-xs text-slate-900 dark:text-zinc-100">
                  {hoveredNodeData.label}
                </h4>
              </div>

              {(() => {
                const exp = getNodeForensicExplanation(hoveredNodeData);
                return (
                  <div className="p-2 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200/60 dark:border-zinc-700/60 text-[11px] leading-relaxed">
                    <span className="font-semibold block mb-0.5 text-teal-600 dark:text-teal-400">
                      {exp.status}
                    </span>
                    <span className="text-slate-600 dark:text-zinc-300">
                      {exp.note}
                    </span>
                  </div>
                );
              })()}
            </>
          ) : hoveredEdgeData ? (
            <>
              <div className="flex items-center justify-between">
                <Chip size="sm" variant="flat" color="secondary" className="text-[9px] font-bold h-4 px-1">
                  RELATIONSHIP: {hoveredEdgeData.type}
                </Chip>
                <span className="text-[10px] text-slate-400">
                  Cost: {hoveredEdgeData.cost || 1.0}
                </span>
              </div>

              <div className="text-[11px] text-slate-700 dark:text-zinc-200 font-medium">
                {nodes.find(n => n.id === hoveredEdgeData.source)?.label || hoveredEdgeData.source}
                <span className="text-teal-500 font-bold mx-1.5">→</span>
                {nodes.find(n => n.id === hoveredEdgeData.target)?.label || hoveredEdgeData.target}
              </div>

              <div className="text-[10px] text-slate-500 bg-slate-50 dark:bg-zinc-800/50 p-1.5 rounded-lg border border-slate-200/60 dark:border-zinc-700/60">
                {hoveredEdgeData.evidenceRefs && hoveredEdgeData.evidenceRefs.length > 0
                  ? `Verified by: ${hoveredEdgeData.evidenceRefs.map(id => nodes.find(n => n.id === id)?.label || id).join(', ')}`
                  : 'Direct topological dependency'}
              </div>
            </>
          ) : null}
        </div>
      )}

      {/* Slide-out Case Briefing & Dossier Drawer */}
      <CaseBriefingDrawer
        isOpen={isBriefingOpen}
        onClose={() => setIsBriefingOpen(false)}
        currentCase={currentCase}
        nodes={nodes}
        edges={edges}
        onNavigateToChat={onNavigateToChat}
        onNavigateToAlgorithm={handleSelectMode}
      />
    </div>
  );
};

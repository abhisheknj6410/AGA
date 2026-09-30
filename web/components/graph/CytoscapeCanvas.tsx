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
  ArrowRight
} from 'lucide-react';

if (typeof window !== 'undefined') {
  try {
    cytoscape.use(dagre);
  } catch (e) {
    // Already registered
  }
}

interface CytoscapeCanvasProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  selectedElement: { type: 'node' | 'edge'; id: string } | null;
  onSelectElement: (element: { type: 'node' | 'edge'; id: string } | null) => void;
  layoutType?: 'dagre' | 'cose' | 'concentric' | 'circle';
  theme?: 'light' | 'dark';
  highlightNodeIds?: string[];
  highlightEdgeIds?: string[];
}

export const CytoscapeCanvas: React.FC<CytoscapeCanvasProps> = ({
  nodes,
  edges,
  selectedElement,
  onSelectElement,
  layoutType = 'dagre',
  theme = 'light',
  highlightNodeIds = [],
  highlightEdgeIds = []
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);
  const [activeLayout, setActiveLayout] = useState<'dagre' | 'cose' | 'concentric' | 'circle'>(layoutType);
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [neighborhoodMode, setNeighborhoodMode] = useState<boolean>(false);

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

      {/* Floating Graph Stats (Bottom Left) */}
      <div className="absolute bottom-4 left-4 z-20 flex items-center gap-2 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-slate-200/80 dark:border-zinc-800 text-xs text-slate-600 dark:text-zinc-400 font-medium">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-teal-500" />
          {nodes.length} Nodes
        </span>
        <span className="text-slate-300 dark:text-zinc-700">•</span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-indigo-500" />
          {edges.length} Directed Relationships
        </span>
        {highlightNodeIds.length > 0 && (
          <>
            <span className="text-slate-300 dark:text-zinc-700">•</span>
            <Chip size="sm" color="danger" variant="flat" className="h-5 text-[10px]">
              Algorithm Trace Active ({highlightNodeIds.length})
            </Chip>
          </>
        )}
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
              </div>
            )}
          </CardBody>
        </Card>
      )}
    </div>
  );
};

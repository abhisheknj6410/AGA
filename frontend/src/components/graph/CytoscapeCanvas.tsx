import React, { useEffect, useRef, useState } from 'react';
import cytoscape, { Core, EventObject } from 'cytoscape';
import dagre from 'cytoscape-dagre';
import { GraphNode, GraphEdge } from '../../types/graph';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Crosshair,
  Layers
} from 'lucide-react';

cytoscape.use(dagre);

interface CytoscapeCanvasProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  selectedElement: { type: 'node' | 'edge'; id: string } | null;
  onSelectElement: (element: { type: 'node' | 'edge'; id: string } | null) => void;
  layoutType: 'dagre' | 'cose' | 'concentric' | 'circle';
  theme: 'light' | 'dark';
}

export const CytoscapeCanvas: React.FC<CytoscapeCanvasProps> = ({
  nodes,
  edges,
  selectedElement,
  onSelectElement,
  layoutType,
  theme
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);
  const [neighborhoodMode, setNeighborhoodMode] = useState<boolean>(false);
  const [currentZoom, setCurrentZoom] = useState<number>(100);

  // Initialize Cytoscape Instance
  useEffect(() => {
    if (!containerRef.current) return;

    const isLight = theme === 'light';

    const cy = cytoscape({
      container: containerRef.current,
      boxSelectionEnabled: false,
      autounselectify: false,
      style: ([
        // Base Node Style - Figma-grade card
        {
          selector: 'node',
          style: {
            'label': 'data(label)',
            'font-family': 'Inter, system-ui, -apple-system, sans-serif',
            'font-size': '11.5px',
            'font-weight': 600,
            'text-valign': 'center',
            'text-halign': 'center',
            'color': isLight ? '#0f172a' : '#f8fafc',
            'text-wrap': 'wrap',
            'text-max-width': '190px',
            'line-height': 1.35,
            'border-width': '1.5px',
            'border-color': isLight ? '#cbd5e1' : '#334155',
            'background-color': isLight ? '#ffffff' : '#1e293b',
            'width': '210px',
            'height': '62px',
            'shape': 'round-rectangle',
            'corner-radius': 8,
            'shadow-blur': 6,
            'shadow-color': isLight ? 'rgba(15, 23, 42, 0.06)' : 'rgba(0, 0, 0, 0.35)',
            'shadow-opacity': 1,
            'shadow-offset-y': 2,
            'transition-property': 'background-color, border-color, width, height, opacity, shadow-blur',
            'transition-duration': 0.15
          }
        },
        // Entity Nodes
        {
          selector: 'node[category = "ENTITY"]',
          style: {
            'background-color': isLight ? '#ffffff' : '#1e293b',
            'border-color': isLight ? '#cbd5e1' : '#334155',
            'color': isLight ? '#0f172a' : '#f8fafc'
          }
        },
        // Event Nodes (Warm Amber sand)
        {
          selector: 'node[category = "EVENT"]',
          style: {
            'background-color': isLight ? '#fffbeb' : '#261b0c',
            'border-color': isLight ? '#f59e0b' : '#b45309',
            'border-width': '1.75px',
            'color': isLight ? '#78350f' : '#fef3c7'
          }
        },
        // Evidence Nodes (Mint Sage)
        {
          selector: 'node[category = "EVIDENCE"]',
          style: {
            'background-color': isLight ? '#f0fdf4' : '#082517',
            'border-color': isLight ? '#10b981' : '#059669',
            'border-width': '1.75px',
            'color': isLight ? '#065f46' : '#a7f3d0'
          }
        },
        // Selected Node
        {
          selector: 'node:selected',
          style: {
            'border-color': '#4f46e5',
            'border-width': '2.5px',
            'shadow-blur': 16,
            'shadow-color': isLight ? 'rgba(79, 70, 229, 0.35)' : 'rgba(99, 102, 241, 0.5)',
            'shadow-opacity': 1,
            'shadow-offset-y': 3
          }
        },
        // Base Edge Style
        {
          selector: 'edge',
          style: {
            'curve-style': 'bezier',
            'target-arrow-shape': 'triangle',
            'arrow-scale': 0.85,
            'label': 'data(label)',
            'font-family': 'Inter, system-ui, -apple-system, sans-serif',
            'font-size': '9.5px',
            'font-weight': 500,
            'color': isLight ? '#64748b' : '#94a3b8',
            'text-background-opacity': 0.95,
            'text-background-color': isLight ? '#ffffff' : '#0f172a',
            'text-background-padding': '4px',
            'text-background-shape': 'roundrectangle',
            'text-rotation': 'autorotate',
            'width': 1.6,
            'line-color': isLight ? '#cbd5e1' : '#475569',
            'target-arrow-color': isLight ? '#cbd5e1' : '#475569'
          }
        },
        // Observed Edge
        {
          selector: 'edge[status = "OBSERVED"]',
          style: {
            'line-color': isLight ? '#6366f1' : '#818cf8',
            'target-arrow-color': isLight ? '#6366f1' : '#818cf8',
            'line-style': 'solid',
            'width': 1.8
          }
        },
        // Derived Edge
        {
          selector: 'edge[status = "DERIVED"]',
          style: {
            'line-color': isLight ? '#8b5cf6' : '#a78bfa',
            'target-arrow-color': isLight ? '#8b5cf6' : '#a78bfa',
            'line-style': 'dashed',
            'line-dash-pattern': [5, 3],
            'width': 1.8
          }
        },
        // Hypothesized Edge
        {
          selector: 'edge[status = "HYPOTHESIZED"]',
          style: {
            'line-color': isLight ? '#f59e0b' : '#fbbf24',
            'target-arrow-color': isLight ? '#f59e0b' : '#fbbf24',
            'line-style': 'dotted',
            'width': 2
          }
        },
        // Contradicts Edge
        {
          selector: 'edge[type = "CONTRADICTS"]',
          style: {
            'line-color': '#ef4444',
            'target-arrow-color': '#ef4444',
            'width': 2.5,
            'line-style': 'solid'
          }
        },
        // Selected Edge
        {
          selector: 'edge:selected',
          style: {
            'line-color': '#4f46e5',
            'target-arrow-color': '#4f46e5',
            'width': 2.8,
            'text-background-color': '#4f46e5',
            'color': '#ffffff'
          }
        },
        // Neighborhood Dimmed Class
        {
          selector: '.dimmed',
          style: {
            'opacity': 0.12
          }
        },
        // Neighborhood Highlighted Class
        {
          selector: '.highlighted',
          style: {
            'opacity': 1.0,
            'shadow-blur': 12,
            'shadow-opacity': 0.4
          }
        }
      ] as any)
    });

    // Event Handlers
    cy.on('tap', 'node', (evt: EventObject) => {
      const node = evt.target;
      onSelectElement({ type: 'node', id: node.id() });
    });

    cy.on('tap', 'edge', (evt: EventObject) => {
      const edge = evt.target;
      onSelectElement({ type: 'edge', id: edge.id() });
    });

    cy.on('tap', (evt: EventObject) => {
      if (evt.target === cy) {
        onSelectElement(null);
      }
    });

    cy.on('zoom', () => {
      setCurrentZoom(Math.round(cy.zoom() * 100));
    });

    cyRef.current = cy;

    return () => {
      cy.destroy();
      cyRef.current = null;
    };
  }, [theme]);

  // Update elements and apply layout
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;

    cy.elements().remove();

    const getNodeIcon = (category: string, type: string) => {
      if (category === 'EVENT') return '⚡';
      if (category === 'EVIDENCE') return '🛡️';
      switch (type) {
        case 'PERSON': return '👤';
        case 'SERVER': return '🖥️';
        case 'IP_ADDRESS': return '🌐';
        case 'FILE': return '📁';
        case 'CREDENTIAL': return '🔑';
        case 'ORGANIZATION': return '🏢';
        case 'DEVICE': return '💻';
        case 'DATABASE': return '🗄️';
        case 'DOMAIN': return '🌍';
        case 'EMAIL_ACCOUNT': return '✉️';
        default: return '📍';
      }
    };

    const cyNodes = nodes.map(n => {
      const icon = getNodeIcon(n.category, n.type);
      let subtitle = n.type.replace(/_/g, ' ');
      if (n.category === 'EVENT' && n.time?.start) {
        try {
          const d = new Date(n.time.start);
          subtitle = `${d.toISOString().substring(11, 16)} UTC · ${n.type.replace(/_/g, ' ')}`;
        } catch {
          subtitle = n.type.replace(/_/g, ' ');
        }
      } else if (n.category === 'EVIDENCE' && n.reliability !== undefined) {
        subtitle = `Reliability ${(n.reliability * 100).toFixed(0)}% · ${n.type.replace(/_/g, ' ')}`;
      }

      // 2-line layout: icon + name on line 1, subtitle on line 2
      const formattedLabel = `${icon}  ${n.label}\n${subtitle}`;

      return {
        group: 'nodes' as const,
        data: {
          id: n.id,
          label: formattedLabel,
          category: n.category,
          type: n.type
        }
      };
    });

    const cyEdges = edges.map(e => ({
      group: 'edges' as const,
      data: {
        id: e.id,
        source: e.source,
        target: e.target,
        label: e.type.toLowerCase().replace(/_/g, ' '),
        type: e.type,
        status: e.status
      }
    }));

    cy.add([...cyNodes, ...cyEdges]);

    // Apply layout
    let layoutOptions: any;
    if (layoutType === 'dagre') {
      layoutOptions = {
        name: 'dagre',
        rankDir: 'LR',
        nodeSep: 65,
        rankSep: 110,
        edgeSep: 35,
        padding: 60
      };
    } else if (layoutType === 'cose') {
      layoutOptions = {
        name: 'cose',
        animate: false,
        nodeRepulsion: 9500,
        idealEdgeLength: 140,
        gravity: 0.2,
        padding: 60
      };
    } else {
      layoutOptions = {
        name: layoutType,
        padding: 60
      };
    }

    const layout = cy.layout(layoutOptions);
    layout.run();
    cy.fit(undefined, 50);
    setCurrentZoom(Math.round(cy.zoom() * 100));
  }, [nodes, edges, layoutType]);

  // Sync selected element
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;

    cy.elements().unselect();

    if (selectedElement) {
      const el = cy.getElementById(selectedElement.id);
      if (el.length > 0) {
        el.select();

        if (neighborhoodMode && selectedElement.type === 'node') {
          const neighborhood = el.neighborhood().add(el);
          cy.elements().addClass('dimmed').removeClass('highlighted');
          neighborhood.removeClass('dimmed').addClass('highlighted');
        } else {
          cy.elements().removeClass('dimmed').removeClass('highlighted');
        }
      }
    } else {
      cy.elements().removeClass('dimmed').removeClass('highlighted');
    }
  }, [selectedElement, neighborhoodMode]);

  // Controls
  const handleZoomIn = () => cyRef.current?.zoom(cyRef.current.zoom() * 1.25);
  const handleZoomOut = () => cyRef.current?.zoom(cyRef.current.zoom() * 0.8);
  const handleFit = () => {
    cyRef.current?.fit(undefined, 50);
    setCurrentZoom(Math.round((cyRef.current?.zoom() || 1) * 100));
  };
  const handleToggleNeighborhood = () => {
    setNeighborhoodMode(prev => !prev);
  };

  return (
    <div
      className={`relative w-full h-full select-none ${
        theme === 'light' ? 'canvas-grid-light' : 'canvas-grid-dark'
      }`}
    >
      <div ref={containerRef} className="w-full h-full" />

      {/* Floating Bottom-Right Minimal Navigation Controls */}
      <div className="absolute bottom-4 right-4 z-10 flex items-center bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm p-1 text-slate-600 dark:text-slate-300">
        <button
          onClick={handleZoomOut}
          title="Zoom Out"
          className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition"
        >
          <ZoomOut className="w-4 h-4" />
        </button>

        <span className="px-2 text-[11px] font-mono font-medium text-slate-500 min-w-[42px] text-center">
          {currentZoom}%
        </span>

        <button
          onClick={handleZoomIn}
          title="Zoom In"
          className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition"
        >
          <ZoomIn className="w-4 h-4" />
        </button>

        <div className="h-4 w-[1px] bg-slate-200 dark:bg-slate-800 mx-1" />

        <button
          onClick={handleFit}
          title="Fit View"
          className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition"
        >
          <Maximize2 className="w-4 h-4" />
        </button>

        <button
          onClick={handleToggleNeighborhood}
          title="Toggle 1-Hop Neighborhood Isolation"
          className={`p-1.5 rounded-md transition ${
            neighborhoodMode
              ? 'bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-bold'
              : 'hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Crosshair className="w-4 h-4" />
        </button>
      </div>

      {/* Floating Bottom-Left Minimal Discrete Legend */}
      <div className="absolute bottom-4 left-4 z-10 hidden sm:flex items-center gap-3 px-3 py-1.5 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200 dark:border-slate-800/80 rounded-lg shadow-xs text-[11px] text-slate-600 dark:text-slate-400 font-medium">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-white dark:bg-slate-800 border border-slate-400" />
          <span>Entity</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-amber-100 dark:bg-amber-950 border border-amber-500" />
          <span>Event</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-emerald-100 dark:bg-emerald-950 border border-emerald-500" />
          <span>Evidence</span>
        </div>
        <div className="h-3 w-[1px] bg-slate-200 dark:bg-slate-800" />
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-0.5 bg-indigo-500" />
          <span>Observed</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-0.5 bg-rose-500" />
          <span>Contradiction</span>
        </div>
      </div>
    </div>
  );
};

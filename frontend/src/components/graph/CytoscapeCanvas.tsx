import React, { useEffect, useRef, useState } from 'react';
import cytoscape, { Core, EventObject } from 'cytoscape';
import dagre from 'cytoscape-dagre';
import { GraphNode, GraphEdge } from '../../types/graph';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Crosshair,
  GitFork,
  Compass
} from 'lucide-react';

cytoscape.use(dagre);

interface CytoscapeCanvasProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  selectedElement: { type: 'node' | 'edge'; id: string } | null;
  onSelectElement: (element: { type: 'node' | 'edge'; id: string } | null) => void;
  layoutType: 'dagre' | 'cose' | 'concentric' | 'circle';
}

export const CytoscapeCanvas: React.FC<CytoscapeCanvasProps> = ({
  nodes,
  edges,
  selectedElement,
  onSelectElement,
  layoutType
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);
  const [neighborhoodMode, setNeighborhoodMode] = useState<boolean>(false);

  // Initialize Cytoscape Instance
  useEffect(() => {
    if (!containerRef.current) return;

    const cy = cytoscape({
      container: containerRef.current,
      boxSelectionEnabled: false,
      autounselectify: false,
      style: ([
        // Base Node Style
        {
          selector: 'node',
          style: {
            'label': 'data(label)',
            'font-size': '11px',
            'text-valign': 'center',
            'text-halign': 'center',
            'color': '#f1f5f9',
            'text-wrap': 'ellipsis',
            'text-max-width': '110px',
            'border-width': '2px',
            'transition-property': 'background-color, border-color, width, height, opacity',
            'transition-duration': 0.2
          }
        },
        // Entity Nodes
        {
          selector: 'node[category = "ENTITY"]',
          style: {
            'shape': 'round-rectangle',
            'background-color': '#0f172a',
            'border-color': '#3b82f6',
            'width': '125px',
            'height': '46px'
          }
        },
        // Event Nodes (Hexagon/Diamond - First-Class Event Representation)
        {
          selector: 'node[category = "EVENT"]',
          style: {
            'shape': 'hexagon',
            'background-color': '#2a1705',
            'border-color': '#f59e0b',
            'width': '145px',
            'height': '54px',
            'color': '#fef3c7'
          }
        },
        // Evidence Nodes (Cut-Rectangle / Shield)
        {
          selector: 'node[category = "EVIDENCE"]',
          style: {
            'shape': 'cut-rectangle',
            'background-color': '#06281e',
            'border-color': '#10b981',
            'width': '135px',
            'height': '48px',
            'color': '#a7f3d0'
          }
        },
        // Selected Node
        {
          selector: 'node:selected',
          style: {
            'border-color': '#f43f5e',
            'border-width': '3.5px',
            'shadow-blur': 15,
            'shadow-color': '#f43f5e',
            'shadow-opacity': 0.6
          }
        },
        // Base Edge Style
        {
          selector: 'edge',
          style: {
            'curve-style': 'bezier',
            'target-arrow-shape': 'triangle',
            'arrow-scale': 1.1,
            'label': 'data(label)',
            'font-size': '9px',
            'font-family': 'monospace',
            'color': '#94a3b8',
            'text-background-opacity': 0.85,
            'text-background-color': '#0f172a',
            'text-background-padding': '2px',
            'text-background-shape': 'roundrectangle',
            'text-rotation': 'autorotate',
            'width': 2,
            'line-color': '#64748b',
            'target-arrow-color': '#64748b'
          }
        },
        // Observed Edge (Solid)
        {
          selector: 'edge[status = "OBSERVED"]',
          style: {
            'line-color': '#6366f1',
            'target-arrow-color': '#6366f1',
            'line-style': 'solid',
            'width': 2.2
          }
        },
        // Derived Edge (Dashed)
        {
          selector: 'edge[status = "DERIVED"]',
          style: {
            'line-color': '#a855f7',
            'target-arrow-color': '#a855f7',
            'line-style': 'dashed',
            'line-dash-pattern': [6, 3],
            'width': 2.2
          }
        },
        // Hypothesized Edge (Dotted)
        {
          selector: 'edge[status = "HYPOTHESIZED"]',
          style: {
            'line-color': '#f59e0b',
            'target-arrow-color': '#f59e0b',
            'line-style': 'dotted',
            'width': 2.5
          }
        },
        // Contradicts Edge (Red Alert)
        {
          selector: 'edge[type = "CONTRADICTS"]',
          style: {
            'line-color': '#ef4444',
            'target-arrow-color': '#ef4444',
            'width': 3,
            'line-style': 'solid'
          }
        },
        // Selected Edge
        {
          selector: 'edge:selected',
          style: {
            'line-color': '#f43f5e',
            'target-arrow-color': '#f43f5e',
            'width': 3.5
          }
        },
        // Neighborhood Dimmed Class
        {
          selector: '.dimmed',
          style: {
            'opacity': 0.15
          }
        },
        // Neighborhood Highlighted Class
        {
          selector: '.highlighted',
          style: {
            'opacity': 1.0,
            'shadow-blur': 10,
            'shadow-opacity': 0.5
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

    cyRef.current = cy;

    return () => {
      cy.destroy();
    };
  }, []);

  // Update Elements when nodes or edges change
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;

    cy.batch(() => {
      cy.elements().remove();

      // Add nodes
      nodes.forEach(n => {
        cy.add({
          group: 'nodes',
          data: {
            id: n.id,
            label: n.label,
            category: n.category,
            type: n.type
          }
        });
      });

      // Add edges
      edges.forEach(e => {
        cy.add({
          group: 'edges',
          data: {
            id: e.id,
            source: e.source,
            target: e.target,
            label: e.type,
            type: e.type,
            status: e.status,
            cost: e.cost
          }
        });
      });
    });

    runLayout();
  }, [nodes, edges, layoutType]);

  // Handle selected element sync
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;

    cy.elements().unselect();

    if (selectedElement) {
      const el = cy.getElementById(selectedElement.id);
      if (el.nonempty()) {
        el.select();

        if (neighborhoodMode && selectedElement.type === 'node') {
          // Highlight 1-hop neighborhood
          const neighborhood = el.closedNeighborhood();
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

  const runLayout = () => {
    const cy = cyRef.current;
    if (!cy) return;

    let layoutConfig: any;
    if (layoutType === 'dagre') {
      layoutConfig = {
        name: 'dagre',
        rankDir: 'TB',
        nodeSep: 60,
        rankSep: 80,
        animate: true,
        animationDuration: 400
      };
    } else if (layoutType === 'cose') {
      layoutConfig = {
        name: 'cose',
        idealEdgeLength: 100,
        nodeOverlap: 20,
        refresh: 20,
        fit: true,
        padding: 30,
        randomize: false,
        componentSpacing: 100,
        nodeRepulsion: 400000,
        edgeElasticity: 100,
        nestingFactor: 5,
        gravity: 80,
        numIter: 1000,
        initialTemp: 200,
        coolingFactor: 0.95,
        minTemp: 1.0,
        animate: true,
        animationDuration: 400
      };
    } else if (layoutType === 'concentric') {
      layoutConfig = {
        name: 'concentric',
        concentric: (node: any) => {
          return node.data('category') === 'EVENT' ? 3 : node.data('category') === 'ENTITY' ? 2 : 1;
        },
        levelWidth: () => 1,
        padding: 30,
        animate: true,
        animationDuration: 400
      };
    } else {
      layoutConfig = {
        name: 'circle',
        padding: 30,
        animate: true,
        animationDuration: 400
      };
    }

    const layout = cy.layout(layoutConfig);
    layout.run();
  };

  const handleZoomIn = () => cyRef.current?.zoom(cyRef.current.zoom() * 1.25);
  const handleZoomOut = () => cyRef.current?.zoom(cyRef.current.zoom() * 0.8);
  const handleFit = () => cyRef.current?.fit(undefined, 30);
  const handleCenterSelected = () => {
    if (selectedElement && cyRef.current) {
      const el = cyRef.current.getElementById(selectedElement.id);
      if (el.nonempty()) cyRef.current.center(el);
    }
  };

  return (
    <div className="relative flex-1 h-[calc(100vh-3.5rem-2rem)] bg-slate-950 overflow-hidden">
      {/* Cytoscape Container */}
      <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Floating Canvas Action Toolbar */}
      <div className="absolute top-4 left-4 flex flex-col gap-1.5 bg-slate-900/90 border border-slate-800 rounded-lg p-1.5 shadow-xl backdrop-blur">
        <button
          onClick={handleZoomIn}
          title="Zoom In"
          className="p-1.5 rounded hover:bg-slate-800 text-slate-300 hover:text-white transition"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={handleZoomOut}
          title="Zoom Out"
          className="p-1.5 rounded hover:bg-slate-800 text-slate-300 hover:text-white transition"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <div className="h-[1px] bg-slate-800 my-0.5" />
        <button
          onClick={handleFit}
          title="Fit Graph to Viewport"
          className="p-1.5 rounded hover:bg-slate-800 text-slate-300 hover:text-white transition"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
        <button
          onClick={handleCenterSelected}
          title="Center on Selected Element"
          disabled={!selectedElement}
          className="p-1.5 rounded hover:bg-slate-800 text-slate-300 hover:text-white disabled:opacity-30 transition"
        >
          <Crosshair className="w-4 h-4" />
        </button>
        <div className="h-[1px] bg-slate-800 my-0.5" />
        <button
          onClick={() => setNeighborhoodMode(!neighborhoodMode)}
          title={neighborhoodMode ? 'Disable Neighborhood Focus' : 'Isolate 1-Hop Neighborhood'}
          className={`p-1.5 rounded transition ${
            neighborhoodMode ? 'bg-indigo-600 text-white' : 'hover:bg-slate-800 text-slate-300'
          }`}
        >
          <GitFork className="w-4 h-4" />
        </button>
        <button
          onClick={runLayout}
          title="Re-run Layout Algorithm"
          className="p-1.5 rounded hover:bg-slate-800 text-slate-300 hover:text-white transition"
        >
          <Compass className="w-4 h-4" />
        </button>
      </div>

      {/* Floating Graph Legend */}
      <div className="absolute bottom-4 left-4 bg-slate-900/85 border border-slate-800 rounded-lg px-3 py-2 text-[11px] shadow-lg backdrop-blur flex items-center gap-4 text-slate-400">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-2 rounded bg-blue-500 inline-block" />
          <span>Entity</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rotate-45 bg-amber-500 inline-block" />
          <span>Event Node</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-2 rounded bg-emerald-500 inline-block" />
          <span>Evidence Node</span>
        </div>
        <div className="h-3 w-[1px] bg-slate-800" />
        <div className="flex items-center gap-1.5">
          <span className="w-4 h-0.5 bg-indigo-500 inline-block" />
          <span>Observed</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-4 h-0.5 border-b border-dashed border-purple-400 inline-block" />
          <span>Derived</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-4 h-0.5 border-b border-dotted border-amber-400 inline-block" />
          <span>Hypothesized</span>
        </div>
      </div>
    </div>
  );
};

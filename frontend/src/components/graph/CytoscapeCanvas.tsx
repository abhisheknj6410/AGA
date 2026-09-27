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
        // Base Node Style - Clean Vercel / Linear Minimal Card
        {
          selector: 'node',
          style: {
            'label': 'data(label)',
            'font-family': 'Inter, system-ui, -apple-system, sans-serif',
            'font-size': '12px',
            'font-weight': 600,
            'text-valign': 'center',
            'text-halign': 'center',
            'color': isLight ? '#09090b' : '#fafafa',
            'text-wrap': 'wrap',
            'text-max-width': '180px',
            'border-width': 1.5,
            'border-color': isLight ? '#e4e4e7' : '#27272a',
            'background-color': isLight ? '#ffffff' : '#18181b',
            'width': '200px',
            'height': '58px',
            'shape': 'round-rectangle',
            'shadow-blur': 8,
            'shadow-color': isLight ? 'rgba(0, 0, 0, 0.05)' : 'rgba(0, 0, 0, 0.4)',
            'shadow-opacity': 1,
            'transition-property': 'background-color, border-color, width, height, opacity, shadow-blur',
            'transition-duration': 0.15
          }
        },
        // Entity Nodes - Crisp Monochrome Card
        {
          selector: 'node[category = "ENTITY"]',
          style: {
            'background-color': isLight ? '#ffffff' : '#18181b',
            'border-color': isLight ? '#e4e4e7' : '#27272a',
            'color': isLight ? '#09090b' : '#fafafa'
          }
        },
        // Event Nodes - Subtle Sandstone Accent
        {
          selector: 'node[category = "EVENT"]',
          style: {
            'background-color': isLight ? '#fefce8' : '#1c1917',
            'border-color': isLight ? '#ca8a04' : '#a16207',
            'border-width': 1.75,
            'color': isLight ? '#713f12' : '#fef08a'
          }
        },
        // Evidence Nodes - Subtle Sage Accent
        {
          selector: 'node[category = "EVIDENCE"]',
          style: {
            'background-color': isLight ? '#f0fdf4' : '#052e16',
            'border-color': isLight ? '#16a34a' : '#15803d',
            'border-width': 1.75,
            'color': isLight ? '#14532d' : '#bbf7d0'
          }
        },
        // Selected Node - Vercel High-Contrast Monochrome Ring
        {
          selector: 'node:selected',
          style: {
            'border-color': isLight ? '#09090b' : '#ffffff',
            'border-width': 3,
            'shadow-blur': 16,
            'shadow-color': isLight ? 'rgba(0, 0, 0, 0.25)' : 'rgba(255, 255, 255, 0.35)',
            'shadow-opacity': 1
          }
        },
        // Base Edge Style - Minimal Razor Line
        {
          selector: 'edge',
          style: {
            'curve-style': 'bezier',
            'target-arrow-shape': 'triangle',
            'arrow-scale': 0.8,
            'label': 'data(label)',
            'font-family': 'Inter, system-ui, -apple-system, sans-serif',
            'font-size': '10px',
            'font-weight': 500,
            'color': isLight ? '#71717a' : '#a1a1aa',
            'text-background-opacity': 0.95,
            'text-background-color': isLight ? '#ffffff' : '#18181b',
            'text-background-padding': '3px',
            'text-background-shape': 'roundrectangle',
            'text-rotation': 'autorotate',
            'width': 1.5,
            'line-color': isLight ? '#d4d4d8' : '#3f3f46',
            'target-arrow-color': isLight ? '#d4d4d8' : '#3f3f46'
          }
        },
        // Observed Edge - Solid High Contrast
        {
          selector: 'edge[status = "OBSERVED"]',
          style: {
            'line-color': isLight ? '#18181b' : '#f4f4f5',
            'target-arrow-color': isLight ? '#18181b' : '#f4f4f5',
            'line-style': 'solid',
            'width': 2
          }
        },
        // Derived Edge - Dashed
        {
          selector: 'edge[status = "DERIVED"]',
          style: {
            'line-color': '#71717a',
            'target-arrow-color': '#71717a',
            'line-style': 'dashed',
            'line-dash-pattern': [5, 4],
            'width': 1.8
          }
        },
        // Hypothesized Edge - Dotted
        {
          selector: 'edge[status = "HYPOTHESIZED"]',
          style: {
            'line-color': '#a1a1aa',
            'target-arrow-color': '#a1a1aa',
            'line-style': 'dotted',
            'width': 2
          }
        },
        // Contradicts Edge - Pure Red
        {
          selector: 'edge[type = "CONTRADICTS"]',
          style: {
            'line-color': '#ef4444',
            'target-arrow-color': '#ef4444',
            'width': 2.5,
            'line-style': 'solid'
          }
        },
        // Selected Edge - Vercel Black/White Focus
        {
          selector: 'edge:selected',
          style: {
            'line-color': isLight ? '#09090b' : '#ffffff',
            'target-arrow-color': isLight ? '#09090b' : '#ffffff',
            'width': 2.8,
            'text-background-color': isLight ? '#09090b' : '#ffffff',
            'color': isLight ? '#ffffff' : '#09090b'
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
            'shadow-blur': 14,
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

    cy.on('zoom', () => {
      setCurrentZoom(Math.round(cy.zoom() * 100));
    });

    cyRef.current = cy;

    // Observe container resizing to keep canvas responsive
    const resizeObserver = new ResizeObserver(() => {
      if (cyRef.current) {
        cyRef.current.resize();
      }
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
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
    layout.one('layoutstop', () => {
      cy.resize();
      cy.fit(undefined, 60);
      setCurrentZoom(Math.round(cy.zoom() * 100));
    });
    layout.run();

    // Fallback fit to guarantee nodes appear immediately even if layoutstop is missed
    setTimeout(() => {
      if (cyRef.current) {
        cyRef.current.resize();
        cyRef.current.fit(undefined, 60);
        setCurrentZoom(Math.round(cyRef.current.zoom() * 100));
      }
    }, 80);
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
      <div className="absolute bottom-4 right-4 z-10 flex items-center bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-sm p-1 text-zinc-600 dark:text-zinc-300">
        <button
          onClick={handleZoomOut}
          title="Zoom Out"
          className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition"
        >
          <ZoomOut className="w-4 h-4" />
        </button>

        <span className="px-2.5 text-xs font-mono font-medium text-zinc-500 min-w-[46px] text-center">
          {currentZoom}%
        </span>

        <button
          onClick={handleZoomIn}
          title="Zoom In"
          className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition"
        >
          <ZoomIn className="w-4 h-4" />
        </button>

        <div className="h-4 w-[1px] bg-zinc-200 dark:bg-zinc-800 mx-1" />

        <button
          onClick={handleFit}
          title="Fit View"
          className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition"
        >
          <Maximize2 className="w-4 h-4" />
        </button>

        <button
          onClick={handleToggleNeighborhood}
          title="Toggle 1-Hop Neighborhood Isolation"
          className={`p-1.5 rounded-md transition ${
            neighborhoodMode
              ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-bold'
              : 'hover:bg-zinc-100 dark:hover:bg-zinc-800'
          }`}
        >
          <Crosshair className="w-4 h-4" />
        </button>
      </div>

      {/* Floating Bottom-Left Minimal Discrete Legend */}
      <div className="absolute bottom-4 left-4 z-10 hidden sm:flex items-center gap-3.5 px-3.5 py-2 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-xs text-xs text-zinc-600 dark:text-zinc-400 font-medium">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-white dark:bg-zinc-800 border border-zinc-400" />
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
        <div className="h-3 w-[1px] bg-zinc-200 dark:bg-zinc-800" />
        <div className="flex items-center gap-1.5">
          <span className="w-3.5 h-0.5 bg-zinc-900 dark:bg-zinc-100" />
          <span>Observed</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3.5 h-0.5 bg-rose-500" />
          <span>Contradiction</span>
        </div>
      </div>
    </div>
  );
};

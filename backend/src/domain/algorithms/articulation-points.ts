import { GraphNode, GraphEdge } from '../types.js';

export interface ArticulationAnalysisResult {
  articulationPoints: Array<{
    nodeId: string;
    label: string;
    category: string;
    type: string;
    impactExplanation: string;
  }>;
  bridges: Array<{
    edgeId: string;
    sourceId: string;
    sourceLabel: string;
    targetId: string;
    targetLabel: string;
    type: string;
  }>;
  summary: string;
}

export class ArticulationPointsAlgorithm {
  /**
   * Computes articulation points (cut-vertices) and bridges (cut-edges) using Tarjan's DFS algorithm.
   */
  static analyze(nodes: GraphNode[], edges: GraphEdge[]): ArticulationAnalysisResult {
    const nodeMap = new Map<string, GraphNode>(nodes.map(n => [n.id, n]));
    
    // Build undirected adjacency list for structural connectivity
    const adj = new Map<string, Array<{ neighbor: string; edgeId: string }>>();
    for (const n of nodes) {
      adj.set(n.id, []);
    }

    for (const e of edges) {
      if (adj.has(e.source) && adj.has(e.target)) {
        adj.get(e.source)!.push({ neighbor: e.target, edgeId: e.id });
        adj.get(e.target)!.push({ neighbor: e.source, edgeId: e.id });
      }
    }

    const discoveryTime = new Map<string, number>();
    const lowTime = new Map<string, number>();
    const parent = new Map<string, string | null>();
    const visited = new Set<string>();
    const isArticulation = new Set<string>();
    const bridges: Array<{
      edgeId: string;
      sourceId: string;
      sourceLabel: string;
      targetId: string;
      targetLabel: string;
      type: string;
    }> = [];

    let timer = 0;

    const dfs = (u: string) => {
      visited.add(u);
      timer++;
      discoveryTime.set(u, timer);
      lowTime.set(u, timer);
      let children = 0;

      const neighbors = adj.get(u) || [];
      for (const { neighbor: v, edgeId } of neighbors) {
        if (!visited.has(v)) {
          children++;
          parent.set(v, u);
          dfs(v);

          // Check if subtree rooted at v has a connection to one of u's ancestors
          lowTime.set(u, Math.min(lowTime.get(u)!, lowTime.get(v)!));

          // Condition 1 for articulation point: u is root of DFS tree and has two or more children
          if (parent.get(u) === null && children > 1) {
            isArticulation.add(u);
          }

          // Condition 2: u is not root and low[v] >= discovery[u]
          if (parent.get(u) !== null && lowTime.get(v)! >= discoveryTime.get(u)!) {
            isArticulation.add(u);
          }

          // Bridge condition: low[v] > discovery[u]
          if (lowTime.get(v)! > discoveryTime.get(u)!) {
            const edge = edges.find(e => e.id === edgeId);
            const sourceNode = nodeMap.get(u)!;
            const targetNode = nodeMap.get(v)!;
            bridges.push({
              edgeId,
              sourceId: u,
              sourceLabel: sourceNode?.label || u,
              targetId: v,
              targetLabel: targetNode?.label || v,
              type: edge?.type || 'CONNECTED'
            });
          }
        } else if (v !== parent.get(u)) {
          lowTime.set(u, Math.min(lowTime.get(u)!, discoveryTime.get(v)!));
        }
      }
    };

    for (const n of nodes) {
      if (!visited.has(n.id)) {
        parent.set(n.id, null);
        dfs(n.id);
      }
    }

    const articulationPoints = Array.from(isArticulation).map(id => {
      const node = nodeMap.get(id)!;
      return {
        nodeId: id,
        label: node?.label || id,
        category: node?.category || 'ENTITY',
        type: node?.type || 'UNKNOWN',
        impactExplanation: `Node '${node?.label}' is a critical structural intermediary. Severing this entity disconnects investigation components.`
      };
    });

    return {
      articulationPoints,
      bridges,
      summary: `Found ${articulationPoints.length} articulation points and ${bridges.length} structural bridges.`
    };
  }
}

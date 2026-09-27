import { GraphNode, GraphEdge } from '../types.js';
import { DijkstraAlgorithm, PathResult } from './dijkstra.js';

export interface DisjointPathsResult {
  sourceId: string;
  sourceLabel: string;
  targetId: string;
  targetLabel: string;
  independentCorroborationCount: number;
  mode: 'VERTEX_DISJOINT' | 'EDGE_DISJOINT';
  paths: PathResult[];
  summary: string;
}

export class DisjointPathsAlgorithm {
  /**
   * Computes maximal set of vertex-disjoint or edge-disjoint directed paths from source to target.
   * Provides evidence corroboration analysis (independent structural chains).
   */
  static findDisjointPaths(
    nodes: GraphNode[],
    edges: GraphEdge[],
    sourceId: string,
    targetId: string,
    mode: 'VERTEX_DISJOINT' | 'EDGE_DISJOINT' = 'VERTEX_DISJOINT'
  ): DisjointPathsResult {
    const nodeMap = new Map<string, GraphNode>(nodes.map(n => [n.id, n]));
    const sourceNode = nodeMap.get(sourceId);
    const targetNode = nodeMap.get(targetId);

    if (!sourceNode || !targetNode || sourceId === targetId) {
      return {
        sourceId,
        sourceLabel: sourceNode?.label || sourceId,
        targetId,
        targetLabel: targetNode?.label || targetId,
        independentCorroborationCount: 0,
        mode,
        paths: [],
        summary: 'Invalid source or target.'
      };
    }

    const discoveredPaths: PathResult[] = [];
    let currentNodes = [...nodes];
    let currentEdges = [...edges];

    const usedNodeIds = new Set<string>();
    const usedEdgeIds = new Set<string>();

    while (true) {
      // Filter out already used internal nodes or edges
      const availableNodes = currentNodes.filter(
        n => n.id === sourceId || n.id === targetId || (mode === 'VERTEX_DISJOINT' ? !usedNodeIds.has(n.id) : true)
      );

      const availableEdges = currentEdges.filter(
        e =>
          !usedEdgeIds.has(e.id) &&
          (mode === 'EDGE_DISJOINT' ||
            ((e.source === sourceId || !usedNodeIds.has(e.source)) &&
             (e.target === targetId || !usedNodeIds.has(e.target))))
      );

      const path = DijkstraAlgorithm.findShortestPath(availableNodes, availableEdges, sourceId, targetId);
      if (!path) break;

      discoveredPaths.push(path);

      // Mark edges as used
      for (const eid of path.edgeIds) {
        usedEdgeIds.add(eid);
      }

      // Mark internal nodes as used
      for (const nid of path.nodeIds) {
        if (nid !== sourceId && nid !== targetId) {
          usedNodeIds.add(nid);
        }
      }
    }

    return {
      sourceId,
      sourceLabel: sourceNode.label,
      targetId,
      targetLabel: targetNode.label,
      independentCorroborationCount: discoveredPaths.length,
      mode,
      paths: discoveredPaths,
      summary: `Found ${discoveredPaths.length} structurally independent ${mode.toLowerCase().replace('_', '-')} evidence paths between '${sourceNode.label}' and '${targetNode.label}'.`
    };
  }
}

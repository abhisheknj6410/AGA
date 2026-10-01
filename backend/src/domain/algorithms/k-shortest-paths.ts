import { GraphNode, GraphEdge } from '../types.js';
import { DijkstraAlgorithm, PathResult } from './dijkstra.js';

export interface KPathsResult {
  sourceId: string;
  targetId: string;
  requestedK: number;
  foundCount: number;
  paths: PathResult[];
}

export class KShortestPathsAlgorithm {
  /**
   * Yen's K-Shortest Loopless Paths Algorithm
   * Identifies top K alternative access or exfiltration corridors.
   */
  static findKShortestPaths(
    nodes: GraphNode[],
    edges: GraphEdge[],
    sourceId: string,
    targetId: string,
    k: number = 3,
    options: { maxCost?: number; allowedStatuses?: string[] } = {}
  ): KPathsResult {
    const A: PathResult[] = [];
    const B: PathResult[] = [];

    // Find the first shortest path
    const p0 = DijkstraAlgorithm.findShortestPath(nodes, edges, sourceId, targetId, options);
    if (!p0) {
      return {
        sourceId,
        targetId,
        requestedK: k,
        foundCount: 0,
        paths: []
      };
    }

    A.push(p0);

    for (let currentK = 1; currentK < k; currentK++) {
      const prevPath = A[currentK - 1];

      // Spur node iterates through all nodes in prevPath except the last one
      for (let i = 0; i < prevPath.nodeIds.length - 1; i++) {
        const spurNode = prevPath.nodeIds[i];
        const rootPathNodeIds = prevPath.nodeIds.slice(0, i + 1);

        // Edges to exclude: any edge leaving spurNode used in any previous path in A with the same root path
        const excludedEdgeIds = new Set<string>();
        for (const p of A) {
          if (p.nodeIds.length > i && arraysEqual(p.nodeIds.slice(0, i + 1), rootPathNodeIds)) {
            const edgeId = p.edgeIds[i];
            if (edgeId) excludedEdgeIds.add(edgeId);
          }
        }

        // Nodes to exclude: all root path nodes except spurNode to prevent loops
        const excludedNodeIds = new Set<string>(rootPathNodeIds.slice(0, -1));

        // Filter available nodes and edges for the spur calculation
        const filteredNodes = nodes.filter(n => !excludedNodeIds.has(n.id));
        const filteredEdges = edges.filter(
          e =>
            !excludedEdgeIds.has(e.id) &&
            !excludedNodeIds.has(e.source) &&
            !excludedNodeIds.has(e.target)
        );

        // Find spur path from spurNode to targetId
        const spurPath = DijkstraAlgorithm.findShortestPath(
          filteredNodes,
          filteredEdges,
          spurNode,
          targetId,
          options
        );

        if (spurPath) {
          // Combine root path and spur path
          const totalNodeIds = [
            ...rootPathNodeIds.slice(0, -1),
            ...spurPath.nodeIds
          ];

          // Check if total path is loopless
          if (new Set(totalNodeIds).size === totalNodeIds.length) {
            const rootEdgeIds = prevPath.edgeIds.slice(0, i);
            const totalEdgeIds = [...rootEdgeIds, ...spurPath.edgeIds];

            const nodeMap = new Map<string, GraphNode>(nodes.map(n => [n.id, n]));
            const edgeMap = new Map<string, GraphEdge>(edges.map(e => [e.id, e]));

            let totalCost = 0;
            const fullEdges = totalEdgeIds.map(eid => {
              const e = edgeMap.get(eid)!;
              totalCost += Math.max(0, e.cost ?? 1.0);
              return {
                id: e.id,
                type: e.type,
                cost: e.cost,
                status: e.status
              };
            });

            const fullNodes = totalNodeIds.map(nid => {
              const n = nodeMap.get(nid)!;
              return { id: n.id, label: n.label, category: n.category, type: n.type, time: n.time };
            });

            const candidate: PathResult = {
              sourceId,
              targetId,
              totalCost,
              nodeIds: totalNodeIds,
              edgeIds: totalEdgeIds,
              nodes: fullNodes,
              edges: fullEdges
            };

            // Avoid adding duplicates to B
            if (!B.some(p => arraysEqual(p.nodeIds, candidate.nodeIds)) &&
                !A.some(p => arraysEqual(p.nodeIds, candidate.nodeIds))) {
              B.push(candidate);
            }
          }
        }
      }

      if (B.length === 0) break;

      // Sort B by totalCost ascending
      B.sort((a, b) => a.totalCost - b.totalCost);
      const nextShortest = B.shift()!;
      A.push(nextShortest);
    }

    return {
      sourceId,
      targetId,
      requestedK: k,
      foundCount: A.length,
      paths: A
    };
  }
}

function arraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

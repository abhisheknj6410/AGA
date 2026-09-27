import { GraphNode, GraphEdge } from '../types.js';

export interface MinCutResult {
  sourceId: string;
  sourceLabel: string;
  targetId: string;
  targetLabel: string;
  maxFlowValue: number;
  cutCapacity: number;
  cutEdges: Array<{
    edgeId: string;
    sourceId: string;
    sourceLabel: string;
    targetId: string;
    targetLabel: string;
    type: string;
    cost: number;
  }>;
  sourcePartitionNodeIds: string[];
  targetPartitionNodeIds: string[];
  recommendedContainmentPoints: string[];
  summary: string;
}

export class MinCutAlgorithm {
  /**
   * Computes s-t Minimum Cut using Edmonds-Karp Max-Flow / Min-Cut algorithm.
   * Capacity of each edge is set based on 1.0 (or custom weight).
   */
  static computeMinCut(
    nodes: GraphNode[],
    edges: GraphEdge[],
    sourceId: string,
    targetId: string
  ): MinCutResult {
    const nodeMap = new Map<string, GraphNode>(nodes.map(n => [n.id, n]));
    const sourceNode = nodeMap.get(sourceId);
    const targetNode = nodeMap.get(targetId);

    if (!sourceNode || !targetNode) {
      return {
        sourceId,
        sourceLabel: sourceId,
        targetId,
        targetLabel: targetId,
        maxFlowValue: 0,
        cutCapacity: 0,
        cutEdges: [],
        sourcePartitionNodeIds: [],
        targetPartitionNodeIds: [],
        recommendedContainmentPoints: [],
        summary: 'Source or target node not found.'
      };
    }

    if (sourceId === targetId) {
      return {
        sourceId,
        sourceLabel: sourceNode.label,
        targetId,
        targetLabel: targetNode.label,
        maxFlowValue: Infinity,
        cutCapacity: Infinity,
        cutEdges: [],
        sourcePartitionNodeIds: [sourceId],
        targetPartitionNodeIds: [targetId],
        recommendedContainmentPoints: [],
        summary: 'Source and target are the same node.'
      };
    }

    // Build residual network
    // Node indexing
    const nodeIds = nodes.map(n => n.id);
    const nodeIndex = new Map<string, number>(nodeIds.map((id, idx) => [id, idx]));
    const N = nodeIds.length;
    const sIdx = nodeIndex.get(sourceId)!;
    const tIdx = nodeIndex.get(targetId)!;

    // Capacity and flow matrices
    const capacity: number[][] = Array.from({ length: N }, () => Array(N).fill(0));
    const edgeLookup = new Map<string, GraphEdge>();

    for (const e of edges) {
      const u = nodeIndex.get(e.source);
      const v = nodeIndex.get(e.target);
      if (u !== undefined && v !== undefined && u !== v) {
        // Capacity can be 1.0 per edge, or related to cost
        const cap = 1.0;
        capacity[u][v] += cap;
        edgeLookup.set(`${e.source}->${e.target}`, e);
      }
    }

    const flow: number[][] = Array.from({ length: N }, () => Array(N).fill(0));

    // Edmonds-Karp BFS to find augmenting path
    const bfs = (parent: number[]): boolean => {
      parent.fill(-1);
      parent[sIdx] = -2;
      const q: number[] = [sIdx];

      while (q.length > 0) {
        const u = q.shift()!;
        for (let v = 0; v < N; v++) {
          if (parent[v] === -1 && capacity[u][v] - flow[u][v] > 1e-6) {
            parent[v] = u;
            if (v === tIdx) return true;
            q.push(v);
          }
        }
      }
      return false;
    };

    const parent: number[] = Array(N).fill(-1);
    let maxFlow = 0;

    while (bfs(parent)) {
      // Find bottleneck capacity along augmenting path
      let push = Infinity;
      let curr = tIdx;
      while (curr !== sIdx) {
        const prev = parent[curr];
        push = Math.min(push, capacity[prev][curr] - flow[prev][curr]);
        curr = prev;
      }

      // Augment flow
      curr = tIdx;
      while (curr !== sIdx) {
        const prev = parent[curr];
        flow[prev][curr] += push;
        flow[curr][prev] -= push;
        curr = prev;
      }

      maxFlow += push;
    }

    // Residual graph reachability from sourceIdx to identify the minimum cut
    const visitedInResidual = new Set<number>();
    const resQueue = [sIdx];
    visitedInResidual.add(sIdx);

    while (resQueue.length > 0) {
      const u = resQueue.shift()!;
      for (let v = 0; v < N; v++) {
        if (!visitedInResidual.has(v) && capacity[u][v] - flow[u][v] > 1e-6) {
          visitedInResidual.add(v);
          resQueue.push(v);
        }
      }
    }

    // Cut edges: edges in original graph from visitedInResidual to non-visited
    const cutEdges: MinCutResult['cutEdges'] = [];
    let cutCapacity = 0;

    for (let u of visitedInResidual) {
      for (let v = 0; v < N; v++) {
        if (!visitedInResidual.has(v) && capacity[u][v] > 0) {
          const uId = nodeIds[u];
          const vId = nodeIds[v];
          const e = edgeLookup.get(`${uId}->${vId}`);
          cutCapacity += capacity[u][v];

          cutEdges.push({
            edgeId: e?.id || `virtual-${uId}-${vId}`,
            sourceId: uId,
            sourceLabel: nodeMap.get(uId)?.label || uId,
            targetId: vId,
            targetLabel: nodeMap.get(vId)?.label || vId,
            type: e?.type || 'CONNECTED',
            cost: e?.cost ?? 1.0
          });
        }
      }
    }

    const sourcePartitionNodeIds = Array.from(visitedInResidual).map(idx => nodeIds[idx]);
    const targetPartitionNodeIds = nodeIds.filter((_, idx) => !visitedInResidual.has(idx));

    const recommendations = cutEdges.map(
      ce => `Sever or inspect relationship ${ce.type} from '${ce.sourceLabel}' to '${ce.targetLabel}'`
    );

    return {
      sourceId,
      sourceLabel: sourceNode.label,
      targetId,
      targetLabel: targetNode.label,
      maxFlowValue: maxFlow,
      cutCapacity,
      cutEdges,
      sourcePartitionNodeIds,
      targetPartitionNodeIds,
      recommendedContainmentPoints: recommendations,
      summary: `Found minimum cut of ${cutEdges.length} structural edges (capacity: ${cutCapacity}) separating '${sourceNode.label}' from '${targetNode.label}'.`
    };
  }
}

import { GraphNode, GraphEdge } from '../types.js';

export interface PathResult {
  sourceId: string;
  targetId: string;
  totalCost: number;
  nodeIds: string[];
  edgeIds: string[];
  nodes: Array<{ id: string; label: string; category: string; type: string; time?: any }>;
  edges: Array<{ id: string; type: string; cost: number; status: string }>;
}

export class DijkstraAlgorithm {
  /**
   * Computes lowest-cost directed path from sourceId to targetId.
   * Edge costs represent investigative friction/reliability.
   */
  static findShortestPath(
    nodes: GraphNode[],
    edges: GraphEdge[],
    sourceId: string,
    targetId: string,
    options: { maxCost?: number; allowedStatuses?: string[] } = {}
  ): PathResult | null {
    const nodeMap = new Map<string, GraphNode>(nodes.map(n => [n.id, n]));
    if (!nodeMap.has(sourceId) || !nodeMap.has(targetId)) {
      return null;
    }

    if (sourceId === targetId) {
      const n = nodeMap.get(sourceId)!;
      return {
        sourceId,
        targetId,
        totalCost: 0,
        nodeIds: [sourceId],
        edgeIds: [],
        nodes: [{ id: n.id, label: n.label, category: n.category, type: n.type }],
        edges: []
      };
    }

    // Build directed adjacency list
    const adj = new Map<string, Array<{ target: string; edge: GraphEdge; cost: number }>>();
    for (const n of nodes) {
      adj.set(n.id, []);
    }

    for (const e of edges) {
      if (options.allowedStatuses && !options.allowedStatuses.includes(e.status)) {
        continue;
      }
      if (!adj.has(e.source)) adj.set(e.source, []);
      const cost = Math.max(0, e.cost ?? 1.0);
      adj.get(e.source)!.push({ target: e.target, edge: e, cost });
    }

    // Dijkstra with priority map
    const dist = new Map<string, number>();
    const prev = new Map<string, { nodeId: string; edge: GraphEdge }>();
    const visited = new Set<string>();

    for (const n of nodes) {
      dist.set(n.id, Infinity);
    }
    dist.set(sourceId, 0);
    const frontier = new Set<string>([sourceId]);

    while (frontier.size > 0) {
      // Find frontier node with smallest distance
      let u: string | null = null;
      let minD = Infinity;
      for (const nid of frontier) {
        const d = dist.get(nid) ?? Infinity;
        if (d < minD) {
          minD = d;
          u = nid;
        }
      }

      if (u === null || minD === Infinity) break;
      frontier.delete(u);
      visited.add(u);

      if (u === targetId) break;

      const neighbors = adj.get(u) || [];
      for (const { target: v, edge, cost } of neighbors) {
        if (visited.has(v)) continue;
        const alt = minD + cost;
        if (options.maxCost !== undefined && alt > options.maxCost) continue;

        if (alt < (dist.get(v) ?? Infinity)) {
          dist.set(v, alt);
          prev.set(v, { nodeId: u, edge });
          frontier.add(v);
        }
      }
    }

    const targetDist = dist.get(targetId);
    if (!targetDist || targetDist === Infinity) {
      return null;
    }

    // Reconstruct path
    const nodeIds: string[] = [];
    const edgeIds: string[] = [];
    const edgeObjs: Array<{ id: string; type: string; cost: number; status: string }> = [];

    let curr: string | undefined = targetId;
    while (curr) {
      nodeIds.unshift(curr);
      const p = prev.get(curr);
      if (!p) break;
      edgeIds.unshift(p.edge.id);
      edgeObjs.unshift({
        id: p.edge.id,
        type: p.edge.type,
        cost: p.edge.cost,
        status: p.edge.status
      });
      curr = p.nodeId;
    }

    const nodeObjs = nodeIds.map(id => {
      const n = nodeMap.get(id)!;
      return { id: n.id, label: n.label, category: n.category, type: n.type, time: n.time };
    });

    return {
      sourceId,
      targetId,
      totalCost: targetDist,
      nodeIds,
      edgeIds,
      nodes: nodeObjs,
      edges: edgeObjs
    };
  }
}

import { GraphNode, GraphEdge } from '../types.js';
import { DijkstraAlgorithm } from './dijkstra.js';

export interface SteinerSubgraphResult {
  terminalIds: string[];
  terminalLabels: string[];
  subgraphNodeIds: string[];
  subgraphEdgeIds: string[];
  totalSubgraphCost: number;
  nodes: Array<{ id: string; label: string; category: string; type: string }>;
  edges: Array<{ id: string; source: string; target: string; type: string; cost: number }>;
  summary: string;
}

export class SteinerSubgraphAlgorithm {
  /**
   * Computes Minimal Connecting Subgraph linking a specified set of terminal nodes (Takahashi-Matsuyama approximation).
   * Extracts the minimal evidence chain connecting key investigative points of interest.
   */
  static computeMinimalConnectingSubgraph(
    nodes: GraphNode[],
    edges: GraphEdge[],
    terminalIds: string[]
  ): SteinerSubgraphResult {
    const nodeMap = new Map<string, GraphNode>(nodes.map(n => [n.id, n]));
    const validTerminals = terminalIds.filter(id => nodeMap.has(id));

    if (validTerminals.length < 2) {
      const singleNode = validTerminals.length === 1 ? nodeMap.get(validTerminals[0]) : null;
      return {
        terminalIds: validTerminals,
        terminalLabels: singleNode ? [singleNode.label] : [],
        subgraphNodeIds: singleNode ? [singleNode.id] : [],
        subgraphEdgeIds: [],
        totalSubgraphCost: 0,
        nodes: singleNode ? [{ id: singleNode.id, label: singleNode.label, category: singleNode.category, type: singleNode.type }] : [],
        edges: [],
        summary: 'At least 2 valid terminal nodes are required to compute a connecting subgraph.'
      };
    }

    // Undirected representation for minimum connecting network
    const undirectedEdges: GraphEdge[] = [];
    for (const e of edges) {
      undirectedEdges.push(e);
      undirectedEdges.push({
        ...e,
        id: `${e.id}-rev`,
        source: e.target,
        target: e.source
      });
    }

    const treeNodeIds = new Set<string>([validTerminals[0]]);
    const treeEdgeIds = new Set<string>();
    const remainingTerminals = new Set<string>(validTerminals.slice(1));

    let totalCost = 0;

    while (remainingTerminals.size > 0) {
      let bestPath: { nodeIds: string[]; edgeIds: string[]; cost: number; terminal: string } | null = null;

      for (const t of remainingTerminals) {
        for (const root of treeNodeIds) {
          const path = DijkstraAlgorithm.findShortestPath(nodes, undirectedEdges, root, t);
          if (path) {
            if (!bestPath || path.totalCost < bestPath.cost) {
              bestPath = {
                nodeIds: path.nodeIds,
                edgeIds: path.edgeIds,
                cost: path.totalCost,
                terminal: t
              };
            }
          }
        }
      }

      if (!bestPath) {
        // Unconnected terminal component
        break;
      }

      for (const nid of bestPath.nodeIds) {
        treeNodeIds.add(nid);
      }
      for (const eid of bestPath.edgeIds) {
        // Map back to original edge ID if reversed
        const originalId = eid.endsWith('-rev') ? eid.slice(0, -4) : eid;
        treeEdgeIds.add(originalId);
      }
      totalCost += bestPath.cost;
      remainingTerminals.delete(bestPath.terminal);
    }

    const edgeMap = new Map<string, GraphEdge>(edges.map(e => [e.id, e]));
    const resultEdges: SteinerSubgraphResult['edges'] = [];
    for (const eid of treeEdgeIds) {
      const e = edgeMap.get(eid);
      if (e) {
        resultEdges.push({
          id: e.id,
          source: e.source,
          target: e.target,
          type: e.type,
          cost: e.cost
        });
      }
    }

    const resultNodes: SteinerSubgraphResult['nodes'] = [];
    for (const nid of treeNodeIds) {
      const n = nodeMap.get(nid);
      if (n) {
        resultNodes.push({
          id: n.id,
          label: n.label,
          category: n.category,
          type: n.type
        });
      }
    }

    const terminalLabels = validTerminals.map(id => nodeMap.get(id)?.label || id);

    return {
      terminalIds: validTerminals,
      terminalLabels,
      subgraphNodeIds: Array.from(treeNodeIds),
      subgraphEdgeIds: Array.from(treeEdgeIds),
      totalSubgraphCost: totalCost,
      nodes: resultNodes,
      edges: resultEdges,
      summary: `Extracted minimal connecting evidence chain of ${resultNodes.length} nodes and ${resultEdges.length} edges connecting ${validTerminals.length} terminals.`
    };
  }
}

import { GraphNode, GraphEdge } from '../types.js';

export interface PageRankResult {
  nodeId: string;
  score: number;
}

export class PageRankAlgorithm {
  static calculate(nodes: GraphNode[], edges: GraphEdge[], dampingFactor = 0.85, maxIterations = 100, tolerance = 1e-6): PageRankResult[] {
    const numNodes = nodes.length;
    if (numNodes === 0) return [];

    const outgoingEdgesCount = new Map<string, number>();
    const incomingEdges = new Map<string, string[]>();

    for (const node of nodes) {
      outgoingEdgesCount.set(node.id, 0);
      incomingEdges.set(node.id, []);
    }

    for (const edge of edges) {
      if (outgoingEdgesCount.has(edge.source) && incomingEdges.has(edge.target)) {
        outgoingEdgesCount.set(edge.source, outgoingEdgesCount.get(edge.source)! + 1);
        incomingEdges.get(edge.target)!.push(edge.source);
      }
    }

    let pageRanks = new Map<string, number>();
    const initialRank = 1 / numNodes;
    for (const node of nodes) {
      pageRanks.set(node.id, initialRank);
    }

    for (let iter = 0; iter < maxIterations; iter++) {
      const newPageRanks = new Map<string, number>();
      let maxChange = 0;

      for (const node of nodes) {
        let rankSum = 0;
        const inEdges = incomingEdges.get(node.id)!;

        for (const sourceId of inEdges) {
          const sourceOutCount = outgoingEdgesCount.get(sourceId)!;
          if (sourceOutCount > 0) {
            rankSum += pageRanks.get(sourceId)! / sourceOutCount;
          }
        }

        const newRank = ((1 - dampingFactor) / numNodes) + (dampingFactor * rankSum);
        newPageRanks.set(node.id, newRank);

        const change = Math.abs(newRank - pageRanks.get(node.id)!);
        if (change > maxChange) {
          maxChange = change;
        }
      }

      pageRanks = newPageRanks;
      if (maxChange < tolerance) {
        break;
      }
    }

    const results = Array.from(pageRanks.entries()).map(([nodeId, score]) => ({
      nodeId,
      score
    }));

    results.sort((a, b) => b.score - a.score);
    return results;
  }
}

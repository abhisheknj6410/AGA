import { GraphPayload, GraphNode, GraphEdge } from '../domain/types.js';
import { GraphStructuralFingerprint } from '../domain/adaptive-types.js';
import { TemporalAnalysisAlgorithm } from '../domain/algorithms/temporal-analysis.js';
import { DijkstraAlgorithm } from '../domain/algorithms/dijkstra.js';
import { KShortestPathsAlgorithm } from '../domain/algorithms/k-shortest-paths.js';

export class GraphFingerprintEngine {
  /**
   * Computes an objective, domain-independent structural fingerprint of a graph
   * without inspecting or hardcoding case names or topology labels.
   */
  static analyze(
    graph: GraphPayload,
    designatedSourceId?: string,
    designatedTargetId?: string
  ): GraphStructuralFingerprint {
    const nodes = graph.nodes;
    const edges = graph.edges;
    const nodeCount = nodes.length;
    const edgeCount = edges.length;

    const sourceId = designatedSourceId || this.inferSourceNode(nodes, edges);
    const targetId = designatedTargetId || this.inferTargetNode(nodes, edges, sourceId);

    // Degree calculations
    const inDegrees = new Map<string, number>();
    const outDegrees = new Map<string, number>();
    for (const n of nodes) {
      inDegrees.set(n.id, 0);
      outDegrees.set(n.id, 0);
    }
    for (const e of edges) {
      outDegrees.set(e.source, (outDegrees.get(e.source) || 0) + 1);
      inDegrees.set(e.target, (inDegrees.get(e.target) || 0) + 1);
    }

    const outVals = Array.from(outDegrees.values());
    const inVals = Array.from(inDegrees.values());
    const maxOutDegree = outVals.length > 0 ? Math.max(...outVals) : 0;
    const maxInDegree = inVals.length > 0 ? Math.max(...inVals) : 0;
    const averageOutDegree = nodeCount > 0 ? Number((edgeCount / nodeCount).toFixed(2)) : 0;
    const density = nodeCount > 1 ? Number((edgeCount / (nodeCount * (nodeCount - 1))).toFixed(4)) : 0;

    // Reachability Analysis
    const reachableFromSource = this.computeReachableSet(nodes, edges, sourceId);
    const sourceReachableTarget = reachableFromSource.has(targetId);
    const isDisconnected = !sourceReachableTarget && nodeCount > 1;

    // Path enumeration bound
    let pathCountBound = 0;
    let paths: Array<{ nodes: GraphNode[] }> = [];
    if (sourceReachableTarget && sourceId !== targetId) {
      const kResult = KShortestPathsAlgorithm.findKShortestPaths(nodes, edges, sourceId, targetId, 5);
      paths = kResult.paths;
      pathCountBound = paths.length;
    }

    // Branching and Convergence
    const hasBranching = maxOutDegree >= 2;
    const hasConvergence = maxInDegree >= 2;

    // Linear chain detection:
    // Every node on the path has exactly inDegree<=1 and outDegree<=1, and total edges === nodeCount - 1
    const isLinearChain =
      sourceReachableTarget &&
      pathCountBound === 1 &&
      maxOutDegree <= 1 &&
      maxInDegree <= 1 &&
      edgeCount === nodeCount - 1;

    // Parallel Corridors detection:
    // Multiple paths that do not share intermediate nodes
    let hasParallelCorridors = false;
    if (paths.length >= 2) {
      const intermediateSets = paths.map(p => new Set(p.nodes.slice(1, -1).map(n => n.id)));
      for (let i = 0; i < intermediateSets.length; i++) {
        for (let j = i + 1; j < intermediateSets.length; j++) {
          const intersection = Array.from(intermediateSets[i]).filter(x => intermediateSets[j].has(x));
          if (intersection.length === 0 && intermediateSets[i].size > 0 && intermediateSets[j].size > 0) {
            hasParallelCorridors = true;
            break;
          }
        }
        if (hasParallelCorridors) break;
      }
    }

    // Bottleneck candidates:
    // Nodes that appear in all discovered paths or have convergence
    const bottleneckCandidates: Array<{ nodeId: string; label: string; inDegree: number; outDegree: number }> = [];
    if (paths.length > 0) {
      const nodeMap = new Map<string, GraphNode>(nodes.map(n => [n.id, n]));
      for (const n of nodes) {
        if (n.id === sourceId || n.id === targetId) continue;
        const inCount = inDegrees.get(n.id) || 0;
        const outCount = outDegrees.get(n.id) || 0;
        if (inCount >= 2 || (paths.length >= 2 && paths.every(p => p.nodes.some(pn => pn.id === n.id)))) {
          bottleneckCandidates.push({
            nodeId: n.id,
            label: n.label,
            inDegree: inCount,
            outDegree: outCount
          });
        }
      }
    }

    // Cycle detection via Kahn topological sort
    const topo = TemporalAnalysisAlgorithm.topologicalSort(nodes, edges);
    const hasCycles = !topo.isAcyclic;
    const detectedCycleCount = topo.detectedCycles.length;

    // Temporal Inversions
    let temporalViolationCount = 0;
    for (const p of paths) {
      const val = TemporalAnalysisAlgorithm.validatePathChronology(p.nodes);
      if (!val.isValid) {
        temporalViolationCount += val.violations.length;
      }
    }
    const hasTemporalInversions = temporalViolationCount > 0;

    // Evidence Conflicts: Contradictory edges or opposing claims
    const conflictEdges = edges.filter(e => e.type === 'CONTRADICTS');
    const hasEvidenceConflicts = conflictEdges.length > 0;

    // Human-readable detected properties list
    const detectedProperties: string[] = [];
    if (isLinearChain) {
      detectedProperties.push('Simple unbranching linear chain (1 path, zero alternatives)');
    }
    if (isDisconnected) {
      detectedProperties.push('Disconnected graph components; destination unreachable from origin');
    }
    if (hasBranching) {
      detectedProperties.push(`Divergent branching present (max out-degree: ${maxOutDegree})`);
    }
    if (hasConvergence) {
      detectedProperties.push(`Convergent funneling present (max in-degree: ${maxInDegree})`);
    }
    if (hasParallelCorridors) {
      detectedProperties.push('Mutually disjoint parallel corridors detected');
    }
    if (bottleneckCandidates.length > 0) {
      detectedProperties.push(`${bottleneckCandidates.length} topological bottleneck candidate(s) detected`);
    }
    if (hasCycles) {
      detectedProperties.push(`Causal feedback loops detected (${detectedCycleCount} cycle(s), violates DAG assumption)`);
    }
    if (hasTemporalInversions) {
      detectedProperties.push(`Chronological timestamp inversion detected (${temporalViolationCount} retro-causal jump(s))`);
    }
    if (hasEvidenceConflicts) {
      detectedProperties.push(`Contradictory evidence detected (${conflictEdges.length} contradiction edge(s))`);
    }
    if (pathCountBound > 1) {
      detectedProperties.push(`Alternative route competition (${pathCountBound} candidate path(s) discovered)`);
    }

    return {
      nodeCount,
      edgeCount,
      density,
      averageOutDegree,
      maxOutDegree,
      maxInDegree,
      isLinearChain,
      isDisconnected,
      sourceReachableTarget,
      pathCountBound,
      hasBranching,
      hasConvergence,
      hasParallelCorridors,
      bottleneckCandidates,
      hasCycles,
      detectedCycleCount,
      hasTemporalInversions,
      temporalViolationCount,
      hasEvidenceConflicts,
      detectedEvidenceConflictCount: conflictEdges.length,
      detectedProperties
    };
  }

  private static computeReachableSet(nodes: GraphNode[], edges: GraphEdge[], rootId: string): Set<string> {
    const reachable = new Set<string>();
    const adj = new Map<string, string[]>();
    for (const n of nodes) adj.set(n.id, []);
    for (const e of edges) {
      if (adj.has(e.source)) adj.get(e.source)!.push(e.target);
    }

    const queue = [rootId];
    reachable.add(rootId);
    while (queue.length > 0) {
      const u = queue.shift()!;
      for (const v of adj.get(u) || []) {
        if (!reachable.has(v)) {
          reachable.add(v);
          queue.push(v);
        }
      }
    }
    return reachable;
  }

  private static inferSourceNode(nodes: GraphNode[], edges: GraphEdge[]): string {
    // Look for node with in-degree 0 and out-degree > 0
    const inDeg = new Map<string, number>();
    for (const n of nodes) inDeg.set(n.id, 0);
    for (const e of edges) inDeg.set(e.target, (inDeg.get(e.target) || 0) + 1);

    const sourceCandidate = nodes.find(n => (inDeg.get(n.id) || 0) === 0);
    return sourceCandidate ? sourceCandidate.id : nodes[0]?.id || '';
  }

  private static inferTargetNode(nodes: GraphNode[], edges: GraphEdge[], sourceId: string): string {
    // Look for node with out-degree 0 and in-degree > 0
    const outDeg = new Map<string, number>();
    for (const n of nodes) outDeg.set(n.id, 0);
    for (const e of edges) outDeg.set(e.source, (outDeg.get(e.source) || 0) + 1);

    const targetCandidate = nodes.find(n => n.id !== sourceId && (outDeg.get(n.id) || 0) === 0);
    return targetCandidate ? targetCandidate.id : nodes[nodes.length - 1]?.id || '';
  }
}

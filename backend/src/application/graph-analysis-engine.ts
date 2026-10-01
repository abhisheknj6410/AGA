import { GraphPayload, GraphNode, GraphEdge } from '../domain/types.js';
import { GraphDelta, AlgorithmRun, AlgorithmResult } from '../domain/possibility-types.js';
import { AlgorithmRepository } from '../infrastructure/repositories/algorithm-repository.js';
import {
  DijkstraAlgorithm,
  KShortestPathsAlgorithm,
  ArticulationPointsAlgorithm,
  DominatorsAlgorithm,
  MinCutAlgorithm,
  DisjointPathsAlgorithm,
  TemporalAnalysisAlgorithm,
  PatternMatchingAlgorithm,
  SteinerSubgraphAlgorithm,
  PathResult,
  KPathsResult,
  ArticulationAnalysisResult,
  DominatorAnalysisResult,
  MinCutResult,
  DisjointPathsResult,
  TemporalPathValidation,
  TopologicalSortResult,
  TemporalAmbiguityResult,
  PatternMatchResult,
  SteinerSubgraphResult
} from '../domain/algorithms/index.js';

export class GraphAnalysisEngine {
  constructor(private algorithmRepo?: AlgorithmRepository) {}

  /**
   * Applies an overlay / GraphDelta on top of a base graph to produce the possibility graph.
   * Ensures base graph is never mutated.
   */
  static applyDelta(baseGraph: GraphPayload, delta: GraphDelta): GraphPayload {
    const nodeMap = new Map<string, GraphNode>(baseGraph.nodes.map(n => [n.id, { ...n }]));
    const edgeMap = new Map<string, GraphEdge>(baseGraph.edges.map(e => [e.id, { ...e }]));

    // 1. Remove nodes
    if (delta.removedNodeIds) {
      for (const id of delta.removedNodeIds) {
        nodeMap.delete(id);
      }
    }

    // 2. Add nodes
    if (delta.addedNodes) {
      for (const n of delta.addedNodes) {
        nodeMap.set(n.id, n);
      }
    }

    // 3. Modify nodes
    if (delta.modifiedNodes) {
      for (const mod of delta.modifiedNodes) {
        if (mod.id && nodeMap.has(mod.id)) {
          const existing = nodeMap.get(mod.id)!;
          nodeMap.set(mod.id, { ...existing, ...mod });
        }
      }
    }

    // 4. Handle entity resolution merges if present
    if (delta.entityResolutionMerges) {
      for (const merge of delta.entityResolutionMerges) {
        const { survivingNodeId, mergedNodeId } = merge;
        nodeMap.delete(mergedNodeId);

        // Rewire all edges that referenced mergedNodeId to survivingNodeId
        for (const [eid, edge] of edgeMap.entries()) {
          let updated = false;
          let newSource = edge.source;
          let newTarget = edge.target;

          if (edge.source === mergedNodeId) {
            newSource = survivingNodeId;
            updated = true;
          }
          if (edge.target === mergedNodeId) {
            newTarget = survivingNodeId;
            updated = true;
          }

          if (updated) {
            if (newSource === newTarget) {
              // Avoid self loop
              edgeMap.delete(eid);
            } else {
              edgeMap.set(eid, { ...edge, source: newSource, target: newTarget });
            }
          }
        }
      }
    }

    // 5. Remove edges
    if (delta.removedEdgeIds) {
      for (const id of delta.removedEdgeIds) {
        edgeMap.delete(id);
      }
    }

    // 6. Add edges
    if (delta.addedEdges) {
      for (const e of delta.addedEdges) {
        // Only add edge if both source and target exist
        if (nodeMap.has(e.source) && nodeMap.has(e.target)) {
          edgeMap.set(e.id, e);
        }
      }
    }

    // 7. Modify edges
    if (delta.modifiedEdges) {
      for (const mod of delta.modifiedEdges) {
        if (mod.id && edgeMap.has(mod.id)) {
          const existing = edgeMap.get(mod.id)!;
          edgeMap.set(mod.id, { ...existing, ...mod });
        }
      }
    }

    // Clean up any dangling edges where source or target was deleted
    for (const [eid, edge] of edgeMap.entries()) {
      if (!nodeMap.has(edge.source) || !nodeMap.has(edge.target)) {
        edgeMap.delete(eid);
      }
    }

    const finalNodes = Array.from(nodeMap.values());
    const finalEdges = Array.from(edgeMap.values());

    return {
      nodes: finalNodes,
      edges: finalEdges,
      metadata: {
        caseId: baseGraph.metadata.caseId,
        nodeCount: finalNodes.length,
        edgeCount: finalEdges.length,
        entityCount: finalNodes.filter(n => n.category === 'ENTITY').length,
        eventCount: finalNodes.filter(n => n.category === 'EVENT').length,
        evidenceCount: finalNodes.filter(n => n.category === 'EVIDENCE').length,
        generatedAt: new Date().toISOString()
      }
    };
  }

  // --- Algorithm Execution Facade ---

  runDijkstra(
    graph: GraphPayload,
    sourceId: string,
    targetId: string,
    caseId: string,
    possibilityId?: string
  ): PathResult | null {
    const t0 = performance.now();
    const result = DijkstraAlgorithm.findShortestPath(graph.nodes, graph.edges, sourceId, targetId);
    const duration = performance.now() - t0;

    this.recordRun(caseId, possibilityId, 'DIJKSTRA', { sourceId, targetId }, graph, duration, result ? 'SUCCESS' : 'NO_PATH', {
      cost: result?.totalCost,
      hops: result?.nodeIds.length
    });

    return result;
  }

  runKShortestPaths(
    graph: GraphPayload,
    sourceId: string,
    targetId: string,
    k: number = 3,
    caseId: string,
    possibilityId?: string
  ): KPathsResult {
    const t0 = performance.now();
    const result = KShortestPathsAlgorithm.findKShortestPaths(graph.nodes, graph.edges, sourceId, targetId, k);
    const duration = performance.now() - t0;

    this.recordRun(caseId, possibilityId, 'K_SHORTEST_PATHS', { sourceId, targetId, k }, graph, duration, 'SUCCESS', {
      foundCount: result.foundCount
    });

    return result;
  }

  runArticulationPoints(
    graph: GraphPayload,
    caseId: string,
    possibilityId?: string
  ): ArticulationAnalysisResult {
    const t0 = performance.now();
    const result = ArticulationPointsAlgorithm.analyze(graph.nodes, graph.edges);
    const duration = performance.now() - t0;

    this.recordRun(caseId, possibilityId, 'ARTICULATION_POINTS', {}, graph, duration, 'SUCCESS', {
      pointCount: result.articulationPoints.length,
      bridgeCount: result.bridges.length
    });

    return result;
  }

  runDominators(
    graph: GraphPayload,
    rootId: string,
    targetId: string | undefined,
    caseId: string,
    possibilityId?: string
  ): DominatorAnalysisResult {
    const t0 = performance.now();
    const result = DominatorsAlgorithm.analyze(graph.nodes, graph.edges, rootId, targetId);
    const duration = performance.now() - t0;

    this.recordRun(caseId, possibilityId, 'DOMINATORS', { rootId, targetId }, graph, duration, 'SUCCESS', {
      unavoidableCount: result.unavoidableNodesForTarget?.length || 0
    });

    return result;
  }

  runMinCut(
    graph: GraphPayload,
    sourceId: string,
    targetId: string,
    caseId: string,
    possibilityId?: string
  ): MinCutResult {
    const t0 = performance.now();
    const result = MinCutAlgorithm.computeMinCut(graph.nodes, graph.edges, sourceId, targetId);
    const duration = performance.now() - t0;

    this.recordRun(caseId, possibilityId, 'MIN_CUT', { sourceId, targetId }, graph, duration, 'SUCCESS', {
      cutCapacity: result.cutCapacity,
      cutEdgesCount: result.cutEdges.length
    });

    return result;
  }

  runDisjointPaths(
    graph: GraphPayload,
    sourceId: string,
    targetId: string,
    mode: 'VERTEX_DISJOINT' | 'EDGE_DISJOINT',
    caseId: string,
    possibilityId?: string
  ): DisjointPathsResult {
    const t0 = performance.now();
    const result = DisjointPathsAlgorithm.findDisjointPaths(graph.nodes, graph.edges, sourceId, targetId, mode);
    const duration = performance.now() - t0;

    this.recordRun(caseId, possibilityId, 'DISJOINT_PATHS', { sourceId, targetId, mode }, graph, duration, 'SUCCESS', {
      corroborationCount: result.independentCorroborationCount
    });

    return result;
  }

  runTemporalAnalysis(
    graph: GraphPayload,
    caseId: string,
    possibilityId?: string
  ): {
    topologicalSort: TopologicalSortResult;
    ambiguities: TemporalAmbiguityResult;
  } {
    const t0 = performance.now();
    const topologicalSort = TemporalAnalysisAlgorithm.topologicalSort(graph.nodes, graph.edges);
    const ambiguities = TemporalAnalysisAlgorithm.detectAmbiguities(graph.nodes, graph.edges);
    const duration = performance.now() - t0;

    this.recordRun(caseId, possibilityId, 'TEMPORAL_ANALYSIS', {}, graph, duration, 'SUCCESS', {
      isAcyclic: topologicalSort.isAcyclic,
      ambiguityCount: ambiguities.underdeterminedPairs.length
    });

    return { topologicalSort, ambiguities };
  }

  runPatternMatching(
    graph: GraphPayload,
    caseId: string,
    possibilityId?: string
  ): PatternMatchResult[] {
    const t0 = performance.now();
    const results = PatternMatchingAlgorithm.matchPatterns(graph.nodes, graph.edges);
    const duration = performance.now() - t0;

    this.recordRun(caseId, possibilityId, 'PATTERN_MATCHING', {}, graph, duration, 'SUCCESS', {
      matchedPatterns: results.map(r => ({ id: r.patternId, pct: r.matchPercentage }))
    });

    return results;
  }

  runSteinerSubgraph(
    graph: GraphPayload,
    terminalIds: string[],
    caseId: string,
    possibilityId?: string
  ): SteinerSubgraphResult {
    const t0 = performance.now();
    const result = SteinerSubgraphAlgorithm.computeMinimalConnectingSubgraph(graph.nodes, graph.edges, terminalIds);
    const duration = performance.now() - t0;

    this.recordRun(caseId, possibilityId, 'STEINER_SUBGRAPH', { terminalIds }, graph, duration, 'SUCCESS', {
      subgraphNodeCount: result.nodes.length,
      subgraphEdgeCount: result.edges.length,
      cost: result.totalSubgraphCost
    });

    return result;
  }

  /**
   * Runs the comprehensive graph algorithm suite on a possibility graph.
   * Directly extracts the key forensic facts:
   * - Topological validity & acyclicity
   * - Critical intermediary nodes
   * - Unavoidable dominator choke points
   * - Independent corroborating routes
   * - Minimum cut containment barriers
   * - Attack pattern matching
   */
  runFullPossibilityAnalysis(
    graph: GraphPayload,
    caseId: string,
    possibilityId?: string,
    primarySourceId?: string,
    primaryTargetId?: string
  ): Record<string, unknown> {
    const articulation = this.runArticulationPoints(graph, caseId, possibilityId);
    const temporal = this.runTemporalAnalysis(graph, caseId, possibilityId);
    const patterns = this.runPatternMatching(graph, caseId, possibilityId);

    let shortestPath: PathResult | null = null;
    let kPaths: KPathsResult | null = null;
    let dominators: DominatorAnalysisResult | null = null;
    let minCut: MinCutResult | null = null;
    let disjoint: DisjointPathsResult | null = null;

    if (primarySourceId && primaryTargetId) {
      shortestPath = this.runDijkstra(graph, primarySourceId, primaryTargetId, caseId, possibilityId);
      kPaths = this.runKShortestPaths(graph, primarySourceId, primaryTargetId, 3, caseId, possibilityId);
      dominators = this.runDominators(graph, primarySourceId, primaryTargetId, caseId, possibilityId);
      minCut = this.runMinCut(graph, primarySourceId, primaryTargetId, caseId, possibilityId);
      disjoint = this.runDisjointPaths(graph, primarySourceId, primaryTargetId, 'VERTEX_DISJOINT', caseId, possibilityId);
    }

    return {
      temporalValidity: temporal.topologicalSort.isAcyclic ? 'VALID' : 'INVALID',
      temporalDetails: temporal,
      criticalNodes: articulation.articulationPoints,
      bridges: articulation.bridges,
      attackPatterns: patterns,
      shortestPath,
      alternativePaths: kPaths?.paths || [],
      dominators,
      minCut,
      independentCorroboration: disjoint
    };
  }

  private recordRun(
    caseId: string,
    possibilityId: string | undefined,
    algorithm: string,
    parameters: Record<string, unknown>,
    graph: GraphPayload,
    executionTimeMs: number,
    summary: string,
    payload: Record<string, unknown>
  ): void {
    if (!this.algorithmRepo) return;
    try {
      const run = this.algorithmRepo.createRun({
        caseId,
        possibilityId,
        algorithm,
        algorithmVersion: '1.0.0',
        parameters,
        graphVersion: 1,
        inputNodeCount: graph.nodes.length,
        inputEdgeCount: graph.edges.length,
        executionTimeMs
      });

      this.algorithmRepo.saveResult({
        runId: run.id,
        algorithm,
        resultType: `${algorithm}_RESULT`,
        summary,
        payload
      });
    } catch (e) {
      console.error('Failed to record algorithm run:', e);
    }
  }
}

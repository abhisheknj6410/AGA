import { GraphPayload, GraphNode, GraphEdge } from '../domain/types.js';

export interface GraphDiagnosticsResult {
  overview: {
    nodeCount: number;
    edgeCount: number;
    density: number;
    isolatedNodeCount: number;
    isolatedNodes: Array<{ id: string; label: string; category: string }>;
  };
  connectivity: {
    componentCount: number;
    componentSizes: number[];
    isFullyConnected: boolean;
  };
  degreeDistribution: {
    maxInDegree: { nodeId: string; label: string; degree: number } | null;
    maxOutDegree: { nodeId: string; label: string; degree: number } | null;
    topHubs: Array<{ nodeId: string; label: string; category: string; degree: number; inDegree: number; outDegree: number }>;
  };
  causalDagAnalysis: {
    causalEdgeCount: number;
    isAcyclic: boolean;
    detectedCycles: string[][];
  };
  temporalCausality: {
    evaluatedCount: number;
    violations: Array<{
      edgeId: string;
      type: string;
      sourceId: string;
      sourceLabel: string;
      sourceTime: string;
      targetId: string;
      targetLabel: string;
      targetTime: string;
    }>;
  };
  costIntegrity: {
    allNonNegative: boolean;
    minCost: number;
    maxCost: number;
    averageCost: number;
    negativeCostEdges: string[];
  };
  contradictions: Array<{
    edgeId: string;
    sourceId: string;
    sourceLabel: string;
    targetId: string;
    targetLabel: string;
  }>;
  phase2Readiness: {
    dijkstraCompatible: boolean;
    topologicalAnalysisCompatible: boolean;
    minCutMaxFlowCompatible: boolean;
    summary: string;
  };
}

export class GraphDiagnostics {
  static analyze(graph: GraphPayload): GraphDiagnosticsResult {
    const nodes = graph.nodes;
    const edges = graph.edges;
    const nodeMap = new Map<string, GraphNode>(nodes.map(n => [n.id, n]));

    // 1. Degree calculation
    const inDegreeMap = new Map<string, number>();
    const outDegreeMap = new Map<string, number>();
    for (const n of nodes) {
      inDegreeMap.set(n.id, 0);
      outDegreeMap.set(n.id, 0);
    }

    for (const e of edges) {
      if (outDegreeMap.has(e.source)) {
        outDegreeMap.set(e.source, outDegreeMap.get(e.source)! + 1);
      }
      if (inDegreeMap.has(e.target)) {
        inDegreeMap.set(e.target, inDegreeMap.get(e.target)! + 1);
      }
    }

    const isolatedNodes: Array<{ id: string; label: string; category: string }> = [];
    let maxIn = { nodeId: '', label: '', degree: -1 };
    let maxOut = { nodeId: '', label: '', degree: -1 };

    const hubList: Array<{ nodeId: string; label: string; category: string; degree: number; inDegree: number; outDegree: number }> = [];

    for (const n of nodes) {
      const inDeg = inDegreeMap.get(n.id) || 0;
      const outDeg = outDegreeMap.get(n.id) || 0;
      const totalDeg = inDeg + outDeg;

      if (totalDeg === 0) {
        isolatedNodes.push({ id: n.id, label: n.label, category: n.category });
      }

      if (inDeg > maxIn.degree) {
        maxIn = { nodeId: n.id, label: n.label, degree: inDeg };
      }
      if (outDeg > maxOut.degree) {
        maxOut = { nodeId: n.id, label: n.label, degree: outDeg };
      }

      hubList.push({
        nodeId: n.id,
        label: n.label,
        category: n.category,
        degree: totalDeg,
        inDegree: inDeg,
        outDegree: outDeg
      });
    }

    hubList.sort((a, b) => b.degree - a.degree);
    const topHubs = hubList.slice(0, 5);

    // 2. Density
    const nLen = nodes.length;
    const density = nLen > 1 ? Number((edges.length / (nLen * (nLen - 1))).toFixed(4)) : 0;

    // 3. Weakly Connected Components (Union-Find)
    const parent = new Map<string, string>();
    for (const n of nodes) parent.set(n.id, n.id);

    function find(i: string): string {
      let root = i;
      while (root !== parent.get(root)) {
        root = parent.get(root)!;
      }
      // path compression
      let curr = i;
      while (curr !== root) {
        const next = parent.get(curr)!;
        parent.set(curr, root);
        curr = next;
      }
      return root;
    }

    function union(i: string, j: string) {
      const rootI = find(i);
      const rootJ = find(j);
      if (rootI !== rootJ) {
        parent.set(rootI, rootJ);
      }
    }

    for (const e of edges) {
      if (parent.has(e.source) && parent.has(e.target)) {
        union(e.source, e.target);
      }
    }

    const componentMap = new Map<string, number>();
    for (const n of nodes) {
      const root = find(n.id);
      componentMap.set(root, (componentMap.get(root) || 0) + 1);
    }
    const componentSizes = Array.from(componentMap.values()).sort((a, b) => b - a);
    const componentCount = componentSizes.length;

    // 4. Causal DAG Analysis (Cycle detection on CAUSED, PRECEDED, TRIGGERED)
    const causalEdgeTypes = new Set(['CAUSED', 'PRECEDED', 'TRIGGERED']);
    const causalAdj = new Map<string, string[]>();
    let causalEdgeCount = 0;

    for (const e of edges) {
      if (causalEdgeTypes.has(e.type)) {
        causalEdgeCount++;
        if (!causalAdj.has(e.source)) causalAdj.set(e.source, []);
        causalAdj.get(e.source)!.push(e.target);
      }
    }

    const visited = new Map<string, 'WHITE' | 'GRAY' | 'BLACK'>();
    for (const n of nodes) visited.set(n.id, 'WHITE');

    const detectedCycles: string[][] = [];
    const currentPath: string[] = [];

    function dfsCycle(u: string) {
      visited.set(u, 'GRAY');
      currentPath.push(u);

      const neighbors = causalAdj.get(u) || [];
      for (const v of neighbors) {
        const state = visited.get(v);
        if (state === 'GRAY') {
          const cycleStartIdx = currentPath.indexOf(v);
          detectedCycles.push([...currentPath.slice(cycleStartIdx), v]);
        } else if (state === 'WHITE') {
          dfsCycle(v);
        }
      }

      currentPath.pop();
      visited.set(u, 'BLACK');
    }

    for (const n of nodes) {
      if (visited.get(n.id) === 'WHITE') {
        dfsCycle(n.id);
      }
    }

    // 5. Temporal Causality (start(u) <= start(v))
    const temporalViolations: Array<{
      edgeId: string;
      type: string;
      sourceId: string;
      sourceLabel: string;
      sourceTime: string;
      targetId: string;
      targetLabel: string;
      targetTime: string;
    }> = [];

    let evaluatedTemporalCount = 0;
    for (const e of edges) {
      if (causalEdgeTypes.has(e.type)) {
        const src = nodeMap.get(e.source);
        const tgt = nodeMap.get(e.target);
        if (src?.time?.start && tgt?.time?.start) {
          evaluatedTemporalCount++;
          const tSrc = new Date(src.time.start).getTime();
          const tTgt = new Date(tgt.time.start).getTime();
          if (tSrc > tTgt) {
            temporalViolations.push({
              edgeId: e.id,
              type: e.type,
              sourceId: src.id,
              sourceLabel: src.label,
              sourceTime: src.time.start,
              targetId: tgt.id,
              targetLabel: tgt.label,
              targetTime: tgt.time.start
            });
          }
        }
      }
    }

    // 6. Cost Integrity
    const negativeCostEdges: string[] = [];
    let minCost = Infinity;
    let maxCost = -Infinity;
    let sumCost = 0;

    for (const e of edges) {
      if (e.cost < 0) {
        negativeCostEdges.push(e.id);
      }
      if (e.cost < minCost) minCost = e.cost;
      if (e.cost > maxCost) maxCost = e.cost;
      sumCost += e.cost;
    }

    if (edges.length === 0) {
      minCost = 0;
      maxCost = 0;
    }

    const averageCost = edges.length > 0 ? Number((sumCost / edges.length).toFixed(2)) : 0;
    const allNonNegative = negativeCostEdges.length === 0;

    // 7. Contradictions
    const contradictions = edges
      .filter(e => e.type === 'CONTRADICTS')
      .map(e => ({
        edgeId: e.id,
        sourceId: e.source,
        sourceLabel: nodeMap.get(e.source)?.label || e.source,
        targetId: e.target,
        targetLabel: nodeMap.get(e.target)?.label || e.target
      }));

    // 8. Phase 2 Readiness Evaluation
    const dijkstraCompatible = allNonNegative && nodes.length > 0;
    const topologicalAnalysisCompatible = detectedCycles.length === 0;
    const minCutMaxFlowCompatible = nodes.length >= 2 && edges.length >= 1;

    let summary = 'Graph structure meets all mathematical invariants for Phase 2 algorithm implementation.';
    if (!allNonNegative) {
      summary = `Warning: ${negativeCostEdges.length} edges have negative costs, which will break standard Dijkstra.`;
    } else if (detectedCycles.length > 0) {
      summary = `Notice: Causal subgraph contains ${detectedCycles.length} cycle(s); topological sorting will require cycle resolution.`;
    }

    return {
      overview: {
        nodeCount: nodes.length,
        edgeCount: edges.length,
        density,
        isolatedNodeCount: isolatedNodes.length,
        isolatedNodes
      },
      connectivity: {
        componentCount,
        componentSizes,
        isFullyConnected: componentCount <= 1
      },
      degreeDistribution: {
        maxInDegree: maxIn.degree >= 0 ? maxIn : null,
        maxOutDegree: maxOut.degree >= 0 ? maxOut : null,
        topHubs
      },
      causalDagAnalysis: {
        causalEdgeCount,
        isAcyclic: detectedCycles.length === 0,
        detectedCycles
      },
      temporalCausality: {
        evaluatedCount: evaluatedTemporalCount,
        violations: temporalViolations
      },
      costIntegrity: {
        allNonNegative,
        minCost: minCost === Infinity ? 0 : minCost,
        maxCost: maxCost === -Infinity ? 0 : maxCost,
        averageCost,
        negativeCostEdges
      },
      contradictions,
      phase2Readiness: {
        dijkstraCompatible,
        topologicalAnalysisCompatible,
        minCutMaxFlowCompatible,
        summary
      }
    };
  }
}

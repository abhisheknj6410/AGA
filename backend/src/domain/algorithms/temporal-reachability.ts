import { GraphNode, GraphEdge } from '../types.js';

export interface TemporalViolation {
  previousEventId: string;
  previousEventLabel: string;
  previousTimestamp: string;
  nextEventId: string;
  nextEventLabel: string;
  nextTimestamp: string;
  deltaMs: number;
  edgeId: string;
  description: string;
}

export interface TemporalPathResult {
  nodeIds: string[];
  edgeIds: string[];
  nodes: GraphNode[];
  edges: GraphEdge[];
  startTimestamp?: string;
  endTimestamp?: string;
  durationMs?: number;
}

export interface TemporalReachabilityResult {
  reachable: boolean;
  sourceId: string;
  targetId: string;
  sourceLabel: string;
  targetLabel: string;
  validPathsCount: number;
  shortestTemporalPath: TemporalPathResult | null;
  violations: TemporalViolation[];
  evidenceRefs: string[];
  topologicalPathCount: number;
  temporalFailure: boolean;
  summary: string;
}

export class TemporalReachabilityAlgorithm {
  /**
   * Evaluates time-respecting directed reachability between sourceId and targetId.
   *
   * A path (v_0, e_1, v_1, ..., e_k, v_k) is temporally valid iff for every pair of
   * timestamped events along the path, t(e_i) <= t(e_{i+1}) (monotonically non-decreasing).
   *
   * If all topological paths from source to target violate temporal ordering,
   * reachability is false and the hypothesis/branch is mathematically impossible.
   */
  static evaluateReachability(
    nodes: GraphNode[],
    edges: GraphEdge[],
    sourceId: string,
    targetId: string,
    options: { maxPaths?: number; maxDepth?: number } = {}
  ): TemporalReachabilityResult {
    const maxPaths = options.maxPaths ?? 20;
    const maxDepth = options.maxDepth ?? 15;

    const nodeMap = new Map<string, GraphNode>(nodes.map(n => [n.id, n]));
    const edgeMap = new Map<string, GraphEdge>(edges.map(e => [e.id, e]));

    const sourceNode = nodeMap.get(sourceId);
    const targetNode = nodeMap.get(targetId);

    const sourceLabel = sourceNode?.label || sourceId;
    const targetLabel = targetNode?.label || targetId;

    if (!sourceNode || !targetNode) {
      return {
        reachable: false,
        sourceId,
        targetId,
        sourceLabel,
        targetLabel,
        validPathsCount: 0,
        shortestTemporalPath: null,
        violations: [],
        evidenceRefs: [],
        topologicalPathCount: 0,
        temporalFailure: false,
        summary: `Invalid query: Source (${sourceId}) or Target (${targetId}) does not exist in graph.`
      };
    }

    if (sourceId === targetId) {
      return {
        reachable: true,
        sourceId,
        targetId,
        sourceLabel,
        targetLabel,
        validPathsCount: 1,
        shortestTemporalPath: {
          nodeIds: [sourceId],
          edgeIds: [],
          nodes: [sourceNode],
          edges: []
        },
        violations: [],
        evidenceRefs: [],
        topologicalPathCount: 1,
        temporalFailure: false,
        summary: `Trivially reachable: Source and Target are identical node '${sourceLabel}'.`
      };
    }

    // Build directed adjacency list
    const outgoing = new Map<string, GraphEdge[]>();
    for (const node of nodes) {
      outgoing.set(node.id, []);
    }
    for (const edge of edges) {
      if (outgoing.has(edge.source)) {
        outgoing.get(edge.source)!.push(edge);
      }
    }

    const validPaths: TemporalPathResult[] = [];
    const recordedViolations: TemporalViolation[] = [];
    const evaluatedEvidenceRefs = new Set<string>();
    let topologicalPathsFound = 0;

    interface SearchState {
      currentId: string;
      lastTimestampMs: number | null;
      lastEventNode: GraphNode | null;
      pathNodeIds: string[];
      pathEdgeIds: string[];
    }

    const initialTimestampMs = sourceNode.category === 'EVENT' && sourceNode.time?.start
      ? new Date(sourceNode.time.start).getTime()
      : null;

    const queue: SearchState[] = [
      {
        currentId: sourceId,
        lastTimestampMs: initialTimestampMs,
        lastEventNode: sourceNode.category === 'EVENT' ? sourceNode : null,
        pathNodeIds: [sourceId],
        pathEdgeIds: []
      }
    ];

    while (queue.length > 0 && validPaths.length < maxPaths) {
      const state = queue.shift()!;

      if (state.pathNodeIds.length > maxDepth) {
        continue;
      }

      if (state.currentId === targetId) {
        topologicalPathsFound++;
        const pNodes = state.pathNodeIds.map(id => nodeMap.get(id)!);
        const pEdges = state.pathEdgeIds.map(id => edgeMap.get(id)!);

        const eventNodesInPath = pNodes.filter(n => n.category === 'EVENT' && n.time?.start);
        const startTimestamp = eventNodesInPath[0]?.time?.start;
        const endTimestamp = eventNodesInPath[eventNodesInPath.length - 1]?.time?.start;
        const durationMs = startTimestamp && endTimestamp
          ? new Date(endTimestamp).getTime() - new Date(startTimestamp).getTime()
          : undefined;

        validPaths.push({
          nodeIds: state.pathNodeIds,
          edgeIds: state.pathEdgeIds,
          nodes: pNodes,
          edges: pEdges,
          startTimestamp,
          endTimestamp,
          durationMs
        });
        continue;
      }

      const nextEdges = outgoing.get(state.currentId) || [];
      for (const edge of nextEdges) {
        // Collect evidence references for auditing
        if (edge.evidenceRefs) {
          for (const ev of edge.evidenceRefs) {
            evaluatedEvidenceRefs.add(ev);
          }
        }

        const nextId = edge.target;
        // Avoid loops in simple path search
        if (state.pathNodeIds.includes(nextId)) {
          continue;
        }

        const nextNode = nodeMap.get(nextId);
        if (!nextNode) continue;

        let nextTimestampMs = state.lastTimestampMs;
        let nextEventNode = state.lastEventNode;

        if (nextNode.category === 'EVENT' && nextNode.time?.start) {
          const tNext = new Date(nextNode.time.start).getTime();

          // Check for temporal inversion
          if (state.lastTimestampMs !== null && tNext < state.lastTimestampMs) {
            // Topological path exists, but is temporally retrograde
            topologicalPathsFound++;
            const deltaMs = tNext - state.lastTimestampMs;
            const violation: TemporalViolation = {
              previousEventId: state.lastEventNode?.id || state.currentId,
              previousEventLabel: state.lastEventNode?.label || state.currentId,
              previousTimestamp: state.lastEventNode?.time?.start || new Date(state.lastTimestampMs).toISOString(),
              nextEventId: nextNode.id,
              nextEventLabel: nextNode.label,
              nextTimestamp: nextNode.time.start,
              deltaMs,
              edgeId: edge.id,
              description: `Temporal Inversion: Event '${state.lastEventNode?.label || state.currentId}' occurs at ${state.lastEventNode?.time?.start || state.lastTimestampMs}, but subsequent causal step '${nextNode.label}' occurs earlier at ${nextNode.time.start} (delta: ${deltaMs}ms).`
            };
            recordedViolations.push(violation);
            // Prune this path branch: cause cannot travel backward in time
            continue;
          }

          nextTimestampMs = tNext;
          nextEventNode = nextNode;
        }

        queue.push({
          currentId: nextId,
          lastTimestampMs: nextTimestampMs,
          lastEventNode: nextEventNode,
          pathNodeIds: [...state.pathNodeIds, nextId],
          pathEdgeIds: [...state.pathEdgeIds, edge.id]
        });
      }
    }

    const reachable = validPaths.length > 0;
    const temporalFailure = !reachable && (recordedViolations.length > 0 || topologicalPathsFound > 0);

    let summary = '';
    if (reachable) {
      summary = `Target '${targetLabel}' is temporally reachable from '${sourceLabel}' via ${validPaths.length} time-consistent causal corridor(s).`;
    } else if (temporalFailure) {
      summary = `Target '${targetLabel}' is temporally UNREACHABLE from '${sourceLabel}': All topological paths violate temporal sequence (cause occurs after effect).`;
    } else {
      summary = `Target '${targetLabel}' is UNREACHABLE from '${sourceLabel}': No directed structural path exists in the evidence graph.`;
    }

    return {
      reachable,
      sourceId,
      targetId,
      sourceLabel,
      targetLabel,
      validPathsCount: validPaths.length,
      shortestTemporalPath: validPaths[0] || null,
      violations: recordedViolations,
      evidenceRefs: Array.from(evaluatedEvidenceRefs),
      topologicalPathCount: topologicalPathsFound,
      temporalFailure,
      summary
    };
  }
}

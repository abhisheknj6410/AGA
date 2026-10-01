import { GraphNode, GraphEdge } from '../types.js';

export interface TemporalPathValidation {
  isValid: boolean;
  violations: Array<{
    previousEventId: string;
    previousEventLabel: string;
    previousTimestamp: string;
    nextEventId: string;
    nextEventLabel: string;
    nextTimestamp: string;
    deltaMs: number;
  }>;
}

export interface TemporalAmbiguityResult {
  underdeterminedPairs: Array<{
    eventA: { id: string; label: string; timestamp?: string };
    eventB: { id: string; label: string; timestamp?: string };
    commonSuccessor: { id: string; label: string };
    explanation: string;
  }>;
  summary: string;
}

export interface TopologicalSortResult {
  isAcyclic: boolean;
  sortedEventIds: string[];
  sortedEvents: Array<{ id: string; label: string; timestamp?: string }>;
  detectedCycles: string[][];
  summary: string;
}

export class TemporalAnalysisAlgorithm {
  /**
   * Verifies that all timestamped events along a path follow chronological order (t_i <= t_{i+1}).
   */
  static validatePathChronology(pathNodes: GraphNode[]): TemporalPathValidation {
    const events = pathNodes.filter(n => n.category === 'EVENT' && n.time?.start);
    const violations: TemporalPathValidation['violations'] = [];

    for (let i = 0; i < events.length - 1; i++) {
      const e1 = events[i];
      const e2 = events[i + 1];

      const t1 = new Date(e1.time!.start!).getTime();
      const t2 = new Date(e2.time!.start!).getTime();

      if (t2 < t1) {
        violations.push({
          previousEventId: e1.id,
          previousEventLabel: e1.label,
          previousTimestamp: e1.time!.start!,
          nextEventId: e2.id,
          nextEventLabel: e2.label,
          nextTimestamp: e2.time!.start!,
          deltaMs: t2 - t1
        });
      }
    }

    return {
      isValid: violations.length === 0,
      violations
    };
  }

  /**
   * Kahn's topological sort on causal/temporal dependencies (CAUSED, PRECEDED, DEPENDS_ON).
   * Identifies if event network is a valid acyclic execution flow or has causal paradox loops.
   */
  static topologicalSort(nodes: GraphNode[], edges: GraphEdge[]): TopologicalSortResult {
    const causalEdgeTypes = new Set(['CAUSED', 'PRECEDED', 'DEPENDS_ON', 'TRIGGERED']);
    const causalEdges = edges.filter(e => causalEdgeTypes.has(e.type));

    const eventNodes = nodes.filter(n => n.category === 'EVENT');
    const eventMap = new Map<string, GraphNode>(eventNodes.map(n => [n.id, n]));

    const inDegree = new Map<string, number>();
    const adj = new Map<string, string[]>();

    for (const e of eventNodes) {
      inDegree.set(e.id, 0);
      adj.set(e.id, []);
    }

    for (const edge of causalEdges) {
      if (inDegree.has(edge.source) && inDegree.has(edge.target)) {
        adj.get(edge.source)!.push(edge.target);
        inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
      }
    }

    const queue: string[] = [];
    for (const [id, deg] of inDegree.entries()) {
      if (deg === 0) queue.push(id);
    }

    const sortedIds: string[] = [];
    while (queue.length > 0) {
      const u = queue.shift()!;
      sortedIds.push(u);

      for (const v of adj.get(u) || []) {
        const nextDeg = inDegree.get(v)! - 1;
        inDegree.set(v, nextDeg);
        if (nextDeg === 0) {
          queue.push(v);
        }
      }
    }

    const isAcyclic = sortedIds.length === eventNodes.length;
    const sortedEvents = sortedIds.map(id => {
      const ev = eventMap.get(id)!;
      return { id: ev.id, label: ev.label, timestamp: ev.time?.start };
    });

    return {
      isAcyclic,
      sortedEventIds: sortedIds,
      sortedEvents,
      detectedCycles: isAcyclic ? [] : [['Cycle detected in event causal dependencies']],
      summary: isAcyclic
        ? `Successfully generated topological event order across ${sortedIds.length} events.`
        : `Causal cycle detected among ${eventNodes.length - sortedIds.length} events.`
    };
  }

  /**
   * Ambiguity detection: Identifies events that are both prerequisites for a target event C,
   * but whose mutual ordering is unconstrained (underdetermined).
   */
  static detectAmbiguities(nodes: GraphNode[], edges: GraphEdge[]): TemporalAmbiguityResult {
    const causalEdgeTypes = new Set(['CAUSED', 'PRECEDED', 'DEPENDS_ON', 'TRIGGERED']);
    const causalEdges = edges.filter(e => causalEdgeTypes.has(e.type));
    const eventMap = new Map<string, GraphNode>(nodes.filter(n => n.category === 'EVENT').map(n => [n.id, n]));

    // Build incoming causal parents
    const parents = new Map<string, string[]>();
    for (const n of eventMap.keys()) {
      parents.set(n, []);
    }
    for (const e of causalEdges) {
      if (parents.has(e.target) && eventMap.has(e.source)) {
        parents.get(e.target)!.push(e.source);
      }
    }

    const underdeterminedPairs: TemporalAmbiguityResult['underdeterminedPairs'] = [];

    // For each target event with 2+ parents
    for (const [targetId, prs] of parents.entries()) {
      if (prs.length < 2) continue;
      const targetNode = eventMap.get(targetId)!;

      for (let i = 0; i < prs.length; i++) {
        for (let j = i + 1; j < prs.length; j++) {
          const p1 = prs[i];
          const p2 = prs[j];

          // Check if there is an edge between p1 and p2 in either direction
          const hasDirectConstraint = causalEdges.some(
            e => (e.source === p1 && e.target === p2) || (e.source === p2 && e.target === p1)
          );

          if (!hasDirectConstraint) {
            const evA = eventMap.get(p1)!;
            const evB = eventMap.get(p2)!;
            underdeterminedPairs.push({
              eventA: { id: evA.id, label: evA.label, timestamp: evA.time?.start },
              eventB: { id: evB.id, label: evB.label, timestamp: evB.time?.start },
              commonSuccessor: { id: targetNode.id, label: targetNode.label },
              explanation: `Both '${evA.label}' and '${evB.label}' are prerequisites for '${targetNode.label}', but their relative ordering cannot be determined from available evidence.`
            });
          }
        }
      }
    }

    return {
      underdeterminedPairs,
      summary: `Found ${underdeterminedPairs.length} underdetermined temporal ambiguity pairs.`
    };
  }
}

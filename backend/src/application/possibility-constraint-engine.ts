import { GraphPayload, GraphNode, GraphEdge } from '../domain/types.js';
import { TemporalAnalysisAlgorithm } from '../domain/algorithms/temporal-analysis.js';
import { RELATIONSHIP_RULES } from '../domain/vocabulary.js';

export interface ConstraintEvaluationResult {
  isValid: boolean;
  status: 'VALID' | 'INVALID' | 'CONDITIONAL' | 'CONFLICTING';
  violations: string[];
  warnings: string[];
  temporalViolations: Array<{
    previousEvent: string;
    nextEvent: string;
    deltaMs: number;
  }>;
  unsupportedEdges: string[];
  contradictionCount: number;
}

export interface ConstraintOptions {
  requireEvidenceForObserved?: boolean;
  disallowTemporalInversion?: boolean;
  disallowCausalCycles?: boolean;
  minEvidenceSupport?: number;
  allowedNodeCategories?: string[];
  activeEdgeIds?: string[];
}

export class PossibilityConstraintEngine {
  /**
   * Evaluates a possibility graph against strict structural, temporal, and evidence constraints.
   * If an algorithm finds a violation, it deterministically alters the possibility's status or eliminates it.
   */
  static evaluateGraph(
    graph: GraphPayload,
    options: ConstraintOptions = {}
  ): ConstraintEvaluationResult {
    const violations: string[] = [];
    const warnings: string[] = [];
    const temporalViolations: ConstraintEvaluationResult['temporalViolations'] = [];
    const unsupportedEdges: string[] = [];

    const nodeMap = new Map<string, GraphNode>(graph.nodes.map(n => [n.id, n]));

    // 1. Structural Constraints: Reference Integrity & Relationship Directions
    for (const edge of graph.edges) {
      const sourceNode = nodeMap.get(edge.source);
      const targetNode = nodeMap.get(edge.target);

      if (!sourceNode || !targetNode) {
        violations.push(`Dangling edge ${edge.id}: source or target node missing.`);
        continue;
      }

      const rule = RELATIONSHIP_RULES[edge.type];
      if (rule) {
        if (!rule.allowedSourceCategories.includes(sourceNode.category)) {
          violations.push(
            `Invalid relationship direction: ${sourceNode.category} cannot be source of ${edge.type}`
          );
        }
        if (!rule.allowedTargetCategories.includes(targetNode.category)) {
          violations.push(
            `Invalid relationship direction: ${targetNode.category} cannot be target of ${edge.type}`
          );
        }
      }

      // Evidence Provenance Constraint: OBSERVED links must have supporting evidence
      if (options.requireEvidenceForObserved !== false && edge.status === 'OBSERVED') {
        const hasEvidence = edge.evidenceRefs && edge.evidenceRefs.length > 0;
        if (!hasEvidence) {
          unsupportedEdges.push(edge.id);
          violations.push(`Edge ${edge.type} (${edge.id}) marked OBSERVED but lacks supporting evidence.`);
        }
      }
    }

    // 2. Temporal Constraints: Path Chronology & Event Inversion Detection
    const eventNodes = graph.nodes.filter(n => n.category === 'EVENT' && n.time?.start);
    const sortedEvents = [...eventNodes].sort((a, b) => {
      const tA = new Date(a.time!.start!).getTime();
      const tB = new Date(b.time!.start!).getTime();
      return tA - tB;
    });

    // Check direct causal/temporal edges for timestamp inversion
    const temporalEdgeTypes = new Set(['CAUSED', 'PRECEDED', 'TRIGGERED', 'DEPENDS_ON']);
    for (const edge of graph.edges) {
      // Inactive hypothesized edges from other candidate branches do not constrain this possibility
      if (edge.status === 'HYPOTHESIZED' && (!options.activeEdgeIds || !options.activeEdgeIds.includes(edge.id))) {
        continue;
      }

      if (temporalEdgeTypes.has(edge.type)) {
        const src = nodeMap.get(edge.source);
        const tgt = nodeMap.get(edge.target);

        if (src?.time?.start && tgt?.time?.start) {
          const tSrc = new Date(src.time.start).getTime();
          const tTgt = new Date(tgt.time.start).getTime();

          if (edge.type === 'PRECEDED' || edge.type === 'CAUSED' || edge.type === 'TRIGGERED') {
            if (tTgt < tSrc) {
              const deltaMs = tTgt - tSrc;
              temporalViolations.push({
                previousEvent: src.label,
                nextEvent: tgt.label,
                deltaMs
              });
              violations.push(
                `Temporal Causality Violation: '${src.label}' (${src.time.start}) occurs after effect '${tgt.label}' (${tgt.time.start})`
              );
            }
          }
        }
      }
    }

    // 3. Causal DAG Acyclicity Constraint (Kahn's Topological Sort)
    if (options.disallowCausalCycles !== false) {
      const topoResult = TemporalAnalysisAlgorithm.topologicalSort(graph.nodes, graph.edges);
      if (!topoResult.isAcyclic) {
        violations.push(`Causal Paradox: Cycle detected in event dependencies: ${topoResult.summary}`);
      }
    }

    // 4. Evidence Contradictions Check
    const contradictionEdges = graph.edges.filter(e => e.type === 'CONTRADICTS');
    const contradictionCount = contradictionEdges.length;

    // Determine Final Epistemic Status
    let status: 'VALID' | 'INVALID' | 'CONDITIONAL' | 'CONFLICTING' = 'VALID';
    const isValid = violations.length === 0;

    if (!isValid) {
      status = 'INVALID';
    } else if (contradictionCount > 0) {
      status = 'CONFLICTING';
    } else if (graph.edges.some(e => e.status === 'HYPOTHESIZED') || graph.nodes.some(n => (n.properties as any)?.inferred)) {
      status = 'CONDITIONAL';
    }

    return {
      isValid,
      status,
      violations,
      warnings,
      temporalViolations,
      unsupportedEdges,
      contradictionCount
    };
  }

  /**
   * Filters a candidate path through temporal chronology and evidence support.
   * Returns true if path satisfies all investigative constraints, false if it should be eliminated.
   */
  static isPathValid(
    pathNodes: GraphNode[],
    pathEdges: GraphEdge[],
    minEvidenceCount = 1
  ): { valid: boolean; reason?: string } {
    // 1. Verify chronological sequence of events along the path
    const chronoCheck = TemporalAnalysisAlgorithm.validatePathChronology(pathNodes);
    if (!chronoCheck.isValid) {
      const v = chronoCheck.violations[0];
      return {
        valid: false,
        reason: `Temporal Inversion: Event '${v.previousEventLabel}' (${v.previousTimestamp}) occurs after subsequent event '${v.nextEventLabel}' (${v.nextTimestamp})`
      };
    }

    // 2. Verify evidence support requirements
    let totalEvidenceRefs = 0;
    for (const edge of pathEdges) {
      if (edge.evidenceRefs) {
        totalEvidenceRefs += edge.evidenceRefs.length;
      }
    }

    if (pathEdges.length > 0 && totalEvidenceRefs < minEvidenceCount) {
      return {
        valid: false,
        reason: `Insufficient Evidence: Path contains ${pathEdges.length} edges but only ${totalEvidenceRefs} evidence references (minimum required: ${minEvidenceCount})`
      };
    }

    return { valid: true };
  }
}

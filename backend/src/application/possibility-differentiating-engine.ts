import { GraphPayload, GraphNode, GraphEdge } from '../domain/types.js';
import { Possibility, PossibilityComparison } from '../domain/possibility-types.js';
import { GraphAnalysisEngine } from './graph-analysis-engine.js';

export interface CommonInvariants {
  commonNodes: Array<{ id: string; label: string; category: string; type: string }>;
  commonEdges: Array<{ source: string; target: string; type: string }>;
  commonEvidenceRefs: string[];
  commonUnavoidableNodes: string[];
  universalCoveragePercentage: number;
}

export interface ResolvingEvidenceRecommendation {
  distinguishingElement: string;
  distinguishingType: 'NODE' | 'EDGE' | 'IDENTITY' | 'TEMPORAL_ORDER';
  affectedPossibilityIds: string[];
  targetEntities: string[];
  recommendedAction: string;
  rationale: string;
}

export class PossibilityDifferentiatingEngine {
  /**
   * Computes the exact structural intersection across all surviving possibilities.
   */
  static extractCommonInvariants(
    baseGraph: GraphPayload,
    possibilities: Possibility[]
  ): CommonInvariants {
    if (possibilities.length === 0) {
      return {
        commonNodes: [],
        commonEdges: [],
        commonEvidenceRefs: [],
        commonUnavoidableNodes: [],
        universalCoveragePercentage: 0
      };
    }

    const totalCount = possibilities.length;
    const nodeCounts = new Map<string, number>();
    const edgeCounts = new Map<string, number>();
    const evidenceCounts = new Map<string, number>();

    const possibilityGraphs = possibilities.map(p =>
      GraphAnalysisEngine.applyDelta(baseGraph, p.graphChanges)
    );

    // Count node occurrences across all possibilities
    for (const g of possibilityGraphs) {
      const seenNodes = new Set<string>();
      for (const n of g.nodes) {
        if (!seenNodes.has(n.id)) {
          seenNodes.add(n.id);
          nodeCounts.set(n.id, (nodeCounts.get(n.id) || 0) + 1);
        }
      }

      const seenEdges = new Set<string>();
      for (const e of g.edges) {
        const edgeKey = `${e.source}==${e.target}==${e.type}`;
        if (!seenEdges.has(edgeKey)) {
          seenEdges.add(edgeKey);
          edgeCounts.set(edgeKey, (edgeCounts.get(edgeKey) || 0) + 1);
        }
      }
    }

    for (const p of possibilities) {
      for (const ev of p.supportingEvidence) {
        evidenceCounts.set(ev, (evidenceCounts.get(ev) || 0) + 1);
      }
    }

    // Filter elements present in 100% of possibilities
    const commonNodeIds = Array.from(nodeCounts.entries())
      .filter(([_, count]) => count === totalCount)
      .map(([id]) => id);

    const baseNodeMap = new Map<string, GraphNode>(baseGraph.nodes.map(n => [n.id, n]));
    const commonNodes = commonNodeIds.map(id => {
      const n = baseNodeMap.get(id);
      return {
        id,
        label: n?.label || id,
        category: n?.category || 'ENTITY',
        type: n?.type || 'UNKNOWN'
      };
    });

    const commonEdges = Array.from(edgeCounts.entries())
      .filter(([_, count]) => count === totalCount)
      .map(([key]) => {
        const [source, target, type] = key.split('==');
        return { source, target, type };
      });

    const commonEvidenceRefs = Array.from(evidenceCounts.entries())
      .filter(([_, count]) => count === totalCount)
      .map(([id]) => id);

    return {
      commonNodes,
      commonEdges,
      commonEvidenceRefs,
      commonUnavoidableNodes: commonNodeIds.filter(id => baseNodeMap.get(id)?.category === 'ENTITY'),
      universalCoveragePercentage: 100
    };
  }

  /**
   * Identifies what missing observations would distinguish competing possibilities.
   */
  static identifyResolvingEvidence(
    comparison: PossibilityComparison,
    baseGraph: GraphPayload
  ): ResolvingEvidenceRecommendation[] {
    const recommendations: ResolvingEvidenceRecommendation[] = [];
    const nodeMap = new Map<string, GraphNode>(baseGraph.nodes.map(n => [n.id, n]));

    const { distinguishingNodes, distinguishingEdges, distinguishingEvidence } = comparison.structuralDiff;

    // 1. Recommendations based on distinguishing nodes
    for (const [pId, uniqueNodeIds] of Object.entries(distinguishingNodes)) {
      for (const nId of uniqueNodeIds) {
        const node = nodeMap.get(nId);
        if (node) {
          recommendations.push({
            distinguishingElement: node.label,
            distinguishingType: 'NODE',
            affectedPossibilityIds: [pId],
            targetEntities: [node.id],
            recommendedAction: `Subpoena or query records directly involving '${node.label}' (${node.type}).`,
            rationale: `Node '${node.label}' is uniquely required by possibility ${pId}. Confirming or disproving its activity will validate or eliminate this possibility.`
          });
        }
      }
    }

    // 2. Recommendations based on distinguishing edges
    for (const [pId, uniqueEdges] of Object.entries(distinguishingEdges)) {
      for (const e of uniqueEdges) {
        const src = nodeMap.get(e.source);
        const tgt = nodeMap.get(e.target);
        recommendations.push({
          distinguishingElement: `${src?.label || e.source} -[${e.type}]-> ${tgt?.label || e.target}`,
          distinguishingType: 'EDGE',
          affectedPossibilityIds: [pId],
          targetEntities: [e.source, e.target],
          recommendedAction: `Obtain timestamped communication, access, or transit evidence linking '${src?.label || e.source}' to '${tgt?.label || e.target}'.`,
          rationale: `The direct relationship '${e.type}' between these entities is unique to this possibility.`
        });
      }
    }

    return recommendations.slice(0, 5);
  }
}

import { GraphNode, GraphEdge, GraphPayload } from '../types.js';
import { GraphDelta, AffectedSubgraph } from '../incremental-types.js';
import { Possibility } from '../possibility-types.js';

export class AffectedSubgraphEngine {
  /**
   * Identifies the affected region of the graph given a semantic delta,
   * using neighborhood reachability, evidence provenance links, and possibility path membership.
   */
  static computeAffectedSubgraph(
    graph: GraphPayload,
    delta: GraphDelta,
    currentPossibilities: Possibility[] = []
  ): AffectedSubgraph {
    const affectedNodeSet = new Set<string>();
    const affectedEdgeSet = new Set<string>();
    const affectedEvidenceSet = new Set<string>();
    const reasons: string[] = [];

    // 1. Direct Node Additions, Removals, and Modifications
    for (const n of delta.addedNodes) {
      affectedNodeSet.add(n.id);
      reasons.push(`Node '${n.label}' (${n.id}) added`);
    }
    for (const n of delta.removedNodes) {
      affectedNodeSet.add(n.id);
      reasons.push(`Node '${n.label}' (${n.id}) removed`);
    }
    for (const m of delta.modifiedNodes) {
      affectedNodeSet.add(m.after.id);
      reasons.push(`Node '${m.after.label}' (${m.after.id}) modified`);
    }

    // 2. Direct Edge Additions, Removals, and Modifications
    for (const e of delta.addedEdges) {
      affectedEdgeSet.add(e.id);
      affectedNodeSet.add(e.source);
      affectedNodeSet.add(e.target);
      reasons.push(`Edge ${e.source} → ${e.target} (${e.id}) added`);
    }
    for (const e of delta.removedEdges) {
      affectedEdgeSet.add(e.id);
      affectedNodeSet.add(e.source);
      affectedNodeSet.add(e.target);
      reasons.push(`Edge ${e.source} → ${e.target} (${e.id}) removed`);
    }
    for (const m of delta.modifiedEdges) {
      affectedEdgeSet.add(m.after.id);
      affectedNodeSet.add(m.after.source);
      affectedNodeSet.add(m.after.target);
      reasons.push(`Edge ${m.after.source} → ${m.after.target} (${m.after.id}) modified`);
    }

    // 3. Changed Evidence Items
    for (const ce of delta.changedEvidence) {
      affectedEvidenceSet.add(ce.evidenceId);
      reasons.push(`Evidence '${ce.evidenceId}' ${ce.type.toLowerCase()}`);

      // Locate all edges referencing this evidence
      for (const edge of graph.edges) {
        if (edge.evidenceRefs && edge.evidenceRefs.includes(ce.evidenceId)) {
          affectedEdgeSet.add(edge.id);
          affectedNodeSet.add(edge.source);
          affectedNodeSet.add(edge.target);
        }
      }
    }

    // 4. Changed Temporal Constraints on Events
    for (const tc of delta.changedTemporalConstraints) {
      affectedNodeSet.add(tc.eventId);
      reasons.push(`Temporal constraint on event '${tc.eventId}' changed (${tc.reason})`);

      // All edges directly incident to this event
      for (const edge of graph.edges) {
        if (edge.source === tc.eventId || edge.target === tc.eventId) {
          affectedEdgeSet.add(edge.id);
        }
      }
    }

    // 5. Changed Identity Constraints
    for (const ic of delta.changedIdentityConstraints) {
      affectedNodeSet.add(ic.sourceId);
      affectedNodeSet.add(ic.targetId);
      reasons.push(`Identity constraint between ${ic.sourceId} and ${ic.targetId}: ${ic.action}`);
    }

    // 6. 1-hop Neighborhood Reachability Expansion
    const seedNodes = Array.from(affectedNodeSet);
    for (const seed of seedNodes) {
      for (const edge of graph.edges) {
        if (edge.source === seed) {
          affectedNodeSet.add(edge.target);
          affectedEdgeSet.add(edge.id);
        } else if (edge.target === seed) {
          affectedNodeSet.add(edge.source);
          affectedEdgeSet.add(edge.id);
        }
      }
    }

    // 7. Possibility Path Membership Cross-Check
    for (const p of currentPossibilities) {
      let isPossibilityAffected = false;

      // Check evidence dependency
      for (const evId of affectedEvidenceSet) {
        if (p.supportingEvidence.includes(evId)) {
          isPossibilityAffected = true;
          break;
        }
      }

      // Check node/edge intersection
      if (!isPossibilityAffected) {
        const pNodes = p.constraints.pathLength ? (p.graphChanges.addedNodes.map(n => n.id)) : [];
        for (const nId of pNodes) {
          if (affectedNodeSet.has(nId)) {
            isPossibilityAffected = true;
            break;
          }
        }
      }

      if (isPossibilityAffected) {
        for (const ev of p.supportingEvidence) {
          affectedEvidenceSet.add(ev);
        }
      }
    }

    return {
      affectedNodeIds: Array.from(affectedNodeSet).sort(),
      affectedEdgeIds: Array.from(affectedEdgeSet).sort(),
      affectedEvidenceIds: Array.from(affectedEvidenceSet).sort(),
      propagationReason: reasons.slice(0, 5).join('; ') || 'Graph topology updated'
    };
  }
}

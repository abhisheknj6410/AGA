import { Possibility, PossibilityStatus } from '../domain/possibility-types.js';
import {
  GraphDelta,
  GraphMutation,
  PossibilityEvolution,
  AddedPossibilityRecord,
  RemovedPossibilityRecord,
  ModifiedPossibilityRecord,
  UnchangedPossibilityRecord
} from '../domain/incremental-types.js';

export class PossibilityEvolutionEngine {
  /**
   * Compares two possibility spaces across graph versions (V_n vs V_{n+1}),
   * categorizing possibilities into Added (+), Removed (-), Modified (~), and Unchanged (=)
   * with explicit causal explanations derived from the graph mutation and delta.
   */
  static computeEvolution(
    fromVersion: number,
    toVersion: number,
    beforePossibilities: Possibility[],
    afterPossibilities: Possibility[],
    mutation: GraphMutation,
    delta: GraphDelta
  ): PossibilityEvolution {
    const beforeMap = new Map<string, Possibility>(
      beforePossibilities.map(p => [p.canonicalSignature, p])
    );
    const afterMap = new Map<string, Possibility>(
      afterPossibilities.map(p => [p.canonicalSignature, p])
    );

    const added: AddedPossibilityRecord[] = [];
    const removed: RemovedPossibilityRecord[] = [];
    const modified: ModifiedPossibilityRecord[] = [];
    const unchanged: UnchangedPossibilityRecord[] = [];

    // 1. Check after possibilities against before
    for (const pAfter of afterPossibilities) {
      const pBefore = beforeMap.get(pAfter.canonicalSignature);

      if (!pBefore) {
        // Possibility was ADDED
        let causalReason = `Possibility spawned following graph mutation: ${mutation.summary}.`;
        let spawningAlgorithm = 'K_SHORTEST_PATHS';

        if (mutation.action === 'ADD_EDGE') {
          causalReason = `New candidate corridor formed by the introduction of edge ${mutation.targetId}.`;
          spawningAlgorithm = 'K_SHORTEST_PATHS';
        } else if (mutation.action === 'ADD_NODE') {
          causalReason = `Introduced after new evidence node '${pAfter.supportingEvidence[0] || mutation.targetId}' satisfied provenance requirements.`;
          spawningAlgorithm = 'EVIDENCE_PROVENANCE_ENGINE';
        } else if (mutation.action === 'MERGE_ENTITIES') {
          causalReason = `Topological rewiring from entity merge created new reachability between principals.`;
          spawningAlgorithm = 'ENTITY_RESOLUTION_ENGINE';
        }

        added.push({
          possibility: pAfter,
          causalReason,
          spawningAlgorithm
        });
      } else {
        // Exists in both: check if modified or unchanged
        const statusChanged = pBefore.status !== pAfter.status;
        const evidenceChanged =
          pBefore.supportingEvidence.length !== pAfter.supportingEvidence.length ||
          pBefore.conflictingEvidence.length !== pAfter.conflictingEvidence.length;

        if (statusChanged || evidenceChanged) {
          let causalReason = `Status transitioned from ${pBefore.status} to ${pAfter.status}.`;
          if (pAfter.status === 'INVALID' && delta.changedTemporalConstraints.length > 0) {
            const tc = delta.changedTemporalConstraints[0];
            causalReason = `Became INVALID due to timestamp modification on event '${tc.eventId}' (${tc.reason}).`;
          } else if (pAfter.status === 'CONFLICTING') {
            causalReason = `Became CONFLICTING due to new contradictory evidence introduction.`;
          } else if (evidenceChanged) {
            causalReason = `Supporting evidence shifted from ${pBefore.supportingEvidence.length} to ${pAfter.supportingEvidence.length} items.`;
          }

          modified.push({
            possibilityId: pAfter.id,
            possibilityName: pAfter.name,
            statusBefore: pBefore.status,
            statusAfter: pAfter.status,
            changes: {
              addedNodes: pAfter.graphChanges.addedNodes.map(n => n.id).filter(id => !pBefore.graphChanges.addedNodes.map(n => n.id).includes(id)),
              removedNodes: pAfter.graphChanges.removedNodeIds.filter(id => !pBefore.graphChanges.removedNodeIds.includes(id)),
              addedEdges: pAfter.graphChanges.addedEdges.map(e => e.id).filter(id => !pBefore.graphChanges.addedEdges.map(e => e.id).includes(id)),
              removedEdges: pAfter.graphChanges.removedEdgeIds.filter(id => !pBefore.graphChanges.removedEdgeIds.includes(id)),
              constraintsChanged: statusChanged ? [`Status: ${pBefore.status} → ${pAfter.status}`] : []
            },
            causalReason
          });
        } else {
          unchanged.push({
            possibilityId: pAfter.id,
            possibilityName: pAfter.name,
            status: pAfter.status
          });
        }
      }
    }

    // 2. Check before possibilities that no longer exist in after
    for (const pBefore of beforePossibilities) {
      if (!afterMap.has(pBefore.canonicalSignature)) {
        let causalReason = `Eliminated following graph mutation: ${mutation.summary}.`;
        let eliminatingAlgorithm = 'CONSTRAINT_ENGINE';

        if (mutation.action === 'REMOVE_NODE' || mutation.targetType === 'EVIDENCE') {
          causalReason = `Disappeared because required evidence '${mutation.targetId}' was removed, failing minimum provenance corroboration.`;
          eliminatingAlgorithm = 'EVIDENCE_PROVENANCE_ENGINE';
        } else if (mutation.action === 'REMOVE_EDGE') {
          causalReason = `Disappeared because directed relationship '${mutation.targetId}' was deleted, severing the candidate path.`;
          eliminatingAlgorithm = 'K_SHORTEST_PATHS';
        } else if (mutation.action === 'MODIFY_NODE' && delta.changedTemporalConstraints.length > 0) {
          const tc = delta.changedTemporalConstraints[0];
          causalReason = `Pruned because event '${tc.eventId}' timestamp change caused chronological inversion.`;
          eliminatingAlgorithm = 'TEMPORAL_VALIDATION';
        } else if (mutation.action === 'SPLIT_ENTITIES') {
          causalReason = `Disappeared because entity separation hypothesis was rejected, removing merged topological link.`;
          eliminatingAlgorithm = 'ENTITY_RESOLUTION_ENGINE';
        }

        removed.push({
          possibilityId: pBefore.id,
          possibilityName: pBefore.name,
          causalReason,
          eliminatingAlgorithm,
          affectedStructure: pBefore.assumptions[0] || pBefore.name
        });
      }
    }

    const summary = `Evolution V${fromVersion} → V${toVersion}: +${added.length} added, -${removed.length} removed, ~${modified.length} modified, =${unchanged.length} unchanged.`;

    return {
      fromVersion,
      toVersion,
      addedPossibilities: added,
      removedPossibilities: removed,
      modifiedPossibilities: modified,
      unchangedPossibilities: unchanged,
      summary
    };
  }
}

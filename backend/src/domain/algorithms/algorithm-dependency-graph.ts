export type AlgorithmStage =
  | 'GRAPH_TOPOLOGY'
  | 'K_SHORTEST_PATHS'
  | 'TEMPORAL_VALIDATION'
  | 'EVIDENCE_PROVENANCE'
  | 'ENTITY_RESOLUTION'
  | 'CONTRADICTION_BRANCHING'
  | 'POSSIBILITY_SET'
  | 'DOMINATOR_ANALYSIS'
  | 'DISJOINT_PATHS'
  | 'MIN_CUT'
  | 'COMMON_INVARIANTS'
  | 'DISTINGUISHING_DIFFERENCES';

export class AlgorithmDependencyGraph {
  /**
   * Directed dependencies: key depends on array of upstream stages.
   */
  private static readonly DEPENDENCIES: Record<AlgorithmStage, AlgorithmStage[]> = {
    GRAPH_TOPOLOGY: [],
    K_SHORTEST_PATHS: ['GRAPH_TOPOLOGY'],
    TEMPORAL_VALIDATION: ['K_SHORTEST_PATHS'],
    EVIDENCE_PROVENANCE: ['K_SHORTEST_PATHS'],
    ENTITY_RESOLUTION: ['GRAPH_TOPOLOGY'],
    CONTRADICTION_BRANCHING: ['GRAPH_TOPOLOGY'],
    POSSIBILITY_SET: [
      'K_SHORTEST_PATHS',
      'TEMPORAL_VALIDATION',
      'EVIDENCE_PROVENANCE',
      'ENTITY_RESOLUTION',
      'CONTRADICTION_BRANCHING'
    ],
    DOMINATOR_ANALYSIS: ['POSSIBILITY_SET'],
    DISJOINT_PATHS: ['POSSIBILITY_SET'],
    MIN_CUT: ['POSSIBILITY_SET'],
    COMMON_INVARIANTS: ['POSSIBILITY_SET'],
    DISTINGUISHING_DIFFERENCES: ['POSSIBILITY_SET']
  };

  /**
   * Returns all downstream algorithms that must be invalidated if a given stage is invalidated.
   */
  static getDownstreamStages(stage: AlgorithmStage): AlgorithmStage[] {
    const downstream = new Set<AlgorithmStage>();
    const queue: AlgorithmStage[] = [stage];

    while (queue.length > 0) {
      const current = queue.shift()!;
      for (const [target, upstreams] of Object.entries(this.DEPENDENCIES) as [AlgorithmStage, AlgorithmStage[]][]) {
        if (upstreams.includes(current) && !downstream.has(target)) {
          downstream.add(target);
          queue.push(target);
        }
      }
    }

    return Array.from(downstream);
  }

  /**
   * Determines which initial algorithm stages are triggered directly by a given graph mutation.
   */
  static getDirectlyAffectedStages(mutationType: string, hasTemporalChange: boolean, hasEvidenceChange: boolean): AlgorithmStage[] {
    const direct = new Set<AlgorithmStage>();

    if (mutationType.includes('EDGE') || mutationType === 'ADD_NODE' || mutationType === 'REMOVE_NODE') {
      direct.add('GRAPH_TOPOLOGY');
      direct.add('K_SHORTEST_PATHS');
    }

    if (hasTemporalChange || mutationType === 'MODIFY_NODE') {
      direct.add('TEMPORAL_VALIDATION');
    }

    if (hasEvidenceChange) {
      direct.add('EVIDENCE_PROVENANCE');
    }

    if (mutationType.includes('ENTITIES')) {
      direct.add('ENTITY_RESOLUTION');
      direct.add('GRAPH_TOPOLOGY');
    }

    // Include all downstream cascades
    const allAffected = new Set<AlgorithmStage>(direct);
    for (const d of direct) {
      for (const down of this.getDownstreamStages(d)) {
        allAffected.add(down);
      }
    }

    return Array.from(allAffected);
  }
}

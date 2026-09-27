/**
 * First-Class Algorithm Execution Record.
 * Makes graph algorithm computations auditable, deterministic, and causally upstream of reasoning.
 */
export interface AlgorithmExecutionInput {
  sourceId?: string;
  targetId?: string;
  sourceLabel?: string;
  targetLabel?: string;
  parameters?: Record<string, any>;
}

export interface AlgorithmExecutionResult {
  reachable?: boolean;
  pathCount?: number;
  totalCost?: number;
  dominatorNodeIds?: string[];
  cutEdgeIds?: string[];
  disjointPathCount?: number;
  violations?: Array<{
    previousEventLabel?: string;
    previousTimestamp?: string;
    nextEventLabel?: string;
    nextTimestamp?: string;
    deltaMs?: number;
    description: string;
  }>;
  summary: string;
}

export interface AlgorithmExecution {
  id: string;
  algorithm:
    | 'TEMPORAL_REACHABILITY'
    | 'K_SHORTEST_PATHS'
    | 'DOMINATORS'
    | 'MIN_CUT'
    | 'DISJOINT_PATHS'
    | 'TEMPORAL_KAHN'
    | 'ARTICULATION_POINTS';
  caseId: string;
  graphVersion: string;
  input: AlgorithmExecutionInput;
  result: AlgorithmExecutionResult;
  derivedNodes: string[];
  derivedEdges: string[];
  evidenceRefs: string[];
  eliminatedHypotheses?: string[];
  causalImpact: 'ELIMINATED_BRANCH' | 'PRUNED_POSSIBILITY' | 'IDENTIFIED_CHOKE_POINT' | 'ISOLATED_CUT' | 'VALIDATED_CORRIDOR';
  timestamp: string;
  deterministic: true;
}

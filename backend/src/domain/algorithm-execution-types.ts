export interface AlgorithmExecutionInput {
  sourceId?: string;
  targetId?: string;
  sourceLabel?: string;
  targetLabel?: string;
  parameters?: Record<string, any>;
  subgraphNodes?: string[];
  subgraphEdges?: string[];
}

export interface AlgorithmExecutionResult {
  reachable?: boolean;
  pathCount?: number;
  totalCost?: number;
  dominatorNodeIds?: string[];
  cutEdgeIds?: string[];
  disjointPathCount?: number;
  informationGainBits?: number;
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

export interface AlgorithmEvidenceTrace {
  id: string;
  algorithm:
    | 'TEMPORAL_REACHABILITY'
    | 'K_SHORTEST_PATHS'
    | 'DOMINATORS'
    | 'MIN_CUT'
    | 'DISJOINT_PATHS'
    | 'TEMPORAL_KAHN'
    | 'ARTICULATION_POINTS'
    | 'STRUCTURAL_FAMILIES'
    | 'SHANNON_INFORMATION_GAIN';
  caseId: string;
  graphVersion: string;
  
  // Phase 15 Unified Output Contract
  inputSubgraph?: { nodes: string[]; edges: string[] };
  inputEvidence?: string[]; // Evidence IDs (facts)
  computation?: { parameters: Record<string, any>; complexity: string };
  result: AlgorithmExecutionResult;
  structuralInterpretation?: string;
  possibilityImpact?: string;
  resolutionImpact?: string;
  investigationImpact?: string;
  role?: 'CONTRIBUTING_ALGORITHM' | 'SUPPORTING_ALGORITHM' | 'FILTERING_ALGORITHM' | 'DOWNSTREAM_CONSUMER';
  
  // Old properties (deprecated / optional)
  input: AlgorithmExecutionInput;
  derivedNodes?: string[];
  derivedEdges?: string[];
  evidenceRefs?: string[];
  eliminatedHypotheses?: string[];
  causalImpact?: string;
  
  timestamp: string;
  deterministic: true;
}

// Deprecate AlgorithmExecution in favor of AlgorithmEvidenceTrace or alias it for backward compatibility
export type AlgorithmExecution = AlgorithmEvidenceTrace;

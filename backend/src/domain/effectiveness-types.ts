export type AlgorithmClassification =
  | 'CONSEQUENTIAL'
  | 'INTERMEDIATE'
  | 'DECORATIVE'
  | 'NOT_APPLICABLE';

export interface AffectedObjectsSummary {
  possibilities: number;
  families: number;
  resolutionCandidates: number;
  investigationActions: number;
}

export interface AblationDiff {
  algorithm: string;
  isConsequential: boolean;
  normalState: {
    possibilityCount: number;
    validCount: number;
    invalidCount: number;
    familyCount: number;
    candidateCount: number;
    actionCount: number;
    entropy: number;
  };
  ablatedState: {
    possibilityCount: number;
    validCount: number;
    invalidCount: number;
    familyCount: number;
    candidateCount: number;
    actionCount: number;
    entropy: number;
  };
  delta: {
    possibilitiesDiff: number;
    familiesDiff: number;
    candidatesDiff: number;
    actionsDiff: number;
    entropyDiff: number;
  };
  changedOutputs: string[];
  downstreamExplanation: string;
}

export interface AlgorithmEffectivenessAudit {
  algorithmName: string;
  classification: AlgorithmClassification;
  inputGraphState: {
    nodeCount: number;
    edgeCount: number;
    caseId: string;
  };
  inputSize: {
    nodes: number;
    edges: number;
  };
  executionTimeMs: number;
  rawResultSummary: string;
  downstreamEffect: string;
  possibilitiesAffected: number;
  possibilitiesRemoved: number;
  possibilitiesAdded: number;
  familiesAffected: number;
  investigationActionsAffected: number;
  entropyBefore: number;
  entropyAfter: number;
  informationGain: number;
  counterfactualImpact: string;
  userVisibleInsight: string;
  impactDepth: number;
  affectedObjects: AffectedObjectsSummary;
  ablationDiff: AblationDiff;
}

export type ImpactNodeType =
  | 'ALGORITHM'
  | 'INTERMEDIATE_RESULT'
  | 'POSSIBILITY'
  | 'STRUCTURAL_PROPERTY'
  | 'RESOLUTION'
  | 'INVESTIGATION_ACTION';

export interface AlgorithmImpactNode {
  id: string;
  type: ImpactNodeType;
  label: string;
  category?: string;
  metadata: Record<string, any>;
}

export type ImpactEdgeType =
  | 'PRODUCES'
  | 'FILTERS'
  | 'CLUSTERS'
  | 'PARTITIONS'
  | 'RESOLVES'
  | 'DEPENDS_ON';

export interface AlgorithmImpactEdge {
  id: string;
  source: string;
  target: string;
  type: ImpactEdgeType;
  label?: string;
}

export interface AlgorithmImpactGraph {
  nodes: AlgorithmImpactNode[];
  edges: AlgorithmImpactEdge[];
}

export interface ReasoningTraceStep {
  stage: string; // e.g. 'EVIDENCE', 'GRAPH_STRUCTURE', 'ALGORITHM', 'CONSTRAINT', 'POSSIBILITY', 'RESOLUTION', 'ACTION'
  component: string;
  detail: string;
  algorithmName?: string;
  timestamp?: string;
}

export interface ReasoningTrace {
  targetId: string;
  targetType: 'POSSIBILITY' | 'RESOLUTION_CANDIDATE' | 'INVESTIGATION_ACTION';
  targetLabel: string;
  producedByAlgorithms: string[];
  validatedByConstraints: string[];
  distinguishedBy: string[];
  resolutionImpact: string[];
  investigationImpact: string[];
  chainSteps: ReasoningTraceStep[];
  explanation: string;
}

export interface SyntheticBenchmarkResult {
  nodeCount: number;
  edgeCount: number;
  dijkstraTimeMs: number;
  kShortestPathsTimeMs: number;
  topologicalSortTimeMs: number;
  dominatorsTimeMs: number;
  minCutTimeMs: number;
  totalTimeMs: number;
  memoryUsedMb: number;
}

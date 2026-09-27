import { GraphNode, GraphEdge } from './types.js';

export type PossibilityStatus =
  | 'VALID'
  | 'INVALID'
  | 'CONDITIONAL'
  | 'CONFLICTING'
  | 'SUPERSEDED'
  | 'ARCHIVED';

export type PossibilityGenerationMethod =
  | 'ALTERNATIVE_PATHS'
  | 'TEMPORAL_ORDERING'
  | 'ENTITY_RESOLUTION'
  | 'RELATIONSHIP_UNCERTAINTY'
  | 'CONTRADICTION_BRANCHING'
  | 'MANUAL_HYPOTHESIS';

export interface GraphDelta {
  addedNodes: GraphNode[];
  removedNodeIds: string[];
  modifiedNodes: Partial<GraphNode>[];
  addedEdges: GraphEdge[];
  removedEdgeIds: string[];
  modifiedEdges: Partial<GraphEdge>[];
  entityResolutionMerges?: Array<{
    survivingNodeId: string;
    mergedNodeId: string;
    rewiredEdgeCount: number;
  }>;
}

export interface GraphVersion {
  id: string;
  caseId: string;
  versionNumber: number;
  snapshotJson?: string;
  changeSummary: string;
  createdAt: string;
}

export interface GenerationTraceStep {
  step: number;
  phase: 'CANDIDATE_DISCOVERY' | 'TEMPORAL_VALIDATION' | 'EVIDENCE_CONSTRAINT' | 'STRUCTURAL_VALIDATION' | 'CANONICALIZATION' | 'ANALYTICAL_EVALUATION';
  algorithm: string;
  status: 'PASSED' | 'FAILED' | 'SKIPPED' | 'APPLIED';
  detail: string;
  timestamp: string;
}

export interface Possibility {
  id: string;
  caseId: string;
  name: string;
  description: string;
  baseGraphVersion: number;
  status: PossibilityStatus;
  generationMethod: PossibilityGenerationMethod;
  assumptions: string[];
  graphChanges: GraphDelta;
  constraints: Record<string, unknown>;
  supportingEvidence: string[]; // Evidence node IDs
  conflictingEvidence: string[]; // Evidence node IDs
  unresolvedQuestions: string[];
  canonicalSignature: string; // Hash/deterministic signature for deduplication
  algorithmResults?: Record<string, unknown>;
  generationTrace?: GenerationTraceStep[];
  criticalDependency?: Array<{ nodeId: string; label: string }>;
  criticalCut?: Array<{ edgeId: string; source: string; target: string }>;
  independentSupportPaths?: number;
  createdAt: string;
  updatedAt: string;
}

export interface AlgorithmRun {
  id: string;
  caseId: string;
  possibilityId?: string; // Optional: null means run on canonical graph
  algorithm: string;
  algorithmVersion: string;
  parameters: Record<string, unknown>;
  graphVersion: number;
  inputNodeCount: number;
  inputEdgeCount: number;
  executionTimeMs: number;
  createdAt: string;
}

export interface AlgorithmResult {
  id: string;
  runId: string;
  algorithm: string;
  resultType: string;
  summary: string;
  payload: Record<string, unknown>;
  createdAt: string;
}

export interface PossibilityComparison {
  caseId: string;
  comparedAt: string;
  possibilities: Array<{
    id: string;
    name: string;
    status: PossibilityStatus;
    generationMethod: PossibilityGenerationMethod;
    temporalValidity: 'VALID' | 'INVALID' | 'AMBIGUOUS';
    evidenceSupportCount: number;
    conflictingEvidenceCount: number;
    assumptionCount: number;
    independentPathCount?: number;
    criticalNodeCount?: number;
    pathCost?: number;
    unresolvedQuestionsCount: number;
  }>;
  structuralDiff: {
    commonNodes: string[];
    distinguishingNodes: Record<string, string[]>; // possibilityId -> nodeIds
    commonEdges: Array<{ source: string; target: string; type: string }>;
    distinguishingEdges: Record<string, Array<{ source: string; target: string; type: string }>>;
    commonEvidence: string[];
    distinguishingEvidence: Record<string, string[]>;
  };
  resolvingRecommendations?: Array<{
    distinguishingElement: string;
    distinguishingType: 'NODE' | 'EDGE' | 'IDENTITY' | 'TEMPORAL_ORDER';
    affectedPossibilityIds: string[];
    recommendedAction: string;
    rationale: string;
  }>;
}

export interface GenerationTrace {
  possibilityId: string;
  possibilityName: string;
  generationMethod: PossibilityGenerationMethod;
  candidateSummary: string;
  steps: GenerationTraceStep[];
  finalDecision: 'ACCEPTED' | 'REJECTED';
  eliminationReason?: string;
}

export interface AlgorithmImpactStage {
  algorithm: string;
  phase: string;
  candidatesBefore: number;
  candidatesAfter: number;
  candidatesEliminated: number;
  rejectionReasons: string[];
  executionTimeMs: number;
}

export interface AlgorithmImpactReport {
  caseId: string;
  timestamp: string;
  inputCandidatesCount: number;
  survivingPossibilitiesCount: number;
  eliminatedCandidatesCount: number;
  stages: AlgorithmImpactStage[];
  eliminatedCandidates: Array<{
    id: string;
    candidateSummary: string;
    eliminatedBy: string;
    reason: string;
  }>;
  commonInvariantsSummary: {
    nodeCount: number;
    edgeCount: number;
    evidenceCount: number;
  };
  criticalDependencies: Array<{
    nodeId: string;
    label: string;
    role: string;
  }>;
}

export interface PossibilityGenerationOptions {
  sourceNodeId?: string;
  targetNodeId?: string;
  maxPossibilities?: number;
  maxPathLength?: number;
  maxSearchDepth?: number;
  includeEntityResolution?: boolean;
  includeTemporalBranches?: boolean;
  includeContradictionBranches?: boolean;
  includeAlternativePaths?: boolean;
  minEvidenceSupport?: number;
  disableTemporalValidation?: boolean; // For ablation testing
  disableEvidenceConstraints?: boolean; // For ablation testing
  timeWindow?: {
    start?: string;
    end?: string;
  };
  requiredEvidence?: string[];
  allowHypotheses?: boolean;
}

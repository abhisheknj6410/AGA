export interface GraphStructuralFingerprint {
  nodeCount: number;
  edgeCount: number;
  density: number;
  averageOutDegree: number;
  maxOutDegree: number;
  maxInDegree: number;
  isLinearChain: boolean;
  isDisconnected: boolean;
  sourceReachableTarget: boolean;
  pathCountBound: number;
  hasBranching: boolean;
  hasConvergence: boolean;
  hasParallelCorridors: boolean;
  bottleneckCandidates: Array<{ nodeId: string; label: string; inDegree: number; outDegree: number }>;
  hasCycles: boolean;
  detectedCycleCount: number;
  hasTemporalInversions: boolean;
  temporalViolationCount: number;
  hasEvidenceConflicts: boolean;
  detectedEvidenceConflictCount: number;
  detectedProperties: string[];
}

export interface AlgorithmSelectionDecision {
  algorithm: string;
  algorithmKey: string;
  applicable: boolean;
  reason: string;
  structuralEvidence: string[];
  expectedInvestigativeValue: string;
  executed: boolean;
  executionTimeMs: number;
  skippedReason?: string;
  actualDownstreamImpact?: string;
}

export interface AlgorithmExecutionTraceStep {
  stage: number;
  graphProperty: string;
  algorithmSelected: string;
  algorithmKey: string;
  algorithmResultSummary: string;
  resultConsumedBy: string;
  downstreamDecisionChanged: string;
}

export interface PipelineExecutionMetrics {
  algorithmsExecuted: number;
  algorithmsSkipped: number;
  totalRuntimeMs: number;
  executedKeys: string[];
  skippedKeys: string[];
  possibilitiesDiscovered: number;
  resolutionCandidatesGenerated: number;
  investigationActionsRanked: number;
  entropyCalculated: number;
}

export interface AdaptiveEquivalenceVerification {
  isEquivalent: boolean;
  regressionStatus: 'EQUIVALENCE_PRESERVED' | 'ADAPTIVE_REGRESSION';
  possibilityCountMatch: boolean;
  resolutionCandidateMatch: boolean;
  investigationActionMatch: boolean;
  entropyMatch: boolean;
  discrepancies: string[];
}

export interface AdaptiveExecutionComparison {
  caseId?: string;
  topologyId?: string;
  topologyName?: string;
  fullExecution: PipelineExecutionMetrics;
  adaptiveExecution: PipelineExecutionMetrics;
  efficiencySavingsPercent: number;
  skippedAlgorithmsThatWouldAddNoValue: string[];
  equivalence: AdaptiveEquivalenceVerification;
}

export interface AdaptiveReasoningReport {
  caseId?: string;
  topologyId?: string;
  timestamp: string;
  fingerprint: GraphStructuralFingerprint;
  decisions: AlgorithmSelectionDecision[];
  trace: AlgorithmExecutionTraceStep[];
  comparison: AdaptiveExecutionComparison;
  methodologicalIntegrityNotice: string;
}

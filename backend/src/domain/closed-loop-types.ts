import { GraphNode, GraphEdge, GraphPayload } from './types.js';
import { Possibility, PossibilityStatus } from './possibility-types.js';
import { GraphMutation, GraphDelta, AffectedSubgraph, PossibilityEvolution, GraphVersion } from './incremental-types.js';
import { InvestigationPlan, InvestigationAction } from './planning-types.js';
import { ResolutionMatrix, StructuralFamily, CommonInvariants, DistinguishingStructure } from './resolution-types.js';

export type ActionLifecycleState = 'RESOLVED' | 'OBSOLETE' | 'NEWLY_REQUIRED' | 'ACTIVE';

export interface ActionLifecycleTransition {
  actionId: string;
  targetCandidateId: string;
  targetLabel: string;
  previousStatus: string;
  newStatus: ActionLifecycleState;
  reason: string;
  triggeringEvidenceId?: string;
  eliminatedPossibilityIds?: string[];
}

export interface UnexpectedEvidenceReport {
  isUnexpected: boolean;
  anomalyType?: 'UNEXPLAINED_SUBGRAPH' | 'MODEL_REVISION_REQUIRED';
  anomalyReason?: string;
  disconnectedNodes?: string[];
  contradictedPossibilityIds?: string[];
  recommendation: string;
}

export interface CounterfactualVsActualComparison {
  actionId?: string;
  actionQuestion?: string;
  predictedOutcome?: {
    expectedInformationGain: number;
    expectedSurvivingCount: number;
    expectedEliminatedCount: number;
    expectedSurvivingPossibilityIds: string[];
    expectedEliminatedPossibilityIds: string[];
  };
  actualOutcome: {
    actualEntropyReduction: number;
    actualSurvivingCount: number;
    actualEliminatedCount: number;
    actualSurvivingPossibilityIds: string[];
    actualEliminatedPossibilityIds: string[];
  };
  predictionAccuracy: 'EXACT' | 'PARTIAL' | 'UNEXPECTED';
  explanation: string;
}

export interface AlgorithmImpactTraceStage {
  stage: 'EVIDENCE_INGESTION' | 'GRAPH_MUTATION' | 'ALGORITHMS_AFFECTED' | 'POSSIBILITY_CHANGES' | 'RESOLUTION_CHANGES' | 'INVESTIGATION_CHANGES';
  title: string;
  summary: string;
  details: Record<string, any>;
  durationMs: number;
}

export interface IngestEvidenceInput {
  caseId: string;
  evidenceNode: GraphNode;
  attachedEdges: GraphEdge[];
  summary: string;
  requestedByActionId?: string;
  reason?: string;
}

export interface ClosedLoopInvestigationCycle {
  cycleId: string;
  caseId: string;
  fromVersion: number;
  toVersion: number;
  timestamp: string;
  triggeringEvidence: {
    nodeId: string;
    label: string;
    category: string;
    source: string;
    requestedByActionId?: string;
  };
  graphDeltaSummary: {
    addedNodes: number;
    addedEdges: number;
    modifiedNodes: number;
    modifiedEdges: number;
  };
  affectedSubgraph: {
    nodeCount: number;
    edgeCount: number;
    nodeIds: string[];
    edgeIds: string[];
  };
  algorithmsSummary: {
    reused: string[];
    invalidated: string[];
    recomputed: string[];
  };
  possibilityEvolution: PossibilityEvolution;
  resolutionDiff: {
    familiesBefore: number;
    familiesAfter: number;
    candidatesBefore: number;
    candidatesAfter: number;
    invariantsBefore: number;
    invariantsAfter: number;
    entropyBefore: number;
    entropyAfter: number;
  };
  actionTransitions: ActionLifecycleTransition[];
  activeInvestigationPlan: InvestigationPlan;
  unexpectedEvidence: UnexpectedEvidenceReport;
  counterfactualVsActual?: CounterfactualVsActualComparison;
  algorithmImpactTrace: AlgorithmImpactTraceStage[];
  executionMetrics: {
    incrementalDurationMs: number;
    fullRecomputeDurationMs: number;
    speedupRatio: number;
    cacheReusePercentage: number;
  };
}

export interface IncrementalBenchmarkComparison {
  caseId: string;
  nodeCount: number;
  edgeCount: number;
  incrementalTimeMs: number;
  fullRecomputeTimeMs: number;
  speedupRatio: number;
  cacheHitCount: number;
  cacheMissCount: number;
  algorithmsReusedCount: number;
  algorithmsRecomputedCount: number;
}

export interface VersionedInvestigationState {
  versionNumber: number;
  caseId: string;
  createdAt: string;
  changeSummary: string;
  graph: GraphPayload;
  possibilityCount: number;
  validPossibilityCount: number;
  familyCount: number;
  entropy: number;
  actionCount: number;
  topAction?: InvestigationAction;
  cycleReport?: ClosedLoopInvestigationCycle;
}

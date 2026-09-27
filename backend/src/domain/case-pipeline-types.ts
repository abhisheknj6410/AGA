import { GraphPayload, GraphNode, GraphEdge } from './types.js';
import {
  EvidenceFact,
  ReconstructionPipelineReport,
  GraphInterpretation,
  EdgeProvenanceTrace
} from './reconstruction-types.js';
import { AdaptiveReasoningReport } from './adaptive-types.js';
import { Possibility } from './possibility-types.js';
import { ResolutionReasoningResult } from './resolution-types.js';
import { EpistemicValidationReport } from './epistemic-types.js';
import { InvestigativeDecisionResult, InvestigationStrategy } from './decision-types.js';
import { AlgorithmExecution } from './algorithm-execution-types.js';

export type PipelineStageName =
  | 'RAW_EVIDENCE'
  | 'FACT_ADMISSION'
  | 'GRAPH_INTERPRETATION'
  | 'STRUCTURAL_FINGERPRINT'
  | 'ALGORITHMS_SELECTED'
  | 'ALGORITHM_RESULTS'
  | 'POSSIBILITIES'
  | 'EPISTEMIC_VALIDATION'
  | 'RESOLUTION_CANDIDATES'
  | 'INVESTIGATION_DECISIONS';

export interface CaseReasoningTraceStage {
  stage: number;
  stageName: PipelineStageName;
  label: string;
  summary: string;
  inputs: Record<string, unknown>;
  outputs: Record<string, unknown>;
  reasonForDownstreamChanges: string;
  provenanceLinked: boolean;
}

export type WhyQueryType =
  | 'POSSIBILITY_EXISTS'
  | 'POSSIBILITY_ELIMINATED'
  | 'ALGORITHM_EXECUTED'
  | 'ALGORITHM_SKIPPED'
  | 'EVIDENCE_RELEVANT'
  | 'EVIDENCE_INSUFFICIENT'
  | 'ACTION_RECOMMENDED';

export interface WhyInspectionQuery {
  queryType: WhyQueryType;
  targetId: string;
}

export interface WhyInspectionAnswer {
  queryType: WhyQueryType;
  targetId: string;
  targetLabel: string;
  question: string;
  directAnswer: string;
  structuralRationale: string;
  supportingFacts: string[];
  provenanceReferences: string[];
  algorithmicBasis: string;
  confidenceOrCoherence: number;
}

export interface InterpretationReasoningBranch {
  interpretationId: string;
  interpretationName: string;
  description: string;
  coherenceScore: number;
  branchStatus: 'SURVIVING' | 'ELIMINATED_BY_GRAPH_ALGORITHM';
  eliminationReason?: string;
  eliminationExecutionId?: string;
  graph: GraphPayload;
  algorithmExecutions: AlgorithmExecution[];
  adaptiveReport: AdaptiveReasoningReport;
  possibilities: Possibility[];
  resolution: ResolutionReasoningResult;
  epistemicReport: EpistemicValidationReport;
  decisions: InvestigativeDecisionResult;
}

export interface DistinguishingEvidenceTarget {
  targetId: string;
  description: string;
  distinguishes: string;
  expectedImpact: string;
  confirmsBranch: string;
  refutesBranch: string;
}

export interface CompetingInterpretationComparison {
  interpretationA: { id: string; name: string };
  interpretationB: { id: string; name: string };
  sharedNodes: Array<{ id: string; label: string; category: string }>;
  sharedEdges: Array<{ id: string; source: string; target: string; type: string }>;
  differingNodes: {
    branchAOnly: Array<{ id: string; label: string; category: string }>;
    branchBOnly: Array<{ id: string; label: string; category: string }>;
  };
  differingEdges: {
    branchAOnly: Array<{ id: string; source: string; target: string; type: string }>;
    branchBOnly: Array<{ id: string; source: string; target: string; type: string }>;
  };
  differingAlgorithmBehaviors: string[];
  differingPossibilities: {
    branchAOnly: string[];
    branchBOnly: string[];
  };
  differingResolutions: string[];
  differingActions: {
    branchAOnly: string[];
    branchBOnly: string[];
  };
  distinguishingEvidenceTargets: DistinguishingEvidenceTarget[];
}

export interface UniversalConclusions {
  universalNodes: string[];
  universalEdges: string[];
  universalFindings: string[];
  universalActions: string[];
}

export interface EndToEndCaseReasoningReport {
  caseId: string;
  timestamp: string;
  rawEvidenceCount: number;
  reconstruction: ReconstructionPipelineReport;
  branches: InterpretationReasoningBranch[];
  algorithmExecutions: AlgorithmExecution[];
  commonConclusions: UniversalConclusions;
  branchComparison?: CompetingInterpretationComparison;
  unifiedTrace: CaseReasoningTraceStage[];
  whyInspectorCatalog: WhyInspectionAnswer[];
  provenanceCoveragePercent: number;
  hardInvariantVerified: boolean;
  methodologicalIntegrityNotice: string;
}

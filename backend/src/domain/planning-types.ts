export type EvidenceClass =
  | 'CCTV'
  | 'LOG'
  | 'DOCUMENT'
  | 'IMAGE'
  | 'PHONE_RECORD'
  | 'TRANSACTION_RECORD'
  | 'INTERVIEW'
  | 'DATABASE_RECORD'
  | 'NETWORK_CAPTURE'
  | 'SYSTEM_RECORD';

export type AvailabilityLevel = 'IMMEDIATE' | 'MODERATE' | 'RESTRICTED' | 'DELAYED';
export type TemporalPrecision = 'SECOND' | 'MINUTE' | 'HOUR' | 'DAY';

export interface EvidenceAcquisitionProfile {
  evidenceClass: EvidenceClass;
  estimatedCost: number; // 1 (lowest) to 5 (highest)
  availability: AvailabilityLevel;
  temporalCoverage: {
    precision: TemporalPrecision;
    windowCapability: string;
  };
  structuralSpecificity: number; // 0.0 to 1.0
}

export type ActionOutcome = 'CONFIRMED' | 'REFUTED' | 'CONFLICTING' | 'UNKNOWN';

export interface ExpectedPartition {
  outcome: ActionOutcome;
  confirmedSet: string[]; // Possibility IDs preserved/validated
  refutedSet: string[]; // Possibility IDs pruned/eliminated
  conflictingSet: string[]; // Possibility IDs placed into contradiction
  unknownSet: string[]; // Possibility IDs unaffected
  probability: number; // Expected structural prior weight
  resultingPossibilityCount: number;
  resultingFamilyCount: number;
}

export type PlanningGraphBasis =
  | 'MIN_CUT_SEPARATION'
  | 'DOMINATOR_DIVERGENCE'
  | 'DISJOINT_SUPPORT'
  | 'TEMPORAL_DISCRIMINATION'
  | 'ALTERNATIVE_CORRIDOR'
  | 'CONTRADICTION_ARBITRATION';

export interface ActionTemporalWindow {
  start?: string;
  end?: string;
  precision: TemporalPrecision;
  reason: string;
}

export interface ActionEntityRef {
  id: string;
  label: string;
  role: string;
}

export type InvestigationActionStatus = 'RECOMMENDED' | 'IN_PROGRESS' | 'EXECUTED' | 'DEFERRED';

export interface InvestigationAction {
  id: string; // ACT-1, ACT-2, etc.
  targetCandidateId: string; // e.g. R1, R2
  targetType: 'NODE' | 'EDGE' | 'EVIDENCE' | 'IDENTITY' | 'TEMPORAL_ORDER';
  targetLabel: string;
  targetPossibilities: string[];
  targetFamilies: string[];
  question: string;
  evidenceClasses: EvidenceClass[];
  requiredTemporalWindow?: ActionTemporalWindow;
  requiredEntities: ActionEntityRef[];
  graphBasis: PlanningGraphBasis;
  algorithmBasis: string;
  expectedPartitions: Record<'CONFIRMED' | 'REFUTED' | 'CONFLICTING', ExpectedPartition>;
  resolutionUtility: number; // 0 - 100
  expectedInformationGain: number; // In bits: H(before) - E[H(after)]
  evidenceSpecificity: number; // 0.0 - 1.0
  costProfile: EvidenceAcquisitionProfile;
  investigationValue: number; // Composite rank score
  dependencies: string[]; // Action IDs or evidence IDs that should precede this action
  status: InvestigationActionStatus;
}

export interface PlanGraphNode {
  id: string;
  label: string;
  type: 'POSSIBILITY_SPACE' | 'CANDIDATE' | 'ACTION' | 'OUTCOME';
  metadata: Record<string, any>;
}

export interface PlanGraphEdge {
  id: string;
  source: string;
  target: string;
  type: 'RESOLVES' | 'TRIGGERS' | 'PRUNES' | 'DEPENDS_ON' | 'PARTITIONS';
  label?: string;
}

export interface InvestigationPlanGraph {
  nodes: PlanGraphNode[];
  edges: PlanGraphEdge[];
}

export interface InvestigationPlan {
  planId: string;
  caseId: string;
  timestamp: string;
  currentPossibilityCount: number;
  currentFamilyCount: number;
  currentEntropy: number; // Current H(P) in bits
  actions: InvestigationAction[];
  planGraph: InvestigationPlanGraph;
  algorithmTrace: {
    executionTimestamp: string;
    steps: string[];
    basisMap: Record<string, string>;
  };
  nextImmediateAction: InvestigationAction | null;
}

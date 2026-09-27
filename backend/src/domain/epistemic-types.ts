export type EpistemicStatus =
  | 'STRUCTURALLY_SUPPORTED'
  | 'CONDITIONALLY_SUPPORTED'
  | 'CONFLICTING'
  | 'INSUFFICIENT_EVIDENCE'
  | 'UNEXPLAINED';

export type TemporalConsistencyLevel =
  | 'STRICTLY_ORDERED'
  | 'COARSE_PERMITTED'
  | 'INVERTED'
  | 'UNKNOWN';

export interface EpistemicTriad {
  isGraphConsistent: boolean;
  isEvidenceSupported: boolean;
  isInvestigativelyUseful: boolean;
  consistencyDetail: string;
  evidenceDetail: string;
  utilityDetail: string;
}

export interface ActionJustification {
  actionId: string;
  targetLabel: string;
  isJustified: boolean;
  epistemicStatus: EpistemicStatus;
  unresolvedGap: string;
  falsePositiveRisk: 'LOW' | 'MEDIUM' | 'HIGH';
  justificationReason: string;
  graphBasis: string;
  expectedInformationGain: number;
}

export interface PossibilityEpistemicAssessment {
  possibilityId: string;
  name: string;
  epistemicStatus: EpistemicStatus;
  triad: EpistemicTriad;
  evidenceRatio: number; // 0.0 to 1.0 (proportion of edges backed by valid evidence)
  supportingEvidenceCount: number;
  conflictingEvidenceCount: number;
  structuralAssumptions: string[];
  temporalConsistency: TemporalConsistencyLevel;
  contradictionLinks: string[];
  algorithmProvenance: string[];
  unresolvedGaps: string[];
}

export interface FalsePositiveCheck {
  target: string;
  targetType: 'ACTION' | 'POSSIBILITY' | 'STRATEGY';
  issue: string;
  severity: 'WARNING' | 'HIGH' | 'CRITICAL';
  suggestedCorrection: string;
}

export interface AdversarialStressReport {
  ambiguityPreserved: boolean;
  sparseEvidenceAcknowledged: boolean;
  contradictionsExposed: boolean;
  coarseTimestampsPermitted: boolean;
  disconnectedEvidenceRejected: boolean;
  falseConvergencePrevented: boolean;
  unexplainedSubgraphTriggered: boolean;
}

export interface EpistemicValidationReport {
  caseId: string;
  timestamp: string;
  overallStatus: EpistemicStatus;
  totalPossibilitiesEvaluated: number;
  survivingCount: number;
  assessments: PossibilityEpistemicAssessment[];
  actionJustifications: ActionJustification[];
  falsePositiveDetections: FalsePositiveCheck[];
  adversarialReport: AdversarialStressReport;
  recommendations: string[];
}

import { GraphNode, GraphEdge } from './types.js';

export type AlgorithmClassification =
  | 'GENERATIVE'
  | 'FILTERING'
  | 'STRUCTURAL'
  | 'DIFFERENTIATING'
  | 'EVOLUTIONARY'
  | 'RESOLUTION'
  | 'DESCRIPTIVE';

export interface AlgorithmAuditEntry {
  algorithmName: string;
  classification: AlgorithmClassification;
  input: string;
  parameters: string;
  output: string;
  calledBy: string[];
  consumers: string[];
  downstreamAlgorithms: string[];
  affectsPossibilityGeneration: boolean;
  affectsPossibilityValidity: boolean;
  affectsPossibilityComparison: boolean;
  affectsPossibilityEvolution: boolean;
  affectsResolutionReasoning: boolean;
  affectsAgentAnswers: boolean;
  userVisibleOutput: string;
  ablationResult: string;
}

export interface CanonicalPossibilityStructure {
  possibilityId: string;
  possibilityName: string;
  nodes: Array<{ id: string; label: string; type: string; category: string }>;
  edges: Array<{ id: string; source: string; target: string; type: string }>;
  events: Array<{ id: string; label: string; timestamp?: string }>;
  temporalRelations: Array<{ sourceId: string; targetId: string; relation: 'BEFORE' | 'CONCURRENT' | 'AFTER' }>;
  evidenceDependencies: string[];
  identityAssumptions: Array<{ entityA: string; entityB: string; assumedSame: boolean }>;
  criticalDominatorNodes: Array<{ id: string; label: string }>;
  criticalCutEdges: Array<{ source: string; target: string; type: string }>;
  independentPathCount: number;
  canonicalSignature: string;
}

export interface StructuralFamily {
  familyId: string;
  familyLabel: string;
  backboneSignature: string;
  possibilityIds: string[];
  representativePossibilityId: string;
  keySharedFeatures: string[];
  differentiatingFromOtherFamilies: string[];
}

export interface CommonInvariants {
  commonNodes: Array<{ id: string; label: string; category: string; type: string }>;
  commonEdges: Array<{ source: string; target: string; type: string }>;
  commonEvents: Array<{ id: string; label: string; timestamp?: string }>;
  commonEvidenceRefs: string[];
  commonUnavoidableDominatorNodes: Array<{ id: string; label: string }>;
  commonCriticalCutEdges: Array<{ source: string; target: string; type: string }>;
  universalCoveragePercentage: number;
}

export interface DistinguishingStructure {
  elementId: string;
  elementType: 'NODE' | 'EDGE' | 'EVIDENCE' | 'IDENTITY' | 'TEMPORAL_ORDER';
  elementLabel: string;
  presentInPossibilityIds: string[];
  absentInPossibilityIds: string[];
  presentInFamilyIds: string[];
  absentInFamilyIds: string[];
  structuralRole: string;
}

export interface ResolutionCandidate {
  id: string; // R1, R2, etc.
  targetType: 'NODE' | 'EDGE' | 'EVIDENCE' | 'IDENTITY' | 'TEMPORAL_ORDER';
  targetLabel: string;
  targetEntities: string[];
  why: string;
  affectedPossibilityIds: string[];
  distinguishedFamilyIds: string[];
  graphBasis:
    | 'MIN_CUT_SEPARATION'
    | 'DOMINATOR_DIVERGENCE'
    | 'DISJOINT_SUPPORT'
    | 'TEMPORAL_DISCRIMINATION'
    | 'ALTERNATIVE_CORRIDOR';
  suggestedEvidenceClass: string;
  resolutionUtilityScore: number;
  utilityBreakdown: {
    familyCoverage: number;
    possibilityCoverage: number;
    structuralSeparation: number;
    temporalSpecificity: number;
  };
  partition: {
    ifPresentValidPossibilityIds: string[];
    ifAbsentValidPossibilityIds: string[];
  };
}

export interface ResolutionMatrix {
  candidates: Array<{ id: string; label: string; utilityScore: number }>;
  possibilities: Array<{ id: string; name: string; familyId: string }>;
  matrix: Record<string, Record<string, boolean>>; // candidateId -> possibilityId -> boolean
  structuralEntropy: number; // H(P) under equal structural weight
}

export interface ContradictionImpact {
  contradictionId: string;
  conflictingEvidence: Array<{ id: string; label: string }>;
  affectedPossibilityIds: string[];
  unaffectedPossibilityIds: string[];
  temporalOverlap?: boolean;
  reason: string;
}

export interface CounterfactualResolutionSimulation {
  candidateId: string;
  simulatedAction: 'CONFIRM_ELEMENT' | 'REFUTE_ELEMENT';
  beforePossibilityIds: string[];
  afterPossibilityIds: string[];
  eliminatedPossibilityIds: string[];
  survivingFamilies: string[];
  eliminatedFamilies: string[];
  explanation: string;
}

export interface ResolutionReasoningResult {
  caseId: string;
  timestamp: string;
  totalSurvivingPossibilities: number;
  structuralFamilies: StructuralFamily[];
  commonInvariants: CommonInvariants;
  distinguishingStructures: DistinguishingStructure[];
  resolutionCandidates: ResolutionCandidate[];
  resolutionMatrix: ResolutionMatrix;
  contradictionImpacts: ContradictionImpact[];
}

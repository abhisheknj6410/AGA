import { EvidenceClass, TemporalPrecision, InvestigationAction } from './planning-types.js';

export interface GraphEvidenceTarget {
  targetType: 'NODE' | 'EDGE' | 'EVENT' | 'INTERVAL';
  elementId: string;
  elementLabel: string;
  sourceId?: string;
  targetId?: string;
  temporalWindow?: {
    start?: string;
    end?: string;
    precision: TemporalPrecision;
    reason: string;
  };
  structuralRole: string;
  separates: {
    possibilityA: string;
    possibilityB: string;
    familyA?: string;
    familyB?: string;
  };
  suggestedEvidenceClass: EvidenceClass;
  exactVerificationQuestion: string;
}

export interface AlgorithmDecisionTrace {
  graphStructure: string;
  algorithmUsed: string;
  algorithmResult: string;
  possibilityDistinction: string;
  evidenceTarget: string;
  investigationAction: string;
}

export type StrategyType =
  | 'MAX_INFORMATION_GAIN'
  | 'LOW_COST_TELEMETRY'
  | 'BOTTLENECK_VERIFICATION'
  | 'PAIRWISE_DISCRIMINATION';

export interface InvestigationStrategy {
  id: string; // e.g. STRAT-A, STRAT-B
  name: string;
  type: StrategyType;
  objective: string;
  targetedPossibilities: string[];
  targetedDistinction: string;
  primaryAction: InvestigationAction;
  actionSequence: InvestigationAction[];
  evidenceTargets: GraphEvidenceTarget[];
  decisionTrace: AlgorithmDecisionTrace;
  expectedEntropyReduction: number;
  totalEstimatedCost: number;
  tradeoffSummary: {
    pros: string[];
    cons: string[];
  };
  algorithmBasis: string;
}

export interface StrategySimulationResult {
  strategyId: string;
  strategyName: string;
  simulatedOutcome: 'CONFIRMED' | 'REFUTED';
  beforePossibilityCount: number;
  afterPossibilityCount: number;
  survivingPossibilityIds: string[];
  eliminatedPossibilityIds: string[];
  entropyBefore: number;
  entropyAfter: number;
  entropyReduction: number;
  survivingFamilies: string[];
  eliminatedFamilies: string[];
  affectedResolutionCandidates: string[];
  downstreamNextActions: string[];
  explanation: string;
}

export interface UnresolvedInvestigativeQuestion {
  id: string;
  question: string;
  target: GraphEvidenceTarget;
  importanceScore: number; // 0 - 100
  distinction: string;
  algorithmBasis: string;
}

export interface InvestigativeDecisionResult {
  caseId: string;
  timestamp: string;
  currentEntropy: number;
  survivingPossibilities: Array<{ id: string; name: string; familyId: string }>;
  unresolvedQuestions: UnresolvedInvestigativeQuestion[];
  strategies: InvestigationStrategy[];
  topRecommendation: InvestigationStrategy | null;
  decisionTrace: AlgorithmDecisionTrace | null;
}

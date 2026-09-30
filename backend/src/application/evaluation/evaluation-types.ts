export type PipelineVariant = 
  | 'BASELINE'
  | 'FULL'
  | 'ADAPTIVE'
  | 'ABLATION_NO_YEN'
  | 'ABLATION_NO_TEMPORAL'
  | 'ABLATION_NO_DOMINATOR'
  | 'ABLATION_NO_MIN_CUT'
  | 'ABLATION_NO_DISJOINT'
  | 'ABLATION_NO_FAMILIES'
  | 'ABLATION_NO_ENTROPY';

export interface EvaluationGroundTruth {
  expectedPossibilities: number;
  expectedValidPossibilities: number;
  expectedContradictions: number;
  expectedResolutionCandidates: number;
  expectedInvestigationActions: number;
}

export interface SyntheticBenchmarkCase {
  id: string;
  name: string;
  description: string;
  nodes: any[];
  edges: any[];
  sourceId: string;
  targetId: string;
  groundTruth: EvaluationGroundTruth;
}

export interface PipelineEvaluationResult {
  variant: PipelineVariant;
  possibilitiesDiscovered: number;
  validPossibilitiesRetained: number;
  invalidPossibilitiesEliminated: number;
  contradictionsDetected: number;
  structuralDistinctionsDiscovered: number;
  resolutionCandidates: number;
  investigationActions: number;
  entropyReduction: number;
  unsupportedConclusions: number;
  falsePositiveRecommendations: number;
  runtimeMs: number;
  algorithmsExecuted: string[];
  investigativeValue?: 'SIGNIFICANT_VALUE' | 'SOME_VALUE' | 'NO_ADDITIONAL_VALUE' | 'NEGATIVE_IMPACT' | 'UNRESOLVED';
  precision: number;
  recall: number;
  falsePositiveRate: number;
  falseNegativeRate: number;
  unsupportedEdgeRate: number;
  possibilityCoverage: number;
}

export interface CaseEvaluationReport {
  caseId: string;
  caseName: string;
  description: string;
  groundTruth: EvaluationGroundTruth;
  baseline: PipelineEvaluationResult;
  full: PipelineEvaluationResult;
  adaptive: PipelineEvaluationResult;
  ablations: Record<string, PipelineEvaluationResult>;
  valueAssessment: string;
}

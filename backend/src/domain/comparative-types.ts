export type AlgorithmValueVerdict =
  | 'SIGNIFICANT_VALUE'
  | 'MODERATE_VALUE'
  | 'NO_ADDITIONAL_VALUE'
  | 'BASELINE_SUFFICIENT'
  | 'ASSUMPTION_VIOLATED';

export interface MetricComparisonValue {
  baseline: number;
  algorithm: number;
  delta: number;
}

export interface AlgorithmComparisonMetric {
  possibilitiesDiscovered: MetricComparisonValue;
  possibilitiesEliminated: MetricComparisonValue;
  structuralDistinctionsDiscovered: MetricComparisonValue;
  resolutionCandidates: MetricComparisonValue;
  investigationActions: MetricComparisonValue;
  entropyReduction: MetricComparisonValue;
  unexplainedStructuresDetected: MetricComparisonValue;
}

export interface SingleAlgorithmComparison {
  algorithm: string;
  algorithmKey:
    | 'YEN_K_SHORTEST'
    | 'TEMPORAL_KAHN'
    | 'DOMINATOR_ANALYSIS'
    | 'MIN_CUT'
    | 'DISJOINT_PATHS'
    | 'STRUCTURAL_FAMILIES'
    | 'SHANNON_ENTROPY';
  baselineName: string;
  baselineCapability: string;
  algorithmCapability: string;
  additionalInsight: string;
  downstreamEffect: string;
  ablationResult: string;
  metrics: AlgorithmComparisonMetric;
  verdict: AlgorithmValueVerdict;
  uniqueInvestigativeOutputs: string[];
  assumptionRisks: string[];
}

export interface AlgorithmCaseEvaluationSummary {
  algorithm: string;
  casesEvaluated: number;
  casesWithAdditionalValue: number;
  casesWithNoAdditionalValue: number;
  uniqueInvestigativeOutputs: string[];
  downstreamDecisionsAffected: string[];
}

export interface AlgorithmComparativeReport {
  caseId: string;
  timestamp: string;
  comparisons: SingleAlgorithmComparison[];
  summary: {
    totalAlgorithmsEvaluated: number;
    withAdditionalValue: number;
    withNoAdditionalValue: number;
    totalUniqueOutputs: number;
    downstreamDecisionsAffected: number;
  };
  algorithmSummaries: AlgorithmCaseEvaluationSummary[];
  methodologicalIntegrityNotice: string;
}

import { GraphPayload, GraphNode, GraphEdge } from './types.js';

export type TopologyClass =
  | 'LINEAR_CHAIN'
  | 'BRANCHING_TREE'
  | 'CONVERGING_FUNNEL'
  | 'PARALLEL_CORRIDORS'
  | 'DIAMOND_LATTICE'
  | 'HIGHLY_CONNECTED_DENSE'
  | 'SPARSE_EXPANDER'
  | 'DISCONNECTED_ISLANDS'
  | 'CYCLIC_PARADOX'
  | 'TEMPORAL_CONFLICT'
  | 'EVIDENCE_CONFLICT'
  | 'LARGE_SCALE_SYNTHETIC';

export type GeneralizationClassification =
  | 'SIGNIFICANT_VALUE'
  | 'SOME_VALUE'
  | 'BASELINE_SUFFICIENT'
  | 'NOT_APPLICABLE'
  | 'ASSUMPTION_VIOLATED';

export interface TopologyInstance {
  id: string;
  name: string;
  topologyClass: TopologyClass;
  description: string;
  nodeCount: number;
  edgeCount: number;
  sourceNodeId: string;
  targetNodeId: string;
  graph: GraphPayload;
  expectedCharacteristics: string[];
}

export interface GeneralizationMetricValues {
  baseline: number;
  algorithm: number;
  delta: number;
}

export interface GeneralizationCaseMetrics {
  candidatePossibilities: GeneralizationMetricValues;
  alternativeRoutesDiscovered: GeneralizationMetricValues;
  possibilitiesEliminated: GeneralizationMetricValues;
  structuralDistinctions: GeneralizationMetricValues;
  resolutionCandidates: GeneralizationMetricValues;
  investigationActions: GeneralizationMetricValues;
  entropyReduction: GeneralizationMetricValues;
  runtimeMs: {
    baselineMs: number;
    algorithmMs: number;
  };
}

export interface AlgorithmTopologyEvaluation {
  algorithm: string;
  algorithmKey: string;
  topologyId: string;
  topologyName: string;
  topologyClass: TopologyClass;
  baselineResultSummary: string;
  algorithmResultSummary: string;
  additionalInsight: string;
  downstreamInvestigativeEffect: string;
  runtimeMs: number;
  classification: GeneralizationClassification;
  metrics: GeneralizationCaseMetrics;
  uniqueInvestigativeFindings: string[];
  failureModeOrLimitation?: string;
}

export interface AlgorithmAggregatePerformance {
  algorithm: string;
  algorithmKey: string;
  topologiesEvaluated: number;
  casesWithSignificantValue: number;
  casesWithSomeValue: number;
  casesBaselineSufficient: number;
  casesNotApplicable: number;
  casesAssumptionViolated: number;
  valueRatePercent: number; // (Significant + Some) / Evaluated * 100
  keyStructuralConditionsForValue: string[];
  structuralConditionsWhereFails: string[];
  aggregateInsight: string;
}

export interface GeneralizationBenchmarkReport {
  timestamp: string;
  totalTopologiesEvaluated: number;
  totalEvaluations: number;
  topologies: Array<{
    id: string;
    name: string;
    topologyClass: TopologyClass;
    nodeCount: number;
    edgeCount: number;
  }>;
  evaluations: AlgorithmTopologyEvaluation[];
  aggregateSummaries: AlgorithmAggregatePerformance[];
  keyGeneralizationTakeaways: string[];
  methodologicalIntegrityNotice: string;
}

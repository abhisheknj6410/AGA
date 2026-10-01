import { GraphPayload, GraphNode, GraphEdge, NodeCategory, EdgeType, TemporalInfo, TemporalPrecision } from './types.js';

export type FactEpistemicStatus = 'OBSERVED' | 'INFERRED' | 'POSSIBLE' | 'CONFLICTING' | 'UNRESOLVED';

export type EvidenceFactExtractionMethod =
  | 'DETERMINISTIC_PARSER'
  | 'STRUCTURED_LOG'
  | 'HEURISTIC_RULE'
  | 'MANUAL_ENTRY';

export interface FactProvenance {
  sourceEvidenceId: string;
  sourceName: string;
  sourceKind: string;
  sourceReference: string; // e.g. "Security Log Line 142", "CCTV Cam-02 Frame 819"
  collector?: string;
  collectionTime?: string;
  hashChecksum?: string;
  reliability: number; // 0.0 to 1.0
}

export interface FactEntityRef {
  id: string;
  label: string;
  category: NodeCategory;
  type: string;
  properties?: Record<string, unknown>;
  time?: TemporalInfo;
}

export interface EvidenceFact {
  id: string;
  caseId: string;
  subject: FactEntityRef;
  predicate: EdgeType | string;
  object: FactEntityRef;
  temporalInfo?: TemporalInfo;
  epistemicStatus: FactEpistemicStatus;
  extractionMethod: EvidenceFactExtractionMethod;
  provenance: FactProvenance;
  rawTextSnippet?: string;
  confidence: number; // 0.0 to 1.0
}

export interface ContradictionRecord {
  id: string;
  conflictType: 'TEMPORAL_INVERSION' | 'MUTUALLY_EXCLUSIVE_LOCATION' | 'IDENTITY_DISCREPANCY' | 'STATUS_CONFLICT';
  description: string;
  factIds: string[];
  competingClaims: Array<{
    factId: string;
    claim: string;
    source: string;
    timestamp?: string;
  }>;
  resolved: boolean;
}

export interface ReconstructionValidationGate {
  gateName:
    | 'SCHEMA'
    | 'TEMPORAL'
    | 'PROVENANCE'
    | 'ENTITY_IDENTITY'
    | 'RELATIONSHIP_DIRECTION'
    | 'CONTRADICTION'
    | 'DISCONNECTED_FACT';
  passed: boolean;
  details: string;
  violations: string[];
}

export interface ReconstructionValidationResult {
  isValid: boolean;
  gates: ReconstructionValidationGate[];
  acceptedFactIds: string[];
  rejectedFactIds: string[];
  ambiguousFactIds: string[];
  rejectionReasons: Record<string, string[]>;
  contradictionsDetected: ContradictionRecord[];
}

export interface GraphInterpretation {
  id: string;
  name: string;
  description: string;
  graph: GraphPayload;
  supportingFactIds: string[];
  conflictingFactIds: string[];
  requiredAssumptions: string[];
  distinguishingEdges: Array<{
    edgeId: string;
    source: string;
    target: string;
    type: string;
    reason: string;
  }>;
  sharedEdgeIds: string[];
  coherenceScore: number; // 0.0 - 1.0
}

export interface EdgeProvenanceTrace {
  edgeId: string;
  sourceNode: { id: string; label: string; category: string };
  targetNode: { id: string; label: string; category: string };
  edgeType: string;
  status: string;
  supportingFacts: EvidenceFact[];
  sourceEvidences: Array<{
    id: string;
    name: string;
    kind: string;
    reference: string;
    hashChecksum?: string;
  }>;
  derivationChain: string[];
  isDirectlyObserved: boolean;
  isInference: boolean;
}

export interface MessyEvidenceBenchmarkReport {
  timestamp: string;
  datasetName: string;
  totalRawEvidenceItems: number;
  totalFactsExtracted: number;
  factsAccepted: number;
  factsRejected: number;
  ambiguousFacts: number;
  contradictionsDetected: number;
  graphInterpretationsGenerated: number;
  falseEdgesPrevented: number;
  provenanceCoveragePercent: number; // 100% required by invariant!
  interpretations: GraphInterpretation[];
  summaryTakeaways: string[];
}

export interface ReconstructionPipelineReport {
  caseId: string;
  timestamp: string;
  rawEvidenceCount: number;
  extractedFacts: EvidenceFact[];
  validation: ReconstructionValidationResult;
  acceptedGraph: GraphPayload;
  interpretations: GraphInterpretation[];
  provenanceTraces: EdgeProvenanceTrace[];
  hardInvariantVerified: boolean;
  methodologicalIntegrityNotice: string;
}

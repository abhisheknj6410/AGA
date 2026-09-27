export const ENTITY_TYPES = [
  'PERSON',
  'ORGANIZATION',
  'ACCOUNT',
  'DEVICE',
  'IP_ADDRESS',
  'LOCATION',
  'PHONE_NUMBER',
  'EMAIL',
  'VEHICLE',
  'FILE',
  'SERVER',
  'DOMAIN',
  'PROCESS',
  'APPLICATION'
] as const;

export type EntityType = (typeof ENTITY_TYPES)[number];

export const EVENT_TYPES = [
  'LOGIN',
  'LOGOUT',
  'FILE_ACCESS',
  'FILE_CREATION',
  'FILE_DELETION',
  'FILE_TRANSFER',
  'PROCESS_EXECUTION',
  'ACCOUNT_CREATION',
  'ACCOUNT_MODIFICATION',
  'PASSWORD_CHANGE',
  'COMMUNICATION',
  'TRANSACTION',
  'LOCATION_CHANGE',
  'DEVICE_CONNECTION',
  'NETWORK_CONNECTION',
  'DATA_ACCESS'
] as const;

export type EventType = (typeof EVENT_TYPES)[number];

export const EVIDENCE_TYPES = [
  'LOG',
  'DOCUMENT',
  'IMAGE',
  'VIDEO',
  'CCTV',
  'PHONE_RECORD',
  'TRANSACTION_RECORD',
  'EMAIL',
  'CHAT',
  'INTERVIEW',
  'DATABASE_RECORD',
  'NETWORK_CAPTURE',
  'SYSTEM_RECORD',
  'MANUAL_ENTRY'
] as const;

export type EvidenceType = (typeof EVIDENCE_TYPES)[number];

export type NodeCategory = 'ENTITY' | 'EVENT' | 'EVIDENCE';

export const EDGE_TYPES = [
  'OWNS',
  'USES',
  'LOCATED_AT',
  'MEMBER_OF',
  'ASSOCIATED_WITH',
  'CONTACTED',
  'CONNECTED_TO',
  'PERFORMED',
  'INITIATED',
  'PARTICIPATED_IN',
  'TARGETED',
  'AFFECTED',
  'ACCESSED',
  'CREATED',
  'MODIFIED',
  'DELETED',
  'USED',
  'PRECEDED',
  'CAUSED',
  'DEPENDS_ON',
  'TRIGGERED',
  'SUPPORTS',
  'CONTRADICTS',
  'DERIVED_FROM'
] as const;

export type EdgeType = (typeof EDGE_TYPES)[number];

export const EDGE_STATUSES = ['OBSERVED', 'DERIVED', 'HYPOTHESIZED'] as const;
export type EdgeStatus = (typeof EDGE_STATUSES)[number];

export const TEMPORAL_PRECISIONS = ['SECOND', 'MINUTE', 'HOUR', 'DAY', 'UNKNOWN'] as const;
export type TemporalPrecision = (typeof TEMPORAL_PRECISIONS)[number];

export interface TemporalInfo {
  start?: string;
  end?: string;
  precision: TemporalPrecision;
}

export interface EvidenceSource {
  name: string;
  kind: string;
  reference?: string;
}

export interface GraphNode {
  id: string;
  caseId: string;
  category: NodeCategory;
  type: string;
  label: string;
  properties: Record<string, any>;
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  time?: TemporalInfo;
  evidenceType?: EvidenceType;
  source?: EvidenceSource;
  reliability?: number;
  collectionTime?: string;
  hashChecksum?: string;
}

export interface GraphEdge {
  id: string;
  caseId: string;
  source: string;
  target: string;
  type: EdgeType;
  status: EdgeStatus;
  cost: number;
  confidence: number | null;
  evidenceRefs: string[];
  properties: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface Case {
  id: string;
  name: string;
  description: string;
  status: 'ACTIVE' | 'CLOSED' | 'ARCHIVED';
  createdAt: string;
  updatedAt: string;
}

export interface GraphPayload {
  nodes: GraphNode[];
  edges: GraphEdge[];
  metadata: {
    caseId: string;
    nodeCount: number;
    edgeCount: number;
    entityCount: number;
    eventCount: number;
    evidenceCount: number;
    generatedAt: string;
  };
}

export interface AuditLog {
  id: string;
  caseId: string;
  who: string;
  action: string;
  objectType: string;
  objectId: string;
  oldValue?: any;
  newValue?: any;
  timestamp: string;
  reason?: string;
}

export interface ResolutionCandidate {
  id: string;
  caseId: string;
  sourceNodeId: string;
  targetNodeId: string;
  matchType: string;
  similarityScore: number;
  reason: string;
  status: 'PENDING' | 'MERGED' | 'REJECTED';
  createdAt: string;
}

export type PossibilityStatus =
  | 'VALID'
  | 'INVALID'
  | 'CONDITIONAL'
  | 'CONFLICTING'
  | 'SUPERSEDED'
  | 'ARCHIVED';

export type PossibilityGenerationMethod =
  | 'ALTERNATIVE_PATHS'
  | 'TEMPORAL_ORDERING'
  | 'ENTITY_RESOLUTION'
  | 'RELATIONSHIP_UNCERTAINTY'
  | 'CONTRADICTION_BRANCHING'
  | 'MANUAL_HYPOTHESIS';

export interface GraphDelta {
  addedNodes: GraphNode[];
  removedNodeIds: string[];
  modifiedNodes: Partial<GraphNode>[];
  addedEdges: GraphEdge[];
  removedEdgeIds: string[];
  modifiedEdges: Partial<GraphEdge>[];
  entityResolutionMerges?: Array<{
    survivingNodeId: string;
    mergedNodeId: string;
    rewiredEdgeCount: number;
  }>;
}

export interface GenerationTraceStep {
  step: number;
  phase: 'CANDIDATE_DISCOVERY' | 'TEMPORAL_VALIDATION' | 'EVIDENCE_CONSTRAINT' | 'STRUCTURAL_VALIDATION' | 'CANONICALIZATION' | 'ANALYTICAL_EVALUATION';
  algorithm: string;
  status: 'PASSED' | 'FAILED' | 'SKIPPED' | 'APPLIED';
  detail: string;
  timestamp: string;
}

export interface Possibility {
  id: string;
  caseId: string;
  name: string;
  description: string;
  baseGraphVersion: number;
  status: PossibilityStatus;
  generationMethod: PossibilityGenerationMethod;
  assumptions: string[];
  graphChanges: GraphDelta;
  constraints: Record<string, unknown>;
  supportingEvidence: string[];
  conflictingEvidence: string[];
  unresolvedQuestions: string[];
  canonicalSignature: string;
  algorithmResults?: Record<string, any>;
  generationTrace?: GenerationTraceStep[];
  criticalDependency?: Array<{ nodeId: string; label: string }>;
  criticalCut?: Array<{ edgeId: string; source: string; target: string }>;
  independentSupportPaths?: number;
  createdAt: string;
  updatedAt: string;
}

export interface GenerationTrace {
  possibilityId: string;
  possibilityName: string;
  generationMethod: PossibilityGenerationMethod;
  candidateSummary: string;
  steps: GenerationTraceStep[];
  finalDecision: 'ACCEPTED' | 'REJECTED';
  eliminationReason?: string;
}

export interface AlgorithmImpactStage {
  algorithm: string;
  phase: string;
  candidatesBefore: number;
  candidatesAfter: number;
  candidatesEliminated: number;
  rejectionReasons: string[];
  executionTimeMs: number;
}

export interface AlgorithmImpactReport {
  caseId: string;
  timestamp: string;
  inputCandidatesCount: number;
  survivingPossibilitiesCount: number;
  eliminatedCandidatesCount: number;
  stages: AlgorithmImpactStage[];
  eliminatedCandidates: Array<{
    id: string;
    candidateSummary: string;
    eliminatedBy: string;
    reason: string;
  }>;
  commonInvariantsSummary: {
    nodeCount: number;
    edgeCount: number;
    evidenceCount: number;
  };
  criticalDependencies: Array<{
    nodeId: string;
    label: string;
    role: string;
  }>;
}

export interface PossibilityComparison {
  caseId: string;
  comparedAt: string;
  possibilities: Array<{
    id: string;
    name: string;
    status: PossibilityStatus;
    generationMethod: PossibilityGenerationMethod;
    temporalValidity: 'VALID' | 'INVALID' | 'AMBIGUOUS';
    evidenceSupportCount: number;
    conflictingEvidenceCount: number;
    assumptionCount: number;
    independentPathCount?: number;
    criticalNodeCount?: number;
    pathCost?: number;
    unresolvedQuestionsCount: number;
  }>;
  structuralDiff: {
    commonNodes: string[];
    distinguishingNodes: Record<string, string[]>;
    commonEdges: Array<{ source: string; target: string; type: string }>;
    distinguishingEdges: Record<string, Array<{ source: string; target: string; type: string }>>;
    commonEvidence: string[];
    distinguishingEvidence: Record<string, string[]>;
  };
  resolvingRecommendations?: Array<{
    distinguishingElement: string;
    distinguishingType: 'NODE' | 'EDGE' | 'IDENTITY' | 'TEMPORAL_ORDER';
    affectedPossibilityIds: string[];
    recommendedAction: string;
    rationale: string;
  }>;
}

export interface AgentQueryResult {
  query: string;
  intent: string;
  matchedEntityIds?: string[];
  matchedPossibilityIds?: string[];
  algorithmUsed?: string;
  factualAnswer: string;
  structuredData: Record<string, unknown>;
  suggestedFollowUps: string[];
}

export type GraphMutationType =
  | 'ADD_NODE'
  | 'REMOVE_NODE'
  | 'MODIFY_NODE'
  | 'ADD_EDGE'
  | 'REMOVE_EDGE'
  | 'MODIFY_EDGE'
  | 'MERGE_ENTITIES'
  | 'SPLIT_ENTITIES'
  | 'IMPORT_SNAPSHOT'
  | 'INITIAL_GRAPH';

export interface GraphMutation {
  action: GraphMutationType;
  targetType: 'NODE' | 'EDGE' | 'EVIDENCE' | 'ENTITY_RESOLUTION' | 'SYSTEM';
  targetId: string;
  summary: string;
  timestamp: string;
  author?: string;
  reason?: string;
}

export interface GraphMutationDelta {
  addedNodes: GraphNode[];
  removedNodes: GraphNode[];
  modifiedNodes: Array<{ before: GraphNode; after: GraphNode }>;
  addedEdges: GraphEdge[];
  removedEdges: GraphEdge[];
  modifiedEdges: Array<{ before: GraphEdge; after: GraphEdge }>;
  changedEvidence: Array<{ evidenceId: string; type: 'ADDED' | 'REMOVED' | 'MODIFIED'; detail?: string }>;
  changedTemporalConstraints: Array<{ eventId: string; beforeTime?: string; afterTime?: string; reason: string }>;
  changedIdentityConstraints: Array<{ sourceId: string; targetId: string; action: 'MERGED' | 'SEPARATED' | 'PENDING' }>;
}

export interface AffectedSubgraph {
  affectedNodeIds: string[];
  affectedEdgeIds: string[];
  affectedEvidenceIds: string[];
  propagationReason: string;
}

export interface GraphVersion {
  id: string;
  caseId: string;
  versionNumber: number;
  parentVersionNumber: number | null;
  changeSummary: string;
  mutation: GraphMutation;
  delta: GraphMutationDelta;
  affectedSubgraph: AffectedSubgraph;
  createdAt: string;
}

export interface AddedPossibilityRecord {
  possibility: Possibility;
  causalReason: string;
  spawningAlgorithm: string;
}

export interface RemovedPossibilityRecord {
  possibilityId: string;
  possibilityName: string;
  causalReason: string;
  eliminatingAlgorithm: string;
  affectedStructure?: string;
}

export interface ModifiedPossibilityRecord {
  possibilityId: string;
  possibilityName: string;
  statusBefore: PossibilityStatus;
  statusAfter: PossibilityStatus;
  changes: {
    addedNodes: string[];
    removedNodes: string[];
    addedEdges: string[];
    removedEdges: string[];
    constraintsChanged: string[];
  };
  causalReason: string;
}

export interface UnchangedPossibilityRecord {
  possibilityId: string;
  possibilityName: string;
  status: PossibilityStatus;
}

export interface PossibilityEvolution {
  fromVersion: number;
  toVersion: number;
  addedPossibilities: AddedPossibilityRecord[];
  removedPossibilities: RemovedPossibilityRecord[];
  modifiedPossibilities: ModifiedPossibilityRecord[];
  unchangedPossibilities: UnchangedPossibilityRecord[];
  summary: string;
}

export interface IncrementalImpactReport {
  caseId: string;
  fromVersion: number;
  toVersion: number;
  mutation: GraphMutation;
  deltaSummary: {
    changedNodes: number;
    changedEdges: number;
    changedEvidence: number;
  };
  affectedSubgraph: {
    nodeCount: number;
    edgeCount: number;
    nodeIds: string[];
    edgeIds: string[];
  };
  algorithmsReused: string[];
  algorithmsInvalidated: string[];
  algorithmsRecomputed: string[];
  candidatePathsBefore: number;
  candidatePathsAfter: number;
  validPossibilitiesBefore: number;
  validPossibilitiesAfter: number;
  invariantsSummary: string;
  possibilityEvolution: PossibilityEvolution;
  executionTimeMs: {
    deltaDetection: number;
    affectedRegion: number;
    algorithmRecomputation: number;
    possibilityEvolution: number;
    total: number;
  };
}

export interface SimulationResult {
  simulationId: string;
  caseId: string;
  baseVersion: number;
  simulatedAction: string;
  targetType: 'EVIDENCE' | 'NODE' | 'EDGE' | 'ENTITY_RESOLUTION';
  targetId: string;
  baselinePossibilityCount: number;
  simulatedPossibilityCount: number;
  addedPossibilities: Array<{ id: string; name: string; reason: string }>;
  removedPossibilities: Array<{ id: string; name: string; reason: string }>;
  modifiedPossibilities: Array<{ id: string; name: string; change: string }>;
  unchangedPossibilities: Array<{ id: string; name: string }>;
  explanation: string;
  simulatedPossibilities: Possibility[];
}


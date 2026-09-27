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
  createdAt: string;
  updatedAt: string;
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


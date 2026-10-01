/**
 * Domain Type Definitions for Evidence-Constrained Graph Investigation System
 */

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
  // Entity -> Entity
  'OWNS',
  'USES',
  'LOCATED_AT',
  'MEMBER_OF',
  'ASSOCIATED_WITH',
  'CONTACTED',
  'CONNECTED_TO',
  // Entity -> Event
  'PERFORMED',
  'INITIATED',
  'PARTICIPATED_IN',
  // Event -> Entity
  'TARGETED',
  'AFFECTED',
  'ACCESSED',
  'CREATED',
  'MODIFIED',
  'DELETED',
  'USED',
  // Event -> Event
  'PRECEDED',
  'CAUSED',
  'DEPENDS_ON',
  'TRIGGERED',
  // Evidence relationships
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
  start?: string; // ISO 8601 string
  end?: string;   // ISO 8601 string
  precision: TemporalPrecision;
}

export interface EvidenceSource {
  name: string;
  kind: 'SYSTEM' | 'HUMAN' | 'DEVICE' | 'THIRD_PARTY' | 'NETWORK' | 'SENSOR' | 'OTHER';
  reference?: string;
}

export interface NodeMetadata {
  source?: string;
  importedAt?: string;
  aiExtracted?: boolean;
  extractionConfidence?: number;
  [key: string]: unknown;
}

export interface GraphNode {
  id: string;
  caseId: string;
  category: NodeCategory;
  type: string; // Specific EntityType, EventType, or EvidenceType
  label: string;
  properties: Record<string, unknown>;
  metadata: NodeMetadata;
  createdAt: string;
  updatedAt: string;

  // Event-specific fields
  time?: TemporalInfo;

  // Evidence-specific fields
  evidenceType?: EvidenceType;
  source?: EvidenceSource;
  reliability?: number; // 0.0 - 1.0
  collectionTime?: string;
  hashChecksum?: string;
}

export interface GraphEdge {
  id: string;
  caseId: string;
  source: string; // Node ID
  target: string; // Node ID
  type: EdgeType;
  status: EdgeStatus;
  cost: number;
  confidence: number | null; // Nullable for OBSERVED, 0.0 - 1.0 for derived
  evidenceRefs: string[]; // List of Evidence Node IDs
  properties: Record<string, unknown>;
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

export interface AuditLog {
  id: string;
  caseId: string;
  who: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'MERGE' | 'IMPORT' | 'RESOLVE';
  objectType: 'CASE' | 'NODE' | 'EDGE' | 'EVIDENCE' | 'RESOLUTION';
  objectId: string;
  oldValue?: unknown;
  newValue?: unknown;
  timestamp: string;
  reason?: string;
}

export type ResolutionMatchType = 'EXACT_MATCH' | 'CONFIRMED_MATCH' | 'POSSIBLE_MATCH' | 'NO_MATCH';

export interface ResolutionCandidate {
  id: string;
  caseId: string;
  sourceNodeId: string;
  targetNodeId: string;
  matchType: ResolutionMatchType;
  similarityScore: number;
  reason: string;
  status: 'PENDING' | 'MERGED' | 'REJECTED';
  createdAt: string;
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

export * from './possibility-types.js';


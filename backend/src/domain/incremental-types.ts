import { GraphNode, GraphEdge, GraphPayload } from './types.js';
import { Possibility, PossibilityStatus, PossibilityGenerationMethod } from './possibility-types.js';

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

export interface GraphDelta {
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
  delta: GraphDelta;
  affectedSubgraph: AffectedSubgraph;
  snapshot?: GraphPayload;
  createdAt: string;
}

export type PossibilityChangeStatus = 'ADDED' | 'REMOVED' | 'MODIFIED' | 'UNCHANGED';

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

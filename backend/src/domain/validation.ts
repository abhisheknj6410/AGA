import {
  GraphNode,
  GraphEdge,
  NodeCategory,
  EntityType,
  EventType,
  EvidenceType,
  EdgeType,
  EdgeStatus
} from './types.js';
import {
  isValidEntityType,
  isValidEventType,
  isValidEvidenceType,
  isValidEdgeType,
  validateRelationshipDirection
} from './vocabulary.js';
import { validateTemporalInfo } from './temporal.js';

export interface ValidationErrorItem {
  field: string;
  message: string;
  code: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationErrorItem[];
}

/**
 * Validates a node structure before persistence.
 */
export function validateNode(node: Partial<GraphNode>): ValidationResult {
  const errors: ValidationErrorItem[] = [];

  if (!node.id || typeof node.id !== 'string' || node.id.trim() === '') {
    errors.push({ field: 'id', message: 'Node ID is required and must be non-empty string.', code: 'INVALID_ID' });
  }

  if (!node.caseId || typeof node.caseId !== 'string') {
    errors.push({ field: 'caseId', message: 'Case ID is required.', code: 'INVALID_CASE_ID' });
  }

  if (!node.category || !['ENTITY', 'EVENT', 'EVIDENCE'].includes(node.category)) {
    errors.push({
      field: 'category',
      message: "Node category must be one of 'ENTITY', 'EVENT', 'EVIDENCE'.",
      code: 'INVALID_CATEGORY'
    });
  }

  if (!node.label || typeof node.label !== 'string' || node.label.trim() === '') {
    errors.push({ field: 'label', message: 'Label is required and must be non-empty.', code: 'INVALID_LABEL' });
  }

  // Category-specific type validation
  if (node.category === 'ENTITY') {
    if (!node.type || !isValidEntityType(node.type)) {
      errors.push({
        field: 'type',
        message: `Invalid entity type '${node.type}'. Allowed: PERSON, ORGANIZATION, ACCOUNT, DEVICE, IP_ADDRESS, LOCATION, PHONE_NUMBER, EMAIL, VEHICLE, FILE, SERVER, DOMAIN, PROCESS, APPLICATION.`,
        code: 'INVALID_ENTITY_TYPE'
      });
    }
  } else if (node.category === 'EVENT') {
    if (!node.type || !isValidEventType(node.type)) {
      errors.push({
        field: 'type',
        message: `Invalid event type '${node.type}'. Allowed: LOGIN, LOGOUT, FILE_ACCESS, FILE_CREATION, FILE_DELETION, FILE_TRANSFER, PROCESS_EXECUTION, ACCOUNT_CREATION, ACCOUNT_MODIFICATION, PASSWORD_CHANGE, COMMUNICATION, TRANSACTION, LOCATION_CHANGE, DEVICE_CONNECTION, NETWORK_CONNECTION, DATA_ACCESS.`,
        code: 'INVALID_EVENT_TYPE'
      });
    }

    // Temporal validation for events
    if (node.time) {
      const temporalCheck = validateTemporalInfo(node.time);
      if (!temporalCheck.valid) {
        errors.push({
          field: 'time',
          message: temporalCheck.error || 'Invalid temporal interval.',
          code: 'INVALID_TEMPORAL_INFO'
        });
      }
    }
  } else if (node.category === 'EVIDENCE') {
    if (!node.type || !isValidEvidenceType(node.type)) {
      errors.push({
        field: 'type',
        message: `Invalid evidence type '${node.type}'. Allowed: LOG, DOCUMENT, IMAGE, VIDEO, CCTV, PHONE_RECORD, TRANSACTION_RECORD, EMAIL, CHAT, INTERVIEW, DATABASE_RECORD, NETWORK_CAPTURE, SYSTEM_RECORD, MANUAL_ENTRY.`,
        code: 'INVALID_EVIDENCE_TYPE'
      });
    }

    if (node.reliability !== undefined && node.reliability !== null) {
      if (typeof node.reliability !== 'number' || node.reliability < 0 || node.reliability > 1) {
        errors.push({
          field: 'reliability',
          message: 'Evidence reliability must be a number between 0.0 and 1.0.',
          code: 'INVALID_RELIABILITY'
        });
      }
    }

    if (!node.source || typeof node.source !== 'object' || !node.source.name) {
      errors.push({
        field: 'source',
        message: 'Evidence must specify source object with at least a source name.',
        code: 'INVALID_SOURCE'
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validates an edge structure before persistence.
 */
export function validateEdge(
  edge: Partial<GraphEdge>,
  sourceNode?: GraphNode,
  targetNode?: GraphNode,
  availableEvidenceIds?: Set<string>
): ValidationResult {
  const errors: ValidationErrorItem[] = [];

  if (!edge.id || typeof edge.id !== 'string' || edge.id.trim() === '') {
    errors.push({ field: 'id', message: 'Edge ID is required.', code: 'INVALID_ID' });
  }

  if (!edge.caseId || typeof edge.caseId !== 'string') {
    errors.push({ field: 'caseId', message: 'Case ID is required.', code: 'INVALID_CASE_ID' });
  }

  if (!edge.source || typeof edge.source !== 'string') {
    errors.push({ field: 'source', message: 'Source node ID is required.', code: 'MISSING_SOURCE' });
  }

  if (!edge.target || typeof edge.target !== 'string') {
    errors.push({ field: 'target', message: 'Target node ID is required.', code: 'MISSING_TARGET' });
  }

  if (!edge.type || !isValidEdgeType(edge.type)) {
    errors.push({
      field: 'type',
      message: `Invalid edge relationship type '${edge.type}'.`,
      code: 'INVALID_EDGE_TYPE'
    });
  }

  if (!edge.status || !['OBSERVED', 'DERIVED', 'HYPOTHESIZED'].includes(edge.status)) {
    errors.push({
      field: 'status',
      message: "Edge status must be one of 'OBSERVED', 'DERIVED', 'HYPOTHESIZED'.",
      code: 'INVALID_STATUS'
    });
  }

  if (edge.cost !== undefined && edge.cost !== null) {
    if (typeof edge.cost !== 'number' || edge.cost < 0) {
      errors.push({
        field: 'cost',
        message: 'Traversal cost must be a non-negative number.',
        code: 'INVALID_COST'
      });
    }
  }

  if (edge.confidence !== undefined && edge.confidence !== null) {
    if (typeof edge.confidence !== 'number' || edge.confidence < 0 || edge.confidence > 1) {
      errors.push({
        field: 'confidence',
        message: 'Confidence must be between 0.0 and 1.0 or null.',
        code: 'INVALID_CONFIDENCE'
      });
    }
  }

  // Cross-case isolation check
  if (sourceNode && sourceNode.caseId !== edge.caseId) {
    errors.push({
      field: 'source',
      message: `Cross-case violation: Source node '${sourceNode.id}' belongs to case '${sourceNode.caseId}', but edge belongs to '${edge.caseId}'.`,
      code: 'CROSS_CASE_VIOLATION'
    });
  }

  if (targetNode && targetNode.caseId !== edge.caseId) {
    errors.push({
      field: 'target',
      message: `Cross-case violation: Target node '${targetNode.id}' belongs to case '${targetNode.caseId}', but edge belongs to '${edge.caseId}'.`,
      code: 'CROSS_CASE_VIOLATION'
    });
  }

  // Direction validation
  if (sourceNode && targetNode && edge.type && isValidEdgeType(edge.type)) {
    const dirResult = validateRelationshipDirection(sourceNode.category, targetNode.category, edge.type);
    if (!dirResult.valid) {
      errors.push({
        field: 'type',
        message: dirResult.error || 'Invalid relationship direction.',
        code: 'INVALID_DIRECTION'
      });
    }
  }

  // Provenance check for OBSERVED edges
  if (edge.status === 'OBSERVED') {
    if (!edge.evidenceRefs || edge.evidenceRefs.length === 0) {
      errors.push({
        field: 'evidenceRefs',
        message: "Provenance violation: 'OBSERVED' relationships must reference at least one supporting evidence item.",
        code: 'PROVENANCE_MISSING'
      });
    }
  }

  // Evidence reference existence check
  if (edge.evidenceRefs && availableEvidenceIds) {
    for (const evId of edge.evidenceRefs) {
      if (!availableEvidenceIds.has(evId)) {
        errors.push({
          field: 'evidenceRefs',
          message: `Referenced evidence '${evId}' does not exist in case '${edge.caseId}'.`,
          code: 'DANGLING_EVIDENCE_REF'
        });
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

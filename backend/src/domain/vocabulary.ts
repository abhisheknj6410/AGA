import {
  EdgeType,
  NodeCategory,
  EDGE_TYPES,
  ENTITY_TYPES,
  EVENT_TYPES,
  EVIDENCE_TYPES,
  EntityType,
  EventType,
  EvidenceType
} from './types.js';

export interface AllowedConnection {
  edgeType: EdgeType;
  allowedSourceCategories: NodeCategory[];
  allowedTargetCategories: NodeCategory[];
  description: string;
}

/**
 * Controlled Relationship Vocabulary Rules.
 * Source & Target node categories must strictly conform to these definitions.
 */
export const RELATIONSHIP_RULES: Record<EdgeType, AllowedConnection> = {
  // Entity -> Entity
  OWNS: {
    edgeType: 'OWNS',
    allowedSourceCategories: ['ENTITY'],
    allowedTargetCategories: ['ENTITY'],
    description: 'Entity owns another entity (e.g. Person owns Device/Vehicle/Account)'
  },
  USES: {
    edgeType: 'USES',
    allowedSourceCategories: ['ENTITY'],
    allowedTargetCategories: ['ENTITY'],
    description: 'Entity uses another entity (e.g. Person uses Device/Account/Application)'
  },
  LOCATED_AT: {
    edgeType: 'LOCATED_AT',
    allowedSourceCategories: ['ENTITY'],
    allowedTargetCategories: ['ENTITY'],
    description: 'Entity is geographically or physically located at another entity (e.g. Server located at Location)'
  },
  MEMBER_OF: {
    edgeType: 'MEMBER_OF',
    allowedSourceCategories: ['ENTITY'],
    allowedTargetCategories: ['ENTITY'],
    description: 'Entity is a member of an organization or group'
  },
  ASSOCIATED_WITH: {
    edgeType: 'ASSOCIATED_WITH',
    allowedSourceCategories: ['ENTITY'],
    allowedTargetCategories: ['ENTITY'],
    description: 'General peer association between two entities'
  },
  CONTACTED: {
    edgeType: 'CONTACTED',
    allowedSourceCategories: ['ENTITY'],
    allowedTargetCategories: ['ENTITY'],
    description: 'Direct communication or contact between two entities'
  },
  CONNECTED_TO: {
    edgeType: 'CONNECTED_TO',
    allowedSourceCategories: ['ENTITY', 'EVENT'],
    allowedTargetCategories: ['ENTITY'],
    description: 'Physical/network connection between entities or an event establishing a connection to an entity'
  },

  // Entity -> Event
  PERFORMED: {
    edgeType: 'PERFORMED',
    allowedSourceCategories: ['ENTITY'],
    allowedTargetCategories: ['EVENT'],
    description: 'Entity was the direct active performer of the event'
  },
  INITIATED: {
    edgeType: 'INITIATED',
    allowedSourceCategories: ['ENTITY'],
    allowedTargetCategories: ['EVENT'],
    description: 'Entity initiated the event (e.g. scheduled process, script)'
  },
  PARTICIPATED_IN: {
    edgeType: 'PARTICIPATED_IN',
    allowedSourceCategories: ['ENTITY'],
    allowedTargetCategories: ['EVENT'],
    description: 'Entity was a participant/observer in the event'
  },

  // Event -> Entity
  TARGETED: {
    edgeType: 'TARGETED',
    allowedSourceCategories: ['EVENT'],
    allowedTargetCategories: ['ENTITY'],
    description: 'The event was directed towards an entity (e.g. Login targeted Server)'
  },
  AFFECTED: {
    edgeType: 'AFFECTED',
    allowedSourceCategories: ['EVENT'],
    allowedTargetCategories: ['ENTITY'],
    description: 'The event caused side effects or altered state of an entity'
  },
  ACCESSED: {
    edgeType: 'ACCESSED',
    allowedSourceCategories: ['EVENT'],
    allowedTargetCategories: ['ENTITY'],
    description: 'The event accessed an entity (e.g. File Access accessed File)'
  },
  CREATED: {
    edgeType: 'CREATED',
    allowedSourceCategories: ['EVENT'],
    allowedTargetCategories: ['ENTITY'],
    description: 'The event generated a new entity (e.g. File Creation created File)'
  },
  MODIFIED: {
    edgeType: 'MODIFIED',
    allowedSourceCategories: ['EVENT'],
    allowedTargetCategories: ['ENTITY'],
    description: 'The event modified an existing entity'
  },
  DELETED: {
    edgeType: 'DELETED',
    allowedSourceCategories: ['EVENT'],
    allowedTargetCategories: ['ENTITY'],
    description: 'The event deleted or removed an entity'
  },
  USED: {
    edgeType: 'USED',
    allowedSourceCategories: ['EVENT'],
    allowedTargetCategories: ['ENTITY'],
    description: 'The event utilized an entity as an instrument/medium'
  },

  // Event -> Event
  PRECEDED: {
    edgeType: 'PRECEDED',
    allowedSourceCategories: ['EVENT'],
    allowedTargetCategories: ['EVENT'],
    description: 'Event occurred chronologically prior to another event'
  },
  CAUSED: {
    edgeType: 'CAUSED',
    allowedSourceCategories: ['EVENT'],
    allowedTargetCategories: ['EVENT'],
    description: 'Event directly caused another event to occur'
  },
  DEPENDS_ON: {
    edgeType: 'DEPENDS_ON',
    allowedSourceCategories: ['EVENT'],
    allowedTargetCategories: ['EVENT'],
    description: 'Event could not occur without the prior event'
  },
  TRIGGERED: {
    edgeType: 'TRIGGERED',
    allowedSourceCategories: ['EVENT'],
    allowedTargetCategories: ['EVENT'],
    description: 'Event triggered an automated or reactive subsequent event'
  },

  // Evidence Relationships
  SUPPORTS: {
    edgeType: 'SUPPORTS',
    allowedSourceCategories: ['EVIDENCE'],
    allowedTargetCategories: ['ENTITY', 'EVENT', 'EVIDENCE'],
    description: 'Evidence provides corroborating substantiation for a node/fact'
  },
  CONTRADICTS: {
    edgeType: 'CONTRADICTS',
    allowedSourceCategories: ['EVIDENCE'],
    allowedTargetCategories: ['ENTITY', 'EVENT', 'EVIDENCE'],
    description: 'Evidence directly conflicts with or disproves a node/fact'
  },
  DERIVED_FROM: {
    edgeType: 'DERIVED_FROM',
    allowedSourceCategories: ['ENTITY', 'EVENT', 'EVIDENCE'],
    allowedTargetCategories: ['EVIDENCE', 'ENTITY', 'EVENT'],
    description: 'Fact was derived from evidence or prior node'
  }
};

/**
 * Validates whether a proposed relationship direction and type is permitted.
 */
export function validateRelationshipDirection(
  sourceCategory: NodeCategory,
  targetCategory: NodeCategory,
  edgeType: EdgeType
): { valid: boolean; error?: string } {
  const rule = RELATIONSHIP_RULES[edgeType];
  if (!rule) {
    return {
      valid: false,
      error: `Unknown relationship type '${edgeType}'. Allowed types: ${EDGE_TYPES.join(', ')}`
    };
  }

  const isSourceAllowed = rule.allowedSourceCategories.includes(sourceCategory);
  const isTargetAllowed = rule.allowedTargetCategories.includes(targetCategory);

  if (!isSourceAllowed || !isTargetAllowed) {
    return {
      valid: false,
      error: `Invalid relationship direction for '${edgeType}': Requires source [${rule.allowedSourceCategories.join(
        '|'
      )}] and target [${rule.allowedTargetCategories.join('|')}]. Received source '${sourceCategory}' and target '${targetCategory}'.`
    };
  }

  return { valid: true };
}

export function isValidEntityType(type: string): type is EntityType {
  return (ENTITY_TYPES as readonly string[]).includes(type);
}

export function isValidEventType(type: string): type is EventType {
  return (EVENT_TYPES as readonly string[]).includes(type);
}

export function isValidEvidenceType(type: string): type is EvidenceType {
  return (EVIDENCE_TYPES as readonly string[]).includes(type);
}

export function isValidEdgeType(type: string): type is EdgeType {
  return (EDGE_TYPES as readonly string[]).includes(type);
}

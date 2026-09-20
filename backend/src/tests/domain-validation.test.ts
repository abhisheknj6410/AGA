import { describe, it } from 'node:test';
import assert from 'node:assert';
import { validateNode, validateEdge } from '../domain/validation.js';
import { validateRelationshipDirection } from '../domain/vocabulary.js';
import { GraphNode, GraphEdge } from '../domain/types.js';

describe('Domain Schema Validation', () => {
  it('should accept a valid entity node', () => {
    const node: Partial<GraphNode> = {
      id: 'person-01',
      caseId: 'case-100',
      category: 'ENTITY',
      type: 'PERSON',
      label: 'Rahul Kumar',
      properties: { role: 'DBA' }
    };
    const res = validateNode(node);
    assert.strictEqual(res.valid, true);
    assert.strictEqual(res.errors.length, 0);
  });

  it('should reject a node with missing or invalid category', () => {
    const node: any = {
      id: 'invalid-node',
      caseId: 'case-100',
      category: 'FOOBAR',
      type: 'PERSON',
      label: 'Test'
    };
    const res = validateNode(node);
    assert.strictEqual(res.valid, false);
    assert.ok(res.errors.some(e => e.code === 'INVALID_CATEGORY'));
  });

  it('should reject an entity node with unknown entity type', () => {
    const node: Partial<GraphNode> = {
      id: 'bad-entity',
      caseId: 'case-100',
      category: 'ENTITY',
      type: 'SPACESHIP' as any,
      label: 'Apollo'
    };
    const res = validateNode(node);
    assert.strictEqual(res.valid, false);
    assert.ok(res.errors.some(e => e.code === 'INVALID_ENTITY_TYPE'));
  });

  it('should reject an evidence node with invalid reliability', () => {
    const node: Partial<GraphNode> = {
      id: 'bad-ev',
      caseId: 'case-100',
      category: 'EVIDENCE',
      type: 'LOG',
      label: 'Bad Log',
      source: { name: 'syslog', kind: 'SYSTEM' },
      reliability: 1.5 // Out of bounds 0..1
    };
    const res = validateNode(node);
    assert.strictEqual(res.valid, false);
    assert.ok(res.errors.some(e => e.code === 'INVALID_RELIABILITY'));
  });

  it('should validate relationship direction rules correctly', () => {
    // Valid: PERSON (ENTITY) -> PERFORMED -> LOGIN (EVENT)
    const validRel = validateRelationshipDirection('ENTITY', 'EVENT', 'PERFORMED');
    assert.strictEqual(validRel.valid, true);

    // Invalid: LOGIN (EVENT) -> PERFORMED -> PERSON (ENTITY)
    const invalidRel = validateRelationshipDirection('EVENT', 'ENTITY', 'PERFORMED');
    assert.strictEqual(invalidRel.valid, false);
    assert.ok(invalidRel.error?.includes("Invalid relationship direction for 'PERFORMED'"));

    // Valid: EVENT -> TARGETED -> ENTITY
    const validTargeted = validateRelationshipDirection('EVENT', 'ENTITY', 'TARGETED');
    assert.strictEqual(validTargeted.valid, true);

    // Invalid: ENTITY -> TARGETED -> EVENT
    const invalidTargeted = validateRelationshipDirection('ENTITY', 'EVENT', 'TARGETED');
    assert.strictEqual(invalidTargeted.valid, false);
  });
});

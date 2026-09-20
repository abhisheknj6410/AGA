import { describe, it } from 'node:test';
import assert from 'node:assert';
import { evaluateEntitySimilarity } from '../domain/entity-resolution.js';
import { GraphNode } from '../domain/types.js';

describe('Safe Entity Resolution Engine', () => {
  it('should detect EXACT_MATCH on identical label and type', () => {
    const nodeA: GraphNode = {
      id: 'p1',
      caseId: 'c1',
      category: 'ENTITY',
      type: 'PERSON',
      label: 'Rahul Kumar',
      properties: {},
      metadata: {},
      createdAt: '',
      updatedAt: ''
    };
    const nodeB: GraphNode = {
      id: 'p2',
      caseId: 'c1',
      category: 'ENTITY',
      type: 'PERSON',
      label: 'Rahul Kumar',
      properties: {},
      metadata: {},
      createdAt: '',
      updatedAt: ''
    };

    const res = evaluateEntitySimilarity(nodeA, nodeB);
    assert.strictEqual(res.matchType, 'EXACT_MATCH');
    assert.strictEqual(res.similarityScore, 1.0);
  });

  it('should detect EXACT_MATCH on shared external identifier even with varying label', () => {
    const nodeA: GraphNode = {
      id: 'p1',
      caseId: 'c1',
      category: 'ENTITY',
      type: 'PERSON',
      label: 'Rahul Kumar',
      properties: { externalIdentifiers: ['EMP-1092', 'PASSPORT-X99'] },
      metadata: {},
      createdAt: '',
      updatedAt: ''
    };
    const nodeB: GraphNode = {
      id: 'p2',
      caseId: 'c1',
      category: 'ENTITY',
      type: 'PERSON',
      label: 'R. Kumar (Contractor)',
      properties: { externalIdentifiers: ['EMP-1092'] },
      metadata: {},
      createdAt: '',
      updatedAt: ''
    };

    const res = evaluateEntitySimilarity(nodeA, nodeB);
    assert.strictEqual(res.matchType, 'EXACT_MATCH');
    assert.ok(res.reason.includes('Shared external identifier'));
  });

  it('should detect POSSIBLE_MATCH on nickname/initial variation for human review', () => {
    const nodeA: GraphNode = {
      id: 'p1',
      caseId: 'c1',
      category: 'ENTITY',
      type: 'PERSON',
      label: 'Rahul Kumar',
      properties: {},
      metadata: {},
      createdAt: '',
      updatedAt: ''
    };
    const nodeB: GraphNode = {
      id: 'p2',
      caseId: 'c1',
      category: 'ENTITY',
      type: 'PERSON',
      label: 'R. Kumar',
      properties: {},
      metadata: {},
      createdAt: '',
      updatedAt: ''
    };

    const res = evaluateEntitySimilarity(nodeA, nodeB);
    assert.strictEqual(res.matchType, 'POSSIBLE_MATCH');
    assert.ok(res.similarityScore >= 0.75);
    assert.ok(res.reason.includes('human investigator review'));
  });

  it('should return NO_MATCH for completely dissimilar entities', () => {
    const nodeA: GraphNode = {
      id: 'p1',
      caseId: 'c1',
      category: 'ENTITY',
      type: 'PERSON',
      label: 'Rahul Kumar',
      properties: {},
      metadata: {},
      createdAt: '',
      updatedAt: ''
    };
    const nodeB: GraphNode = {
      id: 'p3',
      caseId: 'c1',
      category: 'ENTITY',
      type: 'PERSON',
      label: 'Alex Chen',
      properties: {},
      metadata: {},
      createdAt: '',
      updatedAt: ''
    };

    const res = evaluateEntitySimilarity(nodeA, nodeB);
    assert.strictEqual(res.matchType, 'NO_MATCH');
  });
});

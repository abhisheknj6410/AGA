import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { runMigrations } from '../infrastructure/migrations.js';
import { PossibilityRepository } from '../infrastructure/repositories/possibility-repository.js';
import { AlgorithmRepository } from '../infrastructure/repositories/algorithm-repository.js';
import { GraphAnalysisEngine } from '../application/graph-analysis-engine.js';
import { PossibilityEngine } from '../application/possibility-engine.js';
import { GraphPayload, ResolutionCandidate } from '../domain/types.js';

describe('Possibility Engine & Possibility Space Analysis', () => {
  const db = new DatabaseSync(':memory:');
  runMigrations(db);

  db.exec(`INSERT INTO cases (id, name, description, status, created_at, updated_at) VALUES ('case-1', 'Test Case', '', 'ACTIVE', datetime('now'), datetime('now'))`);

  const possibilityRepo = new PossibilityRepository(db);
  const algorithmRepo = new AlgorithmRepository(db);
  const analysisEngine = new GraphAnalysisEngine(algorithmRepo);
  const possibilityEngine = new PossibilityEngine(possibilityRepo, analysisEngine);

  const mockGraph: GraphPayload = {
    nodes: [
      { id: 'p1', caseId: 'case-1', category: 'ENTITY', type: 'PERSON', label: 'Suspect Rahul', properties: {}, metadata: {}, createdAt: '', updatedAt: '' },
      { id: 'p2', caseId: 'case-1', category: 'ENTITY', type: 'PERSON', label: 'R. Kumar', properties: {}, metadata: {}, createdAt: '', updatedAt: '' },
      { id: 'acc1', caseId: 'case-1', category: 'ENTITY', type: 'ACCOUNT', label: 'rahul-adm', properties: {}, metadata: {}, createdAt: '', updatedAt: '' },
      { id: 'srv1', caseId: 'case-1', category: 'ENTITY', type: 'SERVER', label: 'Prod-DB-01', properties: {}, metadata: {}, createdAt: '', updatedAt: '' },
      { id: 'ev_cctv', caseId: 'case-1', category: 'EVIDENCE', type: 'CCTV', label: 'Cafeteria CCTV', properties: {}, metadata: {}, createdAt: '', updatedAt: '' }
    ],
    edges: [
      { id: 'e1', caseId: 'case-1', source: 'p1', target: 'acc1', type: 'USES', status: 'OBSERVED', cost: 1, confidence: 1, evidenceRefs: [], properties: {}, createdAt: '', updatedAt: '' },
      { id: 'e2', caseId: 'case-1', source: 'acc1', target: 'srv1', type: 'CONNECTED_TO', status: 'OBSERVED', cost: 1, confidence: 1, evidenceRefs: [], properties: {}, createdAt: '', updatedAt: '' },
      // Contradiction: CCTV contradicts suspect Rahul
      { id: 'e_contra', caseId: 'case-1', source: 'ev_cctv', target: 'p1', type: 'CONTRADICTS', status: 'OBSERVED', cost: 1, confidence: 1, evidenceRefs: [], properties: {}, createdAt: '', updatedAt: '' }
    ],
    metadata: {
      caseId: 'case-1',
      nodeCount: 5,
      edgeCount: 3,
      entityCount: 4,
      eventCount: 0,
      evidenceCount: 1,
      generatedAt: ''
    }
  };

  const candidates: ResolutionCandidate[] = [
    {
      id: 'rc-1',
      caseId: 'case-1',
      sourceNodeId: 'p1',
      targetNodeId: 'p2',
      matchType: 'POSSIBLE_MATCH',
      similarityScore: 0.85,
      reason: 'Name initial variation',
      status: 'PENDING',
      createdAt: ''
    }
  ];

  test('should generate bounded possibilities across alternative corridors, entity resolution, and contradictions', () => {
    const res = possibilityEngine.generatePossibilities('case-1', mockGraph, candidates, { maxPossibilities: 10 });
    assert.ok(res.generatedCount >= 2);
    assert.ok(res.possibilities.length >= 2);

    // Verify entity resolution branching occurred
    const erBranches = res.possibilities.filter(p => p.generationMethod === 'ENTITY_RESOLUTION');
    assert.equal(erBranches.length, 2); // 1 merged, 1 distinct

    // Verify contradiction branching occurred
    const contraBranches = res.possibilities.filter(p => p.generationMethod === 'CONTRADICTION_BRANCHING');
    assert.equal(contraBranches.length, 2); // 1 spoofed credentials, 1 direct conflict
  });

  test('should deduplicate possibilities using canonical signatures on re-generation', () => {
    const initialCount = possibilityRepo.findByCaseId('case-1').length;
    // Run generation again
    const res = possibilityEngine.generatePossibilities('case-1', mockGraph, candidates, { maxPossibilities: 10 });
    const afterCount = possibilityRepo.findByCaseId('case-1').length;

    // Should not re-insert duplicates
    assert.equal(afterCount, initialCount);
  });

  test('should compare possibilities side-by-side producing deterministic comparison matrix', () => {
    const list = possibilityRepo.findByCaseId('case-1');
    const ids = list.slice(0, 3).map(p => p.id);

    const comp = possibilityEngine.comparePossibilities('case-1', ids, mockGraph);
    assert.equal(comp.possibilities.length, 3);
    assert.ok(Array.isArray(comp.structuralDiff.commonNodes));
    assert.ok(comp.structuralDiff.commonNodes.length > 0);
  });
});

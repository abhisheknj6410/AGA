import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { runMigrations } from '../infrastructure/migrations.js';
import { PossibilityRepository } from '../infrastructure/repositories/possibility-repository.js';
import { AlgorithmRepository } from '../infrastructure/repositories/algorithm-repository.js';
import { GraphAnalysisEngine } from '../application/graph-analysis-engine.js';
import { PossibilityEngine } from '../application/possibility-engine.js';
import { InvestigationAgentService } from '../application/investigation-agent-service.js';
import { GraphPayload } from '../domain/types.js';

describe('Investigation Agent Deterministic Query Layer', () => {
  const db = new DatabaseSync(':memory:');
  runMigrations(db);

  db.exec(`INSERT INTO cases (id, name, description, status, created_at, updated_at) VALUES ('case-agent', 'Agent Case', '', 'ACTIVE', datetime('now'), datetime('now'))`);

  const possibilityRepo = new PossibilityRepository(db);
  const algorithmRepo = new AlgorithmRepository(db);
  const analysisEngine = new GraphAnalysisEngine(algorithmRepo);
  const possibilityEngine = new PossibilityEngine(possibilityRepo, analysisEngine);
  const agentService = new InvestigationAgentService(possibilityRepo, analysisEngine, possibilityEngine);

  const mockGraph: GraphPayload = {
    nodes: [
      { id: 'actor', caseId: 'case-agent', category: 'ENTITY', type: 'PERSON', label: 'Rahul', properties: {}, metadata: {}, createdAt: '', updatedAt: '' },
      { id: 'jumpbox', caseId: 'case-agent', category: 'ENTITY', type: 'SERVER', label: 'Bastion', properties: {}, metadata: {}, createdAt: '', updatedAt: '' },
      { id: 'target_db', caseId: 'case-agent', category: 'ENTITY', type: 'SERVER', label: 'DB01', properties: {}, metadata: {}, createdAt: '', updatedAt: '' }
    ],
    edges: [
      { id: 'e1', caseId: 'case-agent', source: 'actor', target: 'jumpbox', type: 'CONNECTED_TO', status: 'OBSERVED', cost: 1, confidence: 1, evidenceRefs: [], properties: {}, createdAt: '', updatedAt: '' },
      { id: 'e2', caseId: 'case-agent', source: 'jumpbox', target: 'target_db', type: 'CONNECTED_TO', status: 'OBSERVED', cost: 1, confidence: 1, evidenceRefs: [], properties: {}, createdAt: '', updatedAt: '' }
    ],
    metadata: {
      caseId: 'case-agent',
      nodeCount: 3,
      edgeCount: 2,
      entityCount: 3,
      eventCount: 0,
      evidenceCount: 0,
      generatedAt: ''
    }
  };

  // Pre-seed possibilities
  possibilityEngine.generatePossibilities('case-agent', mockGraph, [], {});

  test('Agent: handles connection path queries deterministically', async () => {
    const res = await agentService.processQuery('case-agent', mockGraph, 'How does Rahul connect to DB01?');
    assert.equal(res.intent, 'FIND_PATHS_AND_CORRIDORS');
    assert.ok(res.factualAnswer.includes('Bastion'));
    assert.ok(res.algorithmUsed?.includes('K_SHORTEST_PATHS'));
  });

  test('Agent: handles bottleneck & critical node inquiries', async () => {
    const res = await agentService.processQuery('case-agent', mockGraph, 'Which nodes are critical bottlenecks?');
    assert.equal(res.intent, 'STRUCTURAL_BOTTLENECK_ANALYSIS');
    assert.ok(res.factualAnswer.includes('Bastion'));
  });

  test('Agent: handles possibility provenance inquiries', async () => {
    const res = await agentService.processQuery('case-agent', mockGraph, 'Why does possibility exist?');
    assert.equal(res.intent, 'POSSIBILITY_PROVENANCE');
    assert.ok(res.factualAnswer.includes('deterministically generated via method'));
  });

  test('Agent: handles temporal validity questions', async () => {
    const res = await agentService.processQuery('case-agent', mockGraph, 'Which possibilities are temporally invalid?');
    assert.equal(res.intent, 'TEMPORAL_VALIDITY_FILTER');
    assert.ok(res.factualAnswer.length > 0);
  });
});

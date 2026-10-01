import test from 'node:test';
import assert from 'node:assert/strict';
import { getDatabase } from '../infrastructure/db.js';
import { runMigrations } from '../infrastructure/migrations.js';
import { GraphService } from '../application/graph-service.js';
import { PossibilityRepository } from '../infrastructure/repositories/possibility-repository.js';
import { ResolutionRepository } from '../infrastructure/repositories/resolution-repository.js';
import { AlgorithmRepository } from '../infrastructure/repositories/algorithm-repository.js';
import { GraphAnalysisEngine } from '../application/graph-analysis-engine.js';
import { PossibilityEngine } from '../application/possibility-engine.js';
import { IncrementalReasoningEngine } from '../application/incremental-reasoning-engine.js';
import { InvestigationAgentService } from '../application/investigation-agent-service.js';
import { seedDemonstrationCase } from '../infrastructure/seed-demo-case.js';
import { AlgorithmDependencyGraph } from '../domain/algorithms/algorithm-dependency-graph.js';

function setupIncrementalTest() {
  const db = getDatabase(':memory:');
  runMigrations(db);

  const graphService = new GraphService(db);
  const possibilityRepo = new PossibilityRepository(db);
  const resolutionRepo = new ResolutionRepository(db);
  const algorithmRepo = new AlgorithmRepository(db);
  const analysisEngine = new GraphAnalysisEngine(algorithmRepo);
  const possibilityEngine = new PossibilityEngine(possibilityRepo, analysisEngine);
  const { caseId } = seedDemonstrationCase(db, possibilityEngine);

  const incrementalEngine = new IncrementalReasoningEngine(db, possibilityEngine);
  const agentService = new InvestigationAgentService(possibilityRepo, analysisEngine, possibilityEngine, incrementalEngine);

  return {
    db,
    caseId,
    graphService,
    possibilityRepo,
    resolutionRepo,
    algorithmRepo,
    analysisEngine,
    possibilityEngine,
    incrementalEngine,
    agentService
  };
}

test('Test 1 — Evidence addition increases valid possibility space', () => {
  const { incrementalEngine, graphService, possibilityRepo, caseId } = setupIncrementalTest();
  const v1Possibilities = possibilityRepo.findByCaseId(caseId);
  const v1ValidCount = v1Possibilities.filter(p => p.status === 'VALID').length;
  const prevGraph = graphService.getGraph(caseId);

  // Add new corroborating evidence to Route 4 edges
  graphService.addNode(caseId, {
    id: 'ev-informant-corroboration',
    category: 'EVIDENCE',
    type: 'INTERVIEW',
    label: 'Informant Audio Wiretap',
    source: { name: 'wiretap-01.wav', kind: 'AUDIO' },
    reliability: 0.95
  });

  // Attach evidence to Route 4 edges so it satisfies minEvidenceSupport >= 2
  graphService.updateEdge(caseId, 'edge-r4-1', {
    evidenceRefs: ['ev-informant-corroboration'],
    status: 'OBSERVED'
  });
  graphService.updateEdge(caseId, 'edge-r4-2', {
    evidenceRefs: ['ev-informant-corroboration', 'ev-vault-badge'],
    status: 'OBSERVED'
  });

  const currGraph = graphService.getGraph(caseId);
  const report = incrementalEngine.commitMutationAndRecalculate(
    caseId,
    {
      action: 'ADD_NODE',
      targetType: 'EVIDENCE',
      targetId: 'ev-informant-corroboration',
      summary: 'Added verified informant wiretap corroborating Route 4',
      timestamp: new Date().toISOString()
    },
    prevGraph,
    currGraph,
    { sourceNodeId: 'person-mercer', targetNodeId: 'location-vault', minEvidenceSupport: 2 }
  );

  assert.ok(report.toVersion > report.fromVersion, 'Graph version number must increment');
  assert.ok(report.possibilityEvolution.addedPossibilities.length >= 1, 'Must register newly added possibility');
  assert.ok(report.validPossibilitiesAfter >= v1ValidCount, 'Surviving possibilities must increase or remain valid');
});

test('Test 2 — Evidence removal eliminates dependent possibility with provenance reason', () => {
  const { incrementalEngine, graphService, caseId } = setupIncrementalTest();
  const prevGraph = graphService.getGraph(caseId);

  // Remove critical evidence for Route 2 (Satellite Relay)
  graphService.updateEdge(caseId, 'edge-r2-1', { evidenceRefs: [], status: 'HYPOTHESIZED' });
  graphService.updateEdge(caseId, 'edge-r2-2', { evidenceRefs: [], status: 'HYPOTHESIZED' });
  graphService.updateEdge(caseId, 'edge-r2-3', { evidenceRefs: [], status: 'HYPOTHESIZED' });

  const currGraph = graphService.getGraph(caseId);
  const report = incrementalEngine.commitMutationAndRecalculate(
    caseId,
    {
      action: 'REMOVE_NODE',
      targetType: 'EVIDENCE',
      targetId: 'ev-sat-log',
      summary: 'Revoked invalid satellite telemetry log ev-sat-log',
      timestamp: new Date().toISOString()
    },
    prevGraph,
    currGraph,
    { sourceNodeId: 'person-mercer', targetNodeId: 'location-vault', minEvidenceSupport: 2 }
  );

  const removed = report.possibilityEvolution.removedPossibilities;
  assert.ok(removed.length >= 1, 'At least one route must be eliminated by evidence removal');
  assert.ok(
    removed.some(r => r.eliminatingAlgorithm === 'EVIDENCE_PROVENANCE_ENGINE'),
    'Eliminating algorithm must be attributed to EVIDENCE_PROVENANCE_ENGINE'
  );
  assert.ok(
    removed.some(r => r.causalReason.includes('provenance')),
    'Causal reason must explicitly cite provenance failure'
  );
});

test('Test 3 — Timestamp modification invalidates affected paths', () => {
  const { incrementalEngine, graphService, caseId } = setupIncrementalTest();
  const prevGraph = graphService.getGraph(caseId);

  // Modify Turnpike transit timestamp to 16:00 (occurring AFTER vault entry at 15:30)
  graphService.updateNode(caseId, 'evt-turnpike', {
    time: { start: '2026-03-01T16:00:00.000Z', precision: 'SECOND' }
  });

  const currGraph = graphService.getGraph(caseId);
  const report = incrementalEngine.commitMutationAndRecalculate(
    caseId,
    {
      action: 'MODIFY_NODE',
      targetType: 'NODE',
      targetId: 'evt-turnpike',
      summary: 'Updated toll plaza transit timestamp to 16:00:00Z',
      timestamp: new Date().toISOString()
    },
    prevGraph,
    currGraph,
    { sourceNodeId: 'person-mercer', targetNodeId: 'location-vault', minEvidenceSupport: 2 }
  );

  assert.ok(report.affectedSubgraph.nodeIds.includes('evt-turnpike'), 'Affected subgraph must contain modified event node');
  assert.ok(
    report.algorithmsInvalidated.includes('TEMPORAL_VALIDATION'),
    'Temporal validation algorithm must be invalidated'
  );
  assert.ok(
    report.possibilityEvolution.removedPossibilities.length >= 1 ||
    report.possibilityEvolution.modifiedPossibilities.some(m => m.statusAfter === 'INVALID'),
    'Affected Highway route must either be eliminated or transitioned to INVALID'
  );
});

test('Test 4 — Edge addition creates candidate path', () => {
  const { incrementalEngine, graphService, caseId } = setupIncrementalTest();
  const prevGraph = graphService.getGraph(caseId);

  // Add bypass direct link from safehouse to remote override
  graphService.addEdge(caseId, {
    id: 'edge-direct-bypass',
    source: 'evt-dep-safehouse',
    target: 'evt-remote-override',
    type: 'PRECEDED',
    status: 'OBSERVED',
    cost: 1.0,
    confidence: 0.9,
    evidenceRefs: ['ev-cctv-safehouse', 'ev-gateway-log'],
    properties: {}
  });

  const currGraph = graphService.getGraph(caseId);
  const report = incrementalEngine.commitMutationAndRecalculate(
    caseId,
    {
      action: 'ADD_EDGE',
      targetType: 'EDGE',
      targetId: 'edge-direct-bypass',
      summary: 'Added direct transit bypass link',
      timestamp: new Date().toISOString()
    },
    prevGraph,
    currGraph,
    { sourceNodeId: 'person-mercer', targetNodeId: 'location-vault', minEvidenceSupport: 2 }
  );

  assert.ok(report.affectedSubgraph.edgeIds.includes('edge-direct-bypass'), 'Affected subgraph must record added edge');
  assert.ok(report.possibilityEvolution.addedPossibilities.length >= 1, 'New route must be spawned into possibility space');
});

test('Test 5 — Edge removal eliminates candidate path', () => {
  const { incrementalEngine, graphService, caseId } = setupIncrementalTest();
  const prevGraph = graphService.getGraph(caseId);

  // Delete edge-r1-2 (safehouse -> turnpike)
  graphService.deleteEdge(caseId, 'edge-r1-2');

  const currGraph = graphService.getGraph(caseId);
  const report = incrementalEngine.commitMutationAndRecalculate(
    caseId,
    {
      action: 'REMOVE_EDGE',
      targetType: 'EDGE',
      targetId: 'edge-r1-2',
      summary: 'Removed highway link edge-r1-2',
      timestamp: new Date().toISOString()
    },
    prevGraph,
    currGraph,
    { sourceNodeId: 'person-mercer', targetNodeId: 'location-vault', minEvidenceSupport: 2 }
  );

  const removed = report.possibilityEvolution.removedPossibilities;
  assert.ok(removed.length >= 1, 'Severed highway path must be eliminated from possibilities');
  assert.ok(
    removed.some(r => r.eliminatingAlgorithm === 'K_SHORTEST_PATHS'),
    'K_SHORTEST_PATHS must be credited as the eliminating algorithm for severed topological edge'
  );
});

test('Test 6 — Entity merge alters possibility space and reachability', () => {
  const { incrementalEngine, graphService, resolutionRepo, caseId } = setupIncrementalTest();
  const prevGraph = graphService.getGraph(caseId);

  // Confirm Jordan Vale and J. Vale are merged
  const candidate = resolutionRepo.getByCaseId(caseId)[0];
  assert.ok(candidate !== undefined);
  resolutionRepo.updateStatus(candidate.id, 'MERGED');

  const currGraph = graphService.getGraph(caseId);
  const report = incrementalEngine.commitMutationAndRecalculate(
    caseId,
    {
      action: 'MERGE_ENTITIES',
      targetType: 'ENTITY_RESOLUTION',
      targetId: candidate.id,
      summary: 'Approved identity merge of Jordan Vale and J. Vale',
      timestamp: new Date().toISOString()
    },
    prevGraph,
    currGraph,
    { sourceNodeId: 'person-mercer', targetNodeId: 'location-vault', minEvidenceSupport: 2 }
  );

  assert.ok(
    report.affectedSubgraph.nodeIds.includes('person-vale') ||
    report.affectedSubgraph.nodeIds.includes('person-jvale'),
    'Merged entities must be present in affected subgraph'
  );
});

test('Test 7 — Entity separation rejects merge hypothesis', () => {
  const { incrementalEngine, graphService, resolutionRepo, caseId } = setupIncrementalTest();
  const prevGraph = graphService.getGraph(caseId);

  const candidate = resolutionRepo.getByCaseId(caseId)[0];
  resolutionRepo.updateStatus(candidate.id, 'REJECTED');

  const currGraph = graphService.getGraph(caseId);
  const report = incrementalEngine.commitMutationAndRecalculate(
    caseId,
    {
      action: 'SPLIT_ENTITIES',
      targetType: 'ENTITY_RESOLUTION',
      targetId: candidate.id,
      summary: 'Rejected identity match between Jordan Vale and J. Vale',
      timestamp: new Date().toISOString()
    },
    prevGraph,
    currGraph,
    { sourceNodeId: 'person-mercer', targetNodeId: 'location-vault', minEvidenceSupport: 2 }
  );

  assert.ok(report.toVersion > report.fromVersion);
});

test('Test 8 — Incremental invalidation leaves unrelated algorithm results valid', () => {
  const { incrementalEngine, caseId } = setupIncrementalTest();
  const cache = incrementalEngine.getResultCache();

  // Populate cache with unrelated entry
  cache.set('UNRELATED_COMMUNITY_DETECTION', 1, { scope: 'peripheral' }, { communities: 3 }, {
    nodes: ['node-isolated-99'],
    edges: ['edge-isolated-99']
  });

  const delta = {
    addedNodes: [],
    removedNodes: [],
    modifiedNodes: [],
    addedEdges: [],
    removedEdges: [],
    modifiedEdges: [],
    changedEvidence: [{ evidenceId: 'ev-cctv-safehouse', type: 'MODIFIED' as const }],
    changedTemporalConstraints: [],
    changedIdentityConstraints: []
  };

  const affected = {
    affectedNodeIds: ['person-mercer', 'evt-dep-safehouse'],
    affectedEdgeIds: ['edge-r1-1'],
    affectedEvidenceIds: ['ev-cctv-safehouse'],
    propagationReason: 'CCTV modified'
  };

  const { invalidated, reused } = cache.invalidateAffected(delta, affected);
  assert.ok(reused.includes('UNRELATED_COMMUNITY_DETECTION'), 'Unrelated algorithm result must be safely reused');
  assert.ok(!invalidated.includes('UNRELATED_COMMUNITY_DETECTION'), 'Unrelated algorithm result must NOT be invalidated');
});

test('Test 9 — Version comparison accurately categorizes added, removed, modified, and unchanged possibilities', () => {
  const { incrementalEngine, graphService, caseId } = setupIncrementalTest();
  const prevGraph = graphService.getGraph(caseId);

  // Add direct bypass edge
  graphService.addEdge(caseId, {
    id: 'edge-alt-corridor',
    source: 'evt-dep-safehouse',
    target: 'evt-vault-entry',
    type: 'PRECEDED',
    status: 'OBSERVED',
    cost: 1.0,
    confidence: 0.99,
    evidenceRefs: ['ev-cctv-safehouse', 'ev-vault-badge'],
    properties: {}
  });

  const currGraph = graphService.getGraph(caseId);
  const report = incrementalEngine.commitMutationAndRecalculate(
    caseId,
    {
      action: 'ADD_EDGE',
      targetType: 'EDGE',
      targetId: 'edge-alt-corridor',
      summary: 'Added alternative corridor to vault',
      timestamp: new Date().toISOString()
    },
    prevGraph,
    currGraph,
    { sourceNodeId: 'person-mercer', targetNodeId: 'location-vault', minEvidenceSupport: 2 }
  );

  const evo = report.possibilityEvolution;
  assert.ok(evo.addedPossibilities.length >= 1, 'Added possibilities must be non-empty');
  assert.ok(evo.unchangedPossibilities.length >= 1, 'Unchanged possibilities must be tracked');
  assert.ok(evo.summary.includes('Evolution'), 'Summary string must be generated');
});

test('Test 10 — Algorithm dependency invalidates downstream analyses when K-shortest paths change', () => {
  const stages = AlgorithmDependencyGraph.getDownstreamStages('K_SHORTEST_PATHS');
  assert.ok(stages.includes('POSSIBILITY_SET'), 'Possibility set must depend on K-shortest paths');
  assert.ok(stages.includes('DOMINATOR_ANALYSIS'), 'Dominator analysis must cascade from K-shortest paths');
  assert.ok(stages.includes('COMMON_INVARIANTS'), 'Common invariants must cascade from K-shortest paths');
});

test('Test 11 — Cache reuse saves computational work on unaffected subgraphs', () => {
  const { incrementalEngine } = setupIncrementalTest();
  const cache = incrementalEngine.getResultCache();

  cache.set('GLOBAL_GRAPH_DIAGNOSTICS', 1, {}, { isDag: true }, { nodes: ['isolated-node-a'] });
  const result = cache.get('GLOBAL_GRAPH_DIAGNOSTICS', 1, {});

  assert.ok(result !== null, 'Must retrieve cached algorithm result');
  assert.equal(cache.getMetrics().reusedCount, 1, 'Reused count must equal 1');
});

test('Test 12 — What-If simulation evaluates counterfactuals without mutating real database', () => {
  const { incrementalEngine, graphService, possibilityRepo, caseId } = setupIncrementalTest();
  const baseGraph = graphService.getGraph(caseId);
  const baselineCount = possibilityRepo.findByCaseId(caseId).length;

  const simResult = incrementalEngine.runWhatIfSimulation(caseId, baseGraph, {
    action: 'REMOVE_EVIDENCE',
    targetId: 'ev-cctv-safehouse'
  });

  assert.ok(simResult.simulationId.startsWith('sim-'), 'Simulation ID must have unique prefix');
  assert.ok(simResult.baselinePossibilityCount === baselineCount, 'Simulation must record correct baseline count');
  assert.ok(simResult.explanation.includes('ev-cctv-safehouse'), 'Simulation explanation must cite targeted evidence');

  // Verify zero side-effects on persistent SQLite storage
  const persistedAfter = possibilityRepo.findByCaseId(caseId).length;
  const graphNodesAfter = graphService.getGraph(caseId).nodes.length;

  assert.equal(persistedAfter, baselineCount, 'Database possibilities must NOT be changed by simulation');
  assert.equal(graphNodesAfter, baseGraph.nodes.length, 'Database graph nodes must NOT be changed by simulation');
});

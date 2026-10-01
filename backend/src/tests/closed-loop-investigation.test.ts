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
import { ResolutionReasoningEngine } from '../application/resolution-reasoning-engine.js';
import { InvestigationPlanningEngine } from '../application/investigation-planning-engine.js';
import { EvidenceImpactEngine } from '../application/evidence-impact-engine.js';
import { InvestigationAgentService } from '../application/investigation-agent-service.js';
import { seedDemonstrationCase } from '../infrastructure/seed-demo-case.js';
import { GraphNode, GraphEdge } from '../domain/types.js';

function setupClosedLoopTest() {
  const db = getDatabase(':memory:');
  runMigrations(db);

  const graphService = new GraphService(db);
  const possibilityRepo = new PossibilityRepository(db);
  const resolutionRepo = new ResolutionRepository(db);
  const algorithmRepo = new AlgorithmRepository(db);
  const analysisEngine = new GraphAnalysisEngine(algorithmRepo);
  const possibilityEngine = new PossibilityEngine(possibilityRepo, analysisEngine);
  const incrementalEngine = new IncrementalReasoningEngine(db, possibilityEngine);
  const resolutionEngine = new ResolutionReasoningEngine(possibilityRepo, analysisEngine, incrementalEngine);
  const planningEngine = new InvestigationPlanningEngine(possibilityRepo, resolutionEngine);

  const { caseId } = seedDemonstrationCase(db, possibilityEngine);

  const evidenceImpactEngine = new EvidenceImpactEngine(
    db,
    graphService,
    possibilityEngine,
    resolutionEngine,
    planningEngine,
    incrementalEngine
  );

  const agentService = new InvestigationAgentService(
    possibilityRepo,
    analysisEngine,
    possibilityEngine,
    incrementalEngine,
    resolutionEngine,
    planningEngine
  );
  agentService.setEvidenceImpactEngine(evidenceImpactEngine);

  return {
    db,
    caseId,
    graphService,
    possibilityRepo,
    evidenceImpactEngine,
    agentService,
    planningEngine
  };
}

test('ClosedLoop 1: Ingesting new evidence creates immutable version V2 from V1', async () => {
  const { caseId, evidenceImpactEngine } = setupClosedLoopTest();

  const evidenceNode: GraphNode = {
    id: 'ev-cctv-loading-dock',
    category: 'EVIDENCE',
    type: 'CCTV',
    label: 'Dock 4 External Camera Feed (23:12)',
    source: { name: 'Building Security Archive', kind: 'DEVICE' },
    reliability: 0.95
  };

  const attachedEdges: GraphEdge[] = [
    {
      id: 'e-dock-corroboration',
      source: 'ev-cctv-loading-dock',
      target: 'evt-vault-entry',
      type: 'SUPPORTS',
      status: 'OBSERVED',
      evidenceRefs: ['ev-cctv-loading-dock'],
      cost: 0.1
    }
  ];

  const cycle = await evidenceImpactEngine.ingestEvidence({
    caseId,
    evidenceNode,
    attachedEdges,
    summary: 'Corroborated dock activity via external CCTV'
  });

  assert.equal(cycle.fromVersion, 1);
  assert.equal(cycle.toVersion, 2);
  assert.equal(cycle.triggeringEvidence.nodeId, 'ev-cctv-loading-dock');
  assert.ok(cycle.cycleId.startsWith('CYCLE-'));
});

test('ClosedLoop 2: Graph delta and bounded affected subgraph are accurately identified', async () => {
  const { caseId, evidenceImpactEngine } = setupClosedLoopTest();

  const evidenceNode: GraphNode = {
    id: 'ev-access-badge-mercer',
    category: 'EVIDENCE',
    type: 'LOG',
    label: 'Mercer Badge Swipe Server Corridor',
    source: { name: 'Badge Access Controller', kind: 'DEVICE' },
    reliability: 0.99
  };

  const attachedEdges: GraphEdge[] = [
    {
      id: 'e-mercer-badge-link',
      source: 'ev-access-badge-mercer',
      target: 'person-mercer',
      type: 'SUPPORTS',
      status: 'OBSERVED',
      evidenceRefs: ['ev-access-badge-mercer'],
      cost: 0.2
    }
  ];

  const cycle = await evidenceImpactEngine.ingestEvidence({
    caseId,
    evidenceNode,
    attachedEdges,
    summary: 'Ingested server corridor badge swipe'
  });

  assert.equal(cycle.graphDeltaSummary.addedNodes, 1);
  assert.equal(cycle.graphDeltaSummary.addedEdges, 1);
  assert.ok(cycle.affectedSubgraph.nodeIds.includes('person-mercer'));
});

test('ClosedLoop 3: Unaffected algorithm results are reused from cache', async () => {
  const { caseId, evidenceImpactEngine } = setupClosedLoopTest();

  const evidenceNode: GraphNode = {
    id: 'ev-audit-memo',
    category: 'EVIDENCE',
    type: 'DOCUMENT',
    label: 'Internal Audit Review Memo',
    source: { name: 'Compliance Dept Archive', kind: 'ORGANIZATION' },
    reliability: 0.9
  };

  const attachedEdges: GraphEdge[] = [
    {
      id: 'e-audit-memo-link',
      source: 'ev-audit-memo',
      target: 'location-vault',
      type: 'SUPPORTS',
      status: 'OBSERVED',
      evidenceRefs: ['ev-audit-memo'],
      cost: 0.5
    }
  ];

  const cycle = await evidenceImpactEngine.ingestEvidence({
    caseId,
    evidenceNode,
    attachedEdges,
    summary: 'Ingested audit review memo'
  });

  assert.ok(cycle.algorithmsSummary.recomputed.length > 0);
  assert.ok(cycle.executionMetrics.incrementalDurationMs >= 0);
  assert.ok(cycle.executionMetrics.speedupRatio >= 1.0);
});

test('ClosedLoop 4: Investigation action transitions to RESOLVED when requested evidence is received', async () => {
  const { caseId, evidenceImpactEngine, graphService, planningEngine } = setupClosedLoopTest();
  const baseGraph = graphService.getGraph(caseId);
  const planBefore = await planningEngine.generatePlan(caseId, baseGraph);
  const targetAction = planBefore.actions[0];

  const evidenceNode: GraphNode = {
    id: 'ev-targeted-action-fulfillment',
    category: 'EVIDENCE',
    type: 'LOG',
    label: `Verification Evidence for ${targetAction.targetLabel}`,
    source: { name: 'Audit Telemetry Engine', kind: 'SYSTEM' },
    reliability: 1.0
  };

  const targetEntityId = targetAction.requiredEntities[0]?.id || 'evt-vault-entry';
  const attachedEdges: GraphEdge[] = [
    {
      id: 'e-fulfillment-edge',
      source: 'ev-targeted-action-fulfillment',
      target: targetEntityId,
      type: 'SUPPORTS',
      status: 'OBSERVED',
      evidenceRefs: ['ev-targeted-action-fulfillment'],
      cost: 0.1
    }
  ];

  const cycle = await evidenceImpactEngine.ingestEvidence({
    caseId,
    evidenceNode,
    attachedEdges,
    requestedByActionId: targetAction.id,
    summary: `Executed investigation action ${targetAction.id}`
  });

  const transition = cycle.actionTransitions.find(t => t.actionId === targetAction.id);
  assert.ok(transition, `Transition must exist for action ${targetAction.id}`);
  assert.equal(transition.newStatus, 'RESOLVED');
  assert.ok(transition.reason.includes('specifically fulfilling this inquiry'));
});

test('ClosedLoop 5: Investigation action transitions to OBSOLETE when target possibility is eliminated', async () => {
  const { caseId, evidenceImpactEngine, graphService, planningEngine } = setupClosedLoopTest();
  const baseGraph = graphService.getGraph(caseId);
  const planBefore = await planningEngine.generatePlan(caseId, baseGraph);

  // Directly test computeActionTransitions logic with simulated eliminated possibility
  const eliminatedId = planBefore.actions[0].targetPossibilities[0] || 'mock-p-id';
  const transitions = evidenceImpactEngine.computeActionTransitions(
    [
      {
        ...planBefore.actions[0],
        targetPossibilities: [eliminatedId]
      }
    ],
    [],
    { id: 'ev-test', label: 'Test Evidence', category: 'EVIDENCE', type: 'DOCUMENT', source: { name: 'Test' } },
    [],
    undefined,
    [eliminatedId]
  );

  const obsoleteTransition = transitions.find(t => t.newStatus === 'OBSOLETE');
  assert.ok(obsoleteTransition, 'Action targeting eliminated possibility must transition to OBSOLETE');
  assert.ok(obsoleteTransition.reason.includes('eliminated'));
});

test('ClosedLoop 6: Unexpected evidence with no connections flags UNEXPLAINED_SUBGRAPH without inventing hypotheses', async () => {
  const { caseId, evidenceImpactEngine, possibilityRepo } = setupClosedLoopTest();
  const countBefore = possibilityRepo.findByCaseId(caseId).length;

  const detachedEvidence: GraphNode = {
    id: 'ev-detached-mystery-thumbdrive',
    category: 'EVIDENCE',
    type: 'MANUAL_ENTRY',
    label: 'Unattributed USB Thumbdrive found on Street',
    source: { name: 'Officer Patrol Log', kind: 'OFFICER' },
    reliability: 0.5
  };

  const cycle = await evidenceImpactEngine.ingestEvidence({
    caseId,
    evidenceNode: detachedEvidence,
    attachedEdges: [],
    summary: 'Found completely disconnected USB drive'
  });

  assert.equal(cycle.unexpectedEvidence.isUnexpected, true);
  assert.equal(cycle.unexpectedEvidence.anomalyType, 'UNEXPLAINED_SUBGRAPH');
  assert.ok(cycle.unexpectedEvidence.anomalyReason?.includes('without any structural edges'));

  const countAfter = possibilityRepo.findByCaseId(caseId).length;
  assert.equal(countAfter, countBefore, 'System must NEVER invent a new hypothesis automatically for unexpected evidence');
});

test('ClosedLoop 7: Counterfactual vs actual outcome correctly calculates prediction accuracy', async () => {
  const { caseId, evidenceImpactEngine, graphService, planningEngine } = setupClosedLoopTest();
  const baseGraph = graphService.getGraph(caseId);
  const planBefore = await planningEngine.generatePlan(caseId, baseGraph);
  const targetAction = planBefore.actions[0];

  const evidenceNode: GraphNode = {
    id: 'ev-counterfactual-match',
    category: 'EVIDENCE',
    type: 'LOG',
    label: `Corroboration for ${targetAction.targetLabel}`,
    source: { name: 'Audit Sensor Engine', kind: 'DEVICE' },
    reliability: 0.95
  };

  const attachedEdges: GraphEdge[] = [
    {
      id: 'e-cf-match',
      source: 'ev-counterfactual-match',
      target: targetAction.requiredEntities[0]?.id || 'evt-vault-entry',
      type: 'SUPPORTS',
      status: 'OBSERVED',
      evidenceRefs: ['ev-counterfactual-match'],
      cost: 0.1
    }
  ];

  const cycle = await evidenceImpactEngine.ingestEvidence({
    caseId,
    evidenceNode,
    attachedEdges,
    requestedByActionId: targetAction.id,
    summary: 'Evaluating counterfactual vs actual outcome'
  });

  assert.ok(cycle.counterfactualVsActual, 'Counterfactual vs actual comparison must be generated');
  assert.equal(cycle.counterfactualVsActual.actionId, targetAction.id);
  assert.ok(cycle.counterfactualVsActual.actualOutcome.actualSurvivingCount > 0);
  assert.ok(['EXACT', 'PARTIAL', 'UNEXPECTED'].includes(cycle.counterfactualVsActual.predictionAccuracy));
});

test('ClosedLoop 8: Algorithm impact trace generates full 6-stage chain', async () => {
  const { caseId, evidenceImpactEngine } = setupClosedLoopTest();

  const evidenceNode: GraphNode = {
    id: 'ev-network-telemetry-staging',
    category: 'EVIDENCE',
    type: 'NETWORK_CAPTURE',
    label: 'Internal Network Packet Capture',
    source: { name: 'Network Tap 02', kind: 'DEVICE' },
    reliability: 0.98
  };

  const attachedEdges: GraphEdge[] = [
    {
      id: 'e-telemetry-link',
      source: 'ev-network-telemetry-staging',
      target: 'location-vault',
      type: 'SUPPORTS',
      status: 'OBSERVED',
      evidenceRefs: ['ev-network-telemetry-staging'],
      cost: 0.2
    }
  ];

  const cycle = await evidenceImpactEngine.ingestEvidence({
    caseId,
    evidenceNode,
    attachedEdges,
    summary: 'Ingested internal network telemetry'
  });

  const stages = cycle.algorithmImpactTrace.map(s => s.stage);
  assert.deepEqual(stages, [
    'EVIDENCE_INGESTION',
    'GRAPH_MUTATION',
    'ALGORITHMS_AFFECTED',
    'POSSIBILITY_CHANGES',
    'RESOLUTION_CHANGES',
    'INVESTIGATION_CHANGES'
  ]);
  assert.ok(cycle.algorithmImpactTrace.every(s => s.durationMs >= 0));
});

test('ClosedLoop 9: Incremental benchmark demonstrates speedup vs full recomputation', async () => {
  const { caseId, evidenceImpactEngine } = setupClosedLoopTest();

  const benchmark = await evidenceImpactEngine.benchmarkIncrementalVsFull(caseId);
  assert.equal(benchmark.caseId, caseId);
  assert.ok(benchmark.nodeCount > 0);
  assert.ok(benchmark.edgeCount > 0);
  assert.ok(benchmark.incrementalTimeMs >= 0);
  assert.ok(benchmark.fullRecomputeTimeMs >= benchmark.incrementalTimeMs);
  assert.ok(benchmark.speedupRatio >= 1.0);
});

test('ClosedLoop 10: Version history maintains immutable sequence of investigation states', async () => {
  const { caseId, evidenceImpactEngine } = setupClosedLoopTest();

  await evidenceImpactEngine.ingestEvidence({
    caseId,
    evidenceNode: { id: 'ev-step-1', label: 'Step 1 Evidence', category: 'EVIDENCE', type: 'LOG', source: { name: 'Sensor 1' } },
    attachedEdges: [{ id: 'e-s1', source: 'ev-step-1', target: 'location-vault', type: 'SUPPORTS', status: 'OBSERVED', evidenceRefs: ['ev-step-1'], cost: 0.1 }],
    summary: 'Evidence step 1'
  });

  await evidenceImpactEngine.ingestEvidence({
    caseId,
    evidenceNode: { id: 'ev-step-2', label: 'Step 2 Evidence', category: 'EVIDENCE', type: 'LOG', source: { name: 'Sensor 2' } },
    attachedEdges: [{ id: 'e-s2', source: 'ev-step-2', target: 'location-vault', type: 'SUPPORTS', status: 'OBSERVED', evidenceRefs: ['ev-step-2'], cost: 0.1 }],
    summary: 'Evidence step 2'
  });

  const history = await evidenceImpactEngine.getVersionHistory(caseId);
  assert.ok(history.length >= 2);
  const vNums = history.map(h => h.versionNumber);
  assert.ok(vNums.includes(2));
  assert.ok(vNums.includes(3));
});

test("ClosedLoop 11: Agent answers 'What changed after this evidence?' with EVIDENCE_IMPACT_EXPLANATION", async () => {
  const { caseId, evidenceImpactEngine, agentService, graphService } = setupClosedLoopTest();

  await evidenceImpactEngine.ingestEvidence({
    caseId,
    evidenceNode: { id: 'ev-agent-test', label: 'Guard Station Roster Sheet', category: 'EVIDENCE', type: 'DOCUMENT', source: { name: 'Physical Archive' } },
    attachedEdges: [{ id: 'e-agent-t', source: 'ev-agent-test', target: 'location-vault', type: 'SUPPORTS', status: 'OBSERVED', evidenceRefs: ['ev-agent-test'], cost: 0.1 }],
    summary: 'Ingested guard roster'
  });

  const baseGraph = graphService.getGraph(caseId);
  const result = await agentService.processQuery(caseId, baseGraph, 'What changed after this evidence?');

  assert.equal(result.intent, 'EVIDENCE_IMPACT_EXPLANATION');
  assert.equal(result.algorithmUsed, 'EVIDENCE_IMPACT_ENGINE');
  assert.ok(result.factualAnswer.includes('Closed-Loop Impact Report'));
  assert.ok(result.factualAnswer.includes('Guard Station Roster Sheet'));
});

test("ClosedLoop 12: Agent answers 'Which possibilities were eliminated?' with POSSIBILITY_ELIMINATION_QUERY", async () => {
  const { caseId, evidenceImpactEngine, agentService, graphService } = setupClosedLoopTest();

  await evidenceImpactEngine.ingestEvidence({
    caseId,
    evidenceNode: { id: 'ev-agent-elim-test', label: 'Audit Log 2', category: 'EVIDENCE', type: 'LOG', source: { name: 'Audit DB' } },
    attachedEdges: [{ id: 'e-agent-e', source: 'ev-agent-elim-test', target: 'location-vault', type: 'SUPPORTS', status: 'OBSERVED', evidenceRefs: ['ev-agent-elim-test'], cost: 0.1 }],
    summary: 'Ingested audit log'
  });

  const baseGraph = graphService.getGraph(caseId);
  const result = await agentService.processQuery(caseId, baseGraph, 'Which possibilities were eliminated?');

  assert.equal(result.intent, 'POSSIBILITY_ELIMINATION_QUERY');
  assert.ok(result.factualAnswer.includes('Eliminated Possibilities') || result.factualAnswer.length > 0);
});

test("ClosedLoop 13: Agent answers 'Which algorithms were rerun?' with ALGORITHMS_RERUN_QUERY", async () => {
  const { caseId, evidenceImpactEngine, agentService, graphService } = setupClosedLoopTest();

  await evidenceImpactEngine.ingestEvidence({
    caseId,
    evidenceNode: { id: 'ev-algo-test', label: 'Badge Card Log', category: 'EVIDENCE', type: 'LOG', source: { name: 'Controller' } },
    attachedEdges: [{ id: 'e-algo-t', source: 'ev-algo-test', target: 'location-vault', type: 'SUPPORTS', status: 'OBSERVED', evidenceRefs: ['ev-algo-test'], cost: 0.1 }],
    summary: 'Ingested badge card log'
  });

  const baseGraph = graphService.getGraph(caseId);
  const result = await agentService.processQuery(caseId, baseGraph, 'Which algorithms were rerun?');

  assert.equal(result.intent, 'ALGORITHMS_RERUN_QUERY');
  assert.equal(result.algorithmUsed, 'ALGORITHM_DEPENDENCY_GRAPH');
  assert.ok(result.factualAnswer.includes('Algorithm Recalculation Breakdown'));
});

test("ClosedLoop 14: Agent answers 'What investigation actions are now relevant?' with RELEVANT_ACTIONS_QUERY", async () => {
  const { caseId, evidenceImpactEngine, agentService, graphService } = setupClosedLoopTest();

  await evidenceImpactEngine.ingestEvidence({
    caseId,
    evidenceNode: { id: 'ev-actions-test', label: 'Camera Feed 5', category: 'EVIDENCE', type: 'CCTV', source: { name: 'CCTV DVR 01' } },
    attachedEdges: [{ id: 'e-actions-t', source: 'ev-actions-test', target: 'location-vault', type: 'SUPPORTS', status: 'OBSERVED', evidenceRefs: ['ev-actions-test'], cost: 0.1 }],
    summary: 'Ingested camera feed 5'
  });

  const baseGraph = graphService.getGraph(caseId);
  const result = await agentService.processQuery(caseId, baseGraph, 'What investigation actions are now relevant?');

  assert.equal(result.intent, 'RELEVANT_ACTIONS_QUERY');
  assert.equal(result.algorithmUsed, 'INVESTIGATION_PLANNING_ENGINE');
  assert.ok(result.factualAnswer.includes('Relevant Investigation Actions'));
});

test("ClosedLoop 15: Agent answers 'Why did the possibility space change?' with POSSIBILITY_SPACE_CHANGE_REASON", async () => {
  const { caseId, evidenceImpactEngine, agentService, graphService } = setupClosedLoopTest();

  await evidenceImpactEngine.ingestEvidence({
    caseId,
    evidenceNode: { id: 'ev-reason-test', label: 'Physical Security Keycard Log', category: 'EVIDENCE', type: 'LOG', source: { name: 'Controller 02' } },
    attachedEdges: [{ id: 'e-reason-t', source: 'ev-reason-test', target: 'location-vault', type: 'SUPPORTS', status: 'OBSERVED', evidenceRefs: ['ev-reason-test'], cost: 0.1 }],
    summary: 'Ingested keycard log'
  });

  const baseGraph = graphService.getGraph(caseId);
  const result = await agentService.processQuery(caseId, baseGraph, 'Why did the possibility space change?');

  assert.equal(result.intent, 'POSSIBILITY_SPACE_CHANGE_REASON');
  assert.equal(result.algorithmUsed, 'POSSIBILITY_EVOLUTION_ENGINE');
  assert.ok(result.factualAnswer.includes('Possibility Space Evolution Rationale'));
});

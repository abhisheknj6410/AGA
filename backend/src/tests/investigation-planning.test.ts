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
import { InvestigationAgentService } from '../application/investigation-agent-service.js';
import { seedDemonstrationCase } from '../infrastructure/seed-demo-case.js';
import { EvidenceClass } from '../domain/planning-types.js';

function setupPlanningTest() {
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
  const resolutionEngine = new ResolutionReasoningEngine(possibilityRepo, analysisEngine, incrementalEngine);
  const planningEngine = new InvestigationPlanningEngine(possibilityRepo, resolutionEngine);
  const agentService = new InvestigationAgentService(
    possibilityRepo,
    analysisEngine,
    possibilityEngine,
    incrementalEngine,
    resolutionEngine,
    planningEngine
  );

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
    resolutionEngine,
    planningEngine,
    agentService
  };
}

// ==========================================
// PHASE 5: INVESTIGATION PLANNING ENGINE TESTS
// ==========================================

test('Planning 1: InvestigationPlanningEngine instantiates and builds plan on demonstration case', async () => {
  const { caseId, graphService, planningEngine } = setupPlanningTest();
  const baseGraph = graphService.getGraph(caseId);

  const plan = await planningEngine.generatePlan(caseId, baseGraph);
  assert.ok(plan.planId.startsWith('PLAN-'), 'Plan ID should start with PLAN-');
  assert.equal(plan.caseId, caseId);
  assert.ok(plan.currentPossibilityCount >= 2, 'Should have at least 2 surviving possibilities in demo case');
  assert.ok(plan.currentFamilyCount >= 1, 'Should have at least 1 structural family');
  assert.ok(plan.actions.length > 0, 'Should generate actions from resolution candidates');
  assert.ok(plan.algorithmTrace.steps.length > 0, 'Trace should record execution steps');
});

test('Planning 2: ResolutionCandidates are deterministically converted into InvestigationActions', async () => {
  const { caseId, graphService, planningEngine, resolutionEngine } = setupPlanningTest();
  const baseGraph = graphService.getGraph(caseId);

  const resolution = resolutionEngine.runResolutionAnalysis(caseId, baseGraph);
  const plan = await planningEngine.generatePlan(caseId, baseGraph);

  assert.ok(resolution.resolutionCandidates.length > 0, 'Demo case must have resolution candidates');
  for (const action of plan.actions) {
    assert.ok(action.id.startsWith('ACT-'), 'Action ID must start with ACT-');
    assert.ok(action.question.length > 10, 'Action must have a descriptive investigative question');
    assert.ok(action.evidenceClasses.length > 0, 'Action must specify schema evidence classes');
    assert.ok(action.algorithmBasis.length > 0, 'Action must specify algorithm basis');
    assert.ok(action.graphBasis.length > 0, 'Action must specify graph basis');
  }
});

test('Planning 3: Multi-outcome partitions correctly segregate CONFIRMED and REFUTED sets', async () => {
  const { caseId, graphService, planningEngine } = setupPlanningTest();
  const baseGraph = graphService.getGraph(caseId);

  const plan = await planningEngine.generatePlan(caseId, baseGraph);
  const topAction = plan.actions[0];
  assert.ok(topAction, 'Should have a top action');

  const { CONFIRMED, REFUTED } = topAction.expectedPartitions;
  assert.equal(CONFIRMED.outcome, 'CONFIRMED');
  assert.equal(REFUTED.outcome, 'REFUTED');

  assert.ok(CONFIRMED.resultingPossibilityCount > 0, 'Confirmed partition must have survivors');
  assert.ok(REFUTED.resultingPossibilityCount > 0, 'Refuted partition must have survivors');

  // CONFIRMED confirmedSet must equal REFUTED refutedSet
  assert.deepEqual(CONFIRMED.confirmedSet.sort(), REFUTED.refutedSet.sort());
  assert.deepEqual(CONFIRMED.refutedSet.sort(), REFUTED.confirmedSet.sort());
});

test('Planning 4: Prior entropy H(P) and Expected Information Gain are calculated with Shannon formula', async () => {
  const { caseId, graphService, planningEngine } = setupPlanningTest();
  const baseGraph = graphService.getGraph(caseId);

  const plan = await planningEngine.generatePlan(caseId, baseGraph);
  const N = plan.currentPossibilityCount;
  const expectedEntropy = Number(Math.log2(N).toFixed(4));
  assert.equal(plan.currentEntropy, expectedEntropy, 'Prior entropy must be log2(N)');

  for (const action of plan.actions) {
    assert.ok(typeof action.expectedInformationGain === 'number', 'Information gain must be number');
    assert.ok(action.expectedInformationGain >= 0, 'Information gain cannot be negative');
    assert.ok(action.expectedInformationGain <= plan.currentEntropy + 0.001, 'Information gain cannot exceed prior entropy');
  }
});

test('Planning 5: Equal partition on hypotheses yields accurate entropy reduction', async () => {
  const { caseId, graphService, planningEngine } = setupPlanningTest();
  const baseGraph = graphService.getGraph(caseId);

  const plan = await planningEngine.generatePlan(caseId, baseGraph);
  // Find an action that splits possibilities symmetrically
  const symmetric = plan.actions.find(a =>
    a.expectedPartitions.CONFIRMED.resultingPossibilityCount === a.expectedPartitions.REFUTED.resultingPossibilityCount
  );

  if (symmetric) {
    // If N is split in half (e.g. 2 and 2 out of 4), expected information gain is exactly 1 bit
    assert.ok(symmetric.expectedInformationGain >= 0.99 && symmetric.expectedInformationGain <= 1.01,
      `Symmetric 50/50 partition should yield ~1.0 bit, got ${symmetric.expectedInformationGain}`);
  } else {
    // Any partition must reduce or preserve entropy
    assert.ok(plan.actions[0].expectedInformationGain >= 0);
  }
});

test('Planning 6: Supported Evidence Classes map to valid acquisition profiles with costs 1-5', () => {
  const schemaClasses: EvidenceClass[] = [
    'LOG',
    'CCTV',
    'SYSTEM_RECORD',
    'NETWORK_CAPTURE',
    'DATABASE_RECORD',
    'TRANSACTION_RECORD',
    'PHONE_RECORD',
    'DOCUMENT',
    'IMAGE',
    'INTERVIEW'
  ];

  for (const c of schemaClasses) {
    const profile = InvestigationPlanningEngine.EVIDENCE_PROFILES[c];
    assert.ok(profile, `Profile for ${c} must exist`);
    assert.ok(profile.estimatedCost >= 1 && profile.estimatedCost <= 5, `Cost must be in [1, 5] for ${c}`);
    assert.ok(profile.structuralSpecificity > 0 && profile.structuralSpecificity <= 1.0, `Specificity in (0, 1] for ${c}`);
    assert.ok(['IMMEDIATE', 'MODERATE', 'RESTRICTED', 'DELAYED'].includes(profile.availability));
  }
});

test('Planning 7: Investigation Value formula balances information gain, utility, specificity, and cost', async () => {
  const { caseId, graphService, planningEngine } = setupPlanningTest();
  const baseGraph = graphService.getGraph(caseId);

  const plan = await planningEngine.generatePlan(caseId, baseGraph);
  for (const action of plan.actions) {
    assert.ok(action.investigationValue > 0, 'Investigation value must be positive');
    // Manual calculation check
    const manualScore = Number(
      (
        ((action.expectedInformationGain * 50 + action.resolutionUtility * 0.5) * action.evidenceSpecificity) /
        action.costProfile.estimatedCost
      ).toFixed(2)
    );
    // Allow slight float tolerance
    assert.ok(Math.abs(action.investigationValue - manualScore) < 0.1, `Score ${action.investigationValue} vs manual ${manualScore}`);
  }
});

test('Planning 8: Temporal investigation window extracts interval bounds respecting precision', async () => {
  const { caseId, graphService, planningEngine } = setupPlanningTest();
  const baseGraph = graphService.getGraph(caseId);

  const plan = await planningEngine.generatePlan(caseId, baseGraph);
  const actionWithWindow = plan.actions.find(a => a.requiredTemporalWindow !== undefined);
  if (actionWithWindow?.requiredTemporalWindow) {
    const win = actionWithWindow.requiredTemporalWindow;
    assert.ok(['SECOND', 'MINUTE', 'HOUR', 'DAY'].includes(win.precision), 'Precision must be valid enum');
    assert.ok(win.reason.length > 5, 'Reason must explain the temporal constraint');
  }
});

test('Planning 9: Required entities are populated from base graph nodes', async () => {
  const { caseId, graphService, planningEngine } = setupPlanningTest();
  const baseGraph = graphService.getGraph(caseId);

  const plan = await planningEngine.generatePlan(caseId, baseGraph);
  for (const action of plan.actions) {
    assert.ok(Array.isArray(action.requiredEntities), 'requiredEntities must be array');
    for (const ent of action.requiredEntities) {
      assert.ok(ent.id && ent.label && ent.role, 'Entity ref must have id, label, role');
    }
  }
});

test('Planning 10: Second-order InvestigationPlanGraph contains POSSIBILITY_SPACE, ACTION, and OUTCOME nodes', async () => {
  const { caseId, graphService, planningEngine } = setupPlanningTest();
  const baseGraph = graphService.getGraph(caseId);

  const plan = await planningEngine.generatePlan(caseId, baseGraph);
  const { nodes, edges } = plan.planGraph;

  assert.ok(nodes.some(n => n.type === 'POSSIBILITY_SPACE'), 'Must have POSSIBILITY_SPACE root node');
  assert.ok(nodes.some(n => n.type === 'ACTION'), 'Must have ACTION nodes');
  assert.ok(nodes.some(n => n.type === 'OUTCOME'), 'Must have OUTCOME nodes');
  assert.ok(edges.length > 0, 'Plan graph must have edges connecting nodes');
});

test('Planning 11: Plan Graph causal edges (TRIGGERS, PARTITIONS, DEPENDS_ON) are properly directed', async () => {
  const { caseId, graphService, planningEngine } = setupPlanningTest();
  const baseGraph = graphService.getGraph(caseId);

  const plan = await planningEngine.generatePlan(caseId, baseGraph);
  const { nodes, edges } = plan.planGraph;
  const nodeIds = new Set(nodes.map(n => n.id));

  for (const edge of edges) {
    assert.ok(nodeIds.has(edge.source), `Source node ${edge.source} must exist in graph`);
    assert.ok(nodeIds.has(edge.target), `Target node ${edge.target} must exist in graph`);
    assert.ok(['TRIGGERS', 'PARTITIONS', 'DEPENDS_ON', 'RESOLVES'].includes(edge.type), `Edge type ${edge.type} must be valid`);
  }
});

test('Planning 12: Action dependency inference links edge actions to antecedent node actions', async () => {
  const { caseId, graphService, planningEngine } = setupPlanningTest();
  const baseGraph = graphService.getGraph(caseId);

  const plan = await planningEngine.generatePlan(caseId, baseGraph);
  for (const action of plan.actions) {
    assert.ok(Array.isArray(action.dependencies), 'Dependencies must be an array');
    for (const depId of action.dependencies) {
      assert.ok(depId.startsWith('ACT-'), 'Dependent action ID must start with ACT-');
    }
  }
});

test('Planning 13: Contradiction arbitration actions are planned when contradictions exist', async () => {
  const { caseId, graphService, planningEngine, resolutionEngine } = setupPlanningTest();
  const baseGraph = graphService.getGraph(caseId);

  const resolution = resolutionEngine.runResolutionAnalysis(caseId, baseGraph);
  const plan = await planningEngine.generatePlan(caseId, baseGraph);

  if (resolution.contradictionImpacts.length > 0) {
    const contraAction = plan.actions.find(a => a.graphBasis === 'CONTRADICTION_ARBITRATION');
    assert.ok(contraAction, 'Should generate an action with basis CONTRADICTION_ARBITRATION');
    assert.ok(contraAction.algorithmBasis.includes('Contradiction'));
  }
});

test('Planning 14: Actions are deterministically ranked by investigationValue descending', async () => {
  const { caseId, graphService, planningEngine } = setupPlanningTest();
  const baseGraph = graphService.getGraph(caseId);

  const plan = await planningEngine.generatePlan(caseId, baseGraph);
  for (let i = 0; i < plan.actions.length - 1; i++) {
    const current = plan.actions[i];
    const next = plan.actions[i + 1];
    assert.ok(
      current.investigationValue >= next.investigationValue,
      `Action ${current.id} (val: ${current.investigationValue}) should rank before ${next.id} (val: ${next.investigationValue})`
    );
  }
});

test('Planning 15: nextImmediateAction identifies actionable step with 0 unfulfilled dependencies', async () => {
  const { caseId, graphService, planningEngine } = setupPlanningTest();
  const baseGraph = graphService.getGraph(caseId);

  const plan = await planningEngine.generatePlan(caseId, baseGraph);
  assert.ok(plan.nextImmediateAction !== null, 'Plan must provide a nextImmediateAction');
  assert.equal(plan.nextImmediateAction.dependencies.length, 0, 'Immediate action should have no unfulfilled dependencies');
});

test('Planning 16: Algorithm execution trace records all computation steps and basis mapping', async () => {
  const { caseId, graphService, planningEngine } = setupPlanningTest();
  const baseGraph = graphService.getGraph(caseId);

  const plan = await planningEngine.generatePlan(caseId, baseGraph);
  const { steps, basisMap } = plan.algorithmTrace;

  assert.ok(steps.length >= 4, 'Must have at least 4 trace stages');
  assert.ok(Object.keys(basisMap).length > 0, 'Basis map must be populated');
  for (const [actId, basis] of Object.entries(basisMap)) {
    assert.ok(actId.startsWith('ACT-'), 'ActId must start with ACT-');
    assert.ok(basis.length > 0, 'Basis string must not be empty');
  }
});

test('Planning 17: Agent answers "What should I investigate next?" with NEXT_INVESTIGATION_ACTION', async () => {
  const { caseId, graphService, agentService } = setupPlanningTest();
  const baseGraph = graphService.getGraph(caseId);

  const res = await agentService.processQuery(caseId, baseGraph, 'What should I investigate next?');
  assert.equal(res.intent, 'NEXT_INVESTIGATION_ACTION');
  assert.ok(res.algorithmUsed?.includes('INVESTIGATION_PLANNING_ENGINE'));
  assert.ok(res.factualAnswer.includes('Deterministic Next Investigation Action'));
  assert.ok(res.structuredData.nextAction !== undefined);
});

test('Planning 18: Agent answers "Which evidence would reduce uncertainty the most?" with MAX_INFORMATION_GAIN_INQUIRY', async () => {
  const { caseId, graphService, agentService } = setupPlanningTest();
  const baseGraph = graphService.getGraph(caseId);

  const res = await agentService.processQuery(caseId, baseGraph, 'Which evidence would reduce uncertainty the most?');
  assert.equal(res.intent, 'MAX_INFORMATION_GAIN_INQUIRY');
  assert.ok(res.algorithmUsed?.includes('SHANNON_ENTROPY'));
  assert.ok(res.factualAnswer.includes('Entropy'));
  assert.ok(res.structuredData.actionsByGain !== undefined);
});

test('Planning 19: Agent answers "Show the investigation plan" with INVESTIGATION_PLAN_SUMMARY', async () => {
  const { caseId, graphService, agentService } = setupPlanningTest();
  const baseGraph = graphService.getGraph(caseId);

  const res = await agentService.processQuery(caseId, baseGraph, 'Show the investigation plan');
  assert.equal(res.intent, 'INVESTIGATION_PLAN_SUMMARY');
  assert.ok(res.factualAnswer.includes('Investigation Plan'));
  assert.ok(res.structuredData.plan !== undefined);
});

test('Planning 20: Counterfactual action simulation evaluates outcome without mutating base graph', async () => {
  const { caseId, graphService, planningEngine } = setupPlanningTest();
  const baseGraph = graphService.getGraph(caseId);
  const nodeCountBefore = baseGraph.nodes.length;
  const edgeCountBefore = baseGraph.edges.length;

  const plan = await planningEngine.generatePlan(caseId, baseGraph);
  const action = plan.actions[0];
  const conf = action.expectedPartitions.CONFIRMED;

  assert.ok(conf.resultingPossibilityCount <= plan.currentPossibilityCount);
  assert.ok(conf.resultingFamilyCount <= plan.currentFamilyCount);

  // Verify graph unchanged
  const graphAfter = graphService.getGraph(caseId);
  assert.equal(graphAfter.nodes.length, nodeCountBefore);
  assert.equal(graphAfter.edges.length, edgeCountBefore);
});

test('Planning 21: Trivial case with 1 or 0 possibilities produces entropy 0 and null next action', async () => {
  const db = getDatabase(':memory:');
  runMigrations(db);
  const graphService = new GraphService(db);
  const possibilityRepo = new PossibilityRepository(db);
  const algorithmRepo = new AlgorithmRepository(db);
  const analysisEngine = new GraphAnalysisEngine(algorithmRepo);
  const resolutionEngine = new ResolutionReasoningEngine(possibilityRepo, analysisEngine);
  const planningEngine = new InvestigationPlanningEngine(possibilityRepo, resolutionEngine);

  const trivialCaseId = 'case-trivial-001';
  const now = new Date().toISOString();
  db.prepare(`INSERT INTO cases (id, name, description, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`).run(
    trivialCaseId, 'Trivial Case', 'Single route case', 'ACTIVE', now, now
  );

  const plan = await planningEngine.generatePlan(trivialCaseId, { nodes: [], edges: [] });
  assert.equal(plan.currentEntropy, 0);
  assert.equal(plan.actions.length, 0);
  assert.equal(plan.nextImmediateAction, null);
});

test('Planning 22: Reproducibility property: repeated plan generation produces identical action rankings', async () => {
  const { caseId, graphService, planningEngine } = setupPlanningTest();
  const baseGraph = graphService.getGraph(caseId);

  const plan1 = await planningEngine.generatePlan(caseId, baseGraph);
  const plan2 = await planningEngine.generatePlan(caseId, baseGraph);

  assert.equal(plan1.actions.length, plan2.actions.length);
  for (let i = 0; i < plan1.actions.length; i++) {
    assert.equal(plan1.actions[i].id, plan2.actions[i].id);
    assert.equal(plan1.actions[i].targetLabel, plan2.actions[i].targetLabel);
    assert.equal(plan1.actions[i].investigationValue, plan2.actions[i].investigationValue);
    assert.equal(plan1.actions[i].expectedInformationGain, plan2.actions[i].expectedInformationGain);
  }
});

test('Planning 23: Property: Every generated action has positive or zero information gain', async () => {
  const { caseId, graphService, planningEngine } = setupPlanningTest();
  const baseGraph = graphService.getGraph(caseId);

  const plan = await planningEngine.generatePlan(caseId, baseGraph);
  for (const act of plan.actions) {
    assert.ok(act.expectedInformationGain >= 0, `Action ${act.id} has negative IG: ${act.expectedInformationGain}`);
  }
});

test('Planning 24: Property: Every action outcome partition preserves total possibility universe', async () => {
  const { caseId, graphService, planningEngine } = setupPlanningTest();
  const baseGraph = graphService.getGraph(caseId);

  const plan = await planningEngine.generatePlan(caseId, baseGraph);
  for (const act of plan.actions) {
    const { CONFIRMED } = act.expectedPartitions;
    const totalPartitioned = CONFIRMED.confirmedSet.length + CONFIRMED.refutedSet.length;
    assert.equal(totalPartitioned, plan.currentPossibilityCount, `Action ${act.id} partition does not partition universe`);
  }
});

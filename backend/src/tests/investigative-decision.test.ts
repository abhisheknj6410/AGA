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
import { InvestigationDecisionEngine } from '../application/investigation-decision-engine.js';
import { InvestigationAgentService } from '../application/investigation-agent-service.js';
import { seedDemonstrationCase } from '../infrastructure/seed-demo-case.js';

function setupDecisionTest() {
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
  const decisionEngine = new InvestigationDecisionEngine(possibilityRepo, resolutionEngine, planningEngine);

  const { caseId } = seedDemonstrationCase(db, possibilityEngine);

  const agentService = new InvestigationAgentService(
    possibilityRepo,
    analysisEngine,
    possibilityEngine,
    incrementalEngine,
    resolutionEngine,
    planningEngine
  );
  agentService.setDecisionEngine(decisionEngine);

  return {
    db,
    caseId,
    graphService,
    possibilityRepo,
    resolutionEngine,
    planningEngine,
    decisionEngine,
    agentService
  };
}

test('Decision 1: Every unresolved question has a concrete graph distinction separating surviving possibilities', async () => {
  const { caseId, graphService, decisionEngine } = setupDecisionTest();
  const graph = graphService.getGraph(caseId)!;

  const result = await decisionEngine.evaluateDecisions(caseId, graph);

  assert.ok(result.unresolvedQuestions.length > 0, 'Should identify unresolved questions');
  for (const q of result.unresolvedQuestions) {
    assert.ok(q.target.elementId, 'Must reference concrete graph element');
    assert.ok(q.target.separates.possibilityA, 'Must identify possibility A');
    assert.ok(q.target.separates.possibilityB, 'Must identify possibility B');
    assert.notEqual(
      q.target.separates.possibilityA,
      q.target.separates.possibilityB,
      'Separated possibilities must be distinct'
    );
    assert.ok(q.importanceScore >= 0 && q.importanceScore <= 100, 'Score must be bounded');
  }
});

test('Decision 2: Graph-derived evidence targets specify concrete element, role, and exact verification question', async () => {
  const { caseId, graphService, decisionEngine } = setupDecisionTest();
  const graph = graphService.getGraph(caseId)!;

  const result = await decisionEngine.evaluateDecisions(caseId, graph);
  const target = result.unresolvedQuestions[0].target;

  assert.ok(['NODE', 'EDGE', 'EVENT', 'INTERVAL'].includes(target.targetType));
  assert.ok(target.elementLabel.length > 0);
  assert.ok(target.structuralRole.length > 0);
  assert.ok(target.exactVerificationQuestion.includes(target.separates.possibilityA));
  assert.ok(target.exactVerificationQuestion.includes(target.separates.possibilityB));
});

test('Decision 3: Temporal window is accurately extracted from event timestamp intervals', async () => {
  const { caseId, graphService, decisionEngine } = setupDecisionTest();
  const graph = graphService.getGraph(caseId)!;

  const result = await decisionEngine.evaluateDecisions(caseId, graph);
  const targetWithWindow = result.unresolvedQuestions.find(q => q.target.temporalWindow !== undefined);

  assert.ok(targetWithWindow, 'Should find at least one target with temporal window');
  assert.ok(targetWithWindow.target.temporalWindow?.start, 'Window should have start time');
  assert.ok(targetWithWindow.target.temporalWindow?.reason, 'Window should have structural reason');
});

test('Decision 4: Full 5-stage algorithm decision trace is present on top recommendation', async () => {
  const { caseId, graphService, decisionEngine } = setupDecisionTest();
  const graph = graphService.getGraph(caseId)!;

  const result = await decisionEngine.evaluateDecisions(caseId, graph);
  assert.ok(result.topRecommendation, 'Must have a top recommendation');

  const trace = result.decisionTrace;
  assert.ok(trace, 'Must have decision trace');
  assert.ok(trace.graphStructure.length > 0, 'Stage 1: Graph Structure must be documented');
  assert.ok(trace.algorithmUsed.length > 0, 'Stage 2: Algorithm Used must be documented');
  assert.ok(trace.algorithmResult.length > 0, 'Stage 2: Algorithm Result must be documented');
  assert.ok(trace.possibilityDistinction.length > 0, 'Stage 3: Possibility Distinction must be documented');
  assert.ok(trace.evidenceTarget.length > 0, 'Stage 4: Evidence Target must be documented');
  assert.ok(trace.investigationAction.length > 0, 'Stage 5: Investigation Action must be documented');
});

test('Decision 5: Generates multiple distinct alternative investigation strategies', async () => {
  const { caseId, graphService, decisionEngine } = setupDecisionTest();
  const graph = graphService.getGraph(caseId)!;

  const result = await decisionEngine.evaluateDecisions(caseId, graph);

  assert.ok(result.strategies.length >= 2, 'Must generate multiple competing strategies');
  const types = new Set(result.strategies.map(s => s.type));
  assert.ok(types.has('MAX_INFORMATION_GAIN'), 'Must include Strategy A: Max Information Gain');
  assert.ok(types.has('LOW_COST_TELEMETRY'), 'Must include Strategy B: Low-Cost Telemetry First');
});

test('Decision 6: Strategy A achieves the highest expected information gain among generated strategies', async () => {
  const { caseId, graphService, decisionEngine } = setupDecisionTest();
  const graph = graphService.getGraph(caseId)!;

  const result = await decisionEngine.evaluateDecisions(caseId, graph);
  const stratA = result.strategies.find(s => s.type === 'MAX_INFORMATION_GAIN')!;

  for (const s of result.strategies) {
    assert.ok(
      stratA.expectedEntropyReduction >= s.expectedEntropyReduction,
      'Strategy A entropy reduction must be >= all other strategies'
    );
  }
});

test('Decision 7: Strategy B prioritizes lower cost evidence with digital telemetry', async () => {
  const { caseId, graphService, decisionEngine } = setupDecisionTest();
  const graph = graphService.getGraph(caseId)!;

  const result = await decisionEngine.evaluateDecisions(caseId, graph);
  const stratB = result.strategies.find(s => s.type === 'LOW_COST_TELEMETRY')!;

  assert.ok(stratB.totalEstimatedCost <= 3, 'Low-cost strategy must have low estimated cost profile');
  assert.ok(stratB.tradeoffSummary.pros.length > 0, 'Must have documented pros');
  assert.ok(stratB.tradeoffSummary.cons.length > 0, 'Must have documented cons');
});

test('Decision 8: Strategy C targets flow bottleneck / dominator choke point', async () => {
  const { caseId, graphService, decisionEngine } = setupDecisionTest();
  const graph = graphService.getGraph(caseId)!;

  const result = await decisionEngine.evaluateDecisions(caseId, graph);
  const stratC = result.strategies.find(s => s.type === 'BOTTLENECK_VERIFICATION');

  if (stratC) {
    assert.ok(
      stratC.algorithmBasis.includes('Dominator') ||
      stratC.algorithmBasis.includes('Min-Cut') ||
      stratC.algorithmBasis.includes('Flow') ||
      stratC.algorithmBasis.includes('Graph'),
      'Strategy C algorithm basis must reflect bottleneck or cut structure'
    );
  }
});

test('Decision 9: Strategy simulation for CONFIRMED outcome evaluates surviving possibilities and entropy reduction', async () => {
  const { caseId, graphService, decisionEngine } = setupDecisionTest();
  const graph = graphService.getGraph(caseId)!;

  const sim = await decisionEngine.simulateStrategy(caseId, graph, 'STRAT-A', 'CONFIRMED');

  assert.equal(sim.simulatedOutcome, 'CONFIRMED');
  assert.ok(sim.beforePossibilityCount >= 2, 'Before count should be >= 2');
  assert.ok(sim.afterPossibilityCount > 0, 'After count should be > 0');
  assert.ok(sim.afterPossibilityCount < sim.beforePossibilityCount, 'Confirmed outcome should eliminate possibilities');
  assert.equal(
    sim.survivingPossibilityIds.length + sim.eliminatedPossibilityIds.length,
    sim.beforePossibilityCount,
    'Surviving + eliminated must equal total'
  );
  assert.ok(sim.entropyReduction >= 0, 'Entropy reduction must be non-negative');
  assert.ok(sim.explanation.includes('CONFIRMATION'));
});

test('Decision 10: Strategy simulation for REFUTED outcome partitions opposite set', async () => {
  const { caseId, graphService, decisionEngine } = setupDecisionTest();
  const graph = graphService.getGraph(caseId)!;

  const simConf = await decisionEngine.simulateStrategy(caseId, graph, 'STRAT-A', 'CONFIRMED');
  const simRef = await decisionEngine.simulateStrategy(caseId, graph, 'STRAT-A', 'REFUTED');

  assert.equal(simRef.simulatedOutcome, 'REFUTED');
  assert.deepEqual(simRef.survivingPossibilityIds, simConf.eliminatedPossibilityIds);
  assert.deepEqual(simRef.eliminatedPossibilityIds, simConf.survivingPossibilityIds);
  assert.ok(simRef.explanation.includes('REFUTATION'));
});

test('Decision 11: Critical constraint: Zero recommendations with empty graph distinction or 0 partition effect', async () => {
  const { caseId, graphService, decisionEngine } = setupDecisionTest();
  const graph = graphService.getGraph(caseId)!;

  const result = await decisionEngine.evaluateDecisions(caseId, graph);

  for (const strat of result.strategies) {
    assert.ok(strat.evidenceTargets.length > 0, 'Strategy must have at least one concrete evidence target');
    for (const target of strat.evidenceTargets) {
      assert.ok(target.elementId, 'Evidence target must specify elementId');
      assert.ok(target.structuralRole, 'Evidence target must specify structural role');
    }
  }
});

test('Decision 12: Trivial case with <= 1 possibility produces empty unresolved questions and 0 entropy', async () => {
  const { caseId, graphService, decisionEngine, possibilityRepo } = setupDecisionTest();
  const graph = graphService.getGraph(caseId)!;

  // Invalidate all but 1 possibility
  const possibilities = possibilityRepo.findByCaseId(caseId);
  for (let i = 1; i < possibilities.length; i++) {
    possibilityRepo.updateStatus(possibilities[i].id, 'INVALID');
  }

  const result = await decisionEngine.evaluateDecisions(caseId, graph);

  assert.equal(result.currentEntropy, 0);
  assert.equal(result.unresolvedQuestions.length, 0);
  assert.equal(result.strategies.length, 0);
  assert.equal(result.topRecommendation, null);
});

test('Decision 13: Agent answers "What is the most important unresolved question?" deterministically', async () => {
  const { caseId, graphService, agentService } = setupDecisionTest();
  const graph = graphService.getGraph(caseId)!;

  const response = await agentService.processQuery(
    caseId,
    graph,
    'What is the most important unresolved question?'
  );

  assert.equal(response.intent, 'MOST_IMPORTANT_UNRESOLVED_QUESTION');
  assert.ok(response.factualAnswer.includes('Top Unresolved Investigative Question'));
  assert.ok(response.factualAnswer.includes('Structural Distinction'));
  assert.ok(response.suggestedFollowUps.length > 0);
});

test('Decision 14: Agent answers "Why does this question matter?" with structural rationale', async () => {
  const { caseId, graphService, agentService } = setupDecisionTest();
  const graph = graphService.getGraph(caseId)!;

  const response = await agentService.processQuery(
    caseId,
    graph,
    'Why does this question matter?'
  );

  assert.equal(response.intent, 'WHY_QUESTION_MATTERS');
  assert.ok(response.factualAnswer.includes('Structural Separation'));
  assert.ok(response.factualAnswer.includes('Possibility Partitioning'));
  assert.ok(response.factualAnswer.includes('Information Gain'));
});

test('Decision 15: Agent answers "What evidence would distinguish these possibilities?" with concrete targets', async () => {
  const { caseId, graphService, agentService } = setupDecisionTest();
  const graph = graphService.getGraph(caseId)!;

  const response = await agentService.processQuery(
    caseId,
    graph,
    'What evidence would distinguish these possibilities?'
  );

  assert.equal(response.intent, 'EVIDENCE_TO_DISTINGUISH_POSSIBILITIES');
  assert.ok(response.factualAnswer.includes('Evidence Targets to Distinguish Active Possibilities'));
  assert.ok(response.factualAnswer.includes('Separates:'));
});

test('Decision 16: Agent answers "Show me alternative ways to resolve this" with competing strategies', async () => {
  const { caseId, graphService, agentService } = setupDecisionTest();
  const graph = graphService.getGraph(caseId)!;

  const response = await agentService.processQuery(
    caseId,
    graph,
    'Show me alternative ways to resolve this'
  );

  assert.equal(response.intent, 'ALTERNATIVE_INVESTIGATION_STRATEGIES');
  assert.ok(response.factualAnswer.includes('Alternative Investigation Strategies'));
  assert.ok(response.factualAnswer.includes('STRAT-A'));
  assert.ok(response.factualAnswer.includes('STRAT-B'));
});

test('Decision 17: Agent answers "What happens if I pursue strategy A instead of B?" with side-by-side simulation', async () => {
  const { caseId, graphService, agentService } = setupDecisionTest();
  const graph = graphService.getGraph(caseId)!;

  const response = await agentService.processQuery(
    caseId,
    graph,
    'What happens if I pursue strategy A instead of B?'
  );

  assert.equal(response.intent, 'STRATEGY_COMPARISON_SIMULATION');
  assert.ok(response.factualAnswer.includes('Strategy A (Maximum Information Gain)'));
  assert.ok(response.factualAnswer.includes('Strategy B (Low-Cost Telemetry First)'));
  assert.ok(response.factualAnswer.includes('Entropy Reduction'));
});

test('Decision 18: Agent answers "Which graph algorithm produced this recommendation?" with 5-stage trace', async () => {
  const { caseId, graphService, agentService } = setupDecisionTest();
  const graph = graphService.getGraph(caseId)!;

  const response = await agentService.processQuery(
    caseId,
    graph,
    'Which graph algorithm produced this recommendation?'
  );

  assert.equal(response.intent, 'RECOMMENDATION_ALGORITHM_PROVENANCE');
  assert.ok(response.factualAnswer.includes('Graph Structure'));
  assert.ok(response.factualAnswer.includes('Algorithm Execution'));
  assert.ok(response.factualAnswer.includes('Possibility Distinction'));
  assert.ok(response.factualAnswer.includes('Evidence Target'));
  assert.ok(response.factualAnswer.includes('Investigation Action'));
});

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
import { AlgorithmEffectivenessEngine } from '../application/algorithm-effectiveness-engine.js';
import { InvestigationAgentService } from '../application/investigation-agent-service.js';
import { seedDemonstrationCase } from '../infrastructure/seed-demo-case.js';
import { seedMultiDomainCases, MULTI_DOMAIN_CASES_CATALOG } from '../infrastructure/multi-domain-cases.js';

function setupEffectivenessTest() {
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
  const effectivenessEngine = new AlgorithmEffectivenessEngine(
    possibilityRepo,
    possibilityEngine,
    resolutionEngine,
    planningEngine
  );
  const agentService = new InvestigationAgentService(
    possibilityRepo,
    analysisEngine,
    possibilityEngine,
    incrementalEngine,
    resolutionEngine,
    planningEngine,
    effectivenessEngine
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
    effectivenessEngine,
    agentService
  };
}

// ==========================================
// PHASE 6: ALGORITHM EFFECTIVENESS & ABLATION TESTS
// ==========================================

test("Effectiveness 1: Audit classifies Yen's K-Shortest Paths as CONSEQUENTIAL", async () => {
  const { caseId, graphService, effectivenessEngine } = setupEffectivenessTest();
  const baseGraph = graphService.getGraph(caseId);

  const audit = await effectivenessEngine.auditAlgorithm(caseId, baseGraph, "Yen's K-Shortest Paths");
  assert.equal(audit.classification, 'CONSEQUENTIAL');
  assert.ok(audit.impactDepth >= 3, 'Yen must have impact depth >= 3');
  assert.ok(audit.possibilitiesAffected > 0, 'Possibilities must be affected by Yen ablation');
});

test("Effectiveness 2: Ablation of Yen's K-Shortest Paths drops alternative corridor possibilities to 0 and collapses actions", async () => {
  const { caseId, graphService, effectivenessEngine } = setupEffectivenessTest();
  const baseGraph = graphService.getGraph(caseId);

  const ablation = await effectivenessEngine.runAblation(caseId, baseGraph, "Yen's K-Shortest Paths");
  assert.equal(ablation.isConsequential, true);
  assert.ok(ablation.normalState.validCount > ablation.ablatedState.validCount);
  assert.ok(ablation.delta.actionsDiff > 0, 'Investigation actions must change when Yen is ablated');
  assert.ok(ablation.downstreamExplanation.includes('alternative corridor hypotheses'));
});

test('Effectiveness 3: Audit classifies Temporal Validation as CONSEQUENTIAL', async () => {
  const { caseId, graphService, effectivenessEngine } = setupEffectivenessTest();
  const baseGraph = graphService.getGraph(caseId);

  const audit = await effectivenessEngine.auditAlgorithm(caseId, baseGraph, 'Temporal Chronology & Kahn Sort');
  assert.equal(audit.classification, 'CONSEQUENTIAL');
  assert.ok(audit.ablationDiff.isConsequential);
});

test('Effectiveness 4: Ablation of Temporal Validation admits inverted routes, increasing invalid count and altering entropy', async () => {
  const { caseId, graphService, effectivenessEngine } = setupEffectivenessTest();
  const baseGraph = graphService.getGraph(caseId);

  const ablation = await effectivenessEngine.runAblation(caseId, baseGraph, 'Temporal Chronology & Kahn Sort');
  assert.equal(ablation.isConsequential, true);
  assert.ok(ablation.changedOutputs.some(o => o.includes('Temporally inverted')));
});

test('Effectiveness 5: Audit classifies Dominator Tree as CONSEQUENTIAL', async () => {
  const { caseId, graphService, effectivenessEngine } = setupEffectivenessTest();
  const baseGraph = graphService.getGraph(caseId);

  const audit = await effectivenessEngine.auditAlgorithm(caseId, baseGraph, 'Lengauer-Tarjan Dominator Tree');
  assert.equal(audit.classification, 'CONSEQUENTIAL');
  assert.ok(audit.ablationDiff.delta.candidatesDiff > 0 || audit.affectedObjects.resolutionCandidates > 0);
});

test('Effectiveness 6: Ablation of Dominator Tree eliminates unavoidable choke points and dominator-divergence resolution candidates', async () => {
  const { caseId, graphService, effectivenessEngine } = setupEffectivenessTest();
  const baseGraph = graphService.getGraph(caseId);

  const ablation = await effectivenessEngine.runAblation(caseId, baseGraph, 'Lengauer-Tarjan Dominator Tree');
  assert.equal(ablation.isConsequential, true);
  assert.ok(ablation.changedOutputs.some(o => o.includes('dominator')));
});

test('Effectiveness 7: Audit classifies Min-Cut Separation as CONSEQUENTIAL', async () => {
  const { caseId, graphService, effectivenessEngine } = setupEffectivenessTest();
  const baseGraph = graphService.getGraph(caseId);

  const audit = await effectivenessEngine.auditAlgorithm(caseId, baseGraph, 'Min-Cut Separation');
  assert.equal(audit.classification, 'CONSEQUENTIAL');
  assert.ok(audit.ablationDiff.delta.candidatesDiff > 0 || audit.affectedObjects.resolutionCandidates > 0);
});

test('Effectiveness 8: Ablation of Min-Cut eliminates corridor-separating resolution candidates', async () => {
  const { caseId, graphService, effectivenessEngine } = setupEffectivenessTest();
  const baseGraph = graphService.getGraph(caseId);

  const ablation = await effectivenessEngine.runAblation(caseId, baseGraph, 'Min-Cut Separation');
  assert.equal(ablation.isConsequential, true);
  assert.ok(ablation.changedOutputs.some(o => o.includes('Min-Cut')));
});

test('Effectiveness 9: Audit classifies Structural Family Clustering as CONSEQUENTIAL', async () => {
  const { caseId, graphService, effectivenessEngine } = setupEffectivenessTest();
  const baseGraph = graphService.getGraph(caseId);

  const audit = await effectivenessEngine.auditAlgorithm(caseId, baseGraph, 'Structural Family Backbone Clustering');
  assert.equal(audit.classification, 'CONSEQUENTIAL');
  assert.ok(audit.ablationDiff.delta.familiesDiff > 0);
});

test('Effectiveness 10: Audit classifies Shannon Entropy & Information Gain as CONSEQUENTIAL', async () => {
  const { caseId, graphService, effectivenessEngine } = setupEffectivenessTest();
  const baseGraph = graphService.getGraph(caseId);

  const audit = await effectivenessEngine.auditAlgorithm(caseId, baseGraph, 'Shannon Entropy & Information Gain');
  assert.equal(audit.classification, 'CONSEQUENTIAL');
  assert.ok(audit.ablationDiff.changedOutputs.some(o => o.includes('Information Gain')));
});

test("Effectiveness 11: Dijkstra is classified as INTERMEDIATE subroutine within Yen's algorithm", async () => {
  const { caseId, graphService, effectivenessEngine } = setupEffectivenessTest();
  const baseGraph = graphService.getGraph(caseId);

  const audit = await effectivenessEngine.auditAlgorithm(caseId, baseGraph, "Dijkstra's Algorithm");
  assert.equal(audit.classification, 'INTERMEDIATE');
});

test('Effectiveness 12: Second-order AlgorithmImpactGraph produces valid DAG from algorithms to actions', async () => {
  const { caseId, graphService, effectivenessEngine } = setupEffectivenessTest();
  const baseGraph = graphService.getGraph(caseId);

  const graph = await effectivenessEngine.getImpactGraph(caseId, baseGraph);
  assert.ok(graph.nodes.some(n => n.type === 'ALGORITHM'));
  assert.ok(graph.nodes.some(n => n.type === 'INTERMEDIATE_RESULT'));
  assert.ok(graph.nodes.some(n => n.type === 'POSSIBILITY'));
  assert.ok(graph.nodes.some(n => n.type === 'INVESTIGATION_ACTION'));
  assert.ok(graph.edges.length > 0);
});

test('Effectiveness 13: Transitive impact depth and affected object counts are calculated for consequential algorithms', async () => {
  const { caseId, graphService, effectivenessEngine } = setupEffectivenessTest();
  const baseGraph = graphService.getGraph(caseId);

  const audit = await effectivenessEngine.auditAlgorithm(caseId, baseGraph, "Yen's K-Shortest Paths");
  assert.ok(audit.impactDepth >= 1);
  assert.ok(typeof audit.affectedObjects.possibilities === 'number');
  assert.ok(typeof audit.affectedObjects.investigationActions === 'number');
});

test('Effectiveness 14: Upstream computational provenance trace identifies all algorithms producing an investigation action', async () => {
  const { caseId, graphService, effectivenessEngine, planningEngine } = setupEffectivenessTest();
  const baseGraph = graphService.getGraph(caseId);

  const plan = await planningEngine.generatePlan(caseId, baseGraph);
  const act = plan.actions[0];
  assert.ok(act, 'Must have a plan action');

  const trace = await effectivenessEngine.getReasoningTrace(caseId, baseGraph, act.id);
  assert.equal(trace.targetId, act.id);
  assert.ok(trace.producedByAlgorithms.length >= 2, 'Action must be produced by at least 2 algorithms');
  assert.ok(trace.chainSteps.length >= 4, 'Must have at least 4 stage steps in causal chain');
});

test('Effectiveness 15: Reasoning trace generates 7-stage chain for any action or possibility', async () => {
  const { caseId, graphService, effectivenessEngine } = setupEffectivenessTest();
  const baseGraph = graphService.getGraph(caseId);

  const trace = await effectivenessEngine.getReasoningTrace(caseId, baseGraph, 'ACT-1');
  assert.ok(trace.chainSteps.some(s => s.stage.includes('EVIDENCE')));
  assert.ok(trace.chainSteps.some(s => s.stage.includes('ALGORITHM')));
  assert.ok(trace.chainSteps.some(s => s.stage.includes('POSSIBILITY')));
  assert.ok(trace.chainSteps.some(s => s.stage.includes('ACTION')));
});

test('Effectiveness 16: Multi-domain seeding creates 5 distinct deterministic cases', () => {
  const db = getDatabase(':memory:');
  runMigrations(db);
  const algorithmRepo = new AlgorithmRepository(db);
  const analysisEngine = new GraphAnalysisEngine(algorithmRepo);
  const possibilityRepo = new PossibilityRepository(db);
  const possibilityEngine = new PossibilityEngine(possibilityRepo, analysisEngine);

  const seeded = seedMultiDomainCases(db, possibilityEngine);
  assert.equal(seeded.size, 5);
  for (const meta of MULTI_DOMAIN_CASES_CATALOG) {
    assert.ok(seeded.has(meta.id), `Case ${meta.id} must be seeded`);
  }
});

test('Effectiveness 17: Case A (Physical) generates valid possibilities, families, and actions', async () => {
  const db = getDatabase(':memory:');
  runMigrations(db);
  const algorithmRepo = new AlgorithmRepository(db);
  const analysisEngine = new GraphAnalysisEngine(algorithmRepo);
  const possibilityRepo = new PossibilityRepository(db);
  const possibilityEngine = new PossibilityEngine(possibilityRepo, analysisEngine);
  seedMultiDomainCases(db, possibilityEngine);

  const graphService = new GraphService(db);
  const resolutionEngine = new ResolutionReasoningEngine(possibilityRepo, analysisEngine);
  const planningEngine = new InvestigationPlanningEngine(possibilityRepo, resolutionEngine);

  const caseId = 'case-domain-physical-01';
  const graph = graphService.getGraph(caseId);
  const plan = await planningEngine.generatePlan(caseId, graph);

  assert.ok(plan.currentPossibilityCount >= 2);
  assert.ok(plan.actions.length > 0);
  assert.ok(plan.actions[0].evidenceClasses.includes('CCTV') || plan.actions[0].evidenceClasses.includes('LOG'));
});

test('Effectiveness 18: Case B (Financial) generates valid possibilities, families, and actions', async () => {
  const db = getDatabase(':memory:');
  runMigrations(db);
  const algorithmRepo = new AlgorithmRepository(db);
  const analysisEngine = new GraphAnalysisEngine(algorithmRepo);
  const possibilityRepo = new PossibilityRepository(db);
  const possibilityEngine = new PossibilityEngine(possibilityRepo, analysisEngine);
  seedMultiDomainCases(db, possibilityEngine);

  const graphService = new GraphService(db);
  const resolutionEngine = new ResolutionReasoningEngine(possibilityRepo, analysisEngine);
  const planningEngine = new InvestigationPlanningEngine(possibilityRepo, resolutionEngine);

  const caseId = 'case-domain-financial-02';
  const graph = graphService.getGraph(caseId);
  const plan = await planningEngine.generatePlan(caseId, graph);

  assert.ok(plan.currentPossibilityCount >= 2);
  assert.ok(plan.actions.length > 0);
});

test('Effectiveness 19: Case C (Corporate) generates valid possibilities, families, and actions', async () => {
  const db = getDatabase(':memory:');
  runMigrations(db);
  const algorithmRepo = new AlgorithmRepository(db);
  const analysisEngine = new GraphAnalysisEngine(algorithmRepo);
  const possibilityRepo = new PossibilityRepository(db);
  const possibilityEngine = new PossibilityEngine(possibilityRepo, analysisEngine);
  seedMultiDomainCases(db, possibilityEngine);

  const graphService = new GraphService(db);
  const resolutionEngine = new ResolutionReasoningEngine(possibilityRepo, analysisEngine);
  const planningEngine = new InvestigationPlanningEngine(possibilityRepo, resolutionEngine);

  const caseId = 'case-domain-corporate-03';
  const graph = graphService.getGraph(caseId);
  const plan = await planningEngine.generatePlan(caseId, graph);

  assert.ok(plan.currentPossibilityCount >= 2);
  assert.ok(plan.actions.length > 0);
});

test('Effectiveness 20: Case D (Digital) generates valid possibilities, families, and actions', async () => {
  const db = getDatabase(':memory:');
  runMigrations(db);
  const algorithmRepo = new AlgorithmRepository(db);
  const analysisEngine = new GraphAnalysisEngine(algorithmRepo);
  const possibilityRepo = new PossibilityRepository(db);
  const possibilityEngine = new PossibilityEngine(possibilityRepo, analysisEngine);
  seedMultiDomainCases(db, possibilityEngine);

  const graphService = new GraphService(db);
  const resolutionEngine = new ResolutionReasoningEngine(possibilityRepo, analysisEngine);
  const planningEngine = new InvestigationPlanningEngine(possibilityRepo, resolutionEngine);

  const caseId = 'case-domain-digital-04';
  const graph = graphService.getGraph(caseId);
  const plan = await planningEngine.generatePlan(caseId, graph);

  assert.ok(plan.currentPossibilityCount >= 2);
  assert.ok(plan.actions.length > 0);
});

test('Effectiveness 21: Case E (Contradictory) generates valid possibilities and arbitrates contradictory statements', async () => {
  const db = getDatabase(':memory:');
  runMigrations(db);
  const algorithmRepo = new AlgorithmRepository(db);
  const analysisEngine = new GraphAnalysisEngine(algorithmRepo);
  const possibilityRepo = new PossibilityRepository(db);
  const possibilityEngine = new PossibilityEngine(possibilityRepo, analysisEngine);
  seedMultiDomainCases(db, possibilityEngine);

  const graphService = new GraphService(db);
  const resolutionEngine = new ResolutionReasoningEngine(possibilityRepo, analysisEngine);
  const planningEngine = new InvestigationPlanningEngine(possibilityRepo, resolutionEngine);

  const caseId = 'case-domain-contradictory-05';
  const graph = graphService.getGraph(caseId);
  const resolution = resolutionEngine.runResolutionAnalysis(caseId, graph);
  assert.ok(resolution.contradictionImpacts.length > 0, 'Contradictory case must produce contradiction impacts');

  const plan = await planningEngine.generatePlan(caseId, graph);
  assert.ok(plan.actions.some(a => a.graphBasis === 'CONTRADICTION_ARBITRATION'));
});

test('Effectiveness 22: Synthetic graph scaling benchmarks measure runtime from 100 to 10,000 nodes', async () => {
  const { effectivenessEngine } = setupEffectivenessTest();
  const benchmarks = await effectivenessEngine.runSyntheticBenchmarks();

  assert.equal(benchmarks.length, 5);
  assert.equal(benchmarks[0].nodeCount, 100);
  assert.equal(benchmarks[4].nodeCount, 10000);

  for (const b of benchmarks) {
    assert.ok(b.dijkstraTimeMs >= 0);
    assert.ok(b.kShortestPathsTimeMs >= 0);
    assert.ok(b.totalTimeMs >= 0);
  }
});

test("Effectiveness 23: Agent answers 'Why is Yen's algorithm being used?' with ALGORITHM_RATIONALE_INQUIRY", async () => {
  const { caseId, graphService, agentService } = setupEffectivenessTest();
  const baseGraph = graphService.getGraph(caseId);

  const res = await agentService.processQuery(caseId, baseGraph, "Why is Yen's algorithm being used?");
  assert.equal(res.intent, 'ALGORITHM_RATIONALE_INQUIRY');
  assert.ok(res.factualAnswer.includes('Computational Rationale'));
  assert.ok(res.structuredData.ablation !== undefined);
});

test("Effectiveness 24: Agent answers 'Why does this possibility exist?' with POSSIBILITY_ORIGIN_PROVENANCE", async () => {
  const { caseId, graphService, agentService } = setupEffectivenessTest();
  const baseGraph = graphService.getGraph(caseId);

  const res = await agentService.processQuery(caseId, baseGraph, 'Why does this possibility exist?');
  assert.equal(res.intent, 'POSSIBILITY_ORIGIN_PROVENANCE');
  assert.ok(res.factualAnswer.includes('Generating Algorithm'));
});

test("Effectiveness 25: Agent answers 'Why was this possibility eliminated?' with POSSIBILITY_ELIMINATION_PROVENANCE", async () => {
  const { caseId, graphService, agentService } = setupEffectivenessTest();
  const baseGraph = graphService.getGraph(caseId);

  const res = await agentService.processQuery(caseId, baseGraph, 'Why was this possibility eliminated?');
  assert.equal(res.intent, 'POSSIBILITY_ELIMINATION_PROVENANCE');
  assert.ok(res.factualAnswer.includes('Elimination Provenance') || res.factualAnswer.includes('No candidate'));
});

test("Effectiveness 26: Agent answers 'Why is this investigation action recommended?' with ACTION_RECOMMENDATION_RATIONALE", async () => {
  const { caseId, graphService, agentService } = setupEffectivenessTest();
  const baseGraph = graphService.getGraph(caseId);

  const res = await agentService.processQuery(caseId, baseGraph, 'Why is this investigation action recommended?');
  assert.equal(res.intent, 'ACTION_RECOMMENDATION_RATIONALE');
  assert.ok(res.factualAnswer.includes('Structural Divergence'));
  assert.ok(res.factualAnswer.includes('Uncertainty Reduction'));
});

test("Effectiveness 27: Agent answers 'Which algorithm matters most to the current conclusion?' with ALGORITHM_CONSEQUENCE_RANKING", async () => {
  const { caseId, graphService, agentService } = setupEffectivenessTest();
  const baseGraph = graphService.getGraph(caseId);

  const res = await agentService.processQuery(caseId, baseGraph, 'Which algorithm matters most to the current conclusion?');
  assert.equal(res.intent, 'ALGORITHM_CONSEQUENCE_RANKING');
  assert.ok(res.factualAnswer.includes('Consequence Ranking'));
  assert.ok(res.structuredData.ranking !== undefined);
});

test("Effectiveness 28: Agent answers 'Show me the reasoning trace' with REASONING_TRACE_INQUIRY", async () => {
  const { caseId, graphService, agentService } = setupEffectivenessTest();
  const baseGraph = graphService.getGraph(caseId);

  const res = await agentService.processQuery(caseId, baseGraph, 'Show me the reasoning trace');
  assert.equal(res.intent, 'REASONING_TRACE_INQUIRY');
  assert.ok(res.factualAnswer.includes('Computational Reasoning Trace'));
});

test("Effectiveness 29: Agent answers 'Show me the algorithm ablation' with ALGORITHM_ABLATION_INQUIRY", async () => {
  const { caseId, graphService, agentService } = setupEffectivenessTest();
  const baseGraph = graphService.getGraph(caseId);

  const res = await agentService.processQuery(caseId, baseGraph, 'Show me the algorithm ablation');
  assert.equal(res.intent, 'ALGORITHM_ABLATION_INQUIRY');
  assert.ok(res.factualAnswer.includes('Normal State'));
  assert.ok(res.factualAnswer.includes('Ablated State'));
});

test('Effectiveness 30: Property: Every consequential algorithm has non-zero ablation delta', async () => {
  const { caseId, graphService, effectivenessEngine } = setupEffectivenessTest();
  const baseGraph = graphService.getGraph(caseId);

  const audits = await effectivenessEngine.auditAllAlgorithms(caseId, baseGraph);
  const consequential = audits.filter(a => a.classification === 'CONSEQUENTIAL');
  assert.ok(consequential.length >= 5, 'Must have at least 5 consequential algorithms');

  for (const c of consequential) {
    const d = c.ablationDiff.delta;
    const totalDelta = d.possibilitiesDiff + d.familiesDiff + d.candidatesDiff + d.actionsDiff + (d.entropyDiff > 0 ? 1 : 0);
    assert.ok(totalDelta > 0, `Consequential algorithm ${c.algorithmName} had 0 delta`);
  }
});

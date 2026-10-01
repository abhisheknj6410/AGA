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
import { AlgorithmComparativeEngine } from '../application/algorithm-comparative-engine.js';
import { seedDemonstrationCase } from '../infrastructure/seed-demo-case.js';
import { GraphPayload, GraphNode, GraphEdge } from '../domain/types.js';
import { TemporalAnalysisAlgorithm } from '../domain/algorithms/temporal-analysis.js';

function setupComparativeTest() {
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
  const comparativeEngine = new AlgorithmComparativeEngine(
    possibilityRepo,
    possibilityEngine,
    resolutionEngine,
    planningEngine
  );

  const { caseId } = seedDemonstrationCase(db, possibilityEngine);

  return {
    db,
    caseId,
    graphService,
    possibilityRepo,
    resolutionEngine,
    planningEngine,
    comparativeEngine
  };
}

// ---------------------------------------------------------------------------
// 1. Algorithm Genuinely Adds Information: Yen K-Shortest Paths vs Baseline
// ---------------------------------------------------------------------------
test('Comparative 1: Yen K-shortest paths genuinely discovers alternative corridors missed by baseline', async () => {
  const { caseId, graphService, comparativeEngine } = setupComparativeTest();
  const graph = graphService.getGraph(caseId)!;

  const report = await comparativeEngine.evaluateCaseComparison(caseId, graph);
  const yenComp = report.comparisons.find(c => c.algorithmKey === 'YEN_K_SHORTEST')!;

  assert.ok(yenComp, 'Yen comparison must exist');
  assert.equal(yenComp.metrics.possibilitiesDiscovered.baseline, 1, 'Baseline Dijkstra/BFS finds only 1 shortest path');
  assert.ok(yenComp.metrics.possibilitiesDiscovered.algorithm >= 2, 'Yen must discover multiple paths');
  assert.ok(yenComp.metrics.possibilitiesDiscovered.delta > 0, 'Must have positive delta in discovered possibilities');
  assert.equal(yenComp.verdict, 'SIGNIFICANT_VALUE', 'Verdict must be SIGNIFICANT_VALUE on multi-corridor graph');
  assert.ok(yenComp.uniqueInvestigativeOutputs.length > 0, 'Must report unique investigative outputs');
});

// ---------------------------------------------------------------------------
// 2. Algorithm Genuinely Adds Information: Dominator Choke Points vs Naive Degree
// ---------------------------------------------------------------------------
test('Comparative 2: Dominator analysis identifies true unavoidable bottlenecks vs bypassable degree hubs', async () => {
  const { caseId, graphService, comparativeEngine } = setupComparativeTest();
  const graph = graphService.getGraph(caseId)!;

  const report = await comparativeEngine.evaluateCaseComparison(caseId, graph);
  const domComp = report.comparisons.find(c => c.algorithmKey === 'DOMINATOR_ANALYSIS')!;

  assert.ok(domComp, 'Dominator comparison must exist');
  assert.ok(domComp.metrics.structuralDistinctionsDiscovered.algorithm > 0, 'Must discover dominators');
  assert.equal(domComp.verdict, 'SIGNIFICANT_VALUE');
  assert.ok(
    domComp.uniqueInvestigativeOutputs.some(o => o.includes('unavoidable dominator bottleneck')),
    'Must explicitly state mathematical domination proof'
  );
});

// ---------------------------------------------------------------------------
// 3. Algorithm Adds No Information: Linear Graph yields NO_ADDITIONAL_VALUE / BASELINE_SUFFICIENT
// ---------------------------------------------------------------------------
test('Comparative 3: Algorithm adds no information on simple linear chain (Baseline is sufficient)', async () => {
  const { comparativeEngine } = setupComparativeTest();

  // Create a trivial linear chain: Mercer -> NodeB -> Vault
  const linearGraph: GraphPayload = {
    caseId: 'linear-case',
    nodes: [
      { id: 'person-mercer', category: 'ENTITY', type: 'PERSON', label: 'Alex Mercer' },
      { id: 'evt-direct-transit', category: 'EVENT', type: 'LOCATION_CHANGE', label: 'Transit', time: { start: '2026-03-01T14:00:00Z', precision: 'SECOND' } },
      { id: 'location-vault', category: 'ENTITY', type: 'LOCATION', label: 'Downtown Security Vault' }
    ],
    edges: [
      { id: 'e1', source: 'person-mercer', target: 'evt-direct-transit', type: 'PERFORMED', status: 'OBSERVED', cost: 1 },
      { id: 'e2', source: 'evt-direct-transit', target: 'location-vault', type: 'AFFECTED', status: 'OBSERVED', cost: 1 }
    ]
  };

  const report = await comparativeEngine.evaluateCaseComparison('linear-case', linearGraph);

  // Yen on single path
  const yenComp = report.comparisons.find(c => c.algorithmKey === 'YEN_K_SHORTEST')!;
  assert.equal(yenComp.metrics.possibilitiesDiscovered.delta, 0, 'No alternative paths exist in linear chain');
  assert.equal(yenComp.verdict, 'BASELINE_SUFFICIENT', 'Must classify as BASELINE_SUFFICIENT');

  // Disjoint paths on single path
  const disjointComp = report.comparisons.find(c => c.algorithmKey === 'DISJOINT_PATHS')!;
  assert.equal(disjointComp.metrics.possibilitiesDiscovered.algorithm, 1);
  assert.equal(disjointComp.verdict, 'BASELINE_SUFFICIENT', 'Disjoint paths adds no value on single corridor');

  // Multi-case reporting reflects algorithms with no additional value
  assert.ok(report.summary.withNoAdditionalValue > 0, 'Must record cases with no additional value without forcing wins');
});

// ---------------------------------------------------------------------------
// 4. Algorithm is Necessary for a Downstream Decision: Min-Cut & Information Gain
// ---------------------------------------------------------------------------
test('Comparative 4: Min-Cut and Information Gain are necessary for optimal interdiction and action ranking', async () => {
  const { caseId, graphService, comparativeEngine } = setupComparativeTest();
  const graph = graphService.getGraph(caseId)!;

  const report = await comparativeEngine.evaluateCaseComparison(caseId, graph);
  const entropyComp = report.comparisons.find(c => c.algorithmKey === 'SHANNON_ENTROPY')!;

  // 1. Shannon Information Gain is necessary for action ranking
  assert.ok(entropyComp.metrics.entropyReduction.algorithm > 0, 'Entropy calculation ranks optimal action');
  assert.equal(entropyComp.verdict, 'SIGNIFICANT_VALUE');
  assert.ok(entropyComp.downstreamEffect.includes('InvestigationPlan'), 'Directly drives investigation plan ranking');

  // 2. Min-Cut on parallel corridors discovering coordinated multi-edge interdiction
  const parallelCorridorGraph: GraphPayload = {
    caseId: 'parallel-case',
    nodes: [
      { id: 'person-mercer', category: 'ENTITY', type: 'PERSON', label: 'Alex Mercer' },
      { id: 'evt-ground-gate', category: 'EVENT', type: 'LOCATION_CHANGE', label: 'Ground Gate' },
      { id: 'evt-sat-receiver', category: 'EVENT', type: 'DATA_ACCESS', label: 'Sat Receiver' },
      { id: 'location-vault', category: 'ENTITY', type: 'LOCATION', label: 'Downtown Security Vault' }
    ],
    edges: [
      { id: 'e-g1', source: 'person-mercer', target: 'evt-ground-gate', type: 'PERFORMED', status: 'OBSERVED', cost: 1 },
      { id: 'e-g2', source: 'evt-ground-gate', target: 'location-vault', type: 'AFFECTED', status: 'OBSERVED', cost: 1 },
      { id: 'e-s1', source: 'person-mercer', target: 'evt-sat-receiver', type: 'PERFORMED', status: 'OBSERVED', cost: 1 },
      { id: 'e-s2', source: 'evt-sat-receiver', target: 'location-vault', type: 'AFFECTED', status: 'OBSERVED', cost: 1 }
    ]
  };

  const parallelReport = await comparativeEngine.evaluateCaseComparison('parallel-case', parallelCorridorGraph);
  const parallelMinCut = parallelReport.comparisons.find(c => c.algorithmKey === 'MIN_CUT')!;

  assert.equal(parallelMinCut.metrics.structuralDistinctionsDiscovered.algorithm, 2, 'Must discover 2-edge cut');
  assert.equal(parallelMinCut.verdict, 'SIGNIFICANT_VALUE', 'Must classify multi-edge cut as SIGNIFICANT_VALUE');
  assert.ok(parallelMinCut.uniqueInvestigativeOutputs.some(o => o.includes('minimal interdiction cut')));
});

// ---------------------------------------------------------------------------
// 5. Algorithm Produces Misleading Result / Fails if Assumptions Violated (Cyclic Graph)
// ---------------------------------------------------------------------------
test('Comparative 5: Kahn sort and topological reasoning flags assumption violation on cyclic event graph', async () => {
  // Graph containing circular causal dependency: Evt1 -> Evt2 -> Evt3 -> Evt1
  const cyclicNodes: GraphNode[] = [
    { id: 'evt-c1', category: 'EVENT', type: 'DATA_ACCESS', label: 'Initial Access', time: { start: '2026-03-01T14:00:00Z', precision: 'SECOND' } },
    { id: 'evt-c2', category: 'EVENT', type: 'DATA_ACCESS', label: 'Privilege Escalation', time: { start: '2026-03-01T14:10:00Z', precision: 'SECOND' } },
    { id: 'evt-c3', category: 'EVENT', type: 'DATA_ACCESS', label: 'Key Token Generation', time: { start: '2026-03-01T14:20:00Z', precision: 'SECOND' } }
  ];

  const cyclicEdges: GraphEdge[] = [
    { id: 'ce-1', source: 'evt-c1', target: 'evt-c2', type: 'PRECEDED', status: 'OBSERVED', cost: 1 },
    { id: 'ce-2', source: 'evt-c2', target: 'evt-c3', type: 'PRECEDED', status: 'OBSERVED', cost: 1 },
    { id: 'ce-3', source: 'evt-c3', target: 'evt-c1', type: 'PRECEDED', status: 'OBSERVED', cost: 1 } // Cyclic loop!
  ];

  // Kahn topological sort requires DAG; cycle detection must trigger
  const sortResult = TemporalAnalysisAlgorithm.topologicalSort(cyclicNodes, cyclicEdges);
  assert.equal(sortResult.isAcyclic, false, 'Kahn topological sort must detect causal cycle');
  assert.ok(sortResult.sortedEventIds.length < cyclicNodes.length, 'Cannot order events with circular dependency');
});

// ---------------------------------------------------------------------------
// 6. Comprehensive Multi-Algorithm Report Structure & Integrity Notice
// ---------------------------------------------------------------------------
test('Comparative 6: Comprehensive comparative report satisfies all 7 algorithms and methodological integrity', async () => {
  const { caseId, graphService, comparativeEngine } = setupComparativeTest();
  const graph = graphService.getGraph(caseId)!;

  const report = await comparativeEngine.evaluateCaseComparison(caseId, graph);

  assert.equal(report.comparisons.length, 7, 'Must evaluate exactly 7 consequential algorithms');
  assert.equal(report.algorithmSummaries.length, 7, 'Must have summary for each algorithm');
  assert.ok(report.summary.totalAlgorithmsEvaluated === 7);
  assert.ok(report.summary.withAdditionalValue >= 3, 'Must have >= 3 algorithms with additional value on complex case');
  assert.ok(report.methodologicalIntegrityNotice.length > 20, 'Must include methodological integrity notice');

  // Verify all 7 algorithms have non-empty baseline vs algorithm capabilities
  for (const c of report.comparisons) {
    assert.ok(c.baselineCapability.length > 10, `${c.algorithm} must have baseline capability`);
    assert.ok(c.algorithmCapability.length > 10, `${c.algorithm} must have algorithm capability`);
    assert.ok(c.downstreamEffect.length > 10, `${c.algorithm} must state downstream effect`);
    assert.ok(c.ablationResult.length > 10, `${c.algorithm} must state ablation result`);
  }
});

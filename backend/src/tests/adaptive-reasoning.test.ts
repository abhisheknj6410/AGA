import test from 'node:test';
import assert from 'node:assert/strict';
import { GraphTopologyGenerator } from '../application/graph-topology-generator.js';
import { GraphFingerprintEngine } from '../application/graph-fingerprint-engine.js';
import { AdaptiveReasoningEngine } from '../application/adaptive-reasoning-engine.js';

// ---------------------------------------------------------------------------
// 1. Structural Fingerprint Extraction Verification
// ---------------------------------------------------------------------------
test('Adaptive 1: Structural fingerprint accurately extracts topological properties without name hints', () => {
  const linearTopo = GraphTopologyGenerator.generateLinearChain();
  const fpLinear = GraphFingerprintEngine.analyze(linearTopo.graph, linearTopo.sourceNodeId, linearTopo.targetNodeId);
  assert.equal(fpLinear.isLinearChain, true, 'Linear chain must be identified');
  assert.equal(fpLinear.hasBranching, false, 'Linear chain must not branch');
  assert.equal(fpLinear.pathCountBound, 1, 'Linear chain must have path count bound = 1');

  const discTopo = GraphTopologyGenerator.generateDisconnectedIslands();
  const fpDisc = GraphFingerprintEngine.analyze(discTopo.graph, discTopo.sourceNodeId, discTopo.targetNodeId);
  assert.equal(fpDisc.isDisconnected, true, 'Disconnected islands must be identified');
  assert.equal(fpDisc.sourceReachableTarget, false, 'Target must not be reachable');

  const cyclicTopo = GraphTopologyGenerator.generateCyclicParadox();
  const fpCyclic = GraphFingerprintEngine.analyze(cyclicTopo.graph, cyclicTopo.sourceNodeId, cyclicTopo.targetNodeId);
  assert.equal(fpCyclic.hasCycles, true, 'Cyclic paradox must be identified');
  assert.ok(fpCyclic.detectedCycleCount >= 1, 'Cycle count must be >= 1');

  const tempTopo = GraphTopologyGenerator.generateTemporalConflict();
  const fpTemp = GraphFingerprintEngine.analyze(tempTopo.graph, tempTopo.sourceNodeId, tempTopo.targetNodeId);
  assert.equal(fpTemp.hasTemporalInversions, true, 'Temporal inversion must be identified');
  assert.ok(fpTemp.temporalViolationCount >= 1, 'Temporal violation count must be >= 1');

  const corridorTopo = GraphTopologyGenerator.generateParallelCorridors();
  const fpCorridor = GraphFingerprintEngine.analyze(corridorTopo.graph, corridorTopo.sourceNodeId, corridorTopo.targetNodeId);
  assert.equal(fpCorridor.hasParallelCorridors, true, 'Parallel corridors must be identified');
  assert.ok(fpCorridor.pathCountBound >= 3, 'Must identify >= 3 candidate corridors');

  const funnelTopo = GraphTopologyGenerator.generateConvergingFunnel();
  const fpFunnel = GraphFingerprintEngine.analyze(funnelTopo.graph, funnelTopo.sourceNodeId, funnelTopo.targetNodeId);
  assert.equal(fpFunnel.hasConvergence, true, 'Convergence must be identified');
  assert.ok(fpFunnel.bottleneckCandidates.length >= 1, 'Bottleneck candidate must be identified');
});

// ---------------------------------------------------------------------------
// 2. Deterministic Algorithm Gating Verification
// ---------------------------------------------------------------------------
test('Adaptive 2: Adaptive selection gates algorithms based on empirical graph need', () => {
  // A. Linear Chain should skip heavy algorithms
  const linearTopo = GraphTopologyGenerator.generateLinearChain();
  const reportLinear = AdaptiveReasoningEngine.analyzeAndExecute(
    linearTopo.graph,
    linearTopo.id,
    linearTopo.id,
    linearTopo.name,
    linearTopo.sourceNodeId,
    linearTopo.targetNodeId
  );
  const linearDecisions = reportLinear.decisions;

  const yenDecision = linearDecisions.find(d => d.algorithmKey === 'YEN_K_SHORTEST')!;
  assert.equal(yenDecision.applicable, false, 'Yen must be skipped on linear chain');

  const minCutDecision = linearDecisions.find(d => d.algorithmKey === 'MIN_CUT')!;
  assert.equal(minCutDecision.applicable, false, 'Min-Cut must be skipped on linear chain');

  const domDecision = linearDecisions.find(d => d.algorithmKey === 'DOMINATOR_ANALYSIS')!;
  assert.equal(domDecision.applicable, false, 'Dominators must be skipped on linear chain');

  assert.ok(reportLinear.comparison.adaptiveExecution.algorithmsSkipped >= 5, 'Linear chain must safely skip >= 5 algorithms');

  // B. Parallel Corridors should execute multi-corridor algorithms
  const corridorTopo = GraphTopologyGenerator.generateParallelCorridors();
  const reportCorridor = AdaptiveReasoningEngine.analyzeAndExecute(
    corridorTopo.graph,
    corridorTopo.id,
    corridorTopo.id,
    corridorTopo.name,
    corridorTopo.sourceNodeId,
    corridorTopo.targetNodeId
  );
  const corridorDecisions = reportCorridor.decisions;

  assert.equal(corridorDecisions.find(d => d.algorithmKey === 'YEN_K_SHORTEST')!.applicable, true);
  assert.equal(corridorDecisions.find(d => d.algorithmKey === 'MIN_CUT')!.applicable, true);
  assert.equal(corridorDecisions.find(d => d.algorithmKey === 'DISJOINT_PATHS')!.applicable, true);
  assert.equal(corridorDecisions.find(d => d.algorithmKey === 'SHANNON_ENTROPY')!.applicable, true);

  // C. Disconnected Islands should skip path algorithms
  const discTopo = GraphTopologyGenerator.generateDisconnectedIslands();
  const reportDisc = AdaptiveReasoningEngine.analyzeAndExecute(
    discTopo.graph,
    discTopo.id,
    discTopo.id,
    discTopo.name,
    discTopo.sourceNodeId,
    discTopo.targetNodeId
  );
  assert.equal(reportDisc.comparison.adaptiveExecution.algorithmsSkipped, 7, 'Disconnected graph must skip path-dependent algorithms');
});

// ---------------------------------------------------------------------------
// 3. Execution Trace Tracing
// ---------------------------------------------------------------------------
test('Adaptive 3: Algorithm execution trace records 5-stage downstream chain', () => {
  const corridorTopo = GraphTopologyGenerator.generateParallelCorridors();
  const report = AdaptiveReasoningEngine.analyzeAndExecute(
    corridorTopo.graph,
    corridorTopo.id,
    corridorTopo.id,
    corridorTopo.name,
    corridorTopo.sourceNodeId,
    corridorTopo.targetNodeId
  );

  assert.ok(report.trace.length >= 3, 'Trace must capture executed algorithm stages');
  for (const step of report.trace) {
    assert.ok(step.stage >= 1, 'Stage must be positive integer');
    assert.ok(step.graphProperty.length > 0, 'Must record triggering graph property');
    assert.ok(step.algorithmSelected.length > 0, 'Must record selected algorithm');
    assert.ok(step.resultConsumedBy.length > 0, 'Must record downstream consumer component');
    assert.ok(step.downstreamDecisionChanged.length > 0, 'Must record concrete investigative consequence');
  }
});

// ---------------------------------------------------------------------------
// 4. Critical Equivalence Safety Guarantee Across All Topologies
// ---------------------------------------------------------------------------
test('Adaptive 4: Adaptive pipeline guarantees 100% equivalence across all 12 benchmark topologies', () => {
  const topologies = GraphTopologyGenerator.generateAll();

  for (const topo of topologies) {
    const report = AdaptiveReasoningEngine.analyzeAndExecute(
      topo.graph,
      topo.id,
      topo.id,
      topo.name,
      topo.sourceNodeId,
      topo.targetNodeId
    );

    const eq = report.comparison.equivalence;
    assert.equal(
      eq.regressionStatus,
      'EQUIVALENCE_PRESERVED',
      `Topology ${topo.name} must preserve equivalence without regression. Discrepancies: ${eq.discrepancies.join(', ')}`
    );
    assert.equal(eq.isEquivalent, true);
    assert.equal(eq.possibilityCountMatch, true);
    assert.equal(eq.resolutionCandidateMatch, true);
    assert.equal(eq.investigationActionMatch, true);
    assert.equal(eq.entropyMatch, true);
  }
});

// ---------------------------------------------------------------------------
// 5. Regression Flagging Detection
// ---------------------------------------------------------------------------
test('Adaptive 5: Equivalence verification rigorously flags ADAPTIVE_REGRESSION on mismatched outcomes', () => {
  // Synthetically verify that the equivalence engine correctly flags ADAPTIVE_REGRESSION when results diverge
  const fakeFull = {
    algorithmsExecuted: 7,
    algorithmsSkipped: 0,
    totalRuntimeMs: 15.0,
    executedKeys: ['YEN_K_SHORTEST'],
    skippedKeys: [],
    possibilitiesDiscovered: 4,
    resolutionCandidatesGenerated: 2,
    investigationActionsRanked: 4,
    entropyCalculated: 2.0
  };

  const fakeAdaptiveDivergent = {
    algorithmsExecuted: 3,
    algorithmsSkipped: 4,
    totalRuntimeMs: 5.0,
    executedKeys: ['YEN_K_SHORTEST'],
    skippedKeys: ['STRUCTURAL_FAMILIES'],
    possibilitiesDiscovered: 4,
    resolutionCandidatesGenerated: 1, // Divergence!
    investigationActionsRanked: 4,
    entropyCalculated: 2.0
  };

  // Run internal verification logic
  const verification = (AdaptiveReasoningEngine as any).verifyEquivalence(fakeFull, fakeAdaptiveDivergent, {} as any);
  assert.equal(verification.isEquivalent, false);
  assert.equal(verification.regressionStatus, 'ADAPTIVE_REGRESSION');
  assert.ok(verification.discrepancies.some((d: string) => d.includes('Resolution candidate discrepancy')));
});

// ---------------------------------------------------------------------------
// 6. Computational Efficiency Savings
// ---------------------------------------------------------------------------
test('Adaptive 6: Adaptive execution delivers significant computational reduction on sparse & linear graphs', () => {
  const linearTopo = GraphTopologyGenerator.generateLinearChain();
  const reportLinear = AdaptiveReasoningEngine.analyzeAndExecute(
    linearTopo.graph,
    linearTopo.id,
    linearTopo.id,
    linearTopo.name,
    linearTopo.sourceNodeId,
    linearTopo.targetNodeId
  );

  assert.ok(
    reportLinear.comparison.adaptiveExecution.algorithmsSkipped >= 5,
    'Must skip >= 5 algorithms on linear chain'
  );
  assert.ok(
    reportLinear.comparison.efficiencySavingsPercent >= 50,
    'Must save >= 50% compute on linear chain'
  );

  const discTopo = GraphTopologyGenerator.generateDisconnectedIslands();
  const reportDisc = AdaptiveReasoningEngine.analyzeAndExecute(
    discTopo.graph,
    discTopo.id,
    discTopo.id,
    discTopo.name,
    discTopo.sourceNodeId,
    discTopo.targetNodeId
  );
  assert.equal(reportDisc.comparison.adaptiveExecution.algorithmsSkipped, 7);
  assert.equal(reportDisc.comparison.efficiencySavingsPercent, 100);
});

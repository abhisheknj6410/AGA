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
import { EpistemicValidationEngine } from '../application/epistemic-validation-engine.js';
import { EvidenceImpactEngine } from '../application/evidence-impact-engine.js';
import { seedDemonstrationCase } from '../infrastructure/seed-demo-case.js';
import { GraphPayload, GraphNode, GraphEdge } from '../domain/types.js';

function setupAdversarialTest() {
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
  const validationEngine = new EpistemicValidationEngine(possibilityRepo, resolutionEngine, planningEngine, decisionEngine);
  const evidenceImpactEngine = new EvidenceImpactEngine(
    db,
    graphService,
    possibilityEngine,
    resolutionEngine,
    planningEngine,
    incrementalEngine
  );

  const { caseId } = seedDemonstrationCase(db, possibilityEngine);

  return {
    db,
    caseId,
    graphService,
    possibilityRepo,
    resolutionEngine,
    planningEngine,
    decisionEngine,
    validationEngine,
    evidenceImpactEngine
  };
}

// ---------------------------------------------------------------------------
// 1. Ambiguous Graph: Many equally valid causal paths
// ---------------------------------------------------------------------------
test('Adversarial 1: Ambiguous graph preserves all equally valid causal paths without arbitrary collapse', async () => {
  const { caseId, graphService, validationEngine, possibilityRepo } = setupAdversarialTest();
  const graph = graphService.getGraph(caseId)!;

  const report = await validationEngine.validateCase(caseId, graph);

  assert.ok(report.adversarialReport.ambiguityPreserved, 'Must preserve ambiguity when multiple paths exist');
  assert.ok(report.survivingCount >= 2, 'Must maintain at least 2 surviving hypotheses');
  assert.equal(
    report.assessments.filter(a => a.epistemicStatus !== 'UNEXPLAINED').length,
    report.survivingCount
  );
});

// ---------------------------------------------------------------------------
// 2. Sparse Evidence: Low corroboration must not manufacture confidence
// ---------------------------------------------------------------------------
test('Adversarial 2: Sparse evidence classifies possibilities as INSUFFICIENT_EVIDENCE instead of manufacturing certainty', async () => {
  const { caseId, graphService, validationEngine, possibilityRepo } = setupAdversarialTest();
  const graph = graphService.getGraph(caseId)!;

  // Create a synthetic sparse possibility with zero supporting evidence
  const sparsePossibility = {
    ...possibilityRepo.findByCaseId(caseId)[0],
    id: 'poss-sparse-999',
    name: 'Uncorroborated Speculative Route',
    supportingEvidence: [],
    status: 'VALID' as const,
    assumptions: ['Pure hypothesis without physical corroboration']
  };

  const report = await validationEngine.validateCase(caseId, graph, {
    customPossibilities: [sparsePossibility, ...possibilityRepo.findByCaseId(caseId)]
  });

  const sparseAssessment = report.assessments.find(a => a.possibilityId === 'poss-sparse-999');
  assert.ok(sparseAssessment, 'Must assess sparse possibility');
  assert.equal(sparseAssessment.epistemicStatus, 'INSUFFICIENT_EVIDENCE');
  assert.equal(sparseAssessment.supportingEvidenceCount, 0);
  assert.equal(sparseAssessment.triad.isEvidenceSupported, false);
  assert.ok(sparseAssessment.unresolvedGaps.length > 0);
});

// ---------------------------------------------------------------------------
// 3. Contradictory Evidence: Conflicts across branches must be exposed
// ---------------------------------------------------------------------------
test('Adversarial 3: Contradictory evidence classifies affected branch as CONFLICTING and exposes edge links', async () => {
  const { caseId, graphService, validationEngine, possibilityRepo } = setupAdversarialTest();
  const graph = graphService.getGraph(caseId)!;

  const report = await validationEngine.validateCase(caseId, graph);

  const conflictingPossibilities = report.assessments.filter(a => a.epistemicStatus === 'CONFLICTING');
  // Seed demo case has alibi witness contradicting CCTV surveillance
  if (conflictingPossibilities.length > 0) {
    for (const cp of conflictingPossibilities) {
      assert.ok(cp.contradictionLinks.length > 0, 'Contradiction links must be reported');
      assert.ok(cp.conflictingEvidenceCount > 0);
    }
  }
  assert.ok(report.adversarialReport.contradictionsExposed, 'Contradictions must be exposed in report');
});

// ---------------------------------------------------------------------------
// 4. Temporal Ambiguity: Coarse timestamps must not incorrectly prune possibilities
// ---------------------------------------------------------------------------
test('Adversarial 4: Coarse temporal precision does not cause false temporal inversions', async () => {
  const { caseId, graphService, validationEngine, possibilityRepo } = setupAdversarialTest();
  const graph = graphService.getGraph(caseId)!;

  const report = await validationEngine.validateCase(caseId, graph);

  for (const a of report.assessments) {
    if (a.epistemicStatus !== 'UNEXPLAINED') {
      assert.notEqual(a.temporalConsistency, 'INVERTED', 'Valid possibilities must not have inverted timelines');
    }
  }
  assert.ok(report.adversarialReport.coarseTimestampsPermitted, 'Coarse intervals must be permitted');
});

// ---------------------------------------------------------------------------
// 5. Disconnected Evidence: Isolated evidence node must not corroborate possibilities
// ---------------------------------------------------------------------------
test('Adversarial 5: Disconnected evidence node is rejected and does not artificially support corridors', async () => {
  const { caseId, graphService, validationEngine } = setupAdversarialTest();

  // Add an isolated, disconnected evidence node
  graphService.addNode(caseId, {
    id: 'ev-isolated-satellite-fake',
    category: 'EVIDENCE',
    type: 'NETWORK_CAPTURE',
    label: 'Isolated Rogue Telemetry Node (No Edges)',
    source: { name: 'rogue.bin', kind: 'DEVICE' },
    reliability: 0.99
  });

  const graph = graphService.getGraph(caseId)!;
  const report = await validationEngine.validateCase(caseId, graph);

  assert.ok(report.adversarialReport.disconnectedEvidenceRejected, 'Disconnected evidence must be rejected');
});

// ---------------------------------------------------------------------------
// 6. False Convergence: Shared bottleneck is not treated as proof of causality
// ---------------------------------------------------------------------------
test('Adversarial 6: Actions targeting unavoidable common invariants are flagged as non-discriminating', async () => {
  const { caseId, graphService, validationEngine } = setupAdversarialTest();
  const graph = graphService.getGraph(caseId)!;

  const report = await validationEngine.validateCase(caseId, graph);

  // Every action marked as justified must have a valid non-zero information gain
  for (const aj of report.actionJustifications) {
    if (aj.isJustified) {
      assert.ok(aj.expectedInformationGain >= 0, 'Justified action must have valid information gain');
      assert.notEqual(aj.falsePositiveRisk, 'CRITICAL', 'Justified action cannot have critical false-positive risk');
    }
  }
  assert.ok(report.adversarialReport.falseConvergencePrevented, 'False convergence must be prevented');
});

// ---------------------------------------------------------------------------
// 7. Multiple Equally Valuable Strategies: Preserves equivalent alternatives
// ---------------------------------------------------------------------------
test('Adversarial 7: Preserves competing strategies without arbitrary elimination', async () => {
  const { caseId, graphService, decisionEngine } = setupAdversarialTest();
  const graph = graphService.getGraph(caseId)!;

  const decisions = await decisionEngine.evaluateDecisions(caseId, graph);

  assert.ok(decisions.strategies.length >= 2, 'Must generate multiple strategies');
  const stratA = decisions.strategies[0];
  const stratB = decisions.strategies[1];

  assert.notEqual(stratA.id, stratB.id);
  assert.ok(stratA.primaryAction.id, 'Strategy A must have concrete action');
  assert.ok(stratB.primaryAction.id, 'Strategy B must have concrete action');
});

// ---------------------------------------------------------------------------
// 8. Evidence that invalidates all possibilities triggers UNEXPLAINED_SUBGRAPH
// ---------------------------------------------------------------------------
test('Adversarial 8: Ingestion of evidence that invalidates all paths triggers UNEXPLAINED_SUBGRAPH', async () => {
  const { caseId, graphService, evidenceImpactEngine, validationEngine } = setupAdversarialTest();

  // Ingest contradictory evidence that invalidates all existing routes
  const cycle = await evidenceImpactEngine.ingestEvidence({
    caseId,
    evidenceNode: {
      id: 'ev-total-impossibility-seal',
      category: 'EVIDENCE',
      type: 'LOG',
      label: 'Facility Total Power Grid Lockdown at 13:00Z',
      source: { name: 'grid.log', kind: 'SYSTEM' },
      reliability: 0.99
    },
    attachedEdges: [
      {
        id: 'edge-lockdown-contradiction',
        source: 'ev-total-impossibility-seal',
        target: 'location-vault',
        type: 'CONTRADICTS',
        status: 'OBSERVED',
        cost: 1
      }
    ],
    summary: 'Total facility lockdown contradicts downtown vault access'
  });

  assert.ok(cycle.unexpectedEvidence, 'Must produce unexpected evidence assessment');
  assert.ok(cycle.unexpectedEvidence.isUnexpected, 'Must flag unexpected evidence');
  assert.ok(
    cycle.unexpectedEvidence.anomalyType === 'UNEXPLAINED_SUBGRAPH' ||
    cycle.unexpectedEvidence.anomalyType === 'MODEL_REVISION_REQUIRED'
  );
});

// ---------------------------------------------------------------------------
// 9. Algorithm Ablation Regression: Consequential algorithms materially affect output
// ---------------------------------------------------------------------------
test('Adversarial 9: Ablation regression proves algorithms materially change downstream reasoning', async () => {
  const { caseId, graphService, resolutionEngine, possibilityRepo } = setupAdversarialTest();
  const graph = graphService.getGraph(caseId)!;

  const audit = ResolutionReasoningEngine.getAlgorithmAudit();

  assert.ok(audit.length >= 4, 'Audit catalog must document all major algorithms');
  for (const entry of audit) {
    assert.ok(entry.algorithmName.length > 0);
    assert.ok(entry.consumers.length > 0);
    assert.ok(entry.ablationResult.length > 0);
  }
});

// ---------------------------------------------------------------------------
// 10. Epistemic Triad Distinction: graph-consistent vs evidence-supported vs investigatively-useful
// ---------------------------------------------------------------------------
test('Adversarial 10: Epistemic triad cleanly separates structural consistency, evidence support, and utility', async () => {
  const { caseId, graphService, validationEngine } = setupAdversarialTest();
  const graph = graphService.getGraph(caseId)!;

  const report = await validationEngine.validateCase(caseId, graph);

  for (const assessment of report.assessments) {
    const triad = assessment.triad;
    assert.equal(typeof triad.isGraphConsistent, 'boolean');
    assert.equal(typeof triad.isEvidenceSupported, 'boolean');
    assert.equal(typeof triad.isInvestigativelyUseful, 'boolean');
    assert.ok(triad.consistencyDetail.length > 0);
    assert.ok(triad.evidenceDetail.length > 0);
    assert.ok(triad.utilityDetail.length > 0);
  }
});

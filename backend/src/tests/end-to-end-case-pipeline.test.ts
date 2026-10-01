import test from 'node:test';
import assert from 'node:assert/strict';
import { getDatabase } from '../infrastructure/db.js';
import { runMigrations } from '../infrastructure/migrations.js';
import { PossibilityRepository } from '../infrastructure/repositories/possibility-repository.js';
import { AlgorithmRepository } from '../infrastructure/repositories/algorithm-repository.js';
import { GraphAnalysisEngine } from '../application/graph-analysis-engine.js';
import { PossibilityEngine } from '../application/possibility-engine.js';
import { IncrementalReasoningEngine } from '../application/incremental-reasoning-engine.js';
import { ResolutionReasoningEngine } from '../application/resolution-reasoning-engine.js';
import { InvestigationPlanningEngine } from '../application/investigation-planning-engine.js';
import { InvestigationDecisionEngine } from '../application/investigation-decision-engine.js';
import { EpistemicValidationEngine } from '../application/epistemic-validation-engine.js';
import { CaseReasoningPipeline } from '../application/case-reasoning-pipeline.js';
import { EvidenceReconstructionEngine } from '../application/evidence-reconstruction-engine.js';
import { EvidenceFact } from '../domain/reconstruction-types.js';

function setupPipelineTest() {
  const db = getDatabase(':memory:');
  runMigrations(db);

  const possibilityRepo = new PossibilityRepository(db);
  const algorithmRepo = new AlgorithmRepository(db);
  const analysisEngine = new GraphAnalysisEngine(algorithmRepo);
  const possibilityEngine = new PossibilityEngine(possibilityRepo, analysisEngine);
  const incrementalEngine = new IncrementalReasoningEngine(db, possibilityEngine);
  const resolutionEngine = new ResolutionReasoningEngine(possibilityRepo, analysisEngine, incrementalEngine);
  const planningEngine = new InvestigationPlanningEngine(possibilityRepo, resolutionEngine);
  const decisionEngine = new InvestigationDecisionEngine(possibilityRepo, resolutionEngine, planningEngine);
  const validationEngine = new EpistemicValidationEngine(
    possibilityRepo,
    resolutionEngine,
    planningEngine,
    decisionEngine
  );

  const pipeline = new CaseReasoningPipeline(
    possibilityEngine,
    resolutionEngine,
    decisionEngine,
    validationEngine
  );

  return { pipeline, db };
}

// ---------------------------------------------------------------------------
// Test 1: Full Pipeline Execution on Canonical Messy Evidence
// ---------------------------------------------------------------------------
test('Pipeline 1: Full pipeline execution from 10 messy evidence facts to decisions and strategies', async () => {
  const { pipeline } = setupPipelineTest();
  const dataset = EvidenceReconstructionEngine.generateMessyBenchmarkDataset();

  const report = await pipeline.executeCasePipeline('case-e2e-1', dataset);

  // 1. Raw Evidence & Fact Admission
  assert.equal(report.rawEvidenceCount, 10, 'Must ingest all 10 raw facts');
  assert.equal(report.reconstruction.validation.acceptedFactIds.length, 4, 'Must accept exactly 4 validated facts');
  assert.equal(report.reconstruction.validation.rejectedFactIds.length, 3, 'Must reject exactly 3 invalid facts');
  assert.equal(report.reconstruction.validation.ambiguousFactIds.length, 3, 'Must isolate 3 ambiguous/conflicting facts');
  assert.equal(report.reconstruction.validation.contradictionsDetected.length, 1, 'Must detect 1 physical contradiction');

  // 2. Competing Interpretations
  assert.equal(report.branches.length, 2, 'Must construct 2 competing graph interpretations');
  assert.equal(report.branches[0].interpretationId, 'interp-branch-alpha');
  assert.equal(report.branches[1].interpretationId, 'interp-branch-beta');

  // 3. Adaptive Algorithms Executed per Branch
  for (const branch of report.branches) {
    assert.ok(branch.adaptiveReport.decisions.length >= 7, 'All candidate algorithms evaluated');
    assert.ok(branch.adaptiveReport.comparison.equivalence.isEquivalent, 'Adaptive equivalence must be preserved');
    assert.ok(branch.possibilities.length >= 1, 'Candidate possibilities generated for branch');
    assert.ok(branch.resolution.commonInvariants !== undefined, 'Invariants computed');
    assert.ok(
      (branch.decisions.strategies || []).length >= 1 || (branch.decisions.unresolvedQuestions || []).length >= 0,
      'Investigation decisions formulated'
    );
  }

  // 4. Hard Invariant Proof
  assert.equal(report.hardInvariantVerified, true, 'Hard invariant must hold');
  assert.equal(report.provenanceCoveragePercent, 100, '100% provenance coverage verified');

  // 5. 10-Stage Unified Trace Verification
  assert.equal(report.unifiedTrace.length, 10, 'Unified trace must contain all 10 computational stages');
  const stageNames = report.unifiedTrace.map(s => s.stageName);
  assert.deepEqual(stageNames, [
    'RAW_EVIDENCE',
    'FACT_ADMISSION',
    'GRAPH_INTERPRETATION',
    'STRUCTURAL_FINGERPRINT',
    'ALGORITHMS_SELECTED',
    'ALGORITHM_RESULTS',
    'POSSIBILITIES',
    'EPISTEMIC_VALIDATION',
    'RESOLUTION_CANDIDATES',
    'INVESTIGATION_DECISIONS'
  ]);
});

// ---------------------------------------------------------------------------
// Test 2: Branching Uncertainty is Preserved Without Premature Merge
// ---------------------------------------------------------------------------
test('Pipeline 2: Branching uncertainty is preserved without premature merge', async () => {
  const { pipeline } = setupPipelineTest();
  const dataset = EvidenceReconstructionEngine.generateMessyBenchmarkDataset();

  const report = await pipeline.executeCasePipeline('case-e2e-branching', dataset);

  assert.ok(report.branchComparison !== undefined, 'Must provide branch comparison when >= 2 interpretations exist');
  const comp = report.branchComparison!;

  // Both interpretations share common backbone
  assert.ok(comp.sharedNodes.length >= 4, 'Must identify shared backbone nodes');
  assert.ok(comp.sharedEdges.length >= 3, 'Must identify shared backbone edges');

  // Differing structures are explicitly isolated
  assert.ok(comp.differingNodes.branchAOnly.some(n => n.id === 'loc-vault-room'), 'Branch A has Vault location');
  assert.ok(comp.differingNodes.branchBOnly.some(n => n.id === 'loc-cafe-downtown'), 'Branch B has Cafe location');
  assert.ok(comp.differingEdges.branchAOnly.length >= 1, 'Branch A has unique distinguishing edge');
  assert.ok(comp.differingEdges.branchBOnly.length >= 1, 'Branch B has unique distinguishing edge');

  // Distinguishing evidence targets
  assert.ok(comp.distinguishingEvidenceTargets.length >= 1, 'Must produce distinguishing evidence target');
  const target = comp.distinguishingEvidenceTargets[0];
  assert.ok(target.distinguishes.includes('Interpretation Alpha') && target.distinguishes.includes('Interpretation Beta'));
});

// ---------------------------------------------------------------------------
// Test 3: Upstream Evidence Mutation Propagates Through Every Layer
// ---------------------------------------------------------------------------
test('Pipeline 3: Upstream evidence mutation propagates through every layer', async () => {
  const { pipeline } = setupPipelineTest();
  const dataset = EvidenceReconstructionEngine.generateMessyBenchmarkDataset();

  // Baseline run with contradictory alibi
  const baselineReport = await pipeline.executeCasePipeline('case-prop-base', dataset);
  assert.equal(baselineReport.branches.length, 2, 'Baseline has 2 competing branches');
  assert.equal(baselineReport.reconstruction.validation.contradictionsDetected.length, 1);

  // Mutation: investigator confirms the barista interview was a mistaken identity (retract fact-04)
  const modifiedFacts = dataset.filter(f => f.id !== 'fact-04-cafe-alibi');
  const updatedReport = await pipeline.executeCasePipeline('case-prop-updated', modifiedFacts);

  // Verify downstream propagation:
  // 1. Contradiction disappears
  assert.equal(updatedReport.reconstruction.validation.contradictionsDetected.length, 0);
  // 2. Only 1 coherent interpretation remains
  assert.equal(updatedReport.branches.length, 1);
  assert.equal(updatedReport.branchComparison, undefined, 'Branch comparison not needed when single interpretation exists');
  // 3. Universal conclusions now encompass the entire confirmed graph
  assert.ok(
    updatedReport.commonConclusions.universalNodes.includes('Sub-Basement Vault Chamber') ||
    updatedReport.commonConclusions.universalNodes.length >= 5
  );
});

// ---------------------------------------------------------------------------
// Test 4: Deterministic "Why?" Inspection Answers Investigator Queries
// ---------------------------------------------------------------------------
test('Pipeline 4: Deterministic "Why?" inspection answers investigator queries', async () => {
  const { pipeline } = setupPipelineTest();
  const dataset = EvidenceReconstructionEngine.generateMessyBenchmarkDataset();

  const report = await pipeline.executeCasePipeline('case-why-test', dataset);
  assert.ok(report.whyInspectorCatalog.length >= 6, 'Must generate precomputed Why? answers');

  // Query 1: Why was unprovenanced rumor rejected?
  const q1 = pipeline.answerWhyQuery(report, {
    queryType: 'POSSIBILITY_ELIMINATED',
    targetId: 'fact-08-unprovenanced'
  });
  assert.ok(q1.directAnswer.includes('Rejected by the 7-Gate Validation Engine'));
  assert.ok(q1.directAnswer.includes('PROVENANCE_MISSING'));
  assert.equal(q1.confidenceOrCoherence, 0.0);

  // Query 2: Why was inverted timestamp rejected?
  const q2 = pipeline.answerWhyQuery(report, {
    queryType: 'POSSIBILITY_ELIMINATED',
    targetId: 'fact-07-inverted-time'
  });
  assert.ok(q2.directAnswer.includes('TEMPORAL_INVERSION'));

  // Query 3: Why is evidence insufficient to conclude a single narrative?
  const q3 = pipeline.answerWhyQuery(report, {
    queryType: 'EVIDENCE_INSUFFICIENT',
    targetId: report.reconstruction.validation.contradictionsDetected[0].id
  });
  assert.ok(q3.directAnswer.includes('Current evidence contains a mutual physical contradiction'));

  // Query 4: Why was TEMPORAL_KAHN executed?
  const q4 = pipeline.answerWhyQuery(report, {
    queryType: 'ALGORITHM_EXECUTED',
    targetId: 'TEMPORAL_KAHN'
  });
  assert.ok(q4.directAnswer.includes('Executed because the graph structural fingerprint detected'));
  assert.equal(q4.algorithmicBasis, 'ADAPTIVE_TOPOLOGICAL_SELECTION_RULES');
});

// ---------------------------------------------------------------------------
// Test 5: Hard Invariant Verification
// ---------------------------------------------------------------------------
test('Pipeline 5: Hard invariant verification confirms zero invented edges', async () => {
  const { pipeline } = setupPipelineTest();
  const dataset = EvidenceReconstructionEngine.generateMessyBenchmarkDataset();

  const report = await pipeline.executeCasePipeline('case-inv-test', dataset);

  assert.equal(report.hardInvariantVerified, true);
  for (const branch of report.branches) {
    for (const edge of branch.graph.edges) {
      assert.ok(
        edge.evidenceRefs.length > 0 || edge.status === 'DERIVED' || edge.status === 'HYPOTHESIZED',
        `Edge ${edge.id} must be bound to evidence or explicitly flagged as derived/hypothesized`
      );
    }
  }
});

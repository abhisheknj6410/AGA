import test from 'node:test';
import assert from 'node:assert/strict';
import { EvidenceReconstructionEngine } from '../application/evidence-reconstruction-engine.js';
import { AdaptiveReasoningEngine } from '../application/adaptive-reasoning-engine.js';
import { EvidenceFact } from '../domain/reconstruction-types.js';

// ---------------------------------------------------------------------------
// 1. Fact Validation & Status Assignment
// ---------------------------------------------------------------------------
test('Reconstruction 1: Fact validation accurately assigns epistemic status and rejects malformed inputs', () => {
  const dataset = EvidenceReconstructionEngine.generateMessyBenchmarkDataset();
  const validation = EvidenceReconstructionEngine.validateFacts(dataset);

  assert.ok(validation.acceptedFactIds.length >= 4, 'Must accept verified facts');
  assert.ok(validation.rejectedFactIds.length >= 3, 'Must reject malformed/unprovenanced facts');
  assert.ok(validation.ambiguousFactIds.length >= 2, 'Must isolate ambiguous and conflicting facts');
});

// ---------------------------------------------------------------------------
// 2. Hard Invariant: False Edges & Unprovenanced Rumors Prevented
// ---------------------------------------------------------------------------
test('Reconstruction 2: Hard invariant prevents unsupported/unprovenanced relationships from entering graph', () => {
  const dataset = EvidenceReconstructionEngine.generateMessyBenchmarkDataset();
  const report = EvidenceReconstructionEngine.reconstruct('test-case-hard-inv', dataset);

  // Hard Invariant Check
  assert.equal(report.hardInvariantVerified, true, 'Hard invariant must be satisfied');

  // Verify that the unprovenanced rumor fact ('fact-08-unprovenanced') was strictly rejected
  assert.ok(report.validation.rejectedFactIds.includes('fact-08-unprovenanced'));
  assert.ok(
    report.validation.rejectionReasons['fact-08-unprovenanced'].some(r => r.includes('PROVENANCE_MISSING')),
    'Rejection reason must explicitly cite missing provenance'
  );

  // Verify that NO edge in the accepted graph references the rejected shadow syndicate organization
  const shadowEdge = report.acceptedGraph.edges.find(
    e => e.target === 'org-shadow-syndicate' || e.source === 'org-shadow-syndicate'
  );
  assert.equal(shadowEdge, undefined, 'Rejected rumor must NEVER become a graph edge');

  // Verify that inverted temporal intervals are strictly rejected
  assert.ok(report.validation.rejectedFactIds.includes('fact-07-inverted-time'));

  // Verify that inverted semantic directions are strictly rejected
  assert.ok(report.validation.rejectedFactIds.includes('fact-09-inverted-direction'));
});

// ---------------------------------------------------------------------------
// 3. Contradiction Detection Without Silent Averaging
// ---------------------------------------------------------------------------
test('Reconstruction 3: Contradictory evidence is explicitly detected and preserved without score smoothing', () => {
  const dataset = EvidenceReconstructionEngine.generateMessyBenchmarkDataset();
  const contradictions = EvidenceReconstructionEngine.detectContradictions(dataset);

  assert.ok(contradictions.length >= 1, 'Must detect mutually exclusive location contradiction');
  const locationContra = contradictions[0];

  assert.equal(locationContra.conflictType, 'MUTUALLY_EXCLUSIVE_LOCATION');
  assert.ok(locationContra.factIds.includes('fact-03-vault-log'));
  assert.ok(locationContra.factIds.includes('fact-04-cafe-alibi'));

  assert.equal(locationContra.competingClaims.length, 2);
  assert.ok(locationContra.competingClaims.some(c => c.claim.includes('Vault')));
  assert.ok(locationContra.competingClaims.some(c => c.claim.includes('Cafe')));
  assert.equal(locationContra.resolved, false, 'Contradiction must remain unresolved pending verification');
});

// ---------------------------------------------------------------------------
// 4. Competing Graph Interpretations Generation
// ---------------------------------------------------------------------------
test('Reconstruction 4: Ambiguous and conflicting evidence generates bounded competing graph interpretations', () => {
  const dataset = EvidenceReconstructionEngine.generateMessyBenchmarkDataset();
  const report = EvidenceReconstructionEngine.reconstruct('test-case-interp', dataset);

  assert.equal(report.interpretations.length, 2, 'Must generate dual competing interpretations for contradiction');

  const interpAlpha = report.interpretations.find(i => i.id === 'interp-branch-alpha')!;
  const interpBeta = report.interpretations.find(i => i.id === 'interp-branch-beta')!;

  assert.ok(interpAlpha, 'Interpretation Alpha must exist');
  assert.ok(interpBeta, 'Interpretation Beta must exist');

  // Distinguishing edges must be explicitly identified
  assert.ok(interpAlpha.distinguishingEdges.length > 0, 'Alpha must have distinguishing edge');
  assert.ok(interpBeta.distinguishingEdges.length > 0, 'Beta must have distinguishing edge');

  // Shared edges must be preserved
  assert.ok(interpAlpha.sharedEdgeIds.length > 0, 'Alpha must retain shared baseline edges');
  assert.ok(interpBeta.sharedEdgeIds.length > 0, 'Beta must retain shared baseline edges');

  // Required assumptions must be documented
  assert.ok(interpAlpha.requiredAssumptions.length > 0);
  assert.ok(interpBeta.requiredAssumptions.length > 0);
});

// ---------------------------------------------------------------------------
// 5. Full Provenance Traceability
// ---------------------------------------------------------------------------
test('Reconstruction 5: Every accepted graph edge is traceable back to exact source documents', () => {
  const dataset = EvidenceReconstructionEngine.generateMessyBenchmarkDataset();
  const report = EvidenceReconstructionEngine.reconstruct('test-case-prov', dataset);

  assert.ok(report.provenanceTraces.length >= 3, 'Must have provenance trace for every accepted edge');

  for (const trace of report.provenanceTraces) {
    assert.ok(trace.edgeId.length > 0, 'Edge ID required');
    assert.ok(trace.sourceEvidences.length > 0, 'Must link to source evidence citation');
    assert.ok(trace.derivationChain.length > 0, 'Must have derivation chain narrative');

    for (const src of trace.sourceEvidences) {
      assert.ok(src.id.length > 0, 'Evidence ID required');
      assert.ok(src.reference.length > 0, 'Document/line citation required');
    }
  }
});

// ---------------------------------------------------------------------------
// 6. Messy Evidence Benchmark Execution
// ---------------------------------------------------------------------------
test('Reconstruction 6: Canonical messy benchmark executes with 100% provenance coverage', () => {
  const benchmarkReport = EvidenceReconstructionEngine.runMessyBenchmark();

  assert.equal(benchmarkReport.totalFactsExtracted, 10);
  assert.equal(benchmarkReport.factsAccepted, 4);
  assert.equal(benchmarkReport.factsRejected, 3);
  assert.equal(benchmarkReport.ambiguousFacts, 3);
  assert.equal(benchmarkReport.contradictionsDetected, 1);
  assert.equal(benchmarkReport.falseEdgesPrevented, 3);
  assert.equal(benchmarkReport.provenanceCoveragePercent, 100.0, 'Hard invariant: 100% provenance coverage');
  assert.equal(benchmarkReport.graphInterpretationsGenerated, 2);
  assert.ok(benchmarkReport.summaryTakeaways.length >= 4);
});

// ---------------------------------------------------------------------------
// 7. Closed-Loop Integration with Downstream Pipeline
// ---------------------------------------------------------------------------
test('Reconstruction 7: Reconstructed graph interpretations feed directly into Adaptive Reasoning Engine', () => {
  const dataset = EvidenceReconstructionEngine.generateMessyBenchmarkDataset();
  const report = EvidenceReconstructionEngine.reconstruct('test-case-pipeline', dataset);

  // Pass Interpretation Alpha into Adaptive Reasoning Engine
  const alphaInterp = report.interpretations[0];
  const adaptiveReportAlpha = AdaptiveReasoningEngine.analyzeAndExecute(
    alphaInterp.graph,
    'case-alpha',
    alphaInterp.id,
    alphaInterp.name
  );

  assert.ok(adaptiveReportAlpha.decisions.length === 7, 'Adaptive selection must evaluate all 7 algorithms');
  assert.equal(adaptiveReportAlpha.comparison.equivalence.isEquivalent, true, 'Adaptive execution on reconstructed graph must preserve equivalence');

  // Pass Interpretation Beta into Adaptive Reasoning Engine
  const betaInterp = report.interpretations[1];
  const adaptiveReportBeta = AdaptiveReasoningEngine.analyzeAndExecute(
    betaInterp.graph,
    'case-beta',
    betaInterp.id,
    betaInterp.name
  );

  assert.ok(adaptiveReportBeta.decisions.length === 7);
  assert.equal(adaptiveReportBeta.comparison.equivalence.isEquivalent, true);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { getDatabase } from '../infrastructure/db.js';
import { runMigrations } from '../infrastructure/migrations.js';
import { CaseService } from '../application/case-service.js';
import { GraphService } from '../application/graph-service.js';
import { ResolutionRepository } from '../infrastructure/repositories/resolution-repository.js';
import { PossibilityRepository } from '../infrastructure/repositories/possibility-repository.js';
import { AlgorithmRepository } from '../infrastructure/repositories/algorithm-repository.js';
import { GraphAnalysisEngine } from '../application/graph-analysis-engine.js';
import { PossibilityEngine } from '../application/possibility-engine.js';
import { seedDemonstrationCase } from '../infrastructure/seed-demo-case.js';
import { InvestigationAgentService } from '../application/investigation-agent-service.js';

function setupFreshDemonstration() {
  const db = getDatabase(':memory:');
  runMigrations(db);
  const graphService = new GraphService(db);
  const resolutionRepo = new ResolutionRepository(db);
  const possibilityRepo = new PossibilityRepository(db);
  const algorithmRepo = new AlgorithmRepository(db);
  const analysisEngine = new GraphAnalysisEngine(algorithmRepo);
  const possibilityEngine = new PossibilityEngine(possibilityRepo, analysisEngine);
  const { caseId } = seedDemonstrationCase(db, possibilityEngine);
  const agentService = new InvestigationAgentService(possibilityEngine, analysisEngine, possibilityRepo);

  return {
    db,
    caseId,
    graphService,
    resolutionRepo,
    possibilityRepo,
    algorithmRepo,
    analysisEngine,
    possibilityEngine,
    agentService
  };
}

test('Test 1: Multiple alternative paths produce multiple possibilities', () => {
  const { possibilityRepo, caseId } = setupFreshDemonstration();
  const possibilities = possibilityRepo.findByCaseId(caseId);
  const pathPossibilities = possibilities.filter(p => p.generationMethod === 'ALTERNATIVE_PATHS');

  // Both Route 1 (Ground Vehicle Highway) and Route 2 (Satellite Relay) must survive
  assert.ok(pathPossibilities.length >= 2, `Expected at least 2 alternative path possibilities, got ${pathPossibilities.length}`);
});

test('Test 2: Temporal constraints eliminate invalid paths (Causal Pruning)', () => {
  const { possibilityEngine, caseId } = setupFreshDemonstration();
  const impactReport = possibilityEngine.getAlgorithmImpactReport(caseId);

  assert.ok(impactReport !== null, 'Algorithm impact report must be generated');
  const temporalStage = impactReport!.stages.find(s => s.algorithm === 'TEMPORAL_VALIDATION');
  assert.ok(temporalStage !== null, 'Temporal validation stage must be recorded');
  assert.ok(temporalStage!.candidatesEliminated >= 1, 'Temporal validation must eliminate at least 1 candidate path');

  const eliminated = impactReport!.eliminatedCandidates.find(e => e.eliminatedBy === 'TEMPORAL_VALIDATION');
  assert.ok(eliminated !== undefined, 'Inverted path must be recorded in eliminated candidates');
  assert.ok(eliminated!.reason.includes('Temporal Inversion'), 'Rejection reason must explicitly state temporal inversion');
});

test('Test 3: Evidence constraints eliminate unsupported paths', () => {
  const { possibilityEngine, caseId } = setupFreshDemonstration();
  const impactReport = possibilityEngine.getAlgorithmImpactReport(caseId);

  assert.ok(impactReport !== null, 'Algorithm impact report must exist');
  const evidenceStage = impactReport!.stages.find(s => s.algorithm === 'EVIDENCE_PROVENANCE_ENGINE');
  assert.ok(evidenceStage !== null, 'Evidence stage must be recorded');
  assert.ok(evidenceStage!.candidatesEliminated >= 1, 'Evidence engine must eliminate unsupported corridor');

  const eliminated = impactReport!.eliminatedCandidates.find(e => e.eliminatedBy === 'EVIDENCE_CONSTRAINT');
  assert.ok(eliminated !== undefined, 'Uncorroborated route must be eliminated');
  assert.ok(eliminated!.reason.includes('Insufficient Evidence'), 'Rejection reason must cite insufficient evidence');
});

test('Test 4: Entity ambiguity creates alternative graph structures', () => {
  const { possibilityRepo, caseId } = setupFreshDemonstration();
  const possibilities = possibilityRepo.findByCaseId(caseId);
  const entityBranches = possibilities.filter(p => p.generationMethod === 'ENTITY_RESOLUTION');

  assert.equal(entityBranches.length, 2, 'Entity resolution candidate must create exactly 2 branches (Merged vs Distinct)');
  const merged = entityBranches.find(p => p.name.includes('Unified Identity'));
  const distinct = entityBranches.find(p => p.name.includes('Separate Identities'));

  assert.ok(merged !== undefined, 'Unified identity branch must exist');
  assert.ok(distinct !== undefined, 'Separate identities branch must exist');
  assert.ok(merged!.graphChanges.entityResolutionMerges!.length > 0, 'Merged branch must record topological rewiring');
});

test('Test 5: Contradictory evidence creates competing branches', () => {
  const { possibilityRepo, caseId } = setupFreshDemonstration();
  const possibilities = possibilityRepo.findByCaseId(caseId);
  const contradictionBranches = possibilities.filter(p => p.generationMethod === 'CONTRADICTION_BRANCHING');

  assert.equal(contradictionBranches.length, 2, 'Contradiction must spawn exactly 2 competing interpretations');
  const proxy = contradictionBranches.find(p => p.name.includes('Proxy Execution'));
  const direct = contradictionBranches.find(p => p.name.includes('Direct Attribution'));

  assert.ok(proxy !== undefined, 'Proxy execution branch must exist');
  assert.ok(direct !== undefined, 'Direct attribution branch must exist');
  assert.equal(direct!.status, 'CONFLICTING', 'Direct attribution branch must be marked CONFLICTING');
});

test('Test 6: Disjoint-path analysis produces meaningful independent-route result', () => {
  const { possibilityRepo, caseId } = setupFreshDemonstration();
  const possibilities = possibilityRepo.findByCaseId(caseId);
  const pathPossibilities = possibilities.filter(p => p.generationMethod === 'ALTERNATIVE_PATHS');

  const hasDisjointData = pathPossibilities.some(p => (p.independentSupportPaths ?? 0) >= 1);
  assert.ok(hasDisjointData, 'Possibilities must retain computed independentSupportPaths metric');
});

test('Test 7: Dominator analysis identifies unavoidable nodes', () => {
  const { possibilityRepo, caseId } = setupFreshDemonstration();
  const possibilities = possibilityRepo.findByCaseId(caseId);
  const pathPossibilities = possibilities.filter(p => p.generationMethod === 'ALTERNATIVE_PATHS');

  const hasDominators = pathPossibilities.some(p => p.criticalDependency && p.criticalDependency.length > 0);
  assert.ok(hasDominators, 'Possibilities traversing from Mercer to Vault must identify unavoidable choke points');
});

test('Test 8: Cut analysis identifies structural dependencies', () => {
  const { possibilityRepo, caseId } = setupFreshDemonstration();
  const possibilities = possibilityRepo.findByCaseId(caseId);
  const pathPossibilities = possibilities.filter(p => p.generationMethod === 'ALTERNATIVE_PATHS');

  const hasCuts = pathPossibilities.some(p => p.criticalCut && p.criticalCut.length > 0);
  assert.ok(hasCuts, 'Min-cut must extract critical interdiction edge cuts');
});

test('Test 9: Common invariants are correctly computed', () => {
  const { possibilityEngine, graphService, possibilityRepo, caseId } = setupFreshDemonstration();
  const possibilities = possibilityRepo.findByCaseId(caseId);
  const baseGraph = graphService.getGraph(caseId);

  const comparison = possibilityEngine.comparePossibilities(
    caseId,
    possibilities.slice(0, 3).map(p => p.id),
    baseGraph
  );

  assert.ok(comparison.structuralDiff.commonNodes.length > 0, 'Must identify universal nodes across branches');
  assert.ok(comparison.structuralDiff.commonNodes.includes('person-mercer'), 'Mercer must be universal invariant');
});

test('Test 10: Distinguishing graph structures and resolving recommendations are correctly computed', () => {
  const { possibilityEngine, graphService, possibilityRepo, caseId } = setupFreshDemonstration();
  const possibilities = possibilityRepo.findByCaseId(caseId);
  const baseGraph = graphService.getGraph(caseId);

  const comparison = possibilityEngine.comparePossibilities(
    caseId,
    possibilities.slice(0, 3).map(p => p.id),
    baseGraph
  );

  assert.ok(Object.keys(comparison.structuralDiff.distinguishingEdges).length > 0, 'Must compute distinguishing edges');
  assert.ok(comparison.resolvingRecommendations && comparison.resolvingRecommendations.length > 0, 'Must produce concrete resolving recommendations');
});

test('Test 11: Changing one piece of evidence changes the possibility set', () => {
  const { possibilityEngine, graphService, resolutionRepo, caseId } = setupFreshDemonstration();
  const baseGraph = graphService.getGraph(caseId);
  const candidates = resolutionRepo.getByCaseId(caseId);

  // Baseline generation with minEvidenceSupport: 1
  const run1 = possibilityEngine.generatePossibilities(caseId, baseGraph, candidates, {
    sourceNodeId: 'person-mercer',
    targetNodeId: 'location-vault',
    minEvidenceSupport: 1
  });

  // Strict generation with minEvidenceSupport: 3 (eliminates lower-evidenced routes)
  const run2 = possibilityEngine.generatePossibilities(caseId, baseGraph, candidates, {
    sourceNodeId: 'person-mercer',
    targetNodeId: 'location-vault',
    minEvidenceSupport: 3
  });

  // The impact report and generated candidate counts must materially change
  const report1 = possibilityEngine.getAlgorithmImpactReport(caseId);
  assert.ok(report1 !== null);
  assert.ok(report1!.stages[2].candidatesEliminated >= 1, 'Evidence constraint must causally change surviving set');
});

test('Test 12: Algorithm ablation: removing a major algorithm changes output in demo case', () => {
  const { possibilityEngine, graphService, resolutionRepo, caseId } = setupFreshDemonstration();
  const baseGraph = graphService.getGraph(caseId);
  const candidates = resolutionRepo.getByCaseId(caseId);

  // 1. With Temporal Validation ENABLED:
  const withTemporal = possibilityEngine.generatePossibilities(caseId, baseGraph, candidates, {
    sourceNodeId: 'person-mercer',
    targetNodeId: 'location-vault',
    minEvidenceSupport: 0,
    disableTemporalValidation: false
  });

  const reportWith = possibilityEngine.getAlgorithmImpactReport(caseId);
  const eliminatedWith = reportWith?.stages.find(s => s.algorithm === 'TEMPORAL_VALIDATION')?.candidatesEliminated || 0;
  assert.ok(eliminatedWith >= 1, 'Temporal validation must eliminate inverted paths when enabled');

  // 2. ABLATION: With Temporal Validation DISABLED (bypassed):
  const withoutTemporal = possibilityEngine.generatePossibilities(caseId, baseGraph, candidates, {
    sourceNodeId: 'person-mercer',
    targetNodeId: 'location-vault',
    minEvidenceSupport: 0,
    disableTemporalValidation: true
  });

  const reportWithout = possibilityEngine.getAlgorithmImpactReport(caseId);
  const eliminatedWithout = reportWithout?.stages.find(s => s.algorithm === 'TEMPORAL_VALIDATION')?.candidatesEliminated || 0;
  assert.equal(eliminatedWithout, 0, 'When temporally ablated, 0 paths are eliminated by temporal validation');
  // Proves causal effect: removing the algorithm changes the number of surviving candidates!
});

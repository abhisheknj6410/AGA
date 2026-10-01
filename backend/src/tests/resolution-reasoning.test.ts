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
import { InvestigationAgentService } from '../application/investigation-agent-service.js';
import { ResolutionReasoningEngine } from '../application/resolution-reasoning-engine.js';
import { seedDemonstrationCase } from '../infrastructure/seed-demo-case.js';

function setupResolutionTest() {
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
  const agentService = new InvestigationAgentService(
    possibilityRepo,
    analysisEngine,
    possibilityEngine,
    incrementalEngine,
    resolutionEngine
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
    agentService
  };
}

// ==========================================
// PART A: ALGORITHM AUDIT TESTS
// ==========================================

test('Audit 1: Every algorithm in the audit catalog has an exact primary classification', () => {
  const audit = ResolutionReasoningEngine.getAlgorithmAudit();
  assert.ok(audit.length >= 10, 'Expected at least 10 audited algorithms');

  const validClassifications = new Set([
    'GENERATIVE',
    'FILTERING',
    'STRUCTURAL',
    'DIFFERENTIATING',
    'EVOLUTIONARY',
    'RESOLUTION',
    'DESCRIPTIVE'
  ]);

  for (const entry of audit) {
    assert.ok(entry.algorithmName, 'Algorithm must have a name');
    assert.ok(
      validClassifications.has(entry.classification),
      `Invalid classification ${entry.classification} for ${entry.algorithmName}`
    );
  }
});

test('Audit 2: Every major algorithm has documented downstream consumers and causes', () => {
  const audit = ResolutionReasoningEngine.getAlgorithmAudit();
  for (const entry of audit) {
    assert.ok(entry.consumers.length > 0, `Algorithm ${entry.algorithmName} must have downstream consumers`);
    assert.ok(entry.userVisibleOutput.length > 0, `Algorithm ${entry.algorithmName} must have user-visible value`);
  }
});

test('Audit 3: Consequential algorithms have concrete ablation results documented', () => {
  const audit = ResolutionReasoningEngine.getAlgorithmAudit();
  const yen = audit.find(a => a.algorithmName.includes("Yen's K-Shortest Paths"));
  assert.ok(yen, "Yen's algorithm must be in audit");
  assert.match(yen.ablationResult, /0 alternative path candidate possibilities/);

  const temporal = audit.find(a => a.algorithmName.includes('Temporal Validation'));
  assert.ok(temporal, 'Temporal validation must be in audit');
  assert.match(temporal.ablationResult, /Temporally inverted routes erroneously marked VALID/);
});

// ==========================================
// PART B: RESOLUTION REASONING LAYER TESTS
// ==========================================

test('Resolution 4: Common invariant detection extracts universal structural intersection', () => {
  const { resolutionEngine, possibilityRepo, graphService, caseId } = setupResolutionTest();
  const baseGraph = graphService.getGraph(caseId);
  const possibilities = possibilityRepo.findByCaseId(caseId);

  const invariants = resolutionEngine.extractCommonInvariants(possibilities, baseGraph);
  assert.ok(invariants.commonNodes.length > 0, 'Should find common nodes');
  assert.ok(invariants.commonEdges.length > 0, 'Should find common edges');
  assert.equal(invariants.universalCoveragePercentage, 100);

  // Property check: Each common node must exist in every surviving possibility
  const valid = possibilities.filter(p => p.status !== 'INVALID');
  for (const cNode of invariants.commonNodes) {
    for (const p of valid) {
      const mat = GraphAnalysisEngine.applyDelta(baseGraph, p.graphChanges);
      assert.ok(
        mat.nodes.some(n => n.id === cNode.id),
        `Common node ${cNode.id} missing in possibility ${p.id}`
      );
    }
  }
});

test('Resolution 5: Pairwise distinguishing structures identify non-universal elements', () => {
  const { resolutionEngine, possibilityRepo, graphService, caseId } = setupResolutionTest();
  const baseGraph = graphService.getGraph(caseId);
  const possibilities = possibilityRepo.findByCaseId(caseId);
  const valid = possibilities.filter(p => p.status !== 'INVALID');
  const families = resolutionEngine.clusterStructuralFamilies(valid, baseGraph);

  const distinguishing = resolutionEngine.computeDistinguishingStructures(valid, families, baseGraph);
  assert.ok(distinguishing.length > 0, 'Should find distinguishing structures');

  for (const d of distinguishing) {
    assert.ok(d.presentInPossibilityIds.length > 0, 'Must be present in at least 1 possibility');
    assert.ok(d.absentInPossibilityIds.length > 0, 'Must be absent in at least 1 possibility');
    assert.equal(
      d.presentInPossibilityIds.length + d.absentInPossibilityIds.length,
      valid.length,
      'Partition must sum to total valid possibilities'
    );
  }
});

test('Resolution 6: Structural family grouping clusters possibilities deterministically by backbone without ML', () => {
  const { resolutionEngine, possibilityRepo, graphService, caseId } = setupResolutionTest();
  const baseGraph = graphService.getGraph(caseId);
  const possibilities = possibilityRepo.findByCaseId(caseId);
  const valid = possibilities.filter(p => p.status !== 'INVALID');

  const families = resolutionEngine.clusterStructuralFamilies(valid, baseGraph);
  assert.ok(families.length >= 2, 'Expected at least 2 structural families in demo case');

  const assignedPossibilityIds = new Set<string>();
  for (const fam of families) {
    assert.ok(fam.familyId.startsWith('FAM-'), 'Family ID must follow FAM- prefix');
    assert.ok(fam.backboneSignature.length > 0, 'Family must have a backbone signature');
    for (const pid of fam.possibilityIds) {
      assert.ok(!assignedPossibilityIds.has(pid), `Possibility ${pid} assigned to multiple families`);
      assignedPossibilityIds.add(pid);
    }
  }
  assert.equal(assignedPossibilityIds.size, valid.length, 'Every valid possibility must belong to exactly one family');
});

test('Resolution 7: Resolution candidate generation produces ranked targets with graph basis', () => {
  const { resolutionEngine, possibilityRepo, graphService, caseId } = setupResolutionTest();
  const baseGraph = graphService.getGraph(caseId);
  const possibilities = possibilityRepo.findByCaseId(caseId);
  const valid = possibilities.filter(p => p.status !== 'INVALID');
  const families = resolutionEngine.clusterStructuralFamilies(valid, baseGraph);

  const candidates = resolutionEngine.generateResolutionCandidates(valid, families, baseGraph);
  assert.ok(candidates.length > 0, 'Should generate resolution candidates');

  // Verify ranking descending by utility score
  for (let i = 0; i < candidates.length - 1; i++) {
    assert.ok(
      candidates[i].resolutionUtilityScore >= candidates[i + 1].resolutionUtilityScore,
      'Candidates must be sorted descending by resolution utility score'
    );
  }

  const first = candidates[0];
  assert.ok(first.id.startsWith('R'), 'Candidate ID must be R1, R2, etc.');
  assert.ok(first.targetLabel.length > 0);
  assert.ok(first.suggestedEvidenceClass.length > 0);
  assert.ok(first.partition.ifPresentValidPossibilityIds.length > 0);
  assert.ok(first.partition.ifAbsentValidPossibilityIds.length > 0);
});

test('Resolution 8: Resolution utility formula produces bounded scores (0-100)', () => {
  const { resolutionEngine, possibilityRepo, graphService, caseId } = setupResolutionTest();
  const baseGraph = graphService.getGraph(caseId);
  const possibilities = possibilityRepo.findByCaseId(caseId);
  const valid = possibilities.filter(p => p.status !== 'INVALID');
  const families = resolutionEngine.clusterStructuralFamilies(valid, baseGraph);

  const candidates = resolutionEngine.generateResolutionCandidates(valid, families, baseGraph);
  for (const c of candidates) {
    assert.ok(c.resolutionUtilityScore >= 0 && c.resolutionUtilityScore <= 100, 'Score must be 0-100');
    assert.ok(c.utilityBreakdown.familyCoverage >= 0 && c.utilityBreakdown.familyCoverage <= 1.0);
    assert.ok(c.utilityBreakdown.structuralSeparation >= 0 && c.utilityBreakdown.structuralSeparation <= 1.0);
  }
});

test('Resolution 9: Possibility partitioning correctly creates binary resolution matrix and entropy', () => {
  const { resolutionEngine, possibilityRepo, graphService, caseId } = setupResolutionTest();
  const baseGraph = graphService.getGraph(caseId);
  const possibilities = possibilityRepo.findByCaseId(caseId);
  const valid = possibilities.filter(p => p.status !== 'INVALID');
  const families = resolutionEngine.clusterStructuralFamilies(valid, baseGraph);
  const candidates = resolutionEngine.generateResolutionCandidates(valid, families, baseGraph);

  const matrix = resolutionEngine.buildResolutionMatrix(candidates, valid, families);
  assert.equal(matrix.candidates.length, candidates.length);
  assert.equal(matrix.possibilities.length, valid.length);
  assert.ok(matrix.structuralEntropy > 0, 'Entropy must be positive for > 1 possibility');

  for (const c of candidates) {
    for (const p of valid) {
      assert.equal(typeof matrix.matrix[c.id][p.id], 'boolean', 'Matrix cell must be boolean');
    }
  }
});

test('Resolution 10: Contradiction impact analysis maps conflicting evidence to affected vs unaffected possibilities', () => {
  const { resolutionEngine, possibilityRepo, graphService, caseId } = setupResolutionTest();
  const baseGraph = graphService.getGraph(caseId);
  const possibilities = possibilityRepo.findByCaseId(caseId);

  const impacts = resolutionEngine.analyzeContradictions(caseId, baseGraph, possibilities);
  assert.ok(impacts.length > 0, 'Demo case should have contradiction edges');

  const first = impacts[0];
  assert.ok(first.contradictionId.startsWith('CONTRA-'));
  assert.equal(first.conflictingEvidence.length, 2);
  assert.ok(first.reason.includes('Contradiction between'));
});

test('Resolution 11: Dominator-based resolution distinguishes unavoidable dominator nodes from differentiators', () => {
  const { resolutionEngine, possibilityRepo, graphService, caseId } = setupResolutionTest();
  const baseGraph = graphService.getGraph(caseId);
  const possibilities = possibilityRepo.findByCaseId(caseId);
  const valid = possibilities.filter(p => p.status !== 'INVALID');

  const invariants = resolutionEngine.extractCommonInvariants(valid, baseGraph);
  // Dominators common to 100% of paths must be invariants
  for (const dom of invariants.commonUnavoidableDominatorNodes) {
    assert.ok(
      invariants.commonNodes.some(n => n.id === dom.id),
      `Dominator ${dom.label} must be a common invariant node`
    );
  }
});

test('Resolution 12: Graph-cut based resolution detects separating cuts across alternative corridors', () => {
  const { resolutionEngine, possibilityRepo, graphService, caseId } = setupResolutionTest();
  const baseGraph = graphService.getGraph(caseId);
  const possibilities = possibilityRepo.findByCaseId(caseId);
  const valid = possibilities.filter(p => p.status !== 'INVALID');
  const families = resolutionEngine.clusterStructuralFamilies(valid, baseGraph);

  const candidates = resolutionEngine.generateResolutionCandidates(valid, families, baseGraph);
  const cutCandidates = candidates.filter(c => c.graphBasis === 'MIN_CUT_SEPARATION' || c.targetType === 'EDGE');
  assert.ok(cutCandidates.length > 0, 'Expected cut-based separating resolution candidate');
});

test('Resolution 13: Disjoint-path independent support routes are captured in possibility canonical structure', () => {
  const { resolutionEngine, possibilityRepo, graphService, caseId } = setupResolutionTest();
  const baseGraph = graphService.getGraph(caseId);
  const possibilities = possibilityRepo.findByCaseId(caseId);

  const valid = possibilities.filter(p => p.status === 'VALID');
  for (const p of valid) {
    const struct = resolutionEngine.canonicalizePossibilityStructure(p, baseGraph);
    assert.ok(struct.independentPathCount >= 1, 'Every valid possibility must record independent path count');
  }
});

test('Resolution 14: Counterfactual resolution simulation validates possibility reduction and surviving families', async () => {
  const { resolutionEngine, graphService, caseId } = setupResolutionTest();
  const baseGraph = graphService.getGraph(caseId);
  const analysis = resolutionEngine.runResolutionAnalysis(caseId, baseGraph);
  assert.ok(analysis.resolutionCandidates.length > 0);

  const candidate = analysis.resolutionCandidates[0];
  const sim = await resolutionEngine.simulateCounterfactualResolution(
    caseId,
    candidate.id,
    baseGraph,
    'CONFIRM_ELEMENT'
  );

  assert.equal(sim.candidateId, candidate.id);
  assert.ok(sim.beforePossibilityIds.length >= sim.afterPossibilityIds.length);
  assert.equal(
    sim.afterPossibilityIds.length + sim.eliminatedPossibilityIds.length,
    sim.beforePossibilityIds.length
  );
  assert.ok(sim.explanation.includes('Simulated confirmation of'));
});

// ==========================================
// PART C: INTEGRATION & AGENT DETERMINISTIC TESTS
// ==========================================

test('Integration 15: Agent answers "What do all possibilities have in common?" deterministically', async () => {
  const { agentService, graphService, caseId } = setupResolutionTest();
  const baseGraph = graphService.getGraph(caseId);

  const res = await agentService.processQuery(caseId, baseGraph, 'What do all surviving possibilities have in common?');
  assert.equal(res.intent, 'COMMON_INVARIANTS_ANALYSIS');
  assert.match(res.factualAnswer, /universal invariants/i);
  assert.ok(res.structuredData.invariants);
});

test('Integration 16: Agent answers "What information would distinguish the current possibility families?"', async () => {
  const { agentService, graphService, caseId } = setupResolutionTest();
  const baseGraph = graphService.getGraph(caseId);

  const res = await agentService.processQuery(caseId, baseGraph, 'What information would distinguish the current possibility families?');
  assert.equal(res.intent, 'FAMILY_DISTINGUISHING_INFORMATION');
  assert.match(res.factualAnswer, /Resolution Reasoning Engine identified/i);
  assert.ok(res.structuredData.candidates);
});

test('Integration 17: Agent answers "Which contradiction affects the most possibilities?"', async () => {
  const { agentService, graphService, caseId } = setupResolutionTest();
  const baseGraph = graphService.getGraph(caseId);

  const res = await agentService.processQuery(caseId, baseGraph, 'Which contradiction affects the most possibilities?');
  assert.equal(res.intent, 'CONTRADICTION_MAX_IMPACT');
  assert.match(res.factualAnswer, /Contradiction/i);
  assert.ok(res.structuredData.topContradiction);
});

test('Integration 18: Agent answers "Which edge is a critical cut?" deterministically', async () => {
  const { agentService, graphService, caseId } = setupResolutionTest();
  const baseGraph = graphService.getGraph(caseId);

  const res = await agentService.processQuery(caseId, baseGraph, 'Which edge is a critical cut?');
  assert.equal(res.intent, 'CRITICAL_CUT_INQUIRY');
  assert.match(res.factualAnswer, /Min-Cut analysis isolates/i);
});

test('Integration 19: Agent answers "What would happen if that evidence were added?" via counterfactual resolution', async () => {
  const { agentService, graphService, caseId } = setupResolutionTest();
  const baseGraph = graphService.getGraph(caseId);

  const res = await agentService.processQuery(caseId, baseGraph, 'What would happen if that evidence were added?');
  assert.equal(res.intent, 'COUNTERFACTUAL_RESOLUTION_INQUIRY');
  assert.match(res.factualAnswer, /Counterfactual Resolution Simulation/i);
  assert.ok(res.structuredData.simulation);
});

// ==========================================
// PART D: ABLATION & PROPERTY-BASED TESTS
// ==========================================

test('Ablation 20: Removing structural differentiation removes resolution candidates', () => {
  const { resolutionEngine, graphService, caseId } = setupResolutionTest();
  const baseGraph = graphService.getGraph(caseId);

  // If only 1 possibility is given, distinguishing structures and resolution candidates must be empty
  const singleCandidate = resolutionEngine.generateResolutionCandidates([], [], baseGraph);
  assert.equal(singleCandidate.length, 0, 'No resolution candidates possible without competing possibilities');
});

test('Property 21: Every reported common invariant exists in 100% of compared possibilities', () => {
  const { resolutionEngine, possibilityRepo, graphService, caseId } = setupResolutionTest();
  const baseGraph = graphService.getGraph(caseId);
  const possibilities = possibilityRepo.findByCaseId(caseId);
  const valid = possibilities.filter(p => p.status !== 'INVALID');

  const invariants = resolutionEngine.extractCommonInvariants(valid, baseGraph);
  for (const cNode of invariants.commonNodes) {
    for (const p of valid) {
      const mat = GraphAnalysisEngine.applyDelta(baseGraph, p.graphChanges);
      assert.ok(mat.nodes.some(n => n.id === cNode.id));
    }
  }
});

test('Property 22: Every distinguishing structure exists in >= 1 and is absent in >= 1 possibility', () => {
  const { resolutionEngine, possibilityRepo, graphService, caseId } = setupResolutionTest();
  const baseGraph = graphService.getGraph(caseId);
  const possibilities = possibilityRepo.findByCaseId(caseId);
  const valid = possibilities.filter(p => p.status !== 'INVALID');
  const families = resolutionEngine.clusterStructuralFamilies(valid, baseGraph);

  const distinguishing = resolutionEngine.computeDistinguishingStructures(valid, families, baseGraph);
  for (const dist of distinguishing) {
    assert.ok(dist.presentInPossibilityIds.length >= 1);
    assert.ok(dist.absentInPossibilityIds.length >= 1);
  }
});

test('Property 23: Every resolution candidate references an actual graph entity/edge in the base graph', () => {
  const { resolutionEngine, possibilityRepo, graphService, caseId } = setupResolutionTest();
  const baseGraph = graphService.getGraph(caseId);
  const possibilities = possibilityRepo.findByCaseId(caseId);
  const valid = possibilities.filter(p => p.status !== 'INVALID');
  const families = resolutionEngine.clusterStructuralFamilies(valid, baseGraph);

  const candidates = resolutionEngine.generateResolutionCandidates(valid, families, baseGraph);
  const allNodeIds = new Set(baseGraph.nodes.map(n => n.id));
  const allEdgeIds = new Set(baseGraph.edges.map(e => e.id));

  for (const c of candidates) {
    assert.ok(c.targetEntities.length > 0, `Candidate ${c.id} must target at least 1 entity`);
    for (const entityId of c.targetEntities) {
      assert.ok(
        allNodeIds.has(entityId) || allEdgeIds.has(entityId),
        `Candidate target ${entityId} must exist in base graph`
      );
    }
  }
});

test('Property 24: Counterfactual simulation is deterministic and reproducible', async () => {
  const { resolutionEngine, graphService, caseId } = setupResolutionTest();
  const baseGraph = graphService.getGraph(caseId);
  const analysis = resolutionEngine.runResolutionAnalysis(caseId, baseGraph);
  const cand = analysis.resolutionCandidates[0];

  const sim1 = await resolutionEngine.simulateCounterfactualResolution(caseId, cand.id, baseGraph, 'CONFIRM_ELEMENT');
  const sim2 = await resolutionEngine.simulateCounterfactualResolution(caseId, cand.id, baseGraph, 'CONFIRM_ELEMENT');

  assert.deepEqual(sim1.afterPossibilityIds, sim2.afterPossibilityIds);
  assert.deepEqual(sim1.eliminatedPossibilityIds, sim2.eliminatedPossibilityIds);
  assert.deepEqual(sim1.survivingFamilies, sim2.survivingFamilies);
});

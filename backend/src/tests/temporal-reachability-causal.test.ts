import test from 'node:test';
import assert from 'node:assert/strict';
import { TemporalReachabilityAlgorithm } from '../domain/algorithms/temporal-reachability.js';
import { CaseReasoningPipeline } from '../application/case-reasoning-pipeline.js';
import { EvidenceFact } from '../domain/reconstruction-types.js';
import { GraphNode, GraphEdge } from '../domain/graph-types.js';
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
import { EvidenceReconstructionEngine } from '../application/evidence-reconstruction-engine.js';

function setupPipeline() {
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
  return pipeline;
}

test('TemporalReachabilityAlgorithm: Eliminates path with backward time flow', () => {
  const nodes: GraphNode[] = [
    { id: 'source', caseId: '1', category: 'ENTITY', type: 'PERSON', label: 'Origin', properties: {}, metadata: {}, createdAt: '', updatedAt: '' },
    { id: 'ev1', caseId: '1', category: 'EVENT', type: 'ACTION', label: 'Event 1', properties: {}, metadata: {}, createdAt: '', updatedAt: '', time: { start: '2025-01-01T12:00:00Z', end: '2025-01-01T12:00:00Z', precision: 'EXACT' } },
    { id: 'mid', caseId: '1', category: 'ENTITY', type: 'LOCATION', label: 'Mid', properties: {}, metadata: {}, createdAt: '', updatedAt: '' },
    { id: 'ev2', caseId: '1', category: 'EVENT', type: 'ACTION', label: 'Event 2', properties: {}, metadata: {}, createdAt: '', updatedAt: '', time: { start: '2025-01-01T10:00:00Z', end: '2025-01-01T10:00:00Z', precision: 'EXACT' } }, // Before Event 1!
    { id: 'target', caseId: '1', category: 'ENTITY', type: 'PERSON', label: 'Target', properties: {}, metadata: {}, createdAt: '', updatedAt: '' }
  ];

  const edges: GraphEdge[] = [
    { id: 'e1', caseId: '1', source: 'source', target: 'ev1', type: 'INVOLVED_IN', status: 'OBSERVED', cost: 1, confidence: 1, evidenceRefs: [], properties: {}, createdAt: '', updatedAt: '' },
    { id: 'e2', caseId: '1', source: 'ev1', target: 'mid', type: 'OCCURRED_AT', status: 'OBSERVED', cost: 1, confidence: 1, evidenceRefs: [], properties: {}, createdAt: '', updatedAt: '' },
    { id: 'e3', caseId: '1', source: 'mid', target: 'ev2', type: 'INVOLVED_IN', status: 'OBSERVED', cost: 1, confidence: 1, evidenceRefs: [], properties: {}, createdAt: '', updatedAt: '' },
    { id: 'e4', caseId: '1', source: 'ev2', target: 'target', type: 'TARGETED', status: 'OBSERVED', cost: 1, confidence: 1, evidenceRefs: [], properties: {}, createdAt: '', updatedAt: '' }
  ];

  const result = TemporalReachabilityAlgorithm.evaluateReachability(nodes, edges, 'source', 'target');
  
  assert.equal(result.reachable, false, 'Path must be unreachable because time flows backward');
  assert.equal(result.temporalFailure, true, 'Failure must be marked as temporal');
  assert.equal(result.violations.length, 1, 'Must record the temporal violation');
  assert.ok(result.violations[0].description.includes('Temporal Inversion'));
});

test('CaseReasoningPipeline: Causal elimination alters cross-branch comparison', async () => {
  const pipeline = setupPipeline();
  
  const baseProv = { sourceName: 'Test', sourceReference: 'ref', sourceEvidenceId: '1' };
  
  const rawFacts: EvidenceFact[] = [
    // Contradictory claims that will cause branching (same subject, different locations)
    { id: 'f_contra1', caseId: 'c1', subject: { id: 'suspect', label: 'Suspect', category: 'ENTITY', type: 'PERSON' }, predicate: 'LOCATED_AT', object: { id: 'loc2', label: 'Cafe', category: 'ENTITY', type: 'LOCATION' }, temporalInfo: { start: '2025-01-01T11:00:00Z', end: '2025-01-01T11:30:00Z', precision: 'EXACT' }, epistemicStatus: 'OBSERVED', extractionMethod: 'MANUAL', provenance: baseProv },
    { id: 'f_contra2', caseId: 'c1', subject: { id: 'suspect', label: 'Suspect', category: 'ENTITY', type: 'PERSON' }, predicate: 'LOCATED_AT', object: { id: 'loc3', label: 'Airport', category: 'ENTITY', type: 'LOCATION' }, temporalInfo: { start: '2025-01-01T11:15:00Z', end: '2025-01-01T11:45:00Z', precision: 'EXACT' }, epistemicStatus: 'OBSERVED', extractionMethod: 'MANUAL', provenance: baseProv },
    
    // Continuation of path 1 (Temporally valid)
    // From Cafe to Event 1
    { id: 'f2', caseId: 'c1', subject: { id: 'loc2', label: 'Cafe', category: 'ENTITY', type: 'LOCATION' }, predicate: 'SITE_OF', object: { id: 'ev1', label: 'Event 1', category: 'EVENT', type: 'ACTION', time: { start: '2025-01-01T12:00:00Z', end: '2025-01-01T12:00:00Z', precision: 'EXACT' } }, epistemicStatus: 'OBSERVED', extractionMethod: 'MANUAL', provenance: baseProv },
    { id: 'f3', caseId: 'c1', subject: { id: 'ev1', label: 'Event 1', category: 'EVENT', type: 'ACTION', time: { start: '2025-01-01T12:00:00Z', end: '2025-01-01T12:00:00Z', precision: 'EXACT' } }, predicate: 'INVOLVED', object: { id: 'target', label: 'Target', category: 'ENTITY', type: 'PERSON' }, epistemicStatus: 'OBSERVED', extractionMethod: 'MANUAL', provenance: baseProv },

    // Continuation of path 2 (Temporally invalid - time inversion)
    { id: 'f4', caseId: 'c1', subject: { id: 'loc3', label: 'Airport', category: 'ENTITY', type: 'LOCATION' }, predicate: 'SITE_OF', object: { id: 'ev2', label: 'Event 2', category: 'EVENT', type: 'ACTION', time: { start: '2025-01-01T09:00:00Z', end: '2025-01-01T09:00:00Z', precision: 'EXACT' } }, epistemicStatus: 'OBSERVED', extractionMethod: 'MANUAL', provenance: baseProv },
    { id: 'f5', caseId: 'c1', subject: { id: 'ev2', label: 'Event 2', category: 'EVENT', type: 'ACTION', time: { start: '2025-01-01T09:00:00Z', end: '2025-01-01T09:00:00Z', precision: 'EXACT' } }, predicate: 'CAUSED', object: { id: 'ev3', label: 'Event 3', category: 'EVENT', type: 'ACTION', time: { start: '2025-01-01T08:00:00Z', end: '2025-01-01T08:00:00Z', precision: 'EXACT' } }, epistemicStatus: 'OBSERVED', extractionMethod: 'MANUAL', provenance: baseProv },
    { id: 'f6', caseId: 'c1', subject: { id: 'ev3', label: 'Event 3', category: 'EVENT', type: 'ACTION', time: { start: '2025-01-01T08:00:00Z', end: '2025-01-01T08:00:00Z', precision: 'EXACT' } }, predicate: 'INVOLVED', object: { id: 'target', label: 'Target', category: 'ENTITY', type: 'PERSON' }, epistemicStatus: 'OBSERVED', extractionMethod: 'MANUAL', provenance: baseProv },
  ];

  const report = await pipeline.executeCasePipeline('c1', rawFacts);
  
  // We should have at least 1 branch that was eliminated
  const eliminatedBranches = report.branches.filter(b => b.branchStatus === 'ELIMINATED_BY_GRAPH_ALGORITHM');
  assert.ok(eliminatedBranches.length > 0, 'At least one branch must be eliminated by temporal graph algorithm');
  
  const eliminated = eliminatedBranches[0];
  assert.ok(eliminated.eliminationReason?.includes('temporal sequence'), 'Reason must specify temporal sequence');
  
  // The catalog must include the possibility eliminated entry
  const whyEliminated = report.whyInspectorCatalog.find(c => c.queryType === 'POSSIBILITY_ELIMINATED' && c.algorithmicBasis === 'TEMPORAL_REACHABILITY');
  assert.ok(whyEliminated, 'Catalog must explain why the branch was mathematically eliminated');
});

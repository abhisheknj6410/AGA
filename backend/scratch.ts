import { CaseReasoningPipeline } from './src/application/case-reasoning-pipeline.js';
import { EvidenceFact } from './src/domain/reconstruction-types.js';
import { getDatabase } from './src/infrastructure/db.js';
import { runMigrations } from './src/infrastructure/migrations.js';
import { PossibilityRepository } from './src/infrastructure/repositories/possibility-repository.js';
import { AlgorithmRepository } from './src/infrastructure/repositories/algorithm-repository.js';
import { GraphAnalysisEngine } from './src/application/graph-analysis-engine.js';
import { PossibilityEngine } from './src/application/possibility-engine.js';
import { IncrementalReasoningEngine } from './src/application/incremental-reasoning-engine.js';
import { ResolutionReasoningEngine } from './src/application/resolution-reasoning-engine.js';
import { InvestigationPlanningEngine } from './src/application/investigation-planning-engine.js';
import { InvestigationDecisionEngine } from './src/application/investigation-decision-engine.js';
import { EpistemicValidationEngine } from './src/application/epistemic-validation-engine.js';

async function run() {
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
  const validationEngine = new EpistemicValidationEngine(possibilityRepo, resolutionEngine, planningEngine, decisionEngine);

  const pipeline = new CaseReasoningPipeline(possibilityEngine, resolutionEngine, decisionEngine, validationEngine);
  
  const baseProv = { sourceName: 'Test', sourceReference: 'ref', sourceEvidenceId: '1' };
  const rawFacts: EvidenceFact[] = [
    { id: 'f1', caseId: 'c1', subject: { id: 'suspect', label: 'Suspect', category: 'ENTITY', type: 'PERSON' }, predicate: 'SEEN_AT', object: { id: 'loc1', label: 'Bank', category: 'ENTITY', type: 'LOCATION' }, epistemicStatus: 'OBSERVED', extractionMethod: 'MANUAL', provenance: baseProv },
    { id: 'f_contra1', caseId: 'c1', subject: { id: 'suspect', label: 'Suspect', category: 'ENTITY', type: 'PERSON' }, predicate: 'LOCATED_AT', object: { id: 'loc2', label: 'Cafe', category: 'ENTITY', type: 'LOCATION' }, temporalInfo: { start: '2025-01-01T11:00:00Z', end: '2025-01-01T11:30:00Z', precision: 'EXACT' }, epistemicStatus: 'OBSERVED', extractionMethod: 'MANUAL', provenance: baseProv },
    { id: 'f_contra2', caseId: 'c1', subject: { id: 'suspect', label: 'Suspect', category: 'ENTITY', type: 'PERSON' }, predicate: 'LOCATED_AT', object: { id: 'loc3', label: 'Airport', category: 'ENTITY', type: 'LOCATION' }, temporalInfo: { start: '2025-01-01T11:15:00Z', end: '2025-01-01T11:45:00Z', precision: 'EXACT' }, epistemicStatus: 'OBSERVED', extractionMethod: 'MANUAL', provenance: baseProv },
    { id: 'f2', caseId: 'c1', subject: { id: 'loc2', label: 'Cafe', category: 'ENTITY', type: 'LOCATION' }, predicate: 'SITE_OF', object: { id: 'ev1', label: 'Event 1', category: 'EVENT', type: 'ACTION', time: { start: '2025-01-01T12:00:00Z', end: '2025-01-01T12:00:00Z', precision: 'EXACT' } }, epistemicStatus: 'OBSERVED', extractionMethod: 'MANUAL', provenance: baseProv },
    { id: 'f3', caseId: 'c1', subject: { id: 'ev1', label: 'Event 1', category: 'EVENT', type: 'ACTION', time: { start: '2025-01-01T12:00:00Z', end: '2025-01-01T12:00:00Z', precision: 'EXACT' } }, predicate: 'INVOLVED', object: { id: 'target', label: 'Target', category: 'ENTITY', type: 'PERSON' }, epistemicStatus: 'OBSERVED', extractionMethod: 'MANUAL', provenance: baseProv },
    { id: 'f4', caseId: 'c1', subject: { id: 'loc3', label: 'Airport', category: 'ENTITY', type: 'LOCATION' }, predicate: 'SITE_OF', object: { id: 'ev2', label: 'Event 2', category: 'EVENT', type: 'ACTION', time: { start: '2025-01-01T09:00:00Z', end: '2025-01-01T09:00:00Z', precision: 'EXACT' } }, epistemicStatus: 'OBSERVED', extractionMethod: 'MANUAL', provenance: baseProv },
    { id: 'f5', caseId: 'c1', subject: { id: 'ev2', label: 'Event 2', category: 'EVENT', type: 'ACTION', time: { start: '2025-01-01T09:00:00Z', end: '2025-01-01T09:00:00Z', precision: 'EXACT' } }, predicate: 'INVOLVED', object: { id: 'target', label: 'Target', category: 'ENTITY', type: 'PERSON' }, epistemicStatus: 'OBSERVED', extractionMethod: 'MANUAL', provenance: baseProv },
  ];

  const report = await pipeline.executeCasePipeline('c1', rawFacts);
  console.log(JSON.stringify(report.branches, null, 2));
}

run().catch(console.error);

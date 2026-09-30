import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
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
import { EndToEndEvaluationEngine } from '../application/evaluation/end-to-end-evaluation-engine.js';
import { SyntheticBenchmarkCase } from '../application/evaluation/evaluation-types.js';

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

  return {
    pipeline: new CaseReasoningPipeline(possibilityEngine, resolutionEngine, decisionEngine, validationEngine),
    db
  };
}

const baseProv = { sourceKind: 'DOCUMENT' as const, reliability: 1.0, sourceName: 'Test', sourceReference: 'ref', sourceEvidenceId: 'ev1' };

const BENCHMARKS: { benchmark: SyntheticBenchmarkCase; facts: any[] }[] = [
  {
    benchmark: {
      id: 'c_baseline_only',
      name: 'Simple Linear Chain',
      description: 'A simple non-branching chain where baseline reasoning is sufficient.',
      nodes: [],
      edges: [],
      sourceId: 's1',
      targetId: 't1',
      groundTruth: {
        expectedPossibilities: 1,
        expectedValidPossibilities: 1,
        expectedContradictions: 0,
        expectedResolutionCandidates: 0,
        expectedInvestigationActions: 0
      }
    },
    facts: [
      { id: 'f1', caseId: 'c_baseline_only', subject: { id: 's1', label: 'Source', category: 'ENTITY', type: 'PERSON' }, predicate: 'INVOLVED', object: { id: 'm1', label: 'Mid', category: 'EVENT', type: 'ACTION', time: { start: '2025-01-01T10:00:00Z', end: '2025-01-01T10:00:00Z', precision: 'SECOND' } }, confidence: 1.0, epistemicStatus: 'OBSERVED', extractionMethod: 'MANUAL_ENTRY', confidence: 1.0, provenance: baseProv },
      { id: 'f2', caseId: 'c_baseline_only', subject: { id: 'm1', label: 'Mid', category: 'EVENT', type: 'ACTION', time: { start: '2025-01-01T10:00:00Z', end: '2025-01-01T10:00:00Z', precision: 'SECOND' } }, predicate: 'INVOLVED', object: { id: 't1', label: 'Target', category: 'ENTITY', type: 'PERSON' }, confidence: 1.0, epistemicStatus: 'OBSERVED', extractionMethod: 'MANUAL_ENTRY', confidence: 1.0, provenance: baseProv },
    ]
  },
  {
    benchmark: {
      id: 'c_temporal_conflict',
      name: 'Temporal Contradiction',
      description: 'A chain where time flows backward, which the baseline will accept but temporal algorithm will reject.',
      nodes: [],
      edges: [],
      sourceId: 's1',
      targetId: 't1',
      groundTruth: {
        expectedPossibilities: 1, // Baseline sees 1
        expectedValidPossibilities: 0, // Full eliminates it
        expectedContradictions: 0,
        expectedResolutionCandidates: 0,
        expectedInvestigationActions: 0
      }
    },
    facts: [
      { id: 'f1', caseId: 'c_temporal_conflict', subject: { id: 's1', label: 'Source', category: 'ENTITY', type: 'PERSON' }, predicate: 'INVOLVED', object: { id: 'm1', label: 'Mid1', category: 'EVENT', type: 'ACTION', time: { start: '2025-01-01T12:00:00Z', end: '2025-01-01T12:00:00Z', precision: 'SECOND' } }, confidence: 1.0, epistemicStatus: 'OBSERVED', extractionMethod: 'MANUAL_ENTRY', confidence: 1.0, provenance: baseProv },
      { id: 'f2', caseId: 'c_temporal_conflict', subject: { id: 'm1', label: 'Mid1', category: 'EVENT', type: 'ACTION', time: { start: '2025-01-01T12:00:00Z', end: '2025-01-01T12:00:00Z', precision: 'SECOND' } }, predicate: 'INVOLVED', object: { id: 't1', label: 'Target', category: 'ENTITY', type: 'PERSON' }, confidence: 1.0, epistemicStatus: 'OBSERVED', extractionMethod: 'MANUAL_ENTRY', confidence: 1.0, provenance: baseProv },
      // Note: we can't easily force temporal inversion here without making it fail reconstructing unless we use LOCATED_AT.
      // Wait, temporal reachability uses nodes' time.
    ]
  }
];

// Let's modify the Temporal Contradiction facts so it actually triggers a temporal inversion
BENCHMARKS[1].facts = [
    { id: 'f1', caseId: 'c_temporal_conflict', subject: { id: 's1', label: 'Source', category: 'ENTITY', type: 'PERSON' }, predicate: 'INVOLVED', object: { id: 'm1', label: 'Mid1', category: 'EVENT', type: 'ACTION', time: { start: '2025-01-01T12:00:00Z', end: '2025-01-01T12:00:00Z', precision: 'SECOND' } }, confidence: 1.0, epistemicStatus: 'OBSERVED', extractionMethod: 'MANUAL_ENTRY', confidence: 1.0, provenance: baseProv },
    { id: 'f2', caseId: 'c_temporal_conflict', subject: { id: 'm1', label: 'Mid1', category: 'EVENT', type: 'ACTION', time: { start: '2025-01-01T12:00:00Z', end: '2025-01-01T12:00:00Z', precision: 'SECOND' } }, predicate: 'CAUSED', object: { id: 'm2', label: 'Mid2', category: 'EVENT', type: 'ACTION', time: { start: '2025-01-01T10:00:00Z', end: '2025-01-01T10:00:00Z', precision: 'SECOND' } }, confidence: 1.0, epistemicStatus: 'OBSERVED', extractionMethod: 'MANUAL_ENTRY', confidence: 1.0, provenance: baseProv },
    { id: 'f3', caseId: 'c_temporal_conflict', subject: { id: 'm2', label: 'Mid2', category: 'EVENT', type: 'ACTION', time: { start: '2025-01-01T10:00:00Z', end: '2025-01-01T10:00:00Z', precision: 'SECOND' } }, predicate: 'INVOLVED', object: { id: 't1', label: 'Target', category: 'ENTITY', type: 'PERSON' }, confidence: 1.0, epistemicStatus: 'OBSERVED', extractionMethod: 'MANUAL_ENTRY', confidence: 1.0, provenance: baseProv }
];

BENCHMARKS.push({
    benchmark: {
      id: 'c_false_convergence',
      name: 'False Convergence / Parallel Paths',
      description: 'Two separate causal chains that converge at the target. Graph algorithms should detect this as branching pathways.',
      nodes: [], edges: [], sourceId: 's1', targetId: 't1',
      groundTruth: { expectedPossibilities: 2, expectedValidPossibilities: 2, expectedContradictions: 0, expectedResolutionCandidates: 1, expectedInvestigationActions: 2 }
    },
    facts: [
      { id: 'f1', caseId: 'c_false_convergence', subject: { id: 's1', label: 'Source', category: 'ENTITY', type: 'PERSON' }, predicate: 'INVOLVED', object: { id: 'm1', label: 'Mid1', category: 'EVENT', type: 'ACTION', time: { start: '2025-01-01T10:00:00Z', end: '2025-01-01T10:00:00Z', precision: 'SECOND' } }, confidence: 1.0, epistemicStatus: 'OBSERVED', extractionMethod: 'MANUAL_ENTRY', confidence: 1.0, provenance: baseProv },
      { id: 'f2', caseId: 'c_false_convergence', subject: { id: 's1', label: 'Source', category: 'ENTITY', type: 'PERSON' }, predicate: 'INVOLVED', object: { id: 'm2', label: 'Mid2', category: 'EVENT', type: 'ACTION', time: { start: '2025-01-01T10:00:00Z', end: '2025-01-01T10:00:00Z', precision: 'SECOND' } }, confidence: 1.0, epistemicStatus: 'OBSERVED', extractionMethod: 'MANUAL_ENTRY', confidence: 1.0, provenance: baseProv },
      { id: 'f3', caseId: 'c_false_convergence', subject: { id: 'm1', label: 'Mid1', category: 'EVENT', type: 'ACTION', time: { start: '2025-01-01T10:00:00Z', end: '2025-01-01T10:00:00Z', precision: 'SECOND' } }, predicate: 'INVOLVED', object: { id: 't1', label: 'Target', category: 'ENTITY', type: 'PERSON' }, confidence: 1.0, epistemicStatus: 'OBSERVED', extractionMethod: 'MANUAL_ENTRY', confidence: 1.0, provenance: baseProv },
      { id: 'f4', caseId: 'c_false_convergence', subject: { id: 'm2', label: 'Mid2', category: 'EVENT', type: 'ACTION', time: { start: '2025-01-01T10:00:00Z', end: '2025-01-01T10:00:00Z', precision: 'SECOND' } }, predicate: 'INVOLVED', object: { id: 't1', label: 'Target', category: 'ENTITY', type: 'PERSON' }, confidence: 1.0, epistemicStatus: 'OBSERVED', extractionMethod: 'MANUAL_ENTRY', confidence: 1.0, provenance: baseProv }
    ]
});

test('Phase 16: End-to-End Investigative Evaluation', async () => {
  const { pipeline, db } = setupPipeline();
  const evaluationEngine = new EndToEndEvaluationEngine(pipeline);

  const reports = [];
  
  for (const { benchmark, facts } of BENCHMARKS) {
    db.exec(`INSERT INTO cases (id, name, status, created_at, updated_at) VALUES ('${benchmark.id}', '${benchmark.name}', 'ACTIVE', '2025-01-01', '2025-01-01');`);
    
    const report = await evaluationEngine.evaluateCase(benchmark, facts);
    reports.push(report);
  }

  // Generate Markdown
  let md = `# END-TO-END INVESTIGATIVE EVALUATION\n\n`;
  md += `## 1. Benchmark Methodology\n`;
  md += `The system evaluates 3 pipelines (Baseline, Full Graph Reasoning, Adaptive Graph Reasoning) across a deterministic benchmark dataset. Ablation studies measure the unique contribution of each graph algorithm.\n\n`;
  
  for (const report of reports) {
    md += `### Case: ${report.caseName}\n`;
    md += `**Description:** ${report.description}\n\n`;
    md += `**Value Assessment:** \`${report.valueAssessment}\`\n\n`;
    
    md += `| Pipeline | Possibilities | Valid Retained | Eliminated | Runtime (ms) | Precision | Recall | Algorithms Executed |\n`;
    md += `|----------|---------------|----------------|------------|--------------|-----------|--------|---------------------|\n`;
    md += `| Baseline | ${report.baseline.possibilitiesDiscovered} | ${report.baseline.validPossibilitiesRetained} | ${report.baseline.invalidPossibilitiesEliminated} | ${report.baseline.runtimeMs.toFixed(1)} | ${report.baseline.precision} | ${report.baseline.recall} | ${report.baseline.algorithmsExecuted.join(', ')} |\n`;
    md += `| Full | ${report.full.possibilitiesDiscovered} | ${report.full.validPossibilitiesRetained} | ${report.full.invalidPossibilitiesEliminated} | ${report.full.runtimeMs.toFixed(1)} | ${report.full.precision} | ${report.full.recall} | ${report.full.algorithmsExecuted.join(', ')} |\n`;
    md += `| Adaptive | ${report.adaptive.possibilitiesDiscovered} | ${report.adaptive.validPossibilitiesRetained} | ${report.adaptive.invalidPossibilitiesEliminated} | ${report.adaptive.runtimeMs.toFixed(1)} | ${report.adaptive.precision} | ${report.adaptive.recall} | ${report.adaptive.algorithmsExecuted.join(', ')} |\n\n`;
    
    md += `**Ablation Study (Full minus X):**\n\n`;
    for (const [variant, res] of Object.entries(report.ablations)) {
      md += `- **${variant}:** Retained ${res.validPossibilitiesRetained}, Eliminated ${res.invalidPossibilitiesEliminated}\n`;
    }
    md += `\n---\n\n`;
    
    // Assertions
    if (report.caseId === 'c_temporal_conflict') {
       console.log("Baseline:", JSON.stringify(report.baseline, null, 2));
       console.log("Full:", JSON.stringify(report.full, null, 2));
       console.log("Baseline FP:", report.baseline.falsePositiveRate, "Full FP:", report.full.falsePositiveRate, "Baseline PossDiscovered:", report.baseline.possibilitiesDiscovered, "ValidRetained:", report.baseline.validPossibilitiesRetained);
       assert.equal(report.valueAssessment, 'SIGNIFICANT_VALUE', 'Temporal contradiction should result in SIGNIFICANT_VALUE by eliminating impossible path');
       assert.equal(report.baseline.possibilitiesDiscovered, 1, 'Baseline should generate the invalid path before evaluating it');
       assert.equal(report.full.possibilitiesDiscovered, 0, 'Full should mathematically prune the branch before generation');
    }
  }

  const __dirname = path.dirname(new URL(import.meta.url).pathname);
  const rootDir = path.resolve(__dirname, '../../../');
  fs.writeFileSync(path.join(rootDir, 'END_TO_END_EVALUATION.md'), md);
});

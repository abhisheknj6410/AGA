import { Router } from 'express';
import { EndToEndEvaluationEngine } from '../../application/evaluation/end-to-end-evaluation-engine.js';
import { CaseReasoningPipeline } from '../../application/case-reasoning-pipeline.js';
import { SyntheticBenchmarkCase } from '../../application/evaluation/evaluation-types.js';
import { EvidenceFact } from '../../domain/evidence-types.js';

export function createEvaluationRouter(pipeline: CaseReasoningPipeline): Router {
  const router = Router();

  router.get('/benchmark', async (req, res) => {
    const evaluationEngine = new EndToEndEvaluationEngine(pipeline);
    const baseProv = { sourceKind: 'DOCUMENT' as const, reliability: 1.0, sourceName: 'Evaluation Benchmark', sourceReference: 'benchmark-ref', sourceEvidenceId: 'ev-bench-1' };
    
    const benchmarkCases: { benchmark: SyntheticBenchmarkCase; facts: EvidenceFact[] }[] = [
      {
        benchmark: {
          id: 'bench_false_convergence',
          name: 'False Convergence',
          description: 'Two separate causal chains that converge at the target.',
          nodes: [], edges: [], sourceId: 's1', targetId: 't1',
          groundTruth: { expectedPossibilities: 2, expectedValidPossibilities: 2, expectedContradictions: 0, expectedResolutionCandidates: 1, expectedInvestigationActions: 2 }
        },
        facts: [
          { id: 'f1', caseId: 'bench_false_convergence', subject: { id: 's1', label: 'Source', category: 'ENTITY', type: 'PERSON' }, predicate: 'INVOLVED', object: { id: 'm1', label: 'Mid1', category: 'EVENT', type: 'ACTION', time: { start: '2025-01-01T10:00:00Z', end: '2025-01-01T10:00:00Z', precision: 'SECOND' } }, epistemicStatus: 'OBSERVED', extractionMethod: 'MANUAL_ENTRY', confidence: 1.0, provenance: baseProv },
          { id: 'f2', caseId: 'bench_false_convergence', subject: { id: 's1', label: 'Source', category: 'ENTITY', type: 'PERSON' }, predicate: 'INVOLVED', object: { id: 'm2', label: 'Mid2', category: 'EVENT', type: 'ACTION', time: { start: '2025-01-01T10:00:00Z', end: '2025-01-01T10:00:00Z', precision: 'SECOND' } }, epistemicStatus: 'OBSERVED', extractionMethod: 'MANUAL_ENTRY', confidence: 1.0, provenance: baseProv },
          { id: 'f3', caseId: 'bench_false_convergence', subject: { id: 'm1', label: 'Mid1', category: 'EVENT', type: 'ACTION', time: { start: '2025-01-01T10:00:00Z', end: '2025-01-01T10:00:00Z', precision: 'SECOND' } }, predicate: 'INVOLVED', object: { id: 't1', label: 'Target', category: 'ENTITY', type: 'PERSON' }, epistemicStatus: 'OBSERVED', extractionMethod: 'MANUAL_ENTRY', confidence: 1.0, provenance: baseProv },
          { id: 'f4', caseId: 'bench_false_convergence', subject: { id: 'm2', label: 'Mid2', category: 'EVENT', type: 'ACTION', time: { start: '2025-01-01T10:00:00Z', end: '2025-01-01T10:00:00Z', precision: 'SECOND' } }, predicate: 'INVOLVED', object: { id: 't1', label: 'Target', category: 'ENTITY', type: 'PERSON' }, epistemicStatus: 'OBSERVED', extractionMethod: 'MANUAL_ENTRY', confidence: 1.0, provenance: baseProv }
        ]
      }
    ];

    try {
      const reports = [];
      for (const bc of benchmarkCases) {
         reports.push(await evaluationEngine.evaluateCase(bc.benchmark, bc.facts));
      }
      res.json({ reports });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}

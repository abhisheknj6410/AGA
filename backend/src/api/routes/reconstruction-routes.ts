import { Router, Request, Response } from 'express';
import { EvidenceReconstructionEngine } from '../../application/evidence-reconstruction-engine.js';
import { GraphService } from '../../application/graph-service.js';
import { EvidenceFact } from '../../domain/reconstruction-types.js';

export function createReconstructionRouter(graphService: GraphService): Router {
  const router = Router();

  /**
   * POST /api/cases/:id/reconstruction/run
   * Executes the 7-gate validation and graph reconstruction pipeline.
   * If facts are supplied in body, reconstructs from them; otherwise uses demo dataset.
   */
  router.post('/:id/reconstruction/run', (req: Request, res: Response) => {
    try {
      const caseId = req.params.id;
      const customFacts = req.body.facts as EvidenceFact[] | undefined;

      const factsToUse = customFacts && customFacts.length > 0
        ? customFacts
        : EvidenceReconstructionEngine.generateMessyBenchmarkDataset();

      const report = EvidenceReconstructionEngine.reconstruct(caseId, factsToUse);
      res.json(report);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Evidence reconstruction failed' });
    }
  });

  /**
   * GET /api/cases/:id/reconstruction/provenance/:edgeId
   * Retrieves the detailed provenance trace for a specific graph edge.
   */
  router.get('/:id/reconstruction/provenance/:edgeId', (req: Request, res: Response) => {
    try {
      const caseId = req.params.id;
      const edgeId = req.params.edgeId;

      const defaultFacts = EvidenceReconstructionEngine.generateMessyBenchmarkDataset();
      const report = EvidenceReconstructionEngine.reconstruct(caseId, defaultFacts);

      const trace = report.provenanceTraces.find(t => t.edgeId === edgeId);
      if (!trace) {
        // Fallback: check if edge exists in accepted graph
        const graph = graphService.getGraph(caseId);
        const edge = graph?.edges.find(e => e.id === edgeId);
        if (edge) {
          res.json({
            edgeId: edge.id,
            sourceNode: { id: edge.source, label: edge.source, category: 'ENTITY' },
            targetNode: { id: edge.target, label: edge.target, category: 'EVENT' },
            edgeType: edge.type,
            status: edge.status,
            supportingFacts: [],
            sourceEvidences: edge.evidenceRefs.map(ref => ({
              id: ref,
              name: `Evidence ${ref}`,
              kind: 'SYSTEM',
              reference: `Citation for ${ref}`
            })),
            derivationChain: [`Directly linked to evidence: ${edge.evidenceRefs.join(', ')}`],
            isDirectlyObserved: edge.status === 'OBSERVED',
            isInference: edge.status === 'DERIVED'
          });
          return;
        }

        res.status(404).json({ error: `Provenance trace for edge ${edgeId} not found` });
        return;
      }

      res.json(trace);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch provenance trace' });
    }
  });

  /**
   * GET /api/reconstruction/benchmark
   * Executes the canonical Messy Evidence Benchmark.
   */
  router.get('/benchmark', (req: Request, res: Response) => {
    try {
      const report = EvidenceReconstructionEngine.runMessyBenchmark();
      res.json(report);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Messy benchmark execution failed' });
    }
  });

  /**
   * GET /api/reconstruction/benchmark/dataset
   * Returns the canonical messy evidence dataset.
   */
  router.get('/benchmark/dataset', (req: Request, res: Response) => {
    try {
      const dataset = EvidenceReconstructionEngine.generateMessyBenchmarkDataset();
      res.json(dataset);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch benchmark dataset' });
    }
  });

  return router;
}

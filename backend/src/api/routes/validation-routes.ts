import { Router, Request, Response } from 'express';
import { EpistemicValidationEngine } from '../../application/epistemic-validation-engine.js';
import { GraphService } from '../../application/graph-service.js';

export function createValidationRouter(
  validationEngine: EpistemicValidationEngine,
  graphService: GraphService
): Router {
  const router = Router();

  /**
   * GET /api/cases/:id/validation/epistemic
   * Evaluates the epistemic triad (graph-consistent vs evidence-supported vs investigatively-useful),
   * audits action justification, and flags false positive reasoning anomalies.
   */
  router.get('/:id/validation/epistemic', async (req: Request, res: Response) => {
    try {
      const caseId = req.params.id;
      const graph = graphService.getGraph(caseId);
      if (!graph) {
        res.status(404).json({ error: `Graph not found for case ${caseId}` });
        return;
      }

      const report = await validationEngine.validateCase(caseId, graph);
      res.json(report);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Epistemic validation failed' });
    }
  });

  return router;
}

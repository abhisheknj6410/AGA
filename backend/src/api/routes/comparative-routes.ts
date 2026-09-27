import { Router, Request, Response } from 'express';
import { AlgorithmComparativeEngine } from '../../application/algorithm-comparative-engine.js';
import { GraphService } from '../../application/graph-service.js';

export function createComparativeRouter(
  comparativeEngine: AlgorithmComparativeEngine,
  graphService: GraphService
): Router {
  const router = Router();

  /**
   * GET /api/cases/:id/algorithms/comparative
   * Evaluates the comparative investigative value of all 7 consequential graph algorithms
   * against simpler baseline graph reasoning methods.
   */
  router.get('/:id/algorithms/comparative', async (req: Request, res: Response) => {
    try {
      const caseId = req.params.id;
      const graph = graphService.getGraph(caseId);
      if (!graph) {
        res.status(404).json({ error: `Graph not found for case ${caseId}` });
        return;
      }

      const report = await comparativeEngine.evaluateCaseComparison(caseId, graph);
      res.json(report);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Algorithm comparative evaluation failed' });
    }
  });

  return router;
}

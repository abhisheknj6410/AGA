import { Router, Request, Response } from 'express';
import { InvestigationDecisionEngine } from '../../application/investigation-decision-engine.js';
import { GraphService } from '../../application/graph-service.js';

export function createDecisionRouter(
  decisionEngine: InvestigationDecisionEngine,
  graphService: GraphService
): Router {
  const router = Router();

  /**
   * GET /api/cases/:id/decision
   * Evaluates the case graph to extract graph-derived evidence targets,
   * unresolved questions, and competing investigation strategies with algorithm traces.
   */
  router.get('/:id/decision', async (req: Request, res: Response) => {
    try {
      const caseId = req.params.id;
      const graph = graphService.getGraph(caseId);
      if (!graph) {
        res.status(404).json({ error: `Graph not found for case ${caseId}` });
        return;
      }

      const result = await decisionEngine.evaluateDecisions(caseId, graph);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to evaluate investigative decisions' });
    }
  });

  /**
   * POST /api/cases/:id/decision/simulate
   * Simulates the outcome of pursuing a specific investigation strategy.
   * Body: { strategyId: string, outcome: 'CONFIRMED' | 'REFUTED' }
   */
  router.post('/:id/decision/simulate', async (req: Request, res: Response) => {
    try {
      const caseId = req.params.id;
      const { strategyId, outcome } = req.body;

      if (!strategyId) {
        res.status(400).json({ error: 'strategyId is required' });
        return;
      }

      const validOutcome = outcome === 'REFUTED' ? 'REFUTED' : 'CONFIRMED';
      const graph = graphService.getGraph(caseId);
      if (!graph) {
        res.status(404).json({ error: `Graph not found for case ${caseId}` });
        return;
      }

      const simulation = await decisionEngine.simulateStrategy(caseId, graph, strategyId, validOutcome);
      res.json(simulation);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Strategy simulation failed' });
    }
  });

  return router;
}

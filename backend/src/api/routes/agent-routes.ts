import { Router, Request, Response, NextFunction } from 'express';
import { GraphService } from '../../application/graph-service.js';
import { InvestigationAgentService } from '../../application/investigation-agent-service.js';

export function createAgentRouter(
  graphService: GraphService,
  agentService: InvestigationAgentService
): Router {
  const router = Router({ mergeParams: true });

  // Query graph & possibility space
  router.post('/query', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { caseId } = req.params;
      const { query } = req.body;

      if (!query || typeof query !== 'string') {
        return res.status(400).json({ error: 'Field "query" is required.' });
      }

      const baseGraph = graphService.getGraph(caseId);
      const result = await agentService.processQuery(caseId, baseGraph, query);

      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  return router;
}

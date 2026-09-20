import { Router, Request, Response, NextFunction } from 'express';
import { GraphService } from '../../application/graph-service.js';
import { GraphDiagnostics } from '../../application/graph-diagnostics.js';

export function createGraphRouter(graphService: GraphService): Router {
  const router = Router({ mergeParams: true });

  // GET /cases/:caseId/graph - Get Complete Visualization Graph
  router.get('/', (req: Request, res: Response, next: NextFunction) => {
    try {
      const { caseId } = req.params;
      const graph = graphService.getGraph(caseId);
      res.json(graph);
    } catch (err) {
      next(err);
    }
  });

  // GET /cases/:caseId/graph/validate - Validate Whole Graph Integrity
  router.get('/validate', (req: Request, res: Response, next: NextFunction) => {
    try {
      const { caseId } = req.params;
      const validation = graphService.validateGraphIntegrity(caseId);
      res.json(validation);
    } catch (err) {
      next(err);
    }
  });

  // GET /cases/:caseId/graph/diagnostics - Structural Diagnostics & Phase 2 Readiness Analysis
  router.get('/diagnostics', (req: Request, res: Response, next: NextFunction) => {
    try {
      const { caseId } = req.params;
      const graph = graphService.getGraph(caseId);
      const diagnostics = GraphDiagnostics.analyze(graph);
      res.json(diagnostics);
    } catch (err) {
      next(err);
    }
  });

  return router;
}

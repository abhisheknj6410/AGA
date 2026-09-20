import { Router, Request, Response, NextFunction } from 'express';
import { GraphService } from '../../application/graph-service.js';

export function createEdgeRouter(graphService: GraphService): Router {
  const router = Router({ mergeParams: true });

  // POST /cases/:caseId/edges - Create Relationship
  router.post('/', (req: Request, res: Response, next: NextFunction) => {
    try {
      const { caseId } = req.params;
      const { who, reason, ...edgeData } = req.body;
      const created = graphService.addEdge(caseId, edgeData, who || 'investigator', reason);
      res.status(201).json(created);
    } catch (err) {
      next(err);
    }
  });

  // GET /cases/:caseId/edges - List Relationships
  router.get('/', (req: Request, res: Response, next: NextFunction) => {
    try {
      const { caseId } = req.params;
      const edges = graphService.listEdges(caseId);
      res.json(edges);
    } catch (err) {
      next(err);
    }
  });

  // GET /cases/:caseId/edges/:edgeId - Get Relationship
  router.get('/:edgeId', (req: Request, res: Response, next: NextFunction) => {
    try {
      const { caseId, edgeId } = req.params;
      const edge = graphService.getEdge(caseId, edgeId);
      res.json(edge);
    } catch (err) {
      next(err);
    }
  });

  // PATCH /cases/:caseId/edges/:edgeId - Update Relationship
  router.patch('/:edgeId', (req: Request, res: Response, next: NextFunction) => {
    try {
      const { caseId, edgeId } = req.params;
      const { who, reason, ...updates } = req.body;
      const updated = graphService.updateEdge(caseId, edgeId, updates, who || 'investigator', reason);
      res.json(updated);
    } catch (err) {
      next(err);
    }
  });

  // DELETE /cases/:caseId/edges/:edgeId - Delete Relationship
  router.delete('/:edgeId', (req: Request, res: Response, next: NextFunction) => {
    try {
      const { caseId, edgeId } = req.params;
      const { who, reason } = req.body || {};
      graphService.deleteEdge(caseId, edgeId, who || 'investigator', reason);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  });

  return router;
}

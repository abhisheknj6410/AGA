import { Router, Request, Response, NextFunction } from 'express';
import { GraphService } from '../../application/graph-service.js';

export function createNodeRouter(graphService: GraphService): Router {
  const router = Router({ mergeParams: true });

  // POST /cases/:caseId/nodes - Add Node (Entity or Event or Evidence)
  router.post('/', (req: Request, res: Response, next: NextFunction) => {
    try {
      const { caseId } = req.params;
      const { who, reason, ...nodeData } = req.body;
      const created = graphService.addNode(caseId, nodeData, who || 'investigator', reason);
      res.status(201).json(created);
    } catch (err) {
      next(err);
    }
  });

  // GET /cases/:caseId/nodes - List Nodes
  router.get('/', (req: Request, res: Response, next: NextFunction) => {
    try {
      const { caseId } = req.params;
      const category = req.query.category as string | undefined;
      const nodes = graphService.listNodes(caseId, category);
      res.json(nodes);
    } catch (err) {
      next(err);
    }
  });

  // GET /cases/:caseId/nodes/:nodeId - Get Node
  router.get('/:nodeId', (req: Request, res: Response, next: NextFunction) => {
    try {
      const { caseId, nodeId } = req.params;
      const node = graphService.getNode(caseId, nodeId);
      res.json(node);
    } catch (err) {
      next(err);
    }
  });

  // PATCH /cases/:caseId/nodes/:nodeId - Update Node
  router.patch('/:nodeId', (req: Request, res: Response, next: NextFunction) => {
    try {
      const { caseId, nodeId } = req.params;
      const { who, reason, ...updates } = req.body;
      const updated = graphService.updateNode(caseId, nodeId, updates, who || 'investigator', reason);
      res.json(updated);
    } catch (err) {
      next(err);
    }
  });

  // DELETE /cases/:caseId/nodes/:nodeId - Delete Node
  router.delete('/:nodeId', (req: Request, res: Response, next: NextFunction) => {
    try {
      const { caseId, nodeId } = req.params;
      const { who, reason } = req.body || {};
      graphService.deleteNode(caseId, nodeId, who || 'investigator', reason);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  });

  return router;
}

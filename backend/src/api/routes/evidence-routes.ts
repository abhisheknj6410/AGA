import { Router, Request, Response, NextFunction } from 'express';
import { GraphService } from '../../application/graph-service.js';

export function createEvidenceRouter(graphService: GraphService): Router {
  const router = Router({ mergeParams: true });

  // POST /cases/:caseId/evidence - Register Evidence
  router.post('/', (req: Request, res: Response, next: NextFunction) => {
    try {
      const { caseId } = req.params;
      const { who, reason, ...evidenceData } = req.body;
      const created = graphService.addNode(
        caseId,
        {
          ...evidenceData,
          category: 'EVIDENCE',
          type: evidenceData.type || evidenceData.evidenceType || 'LOG'
        },
        who || 'investigator',
        reason
      );
      res.status(201).json(created);
    } catch (err) {
      next(err);
    }
  });

  // GET /cases/:caseId/evidence - List Evidence
  router.get('/', (req: Request, res: Response, next: NextFunction) => {
    try {
      const { caseId } = req.params;
      const evidence = graphService.listNodes(caseId, 'EVIDENCE');
      res.json(evidence);
    } catch (err) {
      next(err);
    }
  });

  // GET /cases/:caseId/evidence/:evidenceId - Get Evidence
  router.get('/:evidenceId', (req: Request, res: Response, next: NextFunction) => {
    try {
      const { caseId, evidenceId } = req.params;
      const evidence = graphService.getNode(caseId, evidenceId);
      if (evidence.category !== 'EVIDENCE') {
        res.status(404).json({ error: `Node '${evidenceId}' is not an evidence object.` });
        return;
      }
      res.json(evidence);
    } catch (err) {
      next(err);
    }
  });

  return router;
}

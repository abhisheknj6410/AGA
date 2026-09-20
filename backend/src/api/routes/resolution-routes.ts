import { Router, Request, Response, NextFunction } from 'express';
import { EntityResolutionService } from '../../application/entity-resolution-service.js';

export function createResolutionRouter(resolutionService: EntityResolutionService): Router {
  const router = Router({ mergeParams: true });

  // GET /cases/:caseId/resolution/candidates - List Resolution Candidates
  router.get('/candidates', (req: Request, res: Response, next: NextFunction) => {
    try {
      const { caseId } = req.params;
      const candidates = resolutionService.getCandidates(caseId);
      res.json(candidates);
    } catch (err) {
      next(err);
    }
  });

  // POST /cases/:caseId/resolution/merge - Confirm and Merge Candidate
  router.post('/merge', (req: Request, res: Response, next: NextFunction) => {
    try {
      const { caseId } = req.params;
      const { candidateId, who, reason } = req.body;
      if (!candidateId) {
        res.status(400).json({ error: 'candidateId is required.' });
        return;
      }
      resolutionService.mergeNodes(candidateId, caseId, who || 'investigator', reason);
      res.json({ success: true, message: 'Entities successfully merged and edges rewired.' });
    } catch (err) {
      next(err);
    }
  });

  // POST /cases/:caseId/resolution/reject - Reject Candidate (Mark Distinct)
  router.post('/reject', (req: Request, res: Response, next: NextFunction) => {
    try {
      const { caseId } = req.params;
      const { candidateId, who, reason } = req.body;
      if (!candidateId) {
        res.status(400).json({ error: 'candidateId is required.' });
        return;
      }
      resolutionService.rejectCandidate(candidateId, caseId, who || 'investigator', reason);
      res.json({ success: true, message: 'Resolution candidate marked as distinct entities.' });
    } catch (err) {
      next(err);
    }
  });

  return router;
}

import { Router, Request, Response, NextFunction } from 'express';
import { AuditRepository } from '../../infrastructure/repositories/audit-repository.js';

export function createAuditRouter(auditRepo: AuditRepository): Router {
  const router = Router({ mergeParams: true });

  // GET /cases/:caseId/audit - Get Audit Log History
  router.get('/', (req: Request, res: Response, next: NextFunction) => {
    try {
      const { caseId } = req.params;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 100;
      const logs = auditRepo.getByCaseId(caseId, limit);
      res.json(logs);
    } catch (err) {
      next(err);
    }
  });

  return router;
}

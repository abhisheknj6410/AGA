import { Router, Request, Response, NextFunction } from 'express';
import { CaseService } from '../../application/case-service.js';

export function createCaseRouter(caseService: CaseService): Router {
  const router = Router();

  // POST /cases - Create Case
  router.post('/', (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, description, who } = req.body;
      const created = caseService.createCase(name, description, who || 'investigator');
      res.status(201).json(created);
    } catch (err) {
      next(err);
    }
  });

  // GET /cases - List All Cases
  router.get('/', (req: Request, res: Response, next: NextFunction) => {
    try {
      const cases = caseService.listCases();
      res.json(cases);
    } catch (err) {
      next(err);
    }
  });

  // GET /cases/:id - Get Case by ID
  router.get('/:id', (req: Request, res: Response, next: NextFunction) => {
    try {
      const caseData = caseService.getCase(req.params.id);
      res.json(caseData);
    } catch (err) {
      next(err);
    }
  });

  // PATCH /cases/:id - Update Case
  router.patch('/:id', (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, description, status, who, reason } = req.body;
      const updated = caseService.updateCase(req.params.id, { name, description, status }, who, reason);
      res.json(updated);
    } catch (err) {
      next(err);
    }
  });

  // DELETE /cases/:id - Delete Case
  router.delete('/:id', (req: Request, res: Response, next: NextFunction) => {
    try {
      const { who, reason } = req.body || {};
      caseService.deleteCase(req.params.id, who, reason);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  });

  return router;
}

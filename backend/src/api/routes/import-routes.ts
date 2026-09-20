import { Router, Request, Response, NextFunction } from 'express';
import { ImportService } from '../../application/import-service.js';

export function createImportRouter(importService: ImportService): Router {
  const router = Router({ mergeParams: true });

  // POST /cases/:caseId/import/json - Import Structured JSON
  router.post('/json', (req: Request, res: Response, next: NextFunction) => {
    try {
      const { caseId } = req.params;
      const { who, ...payload } = req.body;
      const result = importService.importJson(caseId, payload, who || 'investigator');

      if (!result.success) {
        res.status(422).json({
          message: 'Import rejected due to validation errors. Graph remained untouched.',
          result
        });
        return;
      }

      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  });

  // POST /cases/:caseId/import/csv - Import CSV
  router.post('/csv', (req: Request, res: Response, next: NextFunction) => {
    try {
      const { caseId } = req.params;
      const { csv, format, who } = req.body;

      if (!csv || typeof csv !== 'string') {
        res.status(400).json({ error: 'csv string content is required.' });
        return;
      }

      const result = importService.importCsv(caseId, csv, format === 'EDGES' ? 'EDGES' : 'NODES', who || 'investigator');

      if (!result.success) {
        res.status(422).json({
          message: 'Import rejected due to CSV validation errors. Graph remained untouched.',
          result
        });
        return;
      }

      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  });

  return router;
}

import { Router, Request, Response, NextFunction } from 'express';
import { AiExtractionService } from '../../application/ai-extraction-service.js';

export function createExtractionRouter(aiService: AiExtractionService): Router {
  const router = Router({ mergeParams: true });

  // POST /cases/:caseId/extract - Extract candidate structured objects from raw evidence text
  router.post('/', (req: Request, res: Response, next: NextFunction) => {
    try {
      const { rawText, sourceName, evidenceType } = req.body;

      if (!rawText || typeof rawText !== 'string') {
        res.status(400).json({ error: 'rawText string is required for extraction.' });
        return;
      }

      const candidates = aiService.extractStructuredCandidates({
        rawText,
        sourceName: sourceName || 'Raw Text Excerpt',
        evidenceType: evidenceType || 'LOG'
      });

      res.json({
        message: 'Extraction complete. Candidates ready for investigator review and validation.',
        untrustedCandidates: candidates
      });
    } catch (err) {
      next(err);
    }
  });

  return router;
}

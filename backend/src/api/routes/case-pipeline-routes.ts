import { Router, Request, Response } from 'express';
import { CaseReasoningPipeline } from '../../application/case-reasoning-pipeline.js';
import { EvidenceFact } from '../../domain/reconstruction-types.js';
import { WhyInspectionQuery } from '../../domain/case-pipeline-types.js';

export function createCasePipelineRouter(pipeline: CaseReasoningPipeline): Router {
  const router = Router();

  /**
   * POST /api/cases/:id/pipeline/run
   * Executes the full End-to-End Case Reasoning Pipeline.
   */
  router.post('/:id/pipeline/run', async (req: Request, res: Response) => {
    try {
      const caseId = req.params.id;
      const customFacts = req.body.facts as EvidenceFact[] | undefined;

      const report = await pipeline.executeCasePipeline(caseId, customFacts);
      res.json(report);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'End-to-end case reasoning pipeline failed' });
    }
  });

  /**
   * GET /api/pipeline/benchmark
   * Executes the canonical messy benchmark through the complete end-to-end pipeline.
   */
  router.get('/benchmark', async (req: Request, res: Response) => {
    try {
      const report = await pipeline.executeCasePipeline('benchmark-e2e-case');
      res.json(report);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'End-to-end pipeline benchmark failed' });
    }
  });

  /**
   * POST /api/cases/:id/pipeline/why
   * Performs deterministic "Why?" inspection.
   */
  router.post('/:id/pipeline/why', async (req: Request, res: Response) => {
    try {
      const caseId = req.params.id;
      const query = req.body as WhyInspectionQuery;

      if (!query.queryType || !query.targetId) {
        res.status(400).json({ error: 'queryType and targetId are required for Why inspection' });
        return;
      }

      const report = await pipeline.executeCasePipeline(caseId);
      const answer = pipeline.answerWhyQuery(report, query);
      res.json(answer);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Why inspection failed' });
    }
  });

  /**
   * GET /api/cases/:id/pipeline/comparison
   * Retrieves competing interpretation branch comparison.
   */
  router.get('/:id/pipeline/comparison', async (req: Request, res: Response) => {
    try {
      const caseId = req.params.id;
      const report = await pipeline.executeCasePipeline(caseId);
      if (!report.branchComparison) {
        res.status(404).json({ error: 'No competing interpretation branches detected for this case.' });
        return;
      }
      res.json(report.branchComparison);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch branch comparison' });
    }
  });

  return router;
}

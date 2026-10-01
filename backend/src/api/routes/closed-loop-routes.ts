import { Router, Request, Response } from 'express';
import { EvidenceImpactEngine } from '../../application/evidence-impact-engine.js';
import { IngestEvidenceInput } from '../../domain/closed-loop-types.js';

export function createClosedLoopRouter(evidenceImpactEngine: EvidenceImpactEngine): Router {
  const router = Router();

  /**
   * POST /api/cases/:id/evidence/ingest
   * Closed-loop evidence ingestion: updates graph, runs incremental recalculation,
   * diffs possibilities & resolution, and updates investigation plan.
   */
  router.post('/:id/evidence/ingest', async (req: Request, res: Response) => {
    try {
      const caseId = req.params.id;
      const { evidenceNode, attachedEdges, summary, requestedByActionId, reason } = req.body;

      if (!evidenceNode || !evidenceNode.id || !evidenceNode.label) {
        res.status(400).json({ error: 'evidenceNode with id and label is required' });
        return;
      }

      const input: IngestEvidenceInput = {
        caseId,
        evidenceNode,
        attachedEdges: attachedEdges || [],
        summary: summary || `Ingested evidence '${evidenceNode.label}'`,
        requestedByActionId,
        reason
      };

      const cycle = await evidenceImpactEngine.ingestEvidence(input);
      res.status(201).json(cycle);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Evidence ingestion failed' });
    }
  });

  /**
   * GET /api/cases/:id/closed-loop/cycles
   */
  router.get('/:id/closed-loop/cycles', (req: Request, res: Response) => {
    try {
      const caseId = req.params.id;
      const cycles = evidenceImpactEngine.getCycles(caseId);
      res.json(cycles);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * GET /api/cases/:id/closed-loop/latest
   */
  router.get('/:id/closed-loop/latest', (req: Request, res: Response) => {
    try {
      const caseId = req.params.id;
      const latest = evidenceImpactEngine.getLatestCycle(caseId);
      if (!latest) {
        res.status(404).json({ error: 'No closed-loop cycles recorded for this case yet.' });
        return;
      }
      res.json(latest);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * GET /api/cases/:id/closed-loop/benchmark
   */
  router.get('/:id/closed-loop/benchmark', async (req: Request, res: Response) => {
    try {
      const caseId = req.params.id;
      const benchmark = await evidenceImpactEngine.benchmarkIncrementalVsFull(caseId);
      res.json(benchmark);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * GET /api/cases/:id/closed-loop/versions
   */
  router.get('/:id/closed-loop/versions', async (req: Request, res: Response) => {
    try {
      const caseId = req.params.id;
      const history = await evidenceImpactEngine.getVersionHistory(caseId);
      res.json(history);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}

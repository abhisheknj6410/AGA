import { Router, Request, Response, NextFunction } from 'express';
import { GraphService } from '../../application/graph-service.js';
import { IncrementalReasoningEngine } from '../../application/incremental-reasoning-engine.js';

export function createIncrementalRouter(
  graphService: GraphService,
  incrementalEngine: IncrementalReasoningEngine
): Router {
  const router = Router({ mergeParams: true });

  // List all graph versions for case
  router.get('/versions', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { caseId } = req.params;
      const versions = incrementalEngine.getVersionRepository().getByCaseId(caseId);
      res.json({ versions });
    } catch (err) {
      next(err);
    }
  });

  // Get specific graph version
  router.get('/versions/:versionNumber', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { caseId, versionNumber } = req.params;
      const version = incrementalEngine.getVersionRepository().getByVersion(caseId, parseInt(versionNumber, 10));
      if (!version) {
        return res.status(404).json({ error: `Version ${versionNumber} not found.` });
      }
      res.json(version);
    } catch (err) {
      next(err);
    }
  });

  // Get latest incremental impact report
  router.get('/versions/latest/impact', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { caseId } = req.params;
      const report = incrementalEngine.getLatestImpactReport(caseId);
      res.json({ report });
    } catch (err) {
      next(err);
    }
  });

  // Run What-If Simulation
  router.post('/simulation/what-if', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { caseId } = req.params;
      const { action, targetId, parameters, generationOptions } = req.body;

      if (!action || !targetId) {
        return res.status(400).json({ error: 'Fields "action" and "targetId" are required for simulation.' });
      }

      const baseGraph = graphService.getGraph(caseId);
      const simulationResult = incrementalEngine.runWhatIfSimulation(
        caseId,
        baseGraph,
        { action, targetId, parameters },
        generationOptions || {}
      );

      res.json(simulationResult);
    } catch (err) {
      next(err);
    }
  });

  return router;
}

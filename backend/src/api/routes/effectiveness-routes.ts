import { Router, Request, Response, NextFunction } from 'express';
import { GraphService } from '../../application/graph-service.js';
import { AlgorithmEffectivenessEngine } from '../../application/algorithm-effectiveness-engine.js';
import { MULTI_DOMAIN_CASES_CATALOG } from '../../infrastructure/multi-domain-cases.js';

export function createEffectivenessRouter(
  graphService: GraphService,
  effectivenessEngine: AlgorithmEffectivenessEngine
): Router {
  const router = Router({ mergeParams: true });

  // GET /cases/:caseId/effectiveness/audit - Full Algorithm Effectiveness Audit
  router.get('/audit', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { caseId } = req.params;
      const baseGraph = graphService.getGraph(caseId);
      const audit = await effectivenessEngine.auditAllAlgorithms(caseId, baseGraph);
      res.json({ caseId, timestamp: new Date().toISOString(), algorithms: audit });
    } catch (err) {
      next(err);
    }
  });

  // GET /cases/:caseId/effectiveness/ablation/:algorithm - Run specific algorithm ablation
  router.get('/ablation/:algorithm', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { caseId, algorithm } = req.params;
      const baseGraph = graphService.getGraph(caseId);
      const ablation = await effectivenessEngine.runAblation(caseId, baseGraph, decodeURIComponent(algorithm));
      res.json(ablation);
    } catch (err) {
      next(err);
    }
  });

  // GET /cases/:caseId/effectiveness/impact-graph - Second-Order Algorithm Impact Graph
  router.get('/impact-graph', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { caseId } = req.params;
      const baseGraph = graphService.getGraph(caseId);
      const impactGraph = await effectivenessEngine.getImpactGraph(caseId, baseGraph);
      res.json(impactGraph);
    } catch (err) {
      next(err);
    }
  });

  // GET /cases/:caseId/effectiveness/reasoning-trace/:targetId - Computational Provenance Trace
  router.get('/reasoning-trace/:targetId', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { caseId, targetId } = req.params;
      const baseGraph = graphService.getGraph(caseId);
      const trace = await effectivenessEngine.getReasoningTrace(caseId, baseGraph, decodeURIComponent(targetId));
      res.json(trace);
    } catch (err) {
      next(err);
    }
  });

  // GET /cases/:caseId/effectiveness/cases - Multi-Domain Case Catalog
  router.get('/cases', async (_req: Request, res: Response, next: NextFunction) => {
    try {
      res.json({ cases: MULTI_DOMAIN_CASES_CATALOG });
    } catch (err) {
      next(err);
    }
  });

  // GET /cases/:caseId/effectiveness/benchmarks - Synthetic Scaling Benchmarks (100 to 10k nodes)
  router.get('/benchmarks', async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const benchmarks = await effectivenessEngine.runSyntheticBenchmarks();
      res.json({ benchmarks });
    } catch (err) {
      next(err);
    }
  });

  return router;
}

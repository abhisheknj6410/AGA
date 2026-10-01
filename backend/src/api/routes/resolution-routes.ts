import { Router, Request, Response, NextFunction } from 'express';
import { EntityResolutionService } from '../../application/entity-resolution-service.js';
import { GraphService } from '../../application/graph-service.js';
import { ResolutionReasoningEngine } from '../../application/resolution-reasoning-engine.js';

export function createResolutionRouter(
  resolutionService: EntityResolutionService,
  graphService?: GraphService,
  resolutionEngine?: ResolutionReasoningEngine
): Router {
  const router = Router({ mergeParams: true });

  // --- Entity Resolution Routes ---

  // GET /cases/:caseId/resolution/candidates - List Entity Resolution Candidates
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

  // --- Graph-Based Resolution Reasoning Routes (Phase 4) ---

  // GET /cases/:caseId/resolution/audit - Algorithm Audit Catalog
  router.get('/audit', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const audit = ResolutionReasoningEngine.getAlgorithmAudit();
      res.json({ audit });
    } catch (err) {
      next(err);
    }
  });

  // GET /cases/:caseId/resolution/analysis - Structural Families, Invariants, Differentiators, Candidates
  router.get('/analysis', async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!graphService || !resolutionEngine) {
        return res.status(501).json({ error: 'Resolution reasoning engine not configured.' });
      }
      const { caseId } = req.params;
      const baseGraph = graphService.getGraph(caseId);
      const result = resolutionEngine.runResolutionAnalysis(caseId, baseGraph);
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  // GET /cases/:caseId/resolution/matrix - Boolean Partition Matrix & Structural Uncertainty
  router.get('/matrix', async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!graphService || !resolutionEngine) {
        return res.status(501).json({ error: 'Resolution reasoning engine not configured.' });
      }
      const { caseId } = req.params;
      const baseGraph = graphService.getGraph(caseId);
      const result = resolutionEngine.runResolutionAnalysis(caseId, baseGraph);
      res.json(result.resolutionMatrix);
    } catch (err) {
      next(err);
    }
  });

  // POST /cases/:caseId/resolution/simulate - Counterfactual Resolution Simulation
  router.post('/simulate', async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!graphService || !resolutionEngine) {
        return res.status(501).json({ error: 'Resolution reasoning engine not configured.' });
      }
      const { caseId } = req.params;
      const { candidateId, action } = req.body;

      if (!candidateId) {
        return res.status(400).json({ error: 'Field "candidateId" is required for simulation.' });
      }

      const baseGraph = graphService.getGraph(caseId);
      const simulation = await resolutionEngine.simulateCounterfactualResolution(
        caseId,
        candidateId,
        baseGraph,
        action || 'CONFIRM_ELEMENT'
      );

      res.json(simulation);
    } catch (err) {
      next(err);
    }
  });

  return router;
}

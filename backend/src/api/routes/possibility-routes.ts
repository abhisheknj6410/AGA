import { Router, Request, Response, NextFunction } from 'express';
import { GraphService } from '../../application/graph-service.js';
import { PossibilityEngine } from '../../application/possibility-engine.js';
import { PossibilityRepository } from '../../infrastructure/repositories/possibility-repository.js';
import { ResolutionRepository } from '../../infrastructure/repositories/resolution-repository.js';
import { GraphAnalysisEngine } from '../../application/graph-analysis-engine.js';

export function createPossibilityRouter(
  graphService: GraphService,
  possibilityEngine: PossibilityEngine,
  possibilityRepo: PossibilityRepository,
  resolutionRepo: ResolutionRepository,
  analysisEngine: GraphAnalysisEngine
): Router {
  const router = Router({ mergeParams: true });

  // List all possibilities for case
  router.get('/', (req: Request, res: Response, next: NextFunction) => {
    try {
      const { caseId } = req.params;
      const possibilities = possibilityRepo.findByCaseId(caseId);
      res.json({ caseId, count: possibilities.length, possibilities });
    } catch (err) {
      next(err);
    }
  });

  // Generate bounded possibilities deterministically
  router.post('/generate', (req: Request, res: Response, next: NextFunction) => {
    try {
      const { caseId } = req.params;
      const options = req.body || {};
      const baseGraph = graphService.getGraph(caseId);
      const candidates = resolutionRepo.getByCaseId(caseId);

      const result = possibilityEngine.generatePossibilities(caseId, baseGraph, candidates, options);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  });

  // Get specific possibility by ID
  router.get('/:id', (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const possibility = possibilityRepo.findById(id);
      if (!possibility) {
        return res.status(404).json({ error: `Possibility '${id}' not found.` });
      }
      res.json(possibility);
    } catch (err) {
      next(err);
    }
  });

  // Run full algorithm analysis on specific possibility
  router.post('/:id/analyze', (req: Request, res: Response, next: NextFunction) => {
    try {
      const { caseId, id } = req.params;
      const possibility = possibilityRepo.findById(id);
      if (!possibility) {
        return res.status(404).json({ error: `Possibility '${id}' not found.` });
      }

      const baseGraph = graphService.getGraph(caseId);
      const possibilityGraph = GraphAnalysisEngine.applyDelta(baseGraph, possibility.graphChanges);

      const { sourceId, targetId } = req.body || {};
      const analysis = analysisEngine.runFullPossibilityAnalysis(
        possibilityGraph,
        caseId,
        id,
        sourceId,
        targetId
      );

      res.json({ possibilityId: id, analysis });
    } catch (err) {
      next(err);
    }
  });

  // Compare 2 to 5 possibilities side-by-side
  router.post('/compare', (req: Request, res: Response, next: NextFunction) => {
    try {
      const { caseId } = req.params;
      const { possibilityIds } = req.body;

      if (!Array.isArray(possibilityIds) || possibilityIds.length < 2) {
        return res.status(400).json({ error: 'At least 2 possibility IDs must be provided in an array.' });
      }

      const baseGraph = graphService.getGraph(caseId);
      const comparison = possibilityEngine.comparePossibilities(caseId, possibilityIds, baseGraph);
      res.json(comparison);
    } catch (err) {
      next(err);
    }
  });

  // Delete a possibility
  router.delete('/:id', (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const deleted = possibilityRepo.deletePossibility(id);
      if (!deleted) {
        return res.status(404).json({ error: `Possibility '${id}' not found.` });
      }
      res.json({ message: 'Possibility deleted successfully.', id });
    } catch (err) {
      next(err);
    }
  });

  return router;
}

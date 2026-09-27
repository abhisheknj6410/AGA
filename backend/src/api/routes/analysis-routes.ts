import { Router, Request, Response, NextFunction } from 'express';
import { GraphService } from '../../application/graph-service.js';
import { GraphAnalysisEngine } from '../../application/graph-analysis-engine.js';
import { PossibilityRepository } from '../../infrastructure/repositories/possibility-repository.js';
import { AlgorithmRepository } from '../../infrastructure/repositories/algorithm-repository.js';

export function createAnalysisRouter(
  graphService: GraphService,
  analysisEngine: GraphAnalysisEngine,
  possibilityRepo: PossibilityRepository,
  algorithmRepo: AlgorithmRepository
): Router {
  const router = Router({ mergeParams: true });

  // Run specific graph algorithm on demand
  router.post('/run', (req: Request, res: Response, next: NextFunction) => {
    try {
      const { caseId } = req.params;
      const { algorithm, possibilityId, parameters } = req.body;

      if (!algorithm) {
        return res.status(400).json({ error: 'Field "algorithm" is required.' });
      }

      let graph = graphService.getGraph(caseId);

      // If possibilityId specified, apply delta first
      if (possibilityId) {
        const p = possibilityRepo.findById(possibilityId);
        if (!p) {
          return res.status(404).json({ error: `Possibility '${possibilityId}' not found.` });
        }
        graph = GraphAnalysisEngine.applyDelta(graph, p.graphChanges);
      }

      let output: unknown;
      switch (algorithm.toUpperCase()) {
        case 'DIJKSTRA': {
          const { sourceId, targetId } = parameters || {};
          if (!sourceId || !targetId) {
            return res.status(400).json({ error: 'Dijkstra requires parameters.sourceId and parameters.targetId.' });
          }
          output = analysisEngine.runDijkstra(graph, sourceId, targetId, caseId, possibilityId);
          break;
        }
        case 'K_SHORTEST_PATHS': {
          const { sourceId, targetId, k } = parameters || {};
          if (!sourceId || !targetId) {
            return res.status(400).json({ error: 'K-Shortest Paths requires parameters.sourceId and parameters.targetId.' });
          }
          output = analysisEngine.runKShortestPaths(graph, sourceId, targetId, k || 3, caseId, possibilityId);
          break;
        }
        case 'ARTICULATION_POINTS': {
          output = analysisEngine.runArticulationPoints(graph, caseId, possibilityId);
          break;
        }
        case 'DOMINATORS': {
          const { rootId, targetId } = parameters || {};
          if (!rootId) {
            return res.status(400).json({ error: 'Dominators requires parameters.rootId.' });
          }
          output = analysisEngine.runDominators(graph, rootId, targetId, caseId, possibilityId);
          break;
        }
        case 'MIN_CUT': {
          const { sourceId, targetId } = parameters || {};
          if (!sourceId || !targetId) {
            return res.status(400).json({ error: 'Min-Cut requires parameters.sourceId and parameters.targetId.' });
          }
          output = analysisEngine.runMinCut(graph, sourceId, targetId, caseId, possibilityId);
          break;
        }
        case 'DISJOINT_PATHS': {
          const { sourceId, targetId, mode } = parameters || {};
          if (!sourceId || !targetId) {
            return res.status(400).json({ error: 'Disjoint Paths requires parameters.sourceId and parameters.targetId.' });
          }
          output = analysisEngine.runDisjointPaths(graph, sourceId, targetId, mode || 'VERTEX_DISJOINT', caseId, possibilityId);
          break;
        }
        case 'TEMPORAL_ANALYSIS': {
          output = analysisEngine.runTemporalAnalysis(graph, caseId, possibilityId);
          break;
        }
        case 'PATTERN_MATCHING': {
          output = analysisEngine.runPatternMatching(graph, caseId, possibilityId);
          break;
        }
        case 'STEINER_SUBGRAPH': {
          const { terminalIds } = parameters || {};
          if (!Array.isArray(terminalIds) || terminalIds.length < 2) {
            return res.status(400).json({ error: 'Steiner Subgraph requires an array of at least 2 terminalIds.' });
          }
          output = analysisEngine.runSteinerSubgraph(graph, terminalIds, caseId, possibilityId);
          break;
        }
        default:
          return res.status(400).json({
            error: `Unsupported algorithm '${algorithm}'. Supported: DIJKSTRA, K_SHORTEST_PATHS, ARTICULATION_POINTS, DOMINATORS, MIN_CUT, DISJOINT_PATHS, TEMPORAL_ANALYSIS, PATTERN_MATCHING, STEINER_SUBGRAPH.`
          });
      }

      res.json({
        caseId,
        possibilityId,
        algorithm,
        output
      });
    } catch (err) {
      next(err);
    }
  });

  // Get historical analytical algorithm runs
  router.get('/history', (req: Request, res: Response, next: NextFunction) => {
    try {
      const { caseId } = req.params;
      const history = algorithmRepo.getRecentRuns(caseId);
      res.json({ caseId, count: history.length, history });
    } catch (err) {
      next(err);
    }
  });

  return router;
}

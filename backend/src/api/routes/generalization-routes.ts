import { Router, Request, Response } from 'express';
import { GraphBenchmarkEngine } from '../../application/graph-benchmark-engine.js';
import { GraphTopologyGenerator } from '../../application/graph-topology-generator.js';
import { GraphService } from '../../application/graph-service.js';

export function createGeneralizationRouter(graphService: GraphService): Router {
  const router = Router();

  /**
   * GET /api/cases/:id/algorithms/generalization
   * Returns benchmark report and comparative generalizations.
   */
  router.get('/:id/algorithms/generalization', async (req: Request, res: Response) => {
    try {
      const caseId = req.params.id;
      const graph = graphService.getGraph(caseId);
      if (!graph) {
        res.status(404).json({ error: `Graph not found for case ${caseId}` });
        return;
      }

      const report = GraphBenchmarkEngine.runCompleteBenchmark();
      res.json(report);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Generalization benchmark evaluation failed' });
    }
  });

  /**
   * GET /api/algorithms/benchmark
   * Runs the complete benchmark across all 12 topologies and 7 algorithms.
   */
  router.get('/benchmark', (req: Request, res: Response) => {
    try {
      const report = GraphBenchmarkEngine.runCompleteBenchmark();
      res.json(report);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Benchmark execution failed' });
    }
  });

  /**
   * GET /api/algorithms/benchmark/topologies
   * Returns the list of canonical generated topologies.
   */
  router.get('/benchmark/topologies', (req: Request, res: Response) => {
    try {
      const topologies = GraphTopologyGenerator.generateAll();
      res.json(topologies);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to generate topologies' });
    }
  });

  /**
   * GET /api/algorithms/benchmark/topologies/:topoId
   * Returns a specific topology by ID.
   */
  router.get('/benchmark/topologies/:topoId', (req: Request, res: Response) => {
    try {
      const topoId = req.params.topoId;
      const topologies = GraphTopologyGenerator.generateAll();
      const match = topologies.find(t => t.id === topoId);
      if (!match) {
        res.status(404).json({ error: `Topology ${topoId} not found` });
        return;
      }
      res.json(match);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch topology' });
    }
  });

  return router;
}

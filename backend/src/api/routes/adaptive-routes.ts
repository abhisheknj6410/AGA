import { Router, Request, Response } from 'express';
import { AdaptiveReasoningEngine } from '../../application/adaptive-reasoning-engine.js';
import { GraphTopologyGenerator } from '../../application/graph-topology-generator.js';
import { GraphService } from '../../application/graph-service.js';

export function createAdaptiveRouter(graphService: GraphService): Router {
  const router = Router();

  /**
   * GET /api/cases/:id/adaptive
   * Computes the structural fingerprint, executes the adaptive algorithm pipeline,
   * traces downstream decision changes, and runs the equivalence safety verification.
   */
  router.get('/:id/adaptive', (req: Request, res: Response) => {
    try {
      const caseId = req.params.id;
      const graph = graphService.getGraph(caseId);
      if (!graph) {
        res.status(404).json({ error: `Graph not found for case ${caseId}` });
        return;
      }

      const report = AdaptiveReasoningEngine.analyzeAndExecute(graph, caseId, undefined, `Case ${caseId}`);
      res.json(report);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Adaptive reasoning analysis failed' });
    }
  });

  /**
   * GET /api/adaptive/topologies/:topoId
   * Runs the adaptive reasoning engine on a specific benchmark topology.
   */
  router.get('/topologies/:topoId', (req: Request, res: Response) => {
    try {
      const topoId = req.params.topoId;
      const topologies = GraphTopologyGenerator.generateAll();
      const match = topologies.find(t => t.id === topoId);
      if (!match) {
        res.status(404).json({ error: `Topology ${topoId} not found` });
        return;
      }

      const report = AdaptiveReasoningEngine.analyzeAndExecute(
        match.graph,
        undefined,
        match.id,
        match.name,
        match.sourceNodeId,
        match.targetNodeId
      );
      res.json(report);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Adaptive topology reasoning failed' });
    }
  });

  /**
   * GET /api/adaptive/benchmark
   * Runs the adaptive selection vs full execution comparison across all 12 canonical topologies.
   */
  router.get('/benchmark', (req: Request, res: Response) => {
    try {
      const topologies = GraphTopologyGenerator.generateAll();
      const reports = topologies.map(t =>
        AdaptiveReasoningEngine.analyzeAndExecute(
          t.graph,
          undefined,
          t.id,
          t.name,
          t.sourceNodeId,
          t.targetNodeId
        )
      );

      const totalAlgorithmsFull = reports.reduce((acc, r) => acc + r.comparison.fullExecution.algorithmsExecuted, 0);
      const totalAlgorithmsAdaptive = reports.reduce((acc, r) => acc + r.comparison.adaptiveExecution.algorithmsExecuted, 0);
      const totalAlgorithmsSkipped = reports.reduce((acc, r) => acc + r.comparison.adaptiveExecution.algorithmsSkipped, 0);

      const allEquivalent = reports.every(r => r.comparison.equivalence.isEquivalent);
      const regressionCount = reports.filter(r => r.comparison.equivalence.regressionStatus === 'ADAPTIVE_REGRESSION').length;

      const summary = {
        topologiesEvaluated: topologies.length,
        totalAlgorithmsFull,
        totalAlgorithmsAdaptive,
        totalAlgorithmsSkipped,
        overallReductionPercent: Number(((totalAlgorithmsSkipped / totalAlgorithmsFull) * 100).toFixed(1)),
        allEquivalent,
        regressionCount,
        regressionStatus: allEquivalent ? 'EQUIVALENCE_PRESERVED' : 'ADAPTIVE_REGRESSION'
      };

      res.json({
        summary,
        reports
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Adaptive benchmark evaluation failed' });
    }
  });

  return router;
}

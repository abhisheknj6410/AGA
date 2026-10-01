import { Router, Request, Response, NextFunction } from 'express';
import { GraphService } from '../../application/graph-service.js';
import { InvestigationPlanningEngine } from '../../application/investigation-planning-engine.js';

export function createPlanningRouter(
  graphService: GraphService,
  planningEngine: InvestigationPlanningEngine
): Router {
  const router = Router({ mergeParams: true });

  // GET /cases/:caseId/planning/plan - Full Investigation Plan
  router.get('/plan', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { caseId } = req.params;
      const baseGraph = graphService.getGraph(caseId);
      const plan = await planningEngine.generatePlan(caseId, baseGraph);
      res.json(plan);
    } catch (err) {
      next(err);
    }
  });

  // GET /cases/:caseId/planning/actions - Ranked Actions
  router.get('/actions', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { caseId } = req.params;
      const baseGraph = graphService.getGraph(caseId);
      const plan = await planningEngine.generatePlan(caseId, baseGraph);
      res.json({
        caseId,
        currentEntropy: plan.currentEntropy,
        nextImmediateAction: plan.nextImmediateAction,
        actions: plan.actions
      });
    } catch (err) {
      next(err);
    }
  });

  // GET /cases/:caseId/planning/graph - Second-Order Investigation Plan Graph
  router.get('/graph', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { caseId } = req.params;
      const baseGraph = graphService.getGraph(caseId);
      const plan = await planningEngine.generatePlan(caseId, baseGraph);
      res.json(plan.planGraph);
    } catch (err) {
      next(err);
    }
  });

  // POST /cases/:caseId/planning/simulate-action - Simulate executing an action
  router.post('/simulate-action', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { caseId } = req.params;
      const { actionId, outcome } = req.body;

      if (!actionId || !outcome) {
        return res.status(400).json({ error: 'actionId and outcome (CONFIRMED | REFUTED) are required.' });
      }

      const baseGraph = graphService.getGraph(caseId);
      const plan = await planningEngine.generatePlan(caseId, baseGraph);
      const action = plan.actions.find(a => a.id === actionId);

      if (!action) {
        return res.status(404).json({ error: `Action '${actionId}' not found in current plan.` });
      }

      const partition = action.expectedPartitions[outcome as 'CONFIRMED' | 'REFUTED'];
      if (!partition) {
        return res.status(400).json({ error: `Invalid outcome '${outcome}'. Must be CONFIRMED or REFUTED.` });
      }

      res.json({
        actionId,
        outcome,
        priorPossibilityCount: plan.currentPossibilityCount,
        priorEntropy: plan.currentEntropy,
        survivingPossibilityIds: partition.confirmedSet,
        eliminatedPossibilityIds: partition.refutedSet,
        resultingPossibilityCount: partition.resultingPossibilityCount,
        resultingFamilyCount: partition.resultingFamilyCount,
        probability: partition.probability,
        explanation: `Simulated ${outcome} for '${action.targetLabel}': ${partition.refutedSet.length} possibilities eliminated, leaving ${partition.resultingPossibilityCount} surviving in ${partition.resultingFamilyCount} structural families.`
      });
    } catch (err) {
      next(err);
    }
  });

  return router;
}

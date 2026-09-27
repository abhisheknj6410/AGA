import express from 'express';
import cors from 'cors';
import { DatabaseSync } from 'node:sqlite';
import { getDatabase } from '../infrastructure/db.js';
import { runMigrations } from '../infrastructure/migrations.js';
import { CaseService } from '../application/case-service.js';
import { GraphService } from '../application/graph-service.js';
import { ImportService } from '../application/import-service.js';
import { EntityResolutionService } from '../application/entity-resolution-service.js';
import { AuditRepository } from '../infrastructure/repositories/audit-repository.js';
import { errorHandler } from './middleware/error-handler.js';
import { createCaseRouter } from './routes/case-routes.js';
import { createNodeRouter } from './routes/node-routes.js';
import { createEdgeRouter } from './routes/edge-routes.js';
import { createEvidenceRouter } from './routes/evidence-routes.js';
import { createGraphRouter } from './routes/graph-routes.js';
import { createImportRouter } from './routes/import-routes.js';
import { createResolutionRouter } from './routes/resolution-routes.js';
import { createAuditRouter } from './routes/audit-routes.js';
import { AiExtractionService } from '../application/ai-extraction-service.js';
import { createExtractionRouter } from './routes/extraction-routes.js';
import { createSnapshotRouter } from './routes/snapshot-routes.js';
import { PossibilityRepository } from '../infrastructure/repositories/possibility-repository.js';
import { AlgorithmRepository } from '../infrastructure/repositories/algorithm-repository.js';
import { ResolutionRepository } from '../infrastructure/repositories/resolution-repository.js';
import { GraphAnalysisEngine } from '../application/graph-analysis-engine.js';
import { PossibilityEngine } from '../application/possibility-engine.js';
import { InvestigationAgentService } from '../application/investigation-agent-service.js';
import { createPossibilityRouter } from './routes/possibility-routes.js';
import { createAnalysisRouter } from './routes/analysis-routes.js';
import { createAgentRouter } from './routes/agent-routes.js';
import { IncrementalReasoningEngine } from '../application/incremental-reasoning-engine.js';
import { ResolutionReasoningEngine } from '../application/resolution-reasoning-engine.js';
import { InvestigationPlanningEngine } from '../application/investigation-planning-engine.js';
import { AlgorithmEffectivenessEngine } from '../application/algorithm-effectiveness-engine.js';
import { EvidenceImpactEngine } from '../application/evidence-impact-engine.js';
import { InvestigationDecisionEngine } from '../application/investigation-decision-engine.js';
import { EpistemicValidationEngine } from '../application/epistemic-validation-engine.js';
import { createIncrementalRouter } from './routes/incremental-routes.js';
import { createPlanningRouter } from './routes/planning-routes.js';
import { createEffectivenessRouter } from './routes/effectiveness-routes.js';
import { createClosedLoopRouter } from './routes/closed-loop-routes.js';
import { createDecisionRouter } from './routes/decision-routes.js';
import { createValidationRouter } from './routes/validation-routes.js';

export function createApp(customDb?: DatabaseSync): express.Application {
  const db = customDb || getDatabase();
  runMigrations(db);

  const caseService = new CaseService(db);
  const graphService = new GraphService(db);
  const importService = new ImportService(db, graphService);
  const resolutionService = new EntityResolutionService(db);
  const auditRepo = new AuditRepository(db);
  const aiService = new AiExtractionService();

  const possibilityRepo = new PossibilityRepository(db);
  const algorithmRepo = new AlgorithmRepository(db);
  const resolutionRepo = new ResolutionRepository(db);
  const analysisEngine = new GraphAnalysisEngine(algorithmRepo);
  const possibilityEngine = new PossibilityEngine(possibilityRepo, analysisEngine);
  const incrementalEngine = new IncrementalReasoningEngine(db, possibilityEngine);
  const resolutionEngine = new ResolutionReasoningEngine(possibilityRepo, analysisEngine, incrementalEngine);
  const planningEngine = new InvestigationPlanningEngine(possibilityRepo, resolutionEngine);
  const effectivenessEngine = new AlgorithmEffectivenessEngine(
    possibilityRepo,
    possibilityEngine,
    resolutionEngine,
    planningEngine
  );
  const evidenceImpactEngine = new EvidenceImpactEngine(
    db,
    graphService,
    possibilityEngine,
    resolutionEngine,
    planningEngine,
    incrementalEngine
  );
  const agentService = new InvestigationAgentService(
    possibilityRepo,
    analysisEngine,
    possibilityEngine,
    incrementalEngine,
    resolutionEngine,
    planningEngine,
    effectivenessEngine
  );
  agentService.setEvidenceImpactEngine(evidenceImpactEngine);

  const decisionEngine = new InvestigationDecisionEngine(
    possibilityRepo,
    resolutionEngine,
    planningEngine
  );
  agentService.setDecisionEngine(decisionEngine);

  const validationEngine = new EpistemicValidationEngine(
    possibilityRepo,
    resolutionEngine,
    planningEngine,
    decisionEngine
  );

  const app = express();

  app.use(cors());
  app.use(express.json({ limit: '15mb' }));

  // Health check
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString(), version: '1.0.0' });
  });

  // Snapshot Routes & Root Case Routes
  app.use('/api/cases', createSnapshotRouter(db, caseService, graphService));
  app.use('/api/cases', createCaseRouter(caseService));
  app.use('/api/cases', createClosedLoopRouter(evidenceImpactEngine));
  app.use('/api/cases', createDecisionRouter(decisionEngine, graphService));
  app.use('/api/cases', createValidationRouter(validationEngine, graphService));

  // Case-Scoped Nested Routes
  app.use('/api/cases/:caseId/nodes', createNodeRouter(graphService));
  app.use('/api/cases/:caseId/edges', createEdgeRouter(graphService));
  app.use('/api/cases/:caseId/evidence', createEvidenceRouter(graphService));
  app.use('/api/cases/:caseId/graph', createGraphRouter(graphService));
  app.use('/api/cases/:caseId/import', createImportRouter(importService));
  app.use('/api/cases/:caseId/resolution', createResolutionRouter(resolutionService, graphService, resolutionEngine));
  app.use('/api/cases/:caseId/planning', createPlanningRouter(graphService, planningEngine));
  app.use('/api/cases/:caseId/effectiveness', createEffectivenessRouter(graphService, effectivenessEngine));
  app.use('/api/cases/:caseId/audit', createAuditRouter(auditRepo));
  app.use('/api/cases/:caseId/extract', createExtractionRouter(aiService));
  app.use('/api/cases/:caseId/possibilities', createPossibilityRouter(graphService, possibilityEngine, possibilityRepo, resolutionRepo, analysisEngine));
  app.use('/api/cases/:caseId/analysis', createAnalysisRouter(graphService, analysisEngine, possibilityRepo, algorithmRepo));
  app.use('/api/cases/:caseId/agent', createAgentRouter(graphService, agentService));
  app.use('/api/cases/:caseId/incremental', createIncrementalRouter(graphService, incrementalEngine));

  // Global Error Handler
  app.use(errorHandler);

  return app;
}


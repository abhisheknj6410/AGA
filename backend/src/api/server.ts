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

export function createApp(customDb?: DatabaseSync): express.Application {
  const db = customDb || getDatabase();
  runMigrations(db);

  const caseService = new CaseService(db);
  const graphService = new GraphService(db);
  const importService = new ImportService(db, graphService);
  const resolutionService = new EntityResolutionService(db);
  const auditRepo = new AuditRepository(db);
  const aiService = new AiExtractionService();

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

  // Case-Scoped Nested Routes
  app.use('/api/cases/:caseId/nodes', createNodeRouter(graphService));
  app.use('/api/cases/:caseId/edges', createEdgeRouter(graphService));
  app.use('/api/cases/:caseId/evidence', createEvidenceRouter(graphService));
  app.use('/api/cases/:caseId/graph', createGraphRouter(graphService));
  app.use('/api/cases/:caseId/import', createImportRouter(importService));
  app.use('/api/cases/:caseId/resolution', createResolutionRouter(resolutionService));
  app.use('/api/cases/:caseId/audit', createAuditRouter(auditRepo));
  app.use('/api/cases/:caseId/extract', createExtractionRouter(aiService));

  // Global Error Handler
  app.use(errorHandler);

  return app;
}

import { Router, Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { DatabaseSync } from 'node:sqlite';
import { CaseService } from '../../application/case-service.js';
import { GraphService } from '../../application/graph-service.js';
import { AuditRepository } from '../../infrastructure/repositories/audit-repository.js';
import { ResolutionRepository } from '../../infrastructure/repositories/resolution-repository.js';
import { runInTransaction } from '../../infrastructure/db.js';

export function createSnapshotRouter(
  db: DatabaseSync,
  caseService: CaseService,
  graphService: GraphService
): Router {
  const router = Router();
  const auditRepo = new AuditRepository(db);
  const resRepo = new ResolutionRepository(db);

  // GET /cases/:caseId/export - Export Full Investigation Snapshot
  router.get('/:caseId/export', (req: Request, res: Response, next: NextFunction) => {
    try {
      const { caseId } = req.params;
      const caseData = caseService.getCase(caseId);
      const graph = graphService.getGraph(caseId);
      const audit = auditRepo.getByCaseId(caseId, 500);
      const resolution = resRepo.getByCaseId(caseId);

      const snapshot = {
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        case: caseData,
        graph,
        audit,
        resolution
      };

      res.setHeader('Content-Disposition', `attachment; filename="case-${caseId.slice(0, 8)}-snapshot.json"`);
      res.json(snapshot);
    } catch (err) {
      next(err);
    }
  });

  // POST /cases/import-snapshot - Restore Snapshot into a new Case
  router.post('/import-snapshot', (req: Request, res: Response, next: NextFunction) => {
    try {
      const { snapshot, newCaseName, who } = req.body;

      if (!snapshot || !snapshot.case || !snapshot.graph) {
        res.status(400).json({ error: 'Invalid snapshot payload structure.' });
        return;
      }

      const originalCase = snapshot.case;
      const targetName = newCaseName || `${originalCase.name} (Restored Snapshot)`;

      const newCase = caseService.createCase(
        targetName,
        `Restored from snapshot created at ${snapshot.exportedAt || 'unknown'}`,
        who || 'system'
      );

      runInTransaction(db, () => {
        // Map old node IDs to newly imported nodes
        for (const node of snapshot.graph.nodes) {
          graphService.addNode(newCase.id, {
            id: node.id,
            category: node.category,
            type: node.type,
            label: node.label,
            properties: node.properties,
            time: node.time,
            evidenceType: node.evidenceType,
            source: node.source,
            reliability: node.reliability,
            collectionTime: node.collectionTime,
            hashChecksum: node.hashChecksum
          }, who || 'system', 'Restored from snapshot');
        }

        for (const edge of snapshot.graph.edges) {
          graphService.addEdge(newCase.id, {
            id: edge.id,
            source: edge.source,
            target: edge.target,
            type: edge.type,
            status: edge.status,
            cost: edge.cost,
            confidence: edge.confidence,
            evidenceRefs: edge.evidenceRefs,
            properties: edge.properties
          }, who || 'system', 'Restored from snapshot');
        }
      });

      res.status(201).json({
        message: 'Snapshot successfully restored into new case.',
        case: newCase
      });
    } catch (err) {
      next(err);
    }
  });

  return router;
}

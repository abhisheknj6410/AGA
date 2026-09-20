import { v4 as uuidv4 } from 'uuid';
import { DatabaseSync } from 'node:sqlite';
import { GraphService } from './graph-service.js';
import { AuditRepository } from '../infrastructure/repositories/audit-repository.js';
import { GraphNode, GraphEdge, NodeCategory } from '../domain/types.js';
import { validateNode, validateEdge, ValidationErrorItem } from '../domain/validation.js';
import { runInTransaction } from '../infrastructure/db.js';

export interface ImportPayload {
  evidence?: Array<Partial<GraphNode> & { evidenceType?: string }>;
  nodes?: Array<Partial<GraphNode>>;
  events?: Array<Partial<GraphNode> & { eventType?: string }>;
  edges?: Array<Partial<GraphEdge>>;
}

export interface ImportResult {
  success: boolean;
  imported: {
    nodes: number;
    events: number;
    evidence: number;
    edges: number;
  };
  errors: Array<{ index: number; type: string; errors: ValidationErrorItem[] }>;
}

export class ImportService {
  private auditRepo: AuditRepository;

  constructor(private db: DatabaseSync, private graphService: GraphService) {
    this.auditRepo = new AuditRepository(db);
  }

  /**
   * Pre-validates and commits a structured JSON dataset into a case.
   */
  importJson(caseId: string, payload: ImportPayload, who = 'importer'): ImportResult {
    // 1. Verify case exists
    this.graphService.getNode; // check dependency
    const existingGraph = this.graphService.getGraph(caseId);
    const existingNodeMap = new Map<string, GraphNode>(existingGraph.nodes.map(n => [n.id, n]));
    const existingEvidenceIds = new Set(existingGraph.nodes.filter(n => n.category === 'EVIDENCE').map(n => n.id));

    const stagedNodes: GraphNode[] = [];
    const stagedEdges: GraphEdge[] = [];
    const validationErrors: Array<{ index: number; type: string; errors: ValidationErrorItem[] }> = [];

    const now = new Date().toISOString();

    // 2. Stage & validate Evidence
    let evCount = 0;
    if (payload.evidence && Array.isArray(payload.evidence)) {
      payload.evidence.forEach((item, idx) => {
        const id = item.id?.trim() || uuidv4();
        const fullEvidenceNode: GraphNode = {
          id,
          caseId,
          category: 'EVIDENCE',
          type: item.type || item.evidenceType || 'LOG',
          label: item.label?.trim() || `Evidence ${id}`,
          properties: item.properties || {},
          metadata: { ...(item.metadata || {}), importedAt: now, sourceFile: item.source?.name },
          createdAt: item.createdAt || now,
          updatedAt: item.updatedAt || now,
          evidenceType: (item.type || item.evidenceType || 'LOG') as any,
          source: item.source || { name: 'Structured Import', kind: 'SYSTEM' },
          reliability: item.reliability ?? 1.0,
          collectionTime: item.collectionTime || now,
          hashChecksum: item.hashChecksum
        };

        const v = validateNode(fullEvidenceNode);
        if (!v.valid) {
          validationErrors.push({ index: idx, type: 'EVIDENCE', errors: v.errors });
        } else {
          stagedNodes.push(fullEvidenceNode);
          existingNodeMap.set(fullEvidenceNode.id, fullEvidenceNode);
          existingEvidenceIds.add(fullEvidenceNode.id);
          evCount++;
        }
      });
    }

    // 3. Stage & validate Entities
    let nodeCount = 0;
    if (payload.nodes && Array.isArray(payload.nodes)) {
      payload.nodes.forEach((item, idx) => {
        const id = item.id?.trim() || uuidv4();
        const fullNode: GraphNode = {
          id,
          caseId,
          category: item.category || 'ENTITY',
          type: item.type || 'PERSON',
          label: item.label?.trim() || `Node ${id}`,
          properties: item.properties || {},
          metadata: { ...(item.metadata || {}), importedAt: now },
          createdAt: item.createdAt || now,
          updatedAt: item.updatedAt || now
        };

        const v = validateNode(fullNode);
        if (!v.valid) {
          validationErrors.push({ index: idx, type: 'NODE', errors: v.errors });
        } else {
          stagedNodes.push(fullNode);
          existingNodeMap.set(fullNode.id, fullNode);
          nodeCount++;
        }
      });
    }

    // 4. Stage & validate Events
    let eventCount = 0;
    if (payload.events && Array.isArray(payload.events)) {
      payload.events.forEach((item, idx) => {
        const id = item.id?.trim() || uuidv4();
        const fullEventNode: GraphNode = {
          id,
          caseId,
          category: 'EVENT',
          type: item.type || item.eventType || 'LOGIN',
          label: item.label?.trim() || `Event ${id}`,
          properties: item.properties || {},
          metadata: { ...(item.metadata || {}), importedAt: now },
          createdAt: item.createdAt || now,
          updatedAt: item.updatedAt || now,
          time: item.time || { precision: 'UNKNOWN' }
        };

        const v = validateNode(fullEventNode);
        if (!v.valid) {
          validationErrors.push({ index: idx, type: 'EVENT', errors: v.errors });
        } else {
          stagedNodes.push(fullEventNode);
          existingNodeMap.set(fullEventNode.id, fullEventNode);
          eventCount++;
        }
      });
    }

    // 5. Stage & validate Edges
    let edgeCount = 0;
    if (payload.edges && Array.isArray(payload.edges)) {
      payload.edges.forEach((item, idx) => {
        const id = item.id?.trim() || uuidv4();
        const fullEdge: GraphEdge = {
          id,
          caseId,
          source: item.source || '',
          target: item.target || '',
          type: item.type!,
          status: item.status || 'OBSERVED',
          cost: item.cost ?? 1.0,
          confidence: item.confidence ?? null,
          evidenceRefs: item.evidenceRefs || [],
          properties: item.properties || {},
          createdAt: item.createdAt || now,
          updatedAt: item.updatedAt || now
        };

        const src = existingNodeMap.get(fullEdge.source);
        const tgt = existingNodeMap.get(fullEdge.target);

        const v = validateEdge(fullEdge, src, tgt, existingEvidenceIds);
        if (!v.valid) {
          validationErrors.push({ index: idx, type: 'EDGE', errors: v.errors });
        } else {
          stagedEdges.push(fullEdge);
          edgeCount++;
        }
      });
    }

    // If there were any validation errors, REJECT entire import
    if (validationErrors.length > 0) {
      return {
        success: false,
        imported: { nodes: 0, events: 0, evidence: 0, edges: 0 },
        errors: validationErrors
      };
    }

    // Atomic transaction commit
    runInTransaction(this.db, () => {
      for (const node of stagedNodes) {
        this.graphService.addNode(caseId, node, who, 'Structured dataset import');
      }
      for (const edge of stagedEdges) {
        this.graphService.addEdge(caseId, edge, who, 'Structured dataset import');
      }

      this.auditRepo.log({
        id: uuidv4(),
        caseId,
        who,
        action: 'IMPORT',
        objectType: 'CASE',
        objectId: caseId,
        newValue: {
          nodes: nodeCount,
          events: eventCount,
          evidence: evCount,
          edges: edgeCount
        },
        timestamp: now,
        reason: 'Batch structured evidence import committed'
      });
    });

    return {
      success: true,
      imported: {
        nodes: nodeCount,
        events: eventCount,
        evidence: evCount,
        edges: edgeCount
      },
      errors: []
    };
  }

  /**
   * Parses simple CSV text into staged import format.
   * Supports standard Node CSV: type,label,category,properties
   * or Edge CSV: source,target,type,status,evidenceRefs
   */
  importCsv(caseId: string, csvContent: string, format: 'NODES' | 'EDGES', who = 'importer'): ImportResult {
    const lines = csvContent.trim().split(/\r?\n/).filter(line => line.trim().length > 0);
    if (lines.length < 2) {
      return {
        success: false,
        imported: { nodes: 0, events: 0, evidence: 0, edges: 0 },
        errors: [
          {
            index: 0,
            type: 'CSV',
            errors: [{ field: 'csv', message: 'CSV must contain a header and at least one data row.', code: 'EMPTY_CSV' }]
          }
        ]
      };
    }

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());

    if (format === 'NODES') {
      const nodes: Array<Partial<GraphNode>> = [];
      const events: Array<Partial<GraphNode>> = [];

      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(',').map(p => p.trim());
        const row: Record<string, string> = {};
        headers.forEach((h, idx) => {
          row[h] = parts[idx] || '';
        });

        const category = (row.category?.toUpperCase() as NodeCategory) || 'ENTITY';
        const type = row.type?.toUpperCase() || 'PERSON';
        const label = row.label || `Node ${i}`;

        if (category === 'EVENT') {
          events.push({
            id: row.id || undefined,
            type,
            label,
            time: row.timestamp ? { start: row.timestamp, precision: 'SECOND' } : { precision: 'UNKNOWN' }
          });
        } else {
          nodes.push({
            id: row.id || undefined,
            category,
            type,
            label
          });
        }
      }

      return this.importJson(caseId, { nodes, events }, who);
    } else {
      const edges: Array<Partial<GraphEdge>> = [];
      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(',').map(p => p.trim());
        const row: Record<string, string> = {};
        headers.forEach((h, idx) => {
          row[h] = parts[idx] || '';
        });

        edges.push({
          id: row.id || undefined,
          source: row.source,
          target: row.target,
          type: row.type?.toUpperCase() as any,
          status: (row.status?.toUpperCase() as any) || 'OBSERVED',
          evidenceRefs: row.evidencerefs ? row.evidencerefs.split(';').map(s => s.trim()) : []
        });
      }

      return this.importJson(caseId, { edges }, who);
    }
  }
}

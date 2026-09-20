import { v4 as uuidv4 } from 'uuid';
import { DatabaseSync } from 'node:sqlite';
import { NodeRepository } from '../infrastructure/repositories/node-repository.js';
import { EdgeRepository } from '../infrastructure/repositories/edge-repository.js';
import { CaseRepository } from '../infrastructure/repositories/case-repository.js';
import { AuditRepository } from '../infrastructure/repositories/audit-repository.js';
import { EntityResolutionService } from './entity-resolution-service.js';
import { GraphNode, GraphEdge, GraphPayload } from '../domain/types.js';
import { validateNode, validateEdge, ValidationResult } from '../domain/validation.js';
import { runInTransaction } from '../infrastructure/db.js';

export class GraphService {
  private nodeRepo: NodeRepository;
  private edgeRepo: EdgeRepository;
  private caseRepo: CaseRepository;
  private auditRepo: AuditRepository;
  private entityResService: EntityResolutionService;

  constructor(private db: DatabaseSync) {
    this.nodeRepo = new NodeRepository(db);
    this.edgeRepo = new EdgeRepository(db);
    this.caseRepo = new CaseRepository(db);
    this.auditRepo = new AuditRepository(db);
    this.entityResService = new EntityResolutionService(db);
  }

  // --- NODE OPERATIONS ---

  addNode(caseId: string, nodeData: Partial<GraphNode>, who = 'system', reason?: string): GraphNode {
    // 1. Verify case exists
    const currentCase = this.caseRepo.getById(caseId);
    if (!currentCase) {
      throw new Error(`Case '${caseId}' does not exist.`);
    }

    const now = new Date().toISOString();
    const nodeId = nodeData.id && nodeData.id.trim() !== '' ? nodeData.id.trim() : uuidv4();

    // Check duplicate ID
    if (this.nodeRepo.getById(nodeId, caseId)) {
      throw new Error(`Node with ID '${nodeId}' already exists in case '${caseId}'.`);
    }

    const fullNode: GraphNode = {
      id: nodeId,
      caseId,
      category: nodeData.category!,
      type: nodeData.type!,
      label: nodeData.label ? nodeData.label.trim() : '',
      properties: nodeData.properties || {},
      metadata: {
        ...(nodeData.metadata || {}),
        createdAt: now
      },
      createdAt: now,
      updatedAt: now,
      time: nodeData.time,
      evidenceType: nodeData.evidenceType,
      source: nodeData.source,
      reliability: nodeData.reliability,
      collectionTime: nodeData.collectionTime,
      hashChecksum: nodeData.hashChecksum
    };

    // 2. Validate node schema & temporal info
    const validation = validateNode(fullNode);
    if (!validation.valid) {
      const msgs = validation.errors.map(e => `[${e.field}] ${e.message}`).join('; ');
      throw new Error(`Node validation failed: ${msgs}`);
    }

    // 3. Persist node & evaluate entity resolution
    return runInTransaction(this.db, () => {
      this.nodeRepo.create(fullNode);

      this.auditRepo.log({
        id: uuidv4(),
        caseId,
        who,
        action: 'CREATE',
        objectType: fullNode.category === 'EVIDENCE' ? 'EVIDENCE' : 'NODE',
        objectId: fullNode.id,
        newValue: fullNode,
        timestamp: now,
        reason: reason || `Created ${fullNode.category.toLowerCase()} node '${fullNode.label}'`
      });

      // Run duplicate detection for entities
      if (fullNode.category === 'ENTITY') {
        this.entityResService.evaluateNode(fullNode);
      }

      return fullNode;
    });
  }

  getNode(caseId: string, nodeId: string): GraphNode {
    const node = this.nodeRepo.getById(nodeId, caseId);
    if (!node) {
      throw new Error(`Node '${nodeId}' not found in case '${caseId}'.`);
    }
    return node;
  }

  listNodes(caseId: string, category?: string): GraphNode[] {
    const all = this.nodeRepo.getByCaseId(caseId);
    if (category) {
      return all.filter(n => n.category.toUpperCase() === category.toUpperCase());
    }
    return all;
  }

  updateNode(caseId: string, nodeId: string, updates: Partial<GraphNode>, who = 'system', reason?: string): GraphNode {
    const existing = this.getNode(caseId, nodeId);
    const now = new Date().toISOString();

    const merged: GraphNode = {
      ...existing,
      label: updates.label !== undefined ? updates.label.trim() : existing.label,
      properties: { ...existing.properties, ...(updates.properties || {}) },
      metadata: { ...existing.metadata, ...(updates.metadata || {}) },
      updatedAt: now,
      time: updates.time !== undefined ? updates.time : existing.time,
      source: updates.source !== undefined ? updates.source : existing.source,
      reliability: updates.reliability !== undefined ? updates.reliability : existing.reliability,
      collectionTime: updates.collectionTime !== undefined ? updates.collectionTime : existing.collectionTime,
      hashChecksum: updates.hashChecksum !== undefined ? updates.hashChecksum : existing.hashChecksum
    };

    const validation = validateNode(merged);
    if (!validation.valid) {
      const msgs = validation.errors.map(e => `[${e.field}] ${e.message}`).join('; ');
      throw new Error(`Node validation failed: ${msgs}`);
    }

    return runInTransaction(this.db, () => {
      this.nodeRepo.update(merged);

      this.auditRepo.log({
        id: uuidv4(),
        caseId,
        who,
        action: 'UPDATE',
        objectType: merged.category === 'EVIDENCE' ? 'EVIDENCE' : 'NODE',
        objectId: merged.id,
        oldValue: existing,
        newValue: merged,
        timestamp: now,
        reason: reason || `Updated node '${merged.label}'`
      });

      if (merged.category === 'ENTITY') {
        this.entityResService.evaluateNode(merged);
      }

      return merged;
    });
  }

  deleteNode(caseId: string, nodeId: string, who = 'system', reason?: string): boolean {
    const existing = this.getNode(caseId, nodeId);
    const now = new Date().toISOString();

    return runInTransaction(this.db, () => {
      this.auditRepo.log({
        id: uuidv4(),
        caseId,
        who,
        action: 'DELETE',
        objectType: existing.category === 'EVIDENCE' ? 'EVIDENCE' : 'NODE',
        objectId: existing.id,
        oldValue: existing,
        timestamp: now,
        reason: reason || `Deleted node '${existing.label}'`
      });

      return this.nodeRepo.delete(nodeId, caseId);
    });
  }

  // --- EDGE OPERATIONS ---

  addEdge(caseId: string, edgeData: Partial<GraphEdge>, who = 'system', reason?: string): GraphEdge {
    // 1. Verify case exists
    const currentCase = this.caseRepo.getById(caseId);
    if (!currentCase) {
      throw new Error(`Case '${caseId}' does not exist.`);
    }

    const now = new Date().toISOString();
    const edgeId = edgeData.id && edgeData.id.trim() !== '' ? edgeData.id.trim() : uuidv4();

    if (this.edgeRepo.getById(edgeId, caseId)) {
      throw new Error(`Edge with ID '${edgeId}' already exists in case '${caseId}'.`);
    }

    if (!edgeData.source || !edgeData.target) {
      throw new Error("Both 'source' and 'target' node IDs are required for creating an edge.");
    }

    // 2. Fetch source & target nodes and evidence IDs
    const sourceNode = this.nodeRepo.getById(edgeData.source, caseId);
    if (!sourceNode) {
      throw new Error(`Source node '${edgeData.source}' not found in case '${caseId}'.`);
    }

    const targetNode = this.nodeRepo.getById(edgeData.target, caseId);
    if (!targetNode) {
      throw new Error(`Target node '${edgeData.target}' not found in case '${caseId}'.`);
    }

    const caseNodes = this.nodeRepo.getByCaseId(caseId);
    const evidenceSet = new Set(caseNodes.filter(n => n.category === 'EVIDENCE').map(n => n.id));

    const fullEdge: GraphEdge = {
      id: edgeId,
      caseId,
      source: edgeData.source,
      target: edgeData.target,
      type: edgeData.type!,
      status: edgeData.status || 'OBSERVED',
      cost: edgeData.cost ?? 1.0,
      confidence: edgeData.confidence ?? null,
      evidenceRefs: edgeData.evidenceRefs || [],
      properties: edgeData.properties || {},
      createdAt: now,
      updatedAt: now
    };

    // 3. Strict schema, direction, and provenance validation
    const validation = validateEdge(fullEdge, sourceNode, targetNode, evidenceSet);
    if (!validation.valid) {
      const msgs = validation.errors.map(e => `[${e.field}] ${e.message}`).join('; ');
      throw new Error(`Edge validation failed: ${msgs}`);
    }

    return runInTransaction(this.db, () => {
      this.edgeRepo.create(fullEdge);

      this.auditRepo.log({
        id: uuidv4(),
        caseId,
        who,
        action: 'CREATE',
        objectType: 'EDGE',
        objectId: fullEdge.id,
        newValue: fullEdge,
        timestamp: now,
        reason: reason || `Created relationship ${sourceNode.label} --[${fullEdge.type}]--> ${targetNode.label}`
      });

      return fullEdge;
    });
  }

  getEdge(caseId: string, edgeId: string): GraphEdge {
    const edge = this.edgeRepo.getById(edgeId, caseId);
    if (!edge) {
      throw new Error(`Edge '${edgeId}' not found in case '${caseId}'.`);
    }
    return edge;
  }

  listEdges(caseId: string): GraphEdge[] {
    return this.edgeRepo.getByCaseId(caseId);
  }

  updateEdge(caseId: string, edgeId: string, updates: Partial<GraphEdge>, who = 'system', reason?: string): GraphEdge {
    const existing = this.getEdge(caseId, edgeId);
    const now = new Date().toISOString();

    const caseNodes = this.nodeRepo.getByCaseId(caseId);
    const evidenceSet = new Set(caseNodes.filter(n => n.category === 'EVIDENCE').map(n => n.id));
    const sourceNode = caseNodes.find(n => n.id === existing.source);
    const targetNode = caseNodes.find(n => n.id === existing.target);

    const merged: GraphEdge = {
      ...existing,
      status: updates.status || existing.status,
      cost: updates.cost !== undefined ? updates.cost : existing.cost,
      confidence: updates.confidence !== undefined ? updates.confidence : existing.confidence,
      evidenceRefs: updates.evidenceRefs || existing.evidenceRefs,
      properties: { ...existing.properties, ...(updates.properties || {}) },
      updatedAt: now
    };

    const validation = validateEdge(merged, sourceNode, targetNode, evidenceSet);
    if (!validation.valid) {
      const msgs = validation.errors.map(e => `[${e.field}] ${e.message}`).join('; ');
      throw new Error(`Edge validation failed: ${msgs}`);
    }

    return runInTransaction(this.db, () => {
      this.edgeRepo.update(merged);

      this.auditRepo.log({
        id: uuidv4(),
        caseId,
        who,
        action: 'UPDATE',
        objectType: 'EDGE',
        objectId: merged.id,
        oldValue: existing,
        newValue: merged,
        timestamp: now,
        reason: reason || `Updated relationship '${merged.id}'`
      });

      return merged;
    });
  }

  deleteEdge(caseId: string, edgeId: string, who = 'system', reason?: string): boolean {
    const existing = this.getEdge(caseId, edgeId);
    const now = new Date().toISOString();

    return runInTransaction(this.db, () => {
      this.auditRepo.log({
        id: uuidv4(),
        caseId,
        who,
        action: 'DELETE',
        objectType: 'EDGE',
        objectId: existing.id,
        oldValue: existing,
        timestamp: now,
        reason: reason || `Deleted relationship '${existing.id}'`
      });

      return this.edgeRepo.delete(edgeId, caseId);
    });
  }

  // --- FULL GRAPH & INTEGRITY ---

  getGraph(caseId: string): GraphPayload {
    const currentCase = this.caseRepo.getById(caseId);
    if (!currentCase) {
      throw new Error(`Case '${caseId}' not found.`);
    }

    const nodes = this.nodeRepo.getByCaseId(caseId);
    const edges = this.edgeRepo.getByCaseId(caseId);

    const entityCount = nodes.filter(n => n.category === 'ENTITY').length;
    const eventCount = nodes.filter(n => n.category === 'EVENT').length;
    const evidenceCount = nodes.filter(n => n.category === 'EVIDENCE').length;

    return {
      nodes,
      edges,
      metadata: {
        caseId,
        nodeCount: nodes.length,
        edgeCount: edges.length,
        entityCount,
        eventCount,
        evidenceCount,
        generatedAt: new Date().toISOString()
      }
    };
  }

  validateGraphIntegrity(caseId: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const nodes = this.nodeRepo.getByCaseId(caseId);
    const edges = this.edgeRepo.getByCaseId(caseId);
    const nodeMap = new Map<string, GraphNode>(nodes.map(n => [n.id, n]));
    const evidenceIds = new Set(nodes.filter(n => n.category === 'EVIDENCE').map(n => n.id));

    // 1. Validate all nodes
    for (const node of nodes) {
      const nv = validateNode(node);
      if (!nv.valid) {
        errors.push(`Node '${node.id}' validation errors: ${nv.errors.map(e => e.message).join(', ')}`);
      }
    }

    // 2. Validate all edges
    for (const edge of edges) {
      const src = nodeMap.get(edge.source);
      const tgt = nodeMap.get(edge.target);

      if (!src) {
        errors.push(`Edge '${edge.id}' references missing source node '${edge.source}'.`);
      }
      if (!tgt) {
        errors.push(`Edge '${edge.id}' references missing target node '${edge.target}'.`);
      }

      if (src && tgt) {
        const ev = validateEdge(edge, src, tgt, evidenceIds);
        if (!ev.valid) {
          errors.push(`Edge '${edge.id}' validation errors: ${ev.errors.map(e => e.message).join(', ')}`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

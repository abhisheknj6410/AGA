import { v4 as uuidv4 } from 'uuid';
import { DatabaseSync } from 'node:sqlite';
import { NodeRepository } from '../infrastructure/repositories/node-repository.js';
import { EdgeRepository } from '../infrastructure/repositories/edge-repository.js';
import { ResolutionRepository } from '../infrastructure/repositories/resolution-repository.js';
import { AuditRepository } from '../infrastructure/repositories/audit-repository.js';
import { evaluateEntitySimilarity } from '../domain/entity-resolution.js';
import { GraphNode, ResolutionCandidate } from '../domain/types.js';
import { runInTransaction } from '../infrastructure/db.js';

export class EntityResolutionService {
  private nodeRepo: NodeRepository;
  private edgeRepo: EdgeRepository;
  private resRepo: ResolutionRepository;
  private auditRepo: AuditRepository;

  constructor(private db: DatabaseSync) {
    this.nodeRepo = new NodeRepository(db);
    this.edgeRepo = new EdgeRepository(db);
    this.resRepo = new ResolutionRepository(db);
    this.auditRepo = new AuditRepository(db);
  }

  /**
   * Evaluates a newly created or updated node against all existing entities in the case.
   */
  evaluateNode(newNode: GraphNode): { autoMergedWith?: GraphNode; candidatesFlagged: ResolutionCandidate[] } {
    if (newNode.category !== 'ENTITY') {
      return { candidatesFlagged: [] };
    }

    const existingNodes = this.nodeRepo.getByCaseId(newNode.caseId);
    const flagged: ResolutionCandidate[] = [];

    for (const existing of existingNodes) {
      if (existing.id === newNode.id || existing.category !== 'ENTITY') continue;

      const comparison = evaluateEntitySimilarity(newNode, existing);

      if (comparison.matchType === 'EXACT_MATCH') {
        // Auto-merge if exact match and not already flagged
        // In safe mode, we can either automatically merge or flag candidate.
        // Let's create candidate marked as EXACT_MATCH.
        const candidate: ResolutionCandidate = {
          id: uuidv4(),
          caseId: newNode.caseId,
          sourceNodeId: newNode.id,
          targetNodeId: existing.id,
          matchType: 'EXACT_MATCH',
          similarityScore: comparison.similarityScore,
          reason: comparison.reason,
          status: 'PENDING',
          createdAt: new Date().toISOString()
        };
        this.resRepo.saveCandidate(candidate);
        flagged.push(candidate);
      } else if (comparison.matchType === 'POSSIBLE_MATCH') {
        const candidate: ResolutionCandidate = {
          id: uuidv4(),
          caseId: newNode.caseId,
          sourceNodeId: newNode.id,
          targetNodeId: existing.id,
          matchType: 'POSSIBLE_MATCH',
          similarityScore: comparison.similarityScore,
          reason: comparison.reason,
          status: 'PENDING',
          createdAt: new Date().toISOString()
        };
        this.resRepo.saveCandidate(candidate);
        flagged.push(candidate);
      }
    }

    return { candidatesFlagged: flagged };
  }

  getCandidates(caseId: string): ResolutionCandidate[] {
    return this.resRepo.getByCaseId(caseId);
  }

  /**
   * Safely merges a source node into a target (canonical) node.
   */
  mergeNodes(candidateId: string, caseId: string, who = 'investigator', userReason?: string): void {
    const candidates = this.resRepo.getByCaseId(caseId);
    const candidate = candidates.find(c => c.id === candidateId);
    if (!candidate) {
      throw new Error(`Resolution candidate '${candidateId}' not found.`);
    }

    const canonicalNode = this.nodeRepo.getById(candidate.targetNodeId, caseId);
    const duplicateNode = this.nodeRepo.getById(candidate.sourceNodeId, caseId);

    if (!canonicalNode || !duplicateNode) {
      throw new Error('Both nodes must exist in the case to perform merge.');
    }

    runInTransaction(this.db, () => {
      const now = new Date().toISOString();

      // 1. Preserve aliases in canonical node
      const currentAliases = (canonicalNode.properties.aliases as string[]) || [];
      if (!currentAliases.includes(duplicateNode.label)) {
        currentAliases.push(duplicateNode.label);
      }
      const duplicateAliases = (duplicateNode.properties.aliases as string[]) || [];
      for (const alias of duplicateAliases) {
        if (!currentAliases.includes(alias)) {
          currentAliases.push(alias);
        }
      }
      canonicalNode.properties.aliases = currentAliases;
      canonicalNode.updatedAt = now;
      this.nodeRepo.update(canonicalNode);

      // 2. Re-wire edges connected to duplicateNode
      const edges = this.edgeRepo.getByCaseId(caseId);
      for (const edge of edges) {
        let changed = false;
        if (edge.source === duplicateNode.id) {
          edge.source = canonicalNode.id;
          changed = true;
        }
        if (edge.target === duplicateNode.id) {
          edge.target = canonicalNode.id;
          changed = true;
        }

        if (changed) {
          // Avoid self-loops if duplicate was connected to canonical
          if (edge.source === edge.target) {
            this.edgeRepo.delete(edge.id, caseId);
          } else {
            edge.updatedAt = now;
            this.edgeRepo.update(edge);
          }
        }
      }

      // 3. Delete duplicate node
      this.nodeRepo.delete(duplicateNode.id, caseId);

      // 4. Update candidate status
      this.resRepo.updateStatus(candidateId, 'MERGED');

      // 5. Audit log
      this.auditRepo.log({
        id: uuidv4(),
        caseId,
        who,
        action: 'MERGE',
        objectType: 'RESOLUTION',
        objectId: candidateId,
        oldValue: { source: duplicateNode, target: canonicalNode },
        newValue: { canonical: canonicalNode },
        timestamp: now,
        reason: userReason || `Entity merged via resolution candidate: ${candidate.reason}`
      });
    });
  }

  rejectCandidate(candidateId: string, caseId: string, who = 'investigator', reason?: string): void {
    this.resRepo.updateStatus(candidateId, 'REJECTED');
    this.auditRepo.log({
      id: uuidv4(),
      caseId,
      who,
      action: 'UPDATE',
      objectType: 'RESOLUTION',
      objectId: candidateId,
      timestamp: new Date().toISOString(),
      reason: reason || 'Resolution candidate marked as distinct entities.'
    });
  }
}

import { DatabaseSync } from 'node:sqlite';
import { ResolutionCandidate, ResolutionMatchType } from '../../domain/types.js';

export class ResolutionRepository {
  constructor(private db: DatabaseSync) {}

  saveCandidate(candidate: ResolutionCandidate): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO resolution_candidates (id, case_id, source_node_id, target_node_id, match_type, similarity_score, reason, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      candidate.id,
      candidate.caseId,
      candidate.sourceNodeId,
      candidate.targetNodeId,
      candidate.matchType,
      candidate.similarityScore,
      candidate.reason,
      candidate.status,
      candidate.createdAt
    );
  }

  getByCaseId(caseId: string): ResolutionCandidate[] {
    const stmt = this.db.prepare(`
      SELECT 
        id, case_id as caseId, source_node_id as sourceNodeId, target_node_id as targetNodeId,
        match_type as matchType, similarity_score as similarityScore, reason, status, created_at as createdAt
      FROM resolution_candidates
      WHERE case_id = ?
      ORDER BY similarity_score DESC
    `);
    const rows = stmt.all(caseId) as any[];
    return rows.map(r => ({
      id: r.id,
      caseId: r.caseId,
      sourceNodeId: r.sourceNodeId,
      targetNodeId: r.targetNodeId,
      matchType: r.matchType as ResolutionMatchType,
      similarityScore: r.similarityScore,
      reason: r.reason,
      status: r.status as 'PENDING' | 'MERGED' | 'REJECTED',
      createdAt: r.createdAt
    }));
  }

  updateStatus(id: string, status: 'MERGED' | 'REJECTED'): boolean {
    const stmt = this.db.prepare(`UPDATE resolution_candidates SET status = ? WHERE id = ?`);
    stmt.run(status, id);
    return true;
  }
}

import { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
import {
  Possibility,
  PossibilityStatus,
  GraphDelta,
  GraphVersion
} from '../../domain/possibility-types.js';

export class PossibilityRepository {
  constructor(private db: DatabaseSync) {}

  // --- Graph Version Management ---
  getLatestVersion(caseId: string): number {
    const row = this.db.prepare(
      'SELECT MAX(version_number) as max_ver FROM case_graph_versions WHERE case_id = ?'
    ).get(caseId) as { max_ver: number | null } | undefined;

    return row?.max_ver ?? 1;
  }

  createVersion(caseId: string, summary: string, snapshotJson?: string): GraphVersion {
    const currentVer = this.getLatestVersion(caseId);
    const newVer = currentVer + 1;
    const id = randomUUID();
    const now = new Date().toISOString();

    this.db.prepare(`
      INSERT INTO case_graph_versions (id, case_id, version_number, snapshot_json, change_summary, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, caseId, newVer, snapshotJson || null, summary, now);

    return {
      id,
      caseId,
      versionNumber: newVer,
      snapshotJson,
      changeSummary: summary,
      createdAt: now
    };
  }

  // --- Possibility Management ---
  createPossibility(possibility: Omit<Possibility, 'id' | 'createdAt' | 'updatedAt'>): Possibility {
    const id = randomUUID();
    const now = new Date().toISOString();

    this.db.prepare(`
      INSERT INTO possibilities (
        id, case_id, name, description, base_graph_version, status,
        generation_method, assumptions_json, graph_changes_json,
        constraints_json, supporting_evidence_json, conflicting_evidence_json,
        unresolved_questions_json, canonical_signature, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      possibility.caseId,
      possibility.name,
      possibility.description || '',
      possibility.baseGraphVersion,
      possibility.status,
      possibility.generationMethod,
      JSON.stringify(possibility.assumptions || []),
      JSON.stringify(possibility.graphChanges || {}),
      JSON.stringify(possibility.constraints || {}),
      JSON.stringify(possibility.supportingEvidence || []),
      JSON.stringify(possibility.conflictingEvidence || []),
      JSON.stringify(possibility.unresolvedQuestions || []),
      possibility.canonicalSignature,
      now,
      now
    );

    return {
      ...possibility,
      id,
      createdAt: now,
      updatedAt: now
    };
  }

  findByCaseId(caseId: string): Possibility[] {
    const rows = this.db.prepare(`
      SELECT * FROM possibilities WHERE case_id = ? ORDER BY created_at DESC
    `).all(caseId) as Array<Record<string, unknown>>;

    return rows.map(r => this.mapRowToPossibility(r));
  }

  findById(id: string): Possibility | null {
    const row = this.db.prepare(`
      SELECT * FROM possibilities WHERE id = ?
    `).get(id) as Record<string, unknown> | undefined;

    if (!row) return null;
    return this.mapRowToPossibility(row);
  }

  findBySignature(caseId: string, signature: string): Possibility | null {
    const row = this.db.prepare(`
      SELECT * FROM possibilities WHERE case_id = ? AND canonical_signature = ?
    `).get(caseId, signature) as Record<string, unknown> | undefined;

    if (!row) return null;
    return this.mapRowToPossibility(row);
  }

  updateStatus(id: string, status: PossibilityStatus, reason?: string): void {
    const now = new Date().toISOString();
    this.db.prepare(`
      UPDATE possibilities SET status = ?, updated_at = ? WHERE id = ?
    `).run(status, now, id);
  }

  deletePossibility(id: string): boolean {
    const res = this.db.prepare('DELETE FROM possibilities WHERE id = ?').run(id);
    return res.changes > 0;
  }

  deleteAllForCase(caseId: string): void {
    this.db.prepare('DELETE FROM possibilities WHERE case_id = ?').run(caseId);
  }

  private mapRowToPossibility(row: Record<string, unknown>): Possibility {
    return {
      id: row.id as string,
      caseId: row.case_id as string,
      name: row.name as string,
      description: (row.description as string) || '',
      baseGraphVersion: row.base_graph_version as number,
      status: row.status as PossibilityStatus,
      generationMethod: row.generation_method as any,
      assumptions: JSON.parse((row.assumptions_json as string) || '[]'),
      graphChanges: JSON.parse((row.graph_changes_json as string) || '{}') as GraphDelta,
      constraints: JSON.parse((row.constraints_json as string) || '{}'),
      supportingEvidence: JSON.parse((row.supporting_evidence_json as string) || '[]'),
      conflictingEvidence: JSON.parse((row.conflicting_evidence_json as string) || '[]'),
      unresolvedQuestions: JSON.parse((row.unresolved_questions_json as string) || '[]'),
      canonicalSignature: row.canonical_signature as string,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string
    };
  }
}

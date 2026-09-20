import { DatabaseSync } from 'node:sqlite';
import { GraphEdge, EdgeStatus, EdgeType } from '../../domain/types.js';

export class EdgeRepository {
  constructor(private db: DatabaseSync) {}

  create(edge: GraphEdge): void {
    const insertEdge = this.db.prepare(`
      INSERT INTO edges (id, case_id, source_id, target_id, type, status, cost, confidence, properties_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insertEdge.run(
      edge.id,
      edge.caseId,
      edge.source,
      edge.target,
      edge.type,
      edge.status,
      edge.cost ?? 1.0,
      edge.confidence ?? null,
      JSON.stringify(edge.properties || {}),
      edge.createdAt,
      edge.updatedAt
    );

    // Insert evidence references
    if (edge.evidenceRefs && edge.evidenceRefs.length > 0) {
      const insertRef = this.db.prepare(`
        INSERT OR IGNORE INTO edge_evidence (edge_id, evidence_id)
        VALUES (?, ?)
      `);
      for (const evId of edge.evidenceRefs) {
        insertRef.run(edge.id, evId);
      }
    }
  }

  getById(id: string, caseId?: string): GraphEdge | null {
    let sql = `
      SELECT 
        id, case_id as caseId, source_id as source, target_id as target,
        type, status, cost, confidence, properties_json,
        created_at as createdAt, updated_at as updatedAt
      FROM edges
      WHERE id = ?
    `;
    const params: any[] = [id];
    if (caseId) {
      sql += ` AND case_id = ?`;
      params.push(caseId);
    }

    const row = this.db.prepare(sql).get(...params) as any;
    if (!row) return null;

    const evidenceRefs = this.getEvidenceRefsForEdge(row.id);

    return {
      id: row.id,
      caseId: row.caseId,
      source: row.source,
      target: row.target,
      type: row.type as EdgeType,
      status: row.status as EdgeStatus,
      cost: row.cost,
      confidence: row.confidence,
      evidenceRefs,
      properties: JSON.parse(row.properties_json || '{}'),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    };
  }

  getByCaseId(caseId: string): GraphEdge[] {
    const sql = `
      SELECT 
        id, case_id as caseId, source_id as source, target_id as target,
        type, status, cost, confidence, properties_json,
        created_at as createdAt, updated_at as updatedAt
      FROM edges
      WHERE case_id = ?
      ORDER BY created_at ASC
    `;
    const rows = this.db.prepare(sql).all(caseId) as any[];

    // Batch load evidence references for the case
    const refsSql = `
      SELECT ee.edge_id, ee.evidence_id
      FROM edge_evidence ee
      JOIN edges e ON ee.edge_id = e.id
      WHERE e.case_id = ?
    `;
    const refRows = this.db.prepare(refsSql).all(caseId) as any[];
    const refsMap = new Map<string, string[]>();
    for (const r of refRows) {
      if (!refsMap.has(r.edge_id)) {
        refsMap.set(r.edge_id, []);
      }
      refsMap.get(r.edge_id)!.push(r.evidence_id);
    }

    return rows.map(row => ({
      id: row.id,
      caseId: row.caseId,
      source: row.source,
      target: row.target,
      type: row.type as EdgeType,
      status: row.status as EdgeStatus,
      cost: row.cost,
      confidence: row.confidence,
      evidenceRefs: refsMap.get(row.id) || [],
      properties: JSON.parse(row.properties_json || '{}'),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    }));
  }

  update(edge: GraphEdge): void {
    const updateEdge = this.db.prepare(`
      UPDATE edges
      SET status = ?, cost = ?, confidence = ?, properties_json = ?, updated_at = ?
      WHERE id = ? AND case_id = ?
    `);
    updateEdge.run(
      edge.status,
      edge.cost ?? 1.0,
      edge.confidence ?? null,
      JSON.stringify(edge.properties || {}),
      edge.updatedAt,
      edge.id,
      edge.caseId
    );

    // Refresh evidence refs
    this.db.prepare(`DELETE FROM edge_evidence WHERE edge_id = ?`).run(edge.id);
    if (edge.evidenceRefs && edge.evidenceRefs.length > 0) {
      const insertRef = this.db.prepare(`
        INSERT OR IGNORE INTO edge_evidence (edge_id, evidence_id)
        VALUES (?, ?)
      `);
      for (const evId of edge.evidenceRefs) {
        insertRef.run(edge.id, evId);
      }
    }
  }

  delete(id: string, caseId: string): boolean {
    const stmt = this.db.prepare(`DELETE FROM edges WHERE id = ? AND case_id = ?`);
    stmt.run(id, caseId);
    return true;
  }

  private getEvidenceRefsForEdge(edgeId: string): string[] {
    const stmt = this.db.prepare(`
      SELECT evidence_id FROM edge_evidence WHERE edge_id = ?
    `);
    const rows = stmt.all(edgeId) as any[];
    return rows.map(r => r.evidence_id);
  }
}

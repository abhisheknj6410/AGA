import { DatabaseSync } from 'node:sqlite';
import { GraphNode, NodeCategory } from '../../domain/types.js';

export class NodeRepository {
  constructor(private db: DatabaseSync) {}

  create(node: GraphNode): void {
    // 1. Insert core node
    const insertNode = this.db.prepare(`
      INSERT INTO nodes (id, case_id, category, type, label, properties_json, metadata_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insertNode.run(
      node.id,
      node.caseId,
      node.category,
      node.type,
      node.label,
      JSON.stringify(node.properties || {}),
      JSON.stringify(node.metadata || {}),
      node.createdAt,
      node.updatedAt
    );

    // 2. Insert category-specific extension
    if (node.category === 'EVENT' && node.time) {
      const insertEvent = this.db.prepare(`
        INSERT INTO events (node_id, event_type, time_start, time_end, time_precision)
        VALUES (?, ?, ?, ?, ?)
      `);
      insertEvent.run(
        node.id,
        node.type,
        node.time.start || null,
        node.time.end || null,
        node.time.precision || 'SECOND'
      );
    } else if (node.category === 'EVIDENCE') {
      const insertEvidence = this.db.prepare(`
        INSERT INTO evidence (node_id, evidence_type, source_name, source_kind, source_reference, reliability, collection_time, hash_checksum)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      insertEvidence.run(
        node.id,
        node.type,
        node.source?.name || '',
        node.source?.kind || 'SYSTEM',
        node.source?.reference || null,
        node.reliability ?? 1.0,
        node.collectionTime || null,
        node.hashChecksum || null
      );
    }
  }

  getById(id: string, caseId?: string): GraphNode | null {
    let sql = `
      SELECT 
        n.id, n.case_id as caseId, n.category, n.type, n.label,
        n.properties_json, n.metadata_json, n.created_at as createdAt, n.updated_at as updatedAt,
        ev.event_type as eventType, ev.time_start as timeStart, ev.time_end as timeEnd, ev.time_precision as timePrecision,
        evi.evidence_type as evidenceType, evi.source_name as sourceName, evi.source_kind as sourceKind,
        evi.source_reference as sourceReference, evi.reliability, evi.collection_time as collectionTime,
        evi.hash_checksum as hashChecksum
      FROM nodes n
      LEFT JOIN events ev ON n.id = ev.node_id
      LEFT JOIN evidence evi ON n.id = evi.node_id
      WHERE n.id = ?
    `;
    const params: any[] = [id];
    if (caseId) {
      sql += ` AND n.case_id = ?`;
      params.push(caseId);
    }

    const row = this.db.prepare(sql).get(...params) as any;
    if (!row) return null;
    return this.mapRowToNode(row);
  }

  getByCaseId(caseId: string): GraphNode[] {
    const sql = `
      SELECT 
        n.id, n.case_id as caseId, n.category, n.type, n.label,
        n.properties_json, n.metadata_json, n.created_at as createdAt, n.updated_at as updatedAt,
        ev.event_type as eventType, ev.time_start as timeStart, ev.time_end as timeEnd, ev.time_precision as timePrecision,
        evi.evidence_type as evidenceType, evi.source_name as sourceName, evi.source_kind as sourceKind,
        evi.source_reference as sourceReference, evi.reliability, evi.collection_time as collectionTime,
        evi.hash_checksum as hashChecksum
      FROM nodes n
      LEFT JOIN events ev ON n.id = ev.node_id
      LEFT JOIN evidence evi ON n.id = evi.node_id
      WHERE n.case_id = ?
      ORDER BY n.created_at ASC
    `;
    const rows = this.db.prepare(sql).all(caseId) as any[];
    return rows.map(r => this.mapRowToNode(r));
  }

  update(node: GraphNode): void {
    const updateNode = this.db.prepare(`
      UPDATE nodes
      SET label = ?, properties_json = ?, metadata_json = ?, updated_at = ?
      WHERE id = ? AND case_id = ?
    `);
    updateNode.run(
      node.label,
      JSON.stringify(node.properties || {}),
      JSON.stringify(node.metadata || {}),
      node.updatedAt,
      node.id,
      node.caseId
    );

    if (node.category === 'EVENT' && node.time) {
      const updateEvent = this.db.prepare(`
        INSERT INTO events (node_id, event_type, time_start, time_end, time_precision)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(node_id) DO UPDATE SET
          time_start = excluded.time_start,
          time_end = excluded.time_end,
          time_precision = excluded.time_precision
      `);
      updateEvent.run(
        node.id,
        node.type,
        node.time.start || null,
        node.time.end || null,
        node.time.precision || 'SECOND'
      );
    } else if (node.category === 'EVIDENCE') {
      const updateEvidence = this.db.prepare(`
        INSERT INTO evidence (node_id, evidence_type, source_name, source_kind, source_reference, reliability, collection_time, hash_checksum)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(node_id) DO UPDATE SET
          source_name = excluded.source_name,
          source_kind = excluded.source_kind,
          source_reference = excluded.source_reference,
          reliability = excluded.reliability,
          collection_time = excluded.collection_time,
          hash_checksum = excluded.hash_checksum
      `);
      updateEvidence.run(
        node.id,
        node.type,
        node.source?.name || '',
        node.source?.kind || 'SYSTEM',
        node.source?.reference || null,
        node.reliability ?? 1.0,
        node.collectionTime || null,
        node.hashChecksum || null
      );
    }
  }

  delete(id: string, caseId: string): boolean {
    const stmt = this.db.prepare(`DELETE FROM nodes WHERE id = ? AND case_id = ?`);
    stmt.run(id, caseId);
    return true;
  }

  exists(id: string, caseId: string): boolean {
    const stmt = this.db.prepare(`SELECT 1 FROM nodes WHERE id = ? AND case_id = ?`);
    return !!stmt.get(id, caseId);
  }

  private mapRowToNode(row: any): GraphNode {
    const node: GraphNode = {
      id: row.id,
      caseId: row.caseId,
      category: row.category as NodeCategory,
      type: row.type,
      label: row.label,
      properties: JSON.parse(row.properties_json || '{}'),
      metadata: JSON.parse(row.metadata_json || '{}'),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    };

    if (row.category === 'EVENT') {
      node.time = {
        start: row.timeStart || undefined,
        end: row.timeEnd || undefined,
        precision: row.timePrecision || 'SECOND'
      };
    } else if (row.category === 'EVIDENCE') {
      node.evidenceType = row.evidenceType;
      node.source = {
        name: row.sourceName,
        kind: row.sourceKind,
        reference: row.sourceReference || undefined
      };
      node.reliability = row.reliability;
      node.collectionTime = row.collectionTime || undefined;
      node.hashChecksum = row.hashChecksum || undefined;
    }

    return node;
  }
}

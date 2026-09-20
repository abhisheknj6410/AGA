import { DatabaseSync } from 'node:sqlite';
import { AuditLog } from '../../domain/types.js';

export class AuditRepository {
  constructor(private db: DatabaseSync) {}

  log(entry: AuditLog): void {
    const stmt = this.db.prepare(`
      INSERT INTO audit_logs (id, case_id, who, action, object_type, object_id, old_value_json, new_value_json, timestamp, reason)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      entry.id,
      entry.caseId,
      entry.who,
      entry.action,
      entry.objectType,
      entry.objectId,
      entry.oldValue ? JSON.stringify(entry.oldValue) : null,
      entry.newValue ? JSON.stringify(entry.newValue) : null,
      entry.timestamp,
      entry.reason || null
    );
  }

  getByCaseId(caseId: string, limit = 100): AuditLog[] {
    const stmt = this.db.prepare(`
      SELECT 
        id, case_id as caseId, who, action, object_type as objectType, object_id as objectId,
        old_value_json, new_value_json, timestamp, reason
      FROM audit_logs
      WHERE case_id = ?
      ORDER BY timestamp DESC
      LIMIT ?
    `);
    const rows = stmt.all(caseId, limit) as any[];
    return rows.map(r => ({
      id: r.id,
      caseId: r.caseId,
      who: r.who,
      action: r.action,
      objectType: r.objectType,
      objectId: r.objectId,
      oldValue: r.old_value_json ? JSON.parse(r.old_value_json) : undefined,
      newValue: r.new_value_json ? JSON.parse(r.new_value_json) : undefined,
      timestamp: r.timestamp,
      reason: r.reason || undefined
    }));
  }
}

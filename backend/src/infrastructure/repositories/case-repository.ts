import { DatabaseSync } from 'node:sqlite';
import { Case } from '../../domain/types.js';

export class CaseRepository {
  constructor(private db: DatabaseSync) {}

  create(caseData: Case): void {
    const stmt = this.db.prepare(`
      INSERT INTO cases (id, name, description, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      caseData.id,
      caseData.name,
      caseData.description || '',
      caseData.status,
      caseData.createdAt,
      caseData.updatedAt
    );
  }

  getById(id: string): Case | null {
    const stmt = this.db.prepare(`
      SELECT id, name, description, status, created_at as createdAt, updated_at as updatedAt
      FROM cases WHERE id = ?
    `);
    const row = stmt.get(id) as any;
    return row || null;
  }

  getAll(): Case[] {
    const stmt = this.db.prepare(`
      SELECT id, name, description, status, created_at as createdAt, updated_at as updatedAt
      FROM cases ORDER BY created_at DESC
    `);
    return stmt.all() as any as Case[];
  }

  update(id: string, updates: Partial<Pick<Case, 'name' | 'description' | 'status' | 'updatedAt'>>): boolean {
    const existing = this.getById(id);
    if (!existing) return false;

    const name = updates.name ?? existing.name;
    const description = updates.description ?? existing.description;
    const status = updates.status ?? existing.status;
    const updatedAt = updates.updatedAt ?? new Date().toISOString();

    const stmt = this.db.prepare(`
      UPDATE cases
      SET name = ?, description = ?, status = ?, updated_at = ?
      WHERE id = ?
    `);
    stmt.run(name, description, status, updatedAt, id);
    return true;
  }

  delete(id: string): boolean {
    const stmt = this.db.prepare(`DELETE FROM cases WHERE id = ?`);
    stmt.run(id);
    return true;
  }
}

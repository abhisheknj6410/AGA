import { v4 as uuidv4 } from 'uuid';
import { DatabaseSync } from 'node:sqlite';
import { CaseRepository } from '../infrastructure/repositories/case-repository.js';
import { AuditRepository } from '../infrastructure/repositories/audit-repository.js';
import { Case } from '../domain/types.js';

export class CaseService {
  private caseRepo: CaseRepository;
  private auditRepo: AuditRepository;

  constructor(private db: DatabaseSync) {
    this.caseRepo = new CaseRepository(db);
    this.auditRepo = new AuditRepository(db);
  }

  createCase(name: string, description: string, who = 'system'): Case {
    if (!name || name.trim() === '') {
      throw new Error('Case name is required and cannot be empty.');
    }

    const now = new Date().toISOString();
    const newCase: Case = {
      id: uuidv4(),
      name: name.trim(),
      description: description ? description.trim() : '',
      status: 'ACTIVE',
      createdAt: now,
      updatedAt: now
    };

    this.caseRepo.create(newCase);

    this.auditRepo.log({
      id: uuidv4(),
      caseId: newCase.id,
      who,
      action: 'CREATE',
      objectType: 'CASE',
      objectId: newCase.id,
      newValue: newCase,
      timestamp: now,
      reason: 'Initial case creation'
    });

    return newCase;
  }

  getCase(id: string): Case {
    const caseData = this.caseRepo.getById(id);
    if (!caseData) {
      throw new Error(`Case with ID '${id}' not found.`);
    }
    return caseData;
  }

  listCases(): Case[] {
    return this.caseRepo.getAll();
  }

  updateCase(
    id: string,
    updates: Partial<Pick<Case, 'name' | 'description' | 'status'>>,
    who = 'system',
    reason?: string
  ): Case {
    const existing = this.getCase(id);
    const now = new Date().toISOString();

    const success = this.caseRepo.update(id, {
      ...updates,
      updatedAt: now
    });

    if (!success) {
      throw new Error(`Failed to update case '${id}'.`);
    }

    const updated = this.getCase(id);
    this.auditRepo.log({
      id: uuidv4(),
      caseId: id,
      who,
      action: 'UPDATE',
      objectType: 'CASE',
      objectId: id,
      oldValue: existing,
      newValue: updated,
      timestamp: now,
      reason: reason || 'Case metadata update'
    });

    return updated;
  }

  deleteCase(id: string, who = 'system', reason?: string): boolean {
    const existing = this.getCase(id);
    const now = new Date().toISOString();

    this.auditRepo.log({
      id: uuidv4(),
      caseId: id,
      who,
      action: 'DELETE',
      objectType: 'CASE',
      objectId: id,
      oldValue: existing,
      timestamp: now,
      reason: reason || 'Case deletion'
    });

    return this.caseRepo.delete(id);
  }
}

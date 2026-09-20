import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';

let instance: DatabaseSync | null = null;

export function getDatabase(customPath?: string): DatabaseSync {
  if (instance && !customPath) {
    return instance;
  }

  const dbPath = customPath || process.env.DATABASE_PATH || path.join(process.cwd(), 'evidence_graph.db');

  if (dbPath !== ':memory:') {
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  const db = new DatabaseSync(dbPath);

  // Enable foreign keys and WAL mode for high performance and integrity
  db.exec('PRAGMA foreign_keys = ON;');
  if (dbPath !== ':memory:') {
    db.exec('PRAGMA journal_mode = WAL;');
  }

  if (!customPath) {
    instance = db;
  }

  return db;
}

export function runInTransaction<T>(db: DatabaseSync, fn: () => T): T {
  db.exec('BEGIN TRANSACTION;');
  try {
    const result = fn();
    db.exec('COMMIT;');
    return result;
  } catch (error) {
    db.exec('ROLLBACK;');
    throw error;
  }
}

export function closeDatabase(): void {
  if (instance) {
    instance.close();
    instance = null;
  }
}

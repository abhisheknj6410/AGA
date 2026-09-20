import { describe, it } from 'node:test';
import assert from 'node:assert';
import { DatabaseSync } from 'node:sqlite';
import { runMigrations } from '../infrastructure/migrations.js';
import { CaseService } from '../application/case-service.js';
import { GraphService } from '../application/graph-service.js';
import { ImportService } from '../application/import-service.js';
import { AiExtractionService } from '../application/ai-extraction-service.js';
import { validateNode } from '../domain/validation.js';

describe('AI Extraction Boundary & Snapshot Architecture', () => {
  it('should extract structured untrusted candidates with explicit aiExtracted metadata', () => {
    const aiService = new AiExtractionService();
    const rawLog = `
      Accepted publickey for rkumar-adm from 10.0.4.15 port 22 ssh2
      2026-09-10 14:22:00 accessed /tmp/customer_records_q3.sql
      Contact lead investigator at cso@cyberdefense.internal
    `;

    const result = aiService.extractStructuredCandidates({
      rawText: rawLog,
      sourceName: 'syslog-snippet.txt',
      evidenceType: 'LOG'
    });

    assert.ok(result.evidence && result.evidence.length === 1);
    assert.ok(result.nodes && result.nodes.length >= 2);
    assert.ok(result.events && result.events.length >= 2);
    assert.ok(result.edges && result.edges.length >= 2);

    // Verify AI boundary marker
    assert.strictEqual(result.evidence[0].metadata?.aiExtracted, true);
    assert.strictEqual(result.nodes[0].metadata?.aiExtracted, true);

    // Verify all candidates pass the strict domain validator
    for (const node of result.nodes) {
      const v = validateNode({ ...node, id: 'temp-id', caseId: 'test-case' });
      assert.strictEqual(v.valid, true, `AI node failed validation: ${v.errors.map(e => e.message).join(', ')}`);
    }
  });

  it('should faithfully export and restore a complete investigation snapshot', () => {
    const db = new DatabaseSync(':memory:');
    db.exec('PRAGMA foreign_keys = ON;');
    runMigrations(db);

    const caseService = new CaseService(db);
    const graphService = new GraphService(db);
    const importService = new ImportService(db, graphService);

    const c1 = caseService.createCase('Original Case', 'Snapshot test');
    const p1 = graphService.addNode(c1.id, {
      id: 'p1',
      category: 'ENTITY',
      type: 'PERSON',
      label: 'Original Person'
    });
    const ev1 = graphService.addNode(c1.id, {
      id: 'ev1',
      category: 'EVIDENCE',
      type: 'LOG',
      label: 'Original Log',
      source: { name: 'test.log', kind: 'SYSTEM' }
    });
    const evt1 = graphService.addNode(c1.id, {
      id: 'evt1',
      category: 'EVENT',
      type: 'LOGIN',
      label: 'Original Login',
      time: { precision: 'SECOND' }
    });
    graphService.addEdge(c1.id, {
      id: 'e1',
      source: p1.id,
      target: evt1.id,
      type: 'PERFORMED',
      status: 'OBSERVED',
      evidenceRefs: [ev1.id]
    });

    // Verify snapshot creation
    const snapshotGraph = graphService.getGraph(c1.id);
    assert.strictEqual(snapshotGraph.nodes.length, 3);
    assert.strictEqual(snapshotGraph.edges.length, 1);

    // Restore into a new database / system instance
    const db2 = new DatabaseSync(':memory:');
    db2.exec('PRAGMA foreign_keys = ON;');
    runMigrations(db2);
    const caseService2 = new CaseService(db2);
    const graphService2 = new GraphService(db2);

    const c2 = caseService2.createCase('Restored Case', 'Restored');
    for (const node of snapshotGraph.nodes) {
      graphService2.addNode(c2.id, node);
    }
    for (const edge of snapshotGraph.edges) {
      graphService2.addEdge(c2.id, edge);
    }

    const restoredGraph = graphService2.getGraph(c2.id);
    assert.strictEqual(restoredGraph.nodes.length, 3);
    assert.strictEqual(restoredGraph.edges.length, 1);
    assert.strictEqual(restoredGraph.edges[0].type, 'PERFORMED');
    assert.deepStrictEqual(restoredGraph.edges[0].evidenceRefs, [ev1.id]);
  });
});

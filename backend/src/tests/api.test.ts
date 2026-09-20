import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { DatabaseSync } from 'node:sqlite';
import http from 'node:http';
import { createApp } from '../api/server.js';
import { seedDatabase } from '../infrastructure/seed.js';

describe('Evidence Graph REST API End-to-End', () => {
  let server: http.Server;
  let baseUrl: string;
  let db: DatabaseSync;
  let caseId: string;

  before(async () => {
    db = new DatabaseSync(':memory:');
    db.exec('PRAGMA foreign_keys = ON;');
    const app = createApp(db);

    // Seed test data in memory
    const seed = seedDatabase(db);
    caseId = seed.caseId;

    await new Promise<void>(resolve => {
      server = app.listen(0, () => {
        const addr = server.address() as any;
        baseUrl = `http://localhost:${addr.port}`;
        resolve();
      });
    });
  });

  after(() => {
    server.close();
  });

  it('GET /health should return 200 OK', async () => {
    const res = await fetch(`${baseUrl}/health`);
    assert.strictEqual(res.status, 200);
    const body: any = await res.json();
    assert.strictEqual(body.status, 'ok');
  });

  it('GET /api/cases should list available cases', async () => {
    const res = await fetch(`${baseUrl}/api/cases`);
    assert.strictEqual(res.status, 200);
    const cases: any = await res.json();
    assert.ok(Array.isArray(cases));
    assert.ok(cases.length >= 1);
    assert.ok(cases.some((c: any) => c.id === caseId));
  });

  it('GET /api/cases/:caseId/graph should return full valid graph payload', async () => {
    const res = await fetch(`${baseUrl}/api/cases/${caseId}/graph`);
    assert.strictEqual(res.status, 200);
    const graph: any = await res.json();
    assert.ok(graph.nodes.length >= 30);
    assert.ok(graph.edges.length >= 25);
    assert.ok(graph.metadata.nodeCount > 0);
    assert.ok(graph.metadata.edgeCount > 0);
  });

  it('POST /api/cases/:caseId/nodes should create new entity node', async () => {
    const res = await fetch(`${baseUrl}/api/cases/${caseId}/nodes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        category: 'ENTITY',
        type: 'EMAIL',
        label: 'investigator@defense.internal',
        properties: { mailboxSizeMb: 1024 }
      })
    });
    assert.strictEqual(res.status, 201);
    const node: any = await res.json();
    assert.strictEqual(node.label, 'investigator@defense.internal');
    assert.strictEqual(node.type, 'EMAIL');
  });

  it('POST /api/cases/:caseId/import/json should reject invalid payload without touching graph', async () => {
    const res = await fetch(`${baseUrl}/api/cases/${caseId}/import/json`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nodes: [
          {
            category: 'UNKNOWN_CATEGORY', // Invalid!
            label: 'Corrupted Node'
          }
        ]
      })
    });
    assert.strictEqual(res.status, 422);
    const body: any = await res.json();
    assert.strictEqual(body.result.success, false);
    assert.ok(body.result.errors.length > 0);
  });

  it('GET /api/cases/:caseId/resolution/candidates should list duplicate candidates', async () => {
    const res = await fetch(`${baseUrl}/api/cases/${caseId}/resolution/candidates`);
    assert.strictEqual(res.status, 200);
    const candidates: any = await res.json();
    assert.ok(Array.isArray(candidates));
    assert.ok(candidates.some((c: any) => c.matchType === 'POSSIBLE_MATCH'));
  });

  it('PATCH /api/cases/:caseId/nodes/:nodeId should update node label and custom properties', async () => {
    // 1. Fetch existing graph to find a node
    const gRes = await fetch(`${baseUrl}/api/cases/${caseId}/graph`);
    const graph: any = await gRes.json();
    const targetNode = graph.nodes.find((n: any) => n.category === 'ENTITY');
    assert.ok(targetNode, 'Case should have an entity node to patch');

    // 2. Patch node
    const patchRes = await fetch(`${baseUrl}/api/cases/${caseId}/nodes/${targetNode.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        label: `${targetNode.label} (Updated)`,
        properties: { ...targetNode.properties, patchedKey: 'patchedValue' }
      })
    });
    assert.strictEqual(patchRes.status, 200);
    const patched: any = await patchRes.json();
    assert.strictEqual(patched.label, `${targetNode.label} (Updated)`);
    assert.strictEqual(patched.properties.patchedKey, 'patchedValue');
  });

  it('PATCH /api/cases/:caseId/edges/:edgeId should update edge cost and status with validation', async () => {
    // 1. Fetch existing graph to find an edge
    const gRes = await fetch(`${baseUrl}/api/cases/${caseId}/graph`);
    const graph: any = await gRes.json();
    const targetEdge = graph.edges[0];
    assert.ok(targetEdge, 'Case should have an edge to patch');

    // 2. Patch edge with valid new cost and confidence
    const patchRes = await fetch(`${baseUrl}/api/cases/${caseId}/edges/${targetEdge.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cost: 3.75,
        confidence: 0.95
      })
    });
    assert.strictEqual(patchRes.status, 200);
    const patched: any = await patchRes.json();
    assert.strictEqual(patched.cost, 3.75);
    assert.strictEqual(patched.confidence, 0.95);
  });

  it('GET /api/cases/:caseId/graph/diagnostics should return topology metrics and Phase 2 compatibility', async () => {
    const res = await fetch(`${baseUrl}/api/cases/${caseId}/graph/diagnostics`);
    assert.strictEqual(res.status, 200);
    const diag: any = await res.json();
    assert.ok(diag.overview.nodeCount > 0);
    assert.ok(diag.connectivity.componentCount >= 1);
    assert.strictEqual(diag.phase2Readiness.dijkstraCompatible, true);
    assert.strictEqual(diag.costIntegrity.allNonNegative, true);
  });
});

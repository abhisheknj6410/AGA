import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { DatabaseSync } from 'node:sqlite';
import { runMigrations } from '../infrastructure/migrations.js';
import { CaseService } from '../application/case-service.js';
import { GraphService } from '../application/graph-service.js';

describe('Graph Integrity & Provenance Validation', () => {
  let db: DatabaseSync;
  let caseService: CaseService;
  let graphService: GraphService;
  let caseId: string;

  beforeEach(() => {
    db = new DatabaseSync(':memory:');
    db.exec('PRAGMA foreign_keys = ON;');
    runMigrations(db);
    caseService = new CaseService(db);
    graphService = new GraphService(db);

    const c = caseService.createCase('Integrity Test Case', 'Testing graph constraints');
    caseId = c.id;
  });

  it('should reject edge creation when source node is missing', () => {
    // Add target only
    const target = graphService.addNode(caseId, {
      id: 'target-node',
      category: 'ENTITY',
      type: 'SERVER',
      label: 'Prod Server'
    });

    assert.throws(
      () => {
        graphService.addEdge(caseId, {
          source: 'non-existent-source',
          target: target.id,
          type: 'CONNECTED_TO',
          status: 'OBSERVED',
          evidenceRefs: []
        });
      },
      /Source node 'non-existent-source' not found/
    );
  });

  it('should reject edge creation when target node is missing', () => {
    const source = graphService.addNode(caseId, {
      id: 'source-node',
      category: 'ENTITY',
      type: 'DEVICE',
      label: 'Laptop'
    });

    assert.throws(
      () => {
        graphService.addEdge(caseId, {
          source: source.id,
          target: 'non-existent-target',
          type: 'CONNECTED_TO',
          status: 'OBSERVED',
          evidenceRefs: []
        });
      },
      /Target node 'non-existent-target' not found/
    );
  });

  it('should reject OBSERVED edge that lacks evidence references (provenance violation)', () => {
    const p = graphService.addNode(caseId, {
      id: 'p1',
      category: 'ENTITY',
      type: 'PERSON',
      label: 'Rahul'
    });
    const ev = graphService.addNode(caseId, {
      id: 'ev-login',
      category: 'EVENT',
      type: 'LOGIN',
      label: 'Login',
      time: { precision: 'SECOND' }
    });

    assert.throws(
      () => {
        graphService.addEdge(caseId, {
          source: p.id,
          target: ev.id,
          type: 'PERFORMED',
          status: 'OBSERVED',
          evidenceRefs: [] // Missing provenance!
        });
      },
      /Provenance violation: 'OBSERVED' relationships must reference at least one supporting evidence/
    );
  });

  it('should reject edge with dangling/non-existent evidence references', () => {
    const p = graphService.addNode(caseId, {
      id: 'p1',
      category: 'ENTITY',
      type: 'PERSON',
      label: 'Rahul'
    });
    const ev = graphService.addNode(caseId, {
      id: 'ev-login',
      category: 'EVENT',
      type: 'LOGIN',
      label: 'Login',
      time: { precision: 'SECOND' }
    });

    assert.throws(
      () => {
        graphService.addEdge(caseId, {
          source: p.id,
          target: ev.id,
          type: 'PERFORMED',
          status: 'OBSERVED',
          evidenceRefs: ['fake-evidence-id-999']
        });
      },
      /Referenced evidence 'fake-evidence-id-999' does not exist/
    );
  });

  it('should prevent cross-case references and isolate cases strictly', () => {
    const case2 = caseService.createCase('Second Case', 'Isolation check');

    const nodeInCase1 = graphService.addNode(caseId, {
      id: 'node-case-1',
      category: 'ENTITY',
      type: 'PERSON',
      label: 'Person in Case 1'
    });

    // Attempt to access or create node in Case 2 with same ID or connect across cases
    assert.throws(
      () => {
        graphService.getNode(case2.id, nodeInCase1.id);
      },
      /not found in case/
    );
  });
});

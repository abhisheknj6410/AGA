import test from 'node:test';
import assert from 'node:assert';
import { GraphExporter } from '../application/graph-exporter.js';
import { GraphPayload } from '../domain/types.js';

test('Graph Exporter - GraphML & DOT Formats', async (t) => {
  const sampleGraph: GraphPayload = {
    metadata: {
      caseId: 'test-case-export-1',
      nodeCount: 3,
      edgeCount: 2,
      entityCount: 1,
      eventCount: 1,
      evidenceCount: 1,
      generatedAt: '2026-09-20T12:00:00.000Z'
    },
    nodes: [
      {
        id: 'node-entity-1',
        caseId: 'test-case-export-1',
        category: 'ENTITY',
        type: 'PERSON',
        label: 'Alice <Special & Chars>',
        properties: {},
        metadata: {},
        createdAt: '2026-09-20T12:00:00Z',
        updatedAt: '2026-09-20T12:00:00Z'
      },
      {
        id: 'node-event-1',
        caseId: 'test-case-export-1',
        category: 'EVENT',
        type: 'LOGIN',
        label: 'Login Attempt "Primary"',
        properties: {},
        metadata: {},
        time: {
          start: '2026-09-20T12:05:00Z',
          precision: 'SECOND'
        },
        createdAt: '2026-09-20T12:00:00Z',
        updatedAt: '2026-09-20T12:00:00Z'
      },
      {
        id: 'node-evidence-1',
        caseId: 'test-case-export-1',
        category: 'EVIDENCE',
        type: 'LOG',
        label: 'auth.log',
        properties: { source: '/var/log/auth.log' },
        metadata: {},
        source: {
          name: '/var/log/auth.log',
          kind: 'SYSTEM'
        },
        hashChecksum: 'sha256-abcdef123456',
        createdAt: '2026-09-20T12:00:00Z',
        updatedAt: '2026-09-20T12:00:00Z'
      }
    ],
    edges: [
      {
        id: 'edge-1',
        caseId: 'test-case-export-1',
        source: 'node-entity-1',
        target: 'node-event-1',
        type: 'PERFORMED',
        status: 'OBSERVED',
        cost: 1.0,
        confidence: null,
        evidenceRefs: ['node-evidence-1'],
        properties: {},
        createdAt: '2026-09-20T12:00:00Z',
        updatedAt: '2026-09-20T12:00:00Z'
      },
      {
        id: 'edge-2',
        caseId: 'test-case-export-1',
        source: 'node-evidence-1',
        target: 'node-event-1',
        type: 'SUPPORTS',
        status: 'OBSERVED',
        cost: 0.5,
        confidence: null,
        evidenceRefs: ['node-evidence-1'],
        properties: {},
        createdAt: '2026-09-20T12:00:00Z',
        updatedAt: '2026-09-20T12:00:00Z'
      }
    ]
  };

  await t.test('should export valid GraphML with escaped XML characters', () => {
    const xml = GraphExporter.toGraphML(sampleGraph);
    assert.ok(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>'));
    assert.ok(xml.includes('<graphml'));
    assert.ok(xml.includes('test-case-export-1'));
    // Check XML escaping of Alice <Special & Chars>
    assert.ok(xml.includes('Alice &lt;Special &amp; Chars&gt;'));
    // Check edge presence
    assert.ok(xml.includes('source="node-entity-1" target="node-event-1"'));
    assert.ok(xml.includes('<data key="d_rel_type">PERFORMED</data>'));
    assert.ok(xml.includes('</graphml>'));
  });

  await t.test('should export valid Graphviz DOT format with styling and escaped quotes', () => {
    const dot = GraphExporter.toDot(sampleGraph);
    assert.ok(dot.startsWith('digraph EvidenceGraph {'));
    assert.ok(dot.includes('"node-entity-1"'));
    assert.ok(dot.includes('shape=hexagon')); // Event node
    assert.ok(dot.includes('shape=folder')); // Evidence node
    assert.ok(dot.includes('"node-entity-1" -> "node-event-1"'));
    assert.ok(dot.includes('label="PERFORMED\\n(c:1)"'));
    assert.ok(dot.endsWith('}'));
  });
});

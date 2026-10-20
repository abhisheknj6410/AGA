import test from 'node:test';
import assert from 'node:assert';
import { GraphExporter } from '../application/graph-exporter.js';
import { GraphPayload } from '../domain/types.js';
import { getDatabase } from '../infrastructure/db.js';
import { runMigrations } from '../infrastructure/migrations.js';
import { CourtPacketService } from '../application/court-packet-service.js';
import { CaseRepository } from '../infrastructure/repositories/case-repository.js';
import { NodeRepository } from '../infrastructure/repositories/node-repository.js';
import { EdgeRepository } from '../infrastructure/repositories/edge-repository.js';

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

  await t.test('CourtPacketService generates cryptographic court-admissible evidence packet with FRE 702 & 901 compliance', () => {
    const db = getDatabase(':memory:');
    runMigrations(db);

    const caseRepo = new CaseRepository(db);
    const nodeRepo = new NodeRepository(db);
    const edgeRepo = new EdgeRepository(db);

    caseRepo.create({
      id: 'case-court-1',
      name: 'State v. Cyber Intrusion',
      description: 'Court verification test case',
      status: 'ACTIVE',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z'
    });

    nodeRepo.create({
      id: 'ev-cctv',
      caseId: 'case-court-1',
      category: 'EVIDENCE',
      type: 'VIDEO',
      label: 'Security Camera Footage Hallway 2',
      evidenceType: 'VIDEO',
      source: { name: 'Facility DVR', kind: 'CCTV' },
      reliability: 0.95,
      hashChecksum: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      properties: {},
      metadata: {},
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z'
    });

    nodeRepo.create({
      id: 'suspect-1',
      caseId: 'case-court-1',
      category: 'ENTITY',
      type: 'PERSON',
      label: 'John Doe',
      properties: {},
      metadata: {},
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z'
    });

    nodeRepo.create({
      id: 'event-breach',
      caseId: 'case-court-1',
      category: 'EVENT',
      type: 'BREACH',
      label: 'Forced Entry Server Room',
      time: { start: '2026-01-01T01:00:00Z', precision: 'SECOND' },
      properties: {},
      metadata: {},
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z'
    });

    edgeRepo.create({
      id: 'edge-1',
      caseId: 'case-court-1',
      source: 'suspect-1',
      target: 'event-breach',
      type: 'PERFORMED',
      status: 'OBSERVED',
      cost: 1.0,
      evidenceRefs: ['ev-cctv'],
      properties: {},
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z'
    });

    const packetService = new CourtPacketService(db);
    const packet = packetService.generateCourtPacket('case-court-1', 'Special Agent Scully');

    assert.equal(packet.case.name, 'State v. Cyber Intrusion');
    assert.equal(packet.requestedBy, 'Special Agent Scully');
    assert.equal(packet.provenanceMetrics.provenanceIntegrityRatio, 1.0);
    assert.equal(packet.evidenceChainOfCustody.length, 1);
    assert.equal(packet.evidenceChainOfCustody[0].sha256Checksum, 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
    assert.ok(packet.masterCryptographicSeal.digest.length === 64);
    assert.equal(packet.masterCryptographicSeal.algorithm, 'SHA-256');
    assert.equal(packet.legalStandardCompliance[0].status, 'COMPLIANT');
  });
});

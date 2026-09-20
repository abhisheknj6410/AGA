import test from 'node:test';
import assert from 'node:assert';
import { GraphDiagnostics } from '../application/graph-diagnostics.js';
import { GraphPayload } from '../domain/types.js';

test('Graph Diagnostics Engine - Structural & Phase 2 Compatibility Analysis', async (t) => {
  const baseGraph: GraphPayload = {
    metadata: {
      caseId: 'case-diagnostics-1',
      nodeCount: 4,
      edgeCount: 3,
      entityCount: 2,
      eventCount: 2,
      evidenceCount: 0,
      generatedAt: new Date().toISOString()
    },
    nodes: [
      {
        id: 'user-1',
        caseId: 'case-diagnostics-1',
        category: 'ENTITY',
        type: 'PERSON',
        label: 'Alice',
        properties: {},
        metadata: {},
        createdAt: '2026-09-20T10:00:00Z',
        updatedAt: '2026-09-20T10:00:00Z'
      },
      {
        id: 'event-1',
        caseId: 'case-diagnostics-1',
        category: 'EVENT',
        type: 'LOGIN',
        label: 'Initial Login',
        time: { start: '2026-09-20T10:00:00Z', precision: 'SECOND' },
        properties: {},
        metadata: {},
        createdAt: '2026-09-20T10:00:00Z',
        updatedAt: '2026-09-20T10:00:00Z'
      },
      {
        id: 'event-2',
        caseId: 'case-diagnostics-1',
        category: 'EVENT',
        type: 'DATA_ACCESS',
        label: 'Database Query',
        time: { start: '2026-09-20T10:15:00Z', precision: 'SECOND' },
        properties: {},
        metadata: {},
        createdAt: '2026-09-20T10:00:00Z',
        updatedAt: '2026-09-20T10:00:00Z'
      },
      {
        id: 'isolated-entity',
        caseId: 'case-diagnostics-1',
        category: 'ENTITY',
        type: 'SERVER',
        label: 'Isolated Staging Host',
        properties: {},
        metadata: {},
        createdAt: '2026-09-20T10:00:00Z',
        updatedAt: '2026-09-20T10:00:00Z'
      }
    ],
    edges: [
      {
        id: 'e1',
        caseId: 'case-diagnostics-1',
        source: 'user-1',
        target: 'event-1',
        type: 'PERFORMED',
        status: 'OBSERVED',
        cost: 1.0,
        confidence: null,
        evidenceRefs: ['dummy-evi'],
        properties: {},
        createdAt: '2026-09-20T10:00:00Z',
        updatedAt: '2026-09-20T10:00:00Z'
      },
      {
        id: 'e2',
        caseId: 'case-diagnostics-1',
        source: 'event-1',
        target: 'event-2',
        type: 'TRIGGERED',
        status: 'OBSERVED',
        cost: 2.5,
        confidence: null,
        evidenceRefs: ['dummy-evi'],
        properties: {},
        createdAt: '2026-09-20T10:00:00Z',
        updatedAt: '2026-09-20T10:00:00Z'
      }
    ]
  };

  await t.test('should identify isolated nodes and compute weak connected components', () => {
    const diag = GraphDiagnostics.analyze(baseGraph);
    assert.strictEqual(diag.overview.nodeCount, 4);
    assert.strictEqual(diag.overview.edgeCount, 2);
    assert.strictEqual(diag.overview.isolatedNodeCount, 1);
    assert.strictEqual(diag.overview.isolatedNodes[0].id, 'isolated-entity');

    // Two components: [user-1, event-1, event-2] and [isolated-entity]
    assert.strictEqual(diag.connectivity.componentCount, 2);
    assert.deepStrictEqual(diag.connectivity.componentSizes, [3, 1]);
    assert.strictEqual(diag.connectivity.isFullyConnected, false);
  });

  await t.test('should verify causal DAG acyclicity and absence of temporal paradoxes', () => {
    const diag = GraphDiagnostics.analyze(baseGraph);
    assert.strictEqual(diag.causalDagAnalysis.isAcyclic, true);
    assert.strictEqual(diag.causalDagAnalysis.detectedCycles.length, 0);
    assert.strictEqual(diag.temporalCausality.violations.length, 0);
  });

  await t.test('should detect causal cycles when an invalid loop is introduced', () => {
    const cyclicGraph: GraphPayload = {
      ...baseGraph,
      edges: [
        ...baseGraph.edges,
        {
          id: 'e-cycle',
          caseId: 'case-diagnostics-1',
          source: 'event-2',
          target: 'event-1',
          type: 'CAUSED',
          status: 'HYPOTHESIZED',
          cost: 1.0,
          confidence: 0.5,
          evidenceRefs: [],
          properties: {},
          createdAt: '2026-09-20T10:00:00Z',
          updatedAt: '2026-09-20T10:00:00Z'
        }
      ]
    };

    const diag = GraphDiagnostics.analyze(cyclicGraph);
    assert.strictEqual(diag.causalDagAnalysis.isAcyclic, false);
    assert.ok(diag.causalDagAnalysis.detectedCycles.length >= 1);
  });

  await t.test('should flag temporal causality violations when cause timestamp > effect timestamp', () => {
    const invertedTimeGraph: GraphPayload = {
      ...baseGraph,
      nodes: baseGraph.nodes.map(n => {
        if (n.id === 'event-1') return { ...n, time: { start: '2026-09-20T12:00:00Z', precision: 'SECOND' as const } };
        if (n.id === 'event-2') return { ...n, time: { start: '2026-09-20T10:00:00Z', precision: 'SECOND' as const } };
        return n;
      })
    };

    const diag = GraphDiagnostics.analyze(invertedTimeGraph);
    assert.strictEqual(diag.temporalCausality.violations.length, 1);
    assert.strictEqual(diag.temporalCausality.violations[0].edgeId, 'e2');
    assert.strictEqual(diag.temporalCausality.violations[0].sourceId, 'event-1');
    assert.strictEqual(diag.temporalCausality.violations[0].targetId, 'event-2');
  });

  await t.test('should confirm non-negative costs and Phase 2 Dijkstra readiness', () => {
    const diag = GraphDiagnostics.analyze(baseGraph);
    assert.strictEqual(diag.costIntegrity.allNonNegative, true);
    assert.strictEqual(diag.costIntegrity.minCost, 1.0);
    assert.strictEqual(diag.costIntegrity.maxCost, 2.5);
    assert.strictEqual(diag.phase2Readiness.dijkstraCompatible, true);
  });
});

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { GraphNode, GraphEdge } from '../domain/types.js';
import {
  DijkstraAlgorithm,
  KShortestPathsAlgorithm,
  ArticulationPointsAlgorithm,
  DominatorsAlgorithm,
  MinCutAlgorithm,
  DisjointPathsAlgorithm,
  TemporalAnalysisAlgorithm,
  PatternMatchingAlgorithm,
  SteinerSubgraphAlgorithm
} from '../domain/algorithms/index.js';

describe('Advanced Graph Investigation Algorithms', () => {
  const sampleNodes: GraphNode[] = [
    { id: 'suspect', caseId: 'c1', category: 'ENTITY', type: 'PERSON', label: 'Attacker', properties: {}, metadata: {}, createdAt: '', updatedAt: '' },
    { id: 'jumpbox', caseId: 'c1', category: 'ENTITY', type: 'SERVER', label: 'Bastion Host', properties: {}, metadata: {}, createdAt: '', updatedAt: '' },
    { id: 'db01', caseId: 'c1', category: 'ENTITY', type: 'SERVER', label: 'Production DB', properties: {}, metadata: {}, createdAt: '', updatedAt: '' },
    { id: 'vpn', caseId: 'c1', category: 'ENTITY', type: 'DEVICE', label: 'VPN Gateway', properties: {}, metadata: {}, createdAt: '', updatedAt: '' },
    { id: 'alt_proxy', caseId: 'c1', category: 'ENTITY', type: 'DEVICE', label: 'Proxy Relay', properties: {}, metadata: {}, createdAt: '', updatedAt: '' }
  ];

  const sampleEdges: GraphEdge[] = [
    { id: 'e1', caseId: 'c1', source: 'suspect', target: 'vpn', type: 'CONNECTED_TO', status: 'OBSERVED', cost: 1.0, confidence: 1, evidenceRefs: [], properties: {}, createdAt: '', updatedAt: '' },
    { id: 'e2', caseId: 'c1', source: 'vpn', target: 'jumpbox', type: 'CONNECTED_TO', status: 'OBSERVED', cost: 2.0, confidence: 1, evidenceRefs: [], properties: {}, createdAt: '', updatedAt: '' },
    { id: 'e3', caseId: 'c1', source: 'jumpbox', target: 'db01', type: 'CONNECTED_TO', status: 'OBSERVED', cost: 1.0, confidence: 1, evidenceRefs: [], properties: {}, createdAt: '', updatedAt: '' },
    { id: 'e4', caseId: 'c1', source: 'suspect', target: 'alt_proxy', type: 'CONNECTED_TO', status: 'OBSERVED', cost: 3.0, confidence: 1, evidenceRefs: [], properties: {}, createdAt: '', updatedAt: '' },
    { id: 'e5', caseId: 'c1', source: 'alt_proxy', target: 'jumpbox', type: 'CONNECTED_TO', status: 'OBSERVED', cost: 2.0, confidence: 1, evidenceRefs: [], properties: {}, createdAt: '', updatedAt: '' }
  ];

  test('Dijkstra: calculates lowest-cost investigative route', () => {
    const result = DijkstraAlgorithm.findShortestPath(sampleNodes, sampleEdges, 'suspect', 'db01');
    assert.ok(result);
    assert.equal(result.totalCost, 4.0); // suspect -> vpn (1) -> jumpbox (2) -> db01 (1) = 4.0
    assert.deepEqual(result.nodeIds, ['suspect', 'vpn', 'jumpbox', 'db01']);
  });

  test('K-Shortest Paths: identifies primary and alternative access corridors', () => {
    const result = KShortestPathsAlgorithm.findKShortestPaths(sampleNodes, sampleEdges, 'suspect', 'db01', 2);
    assert.equal(result.foundCount, 2);
    assert.equal(result.paths[0].totalCost, 4.0); // via vpn
    assert.equal(result.paths[1].totalCost, 6.0); // via alt_proxy (3 + 2 + 1 = 6.0)
  });

  test('Articulation Points: detects critical intermediary whose removal partitions graph', () => {
    const result = ArticulationPointsAlgorithm.analyze(sampleNodes, sampleEdges);
    const pointIds = result.articulationPoints.map(p => p.nodeId);
    // jumpbox is the unavoidable bridge to db01
    assert.ok(pointIds.includes('jumpbox'));
  });

  test('Dominators: verifies that jumpbox dominates db01 relative to suspect', () => {
    const result = DominatorsAlgorithm.analyze(sampleNodes, sampleEdges, 'suspect', 'db01');
    const unavoidable = result.unavoidableNodesForTarget?.map(n => n.nodeId) || [];
    assert.ok(unavoidable.includes('jumpbox'));
  });

  test('Min-Cut: computes minimum containment boundary separating attacker from database', () => {
    const result = MinCutAlgorithm.computeMinCut(sampleNodes, sampleEdges, 'suspect', 'db01');
    assert.ok(result.cutEdges.length >= 1);
    // Severing the link jumpbox -> db01 isolates db01
    assert.ok(result.cutEdges.some(ce => ce.sourceId === 'jumpbox' && ce.targetId === 'db01'));
  });

  test('Disjoint Paths: verifies number of independent access paths', () => {
    const result = DisjointPathsAlgorithm.findDisjointPaths(sampleNodes, sampleEdges, 'suspect', 'jumpbox', 'VERTEX_DISJOINT');
    // suspect -> vpn -> jumpbox AND suspect -> alt_proxy -> jumpbox (2 independent paths)
    assert.equal(result.independentCorroborationCount, 2);
  });

  test('Temporal Analysis: flags timestamp inversion along event sequence', () => {
    const event1: GraphNode = {
      id: 'ev1', caseId: 'c1', category: 'EVENT', type: 'LOGIN', label: 'Login', properties: {}, metadata: {},
      time: { start: '2026-09-10T14:20:00Z', precision: 'SECOND' }, createdAt: '', updatedAt: ''
    };
    const event2: GraphNode = {
      id: 'ev2', caseId: 'c1', category: 'EVENT', type: 'FILE_ACCESS', label: 'Access', properties: {}, metadata: {},
      time: { start: '2026-09-10T14:10:00Z', precision: 'SECOND' }, // Inverted time!
      createdAt: '', updatedAt: ''
    };

    const validation = TemporalAnalysisAlgorithm.validatePathChronology([event1, event2]);
    assert.equal(validation.isValid, false);
    assert.equal(validation.violations.length, 1);
  });

  test('Steiner Subgraph: extracts minimal connecting evidence chain', () => {
    const result = SteinerSubgraphAlgorithm.computeMinimalConnectingSubgraph(
      sampleNodes,
      sampleEdges,
      ['vpn', 'alt_proxy', 'db01']
    );
    assert.ok(result.nodes.length >= 3);
    assert.ok(result.subgraphNodeIds.includes('jumpbox')); // Must include jumpbox to connect to db01
  });
});

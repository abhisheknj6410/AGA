import test from 'node:test';
import assert from 'node:assert/strict';
import { GraphPayload, GraphNode, GraphEdge } from '../domain/types.js';
import { PossibilityConstraintEngine } from '../application/possibility-constraint-engine.js';
import { PossibilityDifferentiatingEngine } from '../application/possibility-differentiating-engine.js';
import { KShortestPathsAlgorithm } from '../domain/algorithms/k-shortest-paths.js';
import { DominatorsAlgorithm } from '../domain/algorithms/dominators.js';
import { DisjointPathsAlgorithm } from '../domain/algorithms/disjoint-paths.js';
import { GraphAnalysisEngine } from '../application/graph-analysis-engine.js';
import { Possibility } from '../domain/possibility-types.js';

test('Causal Graph Algorithm Pipeline: Path Filtering & Elimination', () => {
  // Setup: 1 origin actor, 1 target database, and 2 intermediate event routes:
  // Route 1 (Chronological): Event A (10:00) -> Event B (10:15) [VALID]
  // Route 2 (Inverted): Event C (10:30) -> Event D (10:10) [INVALID TEMPORAL ORDER]
  const nodes: GraphNode[] = [
    { id: 'suspect', caseId: 'test', label: 'Suspect User', category: 'ENTITY', type: 'PERSON', createdAt: '', updatedAt: '' },
    { id: 'target', caseId: 'test', label: 'Target Asset', category: 'ENTITY', type: 'SERVER', createdAt: '', updatedAt: '' },
    
    // Route 1 events (Chronologically valid)
    { id: 'evt-1', caseId: 'test', label: 'Login Initiated', category: 'EVENT', type: 'LOGIN', time: { start: '2026-03-01T10:00:00.000Z', precision: 'SECOND' }, createdAt: '', updatedAt: '' },
    { id: 'evt-2', caseId: 'test', label: 'Session Authenticated', category: 'EVENT', type: 'DATA_ACCESS', time: { start: '2026-03-01T10:15:00.000Z', precision: 'SECOND' }, createdAt: '', updatedAt: '' },

    // Route 2 events (Temporally inverted: 10:30 before 10:10)
    { id: 'evt-3', caseId: 'test', label: 'Late Event', category: 'EVENT', type: 'LOGIN', time: { start: '2026-03-01T10:30:00.000Z', precision: 'SECOND' }, createdAt: '', updatedAt: '' },
    { id: 'evt-4', caseId: 'test', label: 'Early Event', category: 'EVENT', type: 'DATA_ACCESS', time: { start: '2026-03-01T10:10:00.000Z', precision: 'SECOND' }, createdAt: '', updatedAt: '' }
  ];

  const edges: GraphEdge[] = [
    // Route 1 edges with evidence
    { id: 'e1', caseId: 'test', source: 'suspect', target: 'evt-1', type: 'TRIGGERED', status: 'OBSERVED', cost: 1, confidence: 1, evidenceRefs: ['ev-01'], properties: {}, createdAt: '', updatedAt: '' },
    { id: 'e2', caseId: 'test', source: 'evt-1', target: 'evt-2', type: 'PRECEDED', status: 'OBSERVED', cost: 1, confidence: 1, evidenceRefs: ['ev-02'], properties: {}, createdAt: '', updatedAt: '' },
    { id: 'e3', caseId: 'test', source: 'evt-2', target: 'target', type: 'AFFECTED', status: 'OBSERVED', cost: 1, confidence: 1, evidenceRefs: ['ev-03'], properties: {}, createdAt: '', updatedAt: '' },

    // Route 2 edges (Inverted chronology)
    { id: 'e4', caseId: 'test', source: 'suspect', target: 'evt-3', type: 'TRIGGERED', status: 'OBSERVED', cost: 1, confidence: 1, evidenceRefs: ['ev-04'], properties: {}, createdAt: '', updatedAt: '' },
    { id: 'e5', caseId: 'test', source: 'evt-3', target: 'evt-4', type: 'PRECEDED', status: 'OBSERVED', cost: 1, confidence: 1, evidenceRefs: ['ev-05'], properties: {}, createdAt: '', updatedAt: '' },
    { id: 'e6', caseId: 'test', source: 'evt-4', target: 'target', type: 'AFFECTED', status: 'OBSERVED', cost: 1, confidence: 1, evidenceRefs: ['ev-06'], properties: {}, createdAt: '', updatedAt: '' }
  ];

  // 1. K-Shortest Paths discovers both candidate routes
  const kPaths = KShortestPathsAlgorithm.findKShortestPaths(nodes, edges, 'suspect', 'target', 5);
  assert.equal(kPaths.paths.length, 2, 'K-shortest paths should discover 2 topological candidates');

  // 2. Filter paths causally through PossibilityConstraintEngine
  const survivingPaths = kPaths.paths.filter(p => {
    const pEdges = edges.filter(e => p.edgeIds.includes(e.id));
    const check = PossibilityConstraintEngine.isPathValid(p.nodes, pEdges, 1);
    return check.valid;
  });

  // Exactly 1 path must survive, and Route 2 must be eliminated due to temporal inversion!
  assert.equal(survivingPaths.length, 1, 'Temporal constraint engine must eliminate the inverted path');
  assert.ok(survivingPaths[0].nodeIds.includes('evt-1'), 'Valid chronological route 1 must survive');
  assert.ok(!survivingPaths[0].nodeIds.includes('evt-3'), 'Inverted route 2 must be eliminated');
});

test('Causal Graph Algorithm Pipeline: Entity Resolution Identity Rewiring', () => {
  // Setup: Suspect A reaches Terminal Node only IF User A == User B
  const baseGraph: GraphPayload = {
    nodes: [
      { id: 'user-a', caseId: 'test', label: 'Alias One', category: 'ENTITY', type: 'PERSON', createdAt: '', updatedAt: '' },
      { id: 'user-b', caseId: 'test', label: 'Alias Two', category: 'ENTITY', type: 'PERSON', createdAt: '', updatedAt: '' },
      { id: 'vault', caseId: 'test', label: 'Target Vault', category: 'ENTITY', type: 'SERVER', createdAt: '', updatedAt: '' }
    ],
    edges: [
      { id: 'e1', caseId: 'test', source: 'user-b', target: 'vault', type: 'ACCESSED', status: 'OBSERVED', cost: 1, confidence: 1, evidenceRefs: ['ev-1'], properties: {}, createdAt: '', updatedAt: '' }
    ],
    metadata: { caseId: 'test', nodeCount: 3, edgeCount: 1, entityCount: 3, eventCount: 0, evidenceCount: 0 }
  };

  // Branch A: Entities Merged (Alias One == Alias Two)
  const mergedGraph = GraphAnalysisEngine.applyDelta(baseGraph, {
    addedNodes: [],
    removedNodeIds: [],
    modifiedNodes: [],
    addedEdges: [],
    removedEdgeIds: [],
    modifiedEdges: [],
    entityResolutionMerges: [
      { survivingNodeId: 'user-a', mergedNodeId: 'user-b', rewiredEdgeCount: 1 }
    ]
  });

  // Verify that in Merged Graph, user-a can reach vault directly
  const pathInMerged = KShortestPathsAlgorithm.findKShortestPaths(mergedGraph.nodes, mergedGraph.edges, 'user-a', 'vault', 1);
  assert.equal(pathInMerged.paths.length, 1, 'In merged branch, path from user-a to vault must exist');

  // Branch B: Entities Distinct (Alias One != Alias Two)
  const distinctGraph = GraphAnalysisEngine.applyDelta(baseGraph, {
    addedNodes: [],
    removedNodeIds: [],
    modifiedNodes: [],
    addedEdges: [],
    removedEdgeIds: [],
    modifiedEdges: []
  });

  const pathInDistinct = KShortestPathsAlgorithm.findKShortestPaths(distinctGraph.nodes, distinctGraph.edges, 'user-a', 'vault', 1);
  assert.equal(pathInDistinct.paths.length, 0, 'In distinct branch, user-a cannot reach vault');
});

test('Causal Graph Algorithm Pipeline: Dominator & Bottleneck Identification', () => {
  // Suspect -> Jumpbox -> Server1 & Server2 -> Vault
  // Jumpbox is the unavoidable dominator for Vault!
  const nodes: GraphNode[] = [
    { id: 'suspect', caseId: 'test', label: 'Attacker', category: 'ENTITY', type: 'PERSON', createdAt: '', updatedAt: '' },
    { id: 'jumpbox', caseId: 'test', label: 'Bastion Host', category: 'ENTITY', type: 'SERVER', createdAt: '', updatedAt: '' },
    { id: 'srv-1', caseId: 'test', label: 'App Server 1', category: 'ENTITY', type: 'SERVER', createdAt: '', updatedAt: '' },
    { id: 'srv-2', caseId: 'test', label: 'App Server 2', category: 'ENTITY', type: 'SERVER', createdAt: '', updatedAt: '' },
    { id: 'vault', caseId: 'test', label: 'Data Vault', category: 'ENTITY', type: 'SERVER', createdAt: '', updatedAt: '' }
  ];

  const edges: GraphEdge[] = [
    { id: 'e1', caseId: 'test', source: 'suspect', target: 'jumpbox', type: 'CONNECTED_TO', status: 'OBSERVED', cost: 1, confidence: 1, evidenceRefs: ['ev1'], properties: {}, createdAt: '', updatedAt: '' },
    { id: 'e2', caseId: 'test', source: 'jumpbox', target: 'srv-1', type: 'CONNECTED_TO', status: 'OBSERVED', cost: 1, confidence: 1, evidenceRefs: ['ev1'], properties: {}, createdAt: '', updatedAt: '' },
    { id: 'e3', caseId: 'test', source: 'jumpbox', target: 'srv-2', type: 'CONNECTED_TO', status: 'OBSERVED', cost: 1, confidence: 1, evidenceRefs: ['ev1'], properties: {}, createdAt: '', updatedAt: '' },
    { id: 'e4', caseId: 'test', source: 'srv-1', target: 'vault', type: 'CONNECTED_TO', status: 'OBSERVED', cost: 1, confidence: 1, evidenceRefs: ['ev1'], properties: {}, createdAt: '', updatedAt: '' },
    { id: 'e5', caseId: 'test', source: 'srv-2', target: 'vault', type: 'CONNECTED_TO', status: 'OBSERVED', cost: 1, confidence: 1, evidenceRefs: ['ev1'], properties: {}, createdAt: '', updatedAt: '' }
  ];

  const domResult = DominatorsAlgorithm.analyze(nodes, edges, 'suspect', 'vault');
  assert.ok(domResult.unavoidableNodesForTarget, 'Dominators must return unavoidable choke points');
  
  const dominatorIds = domResult.unavoidableNodesForTarget.map(d => d.nodeId);
  assert.ok(dominatorIds.includes('jumpbox'), 'Bastion Host (jumpbox) must be mathematically identified as dominator choke point');
});

test('Causal Graph Algorithm Pipeline: Common Invariants & Resolving Evidence', () => {
  const baseGraph: GraphPayload = {
    nodes: [
      { id: 'origin', caseId: 'test', label: 'Origin Entity', category: 'ENTITY', type: 'PERSON', createdAt: '', updatedAt: '' },
      { id: 'shared-node', caseId: 'test', label: 'Shared Intermediary', category: 'ENTITY', type: 'LOCATION', createdAt: '', updatedAt: '' },
      { id: 'branch-a-node', caseId: 'test', label: 'Path A Gateway', category: 'ENTITY', type: 'DEVICE', createdAt: '', updatedAt: '' },
      { id: 'branch-b-node', caseId: 'test', label: 'Path B Gateway', category: 'ENTITY', type: 'DEVICE', createdAt: '', updatedAt: '' },
      { id: 'dest', caseId: 'test', label: 'Destination', category: 'ENTITY', type: 'ORGANIZATION', createdAt: '', updatedAt: '' }
    ],
    edges: [
      { id: 'e-common', caseId: 'test', source: 'origin', target: 'shared-node', type: 'LOCATED_AT', status: 'OBSERVED', cost: 1, confidence: 1, evidenceRefs: ['ev-common'], properties: {}, createdAt: '', updatedAt: '' },
      { id: 'e-a1', caseId: 'test', source: 'shared-node', target: 'branch-a-node', type: 'USES', status: 'OBSERVED', cost: 1, confidence: 1, evidenceRefs: ['ev-a'], properties: {}, createdAt: '', updatedAt: '' },
      { id: 'e-a2', caseId: 'test', source: 'branch-a-node', target: 'dest', type: 'COMMUNICATED_WITH', status: 'OBSERVED', cost: 1, confidence: 1, evidenceRefs: ['ev-a'], properties: {}, createdAt: '', updatedAt: '' },
      { id: 'e-b1', caseId: 'test', source: 'shared-node', target: 'branch-b-node', type: 'USES', status: 'OBSERVED', cost: 1, confidence: 1, evidenceRefs: ['ev-b'], properties: {}, createdAt: '', updatedAt: '' },
      { id: 'e-b2', caseId: 'test', source: 'branch-b-node', target: 'dest', type: 'COMMUNICATED_WITH', status: 'OBSERVED', cost: 1, confidence: 1, evidenceRefs: ['ev-b'], properties: {}, createdAt: '', updatedAt: '' }
    ],
    metadata: { caseId: 'test', nodeCount: 5, edgeCount: 5, entityCount: 5, eventCount: 0, evidenceCount: 0 }
  };

  const possibilities: Possibility[] = [
    {
      id: 'p-1',
      caseId: 'test',
      name: 'Corridor A',
      description: 'Route via Branch A Gateway',
      baseGraphVersion: 1,
      status: 'VALID',
      generationMethod: 'ALTERNATIVE_PATHS',
      assumptions: [],
      graphChanges: { addedNodes: [], removedNodeIds: ['branch-b-node'], modifiedNodes: [], addedEdges: [], removedEdgeIds: ['e-b1', 'e-b2'], modifiedEdges: [] },
      constraints: {},
      supportingEvidence: ['ev-common', 'ev-a'],
      conflictingEvidence: [],
      unresolvedQuestions: [],
      canonicalSignature: 'sig-a',
      createdAt: '',
      updatedAt: ''
    },
    {
      id: 'p-2',
      caseId: 'test',
      name: 'Corridor B',
      description: 'Route via Branch B Gateway',
      baseGraphVersion: 1,
      status: 'VALID',
      generationMethod: 'ALTERNATIVE_PATHS',
      assumptions: [],
      graphChanges: { addedNodes: [], removedNodeIds: ['branch-a-node'], modifiedNodes: [], addedEdges: [], removedEdgeIds: ['e-a1', 'e-a2'], modifiedEdges: [] },
      constraints: {},
      supportingEvidence: ['ev-common', 'ev-b'],
      conflictingEvidence: [],
      unresolvedQuestions: [],
      canonicalSignature: 'sig-b',
      createdAt: '',
      updatedAt: ''
    }
  ];

  // 1. Invariants Extraction
  const invariants = PossibilityDifferentiatingEngine.extractCommonInvariants(baseGraph, possibilities);
  const commonNodeLabels = invariants.commonNodes.map(n => n.label);
  
  assert.ok(commonNodeLabels.includes('Shared Intermediary'), 'Shared Intermediary must be extracted as universal invariant');
  assert.ok(commonNodeLabels.includes('Origin Entity'), 'Origin Entity must be extracted as universal invariant');
  assert.ok(invariants.commonEvidenceRefs.includes('ev-common'), 'Common evidence reference must be present across possibilities');

  // 2. Distinguishing and Resolving Evidence
  const diffComparison = {
    caseId: 'test',
    comparedAt: '',
    possibilities: [],
    structuralDiff: {
      commonNodes: ['origin', 'shared-node', 'dest'],
      distinguishingNodes: { 'p-1': ['branch-a-node'], 'p-2': ['branch-b-node'] },
      commonEdges: [{ source: 'origin', target: 'shared-node', type: 'LOCATED_AT' }],
      distinguishingEdges: { 'p-1': [{ source: 'shared-node', target: 'branch-a-node', type: 'USES' }], 'p-2': [{ source: 'shared-node', target: 'branch-b-node', type: 'USES' }] },
      commonEvidence: ['ev-common'],
      distinguishingEvidence: { 'p-1': ['ev-a'], 'p-2': ['ev-b'] }
    }
  };

  const recommendations = PossibilityDifferentiatingEngine.identifyResolvingEvidence(diffComparison, baseGraph);
  assert.ok(recommendations.length > 0, 'Must produce deterministic resolving recommendations');
  assert.ok(recommendations[0].recommendedAction.includes('records directly involving') || recommendations[0].recommendedAction.includes('evidence linking'));
});

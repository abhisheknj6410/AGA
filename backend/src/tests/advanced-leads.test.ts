import test from 'node:test';
import assert from 'node:assert/strict';
import { AdvancedLeadGenerator } from '../domain/algorithms/centrality-leads.js';
import { GraphNode, GraphEdge } from '../domain/types.js';

test('AdvancedLeadGenerator: PageRank detects hidden influencer', () => {
  const nodes: GraphNode[] = [
    { id: 'hub', label: 'Covert Coordinator', category: 'ENTITY', type: 'PERSON' },
    { id: 'p1', label: 'Pawn 1', category: 'ENTITY', type: 'PERSON' },
    { id: 'p2', label: 'Pawn 2', category: 'ENTITY', type: 'PERSON' },
    { id: 'p3', label: 'Pawn 3', category: 'ENTITY', type: 'PERSON' },
    { id: 'p4', label: 'Pawn 4', category: 'ENTITY', type: 'PERSON' }
  ];

  // Everyone is talking to the hub
  const edges: GraphEdge[] = [
    { id: 'e1', source: 'p1', target: 'hub', type: 'CONTACTED', status: 'OBSERVED', cost: 1, confidence: 1, evidenceRefs: [] },
    { id: 'e2', source: 'p2', target: 'hub', type: 'CONTACTED', status: 'OBSERVED', cost: 1, confidence: 1, evidenceRefs: [] },
    { id: 'e3', source: 'p3', target: 'hub', type: 'CONTACTED', status: 'OBSERVED', cost: 1, confidence: 1, evidenceRefs: [] },
    { id: 'e4', source: 'p4', target: 'hub', type: 'CONTACTED', status: 'OBSERVED', cost: 1, confidence: 1, evidenceRefs: [] }
  ];

  const leads = AdvancedLeadGenerator.generateLeads(nodes, edges);
  const prLeads = leads.filter(l => l.type === 'HIDDEN_INFLUENCER');

  assert.ok(prLeads.length > 0, 'Should detect at least one hidden influencer');
  assert.ok(prLeads[0].targetNodeIds.includes('hub'), 'The hub should be the detected influencer');
  assert.ok(prLeads[0].description.includes('covert coordinator'), 'Description should match the lead rationale');
});

test('AdvancedLeadGenerator: Community Detection detects disjoint cell', () => {
  const nodes: GraphNode[] = [
    // Main case graph
    { id: 'main1', label: 'Main Suspect', category: 'ENTITY', type: 'PERSON' },
    { id: 'main2', label: 'Main Server', category: 'ENTITY', type: 'SERVER' },
    // Isolated graph
    { id: 'iso1', label: 'Burner Phone A', category: 'ENTITY', type: 'DEVICE' },
    { id: 'iso2', label: 'Burner Phone B', category: 'ENTITY', type: 'DEVICE' },
    { id: 'iso3', label: 'Burner Phone C', category: 'ENTITY', type: 'DEVICE' }
  ];

  const edges: GraphEdge[] = [
    { id: 'e_main', source: 'main1', target: 'main2', type: 'ACCESSED', status: 'OBSERVED', cost: 1, confidence: 1, evidenceRefs: [] },
    { id: 'e_iso1', source: 'iso1', target: 'iso2', type: 'CONTACTED', status: 'OBSERVED', cost: 1, confidence: 1, evidenceRefs: [] },
    { id: 'e_iso2', source: 'iso2', target: 'iso3', type: 'CONTACTED', status: 'OBSERVED', cost: 1, confidence: 1, evidenceRefs: [] }
  ];

  const leads = AdvancedLeadGenerator.generateLeads(nodes, edges);
  const commLeads = leads.filter(l => l.type === 'DISJOINT_CELL');

  assert.ok(commLeads.length > 0, 'Should detect disjoint cell');
  assert.ok(commLeads.some(l => l.targetNodeIds.includes('iso1')), 'Should contain isolated nodes');
});

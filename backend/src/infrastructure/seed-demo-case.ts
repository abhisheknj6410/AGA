import { v4 as uuidv4 } from 'uuid';
import { DatabaseSync } from 'node:sqlite';
import { CaseService } from '../application/case-service.js';
import { GraphService } from '../application/graph-service.js';
import { ResolutionRepository } from './repositories/resolution-repository.js';
import { PossibilityRepository } from './repositories/possibility-repository.js';
import { AlgorithmRepository } from './repositories/algorithm-repository.js';
import { GraphVersionRepository } from './repositories/graph-version-repository.js';
import { GraphAnalysisEngine } from '../application/graph-analysis-engine.js';
import { PossibilityEngine } from '../application/possibility-engine.js';

export function seedDemonstrationCase(db: DatabaseSync, customEngine?: PossibilityEngine): { caseId: string } {
  const caseService = new CaseService(db);
  const graphService = new GraphService(db);
  const resolutionRepo = new ResolutionRepository(db);
  const possibilityRepo = new PossibilityRepository(db);
  const algorithmRepo = new AlgorithmRepository(db);
  const analysisEngine = new GraphAnalysisEngine(algorithmRepo);
  const possibilityEngine = customEngine || new PossibilityEngine(possibilityRepo, analysisEngine);

  const existingCases = caseService.listCases();
  const demoCaseName = 'Metropolitan Logistics & Vault Incident';
  const found = existingCases.find(c => c.name === demoCaseName);
  if (found) {
    return { caseId: found.id };
  }

  // 1. Create the Demonstration Case
  const c = caseService.createCase(
    demoCaseName,
    'Multi-modal investigation into high-security vault breach involving transit corridors, satellite intercepts, contradictory alibi evidence, and alias ambiguity.',
    'senior-investigator'
  );
  const caseId = c.id;

  // 2. Add Evidence Items (Physical & Digital Provenance)
  graphService.addNode(caseId, {
    id: 'ev-cctv-safehouse',
    category: 'EVIDENCE',
    type: 'CCTV',
    label: 'North District Safehouse Gate Camera',
    source: { name: 'cam-safehouse-gate-01.mp4', kind: 'DEVICE', reference: 'CCTV-SAFE-01' },
    reliability: 0.95,
    collectionTime: '2026-03-01T14:05:00Z',
    hashChecksum: 'a1b2c3d4e5f601',
    properties: { resolution: '1080p', angle: 'Perimeter East' }
  });

  graphService.addNode(caseId, {
    id: 'ev-toll-camera',
    category: 'EVIDENCE',
    type: 'CCTV',
    label: 'Harbor Turnpike ALPR Camera',
    source: { name: 'toll-alpr-gate-04.jpg', kind: 'DEVICE', reference: 'ALPR-TURNPIKE-04' },
    reliability: 0.98,
    collectionTime: '2026-03-01T14:22:00Z',
    hashChecksum: 'a1b2c3d4e5f602',
    properties: { plateConfidence: 0.99, vehicleModel: 'Black SUV' }
  });

  graphService.addNode(caseId, {
    id: 'ev-warehouse-access',
    category: 'EVIDENCE',
    type: 'LOG',
    label: 'Warehouse 12 Electronic Keycard Log',
    source: { name: 'wh-access.log', kind: 'SYSTEM', reference: 'RFID-DOOR-02' },
    reliability: 0.92,
    collectionTime: '2026-03-01T14:50:00Z',
    hashChecksum: 'a1b2c3d4e5f603',
    properties: { cardReader: 'South Bay Door' }
  });

  graphService.addNode(caseId, {
    id: 'ev-vault-badge',
    category: 'EVIDENCE',
    type: 'DATABASE_RECORD',
    label: 'Downtown Vault Biometric Access Record',
    source: { name: 'vault-security-db', kind: 'SYSTEM', reference: 'BIO-VAULT-MAIN' },
    reliability: 0.99,
    collectionTime: '2026-03-01T15:35:00Z',
    hashChecksum: 'a1b2c3d4e5f604',
    properties: { authorizationLevel: 'TIER-1', scanStatus: 'GRANTED' }
  });

  graphService.addNode(caseId, {
    id: 'ev-sat-log',
    category: 'EVIDENCE',
    type: 'NETWORK_CAPTURE',
    label: 'Orbital Sat-Relay RF Burst Log',
    source: { name: 'sat-burst-telemetry.bin', kind: 'NETWORK', reference: 'SAT-TEL-99' },
    reliability: 0.94,
    collectionTime: '2026-03-01T14:18:00Z',
    hashChecksum: 'a1b2c3d4e5f605',
    properties: { frequency: '14.2 GHz', burstDurationMs: 420 }
  });

  graphService.addNode(caseId, {
    id: 'ev-gateway-log',
    category: 'EVIDENCE',
    type: 'LOG',
    label: 'Vault Perimeter Gateway Packet Log',
    source: { name: 'perimeter-firewall.log', kind: 'SYSTEM', reference: 'FW-LOG-CORE' },
    reliability: 0.97,
    collectionTime: '2026-03-01T15:15:00Z',
    hashChecksum: 'a1b2c3d4e5f606',
    properties: { protocol: 'ENCRYPTED_TUNNEL', port: 8443 }
  });

  graphService.addNode(caseId, {
    id: 'ev-call-record',
    category: 'EVIDENCE',
    type: 'PHONE_RECORD',
    label: 'Cellular Voice Intercept Metadata',
    source: { name: 'telco-cdr-export.csv', kind: 'SYSTEM', reference: 'CDR-5501-22' },
    reliability: 0.88,
    collectionTime: '2026-03-01T15:50:00Z',
    hashChecksum: 'a1b2c3d4e5f607',
    properties: { durationSec: 45, towerCellId: 'TOWER-NORTH-44' }
  });

  graphService.addNode(caseId, {
    id: 'ev-alibi-witness',
    category: 'EVIDENCE',
    type: 'DOCUMENT',
    label: 'Sworn Witness Alibi Statement (North Pier Diner)',
    source: { name: 'statement-diner-owner.pdf', kind: 'DOCUMENT', reference: 'AFFIDAVIT-77' },
    reliability: 0.75,
    collectionTime: '2026-03-01T16:00:00Z',
    hashChecksum: 'a1b2c3d4e5f608',
    properties: { witnessName: 'Gordon Vance', claimedTime: '2026-03-01T14:45:00.000Z' }
  });

  // 3. Add Entity Nodes (People, Locations, Assets)
  graphService.addNode(caseId, {
    id: 'person-mercer',
    category: 'ENTITY',
    type: 'PERSON',
    label: 'Alex Mercer',
    properties: { role: 'Primary Suspect', clearance: 'Revoked' }
  });

  graphService.addNode(caseId, {
    id: 'person-vale',
    category: 'ENTITY',
    type: 'PERSON',
    label: 'Jordan Vale',
    properties: { role: 'Logistics Coordinator', clearance: 'Active' }
  });

  graphService.addNode(caseId, {
    id: 'person-jvale',
    category: 'ENTITY',
    type: 'PERSON',
    label: 'J. Vale (Terminal Badge)',
    properties: { role: 'Unverified Badge Holder', badgeId: 'BADGE-JV-9901' }
  });

  graphService.addNode(caseId, {
    id: 'location-safehouse',
    category: 'ENTITY',
    type: 'LOCATION',
    label: 'North District Safehouse',
    properties: { address: '44 Industrial Way', sector: 'North' }
  });

  graphService.addNode(caseId, {
    id: 'location-warehouse',
    category: 'ENTITY',
    type: 'LOCATION',
    label: 'Harbor Warehouse 12',
    properties: { address: 'Pier 12 Harbor Basin', sector: 'Harbor' }
  });

  graphService.addNode(caseId, {
    id: 'location-vault',
    category: 'ENTITY',
    type: 'LOCATION',
    label: 'Downtown Security Vault',
    properties: { address: '100 Financial Square', securityLevel: 'Maximum' }
  });

  // 4. Add Event Nodes with Precise ISO Timestamps
  graphService.addNode(caseId, {
    id: 'evt-dep-safehouse',
    category: 'EVENT',
    type: 'LOCATION_CHANGE',
    label: 'Safehouse Departure',
    time: { start: '2026-03-01T14:00:00.000Z', precision: 'SECOND' },
    properties: { mode: 'Vehicular' }
  });

  graphService.addNode(caseId, {
    id: 'evt-turnpike',
    category: 'EVENT',
    type: 'LOCATION_CHANGE',
    label: 'Harbor Turnpike Transit',
    time: { start: '2026-03-01T14:20:00.000Z', precision: 'SECOND' },
    properties: { lane: 3, speedMph: 68 }
  });

  graphService.addNode(caseId, {
    id: 'evt-warehouse',
    category: 'EVENT',
    type: 'LOCATION_CHANGE',
    label: 'Warehouse 12 Rendezvous',
    time: { start: '2026-03-01T14:45:00.000Z', precision: 'SECOND' },
    properties: { door: 'South Bay' }
  });

  graphService.addNode(caseId, {
    id: 'evt-vault-entry',
    category: 'EVENT',
    type: 'DATA_ACCESS',
    label: 'Vault Perimeter Access',
    time: { start: '2026-03-01T15:30:00.000Z', precision: 'SECOND' },
    properties: { accessGranted: true }
  });

  // Route 2 Events (Satellite Relay)
  graphService.addNode(caseId, {
    id: 'evt-sat-uplink',
    category: 'EVENT',
    type: 'COMMUNICATION',
    label: 'Encrypted Satellite Uplink',
    time: { start: '2026-03-01T14:15:00.000Z', precision: 'SECOND' },
    properties: { payloadEncrypted: true }
  });

  graphService.addNode(caseId, {
    id: 'evt-remote-override',
    category: 'EVENT',
    type: 'DATA_ACCESS',
    label: 'Vault Remote Override Execution',
    time: { start: '2026-03-01T15:10:00.000Z', precision: 'SECOND' },
    properties: { commandCode: 'SYS_AUTH_BYPASS' }
  });

  // Route 3 Events (Temporally Inverted Route: 15:45 before 14:30)
  graphService.addNode(caseId, {
    id: 'evt-call-intercept',
    category: 'EVENT',
    type: 'COMMUNICATION',
    label: 'Intercepted Voice Call',
    time: { start: '2026-03-01T15:45:00.000Z', precision: 'SECOND' },
    properties: { caller: 'Alex Mercer' }
  });

  graphService.addNode(caseId, {
    id: 'evt-prep-check',
    category: 'EVENT',
    type: 'DATA_ACCESS',
    label: 'Staging Keycard Verification',
    time: { start: '2026-03-01T14:30:00.000Z', precision: 'SECOND' },
    properties: { tokenVerified: true }
  });

  // Route 4 Event (Ghost Corridor with Zero Evidence)
  graphService.addNode(caseId, {
    id: 'evt-informant-rumor',
    category: 'EVENT',
    type: 'LOCATION_CHANGE',
    label: 'Alleged Underground Handoff',
    time: { start: '2026-03-01T14:25:00.000Z', precision: 'SECOND' },
    properties: { verified: false }
  });

  // 5. Add Edges Connecting Candidates
  // Route 1 Edges (Valid, Chronological: 14:00 -> 14:20 -> 14:45 -> 15:30)
  graphService.addEdge(caseId, {
    id: 'edge-r1-1',
    source: 'person-mercer',
    target: 'evt-dep-safehouse',
    type: 'PERFORMED',
    status: 'OBSERVED',
    cost: 1.0,
    confidence: 0.95,
    evidenceRefs: ['ev-cctv-safehouse'],
    properties: {}
  });

  graphService.addEdge(caseId, {
    id: 'edge-r1-2',
    source: 'evt-dep-safehouse',
    target: 'evt-turnpike',
    type: 'PRECEDED',
    status: 'OBSERVED',
    cost: 1.0,
    confidence: 0.98,
    evidenceRefs: ['ev-toll-camera'],
    properties: {}
  });

  graphService.addEdge(caseId, {
    id: 'edge-r1-3',
    source: 'evt-turnpike',
    target: 'evt-warehouse',
    type: 'PRECEDED',
    status: 'OBSERVED',
    cost: 1.0,
    confidence: 0.92,
    evidenceRefs: ['ev-warehouse-access'],
    properties: {}
  });

  graphService.addEdge(caseId, {
    id: 'edge-r1-4',
    source: 'evt-warehouse',
    target: 'evt-vault-entry',
    type: 'PRECEDED',
    status: 'OBSERVED',
    cost: 1.0,
    confidence: 0.99,
    evidenceRefs: ['ev-vault-badge'],
    properties: {}
  });

  graphService.addEdge(caseId, {
    id: 'edge-r1-5',
    source: 'evt-vault-entry',
    target: 'location-vault',
    type: 'AFFECTED',
    status: 'OBSERVED',
    cost: 1.0,
    confidence: 0.99,
    evidenceRefs: ['ev-vault-badge'],
    properties: {}
  });

  // Route 2 Edges (Valid, Chronological: 14:15 -> 15:10, Disjoint Channel)
  graphService.addEdge(caseId, {
    id: 'edge-r2-1',
    source: 'person-mercer',
    target: 'evt-sat-uplink',
    type: 'PERFORMED',
    status: 'OBSERVED',
    cost: 2.0,
    confidence: 0.94,
    evidenceRefs: ['ev-sat-log'],
    properties: {}
  });

  graphService.addEdge(caseId, {
    id: 'edge-r2-2',
    source: 'evt-sat-uplink',
    target: 'evt-remote-override',
    type: 'PRECEDED',
    status: 'OBSERVED',
    cost: 2.0,
    confidence: 0.97,
    evidenceRefs: ['ev-gateway-log'],
    properties: {}
  });

  graphService.addEdge(caseId, {
    id: 'edge-r2-3',
    source: 'evt-remote-override',
    target: 'evt-vault-entry',
    type: 'PRECEDED',
    status: 'OBSERVED',
    cost: 2.0,
    confidence: 0.97,
    evidenceRefs: ['ev-gateway-log'],
    properties: {}
  });

  // Route 3 Edges (Inverted Chronology: 15:45 precedes 14:30)
  graphService.addEdge(caseId, {
    id: 'edge-r3-1',
    source: 'person-mercer',
    target: 'evt-call-intercept',
    type: 'PERFORMED',
    status: 'HYPOTHESIZED',
    cost: 1.5,
    confidence: 0.88,
    evidenceRefs: ['ev-call-record'],
    properties: {}
  });

  graphService.addEdge(caseId, {
    id: 'edge-r3-2',
    source: 'evt-call-intercept',
    target: 'evt-prep-check',
    type: 'PRECEDED',
    status: 'HYPOTHESIZED',
    cost: 1.5,
    confidence: 0.88,
    evidenceRefs: ['ev-call-record'],
    properties: {}
  });

  graphService.addEdge(caseId, {
    id: 'edge-r3-3',
    source: 'evt-prep-check',
    target: 'evt-vault-entry',
    type: 'PRECEDED',
    status: 'HYPOTHESIZED',
    cost: 1.5,
    confidence: 0.99,
    evidenceRefs: ['ev-vault-badge'],
    properties: {}
  });

  // Route 4 Edges (Ghost Corridor with zero evidence references)
  graphService.addEdge(caseId, {
    id: 'edge-r4-1',
    source: 'person-mercer',
    target: 'evt-informant-rumor',
    type: 'PARTICIPATED_IN',
    status: 'HYPOTHESIZED',
    cost: 3.0,
    confidence: 0.3,
    evidenceRefs: [],
    properties: {}
  });

  graphService.addEdge(caseId, {
    id: 'edge-r4-2',
    source: 'evt-informant-rumor',
    target: 'evt-vault-entry',
    type: 'PRECEDED',
    status: 'HYPOTHESIZED',
    cost: 3.0,
    confidence: 0.3,
    evidenceRefs: [],
    properties: {}
  });

  // 6. Contradiction Edge: Witness Alibi contradicts Warehouse Rendezvous
  graphService.addEdge(caseId, {
    id: 'edge-contra-01',
    source: 'ev-alibi-witness',
    target: 'evt-warehouse',
    type: 'CONTRADICTS',
    status: 'OBSERVED',
    cost: 1.0,
    confidence: 0.85,
    evidenceRefs: ['ev-alibi-witness'],
    properties: { reason: 'Witness swears Mercer was dining at North Pier Diner at 14:45.' }
  });

  // 7. Identity Resolution Candidate: Jordan Vale vs J. Vale (Terminal Badge)
  resolutionRepo.saveCandidate({
    id: 'res-cand-vale-01',
    caseId,
    sourceNodeId: 'person-vale',
    targetNodeId: 'person-jvale',
    matchType: 'POSSIBLE_MATCH',
    similarityScore: 0.88,
    status: 'PENDING',
    reason: 'Initial and surname match on terminal access credentials with identical clearance tier.',
    createdAt: new Date().toISOString()
  });

  // 8. Generate Possibilities and Run Full Causal Algorithm Pipeline
  const baseGraph = graphService.getGraph(caseId);
  const candidates = resolutionRepo.getByCaseId(caseId);

  possibilityEngine.generatePossibilities(caseId, baseGraph, candidates, {
    sourceNodeId: 'person-mercer',
    targetNodeId: 'location-vault',
    minEvidenceSupport: 2,
    maxPossibilities: 15
  });

  // 9. Register Baseline Graph Version 1
  const versionRepo = new GraphVersionRepository(db);
  if (!versionRepo.getLatest(caseId)) {
    versionRepo.create({
      id: uuidv4(),
      caseId,
      versionNumber: 1,
      parentVersionNumber: null,
      changeSummary: 'Initial Baseline: 4 Candidate Corridors & Disjoint Verification',
      mutation: {
        action: 'INITIAL_GRAPH',
        targetType: 'SYSTEM',
        targetId: 'root',
        summary: 'Seeded initial multi-modal evidence graph and corridor constraints',
        timestamp: new Date().toISOString()
      },
      delta: {
        addedNodes: baseGraph.nodes,
        removedNodes: [],
        modifiedNodes: [],
        addedEdges: baseGraph.edges,
        removedEdges: [],
        modifiedEdges: [],
        changedEvidence: [],
        changedTemporalConstraints: [],
        changedIdentityConstraints: []
      },
      affectedSubgraph: {
        affectedNodeIds: baseGraph.nodes.map(n => n.id),
        affectedEdgeIds: baseGraph.edges.map(e => e.id),
        affectedEvidenceIds: baseGraph.nodes.filter(n => n.category === 'EVIDENCE').map(n => n.id),
        propagationReason: 'Initial baseline compilation'
      },
      snapshot: baseGraph,
      createdAt: new Date().toISOString()
    });
  }

  console.log(`Seeded demonstration case: '${demoCaseName}' (${caseId}) with genuine causal graph ambiguity.`);
  return { caseId };
}

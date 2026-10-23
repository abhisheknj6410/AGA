import { DatabaseSync } from 'node:sqlite';
import { CaseRepository } from './repositories/case-repository.js';
import { GraphService } from '../application/graph-service.js';

export function seedSimpleCase(db: DatabaseSync): string {
  const caseRepo = new CaseRepository(db);
  const graphService = new GraphService(db);

  const caseId = 'case-simple-laptop-theft';
  
  // Check if exists
  const existing = caseRepo.getById(caseId);
  if (existing) {
    return caseId;
  }

  const now = new Date().toISOString();
  // 1. Create Case
  caseRepo.create({
    id: caseId,
    name: 'The Stolen CEO Laptop (Beginner Case)',
    description: 'A clean 6-node case: A ThinkPad laptop went missing from Room 404. Two suspects: Alice (Accountant) and Bob (Janitor). Bob was seen on CCTV cleaning the 1st floor; Alice swiped into Room 404 at 10:02 AM.',
    status: 'ACTIVE',
    createdAt: now,
    updatedAt: now
  });

  // 2. Add Evidence
  graphService.addNode(caseId, {
    id: 'ev-cctv-door-404',
    category: 'EVIDENCE',
    type: 'CCTV',
    label: 'CCTV Feed Room 404 Corridor',
    source: { name: 'cctv_corridor_10am.mp4', kind: 'DEVICE', reference: 'CCTV-CAM-01' },
    reliability: 1.0,
    collectionTime: '2026-10-20T10:00:00Z',
    properties: { resolution: '1080p' }
  });

  graphService.addNode(caseId, {
    id: 'ev-badge-logs',
    category: 'EVIDENCE',
    type: 'DOCUMENT',
    label: 'Electronic Keycard Audit Log',
    source: { name: 'keycard_logs_oct20.csv', kind: 'FILE', reference: 'LOG-SERVER-01' },
    reliability: 1.0,
    collectionTime: '2026-10-20T10:02:00Z',
    properties: { format: 'CSV' }
  });

  // 3. Add Entities
  graphService.addNode(caseId, {
    id: 'suspect-alice',
    category: 'ENTITY',
    type: 'PERSON',
    label: 'Alice (Accountant)',
    properties: { role: 'Accountant', badgeId: 'BADGE-ALICE-102' }
  });

  graphService.addNode(caseId, {
    id: 'suspect-bob',
    category: 'ENTITY',
    type: 'PERSON',
    label: 'Bob (Janitor)',
    properties: { role: 'Facilities', badgeId: 'BADGE-BOB-044' }
  });

  graphService.addNode(caseId, {
    id: 'loc-room-404',
    category: 'ENTITY',
    type: 'LOCATION',
    label: 'Room 404 (CEO Office)',
    properties: { floor: '4th Floor Executive Wing' }
  });

  graphService.addNode(caseId, {
    id: 'item-laptop',
    category: 'ENTITY',
    type: 'DEVICE',
    label: 'CEO Laptop (ThinkPad X1)',
    properties: { serial: 'TP-X1-99201', value: '$2,500' }
  });

  // 4. Add Events
  graphService.addNode(caseId, {
    id: 'event-bob-hallway',
    category: 'EVENT',
    type: 'LOCATION_CHANGE',
    label: '10:00 AM - Bob cleans 1st Floor Hallway (Alibi)',
    time: { start: '2026-10-20T10:00:00Z', precision: 'MINUTE' },
    properties: { verifiedBy: 'Cafeteria CCTV' }
  });

  graphService.addNode(caseId, {
    id: 'event-alice-unlocks',
    category: 'EVENT',
    type: 'DATA_ACCESS',
    label: '10:02 AM - Alice swipes badge to enter Room 404',
    time: { start: '2026-10-20T10:02:00Z', precision: 'MINUTE' },
    properties: { badge: 'BADGE-ALICE-102' }
  });

  graphService.addNode(caseId, {
    id: 'event-alice-takes-laptop',
    category: 'EVENT',
    type: 'DEVICE_CONNECTION',
    label: '10:05 AM - Alice takes CEO Laptop',
    time: { start: '2026-10-20T10:05:00Z', precision: 'MINUTE' },
    properties: { method: 'Concealment in briefcase' }
  });

  // 5. Add Causal Edges
  // Bob -> Event
  graphService.addEdge(caseId, {
    id: 'edge-bob-action',
    source: 'suspect-bob',
    target: 'event-bob-hallway',
    type: 'PERFORMED',
    cost: 1.0,
    evidenceRefs: ['ev-cctv-door-404']
  });

  // Alice -> Events
  graphService.addEdge(caseId, {
    id: 'edge-alice-unlock',
    source: 'suspect-alice',
    target: 'event-alice-unlocks',
    type: 'PERFORMED',
    cost: 1.0,
    evidenceRefs: ['ev-badge-logs']
  });

  graphService.addEdge(caseId, {
    id: 'edge-alice-theft',
    source: 'suspect-alice',
    target: 'event-alice-takes-laptop',
    type: 'PERFORMED',
    cost: 1.0,
    evidenceRefs: ['ev-cctv-door-404']
  });

  // Event -> Entities
  graphService.addEdge(caseId, {
    id: 'edge-unlock-room',
    source: 'event-alice-unlocks',
    target: 'loc-room-404',
    type: 'ACCESSED',
    cost: 1.0,
    evidenceRefs: ['ev-badge-logs']
  });

  graphService.addEdge(caseId, {
    id: 'edge-theft-laptop',
    source: 'event-alice-takes-laptop',
    target: 'item-laptop',
    type: 'TARGETED',
    cost: 1.0,
    evidenceRefs: ['ev-cctv-door-404']
  });

  // Event -> Event (Causality)
  graphService.addEdge(caseId, {
    id: 'edge-causality-door-to-theft',
    source: 'event-alice-unlocks',
    target: 'event-alice-takes-laptop',
    type: 'CAUSED',
    cost: 1.0,
    evidenceRefs: ['ev-cctv-door-404', 'ev-badge-logs']
  });

  // Evidence -> Event Provenance Corroboration Edges
  graphService.addEdge(caseId, {
    id: 'edge-cctv-supports-bob-alibi',
    source: 'ev-cctv-door-404',
    target: 'event-bob-hallway',
    type: 'SUPPORTS',
    cost: 0.5,
    evidenceRefs: ['ev-cctv-door-404']
  });

  graphService.addEdge(caseId, {
    id: 'edge-badge-supports-alice-entry',
    source: 'ev-badge-logs',
    target: 'event-alice-unlocks',
    type: 'SUPPORTS',
    cost: 0.5,
    evidenceRefs: ['ev-badge-logs']
  });

  graphService.addEdge(caseId, {
    id: 'edge-cctv-supports-alice-theft',
    source: 'ev-cctv-door-404',
    target: 'event-alice-takes-laptop',
    type: 'SUPPORTS',
    cost: 0.5,
    evidenceRefs: ['ev-cctv-door-404']
  });

  return caseId;
}

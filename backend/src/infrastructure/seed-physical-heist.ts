import { DatabaseSync } from 'node:sqlite';
import { CaseService } from '../application/case-service.js';
import { GraphService } from '../application/graph-service.js';
import { PossibilityEngine } from '../application/possibility-engine.js';
import { GraphNode, GraphEdge } from '../domain/types.js';

export function seedOperationGrandMeridian(
  db: DatabaseSync,
  possibilityEngine: PossibilityEngine
): string {
  const caseId = 'case-grand-meridian-001';
  const caseService = new CaseService(db);
  const graphService = new GraphService(db);

  // 1. Reset Case if exists
  try {
    db.prepare('DELETE FROM edge_evidence WHERE edge_id IN (SELECT id FROM edges WHERE case_id = ?)').run(caseId);
    db.prepare('DELETE FROM edges WHERE case_id = ?').run(caseId);
    db.prepare('DELETE FROM events WHERE node_id IN (SELECT id FROM nodes WHERE case_id = ?)').run(caseId);
    db.prepare('DELETE FROM evidence WHERE node_id IN (SELECT id FROM nodes WHERE case_id = ?)').run(caseId);
    db.prepare('DELETE FROM nodes WHERE case_id = ?').run(caseId);
    db.prepare('DELETE FROM possibilities WHERE case_id = ?').run(caseId);
    db.prepare('DELETE FROM cases WHERE id = ?').run(caseId);
  } catch (err) {
    // Ignore if tables don't exist yet
  }

  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO cases (id, name, description, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    caseId,
    'Operation Grand Meridian: Armored Transport Armed Robbery & Diamond Vault Breach',
    'Major physical violent crime case featuring ballistics matching, eyewitness contradictions, toll gantry ANPR telemetry, and forensic choke-point alibi severing.',
    'ACTIVE',
    now,
    now
  );

  // 2. Nodes Definition (Entities, Events, Physical Evidence)
  const nodes: GraphNode[] = [
    // Physical Entities & Suspects
    { id: 'ent-gm-viktor', caseId, category: 'ENTITY', type: 'PERSON', label: 'Viktor Cole (Primary Suspect / Incursion Lead)', properties: { role: 'Armed Suspect' } },
    { id: 'ent-gm-samantha', caseId, category: 'ENTITY', type: 'PERSON', label: 'Samantha Cruz (Weapons Specialist / Lookout)', properties: { role: 'Accomplice' } },
    { id: 'ent-gm-tyler', caseId, category: 'ENTITY', type: 'PERSON', label: 'Tyler Finch (Compromised Armored Guard)', properties: { role: 'Inside Man' } },
    { id: 'ent-gm-arlo', caseId, category: 'ENTITY', type: 'PERSON', label: 'Arlo Kane (Illicit Gem Broker / Fence)', properties: { role: 'Black Market Receiver' } },
    { id: 'ent-gm-maya', caseId, category: 'ENTITY', type: 'PERSON', label: 'Maya Lin (Bystander Witness)', properties: { role: 'Eyewitness' } },

    // Physical Vehicles & Weapons
    { id: 'ent-gm-sedan', caseId, category: 'ENTITY', type: 'VEHICLE', label: 'Black Sedan (NY Plate 9X-8821)', properties: { make: 'Dodge Charger', color: 'Black' } },
    { id: 'ent-gm-armored-truck', caseId, category: 'ENTITY', type: 'VEHICLE', label: 'Armored Courier Truck #402', properties: { company: 'Brinks Vault Transit' } },
    { id: 'ent-gm-switch-van', caseId, category: 'ENTITY', type: 'VEHICLE', label: 'White Utility Van (MA Plate 4B-1102)', properties: { role: 'Transfer Vehicle' } },
    { id: 'ent-gm-glock21', caseId, category: 'ENTITY', type: 'DEVICE', label: 'Glock 21 .45 ACP Pistol (SN: GK-4491)', properties: { caliber: '.45 ACP' } },
    { id: 'ent-gm-casing', caseId, category: 'ENTITY', type: 'DEVICE', label: 'Expended .45 ACP Casing #B-12', properties: { ballisticMatch: true } },
    { id: 'ent-gm-diamond-case', caseId, category: 'ENTITY', type: 'DEVICE', label: 'Titanium Diamond Case ($4.2M Uncut Gems)', properties: { target: true, estimatedValue: 4200000 } },

    // Physical Crime Scene Locations
    { id: 'ent-gm-meridian-vault', caseId, category: 'ENTITY', type: 'LOCATION', label: 'Grand Meridian Sub-Basement Vault', properties: { securityZone: 'Restricted' } },
    { id: 'ent-gm-north-toll', caseId, category: 'ENTITY', type: 'LOCATION', label: 'North River Toll Plaza (Gantry #4)', properties: { chokePoint: true } },
    { id: 'ent-gm-canal-wharf', caseId, category: 'ENTITY', type: 'LOCATION', label: 'Pier 19 Industrial Canal Wharf', properties: { switchPoint: true } },
    { id: 'ent-gm-pawn-safehouse', caseId, category: 'ENTITY', type: 'LOCATION', label: 'Westside Safehouse Vault (Basement)', properties: { dropZone: true } },
    { id: 'ent-gm-diner', caseId, category: 'ENTITY', type: 'LOCATION', label: 'Starlight 24/7 Diner (Claimed Alibi Location)', properties: { contested: true } },

    // Physical Evidence Items (Forensic Provenance)
    { id: 'ev-gm-ballistics', caseId, category: 'EVIDENCE', type: 'DOCUMENT', label: 'Evidence: State Crime Lab Ballistics Report', source: { name: 'State Forensic Lab #BAL-992', kind: 'SENSOR' }, reliability: 0.99, collectionTime: '2026-09-18T22:30:00Z' },
    { id: 'ev-gm-toll-anpr', caseId, category: 'EVIDENCE', type: 'CCTV', label: 'Evidence: Toll Gantry 4K ANPR Telemetry', source: { name: 'DOT-CAM-NORTH-04', kind: 'DEVICE' }, reliability: 0.98, collectionTime: '2026-09-18T21:42:15Z' },
    { id: 'ev-gm-dna-swab', caseId, category: 'EVIDENCE', type: 'DOCUMENT', label: 'Evidence: DNA Buccal Swab on Cut Padlock', source: { name: 'Crime Scene Swab #DNA-08', kind: 'HUMAN' }, reliability: 0.97, collectionTime: '2026-09-18T22:00:00Z' },
    { id: 'ev-gm-cctv-vault', caseId, category: 'EVIDENCE', type: 'CCTV', label: 'Evidence: Vault Corridor High-Def CCTV', source: { name: 'CAM-VAULT-SUB01', kind: 'DEVICE' }, reliability: 0.95, collectionTime: '2026-09-18T21:16:00Z' },
    { id: 'ev-gm-witness-maya', caseId, category: 'EVIDENCE', type: 'INTERVIEW', label: 'Evidence: Sworn Witness Deposition (Maya Lin)', source: { name: 'Det. Harris Interview #102', kind: 'HUMAN' }, reliability: 0.65, collectionTime: '2026-09-18T23:15:00Z' },
    { id: 'ev-gm-diner-receipt', caseId, category: 'EVIDENCE', type: 'TRANSACTION_RECORD', label: 'Evidence: Starlight Diner Register Carbon', source: { name: 'Receipt POS #4421', kind: 'THIRD_PARTY' }, reliability: 0.50, collectionTime: '2026-09-18T23:45:00Z' },
    { id: 'ev-gm-cell-tower', caseId, category: 'EVIDENCE', type: 'PHONE_RECORD', label: 'Evidence: Telco Tower Sector 4 Ping Log', source: { name: 'Carrier Tower West-04', kind: 'NETWORK' }, reliability: 0.92, collectionTime: '2026-09-18T22:24:10Z' },

    // Physical Chronological Events
    { id: 'evt-gm-01-vault-gate', caseId, category: 'EVENT', type: 'LOCATION_CHANGE', label: '21:05 Armored Truck Check-In at North Gate', time: { start: '2026-09-18T21:05:00Z', precision: 'SECOND' } },
    { id: 'evt-gm-02-guard-subdue', caseId, category: 'EVENT', type: 'ACCOUNT_MODIFICATION', label: '21:12 Guard Finch Disables Silent Alarm', time: { start: '2026-09-18T21:12:30Z', precision: 'SECOND' } },
    { id: 'evt-gm-03-shot-fired', caseId, category: 'EVENT', type: 'PROCESS_EXECUTION', label: '21:16 Armed Ambush & .45 Discharge in Vault', time: { start: '2026-09-18T21:16:45Z', precision: 'SECOND' } },
    { id: 'evt-gm-04-thermal-lance', caseId, category: 'EVENT', type: 'PROCESS_EXECUTION', label: '21:20 Thermal Lance Breach of Diamond Safe', time: { start: '2026-09-18T21:20:10Z', precision: 'SECOND' } },
    { id: 'evt-gm-05-trunk-load', caseId, category: 'EVENT', type: 'DATA_ACCESS', label: '21:26 Stolen Diamond Case Loaded into Sedan', time: { start: '2026-09-18T21:26:00Z', precision: 'SECOND' } },
    { id: 'evt-gm-06-gate-ram', caseId, category: 'EVENT', type: 'LOCATION_CHANGE', label: '21:31 High-Speed Ramming of Perimeter Gate', time: { start: '2026-09-18T21:31:20Z', precision: 'SECOND' } },
    { id: 'evt-gm-07-toll-cross', caseId, category: 'EVENT', type: 'LOCATION_CHANGE', label: '21:42 North River Toll Plaza Gantry Crossing', time: { start: '2026-09-18T21:42:15Z', precision: 'SECOND' } },
    { id: 'evt-gm-08-pier-transfer', caseId, category: 'EVENT', type: 'LOCATION_CHANGE', label: '21:54 Cargo Switch to White Van at Pier 19', time: { start: '2026-09-18T21:54:50Z', precision: 'SECOND' } },
    { id: 'evt-gm-09-fence-drop', caseId, category: 'EVENT', type: 'DATA_ACCESS', label: '22:12 Diamond Case Delivered to Arlo Kane', time: { start: '2026-09-18T22:12:00Z', precision: 'SECOND' } },
    { id: 'evt-gm-10-disputed-alibi', caseId, category: 'EVENT', type: 'LOCATION_CHANGE', label: '22:25 Disputed Diner Alibi Claim', time: { start: '2026-09-18T22:25:00Z', precision: 'SECOND' } }
  ];

  for (const n of nodes) {
    graphService.addNode(caseId, n);
  }

  // 3. Edges Definition (Causal, Corroborating, Provenance, Contradictions)
  const edges: GraphEdge[] = [
    // Primary Criminal Execution Causal Chain
    { id: 'ed-gm-01', caseId, source: 'ent-gm-viktor', target: 'evt-gm-01-vault-gate', type: 'PERFORMED', status: 'OBSERVED', cost: 1.0, evidenceRefs: ['ev-gm-cctv-vault'] },
    { id: 'ed-gm-02', caseId, source: 'ent-gm-tyler', target: 'evt-gm-02-guard-subdue', type: 'PERFORMED', status: 'OBSERVED', cost: 1.0, evidenceRefs: ['ev-gm-cctv-vault'] },
    { id: 'ed-gm-03', caseId, source: 'evt-gm-01-vault-gate', target: 'evt-gm-02-guard-subdue', type: 'CAUSED', status: 'OBSERVED', cost: 1.0, evidenceRefs: ['ev-gm-cctv-vault'] },
    { id: 'ed-gm-04', caseId, source: 'evt-gm-02-guard-subdue', target: 'evt-gm-03-shot-fired', type: 'TRIGGERED', status: 'OBSERVED', cost: 1.0, evidenceRefs: ['ev-gm-cctv-vault'] },
    { id: 'ed-gm-05', caseId, source: 'ent-gm-samantha', target: 'evt-gm-03-shot-fired', type: 'PERFORMED', status: 'OBSERVED', cost: 1.0, evidenceRefs: ['ev-gm-ballistics'] },
    { id: 'ed-gm-06', caseId, source: 'evt-gm-03-shot-fired', target: 'evt-gm-04-thermal-lance', type: 'CAUSED', status: 'OBSERVED', cost: 1.0, evidenceRefs: ['ev-gm-cctv-vault'] },
    { id: 'ed-gm-07', caseId, source: 'evt-gm-04-thermal-lance', target: 'evt-gm-05-trunk-load', type: 'CAUSED', status: 'OBSERVED', cost: 1.0, evidenceRefs: ['ev-gm-cctv-vault'] },
    { id: 'ed-gm-08', caseId, source: 'evt-gm-05-trunk-load', target: 'ent-gm-sedan', type: 'USED', status: 'OBSERVED', cost: 1.0, evidenceRefs: ['ev-gm-cctv-vault'] },
    { id: 'ed-gm-09', caseId, source: 'evt-gm-05-trunk-load', target: 'evt-gm-06-gate-ram', type: 'CAUSED', status: 'OBSERVED', cost: 1.0, evidenceRefs: ['ev-gm-cctv-vault'] },
    { id: 'ed-gm-10', caseId, source: 'evt-gm-06-gate-ram', target: 'evt-gm-07-toll-cross', type: 'CAUSED', status: 'OBSERVED', cost: 1.0, evidenceRefs: ['ev-gm-toll-anpr'] },
    { id: 'ed-gm-11', caseId, source: 'evt-gm-07-toll-cross', target: 'ent-gm-north-toll', type: 'TARGETED', status: 'OBSERVED', cost: 1.0, evidenceRefs: ['ev-gm-toll-anpr'] },
    { id: 'ed-gm-12', caseId, source: 'evt-gm-07-toll-cross', target: 'evt-gm-08-pier-transfer', type: 'CAUSED', status: 'OBSERVED', cost: 1.0, evidenceRefs: ['ev-gm-toll-anpr'] },
    { id: 'ed-gm-13', caseId, source: 'evt-gm-08-pier-transfer', target: 'ent-gm-switch-van', type: 'USED', status: 'OBSERVED', cost: 1.0, evidenceRefs: ['ev-gm-toll-anpr'] },
    { id: 'ed-gm-14', caseId, source: 'evt-gm-08-pier-transfer', target: 'ent-gm-canal-wharf', type: 'TARGETED', status: 'OBSERVED', cost: 1.0, evidenceRefs: ['ev-gm-toll-anpr'] },
    { id: 'ed-gm-15', caseId, source: 'evt-gm-08-pier-transfer', target: 'evt-gm-09-fence-drop', type: 'CAUSED', status: 'OBSERVED', cost: 1.0, evidenceRefs: ['ev-gm-cell-tower'] },
    { id: 'ed-gm-16', caseId, source: 'ent-gm-arlo', target: 'evt-gm-09-fence-drop', type: 'PERFORMED', status: 'OBSERVED', cost: 1.0, evidenceRefs: ['ev-gm-cell-tower'] },
    { id: 'ed-gm-17', caseId, source: 'evt-gm-09-fence-drop', target: 'ent-gm-diamond-case', type: 'ACCESSED', status: 'OBSERVED', cost: 1.0, evidenceRefs: ['ev-gm-cell-tower'] },

    // Physical Evidence Support Links
    { id: 'ed-gm-18', caseId, source: 'ev-gm-cctv-vault', target: 'evt-gm-01-vault-gate', type: 'SUPPORTS', status: 'OBSERVED', cost: 1.0, evidenceRefs: ['ev-gm-cctv-vault'] },
    { id: 'ed-gm-19', caseId, source: 'ev-gm-dna-swab', target: 'ent-gm-viktor', type: 'SUPPORTS', status: 'OBSERVED', cost: 1.0, evidenceRefs: ['ev-gm-dna-swab'] },
    { id: 'ed-gm-20', caseId, source: 'ev-gm-ballistics', target: 'ent-gm-glock21', type: 'SUPPORTS', status: 'OBSERVED', cost: 1.0, evidenceRefs: ['ev-gm-ballistics'] },
    { id: 'ed-gm-21', caseId, source: 'evt-gm-03-shot-fired', target: 'ent-gm-glock21', type: 'USED', status: 'OBSERVED', cost: 1.0, evidenceRefs: ['ev-gm-ballistics'] },
    { id: 'ed-gm-22', caseId, source: 'ev-gm-toll-anpr', target: 'evt-gm-07-toll-cross', type: 'SUPPORTS', status: 'OBSERVED', cost: 1.0, evidenceRefs: ['ev-gm-toll-anpr'] },
    { id: 'ed-gm-23', caseId, source: 'ev-gm-cell-tower', target: 'evt-gm-09-fence-drop', type: 'SUPPORTS', status: 'OBSERVED', cost: 1.0, evidenceRefs: ['ev-gm-cell-tower'] },

    // Contradiction & Contested Alibi Corridor
    { id: 'ed-gm-24', caseId, source: 'ev-gm-diner-receipt', target: 'evt-gm-10-disputed-alibi', type: 'SUPPORTS', status: 'OBSERVED', cost: 1.0, evidenceRefs: ['ev-gm-diner-receipt'] },
    { id: 'ed-gm-25', caseId, source: 'ev-gm-witness-maya', target: 'evt-gm-10-disputed-alibi', type: 'SUPPORTS', status: 'OBSERVED', cost: 1.0, evidenceRefs: ['ev-gm-witness-maya'] },
    { id: 'ed-gm-26', caseId, source: 'ev-gm-cell-tower', target: 'evt-gm-10-disputed-alibi', type: 'CONTRADICTS', status: 'OBSERVED', cost: 2.0, evidenceRefs: ['ev-gm-cell-tower'] }
  ];

  for (const e of edges) {
    graphService.addEdge(caseId, e);
  }

  // 4. Generate Possibilities
  try {
    const fullGraph = graphService.getGraph(caseId);
    possibilityEngine.generatePossibilities(caseId, fullGraph, [], {
      replaceExisting: true,
      sourceNodeId: 'ent-gm-viktor',
      targetNodeId: 'ent-gm-diamond-case',
      maxPossibilities: 10
    });
  } catch (err) {
    console.warn(`[Seed] Warning generating possibilities for ${caseId}:`, err);
  }

  return caseId;
}

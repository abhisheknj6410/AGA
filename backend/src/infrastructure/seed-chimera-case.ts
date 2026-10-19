import { DatabaseSync } from 'node:sqlite';
import { CaseService } from '../application/case-service.js';
import { GraphService } from '../application/graph-service.js';
import { PossibilityEngine } from '../application/possibility-engine.js';
import { GraphNode, GraphEdge } from '../domain/types.js';

export function seedOperationChimera(
  db: DatabaseSync,
  possibilityEngine: PossibilityEngine
): string {
  const caseId = 'case-operation-chimera-001';
  const caseService = new CaseService(db);
  const graphService = new GraphService(db);

  // 1. Reset Case if exists
  db.prepare('DELETE FROM cases WHERE id = ?').run(caseId);
  db.prepare('DELETE FROM nodes WHERE case_id = ?').run(caseId);
  db.prepare('DELETE FROM edges WHERE case_id = ?').run(caseId);
  db.prepare('DELETE FROM possibilities WHERE case_id = ?').run(caseId);

  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO cases (id, name, description, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    caseId,
    'Operation Chimera: Sovereign Vault & SWIFT Core Exfiltration',
    'Major multi-vector enterprise cyber-heist involving physical loading bay incursion, credential hijacking, and 14.8GB SWIFT ledger extraction.',
    'ACTIVE',
    now,
    now
  );

  // 2. Nodes Definition (Entities, Events, Evidence)
  const nodes: GraphNode[] = [
    // Entities
    { id: 'ent-marcus', caseId, category: 'ENTITY', type: 'PERSON', label: 'Marcus Vance (DevOps Lead)', properties: { role: 'Inside Suspect' } },
    { id: 'ent-elena', caseId, category: 'ENTITY', type: 'PERSON', label: 'Elena Rostova (Threat Proxy)', properties: { role: 'External Broker' } },
    { id: 'ent-david', caseId, category: 'ENTITY', type: 'PERSON', label: 'David Chen (Security Guard)', properties: { shift: 'Night Shift A' } },
    { id: 'ent-sarah', caseId, category: 'ENTITY', type: 'ACCOUNT', label: 'Sarah Jenkins (Account)', properties: { department: 'Finance' } },
    { id: 'ent-ws-fin', caseId, category: 'ENTITY', type: 'DEVICE', label: 'Workstation WS-FIN-09', properties: { ip: '10.20.4.15' } },
    { id: 'ent-bastion', caseId, category: 'ENTITY', type: 'SERVER', label: 'Jump Host BASTION-EAST-01', properties: { ip: '10.20.1.5' } },
    { id: 'ent-swift-gw', caseId, category: 'ENTITY', type: 'SERVER', label: 'SWIFT Core Gateway Vault', properties: { target: true } },
    { id: 'ent-drive-x', caseId, category: 'ENTITY', type: 'DEVICE', label: 'Drive-Chimera (NVMe USB)', properties: { serial: 'CHIM-9912' } },
    { id: 'ent-vpn-proxy', caseId, category: 'ENTITY', type: 'IP_ADDRESS', label: 'VPN Proxy 185.220.101.44', properties: { location: 'Amsterdam' } },
    { id: 'ent-bay-door', caseId, category: 'ENTITY', type: 'LOCATION', label: 'North Loading Bay Door', properties: { accessLevel: 'Tier 3' } },
    { id: 'ent-fire-exit', caseId, category: 'ENTITY', type: 'LOCATION', label: 'South Fire Exit Stairwell', properties: { alarmed: true } },
    { id: 'ent-aws-s3', caseId, category: 'ENTITY', type: 'APPLICATION', label: 'AWS Exfiltration Mirror', properties: { bucket: 's3://chimera-drop-bucket' } },

    // Evidence Items
    { id: 'ev-cctv-bay', caseId, category: 'EVIDENCE', type: 'CCTV', label: 'Evidence: Loading Bay 4K CCTV', source: { name: 'CCTV-CAM-102', kind: 'DEVICE' }, reliability: 0.95, collectionTime: '2026-09-15T21:10:00Z' },
    { id: 'ev-syslog-ssh', caseId, category: 'EVIDENCE', type: 'LOG', label: 'Evidence: Bastion Secure Syslog', source: { name: '/var/log/secure', kind: 'SYSTEM' }, reliability: 0.99, collectionTime: '2026-09-15T21:32:45Z' },
    { id: 'ev-usb-kernel', caseId, category: 'EVIDENCE', type: 'LOG', label: 'Evidence: Windows Event ID 20001 (USB)', source: { name: 'WS-FIN-09 Registry', kind: 'DEVICE' }, reliability: 0.98, collectionTime: '2026-09-15T21:28:10Z' },
    { id: 'ev-bar-receipt', caseId, category: 'EVIDENCE', type: 'DOCUMENT', label: 'Evidence: Downtown Bar POS Record', source: { name: 'Bar Tab #8842', kind: 'THIRD_PARTY' }, reliability: 0.70, collectionTime: '2026-09-15T22:05:00Z' },
    { id: 'ev-cell-tower', caseId, category: 'EVIDENCE', type: 'PHONE_RECORD', label: 'Evidence: Cell Tower Sector Ping', source: { name: 'Cell Tower East-34', kind: 'NETWORK' }, reliability: 0.91, collectionTime: '2026-09-15T21:49:00Z' },

    // Chronological Events
    { id: 'evt-01-bay-entry', caseId, category: 'EVENT', type: 'LOCATION_CHANGE', label: '21:10 Incursion at North Bay', time: { start: '2026-09-15T21:10:00Z', precision: 'SECOND' } },
    { id: 'evt-02-guard-override', caseId, category: 'EVENT', type: 'ACCOUNT_MODIFICATION', label: '21:14 Security Lock Override', time: { start: '2026-09-15T21:14:22Z', precision: 'SECOND' } },
    { id: 'evt-03-vpn-connect', caseId, category: 'EVENT', type: 'LOGIN', label: '21:20 VPN Login (Sarah Creds)', time: { start: '2026-09-15T21:20:05Z', precision: 'SECOND' } },
    { id: 'evt-04-ws-power', caseId, category: 'EVENT', type: 'DEVICE_CONNECTION', label: '21:25 WS-FIN-09 Powered On', time: { start: '2026-09-15T21:25:30Z', precision: 'SECOND' } },
    { id: 'evt-05-usb-mount', caseId, category: 'EVENT', type: 'DEVICE_CONNECTION', label: '21:28 Drive-Chimera Mounted', time: { start: '2026-09-15T21:28:10Z', precision: 'SECOND' } },
    { id: 'evt-06-lateral-ssh', caseId, category: 'EVENT', type: 'NETWORK_CONNECTION', label: '21:32 Lateral SSH to Bastion', time: { start: '2026-09-15T21:32:45Z', precision: 'SECOND' } },
    { id: 'evt-07-mfa-bypass', caseId, category: 'EVENT', type: 'PROCESS_EXECUTION', label: '21:35 Session Hijack MFA Bypass', time: { start: '2026-09-15T21:35:00Z', precision: 'SECOND' } },
    { id: 'evt-08-swift-dump', caseId, category: 'EVENT', type: 'DATA_ACCESS', label: '21:38 SWIFT Ledger 14.8GB Dump', time: { start: '2026-09-15T21:38:15Z', precision: 'SECOND' } },
    { id: 'evt-09-usb-transfer', caseId, category: 'EVENT', type: 'FILE_TRANSFER', label: '21:42 Direct Exfil to USB', time: { start: '2026-09-15T21:42:00Z', precision: 'SECOND' } },
    { id: 'evt-10-cloud-sync', caseId, category: 'EVENT', type: 'FILE_TRANSFER', label: '21:44 Encrypted Socket to AWS', time: { start: '2026-09-15T21:44:30Z', precision: 'SECOND' } },
    { id: 'evt-11-fire-exit', caseId, category: 'EVENT', type: 'LOCATION_CHANGE', label: '21:48 South Fire Exit Egress', time: { start: '2026-09-15T21:48:00Z', precision: 'SECOND' } },
    { id: 'evt-12-disputed-alibi', caseId, category: 'EVENT', type: 'TRANSACTION', label: '22:05 Disputed Downtown Bar Tab', time: { start: '2026-09-15T22:05:00Z', precision: 'MINUTE' } }
  ];

  for (const n of nodes) {
    graphService.addNode(caseId, n);
  }

  // 3. Edges with 100% Provenance Coverage and strict schema directions
  const edges: GraphEdge[] = [
    // Physical Entry Path
    { id: 'ed-chim-01', caseId, source: 'ent-marcus', target: 'evt-01-bay-entry', type: 'PERFORMED', status: 'OBSERVED', cost: 1.0, evidenceRefs: ['ev-cctv-bay'] },
    { id: 'ed-chim-02', caseId, source: 'evt-01-bay-entry', target: 'ent-bay-door', type: 'TARGETED', status: 'OBSERVED', cost: 1.0, evidenceRefs: ['ev-cctv-bay'] },
    { id: 'ed-chim-03', caseId, source: 'ev-cctv-bay', target: 'evt-01-bay-entry', type: 'SUPPORTS', status: 'OBSERVED', cost: 1.0, evidenceRefs: ['ev-cctv-bay'] },
    { id: 'ed-chim-04', caseId, source: 'ent-david', target: 'evt-02-guard-override', type: 'INITIATED', status: 'OBSERVED', cost: 1.0, evidenceRefs: ['ev-cctv-bay'] },
    { id: 'ed-chim-05', caseId, source: 'evt-01-bay-entry', target: 'evt-02-guard-override', type: 'CAUSED', status: 'OBSERVED', cost: 1.0, evidenceRefs: ['ev-cctv-bay'] },
    { id: 'ed-chim-06', caseId, source: 'evt-02-guard-override', target: 'evt-04-ws-power', type: 'TRIGGERED', status: 'OBSERVED', cost: 1.0, evidenceRefs: ['ev-cctv-bay'] },

    // Physical Hardware Interaction
    { id: 'ed-chim-07', caseId, source: 'evt-04-ws-power', target: 'ent-ws-fin', type: 'TARGETED', status: 'OBSERVED', cost: 1.0, evidenceRefs: ['ev-usb-kernel'] },
    { id: 'ed-chim-08', caseId, source: 'evt-04-ws-power', target: 'evt-05-usb-mount', type: 'CAUSED', status: 'OBSERVED', cost: 1.0, evidenceRefs: ['ev-usb-kernel'] },
    { id: 'ed-chim-09', caseId, source: 'evt-05-usb-mount', target: 'ent-drive-x', type: 'ACCESSED', status: 'OBSERVED', cost: 1.0, evidenceRefs: ['ev-usb-kernel'] },
    { id: 'ed-chim-10', caseId, source: 'ev-usb-kernel', target: 'evt-05-usb-mount', type: 'SUPPORTS', status: 'OBSERVED', cost: 1.0, evidenceRefs: ['ev-usb-kernel'] },

    // Alternative Remote VPN Corridor (Corridor B)
    { id: 'ed-chim-11', caseId, source: 'ent-elena', target: 'evt-03-vpn-connect', type: 'INITIATED', status: 'OBSERVED', cost: 1.5, evidenceRefs: ['ev-syslog-ssh'] },
    { id: 'ed-chim-12', caseId, source: 'evt-03-vpn-connect', target: 'ent-vpn-proxy', type: 'TARGETED', status: 'OBSERVED', cost: 1.0, evidenceRefs: ['ev-syslog-ssh'] },
    { id: 'ed-chim-13', caseId, source: 'evt-03-vpn-connect', target: 'ent-sarah', type: 'ACCESSED', status: 'OBSERVED', cost: 1.0, evidenceRefs: ['ev-syslog-ssh'] },
    { id: 'ed-chim-14', caseId, source: 'evt-03-vpn-connect', target: 'evt-06-lateral-ssh', type: 'TRIGGERED', status: 'OBSERVED', cost: 1.5, evidenceRefs: ['ev-syslog-ssh'] },

    // Internal Lateral Pivot to Bastion (Choke Point)
    { id: 'ed-chim-15', caseId, source: 'evt-05-usb-mount', target: 'evt-06-lateral-ssh', type: 'CAUSED', status: 'OBSERVED', cost: 1.0, evidenceRefs: ['ev-syslog-ssh'] },
    { id: 'ed-chim-16', caseId, source: 'evt-06-lateral-ssh', target: 'ent-bastion', type: 'TARGETED', status: 'OBSERVED', cost: 1.0, evidenceRefs: ['ev-syslog-ssh'] },
    { id: 'ed-chim-17', caseId, source: 'ev-syslog-ssh', target: 'evt-06-lateral-ssh', type: 'SUPPORTS', status: 'OBSERVED', cost: 1.0, evidenceRefs: ['ev-syslog-ssh'] },

    // Escalation & Extraction
    { id: 'ed-chim-18', caseId, source: 'evt-06-lateral-ssh', target: 'evt-07-mfa-bypass', type: 'CAUSED', status: 'OBSERVED', cost: 1.0, evidenceRefs: ['ev-syslog-ssh'] },
    { id: 'ed-chim-19', caseId, source: 'evt-07-mfa-bypass', target: 'evt-08-swift-dump', type: 'TRIGGERED', status: 'OBSERVED', cost: 1.0, evidenceRefs: ['ev-syslog-ssh'] },
    { id: 'ed-chim-20', caseId, source: 'evt-08-swift-dump', target: 'ent-swift-gw', type: 'ACCESSED', status: 'OBSERVED', cost: 1.0, evidenceRefs: ['ev-syslog-ssh'] },

    // Exfiltration Bifurcation (Physical USB vs Cloud Socket)
    { id: 'ed-chim-21', caseId, source: 'evt-08-swift-dump', target: 'evt-09-usb-transfer', type: 'CAUSED', status: 'OBSERVED', cost: 1.0, evidenceRefs: ['ev-usb-kernel'] },
    { id: 'ed-chim-22', caseId, source: 'evt-09-usb-transfer', target: 'ent-drive-x', type: 'MODIFIED', status: 'OBSERVED', cost: 1.0, evidenceRefs: ['ev-usb-kernel'] },
    { id: 'ed-chim-23', caseId, source: 'evt-08-swift-dump', target: 'evt-10-cloud-sync', type: 'TRIGGERED', status: 'OBSERVED', cost: 1.2, evidenceRefs: ['ev-syslog-ssh'] },
    { id: 'ed-chim-24', caseId, source: 'evt-10-cloud-sync', target: 'ent-aws-s3', type: 'TARGETED', status: 'OBSERVED', cost: 1.0, evidenceRefs: ['ev-syslog-ssh'] },

    // Egress & Contradictory Alibi
    { id: 'ed-chim-25', caseId, source: 'evt-09-usb-transfer', target: 'evt-11-fire-exit', type: 'CAUSED', status: 'OBSERVED', cost: 1.0, evidenceRefs: ['ev-cell-tower'] },
    { id: 'ed-chim-26', caseId, source: 'evt-11-fire-exit', target: 'ent-fire-exit', type: 'TARGETED', status: 'OBSERVED', cost: 1.0, evidenceRefs: ['ev-cell-tower'] },
    { id: 'ed-chim-27', caseId, source: 'ev-bar-receipt', target: 'evt-12-disputed-alibi', type: 'SUPPORTS', status: 'OBSERVED', cost: 1.0, evidenceRefs: ['ev-bar-receipt'] },
    { id: 'ed-chim-28', caseId, source: 'ev-cell-tower', target: 'evt-12-disputed-alibi', type: 'CONTRADICTS', status: 'OBSERVED', cost: 2.0, evidenceRefs: ['ev-cell-tower'] }
  ];

  for (const e of edges) {
    graphService.addEdge(caseId, e);
  }

  // 4. Generate Possibilities and Resolution Candidates
  const fullGraph = graphService.getGraph(caseId);
  possibilityEngine.generatePossibilities(caseId, fullGraph, [], {
    replaceExisting: true,
    sourceNodeId: 'ent-marcus',
    targetNodeId: 'ent-swift-gw',
    maxPossibilities: 10
  });

  return caseId;
}

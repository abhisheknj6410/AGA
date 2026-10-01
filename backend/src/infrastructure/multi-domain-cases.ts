import { DatabaseSync } from 'node:sqlite';
import { CaseService } from '../application/case-service.js';
import { GraphService } from '../application/graph-service.js';
import { PossibilityEngine } from '../application/possibility-engine.js';
import { GraphPayload, GraphNode, GraphEdge } from '../domain/types.js';

export interface MultiDomainCaseMeta {
  id: string;
  name: string;
  domain: 'PHYSICAL' | 'FINANCIAL' | 'CORPORATE' | 'DIGITAL' | 'CONTRADICTORY';
  description: string;
  sourceNodeId: string;
  targetNodeId: string;
}

export const MULTI_DOMAIN_CASES_CATALOG: MultiDomainCaseMeta[] = [
  {
    id: 'case-domain-physical-01',
    name: 'Metropolitan Logistics Depot Physical Incursion',
    domain: 'PHYSICAL',
    description: 'Physical perimeter breach involving conflicting vehicle movements, guard station checks, and vault access.',
    sourceNodeId: 'node-phys-suspect-1',
    targetNodeId: 'node-phys-vault'
  },
  {
    id: 'case-domain-financial-02',
    name: 'Apex Capital Offshore Embezzlement Corridor',
    domain: 'FINANCIAL',
    description: 'Multi-hop layered financial transactions routed through shell corporations, escrow accounts, and offshore trusts.',
    sourceNodeId: 'node-fin-trader',
    targetNodeId: 'node-fin-offshore-fund'
  },
  {
    id: 'case-domain-corporate-03',
    name: 'Veritas Technologies Intellectual Property Exfiltration',
    domain: 'CORPORATE',
    description: 'Internal corporate credential misuse, privilege escalation via compromised VPN, and proprietary code export.',
    sourceNodeId: 'node-corp-employee',
    targetNodeId: 'node-corp-external-s3'
  },
  {
    id: 'case-domain-digital-04',
    name: 'Advanced Persistent Threat (APT-42) Intrusive Killchain',
    domain: 'DIGITAL',
    description: 'Cyber intrusion from spear-phishing beacon through internal gateway to domain controller and credential dumping.',
    sourceNodeId: 'node-dig-actor-ip',
    targetNodeId: 'node-dig-domain-controller'
  },
  {
    id: 'case-domain-contradictory-05',
    name: 'Downtown Harbor Complex Disputed Alibi Incident',
    domain: 'CONTRADICTORY',
    description: 'Intentionally ambiguous scenario featuring conflicting eyewitness accounts, mutually exclusive alibis, and contradictory badge telemetry.',
    sourceNodeId: 'node-contra-suspect',
    targetNodeId: 'node-contra-safe'
  }
];

export function seedMultiDomainCases(
  db: DatabaseSync,
  possibilityEngine: PossibilityEngine
): Map<string, MultiDomainCaseMeta> {
  const caseService = new CaseService(db);
  const graphService = new GraphService(db);
  const results = new Map<string, MultiDomainCaseMeta>();

  for (const meta of MULTI_DOMAIN_CASES_CATALOG) {
    // 1. Create Case
    const existing = db.prepare('SELECT id FROM cases WHERE id = ?').get(meta.id);
    if (!existing) {
      const now = new Date().toISOString();
      db.prepare(`
        INSERT INTO cases (id, name, description, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(meta.id, meta.name, meta.description, 'ACTIVE', now, now);
    }

    // 2. Build Specific Case Graph
    let graphData: { nodes: GraphNode[]; edges: GraphEdge[] };
    switch (meta.domain) {
      case 'PHYSICAL':
        graphData = buildPhysicalCaseGraph(meta.id);
        break;
      case 'FINANCIAL':
        graphData = buildFinancialCaseGraph(meta.id);
        break;
      case 'CORPORATE':
        graphData = buildCorporateCaseGraph(meta.id);
        break;
      case 'DIGITAL':
        graphData = buildDigitalCaseGraph(meta.id);
        break;
      case 'CONTRADICTORY':
        graphData = buildContradictoryCaseGraph(meta.id);
        break;
    }

    // Insert nodes and edges
    for (const node of graphData.nodes) {
      try {
        graphService.addNode(meta.id, node);
      } catch (err) {
        console.error(`Error adding node ${node.id} to ${meta.id}:`, err);
      }
    }
    for (const edge of graphData.edges) {
      try {
        graphService.addEdge(meta.id, edge);
      } catch (err) {
        console.error(`Error adding edge ${edge.id} to ${meta.id}:`, err);
      }
    }

    // 3. Generate Possibilities
    const fullGraph = graphService.getGraph(meta.id);
    possibilityEngine.generatePossibilities(meta.id, fullGraph, [], {
      replaceExisting: true,
      sourceNodeId: meta.sourceNodeId,
      targetNodeId: meta.targetNodeId,
      maxPossibilities: 10
    });

    results.set(meta.id, meta);
  }

  return results;
}

// ----------------------------------------------------
// Graph Builder Functions
// ----------------------------------------------------

function buildPhysicalCaseGraph(caseId: string): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const nodes: GraphNode[] = [
    {
      id: 'node-phys-suspect-1',
      caseId,
      category: 'ENTITY',
      type: 'PERSON',
      label: 'Marcus Vance (Suspect)',
      properties: { role: 'Contractor Driver', clearance: 'Level 1' },
      metadata: { source: 'HR Badge Registry' }
    },
    {
      id: 'node-phys-vehicle',
      caseId,
      category: 'ENTITY',
      type: 'VEHICLE',
      label: 'White Delivery Van (Plate 7X-442)',
      properties: { model: 'Ford Transit', color: 'White' },
      metadata: { source: 'Fleet Registry' }
    },
    {
      id: 'node-phys-gate-south',
      caseId,
      category: 'ENTITY',
      type: 'LOCATION',
      label: 'South Cargo Gate',
      properties: { checkpointType: 'Automated RFID Barrier' },
      metadata: {}
    },
    {
      id: 'node-phys-dock',
      caseId,
      category: 'ENTITY',
      type: 'LOCATION',
      label: 'Loading Dock B',
      properties: { zone: 'Restricted Bay' },
      metadata: {}
    },
    {
      id: 'node-phys-corridor-east',
      caseId,
      category: 'ENTITY',
      type: 'LOCATION',
      label: 'East Service Corridor',
      properties: { access: 'Staff Only' },
      metadata: {}
    },
    {
      id: 'node-phys-vault',
      caseId,
      category: 'ENTITY',
      type: 'LOCATION',
      label: 'High-Value Vault 4',
      properties: { secureTier: 'Tier 5' },
      metadata: {}
    },
    {
      id: 'node-phys-evidence-cctv',
      caseId,
      category: 'EVIDENCE',
      type: 'CCTV',
      label: 'South Gate Camera 03 Recording',
      properties: { resolution: '1080p', file: 'cctv-gate-0215.mp4' },
      source: { name: 'Gate Camera 03', kind: 'DEVICE' },
      reliability: 0.95,
      metadata: {}
    },
    {
      id: 'node-phys-evidence-log',
      caseId,
      category: 'EVIDENCE',
      type: 'LOG',
      label: 'Security Access Control Telemetry',
      properties: { system: 'CardKey Enterprise' },
      source: { name: 'Access Controller', kind: 'SYSTEM' },
      reliability: 0.9,
      metadata: {}
    }
  ];

  const edges: GraphEdge[] = [
    {
      id: 'edge-p1',
      caseId,
      source: 'node-phys-suspect-1',
      target: 'node-phys-vehicle',
      type: 'USES',
      status: 'OBSERVED',
      cost: 1.0,
      evidenceRefs: ['node-phys-evidence-cctv']
    },
    {
      id: 'edge-p2',
      caseId,
      source: 'node-phys-vehicle',
      target: 'node-phys-gate-south',
      type: 'LOCATED_AT',
      status: 'OBSERVED',
      cost: 1.0,
      evidenceRefs: ['node-phys-evidence-cctv']
    },
    {
      id: 'edge-p3',
      caseId,
      source: 'node-phys-gate-south',
      target: 'node-phys-dock',
      type: 'CONNECTED_TO',
      status: 'OBSERVED',
      cost: 1.0,
      evidenceRefs: ['node-phys-evidence-log']
    },
    {
      id: 'edge-p4',
      caseId,
      source: 'node-phys-dock',
      target: 'node-phys-corridor-east',
      type: 'CONNECTED_TO',
      status: 'OBSERVED',
      cost: 1.0,
      evidenceRefs: ['node-phys-evidence-log']
    },
    {
      id: 'edge-p5',
      caseId,
      source: 'node-phys-corridor-east',
      target: 'node-phys-vault',
      type: 'CONNECTED_TO',
      status: 'OBSERVED',
      cost: 1.0,
      evidenceRefs: ['node-phys-evidence-log']
    },
    {
      id: 'edge-p6',
      caseId,
      source: 'node-phys-gate-south',
      target: 'node-phys-vault',
      type: 'CONNECTED_TO',
      status: 'HYPOTHESIZED',
      cost: 2.0,
      evidenceRefs: []
    }
  ];

  return { nodes, edges };
}

function buildFinancialCaseGraph(caseId: string): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const nodes: GraphNode[] = [
    {
      id: 'node-fin-trader',
      caseId,
      category: 'ENTITY',
      type: 'PERSON',
      label: 'Julian Mercer (Fund Manager)',
      properties: { title: 'Managing Director' },
      metadata: {}
    },
    {
      id: 'node-fin-shell-a',
      caseId,
      category: 'ENTITY',
      type: 'ORGANIZATION',
      label: 'Starlight Holdings B.V.',
      properties: { jurisdiction: 'Curacao', status: 'Active Shell' },
      metadata: {}
    },
    {
      id: 'node-fin-escrow',
      caseId,
      category: 'ENTITY',
      type: 'ORGANIZATION',
      label: 'Zurich Trust Escrow',
      properties: { bank: 'Cantonal Bank', currency: 'EUR' },
      metadata: {}
    },
    {
      id: 'node-fin-direct-acct',
      caseId,
      category: 'ENTITY',
      type: 'ACCOUNT',
      label: 'Geneva Private Vault Deposit',
      properties: { intermediary: 'Direct Wire' },
      metadata: {}
    },
    {
      id: 'node-fin-offshore-fund',
      caseId,
      category: 'ENTITY',
      type: 'ORGANIZATION',
      label: 'Cayman Apex Offshore Reserve',
      properties: { balanceEst: '$14,200,000' },
      metadata: {}
    },
    {
      id: 'node-fin-ev-wire',
      caseId,
      category: 'EVIDENCE',
      type: 'TRANSACTION_RECORD',
      label: 'SWIFT MT103 Transfer Receipt #9921',
      properties: { amount: '4,500,000 EUR' },
      source: { name: 'SWIFT Banking Network', kind: 'SYSTEM' },
      reliability: 0.98,
      metadata: {}
    },
    {
      id: 'node-fin-ev-sec',
      caseId,
      category: 'EVIDENCE',
      type: 'DOCUMENT',
      label: 'Corporate Registry Filing',
      properties: { registry: 'Commercial Court' },
      source: { name: 'Registry Official', kind: 'THIRD_PARTY' },
      reliability: 0.92,
      metadata: {}
    }
  ];

  const edges: GraphEdge[] = [
    {
      id: 'edge-f1',
      caseId,
      source: 'node-fin-trader',
      target: 'node-fin-shell-a',
      type: 'ASSOCIATED_WITH',
      status: 'OBSERVED',
      cost: 1.0,
      evidenceRefs: ['node-fin-ev-wire']
    },
    {
      id: 'edge-f2',
      caseId,
      source: 'node-fin-shell-a',
      target: 'node-fin-escrow',
      type: 'CONNECTED_TO',
      status: 'OBSERVED',
      cost: 1.0,
      evidenceRefs: ['node-fin-ev-wire']
    },
    {
      id: 'edge-f3',
      caseId,
      source: 'node-fin-escrow',
      target: 'node-fin-offshore-fund',
      type: 'CONNECTED_TO',
      status: 'OBSERVED',
      cost: 1.0,
      evidenceRefs: ['node-fin-ev-sec']
    },
    {
      id: 'edge-f4',
      caseId,
      source: 'node-fin-trader',
      target: 'node-fin-direct-acct',
      type: 'USES',
      status: 'HYPOTHESIZED',
      cost: 2.0,
      evidenceRefs: []
    },
    {
      id: 'edge-f5',
      caseId,
      source: 'node-fin-direct-acct',
      target: 'node-fin-offshore-fund',
      type: 'CONNECTED_TO',
      status: 'HYPOTHESIZED',
      cost: 2.0,
      evidenceRefs: []
    }
  ];

  return { nodes, edges };
}

function buildCorporateCaseGraph(caseId: string): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const nodes: GraphNode[] = [
    {
      id: 'node-corp-employee',
      caseId,
      category: 'ENTITY',
      type: 'PERSON',
      label: 'Elena Rostova (Staff Engineer)',
      properties: { department: 'Core Infrastructure' },
      metadata: {}
    },
    {
      id: 'node-corp-vpn',
      caseId,
      category: 'ENTITY',
      type: 'DEVICE',
      label: 'Corporate Gateway VPN',
      properties: { ip: '10.240.0.1' },
      metadata: {}
    },
    {
      id: 'node-corp-bastion',
      caseId,
      category: 'ENTITY',
      type: 'SERVER',
      label: 'Production SSH Bastion Host',
      properties: { host: 'bastion-prod-01' },
      metadata: {}
    },
    {
      id: 'node-corp-repo',
      caseId,
      category: 'ENTITY',
      type: 'SERVER',
      label: 'Proprietary Code Repository',
      properties: { gitOrg: 'internal-veritas' },
      metadata: {}
    },
    {
      id: 'node-corp-external-s3',
      caseId,
      category: 'ENTITY',
      type: 'SERVER',
      label: 'Unsanctioned External Cloud Storage',
      properties: { bucket: 'anon-staging-drop-2026' },
      metadata: {}
    },
    {
      id: 'node-corp-ev-log',
      caseId,
      category: 'EVIDENCE',
      type: 'LOG',
      label: 'Okta SSO Multi-Factor Authenticated Session',
      properties: { sessionId: 'sso_884931a' },
      source: { name: 'Okta SSO Gateway', kind: 'SYSTEM' },
      reliability: 0.95,
      metadata: {}
    }
  ];

  const edges: GraphEdge[] = [
    {
      id: 'edge-c1',
      caseId,
      source: 'node-corp-employee',
      target: 'node-corp-vpn',
      type: 'USES',
      status: 'OBSERVED',
      cost: 1.0,
      evidenceRefs: ['node-corp-ev-log']
    },
    {
      id: 'edge-c2',
      caseId,
      source: 'node-corp-vpn',
      target: 'node-corp-bastion',
      type: 'CONNECTED_TO',
      status: 'OBSERVED',
      cost: 1.0,
      evidenceRefs: ['node-corp-ev-log']
    },
    {
      id: 'edge-c3',
      caseId,
      source: 'node-corp-bastion',
      target: 'node-corp-repo',
      type: 'CONNECTED_TO',
      status: 'HYPOTHESIZED',
      cost: 1.0,
      evidenceRefs: []
    },
    {
      id: 'edge-c4',
      caseId,
      source: 'node-corp-repo',
      target: 'node-corp-external-s3',
      type: 'CONNECTED_TO',
      status: 'HYPOTHESIZED',
      cost: 1.0,
      evidenceRefs: []
    },
    {
      id: 'edge-c5',
      caseId,
      source: 'node-corp-vpn',
      target: 'node-corp-external-s3',
      type: 'CONNECTED_TO',
      status: 'HYPOTHESIZED',
      cost: 3.0,
      evidenceRefs: []
    }
  ];

  return { nodes, edges };
}

function buildDigitalCaseGraph(caseId: string): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const nodes: GraphNode[] = [
    {
      id: 'node-dig-actor-ip',
      caseId,
      category: 'ENTITY',
      type: 'IP_ADDRESS',
      label: 'Malicious External IP 198.51.100.42 (C2 Host)',
      properties: { country: 'AS44190' },
      metadata: {}
    },
    {
      id: 'node-dig-workstation',
      caseId,
      category: 'ENTITY',
      type: 'DEVICE',
      label: 'Workstation HR-DESK-09',
      properties: { hostname: 'hr-desk-09.corp' },
      metadata: {}
    },
    {
      id: 'node-dig-alt-pivot',
      caseId,
      category: 'ENTITY',
      type: 'DEVICE',
      label: 'Internal File Gateway PIVOT-02',
      properties: { ip: '192.168.10.15' },
      metadata: {}
    },
    {
      id: 'node-dig-jumpbox',
      caseId,
      category: 'ENTITY',
      type: 'SERVER',
      label: 'Administrative Jumpbox Host',
      properties: { role: 'SSH Bastion' },
      metadata: {}
    },
    {
      id: 'node-dig-domain-controller',
      caseId,
      category: 'ENTITY',
      type: 'SERVER',
      label: 'Primary Domain Controller DC-ROOT-01',
      properties: { role: 'Active Directory Root' },
      metadata: {}
    },
    {
      id: 'node-dig-ev-pcap',
      caseId,
      category: 'EVIDENCE',
      type: 'NETWORK_CAPTURE',
      label: 'Zeek TLS Connection Telemetry',
      properties: { flow: 'TLS handshake observed' },
      source: { name: 'Zeek Network Sensor', kind: 'NETWORK' },
      reliability: 0.99,
      metadata: {}
    }
  ];

  const edges: GraphEdge[] = [
    {
      id: 'edge-d1',
      caseId,
      source: 'node-dig-actor-ip',
      target: 'node-dig-workstation',
      type: 'CONNECTED_TO',
      status: 'OBSERVED',
      cost: 1.0,
      evidenceRefs: ['node-dig-ev-pcap']
    },
    {
      id: 'edge-d2',
      caseId,
      source: 'node-dig-workstation',
      target: 'node-dig-jumpbox',
      type: 'CONNECTED_TO',
      status: 'OBSERVED',
      cost: 1.0,
      evidenceRefs: ['node-dig-ev-pcap']
    },
    {
      id: 'edge-d3',
      caseId,
      source: 'node-dig-jumpbox',
      target: 'node-dig-domain-controller',
      type: 'CONNECTED_TO',
      status: 'HYPOTHESIZED',
      cost: 1.0,
      evidenceRefs: []
    },
    {
      id: 'edge-d4',
      caseId,
      source: 'node-dig-actor-ip',
      target: 'node-dig-alt-pivot',
      type: 'CONNECTED_TO',
      status: 'HYPOTHESIZED',
      cost: 2.0,
      evidenceRefs: []
    },
    {
      id: 'edge-d5',
      caseId,
      source: 'node-dig-alt-pivot',
      target: 'node-dig-domain-controller',
      type: 'CONNECTED_TO',
      status: 'HYPOTHESIZED',
      cost: 2.0,
      evidenceRefs: []
    }
  ];

  return { nodes, edges };
}

function buildContradictoryCaseGraph(caseId: string): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const nodes: GraphNode[] = [
    {
      id: 'node-contra-suspect',
      caseId,
      category: 'ENTITY',
      type: 'PERSON',
      label: 'Damian Cruz (Keyholder)',
      properties: { role: 'Head of Facilities' },
      metadata: {}
    },
    {
      id: 'node-contra-route-west',
      caseId,
      category: 'ENTITY',
      type: 'LOCATION',
      label: 'West Dock Security Checkpoint',
      properties: {},
      metadata: {}
    },
    {
      id: 'node-contra-route-east',
      caseId,
      category: 'ENTITY',
      type: 'LOCATION',
      label: 'East Terminal Tunnel',
      properties: {},
      metadata: {}
    },
    {
      id: 'node-contra-safe',
      caseId,
      category: 'ENTITY',
      type: 'LOCATION',
      label: 'Harbor Vault Safe',
      properties: {},
      metadata: {}
    },
    {
      id: 'node-contra-statement-a',
      caseId,
      category: 'EVIDENCE',
      type: 'INTERVIEW',
      label: 'Witness Statement: Guard Larson asserts Damian entered West Dock at 14:00',
      properties: { witness: 'Guard Larson' },
      source: { name: 'Guard Larson Sworn Interview', kind: 'HUMAN' },
      reliability: 0.85,
      metadata: {}
    },
    {
      id: 'node-contra-statement-b',
      caseId,
      category: 'EVIDENCE',
      type: 'INTERVIEW',
      label: 'Witness Statement: Supervisor Chen asserts Damian was at East Terminal at 14:00',
      properties: { witness: 'Supervisor Chen' },
      source: { name: 'Supervisor Chen Sworn Interview', kind: 'HUMAN' },
      reliability: 0.85,
      metadata: {}
    }
  ];

  const edges: GraphEdge[] = [
    {
      id: 'edge-x1',
      caseId,
      source: 'node-contra-suspect',
      target: 'node-contra-route-west',
      type: 'LOCATED_AT',
      status: 'OBSERVED',
      cost: 1.0,
      evidenceRefs: ['node-contra-statement-a']
    },
    {
      id: 'edge-x2',
      caseId,
      source: 'node-contra-route-west',
      target: 'node-contra-safe',
      type: 'CONNECTED_TO',
      status: 'OBSERVED',
      cost: 1.0,
      evidenceRefs: ['node-contra-statement-a']
    },
    {
      id: 'edge-x3',
      caseId,
      source: 'node-contra-suspect',
      target: 'node-contra-route-east',
      type: 'LOCATED_AT',
      status: 'OBSERVED',
      cost: 1.0,
      evidenceRefs: ['node-contra-statement-b']
    },
    {
      id: 'edge-x4',
      caseId,
      source: 'node-contra-route-east',
      target: 'node-contra-safe',
      type: 'CONNECTED_TO',
      status: 'OBSERVED',
      cost: 1.0,
      evidenceRefs: ['node-contra-statement-b']
    },
    {
      id: 'edge-x-contra',
      caseId,
      source: 'node-contra-statement-a',
      target: 'node-contra-statement-b',
      type: 'CONTRADICTS',
      status: 'OBSERVED',
      cost: 1.0,
      evidenceRefs: ['node-contra-statement-a', 'node-contra-statement-b']
    }
  ];

  return { nodes, edges };
}

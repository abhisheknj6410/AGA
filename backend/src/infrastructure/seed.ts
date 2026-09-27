import path from 'node:path';
import { getDatabase, closeDatabase } from './db.js';
import { runMigrations } from './migrations.js';
import { CaseService } from '../application/case-service.js';
import { GraphService } from '../application/graph-service.js';
import { PossibilityRepository } from './repositories/possibility-repository.js';
import { AlgorithmRepository } from './repositories/algorithm-repository.js';
import { ResolutionRepository } from './repositories/resolution-repository.js';
import { GraphAnalysisEngine } from '../application/graph-analysis-engine.js';
import { PossibilityEngine } from '../application/possibility-engine.js';

export function seedDatabase(customDb?: any): { caseId: string } {
  const db = customDb || getDatabase();
  runMigrations(db);

  const caseService = new CaseService(db);
  const graphService = new GraphService(db);

  // Check if seed case already exists
  const existingCases = caseService.listCases();
  const found = existingCases.find(c => c.name === 'Unauthorized Database Access');
  if (found) {
    console.log(`Seed case already exists with ID: ${found.id}`);
    return { caseId: found.id };
  }

  // 1. Create Investigation Case
  const seedCase = caseService.createCase(
    'Unauthorized Database Access',
    'Investigation into exfiltration of customer records from Prod-DB-01 via anomalous privileged session.',
    'lead-investigator'
  );
  const caseId = seedCase.id;

  console.log(`Created investigation case: ${seedCase.name} (${caseId})`);

  // 2. Register Evidence Items (First-Class Objects)
  const evAuth = graphService.addNode(caseId, {
    id: 'ev-auth-001',
    category: 'EVIDENCE',
    type: 'LOG',
    label: 'Prod-DB-01 Secure Auth Log',
    source: { name: '/var/log/auth.log', kind: 'SYSTEM', reference: 'SHA256:7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069' },
    reliability: 0.98,
    collectionTime: '2026-09-10T16:00:00Z',
    hashChecksum: '7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069',
    properties: { server: 'Prod-DB-01', recordsExtracted: 4 }
  });

  const evNet = graphService.addNode(caseId, {
    id: 'ev-net-002',
    category: 'EVIDENCE',
    type: 'NETWORK_CAPTURE',
    label: 'Core Perimeter PCAP Capture',
    source: { name: 'perimeter_tap_q3.pcap', kind: 'NETWORK', reference: 'SHA256:4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a' },
    reliability: 0.95,
    collectionTime: '2026-09-10T16:15:00Z',
    hashChecksum: '4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a',
    properties: { captureDuration: '3600s', router: 'Gateway-01' }
  });

  const evAuditd = graphService.addNode(caseId, {
    id: 'ev-auditd-003',
    category: 'EVIDENCE',
    type: 'SYSTEM_RECORD',
    label: 'Linux Auditd Daemon Log',
    source: { name: '/var/log/audit/audit.log', kind: 'SYSTEM', reference: 'SHA256:ef2d127de37b942baad06145e54b0c619a1f22327b2ebbcfbec78f5564afe39d' },
    reliability: 0.99,
    collectionTime: '2026-09-10T16:10:00Z',
    hashChecksum: 'ef2d127de37b942baad06145e54b0c619a1f22327b2ebbcfbec78f5564afe39d',
    properties: { auditRule: '-w /var/lib/postgresql/data -p rwa' }
  });

  const evCctv = graphService.addNode(caseId, {
    id: 'ev-cctv-004',
    category: 'EVIDENCE',
    type: 'CCTV',
    label: 'Building B Cafeteria CCTV Footage',
    source: { name: 'cam-b-cafeteria-20260910.mp4', kind: 'DEVICE', reference: 'CCTV-DVR-02-CH04' },
    reliability: 0.90,
    collectionTime: '2026-09-10T17:00:00Z',
    properties: { cameraAngle: 'North Dining Hall', timestamp: '2026-09-10T14:10:00Z to 2026-09-10T14:35:00Z' }
  });

  const evInterview = graphService.addNode(caseId, {
    id: 'ev-interview-005',
    category: 'EVIDENCE',
    type: 'INTERVIEW',
    label: 'Witness Interview Statement - Rahul Kumar',
    source: { name: 'interview_transcript_rk.pdf', kind: 'HUMAN', reference: 'HR-SEC-INT-409' },
    reliability: 0.60,
    collectionTime: '2026-09-10T18:00:00Z',
    properties: { interviewer: 'Chief Security Officer', subject: 'Rahul Kumar' }
  });

  // 3. Register Entities (14 required categories represented)
  const orgCyber = graphService.addNode(caseId, {
    id: 'ent-org-cyber',
    category: 'ENTITY',
    type: 'ORGANIZATION',
    label: 'CyberDefense Corp',
    properties: { industry: 'Cybersecurity & Defense' }
  });

  // 3 Persons
  const personRahul = graphService.addNode(caseId, {
    id: 'ent-person-rahul',
    category: 'ENTITY',
    type: 'PERSON',
    label: 'Rahul Kumar',
    properties: { role: 'Lead Database Administrator', employeeId: 'EMP-1092', department: 'Infrastructure' }
  });

  const personPriya = graphService.addNode(caseId, {
    id: 'ent-person-priya',
    category: 'ENTITY',
    type: 'PERSON',
    label: 'Priya Sharma',
    properties: { role: 'Senior Backend Engineer', employeeId: 'EMP-1044', department: 'Engineering' }
  });

  const personAlex = graphService.addNode(caseId, {
    id: 'ent-person-alex',
    category: 'ENTITY',
    type: 'PERSON',
    label: 'Alex Chen',
    properties: { role: 'Technical Documentation Writer', employeeId: 'EMP-1130', department: 'Documentation' }
  });

  // Duplicate Identity Candidate (for Entity Resolution review)
  const personRKumar = graphService.addNode(caseId, {
    id: 'ent-person-rkumar-candidate',
    category: 'ENTITY',
    type: 'PERSON',
    label: 'R. Kumar',
    properties: { role: 'External Consultant / Admin', note: 'Registered in device provisioning portal' }
  });

  // 3 Accounts
  const accRahul = graphService.addNode(caseId, {
    id: 'ent-acc-rkumar-adm',
    category: 'ENTITY',
    type: 'ACCOUNT',
    label: 'rkumar-adm',
    properties: { privilegeLevel: 'SUPERUSER', uid: 1001 }
  });

  const accPriya = graphService.addNode(caseId, {
    id: 'ent-acc-psharma-dev',
    category: 'ENTITY',
    type: 'ACCOUNT',
    label: 'psharma-dev',
    properties: { privilegeLevel: 'DEVELOPER', uid: 1004 }
  });

  const accBackup = graphService.addNode(caseId, {
    id: 'ent-acc-svc-backup',
    category: 'ENTITY',
    type: 'ACCOUNT',
    label: 'svc-dbbackup',
    properties: { privilegeLevel: 'SERVICE', uid: 999 }
  });

  // 4 Devices
  const devLaptopRK = graphService.addNode(caseId, {
    id: 'ent-dev-laptop-rk',
    category: 'ENTITY',
    type: 'DEVICE',
    label: 'Laptop-RK-01',
    properties: { os: 'Fedora 40', serial: 'FED-99381-RK', mac: '00:1A:2B:3C:4D:5E' }
  });

  const devWorkstationDev = graphService.addNode(caseId, {
    id: 'ent-dev-workstation-dev',
    category: 'ENTITY',
    type: 'DEVICE',
    label: 'Workstation-Dev-04',
    properties: { os: 'Ubuntu 24.04', serial: 'WS-DEV-402', mac: '00:1A:2B:AA:BB:CC' }
  });

  const devBastion = graphService.addNode(caseId, {
    id: 'ent-dev-bastion',
    category: 'ENTITY',
    type: 'DEVICE',
    label: 'Bastion-Host-01',
    properties: { os: 'Debian 12 Hardened', role: 'SSH Jumpbox' }
  });

  const devExternalMac = graphService.addNode(caseId, {
    id: 'ent-dev-external-mac',
    category: 'ENTITY',
    type: 'DEVICE',
    label: 'Unknown-External-Mac',
    properties: { os: 'macOS 15.0', suspectedOwner: 'Unknown Foreign Operator' }
  });

  // 2 Servers
  const srvProdDB = graphService.addNode(caseId, {
    id: 'ent-srv-proddb',
    category: 'ENTITY',
    type: 'SERVER',
    label: 'Prod-DB-01',
    properties: { role: 'Primary Production PostgreSQL Server', cluster: 'datacenter-east-1' }
  });

  const srvBackup = graphService.addNode(caseId, {
    id: 'ent-srv-backup',
    category: 'ENTITY',
    type: 'SERVER',
    label: 'Backup-Storage-02',
    properties: { role: 'Encrypted Snapshot Repository', cluster: 'datacenter-east-2' }
  });

  // 2 IP Addresses
  const ipInternal = graphService.addNode(caseId, {
    id: 'ent-ip-internal',
    category: 'ENTITY',
    type: 'IP_ADDRESS',
    label: '10.0.4.15',
    properties: { subnet: '10.0.4.0/24', vlan: 'Management-VLAN-4' }
  });

  const ipExternal = graphService.addNode(caseId, {
    id: 'ent-ip-external',
    category: 'ENTITY',
    type: 'IP_ADDRESS',
    label: '198.51.100.42',
    properties: { isp: 'CloudVps Hosting Ltd', asn: 'AS64496', country: 'DE' }
  });

  // 3 Files
  const fileCustomerRecords = graphService.addNode(caseId, {
    id: 'ent-file-custrecords',
    category: 'ENTITY',
    type: 'FILE',
    label: 'customer_records_q3.sql',
    properties: { path: '/tmp/customer_records_q3.sql', sizeBytes: 524288000, sensitivity: 'RESTRICTED' }
  });

  const fileEncryptedDump = graphService.addNode(caseId, {
    id: 'ent-file-encrypteddump',
    category: 'ENTITY',
    type: 'FILE',
    label: 'dump_encrypted.tar.gz',
    properties: { path: '/var/backups/daily/dump_encrypted.tar.gz', sizeBytes: 314572800 }
  });

  const fileReadme = graphService.addNode(caseId, {
    id: 'ent-file-readme',
    category: 'ENTITY',
    type: 'FILE',
    label: 'harmless_readme.txt',
    properties: { path: '/home/alex/docs/harmless_readme.txt', sizeBytes: 1024 }
  });

  // 4. Register Events (First-Class Nodes with Exact Temporal Information)
  const evLogin = graphService.addNode(caseId, {
    id: 'event-login-01',
    category: 'EVENT',
    type: 'LOGIN',
    label: 'SSH Interactive Root/Admin Login to Prod-DB-01',
    time: {
      start: '2026-09-10T14:15:00Z',
      end: '2026-09-10T14:15:02Z',
      precision: 'SECOND'
    },
    properties: { authMethod: 'publickey', port: 22, sessionType: 'interactive' }
  });

  const evProcess = graphService.addNode(caseId, {
    id: 'event-proc-dump',
    category: 'EVENT',
    type: 'PROCESS_EXECUTION',
    label: 'pg_dump Execution on Prod-DB-01',
    time: {
      start: '2026-09-10T14:20:10Z',
      end: '2026-09-10T14:21:45Z',
      precision: 'SECOND'
    },
    properties: { cmd: 'pg_dump -U postgres -d customer_db -F c -f /tmp/customer_records_q3.sql' }
  });

  const evFileAccess = graphService.addNode(caseId, {
    id: 'event-fileaccess-01',
    category: 'EVENT',
    type: 'FILE_ACCESS',
    label: 'Read Access to SQL Dump File',
    time: {
      start: '2026-09-10T14:22:00Z',
      end: '2026-09-10T14:22:15Z',
      precision: 'SECOND'
    },
    properties: { syscall: 'openat', flags: 'O_RDONLY' }
  });

  const evFileTransfer = graphService.addNode(caseId, {
    id: 'event-transfer-01',
    category: 'EVENT',
    type: 'FILE_TRANSFER',
    label: 'Encrypted SCP Exfiltration to 198.51.100.42',
    time: {
      start: '2026-09-10T14:25:00Z',
      end: '2026-09-10T14:28:30Z',
      precision: 'SECOND'
    },
    properties: { bytesTransferred: 524288000, protocol: 'SCP', targetPort: 2222 }
  });

  const evLogout = graphService.addNode(caseId, {
    id: 'event-logout-01',
    category: 'EVENT',
    type: 'LOGOUT',
    label: 'Session Termination on Prod-DB-01',
    time: {
      start: '2026-09-10T14:31:00Z',
      precision: 'SECOND'
    },
    properties: { exitCode: 0 }
  });

  // Alternative Path Event (Via Bastion)
  const evBastionConn = graphService.addNode(caseId, {
    id: 'event-netconn-bastion',
    category: 'EVENT',
    type: 'NETWORK_CONNECTION',
    label: 'Inbound SSH from Bastion Host',
    time: {
      start: '2026-09-10T14:14:30Z',
      end: '2026-09-10T14:31:30Z',
      precision: 'SECOND'
    },
    properties: { sourceHost: 'Bastion-Host-01', destHost: 'Prod-DB-01' }
  });

  // Irrelevant Component Event (Alex Chen modifying documentation)
  const evDocAccess = graphService.addNode(caseId, {
    id: 'event-docaccess-alex',
    category: 'EVENT',
    type: 'FILE_ACCESS',
    label: 'Routine Read of Documentation Readme',
    time: {
      start: '2026-09-10T11:00:00Z',
      precision: 'MINUTE'
    },
    properties: { editor: 'nano' }
  });

  // 5. Register Directed Relationships with Controlled Vocabulary & Evidence Linkage

  // Entity -> Entity
  graphService.addEdge(caseId, {
    id: 'rel-member-rahul',
    source: personRahul.id,
    target: orgCyber.id,
    type: 'MEMBER_OF',
    status: 'OBSERVED',
    cost: 1.0,
    evidenceRefs: [evInterview.id]
  });

  graphService.addEdge(caseId, {
    id: 'rel-member-priya',
    source: personPriya.id,
    target: orgCyber.id,
    type: 'MEMBER_OF',
    status: 'OBSERVED',
    cost: 1.0,
    evidenceRefs: [evInterview.id]
  });

  graphService.addEdge(caseId, {
    id: 'rel-member-alex',
    source: personAlex.id,
    target: orgCyber.id,
    type: 'MEMBER_OF',
    status: 'OBSERVED',
    cost: 1.0,
    evidenceRefs: [evInterview.id]
  });

  graphService.addEdge(caseId, {
    id: 'rel-uses-rahul-acc',
    source: personRahul.id,
    target: accRahul.id,
    type: 'USES',
    status: 'OBSERVED',
    cost: 1.0,
    evidenceRefs: [evAuth.id]
  });

  graphService.addEdge(caseId, {
    id: 'rel-owns-rahul-laptop',
    source: personRahul.id,
    target: devLaptopRK.id,
    type: 'OWNS',
    status: 'OBSERVED',
    cost: 1.0,
    evidenceRefs: [evInterview.id]
  });

  graphService.addEdge(caseId, {
    id: 'rel-laptop-ip',
    source: devLaptopRK.id,
    target: ipInternal.id,
    type: 'CONNECTED_TO',
    status: 'OBSERVED',
    cost: 1.0,
    evidenceRefs: [evAuth.id, evNet.id]
  });

  graphService.addEdge(caseId, {
    id: 'rel-laptop-bastion',
    source: devLaptopRK.id,
    target: devBastion.id,
    type: 'CONNECTED_TO',
    status: 'OBSERVED',
    cost: 1.5,
    evidenceRefs: [evNet.id]
  });

  graphService.addEdge(caseId, {
    id: 'rel-bastion-proddb',
    source: devBastion.id,
    target: srvProdDB.id,
    type: 'CONNECTED_TO',
    status: 'OBSERVED',
    cost: 1.2,
    evidenceRefs: [evNet.id]
  });

  // Entity -> Event (Performers)
  graphService.addEdge(caseId, {
    id: 'rel-perf-login',
    source: devLaptopRK.id,
    target: evLogin.id,
    type: 'PERFORMED',
    status: 'OBSERVED',
    cost: 1.0,
    evidenceRefs: [evAuth.id]
  });

  graphService.addEdge(caseId, {
    id: 'rel-init-proc',
    source: accRahul.id,
    target: evProcess.id,
    type: 'INITIATED',
    status: 'OBSERVED',
    cost: 1.0,
    evidenceRefs: [evAuditd.id]
  });

  // Event -> Entity (Targets / Accessed)
  graphService.addEdge(caseId, {
    id: 'rel-target-proddb',
    source: evLogin.id,
    target: srvProdDB.id,
    type: 'TARGETED',
    status: 'OBSERVED',
    cost: 1.0,
    evidenceRefs: [evAuth.id]
  });

  graphService.addEdge(caseId, {
    id: 'rel-proc-target-srv',
    source: evProcess.id,
    target: srvProdDB.id,
    type: 'AFFECTED',
    status: 'OBSERVED',
    cost: 1.0,
    evidenceRefs: [evAuditd.id]
  });

  graphService.addEdge(caseId, {
    id: 'rel-proc-created-file',
    source: evProcess.id,
    target: fileCustomerRecords.id,
    type: 'CREATED',
    status: 'OBSERVED',
    cost: 1.0,
    evidenceRefs: [evAuditd.id]
  });

  graphService.addEdge(caseId, {
    id: 'rel-event-access-file',
    source: evFileAccess.id,
    target: fileCustomerRecords.id,
    type: 'ACCESSED',
    status: 'OBSERVED',
    cost: 1.0,
    evidenceRefs: [evAuditd.id]
  });

  graphService.addEdge(caseId, {
    id: 'rel-event-transfer-file',
    source: evFileTransfer.id,
    target: fileCustomerRecords.id,
    type: 'USED',
    status: 'OBSERVED',
    cost: 1.0,
    evidenceRefs: [evNet.id]
  });

  graphService.addEdge(caseId, {
    id: 'rel-transfer-target-ext',
    source: evFileTransfer.id,
    target: ipExternal.id,
    type: 'CONNECTED_TO',
    status: 'OBSERVED',
    cost: 1.0,
    evidenceRefs: [evNet.id]
  });

  graphService.addEdge(caseId, {
    id: 'rel-extip-extdev',
    source: ipExternal.id,
    target: devExternalMac.id,
    type: 'CONNECTED_TO',
    status: 'OBSERVED',
    cost: 1.0,
    evidenceRefs: [evNet.id]
  });

  graphService.addEdge(caseId, {
    id: 'rel-logout-srv',
    source: evLogout.id,
    target: srvProdDB.id,
    type: 'TARGETED',
    status: 'OBSERVED',
    cost: 1.0,
    evidenceRefs: [evAuth.id]
  });

  // Event -> Event (Causality & Temporal Chains)
  graphService.addEdge(caseId, {
    id: 'rel-ev-chain-1',
    source: evLogin.id,
    target: evProcess.id,
    type: 'PRECEDED',
    status: 'OBSERVED',
    cost: 1.0,
    evidenceRefs: [evAuth.id, evAuditd.id]
  });

  graphService.addEdge(caseId, {
    id: 'rel-ev-chain-2',
    source: evProcess.id,
    target: evFileAccess.id,
    type: 'CAUSED',
    status: 'OBSERVED',
    cost: 1.0,
    evidenceRefs: [evAuditd.id]
  });

  graphService.addEdge(caseId, {
    id: 'rel-ev-chain-3',
    source: evFileAccess.id,
    target: evFileTransfer.id,
    type: 'TRIGGERED',
    status: 'OBSERVED',
    cost: 1.0,
    evidenceRefs: [evNet.id, evAuditd.id]
  });

  graphService.addEdge(caseId, {
    id: 'rel-ev-chain-4',
    source: evFileTransfer.id,
    target: evLogout.id,
    type: 'PRECEDED',
    status: 'OBSERVED',
    cost: 1.0,
    evidenceRefs: [evAuth.id]
  });

  // Irrelevant Subgraph Connections
  graphService.addEdge(caseId, {
    id: 'rel-alex-workstation',
    source: personAlex.id,
    target: devWorkstationDev.id,
    type: 'USES',
    status: 'OBSERVED',
    cost: 1.0,
    evidenceRefs: [evInterview.id]
  });

  graphService.addEdge(caseId, {
    id: 'rel-alex-ev-doc',
    source: personAlex.id,
    target: evDocAccess.id,
    type: 'PERFORMED',
    status: 'OBSERVED',
    cost: 1.0,
    evidenceRefs: [evInterview.id]
  });

  graphService.addEdge(caseId, {
    id: 'rel-evdoc-readme',
    source: evDocAccess.id,
    target: fileReadme.id,
    type: 'ACCESSED',
    status: 'OBSERVED',
    cost: 1.0,
    evidenceRefs: [evInterview.id]
  });

  // Explicit Evidence Contradiction:
  // CCTV (ev-cctv-004) CONTRADICTS interview statement (ev-interview-005) regarding physical location at 14:15 UTC.
  graphService.addEdge(caseId, {
    id: 'rel-ev-contradiction',
    source: evCctv.id,
    target: evInterview.id,
    type: 'CONTRADICTS',
    status: 'OBSERVED',
    cost: 1.0,
    evidenceRefs: [evCctv.id],
    properties: {
      investigatorNote:
        'CCTV footage positively identifies Rahul Kumar eating in cafeteria at 14:15 UTC, contradicting his statement that he was at his workstation operating Laptop-RK-01 during the unauthorized login.'
    }
  });

  // Hypothesized relationship (investigator hypothesis: compromised credentials or automated implant)
  graphService.addEdge(caseId, {
    id: 'rel-hypo-implant',
    source: devLaptopRK.id,
    target: devExternalMac.id,
    type: 'ASSOCIATED_WITH',
    status: 'HYPOTHESIZED',
    cost: 3.0,
    confidence: 0.45,
    evidenceRefs: [],
    properties: {
      hypothesis: 'Possible remote access trojan (RAT) or relay proxy installed on Laptop-RK-01'
    }
  });

  // 7. Seed initial possibilities & algorithms
  try {
    const possibilityRepo = new PossibilityRepository(db);
    const algorithmRepo = new AlgorithmRepository(db);
    const resolutionRepo = new ResolutionRepository(db);
    const analysisEngine = new GraphAnalysisEngine(algorithmRepo);
    const possibilityEngine = new PossibilityEngine(possibilityRepo, analysisEngine);

    const baseGraph = graphService.getGraph(caseId);
    const candidates = resolutionRepo.getByCaseId(caseId);

    const generated = possibilityEngine.generatePossibilities(caseId, baseGraph, candidates, { maxPossibilities: 10 });
    console.log(`Initialized ${generated.survivingCount} initial possibility branches for investigation.`);
  } catch (err) {
    console.error('Failed to generate seed possibilities:', err);
  }

  console.log(`Seed graph successfully populated for case '${caseId}'!`);
  console.log(
    `Summary: ${graphService.getGraph(caseId).nodes.length} nodes, ${
      graphService.getGraph(caseId).edges.length
    } edges.`
  );

  return { caseId };
}

import { fileURLToPath } from 'node:url';

// Allow direct CLI execution: tsx src/infrastructure/seed.ts
const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMain || process.argv.includes('--run') || !process.env.VITEST) {
  try {
    seedDatabase();
  } catch (err) {
    console.error('Seed execution error:', err);
  } finally {
    closeDatabase();
  }
}


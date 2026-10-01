import { v4 as uuidv4 } from 'uuid';
import { ImportPayload } from './import-service.js';

export interface ExtractionInput {
  rawText: string;
  sourceName: string;
  evidenceType: string;
}

/**
 * AI / Automated Extraction Service.
 * Implements Section 31 (AI Boundary):
 * - Treats raw text, incident reports, witness interviews, and logs as untrusted input
 * - Produces an intermediate structured representation
 * - Explicitly marks all extracted entities/events with `aiExtracted: true`
 * - Output must NEVER bypass schema and direction validation
 */
export class AiExtractionService {
  /**
   * Extracts candidate entities, events, relationships, and evidence from raw evidence text.
   */
  extractStructuredCandidates(input: ExtractionInput): ImportPayload {
    const { rawText, sourceName, evidenceType } = input;
    const now = new Date().toISOString();

    const evidenceId = `ev-extracted-${uuidv4().slice(0, 8)}`;
    const candidateEvidence = [
      {
        id: evidenceId,
        category: 'EVIDENCE' as const,
        type: evidenceType || 'LOG',
        label: `Evidence: ${sourceName || 'Case Ingestion'}`,
        source: {
          name: sourceName || 'Ingested Document',
          kind: 'SYSTEM' as const
        },
        reliability: 0.90,
        collectionTime: now,
        metadata: {
          aiExtracted: true,
          untrusted: true,
          extractedAt: now
        }
      }
    ];

    const nodes: any[] = [];
    const events: any[] = [];
    const edges: any[] = [];
    const seenNodeIds = new Set<string>();

    const addNode = (node: any) => {
      if (!seenNodeIds.has(node.id)) {
        seenNodeIds.add(node.id);
        nodes.push(node);
      }
    };

    // Split text into lines/sentences
    const sentences = rawText
      .split(/(?<=[.!?\n])\s+/)
      .map(s => s.trim())
      .filter(s => s.length > 0);

    for (const sentence of sentences) {
      const timestamp = this.extractTimestamp(sentence) || now;

      // 1. Pattern: SSH / Auth Log
      // Example: "Accepted publickey for rkumar-adm from 10.0.4.15 port 22 ssh2"
      const authMatch = sentence.match(/(Accepted|Failed)\s+(publickey|password)\s+for\s+(\S+)\s+from\s+(\d+\.\d+\.\d+\.\d+)/i);
      if (authMatch) {
        const [, status, method, accountName, ipAddr] = authMatch;
        const accId = `ent-acc-${accountName.replace(/[^a-zA-Z0-9]/g, '-')}`;
        const ipId = `ent-ip-${ipAddr.replace(/[^0-9]/g, '-')}`;
        const eventId = `ev-login-${uuidv4().slice(0, 8)}`;

        addNode({
          id: accId,
          category: 'ENTITY',
          type: 'ACCOUNT',
          label: accountName,
          properties: { authMethod: method },
          metadata: { aiExtracted: true, rawSnippet: sentence }
        });

        addNode({
          id: ipId,
          category: 'ENTITY',
          type: 'IP_ADDRESS',
          label: ipAddr,
          properties: {},
          metadata: { aiExtracted: true, rawSnippet: sentence }
        });

        events.push({
          id: eventId,
          category: 'EVENT',
          type: 'LOGIN',
          label: `${status} Login for ${accountName}`,
          time: { start: timestamp, precision: 'SECOND' },
          properties: { status, method },
          metadata: { aiExtracted: true, rawSnippet: sentence }
        });

        edges.push({
          id: `edge-${uuidv4().slice(0, 8)}`,
          source: accId,
          target: eventId,
          type: 'PERFORMED',
          status: 'OBSERVED',
          cost: 1.0,
          evidenceRefs: [evidenceId],
          properties: { extractionConfidence: 0.95 }
        });

        edges.push({
          id: `edge-${uuidv4().slice(0, 8)}`,
          source: eventId,
          target: ipId,
          type: 'CONNECTED_TO',
          status: 'OBSERVED',
          cost: 1.0,
          evidenceRefs: [evidenceId],
          properties: { extractionConfidence: 0.90 }
        });
        continue;
      }

      // 2. Pattern: Natural Language Person action on target (Server, Database, File)
      // Example: "Rahul Kumar accessed Server-Prod-01" or "Arjun Sharma connected to Database-Core"
      const personActionMatch = sentence.match(/([A-Z][a-z]+ [A-Z][a-z]+)\s+(accessed|connected to|logged into|modified|queried|deleted|transferred)\s+(?:the\s+)?([A-Za-z0-9_.-]+)/i);
      if (personActionMatch) {
        const [, personName, action, targetName] = personActionMatch;
        const personId = `ent-person-${personName.toLowerCase().replace(/\s+/g, '-')}`;
        const targetType = targetName.toLowerCase().includes('db') || targetName.toLowerCase().includes('database') || targetName.toLowerCase().includes('server')
          ? 'SERVER'
          : targetName.includes('.') ? 'FILE' : 'SERVER';
        const targetId = `ent-target-${targetName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
        const eventId = `ev-action-${uuidv4().slice(0, 8)}`;

        addNode({
          id: personId,
          category: 'ENTITY',
          type: 'PERSON',
          label: personName,
          properties: {},
          metadata: { aiExtracted: true, rawSnippet: sentence }
        });

        addNode({
          id: targetId,
          category: 'ENTITY',
          type: targetType,
          label: targetName,
          properties: {},
          metadata: { aiExtracted: true, rawSnippet: sentence }
        });

        const evType = action.toLowerCase().includes('logged') ? 'LOGIN'
          : action.toLowerCase().includes('connected') ? 'NETWORK_CONNECTION'
          : 'DATA_ACCESS';

        events.push({
          id: eventId,
          category: 'EVENT',
          type: evType,
          label: `${personName} ${action} ${targetName}`,
          time: { start: timestamp, precision: 'MINUTE' },
          properties: { action },
          metadata: { aiExtracted: true, rawSnippet: sentence }
        });

        // Person -> PERFORMED -> Event
        edges.push({
          id: `edge-${uuidv4().slice(0, 8)}`,
          source: personId,
          target: eventId,
          type: 'PERFORMED',
          status: 'OBSERVED',
          cost: 1.0,
          evidenceRefs: [evidenceId],
          properties: { extractionConfidence: 0.92 }
        });

        // Event -> ACCESSED/CONNECTED_TO/TARGETED -> Target
        edges.push({
          id: `edge-${uuidv4().slice(0, 8)}`,
          source: eventId,
          target: targetId,
          type: evType === 'NETWORK_CONNECTION' ? 'CONNECTED_TO' : 'ACCESSED',
          status: 'OBSERVED',
          cost: 1.0,
          evidenceRefs: [evidenceId],
          properties: { extractionConfidence: 0.88 }
        });
        continue;
      }

      // 3. Pattern: File Access / Process Execution
      // Example: "2026-09-10 14:20:10 pg_dump accessed /tmp/customer_records_q3.sql"
      const fileMatch = sentence.match(/(accessed|read|created|deleted|opened)\s+(\S+\.[a-zA-Z0-9]+|\/\S+)/i);
      if (fileMatch) {
        const [, action, filePath] = fileMatch;
        const fileId = `ent-file-${uuidv4().slice(0, 8)}`;
        const eventId = `ev-file-${uuidv4().slice(0, 8)}`;

        const eventType = action.toLowerCase() === 'created' ? 'FILE_CREATION' :
                          action.toLowerCase() === 'deleted' ? 'FILE_DELETION' : 'FILE_ACCESS';
        const edgeType = action.toLowerCase() === 'created' ? 'CREATED' :
                         action.toLowerCase() === 'deleted' ? 'DELETED' : 'ACCESSED';

        addNode({
          id: fileId,
          category: 'ENTITY',
          type: 'FILE',
          label: filePath.split('/').pop() || filePath,
          properties: { path: filePath },
          metadata: { aiExtracted: true, rawSnippet: sentence }
        });

        events.push({
          id: eventId,
          category: 'EVENT',
          type: eventType,
          label: `${eventType} on ${filePath.split('/').pop()}`,
          time: { start: timestamp, precision: 'SECOND' },
          properties: { action },
          metadata: { aiExtracted: true, rawSnippet: sentence }
        });

        edges.push({
          id: `edge-${uuidv4().slice(0, 8)}`,
          source: eventId,
          target: fileId,
          type: edgeType,
          status: 'OBSERVED',
          cost: 1.0,
          evidenceRefs: [evidenceId],
          properties: { extractionConfidence: 0.92 }
        });
        continue;
      }

      // 4. Pattern: Network connection between 2 IPs or servers
      // Example: "10.0.1.5 connected to 10.0.2.100"
      const ipConnMatch = sentence.match(/(\d+\.\d+\.\d+\.\d+)\s+connected to\s+(\d+\.\d+\.\d+\.\d+)/i);
      if (ipConnMatch) {
        const [, ip1, ip2] = ipConnMatch;
        const ip1Id = `ent-ip-${ip1.replace(/[^0-9]/g, '-')}`;
        const ip2Id = `ent-ip-${ip2.replace(/[^0-9]/g, '-')}`;
        const connEventId = `ev-net-${uuidv4().slice(0, 8)}`;

        addNode({
          id: ip1Id,
          category: 'ENTITY',
          type: 'IP_ADDRESS',
          label: ip1,
          properties: {},
          metadata: { aiExtracted: true, rawSnippet: sentence }
        });

        addNode({
          id: ip2Id,
          category: 'ENTITY',
          type: 'IP_ADDRESS',
          label: ip2,
          properties: {},
          metadata: { aiExtracted: true, rawSnippet: sentence }
        });

        events.push({
          id: connEventId,
          category: 'EVENT',
          type: 'NETWORK_CONNECTION',
          label: `Connection ${ip1} -> ${ip2}`,
          time: { start: timestamp, precision: 'SECOND' },
          properties: {},
          metadata: { aiExtracted: true, rawSnippet: sentence }
        });

        edges.push({
          id: `edge-${uuidv4().slice(0, 8)}`,
          source: ip1Id,
          target: connEventId,
          type: 'PERFORMED',
          status: 'OBSERVED',
          cost: 1.0,
          evidenceRefs: [evidenceId],
          properties: { extractionConfidence: 0.90 }
        });

        edges.push({
          id: `edge-${uuidv4().slice(0, 8)}`,
          source: connEventId,
          target: ip2Id,
          type: 'CONNECTED_TO',
          status: 'OBSERVED',
          cost: 1.0,
          evidenceRefs: [evidenceId],
          properties: { extractionConfidence: 0.90 }
        });
        continue;
      }

      // 5. Pattern: Generic Email Addresses
      const emailMatch = sentence.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
      if (emailMatch) {
        addNode({
          id: `ent-email-${uuidv4().slice(0, 8)}`,
          category: 'ENTITY',
          type: 'EMAIL',
          label: emailMatch[1],
          properties: {},
          metadata: { aiExtracted: true, rawSnippet: sentence }
        });
      }
    }

    return {
      evidence: candidateEvidence,
      nodes,
      events,
      edges
    };
  }

  private extractTimestamp(line: string): string | null {
    const isoMatch = line.match(/\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(\.\d+)?Z?/);
    if (isoMatch) {
      return new Date(isoMatch[0].replace(' ', 'T')).toISOString();
    }
    return null;
  }
}

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
 * - Treats raw text/logs as untrusted input
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
        label: `Evidence: ${sourceName}`,
        source: {
          name: sourceName,
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

    const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // 1. Pattern: SSH / Auth Log
      // Example: "Accepted publickey for rkumar-adm from 10.0.4.15 port 22 ssh2"
      const authMatch = line.match(/(Accepted|Failed)\s+(publickey|password)\s+for\s+(\S+)\s+from\s+(\d+\.\d+\.\d+\.\d+)/i);
      if (authMatch) {
        const [, status, method, accountName, ipAddr] = authMatch;

        const accId = `ent-acc-${accountName.replace(/[^a-zA-Z0-9]/g, '-')}`;
        const ipId = `ent-ip-${ipAddr.replace(/[^0-9]/g, '-')}`;
        const eventId = `ev-login-${uuidv4().slice(0, 8)}`;

        nodes.push({
          id: accId,
          category: 'ENTITY',
          type: 'ACCOUNT',
          label: accountName,
          properties: { authMethod: method },
          metadata: { aiExtracted: true, rawSnippet: line }
        });

        nodes.push({
          id: ipId,
          category: 'ENTITY',
          type: 'IP_ADDRESS',
          label: ipAddr,
          properties: {},
          metadata: { aiExtracted: true, rawSnippet: line }
        });

        events.push({
          id: eventId,
          category: 'EVENT',
          type: 'LOGIN',
          label: `${status} Login for ${accountName}`,
          time: {
            start: this.extractTimestamp(line) || now,
            precision: 'SECOND'
          },
          properties: { status, method },
          metadata: { aiExtracted: true, rawSnippet: line }
        });

        // Valid directions: ENTITY -> PERFORMED -> EVENT
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

        // Valid direction: EVENT -> CONNECTED_TO -> ENTITY
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

      // 2. Pattern: File Access / Process Execution
      // Example: "2026-09-10 14:20:10 pg_dump accessed /tmp/customer_records_q3.sql"
      const fileMatch = line.match(/(accessed|read|created|deleted|opened)\s+(\S+)/i);
      if (fileMatch) {
        const [, action, filePath] = fileMatch;
        const fileId = `ent-file-${uuidv4().slice(0, 8)}`;
        const eventId = `ev-file-${uuidv4().slice(0, 8)}`;

        const eventType = action.toLowerCase() === 'created' ? 'FILE_CREATION' :
                          action.toLowerCase() === 'deleted' ? 'FILE_DELETION' : 'FILE_ACCESS';
        const edgeType = action.toLowerCase() === 'created' ? 'CREATED' :
                         action.toLowerCase() === 'deleted' ? 'DELETED' : 'ACCESSED';

        nodes.push({
          id: fileId,
          category: 'ENTITY',
          type: 'FILE',
          label: filePath.split('/').pop() || filePath,
          properties: { path: filePath },
          metadata: { aiExtracted: true, rawSnippet: line }
        });

        events.push({
          id: eventId,
          category: 'EVENT',
          type: eventType,
          label: `${eventType} on ${filePath.split('/').pop()}`,
          time: {
            start: this.extractTimestamp(line) || now,
            precision: 'SECOND'
          },
          properties: { action },
          metadata: { aiExtracted: true, rawSnippet: line }
        });

        // Valid direction: EVENT -> ACCESSED/CREATED/DELETED -> ENTITY
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

      // 3. Pattern: Generic Entity Mentions
      const emailMatch = line.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
      if (emailMatch) {
        nodes.push({
          id: `ent-email-${uuidv4().slice(0, 8)}`,
          category: 'ENTITY',
          type: 'EMAIL',
          label: emailMatch[1],
          properties: {},
          metadata: { aiExtracted: true, rawSnippet: line }
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
    // Look for ISO timestamp: 2026-09-10T14:15:00Z or 2026-09-10 14:15:00
    const isoMatch = line.match(/\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(\.\d+)?Z?/);
    if (isoMatch) {
      return new Date(isoMatch[0].replace(' ', 'T')).toISOString();
    }
    return null;
  }
}

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

    const runSalt = uuidv4().slice(0, 8);
    const toId = (prefix: string, name: string) => `${prefix}-${runSalt}-${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;

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
        const accId = toId('ent-acc', accountName);
        const ipId = toId('ent-ip', ipAddr);
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

      // 2. Pattern: CCTV / Surveillance Camera Observation
      // Example: "Building B Cafeteria CCTV shows a subject resembling Rahul Kumar at 14:20:00."
      const cctvMatch = sentence.match(/([A-Za-z0-9_\s.-]+?(?:CCTV|Camera|Surveillance|Feed))\s+(?:shows|recorded|captured|observed)\s+(?:a subject resembling\s+)?([A-Z][a-z]+ [A-Z][a-z]+)/i);
      if (cctvMatch) {
        const [, cameraLabel, personName] = cctvMatch;
        const camClean = cameraLabel.trim();
        const camId = toId('ent-cam', camClean);
        const personId = toId('ent-person', personName);
        const eventId = `ev-sighting-${uuidv4().slice(0, 8)}`;

        addNode({
          id: camId,
          category: 'ENTITY',
          type: 'DEVICE',
          label: camClean,
          properties: { role: 'SURVEILLANCE' },
          metadata: { aiExtracted: true, rawSnippet: sentence }
        });

        addNode({
          id: personId,
          category: 'ENTITY',
          type: 'PERSON',
          label: personName,
          properties: {},
          metadata: { aiExtracted: true, rawSnippet: sentence }
        });

        events.push({
          id: eventId,
          category: 'EVENT',
          type: 'COMMUNICATION',
          label: `Visual sighting of ${personName} on ${camClean}`,
          time: { start: timestamp, precision: 'SECOND' },
          properties: { camera: camClean, subject: personName },
          metadata: { aiExtracted: true, rawSnippet: sentence }
        });

        edges.push({
          id: `edge-${uuidv4().slice(0, 8)}`,
          source: personId,
          target: eventId,
          type: 'PARTICIPATED_IN',
          status: 'OBSERVED',
          cost: 1.0,
          evidenceRefs: [evidenceId],
          properties: { extractionConfidence: 0.95 }
        });

        edges.push({
          id: `edge-${uuidv4().slice(0, 8)}`,
          source: eventId,
          target: camId,
          type: 'CONNECTED_TO',
          status: 'OBSERVED',
          cost: 1.0,
          evidenceRefs: [evidenceId],
          properties: { extractionConfidence: 0.95 }
        });
        continue;
      }

      // 3. Pattern: Passive target access under credential / by user
      // Example: "Terminal Alpha was accessed under credential rkumar-adm"
      const passiveAccessMatch = sentence.match(/([A-Z][A-Za-z0-9_\s-]+?)\s+was\s+(accessed|logged into|queried)\s+(?:under credential|by user|by)\s+([A-Za-z0-9_.-]+)/i);
      if (passiveAccessMatch) {
        const [, targetLabel, action, actorLabel] = passiveAccessMatch;
        const targetClean = targetLabel.replace(/^(?:At\s+\d{1,2}:\d{2}(?::\d{2})?,?\s*)/i, '').trim();
        const actorClean = actorLabel.replace(/[.,]$/, '').trim();
        const targetId = toId('ent-device', targetClean);
        const isAccount = actorClean.includes('-') || actorClean.includes('_') || /^[a-z]+$/.test(actorClean);
        const actorId = isAccount ? toId('ent-acc', actorClean) : toId('ent-person', actorClean);
        const eventId = `ev-access-${uuidv4().slice(0, 8)}`;

        addNode({
          id: targetId,
          category: 'ENTITY',
          type: 'DEVICE',
          label: targetClean,
          properties: {},
          metadata: { aiExtracted: true, rawSnippet: sentence }
        });

        addNode({
          id: actorId,
          category: 'ENTITY',
          type: isAccount ? 'ACCOUNT' : 'PERSON',
          label: actorClean,
          properties: {},
          metadata: { aiExtracted: true, rawSnippet: sentence }
        });

        events.push({
          id: eventId,
          category: 'EVENT',
          type: 'LOGIN',
          label: `${targetClean} accessed under ${actorClean}`,
          time: { start: timestamp, precision: 'SECOND' },
          properties: { action, actor: actorClean, target: targetClean },
          metadata: { aiExtracted: true, rawSnippet: sentence }
        });

        edges.push({
          id: `edge-${uuidv4().slice(0, 8)}`,
          source: actorId,
          target: eventId,
          type: 'PERFORMED',
          status: 'OBSERVED',
          cost: 1.0,
          evidenceRefs: [evidenceId],
          properties: { extractionConfidence: 0.94 }
        });

        edges.push({
          id: `edge-${uuidv4().slice(0, 8)}`,
          source: eventId,
          target: targetId,
          type: 'ACCESSED',
          status: 'OBSERVED',
          cost: 1.0,
          evidenceRefs: [evidenceId],
          properties: { extractionConfidence: 0.94 }
        });
        continue;
      }

      // 4. Pattern: File Creation / Transfer / Exfiltration
      // Example: "financial_export_2026.csv was transferred to external Drive-X"
      const fileTransferMatch = sentence.match(/([A-Za-z0-9_.-]+\.[a-zA-Z0-9]+)\s+was\s+(transferred to|copied to|exported to|created on|created)\s+(?:external\s+)?([A-Za-z0-9_.-]+)?/i);
      if (fileTransferMatch) {
        const [, fileName, action, destName] = fileTransferMatch;
        const fileClean = fileName.trim();
        const destClean = destName ? destName.replace(/[.,]$/, '').trim() : null;
        const fileId = toId('ent-file', fileClean);
        const eventId = `ev-file-${uuidv4().slice(0, 8)}`;
        const isTransfer = action.includes('transferred') || action.includes('copied') || action.includes('exported');

        addNode({
          id: fileId,
          category: 'ENTITY',
          type: 'FILE',
          label: fileClean,
          properties: {},
          metadata: { aiExtracted: true, rawSnippet: sentence }
        });

        let destId: string | null = null;
        if (destClean) {
          destId = toId('ent-dest', destClean);
          addNode({
            id: destId,
            category: 'ENTITY',
            type: 'DEVICE',
            label: destClean,
            properties: {},
            metadata: { aiExtracted: true, rawSnippet: sentence }
          });
        }

        events.push({
          id: eventId,
          category: 'EVENT',
          type: isTransfer ? 'FILE_TRANSFER' : 'FILE_CREATION',
          label: `${fileClean} ${action}${destClean ? ` ${destClean}` : ''}`,
          time: { start: timestamp, precision: 'SECOND' },
          properties: { action, file: fileClean, destination: destClean },
          metadata: { aiExtracted: true, rawSnippet: sentence }
        });

        edges.push({
          id: `edge-${uuidv4().slice(0, 8)}`,
          source: eventId,
          target: fileId,
          type: isTransfer ? 'ACCESSED' : 'CREATED',
          status: 'OBSERVED',
          cost: 1.0,
          evidenceRefs: [evidenceId],
          properties: { extractionConfidence: 0.95 }
        });

        if (destId) {
          edges.push({
            id: `edge-${uuidv4().slice(0, 8)}`,
            source: eventId,
            target: destId,
            type: 'CONNECTED_TO',
            status: 'OBSERVED',
            cost: 1.0,
            evidenceRefs: [evidenceId],
            properties: { extractionConfidence: 0.92 }
          });
        }
        continue;
      }

      // 5. Pattern: Person Movement / Entered / Exited Location
      // Example: "Rahul Kumar entered the secure corridor." or "Rahul Kumar exited via North Stairwell."
      const movementMatch = sentence.match(/([A-Z][a-z]+ [A-Z][a-z]+)\s+(entered|exited(?: via)?|visited|moved into|was seen in)\s+(?:the\s+)?([A-Za-z0-9_\s-]+?)(?:\.|$|\s+at)/i);
      if (movementMatch) {
        const [, personName, action, locationName] = movementMatch;
        const locClean = locationName.replace(/[.,]$/, '').trim();
        const personId = toId('ent-person', personName);
        const locId = toId('ent-loc', locClean);
        const eventId = `ev-move-${uuidv4().slice(0, 8)}`;

        addNode({
          id: personId,
          category: 'ENTITY',
          type: 'PERSON',
          label: personName,
          properties: {},
          metadata: { aiExtracted: true, rawSnippet: sentence }
        });

        addNode({
          id: locId,
          category: 'ENTITY',
          type: 'LOCATION',
          label: locClean,
          properties: {},
          metadata: { aiExtracted: true, rawSnippet: sentence }
        });

        events.push({
          id: eventId,
          category: 'EVENT',
          type: 'LOCATION_CHANGE',
          label: `${personName} ${action} ${locClean}`,
          time: { start: timestamp, precision: 'SECOND' },
          properties: { action, person: personName, location: locClean },
          metadata: { aiExtracted: true, rawSnippet: sentence }
        });

        edges.push({
          id: `edge-${uuidv4().slice(0, 8)}`,
          source: personId,
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
          target: locId,
          type: 'TARGETED',
          status: 'OBSERVED',
          cost: 1.0,
          evidenceRefs: [evidenceId],
          properties: { extractionConfidence: 0.90 }
        });
        continue;
      }

      // 6. Pattern: Natural Language Person action on target (Server, Database, File)
      // Example: "Rahul Kumar accessed Server-Prod-01" or "Arjun Sharma connected to Database-Core"
      const personActionMatch = sentence.match(/([A-Z][a-z]+ [A-Z][a-z]+)\s+(accessed|connected to|logged into|modified|queried|deleted|transferred)\s+(?:the\s+)?([A-Za-z0-9_.-]+)/i);
      if (personActionMatch) {
        const [, personName, action, targetName] = personActionMatch;
        const personId = toId('ent-person', personName);
        const targetType = targetName.toLowerCase().includes('db') || targetName.toLowerCase().includes('database') || targetName.toLowerCase().includes('server')
          ? 'SERVER'
          : targetName.includes('.') ? 'FILE' : 'SERVER';
        const targetId = toId('ent-target', targetName);
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
        const ip1Id = toId('ent-ip', ip1);
        const ip2Id = toId('ent-ip', ip2);
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

  async extractWithLLM(input: ExtractionInput): Promise<ImportPayload> {
    const apiKey = process.env.GEMINI_API_KEY || process.env.LLM_API_KEY || process.env.DEEPSEEK_API_KEY || process.env.OPENCODE_ZEN_API_KEY;
    const baseUrl = process.env.LLM_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta/openai';
    const model = process.env.LLM_MODEL || 'gemini-2.5-flash-lite';

    if (!apiKey) {
      return this.extractStructuredCandidates(input);
    }

    try {
      const prompt = `You are an expert forensic intelligence extraction engine.
Analyze the following investigative narrative, report, or telemetry and extract structured entities, events, and causal relations.
Extract concise, essential entities, chronological events, and key causal edges. Avoid redundant duplicates.

Return a JSON object conforming strictly to this format:
{
  "entities": [
    {
      "name": "string (unique descriptive name/label)",
      "type": "PERSON | ACCOUNT | DEVICE | IP_ADDRESS | LOCATION | PHONE_NUMBER | EMAIL | VEHICLE | FILE | SERVER | DOMAIN",
      "role": "string (e.g. SUSPECT, WITNESS, TARGET, VICTIM, WEAPON, CORRIDOR)"
    }
  ],
  "events": [
    {
      "name": "string (clear action label)",
      "type": "LOGIN | LOGOUT | FILE_ACCESS | FILE_CREATION | FILE_TRANSFER | COMMUNICATION | TRANSACTION | LOCATION_CHANGE | DEVICE_CONNECTION | NETWORK_CONNECTION | DATA_ACCESS",
      "time": "YYYY-MM-DDTHH:MM:SSZ or HH:MM:SS",
      "actor": "string (name of entity who acted, or empty)",
      "target": "string (name of entity affected, or empty)"
    }
  ],
  "relationships": [
    {
      "source": "string (entity or event name)",
      "target": "string (entity or event name)",
      "type": "PERFORMED | PARTICIPATED_IN | CONNECTED_TO | CAUSES | TARGETS | LOCATED_AT | USES | OWNS"
    }
  ]
}

Investigative Text:
"""
${input.rawText}
"""`;

      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: 'You are an advanced forensic intelligence extraction model. Respond with complete, valid JSON only.' },
            { role: 'user', content: prompt }
          ],
          response_format: { type: 'json_object' },
          temperature: 0.1,
          max_tokens: 4096
        }),
        signal: AbortSignal.timeout(30000)
      });

      if (!response.ok) {
        console.warn(`[AI Extraction] LLM returned ${response.status}, falling back to deterministic extraction.`);
        return this.extractStructuredCandidates(input);
      }

      const resJson: any = await response.json();
      const content = resJson.choices?.[0]?.message?.content;
      if (!content) {
        return this.extractStructuredCandidates(input);
      }

      const parsed = JSON.parse(content);
      const mapped = this.mapLlmResultToImportPayload(parsed, input);
      if ((mapped.nodes?.length || 0) > 0 || (mapped.events?.length || 0) > 0) {
        return mapped;
      }
      return this.extractStructuredCandidates(input);
    } catch (err) {
      console.warn('[AI Extraction] LLM extraction failed, using deterministic engine fallback:', err);
      return this.extractStructuredCandidates(input);
    }
  }

  private mapLlmResultToImportPayload(llmOutput: any, input: ExtractionInput): ImportPayload {
    const now = new Date().toISOString();
    const runSalt = uuidv4().slice(0, 8);
    const evidenceId = `ev-extracted-${runSalt}`;

    const candidateEvidence = [
      {
        id: evidenceId,
        category: 'EVIDENCE' as const,
        type: input.evidenceType || 'DOCUMENT',
        label: `Evidence: ${input.sourceName || 'Case Ingestion'}`,
        source: {
          name: input.sourceName || 'Ingested Document',
          kind: 'SYSTEM' as const
        },
        reliability: 0.95,
        collectionTime: now,
        metadata: {
          aiExtracted: true,
          model: process.env.LLM_MODEL || 'deepseek-chat',
          extractedAt: now
        }
      }
    ];

    const nodes: any[] = [];
    const events: any[] = [];
    const edges: any[] = [];
    const nameToId = new Map<string, { id: string; category: string }>();

    // 1. Entities
    const rawEntities = Array.isArray(llmOutput.entities) ? llmOutput.entities : [];
    const validEntityTypes = new Set(['PERSON', 'ORGANIZATION', 'ACCOUNT', 'DEVICE', 'IP_ADDRESS', 'LOCATION', 'PHONE_NUMBER', 'EMAIL', 'VEHICLE', 'FILE', 'SERVER', 'DOMAIN', 'PROCESS', 'APPLICATION']);

    for (const ent of rawEntities) {
      const name = String(ent.name || '').trim();
      if (!name) continue;
      const cleanType = String(ent.type || 'PERSON').toUpperCase();
      const finalType = validEntityTypes.has(cleanType) ? cleanType : 'PERSON';
      const entId = `ent-${runSalt}-${name.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 30)}`;

      nameToId.set(name.toLowerCase(), { id: entId, category: 'ENTITY' });
      nodes.push({
        id: entId,
        category: 'ENTITY',
        type: finalType,
        label: name,
        properties: { role: ent.role || 'FORENSIC_TARGET' },
        metadata: { aiExtracted: true, rawSource: input.sourceName }
      });
    }

    // 2. Events
    const rawEvents = Array.isArray(llmOutput.events) ? llmOutput.events : [];
    const validEventTypes = new Set(['LOGIN', 'LOGOUT', 'FILE_ACCESS', 'FILE_CREATION', 'FILE_DELETION', 'FILE_TRANSFER', 'PROCESS_EXECUTION', 'ACCOUNT_CREATION', 'ACCOUNT_MODIFICATION', 'PASSWORD_CHANGE', 'COMMUNICATION', 'TRANSACTION', 'LOCATION_CHANGE', 'DEVICE_CONNECTION', 'NETWORK_CONNECTION', 'DATA_ACCESS']);

    for (const evt of rawEvents) {
      const name = String(evt.name || '').trim();
      if (!name) continue;
      const cleanType = String(evt.type || 'COMMUNICATION').toUpperCase();
      const finalType = validEventTypes.has(cleanType) ? cleanType : 'COMMUNICATION';
      const evtId = `evt-${runSalt}-${name.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 30)}`;

      let eventTime = now;
      if (evt.time) {
        eventTime = this.extractTimestamp(String(evt.time)) || now;
      }

      nameToId.set(name.toLowerCase(), { id: evtId, category: 'EVENT' });
      events.push({
        id: evtId,
        category: 'EVENT',
        type: finalType,
        label: name,
        time: { start: eventTime, precision: 'SECOND' },
        properties: { actor: evt.actor, target: evt.target },
        metadata: { aiExtracted: true, rawSource: input.sourceName }
      });

      // Link actor to event (PERFORMED)
      if (evt.actor) {
        const actorRef = nameToId.get(String(evt.actor).toLowerCase());
        if (actorRef && actorRef.category === 'ENTITY') {
          edges.push({
            id: `edge-${uuidv4().slice(0, 8)}`,
            source: actorRef.id,
            target: evtId,
            type: 'PERFORMED',
            status: 'OBSERVED',
            cost: 1.0,
            evidenceRefs: [evidenceId],
            properties: { aiExtracted: true }
          });
        }
      }

      // Link event to target (TARGETED)
      if (evt.target) {
        const targetRef = nameToId.get(String(evt.target).toLowerCase());
        if (targetRef && targetRef.category === 'ENTITY') {
          edges.push({
            id: `edge-${uuidv4().slice(0, 8)}`,
            source: evtId,
            target: targetRef.id,
            type: 'TARGETED',
            status: 'OBSERVED',
            cost: 1.0,
            evidenceRefs: [evidenceId],
            properties: { aiExtracted: true }
          });
        }
      }
    }

    // 3. Relationships
    const rawRels = Array.isArray(llmOutput.relationships) ? llmOutput.relationships : [];
    for (const rel of rawRels) {
      const srcName = String(rel.source || '').toLowerCase();
      const tgtName = String(rel.target || '').toLowerCase();
      const src = nameToId.get(srcName);
      const tgt = nameToId.get(tgtName);

      if (src && tgt && src.id !== tgt.id) {
        let relType = String(rel.type || 'CONNECTED_TO').toUpperCase();
        // Normalize common synonym types from LLM
        if (relType === 'TARGETS' || relType === 'TARGET') relType = 'TARGETED';
        if (relType === 'CAUSES' || relType === 'CAUSE') relType = 'CAUSED';
        if (relType === 'PRECEDES' || relType === 'PRECEDE') relType = 'PRECEDED';
        if (relType === 'ACCESSES' || relType === 'ACCESS') relType = 'ACCESSED';
        if (relType === 'CREATES' || relType === 'CREATE') relType = 'CREATED';
        if (relType === 'MODIFIES' || relType === 'MODIFY') relType = 'MODIFIED';
        if (relType === 'DELETES' || relType === 'DELETE') relType = 'DELETED';
        if (relType === 'AFFECTS' || relType === 'AFFECT') relType = 'AFFECTED';

        if (src.category === 'ENTITY' && tgt.category === 'ENTITY') {
          if (!['OWNS', 'USES', 'LOCATED_AT', 'MEMBER_OF', 'ASSOCIATED_WITH', 'CONTACTED', 'CONNECTED_TO'].includes(relType)) {
            relType = 'ASSOCIATED_WITH';
          }
        } else if (src.category === 'ENTITY' && tgt.category === 'EVENT') {
          if (!['PERFORMED', 'PARTICIPATED_IN', 'INITIATED'].includes(relType)) {
            relType = 'PARTICIPATED_IN';
          }
        } else if (src.category === 'EVENT' && tgt.category === 'ENTITY') {
          if (!['TARGETED', 'AFFECTED', 'ACCESSED', 'CREATED', 'MODIFIED', 'DELETED', 'USED', 'CONNECTED_TO'].includes(relType)) {
            relType = 'TARGETED';
          }
        } else if (src.category === 'EVENT' && tgt.category === 'EVENT') {
          if (!['CAUSED', 'PRECEDED', 'DEPENDS_ON'].includes(relType)) {
            relType = 'CAUSED';
          }
        }

        edges.push({
          id: `edge-${uuidv4().slice(0, 8)}`,
          source: src.id,
          target: tgt.id,
          type: relType,
          status: 'OBSERVED',
          cost: 1.0,
          evidenceRefs: [evidenceId],
          properties: { aiExtracted: true }
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

  private extractTimestamp(line: string, fallbackDate = '2026-09-10'): string | null {
    // 1. Matches "2026-09-10 at 14:15:00" or "2026-09-10T14:15:00" or "2026-09-10 14:15:00"
    const fullMatch = line.match(/(\d{4}-\d{2}-\d{2})(?:\s+(?:at\s+)?|[T\s])(\d{2}:\d{2}(?::\d{2})?(?:\.\d+)?Z?)/i);
    if (fullMatch) {
      let t = fullMatch[2];
      if (t.length === 5) t += ':00';
      return new Date(`${fullMatch[1]}T${t.replace(/Z$/, '')}Z`).toISOString();
    }

    // 2. Matches standalone time like "At 14:18:22," or "at 14:20:00"
    const timeMatch = line.match(/\b(?:at\s+)?(\d{2}:\d{2}(?::\d{2})?)\b/i);
    if (timeMatch) {
      let t = timeMatch[1];
      if (t.length === 5) t += ':00';
      return new Date(`${fallbackDate}T${t}Z`).toISOString();
    }
    return null;
  }
}


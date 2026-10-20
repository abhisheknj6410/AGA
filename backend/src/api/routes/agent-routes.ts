import { Router, Request, Response, NextFunction } from 'express';
import { GraphService } from '../../application/graph-service.js';
import { InvestigationAgentService } from '../../application/investigation-agent-service.js';
import { CaseService } from '../../application/case-service.js';

export function createAgentRouter(
  graphService: GraphService,
  agentService: InvestigationAgentService,
  caseService?: CaseService
): Router {
  const router = Router({ mergeParams: true });

  // 1. Classical Graph & Possibility Structured Query
  router.post('/query', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { caseId } = req.params;
      const { query } = req.body;

      if (!query || typeof query !== 'string') {
        return res.status(400).json({ error: 'Field "query" is required.' });
      }

      const baseGraph = graphService.getGraph(caseId);
      const result = await agentService.processQuery(caseId, baseGraph, query);

      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  // 2. Interactive Lead Forensic Investigator Conversational Chat
  router.post('/chat', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { caseId } = req.params;
      const { message, history = [] } = req.body;

      if (!message || typeof message !== 'string') {
        return res.status(400).json({ error: 'Field "message" is required.' });
      }

      const graph = graphService.getGraph(caseId);
      let caseName = caseId;
      let caseDesc = 'Forensic investigation graph';

      if (caseService) {
        try {
          const c = caseService.getCase(caseId);
          if (c) {
            caseName = c.name;
            caseDesc = c.description || '';
          }
        } catch {
          // ignore
        }
      }

      // Format current graph facts for LLM context
      const entities = (graph.nodes || []).filter(n => n.category === 'ENTITY');
      const events = (graph.nodes || []).filter(n => n.category === 'EVENT');
      const evidence = (graph.nodes || []).filter(n => n.category === 'EVIDENCE');
      const edges = graph.edges || [];

      const entitySummary = entities.map(e => `- ${e.label} (${e.type}${e.properties?.role ? `, Role: ${e.properties.role}` : ''})`).join('\n') || 'None recorded.';
      const eventSummary = events.map(e => `- [${e.time?.start || 'No time'}] ${e.label} (${e.type})`).join('\n') || 'None recorded.';
      const evidenceSummary = evidence.map(ev => `- ${ev.label} (${ev.type}, Source: ${(ev as any).source?.name || 'Artifact'})`).join('\n') || 'None recorded.';
      const edgeSummary = edges.map(ed => {
        const src = graph.nodes?.find(n => n.id === ed.source)?.label || ed.source;
        const tgt = graph.nodes?.find(n => n.id === ed.target)?.label || ed.target;
        return `- "${src}" -[${ed.type}]-> "${tgt}"`;
      }).join('\n') || 'None recorded.';

      const isDeepSeekUrl = !process.env.LLM_BASE_URL || process.env.LLM_BASE_URL.includes('deepseek');
      const apiKey = isDeepSeekUrl
        ? (process.env.DEEPSEEK_API_KEY || process.env.OPENCODE_ZEN_API_KEY)
        : (process.env.OPENCODE_ZEN_API_KEY || process.env.DEEPSEEK_API_KEY);
      const baseUrl = process.env.LLM_BASE_URL || 'https://api.deepseek.com';
      const model = process.env.LLM_MODEL || 'deepseek-chat';

      if (apiKey) {
        try {
          const systemPrompt = `You are Senior Lead Forensic Investigator "Eve", a world-class investigative intelligence copilot and criminal profiling partner.
You are communicating directly with a detective who is actively investigating this case.

Active Case Context:
- Case Title: "${caseName}"
- Case Description: "${caseDesc}"

Confirmed Graph Evidence & Entities:
Entities:
${entitySummary}

Timeline of Events:
${eventSummary}

Evidentiary Sources:
${evidenceSummary}

Causal & Relational Links:
${edgeSummary}

Communication & Investigation Rules:
1. Speak like a seasoned, sharp, authoritative lead detective.
2. Keep answers direct, concise, and structured (lead with the definitive answer or next action; use bullet points).
3. If asked "who did it?", examine the timeline and causal links: explain who connects directly to the crime/item and who has a verified alibi.
4. If asked about alibis, verify whether the suspect's events isolate them from the crime scene (e.g. CCTV elsewhere at the exact time).
5. Highlight choke points (single events that were required for the crime to occur).
6. Conclude with 2 concrete next actions or recommendations (e.g. digital forensics, subpoenas, interrogations).`;

          const llmMessages: any[] = [
            { role: 'system', content: systemPrompt }
          ];

          // Include recent history (cap at last 6 messages)
          const recentHistory = Array.isArray(history) ? history.slice(-6) : [];
          for (const h of recentHistory) {
            if (h.role === 'user' || h.role === 'assistant') {
              llmMessages.push({ role: h.role, content: h.content });
            }
          }

          llmMessages.push({ role: 'user', content: message });

          const response = await fetch(`${baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model,
              messages: llmMessages,
              temperature: 0.2,
              max_tokens: 1024
            }),
            signal: AbortSignal.timeout(30000)
          });

          if (response.ok) {
            const data: any = await response.json();
            const reply = data.choices?.[0]?.message?.content;
            if (reply) {
              return res.json({
                reply,
                caseId,
                caseName,
                model
              });
            }
          }
        } catch (llmErr) {
          console.warn('[Investigator Chat] LLM call failed, falling back to rule-based engine:', llmErr);
        }
      }

      // Fallback: Rule-based detective reasoning
      const structuredResult = await agentService.processQuery(caseId, graph, message);
      const fallbackReply = `**Investigator Eve Analysis (Automated Graph Summary)**:

${structuredResult.factualAnswer}

**Recorded Graph Facts for "${caseName}"**:
- **Entities**: ${entities.map(e => e.label).join(', ') || 'None'}
- **Key Events**: ${events.map(e => `${e.time?.start ? `[${e.time.start}] ` : ''}${e.label}`).join('; ') || 'None'}
- **Suggested Follow-up**: ${structuredResult.suggestedFollowUps.slice(0, 2).join(' | ')}`;

      return res.json({
        reply: fallbackReply,
        caseId,
        caseName,
        model: 'deterministic-graph-fallback'
      });
    } catch (err) {
      next(err);
    }
  });

  return router;
}

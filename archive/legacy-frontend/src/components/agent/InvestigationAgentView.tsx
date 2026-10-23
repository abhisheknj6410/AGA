import React, { useState } from 'react';
import { queryAgent, extractCandidates, importJsonDataset } from '../../api/client';
import { AgentQueryResult } from '../../types/graph';
import {
  Bot,
  Send,
  Sparkles,
  Terminal,
  ArrowRight,
  CornerDownLeft,
  FileText,
  Upload,
  CheckCircle2,
  AlertCircle,
  Database,
  ShieldCheck,
  Layers,
  FileCode
} from 'lucide-react';

interface InvestigationAgentViewProps {
  caseId: string;
  onDataIngested?: () => void;
  onSwitchToGraph?: () => void;
}

const TEMPLATE_NARRATIVE = `On 2026-09-10 14:15:00, Rahul Kumar accessed Server-Prod-01.
At 2026-09-10 14:20:10, cramos-dev accessed /tmp/financial_export_2026.csv.
10.0.1.5 connected to 10.0.2.100.
Arjun Sharma connected to Database-Core at 2026-09-10 14:35:00.
Security lead investigator@defense.internal reported anomalous egress.`;

const TEMPLATE_AUTH_LOGS = `Accepted publickey for rkumar-adm from 10.0.4.15 port 22 ssh2
2026-09-10 14:22:00 created /var/log/audit/export_dump.sql
Failed password for root from 198.51.100.42 port 22 ssh2
Accepted publickey for cramos-dev from 198.51.100.88 port 2222 ssh2`;

const TEMPLATE_WITNESS = `Witness Statement - Lead Architect:
"Rahul Kumar logged into Server-Prod-01 to run routine diagnostics before the outage.
Later at 2026-09-10 15:10:00, Carlos Ramos accessed the sensitive credential vault."`;

export const InvestigationAgentView: React.FC<InvestigationAgentViewProps> = ({
  caseId,
  onDataIngested,
  onSwitchToGraph
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'INGEST' | 'QUERY'>('INGEST');

  // --- Ingestion Agent State ---
  const [rawText, setRawText] = useState(TEMPLATE_NARRATIVE);
  const [sourceName, setSourceName] = useState('incident_report_initial.txt');
  const [evidenceType, setEvidenceType] = useState('DOCUMENT');
  const [extracting, setExtracting] = useState(false);
  const [extractedPayload, setExtractedPayload] = useState<any | null>(null);
  const [committing, setCommitting] = useState(false);
  const [ingestSuccess, setIngestSuccess] = useState<any | null>(null);
  const [ingestError, setIngestError] = useState<string | null>(null);

  // --- Query Agent State ---
  const [query, setQuery] = useState('');
  const [queryLoading, setQueryLoading] = useState(false);
  const [history, setHistory] = useState<AgentQueryResult[]>([]);

  const samplePrompts = [
    'Show all connections between Rahul Kumar and Prod-DB-01',
    'Which nodes are critical bottlenecks?',
    'Why does possibility exist?',
    'What is different between possibilities?',
    'Which possibilities are temporally invalid?',
    'What evidence is common to all surviving possibilities?',
    'Match attack stages against the graph'
  ];

  const handleExtract = async () => {
    if (!rawText.trim() || extracting) return;
    setExtracting(true);
    setIngestError(null);
    setIngestSuccess(null);

    try {
      const candidates = await extractCandidates(
        caseId,
        rawText,
        sourceName.trim() || 'Manual Input',
        evidenceType
      );
      setExtractedPayload(candidates);
    } catch (err: any) {
      setIngestError(err.message || 'Failed to extract structured data.');
    } finally {
      setExtracting(false);
    }
  };

  const handleCommit = async () => {
    if (!extractedPayload || committing) return;
    setCommitting(true);
    setIngestError(null);

    try {
      const res = await importJsonDataset(caseId, extractedPayload);
      setIngestSuccess(res.counts);
      setExtractedPayload(null);
      if (onDataIngested) {
        onDataIngested();
      }
    } catch (err: any) {
      setIngestError(err.message || 'Failed to commit extracted facts to graph.');
    } finally {
      setCommitting(false);
    }
  };

  const handleSendQuery = async (textToSend?: string) => {
    const text = (textToSend || query).trim();
    if (!text || queryLoading) return;

    setQueryLoading(true);
    setQuery('');

    try {
      const res: AgentQueryResult = await queryAgent(caseId, text);
      setHistory(prev => [res, ...prev]);
    } catch (err: any) {
      setHistory(prev => [
        {
          query: text,
          intent: 'ERROR',
          factualAnswer: `Error executing query: ${err.message || 'Unknown network error'}`,
          structuredData: {},
          suggestedFollowUps: []
        },
        ...prev
      ]);
    } finally {
      setQueryLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200">
      {/* Top Header with Dual Mode Switcher */}
      <div className="h-14 border-b border-slate-200/80 dark:border-slate-800/80 px-6 flex items-center justify-between bg-white dark:bg-slate-900">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">AI Investigation Agent</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Ingest unstructured case evidence & query verified graph reachability
            </p>
          </div>
        </div>

        {/* Sub-tab segmented pill */}
        <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-xs">
          <button
            onClick={() => setActiveSubTab('INGEST')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium text-xs transition ${
              activeSubTab === 'INGEST'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Upload className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>Ingest Case Data</span>
          </button>
          <button
            onClick={() => setActiveSubTab('QUERY')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium text-xs transition ${
              activeSubTab === 'QUERY'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Terminal className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Query & Reason</span>
          </button>
        </div>
      </div>

      {/* Mode A: Ingest Case Data & Documents */}
      {activeSubTab === 'INGEST' && (
        <div className="flex-1 overflow-y-auto p-6 space-y-5 scrollbar-thin">
          <div className="max-w-4xl mx-auto space-y-5">
            {/* Explanatory card */}
            <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-indigo-700 dark:text-indigo-400 mb-1 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" /> AI Evidence Ingestion Boundary
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    Paste raw incident logs, interview transcripts, or investigative notes. The AI Agent extracts candidate entities, timestamped events, and directed relationships with formal provenance links.
                  </p>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 whitespace-nowrap">
                  Section 31 Verified
                </span>
              </div>

              {/* Template quick-pick buttons */}
              <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
                <span className="text-[11px] font-medium text-slate-400">Load sample:</span>
                <button
                  onClick={() => {
                    setRawText(TEMPLATE_NARRATIVE);
                    setSourceName('incident_narrative.txt');
                    setEvidenceType('DOCUMENT');
                  }}
                  className="px-2.5 py-1 rounded-md text-[11px] bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition"
                >
                  Incident Narrative
                </button>
                <button
                  onClick={() => {
                    setRawText(TEMPLATE_AUTH_LOGS);
                    setSourceName('auth_access.log');
                    setEvidenceType('LOG');
                  }}
                  className="px-2.5 py-1 rounded-md text-[11px] bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition"
                >
                  Auth Logs
                </button>
                <button
                  onClick={() => {
                    setRawText(TEMPLATE_WITNESS);
                    setSourceName('witness_architect.txt');
                    setEvidenceType('INTERVIEW');
                  }}
                  className="px-2.5 py-1 rounded-md text-[11px] bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition"
                >
                  Witness Interview
                </button>
              </div>
            </div>

            {/* Error & Success Banners */}
            {ingestError && (
              <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{ingestError}</span>
              </div>
            )}

            {ingestSuccess && (
              <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span className="font-medium">
                    Successfully committed {ingestSuccess.nodes} entities, {ingestSuccess.events} events, {ingestSuccess.evidence} evidence artifacts, and {ingestSuccess.edges} relationships to the evidence graph!
                  </span>
                </div>
                {onSwitchToGraph && (
                  <button
                    onClick={onSwitchToGraph}
                    className="ml-3 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition flex items-center gap-1 shadow-xs"
                  >
                    <span>View in Graph</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}

            {/* Input Form */}
            <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-500 dark:text-slate-400 font-medium mb-1 text-[11px]">
                    Source Artifact Name
                  </label>
                  <input
                    type="text"
                    value={sourceName}
                    onChange={e => setSourceName(e.target.value)}
                    placeholder="e.g. auth_access.log, interview_transcript.txt"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-800 dark:text-slate-200 text-xs focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 dark:text-slate-400 font-medium mb-1 text-[11px]">
                    Evidence Category
                  </label>
                  <select
                    value={evidenceType}
                    onChange={e => setEvidenceType(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-800 dark:text-slate-200 text-xs focus:outline-hidden focus:border-indigo-500"
                  >
                    <option value="DOCUMENT">DOCUMENT</option>
                    <option value="LOG">LOG</option>
                    <option value="NETWORK_CAPTURE">NETWORK_CAPTURE</option>
                    <option value="SYSTEM_RECORD">SYSTEM_RECORD</option>
                    <option value="INTERVIEW">INTERVIEW</option>
                    <option value="EMAIL">EMAIL</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-500 dark:text-slate-400 font-medium mb-1 text-[11px]">
                  Raw Evidence Data / Text Dump
                </label>
                <textarea
                  rows={8}
                  value={rawText}
                  onChange={e => setRawText(e.target.value)}
                  placeholder="Paste terminal output, narrative summary, incident response timeline, or raw evidence logs..."
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-slate-800 dark:text-slate-200 font-mono text-xs focus:outline-hidden focus:border-indigo-500 leading-relaxed"
                />
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={handleExtract}
                  disabled={!rawText.trim() || extracting}
                  className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-semibold text-xs shadow-xs transition flex items-center gap-2 disabled:opacity-50"
                >
                  <Sparkles className={`w-3.5 h-3.5 ${extracting ? 'animate-spin' : ''}`} />
                  <span>{extracting ? 'Extracting Structure...' : 'Extract Entities & Relationships'}</span>
                </button>
              </div>
            </div>

            {/* Extracted Staging Preview */}
            {extractedPayload && (
              <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-900/60 space-y-4 shadow-sm">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="p-1 rounded-md bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                      <Layers className="w-4 h-4" />
                    </span>
                    <div>
                      <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                        Extracted Candidate Graph Structure
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        {extractedPayload.nodes?.length || 0} Entities · {extractedPayload.events?.length || 0} Events · {extractedPayload.edges?.length || 0} Directed Relationships
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={handleCommit}
                    disabled={committing}
                    className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{committing ? 'Validating & Committing...' : 'Commit to Evidence Graph'}</span>
                  </button>
                </div>

                {/* Nodes & Events Preview Chips */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1.5">
                      Extracted Entities ({extractedPayload.nodes?.length || 0})
                    </span>
                    <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                      {extractedPayload.nodes?.map((n: any) => (
                        <div
                          key={n.id}
                          className="px-2.5 py-1 rounded-md bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between"
                        >
                          <span className="font-medium text-slate-800 dark:text-slate-200 text-[11px]">{n.label}</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-mono">
                            {n.type}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1.5">
                      Extracted Events ({extractedPayload.events?.length || 0})
                    </span>
                    <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                      {extractedPayload.events?.map((ev: any) => (
                        <div
                          key={ev.id}
                          className="px-2.5 py-1 rounded-md bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between"
                        >
                          <span className="font-medium text-slate-800 dark:text-slate-200 text-[11px] truncate max-w-[180px]">{ev.label}</span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {ev.time?.start ? new Date(ev.time.start).toLocaleTimeString() : 'No timestamp'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Relationships Preview */}
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1.5">
                    Extracted Directed Relationships ({extractedPayload.edges?.length || 0})
                  </span>
                  <div className="space-y-1 max-h-32 overflow-y-auto pr-1 font-mono text-[11px]">
                    {extractedPayload.edges?.map((e: any, idx: number) => (
                      <div
                        key={idx}
                        className="px-2.5 py-1 rounded-md bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center gap-2 text-slate-700 dark:text-slate-300"
                      >
                        <span className="truncate">{e.source}</span>
                        <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="text-indigo-600 dark:text-indigo-400 font-semibold">{e.type}</span>
                        <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">{e.target}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Mode B: Query & Reason */}
      {activeSubTab === 'QUERY' && (
        <>
          <div className="flex-1 overflow-y-auto p-6 space-y-5 scrollbar-thin">
            {/* Sample Prompt Chips */}
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-2">
                Suggested Investigation Inquiries
              </span>
              <div className="flex flex-wrap gap-1.5">
                {samplePrompts.map(prompt => (
                  <button
                    key={prompt}
                    onClick={() => handleSendQuery(prompt)}
                    disabled={queryLoading}
                    className="px-2.5 py-1.5 rounded-lg text-xs bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 transition-all flex items-center gap-1.5 shadow-xs"
                  >
                    <Sparkles className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                    <span>{prompt}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* History stream */}
            {history.length === 0 ? (
              <div className="py-16 flex flex-col items-center justify-center text-slate-400">
                <Terminal className="w-10 h-10 mb-3 text-slate-300 dark:text-slate-600 stroke-1" />
                <p className="text-xs font-medium text-slate-600 dark:text-slate-400">Ask any question regarding graph reachability, bottlenecks, or possibilities.</p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 max-w-sm text-center">
                  The agent translates inquiries into formal graph algorithms (K-shortest paths, dominator trees, min-cut, topological sorts) and presents verified facts.
                </p>
              </div>
            ) : (
              <div className="space-y-4 max-w-4xl mx-auto">
                {history.map((item, idx) => (
                  <div key={idx} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4.5 space-y-3 shadow-xs">
                    {/* User Inquiry */}
                    <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-2">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                          Query
                        </span>
                        <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">{item.query}</span>
                      </div>
                      {item.algorithmUsed && (
                        <span className="text-[10px] font-mono text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded">
                          Algo: {item.algorithmUsed}
                        </span>
                      )}
                    </div>

                    {/* Agent Answer */}
                    <div className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-line leading-relaxed font-sans">
                      {item.factualAnswer}
                    </div>

                    {/* Suggested Followups */}
                    {item.suggestedFollowUps && item.suggestedFollowUps.length > 0 && (
                      <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-1.5">
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">
                          Follow-up:
                        </span>
                        {item.suggestedFollowUps.map((fu, fIdx) => (
                          <button
                            key={fIdx}
                            onClick={() => handleSendQuery(fu)}
                            className="text-[11px] px-2 py-0.5 rounded-md bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-indigo-700 dark:text-indigo-300 border border-slate-200 dark:border-slate-700 transition-colors flex items-center gap-1"
                          >
                            {fu} <ArrowRight className="w-2.5 h-2.5" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Query Input Box */}
          <div className="p-4 border-t border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900">
            <form
              onSubmit={e => {
                e.preventDefault();
                handleSendQuery();
              }}
              className="flex items-center gap-2 max-w-4xl mx-auto"
            >
              <div className="relative flex-1">
                <input
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Ask an investigative graph question (e.g. 'Show all connections between Rahul and Prod-DB-01')..."
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:border-indigo-500 shadow-inner pr-16"
                  disabled={queryLoading}
                />
                <kbd className="absolute right-2.5 top-2.5 px-1.5 py-0.5 rounded text-[10px] font-mono bg-white dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700 flex items-center gap-1 shadow-2xs">
                  <CornerDownLeft className="w-2.5 h-2.5" /> Return
                </kbd>
              </div>
              <button
                type="submit"
                disabled={!query.trim() || queryLoading}
                className="px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold shadow-xs transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
};

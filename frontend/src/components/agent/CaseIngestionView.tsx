import React, { useState } from 'react';
import { extractCandidates, importJsonDataset } from '../../api/client';
import {
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Database,
  Sparkles,
  Layers,
  FileCode,
  Check
} from 'lucide-react';

interface CaseIngestionViewProps {
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

export const CaseIngestionView: React.FC<CaseIngestionViewProps> = ({
  caseId,
  onDataIngested,
  onSwitchToGraph
}) => {
  const [rawText, setRawText] = useState(TEMPLATE_NARRATIVE);
  const [sourceName, setSourceName] = useState('incident_narrative.txt');
  const [evidenceType, setEvidenceType] = useState('DOCUMENT');
  const [extracting, setExtracting] = useState(false);
  const [extractedPayload, setExtractedPayload] = useState<any | null>(null);
  const [committing, setCommitting] = useState(false);
  const [ingestSuccess, setIngestSuccess] = useState<any | null>(null);
  const [ingestError, setIngestError] = useState<string | null>(null);

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

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      {/* Top Header */}
      <div className="h-14 border-b border-zinc-200 dark:border-zinc-800 px-6 flex items-center justify-between bg-white dark:bg-zinc-900">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-teal-50 dark:bg-teal-950/50 border border-teal-200 dark:border-teal-800 text-teal-600 dark:text-teal-400">
            <Upload className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Case Ingestion Agent</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Extract candidate entities, events, and provenance relationships from raw incident documents
            </p>
          </div>
        </div>

        {onSwitchToGraph && (
          <button
            onClick={onSwitchToGraph}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
          >
            <span>View Graph</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Main Form & Preview Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Explanation Card */}
          <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-teal-700 dark:text-teal-400 mb-1 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-teal-600" /> Evidence Ingestion Boundary
                </h3>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  Paste raw text (incident timelines, syslog lines, interview statements). The agent parses facts into candidate graph entities and relationships with verified provenance links.
                </p>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 whitespace-nowrap">
                Deterministic Validation
              </span>
            </div>

            {/* Template Quick Loaders */}
            <div className="mt-3.5 pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center gap-2">
              <span className="text-xs font-semibold text-zinc-400">Load Template:</span>
              <button
                onClick={() => {
                  setRawText(TEMPLATE_NARRATIVE);
                  setSourceName('incident_narrative.txt');
                  setEvidenceType('DOCUMENT');
                }}
                className="px-2.5 py-1 rounded-md text-xs bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 transition"
              >
                Incident Narrative
              </button>
              <button
                onClick={() => {
                  setRawText(TEMPLATE_AUTH_LOGS);
                  setSourceName('auth.log');
                  setEvidenceType('LOG_FILE');
                }}
                className="px-2.5 py-1 rounded-md text-xs bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 transition"
              >
                Server Auth Logs
              </button>
              <button
                onClick={() => {
                  setRawText(TEMPLATE_WITNESS);
                  setSourceName('witness_interview_lead.txt');
                  setEvidenceType('WITNESS_STATEMENT');
                }}
                className="px-2.5 py-1 rounded-md text-xs bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 transition"
              >
                Witness Statement
              </button>
            </div>
          </div>

          {/* Error & Success Banners */}
          {ingestError && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{ingestError}</span>
            </div>
          )}

          {ingestSuccess && (
            <div className="p-4 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 text-xs text-teal-800 dark:text-teal-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
                <span>
                  <strong>Success:</strong> Added {ingestSuccess.nodesAdded} nodes and {ingestSuccess.edgesAdded} relationships to the case graph.
                </span>
              </div>
              {onSwitchToGraph && (
                <button
                  onClick={onSwitchToGraph}
                  className="px-3 py-1 rounded-lg bg-teal-600 text-white font-semibold text-xs hover:bg-teal-700 transition"
                >
                  Inspect Graph
                </button>
              )}
            </div>
          )}

          {/* Raw Text Input Card */}
          <div className="p-5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Evidence Source Reference
                </label>
                <input
                  type="text"
                  value={sourceName}
                  onChange={e => setSourceName(e.target.value)}
                  placeholder="e.g. server_auth_2026-09-10.log"
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs font-mono text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Evidence Type
                </label>
                <select
                  value={evidenceType}
                  onChange={e => setEvidenceType(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-teal-500"
                >
                  <option value="DOCUMENT">DOCUMENT</option>
                  <option value="LOG_FILE">LOG_FILE</option>
                  <option value="WITNESS_STATEMENT">WITNESS_STATEMENT</option>
                  <option value="DIGITAL_FORENSIC_IMAGE">DIGITAL_FORENSIC_IMAGE</option>
                  <option value="PHYSICAL_EXHIBIT">PHYSICAL_EXHIBIT</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Raw Unstructured Incident Data / Narrative
              </label>
              <textarea
                rows={6}
                value={rawText}
                onChange={e => setRawText(e.target.value)}
                placeholder="Paste evidence text, system logs, or witness accounts..."
                className="w-full p-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs font-mono text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-teal-500 leading-relaxed"
              />
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleExtract}
                disabled={extracting || !rawText.trim()}
                className="px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs transition flex items-center gap-2 shadow-xs disabled:opacity-50 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{extracting ? 'Analyzing Structure...' : 'Extract Candidate Facts'}</span>
              </button>
            </div>
          </div>

          {/* Structured Candidate Preview */}
          {extractedPayload && (
            <div className="p-5 rounded-xl bg-white dark:bg-zinc-900 border border-teal-300 dark:border-teal-800 shadow-md space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-teal-600" />
                  <div>
                    <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Extracted Candidate Diff</h4>
                    <p className="text-[11px] text-zinc-500">
                      {extractedPayload.nodes?.length || 0} Entities · {extractedPayload.events?.length || 0} Events · {extractedPayload.edges?.length || 0} Directed Relationships
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleCommit}
                  disabled={committing}
                  className="px-4 py-2 rounded-lg bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100 font-semibold text-xs transition flex items-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4 text-teal-500" />
                  <span>{committing ? 'Committing to Graph...' : 'Commit to Evidence Graph'}</span>
                </button>
              </div>

              {/* Entities & Events Preview */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block mb-1.5">
                    Extracted Entities ({extractedPayload.nodes?.length || 0})
                  </span>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {extractedPayload.nodes?.map((n: any) => (
                      <div
                        key={n.id}
                        className="px-3 py-1.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 flex items-center justify-between"
                      >
                        <span className="font-semibold text-xs text-zinc-800 dark:text-zinc-200">{n.label}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-mono font-medium">
                          {n.type}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block mb-1.5">
                    Extracted Events ({extractedPayload.events?.length || 0})
                  </span>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {extractedPayload.events?.map((ev: any) => (
                      <div
                        key={ev.id}
                        className="px-3 py-1.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 flex items-center justify-between"
                      >
                        <span className="font-semibold text-xs text-zinc-800 dark:text-zinc-200 truncate max-w-[180px]">{ev.label}</span>
                        <span className="text-[10px] text-zinc-400 font-mono">
                          {ev.time?.start ? new Date(ev.time.start).toLocaleTimeString() : 'No timestamp'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Relationships Preview */}
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block mb-1.5">
                  Extracted Relationships ({extractedPayload.edges?.length || 0})
                </span>
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1 font-mono text-xs">
                  {extractedPayload.edges?.map((e: any, idx: number) => (
                    <div
                      key={idx}
                      className="px-3 py-1.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 flex items-center gap-2 text-zinc-700 dark:text-zinc-300"
                    >
                      <span className="truncate">{e.source}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                      <span className="text-teal-600 dark:text-teal-400 font-semibold">{e.type}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                      <span className="truncate">{e.target}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

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
  ShieldCheck,
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
      <div className="h-16 border-b border-zinc-200 dark:border-zinc-800 px-8 flex items-center justify-between bg-white dark:bg-zinc-900">
        <div className="flex items-center gap-4">
          <div className="p-2.5 rounded-xl bg-teal-500/10 border border-teal-500/30 text-teal-600 dark:text-teal-400">
            <Upload className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-zinc-900 dark:text-zinc-100">Case Ingestion Agent</h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Input case notes, evidence narratives, and forensic logs to extract graph facts with verified provenance
            </p>
          </div>
        </div>

        {onSwitchToGraph && (
          <button
            onClick={onSwitchToGraph}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 text-sm font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
          >
            <span>View Graph</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Main 2-Column Split Workspace */}
      <div className="flex-1 overflow-y-auto p-8 scrollbar-thin">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Notification Banners */}
          {ingestError && (
            <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-sm text-rose-700 dark:text-rose-300 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
              <span>{ingestError}</span>
            </div>
          )}

          {ingestSuccess && (
            <div className="p-5 rounded-2xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 text-sm text-teal-900 dark:text-teal-200 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-teal-600 dark:text-teal-400 shrink-0" />
                <span className="font-medium">
                  <strong>Graph Updated Successfully:</strong> Committed {ingestSuccess.nodesAdded} nodes and {ingestSuccess.edgesAdded} relationships with formal evidence links.
                </span>
              </div>
              {onSwitchToGraph && (
                <button
                  onClick={onSwitchToGraph}
                  className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm transition shadow-sm cursor-pointer"
                >
                  Explore in Graph →
                </button>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left 7 Columns: Evidence Input */}
            <div className="lg:col-span-7 space-y-6">
              <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-teal-600" />
                    <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Document & Evidence Source</span>
                  </div>

                  {/* Load Templates */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-zinc-400">Sample:</span>
                    <button
                      onClick={() => {
                        setRawText(TEMPLATE_NARRATIVE);
                        setSourceName('incident_narrative.txt');
                        setEvidenceType('DOCUMENT');
                      }}
                      className="px-2.5 py-1 rounded-md text-xs font-medium bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 transition"
                    >
                      Narrative
                    </button>
                    <button
                      onClick={() => {
                        setRawText(TEMPLATE_AUTH_LOGS);
                        setSourceName('auth.log');
                        setEvidenceType('LOG_FILE');
                      }}
                      className="px-2.5 py-1 rounded-md text-xs font-medium bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 transition"
                    >
                      Auth Logs
                    </button>
                    <button
                      onClick={() => {
                        setRawText(TEMPLATE_WITNESS);
                        setSourceName('witness_statement.txt');
                        setEvidenceType('WITNESS_STATEMENT');
                      }}
                      className="px-2.5 py-1 rounded-md text-xs font-medium bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 transition"
                    >
                      Witness
                    </button>
                  </div>
                </div>

                {/* Metadata Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
                      Source Artifact Label
                    </label>
                    <input
                      type="text"
                      value={sourceName}
                      onChange={e => setSourceName(e.target.value)}
                      placeholder="e.g. incident_report_initial.txt"
                      className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm font-mono text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
                      Evidence Category
                    </label>
                    <select
                      value={evidenceType}
                      onChange={e => setEvidenceType(e.target.value)}
                      className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm font-semibold text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition"
                    >
                      <option value="DOCUMENT">DOCUMENT (Incident Reports, Memos)</option>
                      <option value="LOG_FILE">LOG_FILE (Server, Network & Syslogs)</option>
                      <option value="WITNESS_STATEMENT">WITNESS_STATEMENT (Interviews)</option>
                      <option value="DIGITAL_FORENSIC_IMAGE">DIGITAL_FORENSIC_IMAGE (Disk, Memory)</option>
                      <option value="PHYSICAL_EXHIBIT">PHYSICAL_EXHIBIT (Hardware)</option>
                    </select>
                  </div>
                </div>

                {/* Text Area */}
                <div>
                  <label className="block text-xs font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
                    Unstructured Evidence Text
                  </label>
                  <textarea
                    rows={11}
                    value={rawText}
                    onChange={e => setRawText(e.target.value)}
                    placeholder="Paste unformatted case notes, timestamped log excerpts, or interview transcripts here..."
                    className="w-full p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm font-mono text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition leading-relaxed"
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs text-zinc-400">
                    Agent will extract timestamped events, entities, and causality.
                  </span>
                  <button
                    onClick={handleExtract}
                    disabled={extracting || !rawText.trim()}
                    className="px-6 py-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm transition flex items-center gap-2 shadow-md disabled:opacity-50 cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>{extracting ? 'Analyzing Structure...' : 'Extract Candidate Facts'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Right 5 Columns: Extracted Graph Candidate Review & Commit */}
            <div className="lg:col-span-5 space-y-6">
              {extractedPayload ? (
                <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-teal-500/40 dark:border-teal-500/30 shadow-md space-y-5">
                  <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
                    <div>
                      <div className="flex items-center gap-2">
                        <Database className="w-4 h-4 text-teal-600" />
                        <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Extracted Graph Diff</h3>
                      </div>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        {extractedPayload.nodes?.length || 0} Entities · {extractedPayload.events?.length || 0} Events · {extractedPayload.edges?.length || 0} Relationships
                      </p>
                    </div>

                    <button
                      onClick={handleCommit}
                      disabled={committing}
                      className="px-5 py-2.5 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100 font-bold text-sm transition flex items-center gap-2 shadow-sm disabled:opacity-50 cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4 text-teal-500" />
                      <span>{committing ? 'Committing...' : 'Commit to Graph'}</span>
                    </button>
                  </div>

                  {/* Entities Review */}
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 block mb-2">
                      Entities ({extractedPayload.nodes?.length || 0})
                    </span>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {extractedPayload.nodes?.map((n: any) => (
                        <div
                          key={n.id}
                          className="px-3.5 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/80 flex items-center justify-between"
                        >
                          <span className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">{n.label}</span>
                          <span className="text-xs px-2.5 py-0.5 rounded-md bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-mono font-bold">
                            {n.type}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Events Review */}
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 block mb-2">
                      Events ({extractedPayload.events?.length || 0})
                    </span>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {extractedPayload.events?.map((ev: any) => (
                        <div
                          key={ev.id}
                          className="px-3.5 py-2 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 flex items-center justify-between"
                        >
                          <span className="font-semibold text-sm text-amber-900 dark:text-amber-200 truncate max-w-[200px]">{ev.label}</span>
                          <span className="text-xs text-amber-700 dark:text-amber-400 font-mono">
                            {ev.time?.start ? new Date(ev.time.start).toLocaleTimeString() : 'No timestamp'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Relationships Review */}
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 block mb-2">
                      Directed Relationships ({extractedPayload.edges?.length || 0})
                    </span>
                    <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1 font-mono text-xs">
                      {extractedPayload.edges?.map((e: any, idx: number) => (
                        <div
                          key={idx}
                          className="px-3.5 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/80 flex items-center gap-2 text-zinc-800 dark:text-zinc-200"
                        >
                          <span className="truncate">{e.source}</span>
                          <ArrowRight className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                          <span className="text-teal-600 dark:text-teal-400 font-bold">{e.type}</span>
                          <ArrowRight className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                          <span className="truncate">{e.target}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-full min-h-[380px] p-8 rounded-2xl border-2 border-dashed border-zinc-200 dark:border-zinc-800 flex flex-col items-center justify-center text-center text-zinc-400 bg-white/40 dark:bg-zinc-900/40">
                  <Database className="w-12 h-12 mb-3 text-zinc-300 dark:text-zinc-700 stroke-1" />
                  <h4 className="text-sm font-bold text-zinc-700 dark:text-zinc-300">Extraction Preview Ready</h4>
                  <p className="text-xs text-zinc-500 max-w-xs mt-1.5 leading-relaxed">
                    Paste your evidence on the left and click "Extract Candidate Facts" to preview extracted entities, timestamps, and relationships before committing.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { X, Upload, CheckCircle2, AlertCircle, FileCode, Sparkles, ShieldAlert } from 'lucide-react';
import { importJsonDataset, importCsvDataset, extractCandidates } from '../../api/client';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  caseId: string;
  onImportSuccess: () => void;
}

const SAMPLE_JSON = `{
  "evidence": [
    {
      "id": "ev-pcap-batch1",
      "type": "NETWORK_CAPTURE",
      "label": "Gateway Capture Batch 1",
      "source": { "name": "tap_gw1.pcap", "kind": "NETWORK" },
      "reliability": 0.98
    }
  ],
  "nodes": [
    {
      "id": "ent-ip-suspicious",
      "category": "ENTITY",
      "type": "IP_ADDRESS",
      "label": "203.0.113.195",
      "properties": { "asn": "AS65001" }
    }
  ],
  "events": [
    {
      "id": "ev-conn-remote",
      "category": "EVENT",
      "type": "NETWORK_CONNECTION",
      "label": "Suspicious Port 4444 Inbound",
      "time": {
        "start": "2026-09-10T14:40:00Z",
        "precision": "SECOND"
      }
    }
  ],
  "edges": [
    {
      "source": "ent-ip-suspicious",
      "target": "ev-conn-remote",
      "type": "INITIATED",
      "status": "OBSERVED",
      "evidenceRefs": ["ev-pcap-batch1"]
    }
  ]
}`;

const SAMPLE_CSV = `type,label,category,timestamp
PERSON,Carlos Ramos,ENTITY,
ACCOUNT,cramos-dev,ENTITY,
LOGIN,SSH Login Session,EVENT,2026-09-10T14:50:00Z`;

const SAMPLE_RAW_LOGS = `Accepted publickey for cramos-dev from 198.51.100.88 port 2222 ssh2
2026-09-10 14:52:10 created /tmp/financial_export_2026.csv
Contact security lead at investigator@defense.internal`;

export const ImportModal: React.FC<ImportModalProps> = ({
  isOpen,
  onClose,
  caseId,
  onImportSuccess
}) => {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState<'JSON' | 'CSV' | 'AI_EXTRACT'>('JSON');
  const [jsonText, setJsonText] = useState(SAMPLE_JSON);
  const [csvText, setCsvText] = useState(SAMPLE_CSV);
  const [csvFormat, setCsvFormat] = useState<'NODES' | 'EDGES'>('NODES');

  // AI Extraction state
  const [rawText, setRawText] = useState(SAMPLE_RAW_LOGS);
  const [sourceName, setSourceName] = useState('perimeter_auth.log');
  const [evidenceType, setEvidenceType] = useState('LOG');
  const [extractedPayload, setExtractedPayload] = useState<any | null>(null);

  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [errorDetails, setErrorDetails] = useState<any[] | null>(null);
  const [successResult, setSuccessResult] = useState<any | null>(null);

  const handleExtract = async () => {
    setErrorDetails(null);
    setExtracting(true);
    try {
      const candidates = await extractCandidates(caseId, rawText, sourceName, evidenceType);
      setExtractedPayload(candidates);
    } catch (err: any) {
      setErrorDetails([{ type: 'EXTRACTION', errors: [{ message: err.message, field: 'ai' }] }]);
    } finally {
      setExtracting(false);
    }
  };

  const handleImport = async () => {
    setErrorDetails(null);
    setSuccessResult(null);
    setLoading(true);

    try {
      if (activeTab === 'JSON') {
        const parsed = JSON.parse(jsonText);
        const res = await importJsonDataset(caseId, parsed);
        setSuccessResult(res.counts);
        onImportSuccess();
      } else if (activeTab === 'CSV') {
        const res = await importCsvDataset(caseId, csvText, csvFormat);
        setSuccessResult(res.counts);
        onImportSuccess();
      } else if (activeTab === 'AI_EXTRACT') {
        if (!extractedPayload) throw new Error('No extracted candidates to commit.');
        const res = await importJsonDataset(caseId, extractedPayload);
        setSuccessResult(res.counts);
        onImportSuccess();
      }
    } catch (err: any) {
      if (err.errors) {
        setErrorDetails(err.errors);
      } else {
        setErrorDetails([{ type: 'PARSER', errors: [{ message: err.message, field: 'root' }] }]);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Upload className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              Evidence & Graph Ingestion
            </h3>
            <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 text-xs">
              <button
                onClick={() => setActiveTab('JSON')}
                className={`px-2.5 py-1 rounded-md font-medium text-xs transition ${
                  activeTab === 'JSON' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                JSON
              </button>
              <button
                onClick={() => setActiveTab('CSV')}
                className={`px-2.5 py-1 rounded-md font-medium text-xs transition ${
                  activeTab === 'CSV' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                CSV
              </button>
              <button
                onClick={() => setActiveTab('AI_EXTRACT')}
                className={`px-2.5 py-1 rounded-md font-medium text-xs transition flex items-center gap-1 ${
                  activeTab === 'AI_EXTRACT'
                    ? 'bg-white dark:bg-slate-900 text-purple-700 dark:text-purple-300 shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-purple-600'
                }`}
              >
                <Sparkles className="w-3 h-3 text-purple-500" />
                Raw Log Parsing
              </button>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4 text-xs scrollbar-thin">
          <div className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">
            All data is validated against the strict relationship matrix, temporal precision model, and provenance integrity rules before commit. If any errors are found, the transaction will rollback safely.
          </div>

          {/* Error Report */}
          {errorDetails && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 space-y-2">
              <div className="flex items-center gap-2 font-semibold">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>Import Rejected Due to Validation Violations</span>
              </div>
              <ul className="list-disc pl-5 space-y-1 text-[11px] font-mono max-h-36 overflow-y-auto">
                {errorDetails.map((item, idx) => (
                  <li key={idx}>
                    [{item.type} {item.index !== undefined ? `#${item.index}` : ''}]:{' '}
                    {item.errors?.map((e: any) => `${e.field}: ${e.message}`).join(', ') || item.message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Success Banner */}
          {successResult && (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>
                Successfully imported {successResult.nodes} entities, {successResult.events} events, {successResult.evidence} evidence items, and {successResult.edges} relationships!
              </span>
            </div>
          )}

          {activeTab === 'JSON' && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-slate-500 dark:text-slate-400 font-medium text-[11px]">Structured JSON Payload</label>
                <button
                  onClick={() => setJsonText(SAMPLE_JSON)}
                  className="text-indigo-600 dark:text-indigo-400 hover:underline text-[10px]"
                >
                  Load Sample
                </button>
              </div>
              <textarea
                rows={12}
                value={jsonText}
                onChange={e => setJsonText(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-slate-800 dark:text-slate-200 font-mono text-[11px] focus:outline-hidden focus:border-indigo-500"
              />
            </div>
          )}

          {activeTab === 'CSV' && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <label className="text-slate-500 dark:text-slate-400 font-medium text-[11px]">CSV Record Type:</label>
                <div className="flex gap-3">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      checked={csvFormat === 'NODES'}
                      onChange={() => setCsvFormat('NODES')}
                      className="text-indigo-600"
                    />
                    <span className="text-slate-700 dark:text-slate-300 text-xs">Nodes / Events</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      checked={csvFormat === 'EDGES'}
                      onChange={() => setCsvFormat('EDGES')}
                      className="text-indigo-600"
                    />
                    <span className="text-slate-700 dark:text-slate-300 text-xs">Relationships (Edges)</span>
                  </label>
                </div>
              </div>

              <div>
                <textarea
                  rows={10}
                  value={csvText}
                  onChange={e => setCsvText(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-slate-800 dark:text-slate-200 font-mono text-[11px] focus:outline-hidden focus:border-indigo-500"
                />
              </div>
            </div>
          )}

          {activeTab === 'AI_EXTRACT' && (
            <div className="space-y-3">
              <div className="p-2.5 rounded-lg bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900/40 text-purple-800 dark:text-purple-300 flex items-start gap-2 text-[11px]">
                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-purple-600 dark:text-purple-400" />
                <div>
                  <strong>AI Untrusted Boundary:</strong> Raw logs/text are parsed into an intermediate structured representation. All items are explicitly marked with <code>aiExtracted: true</code> and must pass the exact same strict schema and direction validation before committing.
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-500 dark:text-slate-400 font-medium mb-1 text-[11px]">Source File Name</label>
                  <input
                    type="text"
                    value={sourceName}
                    onChange={e => setSourceName(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 text-slate-800 dark:text-slate-200 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 dark:text-slate-400 font-medium mb-1 text-[11px]">Evidence Type</label>
                  <select
                    value={evidenceType}
                    onChange={e => setEvidenceType(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 text-slate-800 dark:text-slate-200 text-xs"
                  >
                    <option value="LOG">LOG</option>
                    <option value="NETWORK_CAPTURE">NETWORK_CAPTURE</option>
                    <option value="SYSTEM_RECORD">SYSTEM_RECORD</option>
                    <option value="EMAIL">EMAIL</option>
                    <option value="INTERVIEW">INTERVIEW</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-500 dark:text-slate-400 font-medium mb-1 text-[11px]">
                  Raw Evidence Excerpt / Log Text
                </label>
                <textarea
                  rows={5}
                  value={rawText}
                  onChange={e => setRawText(e.target.value)}
                  placeholder="Paste log lines, audit records, or text here..."
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-slate-800 dark:text-slate-200 font-mono text-[11px] focus:outline-hidden focus:border-purple-500"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleExtract}
                  disabled={extracting}
                  className="px-3.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-medium transition text-xs flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{extracting ? 'Extracting...' : 'Extract Candidates'}</span>
                </button>
              </div>

              {extractedPayload && (
                <div className="p-3 bg-purple-50/50 dark:bg-purple-950/20 rounded-xl border border-purple-200 dark:border-purple-900/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-purple-800 dark:text-purple-300 font-semibold text-[11px]">
                      Staged Candidates Ready for Validation ({extractedPayload.nodes?.length} Entities, {extractedPayload.events?.length} Events, {extractedPayload.edges?.length} Edges)
                    </span>
                    <span className="px-2 py-0.5 rounded bg-white dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 text-[10px] font-mono">
                      aiExtracted: true
                    </span>
                  </div>
                  <pre className="text-[10px] font-mono text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900 p-2 rounded-lg max-h-36 overflow-y-auto border border-purple-100 dark:border-purple-900/30">
                    {JSON.stringify(extractedPayload, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Actions */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2 bg-slate-50/50 dark:bg-slate-900/50">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium transition text-xs"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handleImport}
            disabled={loading || (activeTab === 'AI_EXTRACT' && !extractedPayload)}
            className="px-4 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-semibold transition text-xs disabled:opacity-50 flex items-center gap-1.5"
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>{loading ? 'Validating & Committing...' : 'Validate & Commit'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

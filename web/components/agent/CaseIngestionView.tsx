"use client";

import React, { useState } from 'react';
import {
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  Button,
  Input,
  Textarea,
  Select,
  SelectItem,
  Chip,
  Divider,
  Alert
} from '@heroui/react';
import {
  Sparkles,
  FileText,
  CheckCircle2,
  AlertCircle,
  Database,
  ArrowRight,
  ShieldCheck,
  Tag,
  Clock,
  Layers,
  FileCheck,
  Bot
} from 'lucide-react';
import { extractCandidates, importJsonDataset } from '../../api/client';
import { GraphNode, GraphEdge } from '../../types/graph';

interface CaseIngestionViewProps {
  caseId?: string;
  onDataIngested?: () => void;
  onNavigateToGraph?: () => void;
}

interface ExtractedCandidates {
  entities?: Array<{ id: string; label: string; category?: string; type: string }>;
  events?: Array<{ id: string; label: string; category?: string; type: string; time?: { start: string } }>;
  relationships?: Array<{ id?: string; source: string; target: string; type: string }>;
}

const SAMPLE_NARRATIVES = {
  narrative: `On 2026-09-10 at 14:15:00, Rahul Kumar entered the secure server vault.
At 14:18:22, Terminal Alpha was accessed by Rahul Kumar.
At 14:22:00, an unauthorized export file financial_export_2026.csv was created on Terminal Alpha.
At 14:25:10, Rahul Kumar exited via North Stairwell.`,
  auth: `2026-09-10T14:15:00Z AUTH_SUCCESS user="rkumar" door="VAULT_DOOR_1"
2026-09-10T14:18:22Z USB_MOUNT serial="DRIVE_X_992" host="TERM_ALPHA"
2026-09-10T14:22:00Z EXFIL_TRIGGER dest="DRIVE_X_992" user="rkumar"
2026-09-10T14:25:10Z DOOR_EXIT door="NORTH_STAIRWELL" user="rkumar"`,
  witness: `Witness Statement - Security Lead:
"I observed Rahul Kumar in the hallway near Terminal Alpha at 14:19.
Terminal Alpha was accessed directly before the financial export file was leaked."`
};

export const CaseIngestionView: React.FC<CaseIngestionViewProps> = ({
  caseId,
  onDataIngested,
  onNavigateToGraph
}) => {
  const [sourceName, setSourceName] = useState('incident_narrative.txt');
  const [evidenceType, setEvidenceType] = useState('DOCUMENT');
  const [rawText, setRawText] = useState(SAMPLE_NARRATIVES.narrative);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<ExtractedCandidates | null>(null);

  const handleExtract = async () => {
    if (!caseId || !rawText.trim()) {
      setErrorMsg("Please provide evidence text to extract facts.");
      return;
    }
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsExtracting(true);

    try {
      const candidates = await extractCandidates(caseId, rawText, sourceName, evidenceType);
      setExtractedData(candidates);
      const totalNodes = (candidates.entities?.length || 0) + (candidates.events?.length || 0);
      const totalEdges = candidates.relationships?.length || 0;
      setSuccessMsg(`Eve AI Agent successfully extracted ${totalNodes} nodes and ${totalEdges} causal connections.`);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error running AI extraction.');
    } finally {
      setIsExtracting(false);
    }
  };

  const handleCommit = async () => {
    if (!caseId || !extractedData) return;
    setIsCommitting(true);
    setErrorMsg(null);

    try {
      const nodes: any[] = [
        ...(extractedData.entities || []).map((e) => ({
          id: e.id || `entity-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          label: e.label,
          category: 'ENTITY',
          type: e.type || 'PERSON',
          status: 'OBSERVED'
        })),
        ...(extractedData.events || []).map((ev) => ({
          id: ev.id || `event-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          label: ev.label,
          category: 'EVENT',
          type: ev.type || 'ACTION',
          time: ev.time,
          status: 'OBSERVED'
        }))
      ];

      const edges: any[] = (extractedData.relationships || []).map((r, idx) => ({
        id: r.id || `edge-${Date.now()}-${idx}`,
        source: r.source,
        target: r.target,
        type: r.type || 'INVOLVED',
        status: 'OBSERVED'
      }));

      const payload = {
        nodes,
        edges,
        metadata: {
          caseId,
          sourceName,
          evidenceType,
          importedAt: new Date().toISOString()
        }
      };

      await importJsonDataset(caseId, payload);

      setSuccessMsg(`Successfully committed ${nodes.length} nodes and ${edges.length} relationships to the investigation graph.`);
      setExtractedData(null);
      if (onDataIngested) onDataIngested();
      if (onNavigateToGraph) {
        setTimeout(onNavigateToGraph, 700);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to commit graph dataset.');
    } finally {
      setIsCommitting(false);
    }
  };

  const entityCount = extractedData?.entities?.length || 0;
  const eventCount = extractedData?.events?.length || 0;
  const relCount = extractedData?.relationships?.length || 0;

  return (
    <div className="w-full h-full p-6 bg-slate-50 dark:bg-zinc-950 overflow-y-auto">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-slate-200/80 dark:border-zinc-800 shadow-sm">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-2 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400">
                <Bot className="w-5 h-5" />
              </span>
              <h2 className="text-xl font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-2">
                Eve AI Data Ingestion Agent
                <Chip size="sm" color="primary" variant="flat" className="text-[10px] font-mono">
                  Agent Mode Active
                </Chip>
              </h2>
            </div>
            <p className="text-sm text-slate-500 dark:text-zinc-400 max-w-2xl">
              Input case notes, evidence narratives, and forensic logs to extract graph facts with verified provenance.
            </p>
          </div>

          {onNavigateToGraph && (
            <Button
              variant="flat"
              color="primary"
              radius="lg"
              className="font-semibold text-xs h-9 px-4 self-start md:self-auto"
              endContent={<ArrowRight className="w-4 h-4" />}
              onPress={onNavigateToGraph}
            >
              View Graph Canvas
            </Button>
          )}
        </div>

        {/* Alerts / Feedback */}
        {errorMsg && (
          <Alert color="danger" variant="flat" title="Validation / Extraction Notice" description={errorMsg} />
        )}
        {successMsg && (
          <Alert color="success" variant="flat" title="Operation Successful" description={successMsg} />
        )}

        {/* 2-Column Split Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column: Source Input */}
          <Card className="border border-slate-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
            <CardHeader className="flex items-center justify-between px-6 pt-5 pb-3">
              <div className="flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                <span className="font-bold text-sm text-slate-800 dark:text-zinc-200">
                  Document & Evidence Source
                </span>
              </div>
              {/* Presets */}
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <span>Sample:</span>
                <Chip
                  size="sm"
                  variant="flat"
                  className="cursor-pointer hover:bg-slate-200 dark:hover:bg-zinc-800 text-[10px]"
                  onClick={() => setRawText(SAMPLE_NARRATIVES.narrative)}
                >
                  Narrative
                </Chip>
                <Chip
                  size="sm"
                  variant="flat"
                  className="cursor-pointer hover:bg-slate-200 dark:hover:bg-zinc-800 text-[10px]"
                  onClick={() => setRawText(SAMPLE_NARRATIVES.auth)}
                >
                  Auth Logs
                </Chip>
                <Chip
                  size="sm"
                  variant="flat"
                  className="cursor-pointer hover:bg-slate-200 dark:hover:bg-zinc-800 text-[10px]"
                  onClick={() => setRawText(SAMPLE_NARRATIVES.witness)}
                >
                  Witness
                </Chip>
              </div>
            </CardHeader>
            <Divider />

            <CardBody className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Source Artifact Label"
                  placeholder="e.g. incident_narrative.txt"
                  value={sourceName}
                  onValueChange={setSourceName}
                  size="sm"
                  variant="bordered"
                  radius="lg"
                />

                <Select
                  label="Evidence Category"
                  selectedKeys={[evidenceType]}
                  onSelectionChange={(keys) => setEvidenceType(Array.from(keys)[0] as string)}
                  size="sm"
                  variant="bordered"
                  radius="lg"
                >
                  <SelectItem key="DOCUMENT">Document (Memos, Reports)</SelectItem>
                  <SelectItem key="AUDIO">Audio / Wiretap</SelectItem>
                  <SelectItem key="VIDEO">CCTV / Video Feed</SelectItem>
                  <SelectItem key="FORENSIC_REPORT">Forensic Report</SelectItem>
                  <SelectItem key="PHYSICAL">Physical Evidence</SelectItem>
                </Select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-zinc-400 uppercase tracking-wider block mb-2">
                  Unstructured Evidence Text
                </label>
                <Textarea
                  minRows={8}
                  maxRows={12}
                  variant="bordered"
                  radius="lg"
                  placeholder="Paste raw case notes, surveillance transcripts, or digital forensic logs..."
                  value={rawText}
                  onValueChange={setRawText}
                  className="font-mono text-xs"
                />
              </div>
            </CardBody>

            <Divider />
            <CardFooter className="px-6 py-4 flex items-center justify-between">
              <span className="text-xs text-slate-400">
                Eve AI Agent extracts timestamped events, entities, and causality.
              </span>
              <Button
                color="primary"
                radius="lg"
                className="font-semibold text-xs bg-teal-600 text-white shadow-sm"
                startContent={<Sparkles className="w-3.5 h-3.5" />}
                isLoading={isExtracting}
                onPress={handleExtract}
              >
                Extract Candidate Facts
              </Button>
            </CardFooter>
          </Card>

          {/* Right Column: Extracted Diff & Commit Preview */}
          <Card className="border border-slate-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm flex flex-col justify-between">
            <div>
              <CardHeader className="flex items-center justify-between px-6 pt-5 pb-3">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <div>
                    <span className="font-bold text-sm text-slate-800 dark:text-zinc-200 block">
                      Extracted Graph Diff
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {extractedData
                        ? `${entityCount} Entities • ${eventCount} Events • ${relCount} Relationships`
                        : '0 Entities • 0 Events • 0 Relationships'}
                    </span>
                  </div>
                </div>

                {extractedData && (
                  <Button
                    size="sm"
                    color="success"
                    variant="shadow"
                    radius="lg"
                    className="font-bold text-xs bg-emerald-600 text-white shadow-emerald-500/20"
                    isLoading={isCommitting}
                    onPress={handleCommit}
                  >
                    Commit to Graph
                  </Button>
                )}
              </CardHeader>
              <Divider />

              <CardBody className="p-6 space-y-4">
                {!extractedData ? (
                  <div className="h-64 flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-slate-200 dark:border-zinc-800 rounded-xl text-slate-400">
                    <Database className="w-10 h-10 mb-2 stroke-1 opacity-50" />
                    <p className="font-medium text-sm text-slate-600 dark:text-zinc-300">
                      Extracted Graph Diff
                    </p>
                    <p className="text-xs max-w-sm mt-1 text-slate-400">
                      Click &quot;Extract Candidate Facts&quot; or choose a sample narrative above to preview parsed graph objects before committing.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4 max-h-[380px] overflow-y-auto pr-1">
                    {/* Entities */}
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-2">
                        ENTITIES ({entityCount})
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {(extractedData.entities || []).map((n, i) => (
                          <Chip
                            key={i}
                            size="sm"
                            variant="flat"
                            color="success"
                            className="font-medium text-xs py-1"
                          >
                            <span className="font-semibold">{n.label}</span>
                            <span className="opacity-60 ml-1">({n.type})</span>
                          </Chip>
                        ))}
                      </div>
                    </div>

                    {/* Events */}
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-2">
                        EVENTS ({eventCount})
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {(extractedData.events || []).map((ev, i) => (
                          <Chip
                            key={i}
                            size="sm"
                            variant="flat"
                            color="warning"
                            className="font-medium text-xs py-1"
                          >
                            <span className="font-semibold">{ev.label}</span>
                            {ev.time?.start && (
                              <span className="opacity-70 ml-1 font-mono text-[10px]">
                                [{new Date(ev.time.start).toLocaleTimeString()}]
                              </span>
                            )}
                          </Chip>
                        ))}
                      </div>
                    </div>

                    {/* Directed Relationships */}
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-2">
                        DIRECTED RELATIONSHIPS ({relCount})
                      </span>
                      <div className="space-y-1.5">
                        {(extractedData.relationships || []).map((e, idx) => (
                          <div
                            key={idx}
                            className="p-2.5 rounded-lg bg-slate-50 dark:bg-zinc-800/60 border border-slate-200/60 dark:border-zinc-700/60 text-xs flex items-center justify-between"
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-slate-800 dark:text-zinc-200">
                                {e.source}
                              </span>
                              <ArrowRight className="w-3 h-3 text-slate-400" />
                              <Chip size="sm" variant="dot" color="primary" className="text-[10px] h-5">
                                {e.type}
                              </Chip>
                              <ArrowRight className="w-3 h-3 text-slate-400" />
                              <span className="font-semibold text-slate-800 dark:text-zinc-200">
                                {e.target}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </CardBody>
            </div>

            <CardFooter className="px-6 py-4 bg-slate-50/50 dark:bg-zinc-900/50 border-t border-slate-100 dark:border-zinc-800/80">
              <span className="text-xs text-slate-400 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                Hard Invariant: Unprovenanced facts are rejected at the reconstruction gate.
              </span>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
};

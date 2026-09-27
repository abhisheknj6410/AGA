import React, { useState, useEffect } from 'react';
import {
  FileCheck,
  ShieldCheck,
  AlertTriangle,
  Layers,
  GitBranch,
  Search,
  Database,
  Sparkles,
  Clock,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Fingerprint,
  FileText,
  Lock,
  ChevronRight,
  RefreshCw,
  Info,
  Scale
} from 'lucide-react';
import {
  EvidenceFact,
  ReconstructionPipelineReport,
  MessyEvidenceBenchmarkReport,
  EdgeProvenanceTrace,
  GraphInterpretation,
  ContradictionRecord
} from '../../types/graph';
import {
  fetchReconstructionReport,
  fetchEdgeProvenance,
  fetchMessyBenchmark
} from '../../api/client';

interface EvidenceReconstructionLabViewProps {
  caseId?: string;
}

export const EvidenceReconstructionLabView: React.FC<EvidenceReconstructionLabViewProps> = ({
  caseId
}) => {
  const [activeSubTab, setActiveSubTab] = useState<
    'FACTS_GATES' | 'INTERPRETATIONS' | 'PROVENANCE_INSPECTOR' | 'BENCHMARK'
  >('BENCHMARK');

  const [loading, setLoading] = useState(false);
  const [benchmarkReport, setBenchmarkReport] = useState<MessyEvidenceBenchmarkReport | null>(null);
  const [pipelineReport, setPipelineReport] = useState<ReconstructionPipelineReport | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [selectedTrace, setSelectedTrace] = useState<EdgeProvenanceTrace | null>(null);
  const [traceLoading, setTraceLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  const loadBenchmark = async () => {
    setLoading(true);
    try {
      const data = await fetchMessyBenchmark();
      setBenchmarkReport(data);
    } catch (err) {
      console.error('Failed to load messy benchmark:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadPipelineForCase = async () => {
    if (!caseId) return;
    setLoading(true);
    try {
      const data = await fetchReconstructionReport(caseId);
      setPipelineReport(data);
      if (data.provenanceTraces.length > 0 && !selectedEdgeId) {
        setSelectedEdgeId(data.provenanceTraces[0].edgeId);
        setSelectedTrace(data.provenanceTraces[0]);
      }
    } catch (err) {
      console.error('Failed to load reconstruction pipeline report:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBenchmark();
    if (caseId) {
      loadPipelineForCase();
    }
  }, [caseId]);

  const handleSelectEdge = async (edgeId: string) => {
    setSelectedEdgeId(edgeId);
    if (caseId) {
      setTraceLoading(true);
      try {
        const trace = await fetchEdgeProvenance(caseId, edgeId);
        setSelectedTrace(trace);
      } catch (err) {
        console.error('Failed to fetch edge provenance:', err);
      } finally {
        setTraceLoading(false);
      }
    } else if (pipelineReport) {
      const trace = pipelineReport.provenanceTraces.find(t => t.edgeId === edgeId);
      if (trace) setSelectedTrace(trace);
    }
  };

  // Facts to display: prefer pipelineReport extracted facts, else benchmark interpretations supporting facts
  const factsToDisplay: EvidenceFact[] = pipelineReport?.extractedFacts || [];

  const filteredFacts = factsToDisplay.filter(f => {
    if (filterStatus === 'ALL') return true;
    return f.epistemicStatus === filterStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OBSERVED':
        return 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
      case 'INFERRED':
        return 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800';
      case 'POSSIBLE':
        return 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800';
      case 'CONFLICTING':
        return 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800';
      case 'UNRESOLVED':
        return 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800';
      default:
        return 'bg-zinc-50 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800';
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 overflow-hidden">
      {/* Top Banner & Control Bar */}
      <div className="p-4 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 text-teal-600 dark:text-teal-400">
              <Fingerprint className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold tracking-tight">
                  Evidence-to-Graph Reconstruction & Provenance Reasoning
                </h1>
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-teal-100 dark:bg-teal-900/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                  Phase 13
                </span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Deterministic conversion of messy investigative evidence into strict graph representations without silent relationship invention.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                loadBenchmark();
                if (caseId) loadPipelineForCase();
              }}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
            <button
              onClick={loadBenchmark}
              disabled={loading}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-teal-600 hover:bg-teal-700 text-white shadow-xs transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Run Messy Benchmark</span>
            </button>
          </div>
        </div>

        {/* Hard Invariant Banner */}
        <div className="mt-3 p-2.5 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/80 flex items-start gap-2.5">
          <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          <div className="text-xs text-emerald-900 dark:text-emerald-200">
            <span className="font-semibold">Core Epistemic Invariant:</span> Every accepted causal edge must be explainable from explicit evidence or an explicitly labelled graph inference. Nothing silently becomes fact. Unprovenanced rumors, inverted intervals, and unsupported connections are blocked by 7 strict validation gates.
          </div>
        </div>

        {/* Pipeline Stage Breadcrumbs */}
        <div className="mt-3 pt-3 border-t border-zinc-200/70 dark:border-zinc-800/70 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 overflow-x-auto pb-1">
          <div className="flex items-center gap-2 shrink-0">
            <span className="px-2 py-0.5 rounded-md bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-semibold">Stage 1</span>
            <span>Raw Evidence Ingest</span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 shrink-0 text-zinc-400" />
          <div className="flex items-center gap-2 shrink-0">
            <span className="px-2 py-0.5 rounded-md bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-semibold">Stage 2</span>
            <span>Fact Extraction & Status</span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 shrink-0 text-zinc-400" />
          <div className="flex items-center gap-2 shrink-0">
            <span className="px-2 py-0.5 rounded-md bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-semibold">Stage 3</span>
            <span>7-Gate Validation</span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 shrink-0 text-zinc-400" />
          <div className="flex items-center gap-2 shrink-0">
            <span className="px-2 py-0.5 rounded-md bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-semibold">Stage 4</span>
            <span>Contradiction Isolation</span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 shrink-0 text-zinc-400" />
          <div className="flex items-center gap-2 shrink-0">
            <span className="px-2 py-0.5 rounded-md bg-teal-100 dark:bg-teal-900/60 text-teal-700 dark:text-teal-300 font-semibold">Stage 5</span>
            <span>Interpretations & Trace</span>
          </div>
        </div>

        {/* Sub-Tabs */}
        <div className="mt-3 flex items-center gap-2 border-t border-zinc-200 dark:border-zinc-800 pt-2">
          <button
            onClick={() => setActiveSubTab('BENCHMARK')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              activeSubTab === 'BENCHMARK'
                ? 'bg-teal-600 text-white shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Messy Evidence Benchmark</span>
            {benchmarkReport && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">
                {benchmarkReport.totalFactsExtracted} facts
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveSubTab('FACTS_GATES')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              activeSubTab === 'FACTS_GATES'
                ? 'bg-teal-600 text-white shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
          >
            <FileCheck className="w-3.5 h-3.5" />
            <span>Extracted Facts & 7 Gates</span>
          </button>

          <button
            onClick={() => setActiveSubTab('INTERPRETATIONS')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              activeSubTab === 'INTERPRETATIONS'
                ? 'bg-teal-600 text-white shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
          >
            <GitBranch className="w-3.5 h-3.5" />
            <span>Competing Interpretations</span>
            {(benchmarkReport?.interpretations.length || 0) > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">
                {benchmarkReport?.interpretations.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveSubTab('PROVENANCE_INSPECTOR')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              activeSubTab === 'PROVENANCE_INSPECTOR'
                ? 'bg-teal-600 text-white shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
          >
            <Fingerprint className="w-3.5 h-3.5" />
            <span>Edge Provenance Inspector</span>
          </button>
        </div>
      </div>

      {/* Main View Area */}
      <div className="flex-1 p-4 overflow-y-auto">
        {/* SUBTAB: BENCHMARK */}
        {activeSubTab === 'BENCHMARK' && (
          <div className="space-y-4 max-w-6xl mx-auto">
            {benchmarkReport ? (
              <>
                {/* Metric Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                  <div className="p-3 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800">
                    <div className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Raw Facts</div>
                    <div className="text-xl font-bold mt-1 text-zinc-900 dark:text-zinc-100">
                      {benchmarkReport.totalFactsExtracted}
                    </div>
                    <div className="text-[10px] text-zinc-400 mt-0.5">Multi-source extract</div>
                  </div>

                  <div className="p-3 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800">
                    <div className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Accepted</div>
                    <div className="text-xl font-bold mt-1 text-emerald-600 dark:text-emerald-400">
                      {benchmarkReport.factsAccepted}
                    </div>
                    <div className="text-[10px] text-emerald-600/70 mt-0.5">Passed all 7 gates</div>
                  </div>

                  <div className="p-3 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800">
                    <div className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-wider">Rejected</div>
                    <div className="text-xl font-bold mt-1 text-rose-600 dark:text-rose-400">
                      {benchmarkReport.factsRejected}
                    </div>
                    <div className="text-[10px] text-rose-600/70 mt-0.5">Violated gate rules</div>
                  </div>

                  <div className="p-3 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800">
                    <div className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Contradictions</div>
                    <div className="text-xl font-bold mt-1 text-amber-600 dark:text-amber-400">
                      {benchmarkReport.contradictionsDetected}
                    </div>
                    <div className="text-[10px] text-amber-600/70 mt-0.5">Preserved in branches</div>
                  </div>

                  <div className="p-3 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800">
                    <div className="text-[11px] font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider">Interpretations</div>
                    <div className="text-xl font-bold mt-1 text-purple-600 dark:text-purple-400">
                      {benchmarkReport.graphInterpretationsGenerated}
                    </div>
                    <div className="text-[10px] text-purple-600/70 mt-0.5">Distinct causal worlds</div>
                  </div>

                  <div className="p-3 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800">
                    <div className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">False Edges Prevented</div>
                    <div className="text-xl font-bold mt-1 text-indigo-600 dark:text-indigo-400">
                      {benchmarkReport.falseEdgesPrevented}
                    </div>
                    <div className="text-[10px] text-indigo-600/70 mt-0.5">Rumors/inversions blocked</div>
                  </div>

                  <div className="p-3 bg-white dark:bg-zinc-900 rounded-xl border border-emerald-500/30 bg-emerald-50/20">
                    <div className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Provenance</div>
                    <div className="text-xl font-bold mt-1 text-emerald-600 dark:text-emerald-400">
                      {benchmarkReport.provenanceCoveragePercent}%
                    </div>
                    <div className="text-[10px] text-emerald-600/70 mt-0.5">100% Invariant Met</div>
                  </div>
                </div>

                {/* Key Takeaways */}
                <div className="p-4 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-3">
                  <div className="flex items-center gap-2 text-sm font-bold text-zinc-900 dark:text-zinc-100">
                    <FileText className="w-4 h-4 text-teal-600" />
                    <span>Deterministic Reconstruction Findings & Guarantees</span>
                  </div>
                  <ul className="space-y-2 text-xs text-zinc-600 dark:text-zinc-300">
                    {benchmarkReport.summaryTakeaways.map((takeaway, idx) => (
                      <li key={idx} className="flex items-start gap-2.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
                        <span>{takeaway}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Benchmark Interpretations preview */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {benchmarkReport.interpretations.map((interp, idx) => (
                    <div
                      key={interp.id}
                      className="p-4 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <GitBranch className="w-4 h-4 text-teal-600" />
                          <h3 className="text-sm font-bold">{interp.name}</h3>
                        </div>
                        <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-teal-100 dark:bg-teal-900/60 text-teal-700 dark:text-teal-300">
                          Coherence: {Math.round(interp.coherenceScore * 100)}%
                        </span>
                      </div>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        {interp.description}
                      </p>

                      <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800/80 space-y-1.5 text-xs">
                        <div className="flex justify-between">
                          <span className="text-zinc-400">Graph Size:</span>
                          <span className="font-semibold">{interp.graph.nodes.length} nodes, {interp.graph.edges.length} edges</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-400">Supporting Facts:</span>
                          <span className="font-semibold text-emerald-600 dark:text-emerald-400">{interp.supportingFactIds.length} facts</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-400">Conflicting Facts:</span>
                          <span className="font-semibold text-amber-600 dark:text-amber-400">{interp.conflictingFactIds.length} facts</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-400">Distinguishing Edges:</span>
                          <span className="font-semibold text-purple-600 dark:text-purple-400">{interp.distinguishingEdges.length}</span>
                        </div>
                      </div>

                      {interp.requiredAssumptions.length > 0 && (
                        <div className="p-2 rounded bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-[11px] text-amber-800 dark:text-amber-300">
                          <span className="font-semibold">Required Assumption:</span> {interp.requiredAssumptions.join('; ')}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="p-8 text-center bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-teal-600 mb-2" />
                <p className="text-xs text-zinc-500">Loading messy benchmark dataset and running 7-gate validation...</p>
              </div>
            )}
          </div>
        )}

        {/* SUBTAB: EXTRACTED FACTS & 7 GATES */}
        {activeSubTab === 'FACTS_GATES' && (
          <div className="space-y-4 max-w-6xl mx-auto">
            {/* Filter Bar */}
            <div className="flex items-center justify-between gap-3 p-3 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-zinc-500">Filter Status:</span>
                {['ALL', 'OBSERVED', 'CONFLICTING', 'POSSIBLE', 'INFERRED'].map(status => (
                  <button
                    key={status}
                    onClick={() => setFilterStatus(status)}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors ${
                      filterStatus === status
                        ? 'bg-zinc-800 text-white dark:bg-zinc-200 dark:text-zinc-900'
                        : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>

              {pipelineReport?.validation && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-zinc-500">7 Gates Overall:</span>
                  <span className={`px-2 py-0.5 font-bold rounded-md ${
                    pipelineReport.validation.isValid
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                  }`}>
                    {pipelineReport.validation.isValid ? 'ALL VALID' : `${pipelineReport.validation.rejectedFactIds.length} REJECTED / ${pipelineReport.validation.ambiguousFactIds.length} AMBIGUOUS`}
                  </span>
                </div>
              )}
            </div>

            {/* Validation Gates Summary */}
            {pipelineReport?.validation && (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
                {pipelineReport.validation.gates.map(gate => (
                  <div
                    key={gate.gateName}
                    className={`p-2.5 rounded-lg border text-xs ${
                      gate.passed
                        ? 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800'
                        : 'bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-[11px] text-zinc-700 dark:text-zinc-300">
                        {gate.gateName}
                      </span>
                      {gate.passed ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5 text-rose-600" />
                      )}
                    </div>
                    <div className="text-[10px] text-zinc-500 truncate" title={gate.details}>
                      {gate.details}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Facts Table */}
            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
              <div className="p-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                  Extracted Facts ({filteredFacts.length})
                </span>
                <span className="text-[11px] text-zinc-400">
                  Epistemic Status strictly separates facts from interpretations
                </span>
              </div>

              {filteredFacts.length === 0 ? (
                <div className="p-8 text-center text-xs text-zinc-500">
                  No facts match current filter.
                </div>
              ) : (
                <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {filteredFacts.map(fact => {
                    const isRejected = pipelineReport?.validation.rejectedFactIds.includes(fact.id);
                    const rejectionReasons = pipelineReport?.validation.rejectionReasons[fact.id] || [];

                    return (
                      <div key={fact.id} className="p-3.5 hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-semibold text-zinc-500">{fact.id}</span>
                            <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${getStatusColor(fact.epistemicStatus)}`}>
                              {fact.epistemicStatus}
                            </span>
                            <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                              {fact.subject.label}
                            </span>
                            <span className="text-xs font-mono text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/60 px-1.5 py-0.5 rounded">
                              [{fact.predicate}]
                            </span>
                            <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                              {fact.object.label}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 text-xs text-zinc-500">
                            {fact.temporalInfo?.start && (
                              <div className="flex items-center gap-1">
                                <Clock className="w-3 h-3 text-zinc-400" />
                                <span>{fact.temporalInfo.start.replace('2026-09-10T', '').replace('Z', '')}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-1 font-mono text-[11px]">
                              <Database className="w-3 h-3 text-zinc-400" />
                              <span>{fact.provenance.sourceName}</span>
                            </div>
                            <span className="text-[11px] font-mono text-zinc-400">
                              {fact.provenance.sourceReference}
                            </span>
                          </div>
                        </div>

                        {fact.rawTextSnippet && (
                          <div className="mt-2 text-xs italic text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-950/50 p-2 rounded border border-zinc-200/60 dark:border-zinc-800/60">
                            "{fact.rawTextSnippet}"
                          </div>
                        )}

                        {isRejected && rejectionReasons.length > 0 && (
                          <div className="mt-2 p-2 rounded bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300">
                            <span className="font-bold">Rejected by Gate:</span> {rejectionReasons.join(' | ')}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* SUBTAB: COMPETING INTERPRETATIONS */}
        {activeSubTab === 'INTERPRETATIONS' && (
          <div className="space-y-4 max-w-6xl mx-auto">
            <div className="p-3 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-600 dark:text-zinc-300">
              When evidence contains unresolved contradictions or ambiguous paths, the system generates distinct candidate interpretations rather than arbitrarily choosing a single winner.
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(pipelineReport?.interpretations || benchmarkReport?.interpretations || []).map(interp => (
                <div
                  key={interp.id}
                  className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 space-y-4"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                        <GitBranch className="w-4 h-4 text-teal-600" />
                        {interp.name}
                      </h3>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                        {interp.description}
                      </p>
                    </div>
                    <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                      Coherence: {Math.round(interp.coherenceScore * 100)}%
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200/80 dark:border-zinc-800/80 space-y-2 text-xs">
                    <div className="font-semibold text-zinc-700 dark:text-zinc-300">
                      Distinguishing Edges ({interp.distinguishingEdges.length})
                    </div>
                    {interp.distinguishingEdges.map(de => (
                      <div key={de.edgeId} className="flex items-center justify-between text-[11px] font-mono">
                        <span className="text-teal-600 dark:text-teal-400">{de.source} → {de.target}</span>
                        <span className="text-zinc-500 italic">{de.reason}</span>
                      </div>
                    ))}
                  </div>

                  {interp.requiredAssumptions.length > 0 && (
                    <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300">
                      <div className="font-semibold mb-1">Required Assumptions:</div>
                      <ul className="list-disc pl-4 space-y-0.5">
                        {interp.requiredAssumptions.map((assump, idx) => (
                          <li key={idx}>{assump}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 text-xs text-zinc-500 flex justify-between">
                    <span>Supporting Facts: {interp.supportingFactIds.length}</span>
                    <span>Shared Edges: {interp.sharedEdgeIds.length}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SUBTAB: PROVENANCE INSPECTOR */}
        {activeSubTab === 'PROVENANCE_INSPECTOR' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-6xl mx-auto h-[600px]">
            {/* Left list of edges */}
            <div className="md:col-span-1 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-3 flex flex-col h-full overflow-hidden">
              <div className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-2">
                Accepted Graph Edges
              </div>
              <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
                {(pipelineReport?.provenanceTraces || []).map(trace => (
                  <button
                    key={trace.edgeId}
                    onClick={() => handleSelectEdge(trace.edgeId)}
                    className={`w-full text-left p-2.5 rounded-lg border text-xs transition-colors ${
                      selectedEdgeId === trace.edgeId
                        ? 'bg-teal-50 dark:bg-teal-950/60 border-teal-300 dark:border-teal-700 text-teal-900 dark:text-teal-200'
                        : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold">{trace.edgeType}</span>
                      <span className="font-mono text-[10px] text-zinc-400">{trace.edgeId}</span>
                    </div>
                    <div className="text-zinc-600 dark:text-zinc-400 text-[11px] truncate">
                      {trace.sourceNode.label} → {trace.targetNode.label}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Right edge provenance detail */}
            <div className="md:col-span-2 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 flex flex-col h-full overflow-y-auto space-y-4">
              {traceLoading ? (
                <div className="m-auto text-center">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto text-teal-600 mb-2" />
                  <p className="text-xs text-zinc-500">Tracing cryptographic provenance and derivation chain...</p>
                </div>
              ) : selectedTrace ? (
                <>
                  <div className="flex items-start justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 text-xs font-mono font-bold bg-teal-100 dark:bg-teal-900/60 text-teal-700 dark:text-teal-300 rounded">
                          {selectedTrace.edgeType}
                        </span>
                        <h2 className="text-sm font-bold">
                          {selectedTrace.sourceNode.label} → {selectedTrace.targetNode.label}
                        </h2>
                      </div>
                      <div className="text-xs text-zinc-400 mt-1 font-mono">Edge ID: {selectedTrace.edgeId}</div>
                    </div>

                    <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                      {selectedTrace.isDirectlyObserved ? 'Directly Observed' : 'Graph Inference'}
                    </span>
                  </div>

                  {/* Cryptographic Source Evidence */}
                  <div className="space-y-2">
                    <div className="text-xs font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-teal-600" />
                      <span>Cryptographic Provenance Source</span>
                    </div>

                    {selectedTrace.sourceEvidences.map(ev => (
                      <div key={ev.id} className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 space-y-1.5 text-xs">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-zinc-900 dark:text-zinc-100">{ev.name}</span>
                          <span className="font-mono text-[10px] text-zinc-400">{ev.id}</span>
                        </div>
                        <div className="text-zinc-600 dark:text-zinc-400">
                          <span className="text-zinc-400">Reference:</span> {ev.reference}
                        </div>
                        {ev.hashChecksum && (
                          <div className="text-[10px] font-mono text-zinc-500 break-all bg-zinc-100 dark:bg-zinc-900 p-1.5 rounded">
                            <span className="text-zinc-400">SHA-256 Checksum:</span> {ev.hashChecksum}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Derivation Chain */}
                  <div className="space-y-2">
                    <div className="text-xs font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-teal-600" />
                      <span>Step-by-Step Derivation Chain</span>
                    </div>

                    <div className="space-y-1.5">
                      {selectedTrace.derivationChain.map((step, idx) => (
                        <div key={idx} className="flex items-center gap-2 p-2 rounded bg-zinc-50 dark:bg-zinc-950 text-xs border border-zinc-200/60 dark:border-zinc-800/60">
                          <span className="w-4 h-4 rounded-full bg-teal-100 dark:bg-teal-900/60 text-teal-700 dark:text-teal-300 flex items-center justify-center font-bold text-[10px]">
                            {idx + 1}
                          </span>
                          <span className="text-zinc-700 dark:text-zinc-300">{step}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="m-auto text-center text-xs text-zinc-500">
                  Select an edge to inspect its cryptographic provenance and derivation chain.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { CytoscapeCanvas } from '../graph/CytoscapeCanvas';
import {
  Workflow,
  GitBranch,
  HelpCircle,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  ChevronRight,
  Layers,
  Database,
  Sliders,
  Scale,
  Compass,
  Sparkles,
  RefreshCw,
  Search,
  Lock,
  ArrowRight,
  AlertTriangle,
  FileText
} from 'lucide-react';
import {
  EndToEndCaseReasoningReport,
  CaseReasoningTraceStage,
  WhyInspectionAnswer,
  CompetingInterpretationComparison,
  UniversalConclusions
} from '../../types/graph';
import {
  fetchCasePipelineReport,
  fetchPipelineBenchmark,
  fetchWhyInspection
} from '../../api/client';

interface CasePipelineViewProps {
  caseId?: string;
}

export const CasePipelineView: React.FC<CasePipelineViewProps> = ({ caseId }) => {
  const [activeSubTab, setActiveSubTab] = useState<'UNIFIED_TRACE' | 'BRANCH_COMPARISON' | 'WHY_INSPECTOR' | 'CONCLUSIONS'>('UNIFIED_TRACE');
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<EndToEndCaseReasoningReport | null>(null);
  const [selectedStage, setSelectedStage] = useState<CaseReasoningTraceStage | null>(null);
  const [selectedWhyAnswer, setSelectedWhyAnswer] = useState<WhyInspectionAnswer | null>(null);
  const [whyFilter, setWhyFilter] = useState<string>('ALL');

  const loadPipelineData = async () => {
    setLoading(true);
    try {
      const data = caseId
        ? await fetchCasePipelineReport(caseId)
        : await fetchPipelineBenchmark();
      console.log("DATA LOADED:", Object.keys(data)); setReport(data);
      if (data.unifiedTrace.length > 0) {
        setSelectedStage(data.unifiedTrace[0]);
      }
      if (data.whyInspectorCatalog.length > 0) {
        setSelectedWhyAnswer(data.whyInspectorCatalog[0]);
      }
    } catch (err) {
      console.error('Failed to load end-to-end case reasoning pipeline:', err);
    } finally {
      setLoading(false);
    }
  };

  
  const getGraphForWhyAnswer = () => {
    if (!report || !selectedWhyAnswer) return null;
    let matchedBranch = report.branches.find(b => b.possibilities.some(p => p.id === selectedWhyAnswer.targetId));
    if (!matchedBranch) {
      matchedBranch = report.branches.find(b => b.interpretationId === selectedWhyAnswer.targetId);
    }
    if (!matchedBranch) {
      matchedBranch = report.branches.find(b => b.algorithmExecutions?.some(e => e.id === selectedWhyAnswer.targetId));
    }
    if (!matchedBranch && report.branches.length > 0) {
      matchedBranch = report.branches[0];
    }
    return matchedBranch?.graph || null;
  };

  const currentGraph = getGraphForWhyAnswer();
  
  const getHighlightedElements = () => {
    if (!selectedWhyAnswer || !currentGraph) return { nodes: [], edges: [] };
    
    // Check if targetId is an edge or node
    const exactNode = currentGraph.nodes.find(n => n.id === selectedWhyAnswer.targetId);
    const exactEdge = currentGraph.edges.find(e => e.id === selectedWhyAnswer.targetId);
    
    const highlightNodes = new Set<string>();
    const highlightEdges = new Set<string>();
    
    if (exactNode) highlightNodes.add(exactNode.id);
    if (exactEdge) highlightEdges.add(exactEdge.id);
    
    // Use Phase 15 inputSubgraph if available
    if (selectedWhyAnswer.inputSubgraph) {
      selectedWhyAnswer.inputSubgraph.nodes.forEach(n => highlightNodes.add(n));
      selectedWhyAnswer.inputSubgraph.edges.forEach(e => {
        highlightEdges.add(e);
        const edgeData = currentGraph.edges.find(edge => edge.id === e);
        if (edgeData) {
          highlightNodes.add(edgeData.source);
          highlightNodes.add(edgeData.target);
        }
      });
    } else if (selectedWhyAnswer.supportingFacts.length > 0) {
      for (const e of currentGraph.edges) {
        if (e.evidenceRefs && e.evidenceRefs.some(ref => selectedWhyAnswer.supportingFacts.includes(ref))) {
          highlightEdges.add(e.id);
          highlightNodes.add(e.source);
          highlightNodes.add(e.target);
        }
      }
    }
    
    return {
      nodes: Array.from(highlightNodes),
      edges: Array.from(highlightEdges)
    };
  };
  
  const highlights = getHighlightedElements();

  useEffect(() => {
    loadPipelineData();
  }, [caseId]);

  const filteredWhyAnswers = (report?.whyInspectorCatalog || []).filter(w => {
    if (whyFilter === 'ALL') return true;
    return w.queryType === whyFilter;
  });

  return (
    <div className="flex-1 flex flex-col h-full bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 overflow-hidden">
      {/* Top Banner & Control Bar */}
      <div className="p-4 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400">
              <Workflow className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold tracking-tight">
                  End-to-End Case Reasoning Pipeline
                </h1>
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  Phase 14
                </span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Unified computational flow: Raw Evidence → Fact Admission → Competing Interpretations → Adaptive Algorithms → Decisions & Provenance.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadPipelineData}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh Pipeline</span>
            </button>
            <button
              onClick={loadPipelineData}
              disabled={loading}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Run Case Pipeline</span>
            </button>
          </div>
        </div>

        {/* Epistemic Invariant & Branching Notice Banner */}
        <div className="mt-3 p-2.5 rounded-lg bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/80 flex items-start gap-2.5">
          <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
          <div className="text-xs text-indigo-950 dark:text-indigo-200">
            <span className="font-semibold">Branching Uncertainty Preservation:</span> Competing graph interpretations (e.g. Interpretation Alpha vs Beta) are reasoned about independently. Competing claims are never averaged away. Universal conclusions and distinguishing evidence targets are derived strictly from graph topology.
          </div>
        </div>

        {/* Sub-Tabs */}
        <div className="mt-3 flex items-center gap-2 border-t border-zinc-200 dark:border-zinc-800 pt-2 overflow-x-auto">
          <button
            onClick={() => setActiveSubTab('UNIFIED_TRACE')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg shrink-0 transition-colors ${
              activeSubTab === 'UNIFIED_TRACE'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>10-Stage Unified Trace</span>
            {report && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">
                10 Stages
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveSubTab('BRANCH_COMPARISON')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg shrink-0 transition-colors ${
              activeSubTab === 'BRANCH_COMPARISON'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
          >
            <GitBranch className="w-3.5 h-3.5" />
            <span>Competing Interpretations ({report?.branches.length || 0})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('WHY_INSPECTOR')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg shrink-0 transition-colors ${
              activeSubTab === 'WHY_INSPECTOR'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>"Why?" Inspector Console</span>
            {report && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">
                {report.whyInspectorCatalog.length} queries
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveSubTab('CONCLUSIONS')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg shrink-0 transition-colors ${
              activeSubTab === 'CONCLUSIONS'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Universal Conclusions & Invariants</span>
          </button>
        </div>
      </div>

      {/* Main View Area */}
      <div className="flex-1 p-4 overflow-y-auto">
        {loading ? (
          <div className="p-12 text-center bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 max-w-4xl mx-auto">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-indigo-600 mb-3" />
            <p className="text-sm font-semibold">Executing End-to-End Case Reasoning Pipeline...</p>
            <p className="text-xs text-zinc-400 mt-1">Running 7-gate validation, adaptive algorithms, possibility generation, and cross-branch comparison.</p>
          </div>
        ) : report ? (
          <>
            {/* SUBTAB 1: 10-STAGE UNIFIED TRACE */}
            {activeSubTab === 'UNIFIED_TRACE' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-6xl mx-auto h-[620px]">
                {/* Stage timeline on the left */}
                <div className="md:col-span-1 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-3 flex flex-col h-full overflow-hidden">
                  <div className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-2">
                    Case Reasoning Trace (Stages 1–10)
                  </div>
                  <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
                    {report.unifiedTrace.map(st => (
                      <button
                        key={st.stage}
                        onClick={() => setSelectedStage(st)}
                        className={`w-full text-left p-2.5 rounded-lg border text-xs transition-colors ${
                          selectedStage?.stage === st.stage
                            ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-300 dark:border-indigo-700 text-indigo-900 dark:text-indigo-200'
                            : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold flex items-center gap-1.5">
                            <span className="w-4 h-4 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 flex items-center justify-center text-[10px] font-mono">
                              {st.stage}
                            </span>
                            <span>{st.label}</span>
                          </span>
                        </div>
                        <div className="text-zinc-500 text-[11px] truncate pl-5">
                          {st.summary}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Stage details on the right */}
                <div className="md:col-span-2 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 flex flex-col h-full overflow-y-auto space-y-4">
                  {selectedStage ? (
                    <>
                      <div className="flex items-start justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 text-xs font-mono font-bold bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 rounded">
                              Stage {selectedStage.stage}: {selectedStage.stageName}
                            </span>
                          </div>
                          <h2 className="text-base font-bold mt-1">{selectedStage.label}</h2>
                          <p className="text-xs text-zinc-500 mt-1">{selectedStage.summary}</p>
                        </div>

                        <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>Provenance Linked</span>
                        </span>
                      </div>

                      {/* Reason for downstream change */}
                      <div className="p-3 rounded-lg bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200/70 dark:border-indigo-800/70 text-xs">
                        <div className="font-semibold text-indigo-900 dark:text-indigo-200 mb-0.5">
                          Downstream Causal Impact:
                        </div>
                        <div className="text-indigo-800/80 dark:text-indigo-300">
                          {selectedStage.reasonForDownstreamChanges}
                        </div>
                      </div>

                      {/* Inputs & Outputs Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                        <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800">
                          <div className="font-semibold text-zinc-500 uppercase tracking-wider text-[11px] mb-2">
                            Stage Inputs
                          </div>
                          <pre className="font-mono text-[11px] text-zinc-700 dark:text-zinc-300 overflow-x-auto">
                            {JSON.stringify(selectedStage.inputs, null, 2)}
                          </pre>
                        </div>

                        <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800">
                          <div className="font-semibold text-zinc-500 uppercase tracking-wider text-[11px] mb-2">
                            Stage Outputs
                          </div>
                          <pre className="font-mono text-[11px] text-zinc-700 dark:text-zinc-300 overflow-x-auto">
                            {JSON.stringify(selectedStage.outputs, null, 2)}
                          </pre>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="m-auto text-center text-xs text-zinc-500">
                      Select a stage from the left to inspect its inputs, outputs, and downstream impact.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* SUBTAB 2: COMPETING INTERPRETATIONS COMPARISON */}
            {activeSubTab === 'BRANCH_COMPARISON' && (
              <div className="space-y-4 max-w-6xl mx-auto">
                {report.branchComparison ? (
                  <>
                    {/* Distinguishing Target Callout */}
                    {report.branchComparison.distinguishingEvidenceTargets.length > 0 && (
                      <div className="p-4 rounded-xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800/80 space-y-2">
                        <div className="flex items-center gap-2 text-sm font-bold text-amber-900 dark:text-amber-200">
                          <AlertTriangle className="w-4 h-4 text-amber-600" />
                          <span>Critical Distinguishing Evidence Target:</span>
                        </div>
                        <div className="text-xs text-amber-800 dark:text-amber-300">
                          {report.branchComparison.distinguishingEvidenceTargets[0].description}
                        </div>
                        <div className="text-xs text-zinc-500 dark:text-zinc-400">
                          <span className="font-semibold text-amber-700 dark:text-amber-400">Expected Impact: </span>
                          {report.branchComparison.distinguishingEvidenceTargets[0].expectedImpact}
                        </div>
                      </div>
                    )}

                    {/* Side-by-side Branches */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {report.branches.map(branch => (
                        <div
                          key={branch.interpretationId}
                          className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 space-y-3"
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="text-sm font-bold flex items-center gap-2">
                                <GitBranch className="w-4 h-4 text-indigo-600" />
                                <span>{branch.interpretationName}</span>
                              </h3>
                              <p className="text-xs text-zinc-500 mt-1">{branch.description}</p>
                            </div>
                            <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                              Coherence: {Math.round(branch.coherenceScore * 100)}%
                            </span>
                          </div>

                          <div className="p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 space-y-1.5 text-xs">
                            <div className="flex justify-between">
                              <span className="text-zinc-500">Nodes / Edges:</span>
                              <span className="font-semibold">{branch.graph.nodes.length} nodes, {branch.graph.edges.length} edges</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-zinc-500">Algorithms Executed:</span>
                              <span className="font-semibold">{branch.adaptiveReport.comparison.adaptiveExecution.algorithmsExecuted}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-zinc-500">Possibilities Discovered:</span>
                              <span className="font-semibold text-indigo-600">{branch.possibilities.length}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-zinc-500">Possibility Entropy:</span>
                              <span className="font-semibold">{branch.resolution.resolutionMatrix.structuralEntropy} bits</span>
                            </div>
                          </div>

                          <div className="text-xs space-y-1">
                            <div className="font-semibold text-zinc-600 dark:text-zinc-400">Recommended Decision:</div>
                            <div className="p-2 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-[11px]">
                              {branch.decisions.strategies[0]?.primaryAction.action || 'Corroborate branch-specific evidence.'}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Differing Nodes & Edges breakdown */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      <div className="p-4 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-2">
                        <div className="font-bold text-zinc-700 dark:text-zinc-300">
                          Branch A Specific Structure ({report.branchComparison.interpretationA.name})
                        </div>
                        <div className="space-y-1">
                          {report.branchComparison.differingNodes.branchAOnly.map(n => (
                            <div key={n.id} className="text-zinc-600 dark:text-zinc-400 font-mono text-[11px]">
                              + Node: {n.label} ({n.category})
                            </div>
                          ))}
                          {report.branchComparison.differingEdges.branchAOnly.map(e => (
                            <div key={e.id} className="text-indigo-600 dark:text-indigo-400 font-mono text-[11px]">
                              + Edge: {e.source} -[{e.type}]-&gt; {e.target}
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="p-4 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-2">
                        <div className="font-bold text-zinc-700 dark:text-zinc-300">
                          Branch B Specific Structure ({report.branchComparison.interpretationB.name})
                        </div>
                        <div className="space-y-1">
                          {report.branchComparison.differingNodes.branchBOnly.map(n => (
                            <div key={n.id} className="text-zinc-600 dark:text-zinc-400 font-mono text-[11px]">
                              + Node: {n.label} ({n.category})
                            </div>
                          ))}
                          {report.branchComparison.differingEdges.branchBOnly.map(e => (
                            <div key={e.id} className="text-indigo-600 dark:text-indigo-400 font-mono text-[11px]">
                              + Edge: {e.source} -[{e.type}]-&gt; {e.target}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="p-8 text-center bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800">
                    <p className="text-xs text-zinc-500">Single coherent interpretation exists for this case; no branching contradictions detected.</p>
                  </div>
                )}
              </div>
            )}

            {/* SUBTAB 3: "WHY?" INSPECTOR CONSOLE */}
            
            {activeSubTab === 'WHY_INSPECTOR' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 max-w-[1400px] mx-auto h-[700px]">
                {/* Left list of questions */}
                <div className="lg:col-span-3 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-3 flex flex-col h-full overflow-hidden">
                  <div className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-2 flex items-center justify-between">
                    <span>Why? Question Catalog</span>
                    <span className="font-mono text-[10px] text-zinc-400">{filteredWhyAnswers.length}</span>
                  </div>

                  {/* Filter chips */}
                  <div className="flex flex-wrap gap-1 mb-2 pb-2 border-b border-zinc-200 dark:border-zinc-800">
                    {['ALL', 'POSSIBILITY_EXISTS', 'POSSIBILITY_ELIMINATED', 'ALGORITHM_EXECUTED', 'ALGORITHM_SKIPPED', 'EVIDENCE_INSUFFICIENT'].map(f => (
                      <button
                        key={f}
                        onClick={() => setWhyFilter(f)}
                        className={`px-2 py-0.5 text-[10px] font-semibold rounded ${
                          whyFilter === f
                            ? 'bg-indigo-600 text-white'
                            : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-800'
                        }`}
                      >
                        {f.replace('POSSIBILITY_', 'P_').replace('ALGORITHM_', 'A_').replace('EVIDENCE_', 'E_')}
                      </button>
                    ))}
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
                    {filteredWhyAnswers.map(ans => (
                      <button
                        key={`${ans.queryType}-${ans.targetId}`}
                        onClick={() => setSelectedWhyAnswer(ans)}
                        className={`w-full text-left p-2.5 rounded-lg border text-xs transition-colors ${
                          selectedWhyAnswer?.queryType === ans.queryType && selectedWhyAnswer?.targetId === ans.targetId
                            ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-300 dark:border-indigo-700 text-indigo-900 dark:text-indigo-200'
                            : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                        }`}
                      >
                        <div className="font-bold text-[11px] truncate mb-0.5">{ans.question}</div>
                        <div className="text-[10px] font-mono text-zinc-400 truncate">{ans.queryType}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Middle answer detail */}
                <div className="lg:col-span-4 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 flex flex-col h-full overflow-y-auto space-y-4">
                  {selectedWhyAnswer ? (
                    <>
                      <div className="pb-3 border-b border-zinc-200 dark:border-zinc-800">
                        <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 rounded">
                          {selectedWhyAnswer.queryType}
                        </span>
                        <h2 className="text-sm font-bold mt-1 text-zinc-900 dark:text-zinc-100">
                          {selectedWhyAnswer.question}
                        </h2>
                      </div>

                      {/* Direct Answer */}
                      <div className="p-3.5 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 space-y-1">
                        <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                          Direct Graph-Derived Answer:
                        </div>
                        <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                          {selectedWhyAnswer.directAnswer}
                        </p>
                      </div>

                      {/* Structural Rationale */}
                      <div className="space-y-1 text-xs">
                        <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                          Structural Rationale:
                        </div>
                        <p className="text-zinc-600 dark:text-zinc-300">
                          {selectedWhyAnswer.structuralRationale}
                        </p>
                      </div>

                      {/* Algorithmic Basis */}
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-zinc-500">Algorithmic Basis:</span>
                        <span className="font-mono px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                          {selectedWhyAnswer.algorithmicBasis}
                        </span>
                      </div>

                      {/* Supporting Facts & Provenance */}
                      <div className="space-y-2 pt-2 border-t border-zinc-200 dark:border-zinc-800 text-xs">
                        <div className="font-bold text-zinc-500 uppercase tracking-wider text-[11px]">
                          Grounding Evidence & Citations:
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {selectedWhyAnswer.supportingFacts.map((factId, idx) => (
                            <span key={idx} className="px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 font-mono text-[11px]">
                              {factId}
                            </span>
                          ))}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="m-auto text-center text-xs text-zinc-500">
                      Select a question from the left catalog to inspect the deterministic graph answer.
                    </div>
                  )}
                </div>
                
                {/* Right Interactive Graph Highlighting */}
                <div className="lg:col-span-5 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 flex flex-col h-full overflow-hidden">
                   <div className="p-3 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 flex justify-between items-center">
                     <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">Interactive Causal Graph</span>
                     {highlights.nodes.length > 0 && (
                       <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold">
                         {highlights.nodes.length} Nodes Highlighted
                       </span>
                     )}
                   </div>
                   <div className="flex-1 relative bg-zinc-50 dark:bg-black/20">
                     {currentGraph ? (
                        <CytoscapeCanvas 
                          nodes={currentGraph.nodes} 
                          edges={currentGraph.edges} 
                          selectedElement={null} 
                          onSelectElement={() => {}} 
                          layoutType="dagre" 
                          theme="light" 
                          highlightNodeIds={highlights.nodes.length > 0 ? highlights.nodes : undefined}
                          highlightEdgeIds={highlights.edges.length > 0 ? highlights.edges : undefined}
                        />
                     ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-xs text-zinc-500">
                           No graph data available for this branch.
                        </div>
                     )}
                   </div>
                </div>
              </div>
            )}

            {activeSubTab === 'CONCLUSIONS' && (
              <div className="space-y-4 max-w-6xl mx-auto">
                <div className="p-4 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-3">
                  <div className="flex items-center gap-2 text-sm font-bold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Universal Invariant Findings (Hold Across All Interpretations)</span>
                  </div>
                  <ul className="space-y-1.5 text-xs text-zinc-600 dark:text-zinc-300">
                    {report.commonConclusions.universalFindings.map((finding, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                        <span>{finding}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-2 text-xs">
                    <div className="font-bold text-zinc-700 dark:text-zinc-300">
                      Corroborated Shared Entities ({report.commonConclusions.universalNodes.length})
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {report.commonConclusions.universalNodes.map((nodeLabel, idx) => (
                        <span key={idx} className="px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-mono text-[11px]">
                          {nodeLabel}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="p-4 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-2 text-xs">
                    <div className="font-bold text-zinc-700 dark:text-zinc-300">
                      Corroborated Shared Causal Edges ({report.commonConclusions.universalEdges.length})
                    </div>
                    <div className="space-y-1">
                      {report.commonConclusions.universalEdges.map((edgeStr, idx) => (
                        <div key={idx} className="font-mono text-[11px] text-zinc-600 dark:text-zinc-400">
                          {edgeStr}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-2 text-xs">
                  <div className="font-bold text-zinc-700 dark:text-zinc-300">
                    Recommended Universal Investigation Actions
                  </div>
                  <div className="space-y-1.5">
                    {report.commonConclusions.universalActions.map((act, idx) => (
                      <div key={idx} className="p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                        <span>{act}</span>
                        <ArrowRight className="w-3.5 h-3.5 text-zinc-400" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
};

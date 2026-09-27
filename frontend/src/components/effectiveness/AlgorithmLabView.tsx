import React, { useState, useEffect, useRef } from 'react';
import cytoscape from 'cytoscape';
import {
  fetchAlgorithmEffectivenessAudit,
  runAlgorithmAblation,
  fetchAlgorithmImpactGraph,
  fetchReasoningTrace,
  fetchMultiDomainCases,
  fetchSyntheticBenchmarks
} from '../../api/client';
import {
  AlgorithmEffectivenessAudit,
  AblationDiff,
  AlgorithmImpactGraph,
  ReasoningTrace,
  SyntheticBenchmarkResult
} from '../../types/graph';

interface AlgorithmLabViewProps {
  caseId: string;
}

export const AlgorithmLabView: React.FC<AlgorithmLabViewProps> = ({ caseId }) => {
  const [activeSubTab, setActiveSubTab] = useState<'SCORECARD' | 'ABLATION' | 'TRACE' | 'IMPACT_GRAPH' | 'CASES' | 'BENCHMARKS'>('SCORECARD');
  const [audits, setAudits] = useState<AlgorithmEffectivenessAudit[]>([]);
  const [selectedAudit, setSelectedAudit] = useState<AlgorithmEffectivenessAudit | null>(null);
  const [ablationDiff, setAblationDiff] = useState<AblationDiff | null>(null);
  const [ablationLoading, setAblationLoading] = useState<boolean>(false);
  const [impactGraph, setImpactGraph] = useState<AlgorithmImpactGraph | null>(null);
  const [reasoningTrace, setReasoningTrace] = useState<ReasoningTrace | null>(null);
  const [traceTarget, setTraceTarget] = useState<string>('ACT-1');
  const [cases, setCases] = useState<any[]>([]);
  const [benchmarks, setBenchmarks] = useState<SyntheticBenchmarkResult[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const cyContainerRef = useRef<HTMLDivElement>(null);
  const cyInstanceRef = useRef<cytoscape.Core | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [auditList, graphData, caseList, benchData] = await Promise.all([
        fetchAlgorithmEffectivenessAudit(caseId),
        fetchAlgorithmImpactGraph(caseId),
        fetchMultiDomainCases(caseId),
        fetchSyntheticBenchmarks(caseId)
      ]);
      setAudits(auditList);
      if (auditList.length > 0) {
        setSelectedAudit(auditList[0]);
        setAblationDiff(auditList[0].ablationDiff);
      }
      setImpactGraph(graphData);
      setCases(caseList);
      setBenchmarks(benchData);

      // Load initial reasoning trace
      try {
        const trace = await fetchReasoningTrace(caseId, 'ACT-1');
        setReasoningTrace(trace);
      } catch (_) {}
    } catch (err: any) {
      setError(err.message || 'Failed to load algorithm effectiveness audit.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (caseId) {
      loadData();
    }
  }, [caseId]);

  // Handle Ablation Run
  const handleRunAblation = async (algorithmName: string) => {
    try {
      setAblationLoading(true);
      const diff = await runAlgorithmAblation(caseId, algorithmName);
      setAblationDiff(diff);
      setActiveSubTab('ABLATION');
    } catch (err: any) {
      alert(`Ablation failed: ${err.message}`);
    } finally {
      setAblationLoading(false);
    }
  };

  // Handle Reasoning Trace Fetch
  const handleFetchTrace = async () => {
    if (!traceTarget.trim()) return;
    try {
      const trace = await fetchReasoningTrace(caseId, traceTarget.trim());
      setReasoningTrace(trace);
    } catch (err: any) {
      alert(`Trace failed: ${err.message}`);
    }
  };

  // Render Cytoscape Impact Graph
  useEffect(() => {
    if (activeSubTab === 'IMPACT_GRAPH' && impactGraph && cyContainerRef.current) {
      if (cyInstanceRef.current) {
        cyInstanceRef.current.destroy();
      }

      const elements: any[] = [];
      for (const node of impactGraph.nodes) {
        let bgColor = '#0f766e'; // teal-700
        if (node.type === 'ALGORITHM') bgColor = '#18181b'; // zinc-900
        if (node.type === 'INTERMEDIATE_RESULT') bgColor = '#0284c7'; // sky-600
        if (node.type === 'POSSIBILITY') bgColor = '#0d9488'; // teal-600
        if (node.type === 'STRUCTURAL_PROPERTY') bgColor = '#d97706'; // amber-600
        if (node.type === 'RESOLUTION') bgColor = '#4f46e5'; // indigo-600
        if (node.type === 'INVESTIGATION_ACTION') bgColor = '#047857'; // emerald-700

        elements.push({
          data: {
            id: node.id,
            label: node.label,
            type: node.type,
            bgColor
          }
        });
      }

      for (const edge of impactGraph.edges) {
        elements.push({
          data: {
            id: edge.id,
            source: edge.source,
            target: edge.target,
            label: edge.label || edge.type
          }
        });
      }

      cyInstanceRef.current = cytoscape({
        container: cyContainerRef.current,
        elements,
        layout: {
          name: 'breadthfirst',
          directed: true,
          padding: 30,
          spacingFactor: 1.2
        },
        style: [
          {
            selector: 'node',
            style: {
              'background-color': 'data(bgColor)',
              'label': 'data(label)',
              'color': '#18181b',
              'font-size': '11px',
              'font-weight': 'bold',
              'text-valign': 'bottom',
              'text-margin-y': 6,
              'width': 32,
              'height': 32
            }
          },
          {
            selector: 'edge',
            style: {
              'width': 2,
              'line-color': '#a1a1aa',
              'target-arrow-color': '#71717a',
              'target-arrow-shape': 'triangle',
              'curve-style': 'bezier',
              'label': 'data(label)',
              'font-size': '9px',
              'text-rotation': 'autorotate',
              'text-background-opacity': 0.8,
              'text-background-color': '#ffffff'
            }
          }
        ]
      });
    }
  }, [activeSubTab, impactGraph]);

  if (loading) {
    return (
      <div className="p-8 text-center bg-white min-h-[500px] flex flex-col items-center justify-center">
        <div className="inline-block w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-semibold tracking-wide uppercase text-neutral-600">
          Running Comprehensive Algorithm Effectiveness Audit...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 bg-white min-h-[500px]">
        <div className="p-4 border border-red-200 bg-red-50 text-red-700 rounded text-sm">
          {error}
        </div>
        <button
          onClick={loadData}
          className="mt-4 px-4 py-2 bg-neutral-900 text-white text-xs font-semibold rounded uppercase tracking-wider hover:bg-neutral-800 transition"
        >
          Retry Audit
        </button>
      </div>
    );
  }

  const consequentialCount = audits.filter(a => a.classification === 'CONSEQUENTIAL').length;
  const intermediateCount = audits.filter(a => a.classification === 'INTERMEDIATE').length;
  const decorativeCount = audits.filter(a => a.classification === 'DECORATIVE').length;

  return (
    <div className="p-6 bg-neutral-50 min-h-screen text-neutral-900 font-sans">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-neutral-200">
        <div>
          <div className="flex items-center gap-3">
            <span className="px-2.5 py-1 bg-teal-800 text-white text-xs font-bold uppercase tracking-wider rounded">
              Phase 6 Active
            </span>
            <h1 className="text-xl font-bold tracking-tight text-neutral-900">
              Algorithm Lab & Effectiveness Audit
            </h1>
          </div>
          <p className="text-xs text-neutral-500 mt-1">
            Deterministic verification proving graph algorithms causally govern possibility generation, structural partitioning, and investigative planning.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            className="px-3 py-1.5 border border-neutral-300 text-neutral-700 text-xs font-semibold rounded hover:bg-neutral-100 transition uppercase tracking-wider"
          >
            Re-run Audit
          </button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 my-6">
        <div className="p-4 bg-white border border-neutral-200 rounded-lg shadow-sm">
          <div className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
            Audited Algorithms
          </div>
          <div className="text-2xl font-black text-neutral-900 mt-1">
            {audits.length}
          </div>
          <div className="text-xs text-neutral-500 mt-1">Pipeline algorithms inspected</div>
        </div>

        <div className="p-4 bg-white border-2 border-teal-600 rounded-lg shadow-sm bg-teal-50/20">
          <div className="text-xs font-bold text-teal-800 uppercase tracking-wider">
            Consequential
          </div>
          <div className="text-2xl font-black text-teal-700 mt-1">
            {consequentialCount}
          </div>
          <div className="text-xs text-teal-700 mt-1">Ablation changes outcome</div>
        </div>

        <div className="p-4 bg-white border border-neutral-200 rounded-lg shadow-sm">
          <div className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
            Intermediate Subroutines
          </div>
          <div className="text-2xl font-black text-neutral-800 mt-1">
            {intermediateCount}
          </div>
          <div className="text-xs text-neutral-500 mt-1">Internal routing dependencies</div>
        </div>

        <div className="p-4 bg-white border border-neutral-200 rounded-lg shadow-sm">
          <div className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
            Decorative Algorithms
          </div>
          <div className="text-2xl font-black text-neutral-400 mt-1">
            {decorativeCount}
          </div>
          <div className="text-xs text-neutral-500 mt-1">Zero downstream consequence</div>
        </div>
      </div>

      {/* Sub-Tab Navigation Bar */}
      <div className="flex border-b border-neutral-200 gap-2 mb-6 text-xs font-bold uppercase tracking-wider">
        <button
          onClick={() => setActiveSubTab('SCORECARD')}
          className={`pb-2.5 px-3 transition ${
            activeSubTab === 'SCORECARD'
              ? 'border-b-2 border-teal-700 text-teal-800'
              : 'text-neutral-500 hover:text-neutral-900'
          }`}
        >
          Scorecard & Inventory
        </button>
        <button
          onClick={() => setActiveSubTab('ABLATION')}
          className={`pb-2.5 px-3 transition ${
            activeSubTab === 'ABLATION'
              ? 'border-b-2 border-teal-700 text-teal-800'
              : 'text-neutral-500 hover:text-neutral-900'
          }`}
        >
          Interactive Ablation
        </button>
        <button
          onClick={() => setActiveSubTab('TRACE')}
          className={`pb-2.5 px-3 transition ${
            activeSubTab === 'TRACE'
              ? 'border-b-2 border-teal-700 text-teal-800'
              : 'text-neutral-500 hover:text-neutral-900'
          }`}
        >
          Reasoning Trace
        </button>
        <button
          onClick={() => setActiveSubTab('IMPACT_GRAPH')}
          className={`pb-2.5 px-3 transition ${
            activeSubTab === 'IMPACT_GRAPH'
              ? 'border-b-2 border-teal-700 text-teal-800'
              : 'text-neutral-500 hover:text-neutral-900'
          }`}
        >
          Impact Graph (DAG)
        </button>
        <button
          onClick={() => setActiveSubTab('CASES')}
          className={`pb-2.5 px-3 transition ${
            activeSubTab === 'CASES'
              ? 'border-b-2 border-teal-700 text-teal-800'
              : 'text-neutral-500 hover:text-neutral-900'
          }`}
        >
          Cross-Domain Cases (5)
        </button>
        <button
          onClick={() => setActiveSubTab('BENCHMARKS')}
          className={`pb-2.5 px-3 transition ${
            activeSubTab === 'BENCHMARKS'
              ? 'border-b-2 border-teal-700 text-teal-800'
              : 'text-neutral-500 hover:text-neutral-900'
          }`}
        >
          Scaling Benchmarks (10k)
        </button>
      </div>

      {/* Tab 1: Scorecard & Inventory */}
      {activeSubTab === 'SCORECARD' && (
        <div className="bg-white border border-neutral-200 rounded-lg overflow-hidden shadow-sm">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-100 text-neutral-600 font-bold uppercase tracking-wider border-b border-neutral-200">
              <tr>
                <th className="py-3 px-4">Algorithm</th>
                <th className="py-3 px-3">Classification</th>
                <th className="py-3 px-3">Impact Depth</th>
                <th className="py-3 px-3">Downstream Effect</th>
                <th className="py-3 px-3 text-right">Runtime</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {audits.map(audit => (
                <tr key={audit.algorithmName} className="hover:bg-neutral-50 transition">
                  <td className="py-3 px-4 font-bold text-neutral-900">
                    {audit.algorithmName}
                  </td>
                  <td className="py-3 px-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                        audit.classification === 'CONSEQUENTIAL'
                          ? 'bg-teal-100 text-teal-900 border border-teal-300'
                          : audit.classification === 'INTERMEDIATE'
                          ? 'bg-sky-100 text-sky-900 border border-sky-300'
                          : 'bg-neutral-200 text-neutral-700'
                      }`}
                    >
                      {audit.classification}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-mono font-bold text-neutral-700">
                    Depth {audit.impactDepth}
                  </td>
                  <td className="py-3 px-3 text-neutral-600 max-w-md">
                    {audit.downstreamEffect}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-neutral-500">
                    {audit.executionTimeMs} ms
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button
                      disabled={ablationLoading}
                      onClick={() => handleRunAblation(audit.algorithmName)}
                      className="px-2.5 py-1 bg-neutral-900 text-white font-semibold rounded text-[11px] hover:bg-neutral-800 transition uppercase tracking-wider"
                    >
                      Run Ablation
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 2: Interactive Ablation Runner */}
      {activeSubTab === 'ABLATION' && (
        <div className="space-y-6">
          <div className="p-4 bg-white border border-neutral-200 rounded-lg flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-neutral-900">
                Ablation Experiment: {ablationDiff?.algorithm || "Yen's K-Shortest Paths"}
              </h3>
              <p className="text-xs text-neutral-500 mt-0.5">
                Deterministic comparison between Normal Pipeline Execution vs Pipeline with Algorithm Disabled.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                disabled={ablationLoading}
                onClick={() => handleRunAblation("Yen's K-Shortest Paths")}
                className="px-3 py-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-semibold rounded"
              >
                Yen
              </button>
              <button
                disabled={ablationLoading}
                onClick={() => handleRunAblation('Temporal Chronology & Kahn Sort')}
                className="px-3 py-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-semibold rounded"
              >
                Temporal
              </button>
              <button
                disabled={ablationLoading}
                onClick={() => handleRunAblation('Lengauer-Tarjan Dominator Tree')}
                className="px-3 py-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-semibold rounded"
              >
                Dominator
              </button>
              <button
                disabled={ablationLoading}
                onClick={() => handleRunAblation('Min-Cut Separation')}
                className="px-3 py-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-semibold rounded"
              >
                Min-Cut
              </button>
            </div>
          </div>

          {ablationDiff && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Normal State Card */}
              <div className="p-5 bg-white border border-neutral-300 rounded-lg shadow-sm">
                <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-teal-800">
                    Normal Pipeline Execution
                  </span>
                  <span className="px-2 py-0.5 bg-teal-100 text-teal-900 text-[10px] font-bold rounded">
                    ACTIVE
                  </span>
                </div>
                <div className="mt-4 space-y-3 text-xs">
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Surviving Valid Hypotheses:</span>
                    <strong className="font-mono text-neutral-900 text-sm">{ablationDiff.normalState.validCount}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Structural Families:</span>
                    <strong className="font-mono text-neutral-900">{ablationDiff.normalState.familyCount}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Resolution Candidates:</span>
                    <strong className="font-mono text-neutral-900">{ablationDiff.normalState.candidateCount}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Investigation Actions:</span>
                    <strong className="font-mono text-neutral-900">{ablationDiff.normalState.actionCount}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Graph Entropy H(P):</span>
                    <strong className="font-mono text-teal-700">{ablationDiff.normalState.entropy} bits</strong>
                  </div>
                </div>
              </div>

              {/* Ablated State Card */}
              <div className="p-5 bg-white border-2 border-red-300 rounded-lg shadow-sm bg-red-50/10">
                <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-red-700">
                    Ablated Pipeline ({ablationDiff.algorithm} Disabled)
                  </span>
                  <span className="px-2 py-0.5 bg-red-100 text-red-800 text-[10px] font-bold rounded">
                    DISABLED
                  </span>
                </div>
                <div className="mt-4 space-y-3 text-xs">
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Surviving Valid Hypotheses:</span>
                    <strong className="font-mono text-red-700 text-sm">{ablationDiff.ablatedState.validCount}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Structural Families:</span>
                    <strong className="font-mono text-red-700">{ablationDiff.ablatedState.familyCount}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Resolution Candidates:</span>
                    <strong className="font-mono text-red-700">{ablationDiff.ablatedState.candidateCount}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Investigation Actions:</span>
                    <strong className="font-mono text-red-700">{ablationDiff.ablatedState.actionCount}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Graph Entropy H(P):</span>
                    <strong className="font-mono text-red-700">{ablationDiff.ablatedState.entropy} bits</strong>
                  </div>
                </div>
              </div>
            </div>
          )}

          {ablationDiff && (
            <div className="p-5 bg-white border border-neutral-200 rounded-lg">
              <h4 className="text-xs font-bold text-neutral-700 uppercase tracking-wider">
                Ablation Differential & Causal Conclusion
              </h4>
              <div className="mt-3 p-3 bg-neutral-50 border border-neutral-200 rounded text-xs text-neutral-800 font-medium">
                {ablationDiff.downstreamExplanation}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {ablationDiff.changedOutputs.map((out, idx) => (
                  <span key={idx} className="px-2.5 py-1 bg-amber-50 text-amber-900 border border-amber-200 rounded text-xs">
                    &bull; {out}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Reasoning Trace Inspector */}
      {activeSubTab === 'TRACE' && (
        <div className="space-y-6">
          <div className="p-4 bg-white border border-neutral-200 rounded-lg flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-neutral-900">
                End-to-End Computational Reasoning Trace
              </h3>
              <p className="text-xs text-neutral-500 mt-0.5">
                Inspect the causal lineage of any Action, Possibility, or Candidate: Evidence &rarr; Graph &rarr; Algorithm &rarr; Possibility &rarr; Resolution &rarr; Action.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={traceTarget}
                onChange={e => setTraceTarget(e.target.value)}
                placeholder="Target ID (e.g. ACT-1, P1)"
                className="px-3 py-1 border border-neutral-300 rounded text-xs bg-white text-neutral-800 font-mono"
              />
              <button
                onClick={handleFetchTrace}
                className="px-3 py-1 bg-teal-700 text-white font-semibold text-xs rounded hover:bg-teal-800 transition uppercase tracking-wider"
              >
                Inspect
              </button>
            </div>
          </div>

          {reasoningTrace && (
            <div className="p-6 bg-white border border-neutral-200 rounded-lg space-y-6">
              <div className="border-b border-neutral-100 pb-4">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-neutral-900 text-sm">
                    {reasoningTrace.targetId}
                  </span>
                  <span className="px-2 py-0.5 bg-neutral-100 text-neutral-700 text-xs rounded font-semibold uppercase">
                    {reasoningTrace.targetType}
                  </span>
                </div>
                <h4 className="text-base font-bold text-neutral-900 mt-1">
                  {reasoningTrace.targetLabel}
                </h4>
                <div className="mt-2 text-xs text-neutral-600 bg-neutral-50 p-3 rounded border border-neutral-200">
                  {reasoningTrace.explanation}
                </div>
              </div>

              {/* Step-by-Step Chain */}
              <div>
                <h5 className="text-xs font-bold text-neutral-600 uppercase tracking-wider mb-3">
                  Causal Stage Sequence
                </h5>
                <div className="space-y-3">
                  {reasoningTrace.chainSteps.map((step, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-3 bg-neutral-50 border border-neutral-200 rounded">
                      <span className="w-6 h-6 flex items-center justify-center rounded-full bg-teal-800 text-white font-mono text-xs font-bold shrink-0">
                        {idx + 1}
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-neutral-900 uppercase">
                            {step.stage}
                          </span>
                          <span className="text-[11px] text-teal-700 font-semibold">
                            {step.component}
                          </span>
                        </div>
                        <p className="text-xs text-neutral-700 mt-0.5">
                          {step.detail}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Impact Graph (Cytoscape) */}
      {activeSubTab === 'IMPACT_GRAPH' && (
        <div className="p-4 bg-white border border-neutral-200 rounded-lg space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-neutral-900">
                Second-Order Algorithm Impact Graph
              </h3>
              <p className="text-xs text-neutral-500">
                Visualizing the DAG: Algorithm &rarr; Intermediate &rarr; Possibility &rarr; Structural &rarr; Resolution &rarr; Action
              </p>
            </div>
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase">
              <span className="px-2 py-0.5 bg-zinc-900 text-white rounded">Algorithm</span>
              <span className="px-2 py-0.5 bg-sky-600 text-white rounded">Intermediate</span>
              <span className="px-2 py-0.5 bg-teal-600 text-white rounded">Possibility</span>
              <span className="px-2 py-0.5 bg-amber-600 text-white rounded">Structural</span>
              <span className="px-2 py-0.5 bg-emerald-700 text-white rounded">Action</span>
            </div>
          </div>
          <div ref={cyContainerRef} className="w-full h-[550px] border border-neutral-200 rounded bg-neutral-50" />
        </div>
      )}

      {/* Tab 5: Multi-Domain Cases */}
      {activeSubTab === 'CASES' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {cases.map((c: any) => (
            <div key={c.id} className="p-5 bg-white border border-neutral-200 rounded-lg shadow-sm">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 bg-teal-100 text-teal-900 text-[10px] font-bold rounded uppercase tracking-wider">
                  Case {c.domain}
                </span>
                <span className="font-mono text-neutral-500 text-xs">{c.id}</span>
              </div>
              <h4 className="text-sm font-bold text-neutral-900 mt-2">{c.name}</h4>
              <p className="text-xs text-neutral-600 mt-1">{c.description}</p>
              <div className="mt-3 pt-3 border-t border-neutral-100 text-xs text-neutral-500 flex justify-between font-mono">
                <span>Source: {c.sourceNodeId}</span>
                <span>Target: {c.targetNodeId}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab 6: Synthetic Benchmarks */}
      {activeSubTab === 'BENCHMARKS' && (
        <div className="bg-white border border-neutral-200 rounded-lg overflow-hidden shadow-sm">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-100 text-neutral-600 font-bold uppercase tracking-wider border-b border-neutral-200">
              <tr>
                <th className="py-3 px-4">Nodes</th>
                <th className="py-3 px-3">Edges</th>
                <th className="py-3 px-3">Dijkstra</th>
                <th className="py-3 px-3">K-Shortest</th>
                <th className="py-3 px-3">Topological Sort</th>
                <th className="py-3 px-3">Dominators</th>
                <th className="py-3 px-3">Min-Cut</th>
                <th className="py-3 px-4 text-right">Total Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 font-mono">
              {benchmarks.map(b => (
                <tr key={b.nodeCount} className="hover:bg-neutral-50">
                  <td className="py-3 px-4 font-bold text-neutral-900">{b.nodeCount.toLocaleString()}</td>
                  <td className="py-3 px-3 text-neutral-600">{b.edgeCount.toLocaleString()}</td>
                  <td className="py-3 px-3 text-neutral-700">{b.dijkstraTimeMs} ms</td>
                  <td className="py-3 px-3 text-neutral-700">{b.kShortestPathsTimeMs} ms</td>
                  <td className="py-3 px-3 text-neutral-700">{b.topologicalSortTimeMs} ms</td>
                  <td className="py-3 px-3 text-neutral-700">{b.dominatorsTimeMs} ms</td>
                  <td className="py-3 px-3 text-neutral-700">{b.minCutTimeMs} ms</td>
                  <td className="py-3 px-4 text-right font-bold text-teal-800">{b.totalTimeMs} ms</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

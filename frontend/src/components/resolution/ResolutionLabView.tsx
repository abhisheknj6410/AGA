import React, { useState, useEffect } from 'react';
import {
  ResolutionReasoningResult,
  GraphResolutionCandidate,
  AlgorithmAuditEntry,
  CounterfactualResolutionSimulation,
  Case
} from '../../types/graph';
import {
  fetchResolutionAnalysis,
  fetchAlgorithmAudit,
  runCounterfactualResolutionSimulation
} from '../../api/client';
import {
  GitFork,
  ShieldAlert,
  Play,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Sparkles,
  Layers,
  ArrowRight,
  RefreshCw,
  Info,
  Table,
  Cpu
} from 'lucide-react';

interface Props {
  currentCase: Case;
}

export const ResolutionLabView: React.FC<Props> = ({ currentCase }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ResolutionReasoningResult | null>(null);
  const [audit, setAudit] = useState<AlgorithmAuditEntry[]>([]);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [simResult, setSimResult] = useState<CounterfactualResolutionSimulation | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<GraphResolutionCandidate | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [resData, auditData] = await Promise.all([
        fetchResolutionAnalysis(currentCase.id),
        fetchAlgorithmAudit(currentCase.id)
      ]);
      setData(resData);
      setAudit(auditData);
      if (resData.resolutionCandidates.length > 0) {
        setSelectedCandidate(resData.resolutionCandidates[0]);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load resolution reasoning data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentCase.id]);

  const handleSimulate = async (candidate: GraphResolutionCandidate, action: 'CONFIRM_ELEMENT' | 'REFUTE_ELEMENT' = 'CONFIRM_ELEMENT') => {
    try {
      setSimulating(true);
      const res = await runCounterfactualResolutionSimulation(currentCase.id, candidate.id, action);
      setSimResult(res);
      setSelectedCandidate(candidate);
    } catch (err: any) {
      alert(`Simulation failed: ${err.message}`);
    } finally {
      setSimulating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-zinc-400 space-y-3">
        <RefreshCw className="w-8 h-8 animate-spin text-teal-400" />
        <p className="text-sm font-medium">Computing graph resolution candidates & structural families...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <div className="p-4 bg-red-950/40 border border-red-800 rounded-lg text-red-300 flex items-center justify-between">
          <span>{error || 'No resolution data available. Generate possibilities first.'}</span>
          <button
            onClick={loadData}
            className="px-3 py-1 bg-red-800 hover:bg-red-700 text-white text-xs font-semibold rounded"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const {
    totalSurvivingPossibilities,
    structuralFamilies,
    commonInvariants,
    resolutionCandidates,
    resolutionMatrix,
    contradictionImpacts
  } = data;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 text-zinc-100">
      {/* 1. Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2 py-0.5 text-xs font-bold uppercase tracking-wider bg-teal-500/20 text-teal-300 border border-teal-500/40 rounded">
              Phase 4 Deterministic Layer
            </span>
            <span className="text-xs text-zinc-400 font-mono">
              Structural Entropy: H(P) = {resolutionMatrix.structuralEntropy} bits
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white mt-1">
            Graph Resolution Lab
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Derives observable graph distinctions that most effectively partition and resolve the surviving possibility space.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowAuditModal(true)}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700 rounded-md text-xs font-medium transition"
          >
            <Cpu className="w-3.5 h-3.5 text-teal-400" />
            <span>Algorithm Audit ({audit.length})</span>
          </button>
          <button
            onClick={loadData}
            className="flex items-center space-x-1 px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded-md text-xs font-semibold shadow-sm transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Re-evaluate</span>
          </button>
        </div>
      </div>

      {/* 2. Top Stats Overview Strip */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-lg">
          <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center justify-between">
            <span>Surviving Possibilities</span>
            <GitFork className="w-4 h-4 text-teal-400" />
          </div>
          <div className="text-2xl font-bold text-white mt-2">
            {totalSurvivingPossibilities}
          </div>
          <div className="text-xs text-zinc-500 mt-1">100% physically & temporally valid</div>
        </div>

        <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-lg">
          <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center justify-between">
            <span>Structural Families</span>
            <Layers className="w-4 h-4 text-teal-400" />
          </div>
          <div className="text-2xl font-bold text-teal-300 mt-2">
            {structuralFamilies.length}
          </div>
          <div className="text-xs text-zinc-500 mt-1">Clustered by topological backbone</div>
        </div>

        <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-lg">
          <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center justify-between">
            <span>Universal Invariants</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-300 mt-2">
            {commonInvariants.commonNodes.length} Nodes / {commonInvariants.commonEdges.length} Edges
          </div>
          <div className="text-xs text-zinc-500 mt-1">
            {commonInvariants.commonUnavoidableDominatorNodes.length} dominator choke points
          </div>
        </div>

        <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-lg">
          <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center justify-between">
            <span>Resolution Candidates</span>
            <Sparkles className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-300 mt-2">
            {resolutionCandidates.length}
          </div>
          <div className="text-xs text-zinc-500 mt-1">Ranked by partition utility score</div>
        </div>
      </div>

      {/* 3. Structural Families Strip */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-300 flex items-center space-x-2">
          <Layers className="w-4 h-4 text-teal-400" />
          <span>Structural Possibility Families ({structuralFamilies.length})</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {structuralFamilies.map(fam => (
            <div
              key={fam.familyId}
              className="p-4 bg-zinc-900/90 border border-zinc-800 rounded-lg hover:border-teal-500/50 transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 text-xs font-mono font-bold bg-teal-950 text-teal-300 border border-teal-800 rounded">
                    {fam.familyId}
                  </span>
                  <span className="text-xs text-zinc-400 font-medium">
                    {fam.possibilityIds.length} branch(es)
                  </span>
                </div>
                <h3 className="text-sm font-bold text-white mt-2">
                  {fam.familyLabel}
                </h3>
                <p className="text-xs text-zinc-400 mt-1 font-mono">
                  Backbone: {fam.backboneSignature}
                </p>
                <div className="mt-3 space-y-1">
                  {fam.keySharedFeatures.map((feat, idx) => (
                    <div key={idx} className="text-xs text-zinc-300 flex items-start space-x-1.5">
                      <span className="text-teal-400 font-bold">•</span>
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-zinc-800/80 flex items-center justify-between text-xs text-zinc-500 font-mono">
                <span>Rep: {fam.representativePossibilityId.slice(0, 12)}...</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Common Universal Invariants & Choke Points */}
      <div className="p-5 bg-zinc-900 border border-zinc-800 rounded-lg space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-300 flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Universal Invariants (Common Across 100% of Surviving Paths)</span>
          </h2>
          <span className="text-xs font-semibold px-2 py-0.5 bg-emerald-950 text-emerald-300 border border-emerald-800 rounded">
            Invariant Certainty: 100%
          </span>
        </div>
        <p className="text-xs text-zinc-400">
          These elements are structurally required by every physically and temporally valid possibility. They are not differentiating targets.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          {/* Dominator Choke Points */}
          <div className="p-3 bg-zinc-950 border border-zinc-800 rounded">
            <div className="text-xs font-bold text-teal-400 uppercase tracking-wider">
              Unavoidable Dominator Choke Points
            </div>
            <div className="mt-2 space-y-1">
              {commonInvariants.commonUnavoidableDominatorNodes.length > 0 ? (
                commonInvariants.commonUnavoidableDominatorNodes.map(dom => (
                  <div key={dom.id} className="text-xs text-zinc-200 flex items-center space-x-1.5 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-400"></span>
                    <span>{dom.label}</span>
                    <span className="text-zinc-500 text-[10px]">({dom.id})</span>
                  </div>
                ))
              ) : (
                <div className="text-xs text-zinc-500 italic">No global dominator choke points</div>
              )}
            </div>
          </div>

          {/* Common Entities & Events */}
          <div className="p-3 bg-zinc-950 border border-zinc-800 rounded">
            <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
              Common Entities & Events ({commonInvariants.commonNodes.length})
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
              {commonInvariants.commonNodes.slice(0, 10).map(n => (
                <span
                  key={n.id}
                  className="px-2 py-0.5 text-xs bg-zinc-800 text-zinc-300 border border-zinc-700 rounded"
                >
                  {n.label}
                </span>
              ))}
              {commonInvariants.commonNodes.length > 10 && (
                <span className="text-xs text-zinc-500 self-center">
                  +{commonInvariants.commonNodes.length - 10} more
                </span>
              )}
            </div>
          </div>

          {/* Common Evidence & Critical Cuts */}
          <div className="p-3 bg-zinc-950 border border-zinc-800 rounded">
            <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
              Common Supporting Evidence ({commonInvariants.commonEvidenceRefs.length})
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
              {commonInvariants.commonEvidenceRefs.map(evId => (
                <span
                  key={evId}
                  className="px-2 py-0.5 text-xs font-mono bg-zinc-800 text-zinc-300 border border-zinc-700 rounded"
                >
                  {evId}
                </span>
              ))}
              {commonInvariants.commonEvidenceRefs.length === 0 && (
                <span className="text-xs text-zinc-500 italic">None universal across all branches</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 5. Resolution Candidates Table */}
      <div className="p-5 bg-zinc-900 border border-zinc-800 rounded-lg space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-300 flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Prioritized Resolution Candidates</span>
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Ranked by deterministic Resolution Utility: how effectively obtaining this evidence partitions and reduces the possibility space.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border border-zinc-800 rounded-lg">
            <thead className="bg-zinc-950 text-zinc-400 font-semibold border-b border-zinc-800">
              <tr>
                <th className="p-3">Rank / ID</th>
                <th className="p-3">Target Element</th>
                <th className="p-3">Graph Basis</th>
                <th className="p-3">Partition Effect</th>
                <th className="p-3">Suggested Evidence</th>
                <th className="p-3">Resolution Utility</th>
                <th className="p-3 text-right">Simulation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800 text-zinc-200">
              {resolutionCandidates.map(cand => (
                <tr
                  key={cand.id}
                  className={`hover:bg-zinc-800/50 transition ${
                    selectedCandidate?.id === cand.id ? 'bg-teal-950/20' : ''
                  }`}
                >
                  <td className="p-3 font-mono font-bold text-teal-400">{cand.id}</td>
                  <td className="p-3">
                    <div className="font-semibold text-white">{cand.targetLabel}</div>
                    <div className="text-[11px] text-zinc-400 mt-0.5 line-clamp-1">{cand.why}</div>
                  </td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                      {cand.graphBasis}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center space-x-2">
                      <span className="text-emerald-400 font-medium">
                        +{cand.partition.ifPresentValidPossibilityIds.length} Valid
                      </span>
                      <span className="text-zinc-500">/</span>
                      <span className="text-red-400 font-medium">
                        -{cand.partition.ifAbsentValidPossibilityIds.length} Pruned
                      </span>
                    </div>
                  </td>
                  <td className="p-3 font-medium text-zinc-300">{cand.suggestedEvidenceClass}</td>
                  <td className="p-3">
                    <div className="flex items-center space-x-2">
                      <div className="w-16 bg-zinc-800 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-teal-400 h-2 rounded-full"
                          style={{ width: `${cand.resolutionUtilityScore}%` }}
                        ></div>
                      </div>
                      <span className="font-bold text-teal-300 font-mono">
                        {cand.resolutionUtilityScore}
                      </span>
                    </div>
                  </td>
                  <td className="p-3 text-right">
                    <button
                      onClick={() => handleSimulate(cand, 'CONFIRM_ELEMENT')}
                      disabled={simulating}
                      className="px-2.5 py-1 bg-teal-600 hover:bg-teal-500 text-white rounded font-medium text-xs shadow-sm transition disabled:opacity-50"
                    >
                      Simulate
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 6. Counterfactual Simulation Result Drawer/Card */}
      {simResult && (
        <div className="p-5 bg-teal-950/20 border border-teal-500/40 rounded-lg space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-5 h-5 text-teal-400" />
              <h3 className="text-sm font-bold text-white">
                Counterfactual Simulation: {selectedCandidate?.targetLabel}
              </h3>
            </div>
            <button
              onClick={() => setSimResult(null)}
              className="text-xs text-zinc-400 hover:text-white"
            >
              Dismiss
            </button>
          </div>

          <p className="text-xs text-zinc-300 font-medium">{simResult.explanation}</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
            <div className="p-3 bg-zinc-900 border border-zinc-800 rounded text-xs">
              <span className="text-zinc-400 font-bold block mb-1">Before Simulation</span>
              <span className="text-lg font-bold text-white">
                {simResult.beforePossibilityIds.length} Possibilities
              </span>
            </div>

            <div className="p-3 bg-zinc-900 border border-zinc-800 rounded text-xs">
              <span className="text-emerald-400 font-bold block mb-1">After Confirmation</span>
              <span className="text-lg font-bold text-emerald-300">
                {simResult.afterPossibilityIds.length} Surviving Branches
              </span>
            </div>

            <div className="p-3 bg-zinc-900 border border-zinc-800 rounded text-xs">
              <span className="text-red-400 font-bold block mb-1">Pruned Corridors</span>
              <span className="text-lg font-bold text-red-300">
                {simResult.eliminatedPossibilityIds.length} Eliminated
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 7. Interactive Resolution Matrix */}
      <div className="p-5 bg-zinc-900 border border-zinc-800 rounded-lg space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-300 flex items-center space-x-2">
            <Table className="w-4 h-4 text-teal-400" />
            <span>Partition Matrix: Candidates vs Possibilities</span>
          </h2>
          <span className="text-xs font-mono text-zinc-400">
            H(P) = {resolutionMatrix.structuralEntropy} (Equal-Weight Structural Uncertainty)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-center text-xs border border-zinc-800">
            <thead className="bg-zinc-950 text-zinc-400 font-semibold border-b border-zinc-800">
              <tr>
                <th className="p-2.5 text-left">Resolution Candidate</th>
                <th className="p-2.5 text-left">Utility</th>
                {resolutionMatrix.possibilities.map(p => (
                  <th key={p.id} className="p-2.5">
                    <div>{p.name.slice(0, 16)}...</div>
                    <div className="text-[10px] text-teal-400 font-mono font-normal">{p.familyId}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800 text-zinc-200">
              {resolutionMatrix.candidates.map(c => (
                <tr key={c.id} className="hover:bg-zinc-800/40">
                  <td className="p-2.5 text-left font-medium text-white">{c.label}</td>
                  <td className="p-2.5 text-left font-mono font-bold text-teal-400">{c.utilityScore}</td>
                  {resolutionMatrix.possibilities.map(p => {
                    const matches = resolutionMatrix.matrix[c.id]?.[p.id];
                    return (
                      <td key={p.id} className="p-2.5">
                        {matches ? (
                          <span className="text-emerald-400 font-bold">✓</span>
                        ) : (
                          <span className="text-zinc-600 font-bold">✗</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 8. Contradiction Impact Breakdown */}
      {contradictionImpacts.length > 0 && (
        <div className="p-5 bg-zinc-900 border border-zinc-800 rounded-lg space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-300 flex items-center space-x-2">
            <ShieldAlert className="w-4 h-4 text-amber-400" />
            <span>Contradiction Impact Analysis ({contradictionImpacts.length})</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {contradictionImpacts.map(ci => (
              <div key={ci.contradictionId} className="p-3.5 bg-zinc-950 border border-zinc-800 rounded-lg text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-amber-400">{ci.contradictionId}</span>
                  <span className="text-zinc-400">{ci.affectedPossibilityIds.length} affected branch(es)</span>
                </div>
                <div className="font-semibold text-white">
                  '{ci.conflictingEvidence[0]?.label}' vs '{ci.conflictingEvidence[1]?.label}'
                </div>
                <p className="text-zinc-400">{ci.reason}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 9. Algorithm Audit Modal */}
      {showAuditModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-5xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Cpu className="w-5 h-5 text-teal-400" />
                <h3 className="font-bold text-white text-base">
                  Phase 4 Algorithm Audit & Ablation Catalog
                </h3>
              </div>
              <button
                onClick={() => setShowAuditModal(false)}
                className="text-zinc-400 hover:text-white text-xs px-2 py-1 rounded bg-zinc-800"
              >
                Close
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-4">
              <p className="text-xs text-zinc-400">
                Formal classification of all graph algorithms into GENERATIVE, FILTERING, STRUCTURAL, DIFFERENTIATING, EVOLUTIONARY, or RESOLUTION roles with verified ablation effects.
              </p>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border border-zinc-800 rounded-lg">
                  <thead className="bg-zinc-950 text-zinc-400 font-semibold border-b border-zinc-800">
                    <tr>
                      <th className="p-2.5">Algorithm</th>
                      <th className="p-2.5">Classification</th>
                      <th className="p-2.5">Downstream Consumer</th>
                      <th className="p-2.5">Ablation Result</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800 text-zinc-200">
                    {audit.map((entry, idx) => (
                      <tr key={idx} className="hover:bg-zinc-800/40">
                        <td className="p-2.5 font-bold text-white">{entry.algorithmName}</td>
                        <td className="p-2.5">
                          <span
                            className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded ${
                              entry.classification === 'GENERATIVE'
                                ? 'bg-blue-950 text-blue-300 border border-blue-800'
                                : entry.classification === 'FILTERING'
                                ? 'bg-red-950 text-red-300 border border-red-800'
                                : entry.classification === 'STRUCTURAL'
                                ? 'bg-purple-950 text-purple-300 border border-purple-800'
                                : entry.classification === 'DIFFERENTIATING'
                                ? 'bg-amber-950 text-amber-300 border border-amber-800'
                                : entry.classification === 'EVOLUTIONARY'
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                : 'bg-teal-950 text-teal-300 border border-teal-800'
                            }`}
                          >
                            {entry.classification}
                          </span>
                        </td>
                        <td className="p-2.5 font-mono text-[11px] text-zinc-400">
                          {entry.consumers.join(', ')}
                        </td>
                        <td className="p-2.5 text-zinc-300">{entry.ablationResult}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

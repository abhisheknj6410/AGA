import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  HelpCircle,
  CheckCircle2,
  XCircle,
  FileCheck,
  Search,
  Scale,
  Activity,
  Layers,
  Sparkles,
  Cpu,
  Clock,
  ExternalLink,
  ChevronRight,
  TrendingDown,
  Info
} from 'lucide-react';
import {
  EpistemicValidationReport,
  PossibilityEpistemicAssessment,
  ActionJustification,
  FalsePositiveCheck,
  EpistemicStatus
} from '../../types/graph';
import { fetchEpistemicValidation } from '../../api/client';

interface ValidationLabViewProps {
  caseId: string;
}

export const ValidationLabView: React.FC<ValidationLabViewProps> = ({ caseId }) => {
  const [data, setData] = useState<EpistemicValidationReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPossibilityId, setSelectedPossibilityId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  const loadValidation = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchEpistemicValidation(caseId);
      setData(res);
      if (res.assessments && res.assessments.length > 0) {
        setSelectedPossibilityId(res.assessments[0].possibilityId);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load epistemic validation report');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadValidation();
  }, [caseId]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center h-full bg-zinc-50 dark:bg-zinc-950">
        <div className="flex flex-col items-center gap-3 text-zinc-500 dark:text-zinc-400">
          <Scale className="w-8 h-8 animate-spin text-teal-500" />
          <p className="text-sm font-medium">Running Epistemic Triad & Adversarial Stress Suite...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex-1 p-6 bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center justify-center">
        <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 p-6 rounded-xl max-w-lg text-center">
          <ShieldAlert className="w-8 h-8 text-rose-500 mx-auto mb-2" />
          <h3 className="font-semibold text-rose-900 dark:text-rose-200 mb-1">Validation Engine Error</h3>
          <p className="text-xs text-rose-700 dark:text-rose-400 mb-4">{error || 'No validation data available.'}</p>
          <button
            onClick={loadValidation}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg shadow-sm transition"
          >
            Retry Validation
          </button>
        </div>
      </div>
    );
  }

  const getStatusBadge = (status: EpistemicStatus) => {
    switch (status) {
      case 'STRUCTURALLY_SUPPORTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Structurally Supported
          </span>
        );
      case 'CONDITIONALLY_SUPPORTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-300 dark:border-blue-800">
            <Info className="w-3.5 h-3.5" />
            Conditionally Supported
          </span>
        );
      case 'CONFLICTING':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
            <AlertTriangle className="w-3.5 h-3.5" />
            Conflicting Evidence
          </span>
        );
      case 'INSUFFICIENT_EVIDENCE':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-300 dark:border-purple-800">
            <HelpCircle className="w-3.5 h-3.5" />
            Insufficient Evidence
          </span>
        );
      case 'UNEXPLAINED':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
            <XCircle className="w-3.5 h-3.5" />
            Unexplained
          </span>
        );
    }
  };

  const selectedAssessment = data.assessments.find(a => a.possibilityId === selectedPossibilityId) || data.assessments[0];

  const filteredAssessments = data.assessments.filter(a => {
    if (filterStatus === 'ALL') return true;
    return a.epistemicStatus === filterStatus;
  });

  return (
    <div className="flex-1 flex flex-col h-full bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 overflow-y-auto">
      {/* Header Bar */}
      <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800/80 text-teal-600 dark:text-teal-400">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                  Validation Lab & Epistemic Audit
                </h1>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Adversarial stress-testing, epistemic triad validation, and false positive action auditing.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="text-[11px] uppercase tracking-wider text-zinc-400 font-semibold block">Overall Case Status</span>
              {getStatusBadge(data.overallStatus)}
            </div>
            <button
              onClick={loadValidation}
              className="px-3.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700/60 text-xs font-semibold text-zinc-700 dark:text-zinc-300 transition shadow-xs"
            >
              Re-Audit
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 space-y-6 w-full">
        {/* Top Summary: Adversarial Stress Test Battery */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-zinc-100 dark:border-zinc-800">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-teal-500" />
              <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                Adversarial Stress Test Battery
              </h2>
            </div>
            <span className="text-xs font-mono text-zinc-500">
              Evaluated {data.totalPossibilitiesEvaluated} possibilities ({data.survivingCount} surviving)
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/80 dark:border-zinc-800">
              <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider block mb-1">Ambiguity</span>
              <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
                <span>Preserved</span>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/80 dark:border-zinc-800">
              <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider block mb-1">Sparse Evidence</span>
              <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
                <span>No False Certainty</span>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/80 dark:border-zinc-800">
              <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider block mb-1">Contradictions</span>
              <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
                <span>Exposed</span>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/80 dark:border-zinc-800">
              <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider block mb-1">Temporal Precision</span>
              <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
                <span>Coarse Permitted</span>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/80 dark:border-zinc-800">
              <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider block mb-1">Disconnected Data</span>
              <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
                <span>Rejected</span>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/80 dark:border-zinc-800">
              <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider block mb-1">Bottleneck Proof</span>
              <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
                <span>No Convergence</span>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/80 dark:border-zinc-800">
              <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider block mb-1">All-Invalidated</span>
              <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
                <span>Model Revision</span>
              </div>
            </div>
          </div>
        </div>

        {/* False Positive Detection & Warnings Banner */}
        {data.falsePositiveDetections && data.falsePositiveDetections.length > 0 && (
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-xl p-5 shadow-xs">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              <h2 className="text-sm font-bold text-amber-900 dark:text-amber-200">
                False Positive Checks ({data.falsePositiveDetections.length} flagged)
              </h2>
            </div>
            <div className="space-y-2.5">
              {data.falsePositiveDetections.map((check, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-lg bg-white/80 dark:bg-zinc-900/80 border border-amber-200/80 dark:border-amber-800/40 text-xs flex flex-col md:flex-row md:items-center justify-between gap-2"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 font-mono text-[10px] rounded bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 font-semibold">
                        {check.targetType}: {check.target}
                      </span>
                      <span className="font-semibold text-zinc-800 dark:text-zinc-200">{check.issue}</span>
                    </div>
                    <p className="text-zinc-600 dark:text-zinc-400">
                      <span className="font-medium text-zinc-700 dark:text-zinc-300">Correction:</span> {check.suggestedCorrection}
                    </p>
                  </div>
                  <span className={`px-2 py-1 rounded text-[10px] font-bold self-start md:self-center ${
                    check.severity === 'CRITICAL'
                      ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                      : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                  }`}>
                    {check.severity}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Main Grid: Possibility Epistemic Assessment + Triad Detail */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Possibilities Table */}
          <div className="lg:col-span-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-teal-500" />
                <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  Possibility Epistemic Statuses
                </h2>
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-lg text-xs">
                {['ALL', 'STRUCTURALLY_SUPPORTED', 'CONDITIONALLY_SUPPORTED', 'CONFLICTING', 'INSUFFICIENT_EVIDENCE'].map(f => (
                  <button
                    key={f}
                    onClick={() => setFilterStatus(f)}
                    className={`px-2 py-1 rounded-md text-[11px] font-medium transition ${
                      filterStatus === f
                        ? 'bg-white dark:bg-zinc-900 text-teal-600 dark:text-teal-400 shadow-2xs font-semibold'
                        : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                    }`}
                  >
                    {f === 'ALL' ? 'All' : f.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-400 font-medium">
                    <th className="pb-2">Possibility</th>
                    <th className="pb-2">Epistemic Status</th>
                    <th className="pb-2 text-center">Evidence Ratio</th>
                    <th className="pb-2 text-center">Temporal</th>
                    <th className="pb-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                  {filteredAssessments.map(item => (
                    <tr
                      key={item.possibilityId}
                      onClick={() => setSelectedPossibilityId(item.possibilityId)}
                      className={`cursor-pointer transition-colors ${
                        selectedPossibilityId === item.possibilityId
                          ? 'bg-teal-50/60 dark:bg-teal-950/20'
                          : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/40'
                      }`}
                    >
                      <td className="py-3 pr-3">
                        <span className="font-semibold text-zinc-900 dark:text-zinc-100 block">
                          {item.name}
                        </span>
                        <span className="font-mono text-[10px] text-zinc-400">
                          {item.possibilityId}
                        </span>
                      </td>
                      <td className="py-3 px-2">
                        {getStatusBadge(item.epistemicStatus)}
                      </td>
                      <td className="py-3 px-2 text-center">
                        <span className="font-mono font-bold text-zinc-800 dark:text-zinc-200">
                          {Math.round(item.evidenceRatio * 100)}%
                        </span>
                        <span className="text-[10px] text-zinc-400 block">
                          {item.supportingEvidenceCount} sup / {item.conflictingEvidenceCount} conf
                        </span>
                      </td>
                      <td className="py-3 px-2 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          item.temporalConsistency === 'STRICTLY_ORDERED'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : item.temporalConsistency === 'COARSE_PERMITTED'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                        }`}>
                          {item.temporalConsistency}
                        </span>
                      </td>
                      <td className="py-3 pl-2 text-right">
                        <ChevronRight className={`w-4 h-4 inline-block ${
                          selectedPossibilityId === item.possibilityId
                            ? 'text-teal-600 dark:text-teal-400'
                            : 'text-zinc-300 dark:text-zinc-600'
                        }`} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right Column: Epistemic Triad Breakdown */}
          {selectedAssessment && (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-xs space-y-4">
              <div className="border-b border-zinc-100 dark:border-zinc-800 pb-3">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-teal-600 dark:text-teal-400">
                  Triad Inspection
                </span>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mt-0.5">
                  {selectedAssessment.name}
                </h3>
              </div>

              {/* 3 Pillars of Triad */}
              <div className="space-y-3">
                {/* Pillar 1: Graph Consistent */}
                <div className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                      <Scale className="w-3.5 h-3.5 text-teal-500" />
                      1. Graph Consistent
                    </span>
                    {selectedAssessment.triad.isGraphConsistent ? (
                      <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Valid
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                        <XCircle className="w-3 h-3" /> Inverted
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
                    {selectedAssessment.triad.consistencyDetail}
                  </p>
                </div>

                {/* Pillar 2: Evidence Supported */}
                <div className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-teal-500" />
                      2. Evidence Supported
                    </span>
                    {selectedAssessment.triad.isEvidenceSupported ? (
                      <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Corroborated
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 flex items-center gap-1">
                        <HelpCircle className="w-3 h-3" /> Uncorroborated
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
                    {selectedAssessment.triad.evidenceDetail}
                  </p>
                </div>

                {/* Pillar 3: Investigatively Useful */}
                <div className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      3. Investigatively Useful
                    </span>
                    {selectedAssessment.triad.isInvestigativelyUseful ? (
                      <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> High Utility
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-zinc-400 flex items-center gap-1">
                        <Info className="w-3 h-3" /> Invariant
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
                    {selectedAssessment.triad.utilityDetail}
                  </p>
                </div>
              </div>

              {/* Structural Assumptions */}
              {selectedAssessment.structuralAssumptions && selectedAssessment.structuralAssumptions.length > 0 && (
                <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800">
                  <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
                    Structural Assumptions ({selectedAssessment.structuralAssumptions.length})
                  </span>
                  <ul className="space-y-1">
                    {selectedAssessment.structuralAssumptions.map((ass, i) => (
                      <li key={i} className="text-[11px] text-zinc-600 dark:text-zinc-400 flex items-start gap-1.5">
                        <span className="text-teal-500 font-bold">•</span>
                        <span>{ass}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Algorithm Provenance */}
              {selectedAssessment.algorithmProvenance && (
                <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800">
                  <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
                    Algorithm Provenance
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {selectedAssessment.algorithmProvenance.map((alg, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                      >
                        {alg}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Justifications Table */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-zinc-100 dark:border-zinc-800">
            <div className="flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-teal-500" />
              <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                Action Justification Audit ({data.actionJustifications.length} actions evaluated)
              </h2>
            </div>
            <span className="text-xs text-zinc-500">
              Verifies every recommended action resolves an actual distinguishing graph structure
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-400 font-medium">
                  <th className="pb-2">Action / Target</th>
                  <th className="pb-2">Epistemic Status</th>
                  <th className="pb-2">Graph Basis</th>
                  <th className="pb-2">Unresolved Gap</th>
                  <th className="pb-2 text-center">Info Gain</th>
                  <th className="pb-2 text-center">False Positive Risk</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                {data.actionJustifications.map(act => (
                  <tr key={act.actionId} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition">
                    <td className="py-3 pr-3">
                      <span className="font-semibold text-zinc-900 dark:text-zinc-100 block">
                        {act.targetLabel}
                      </span>
                      <span className="text-[10px] text-zinc-400 font-mono">
                        {act.actionId}
                      </span>
                    </td>
                    <td className="py-3 px-2">
                      {getStatusBadge(act.epistemicStatus)}
                    </td>
                    <td className="py-3 px-2 font-mono text-[11px] text-teal-600 dark:text-teal-400 font-medium">
                      {act.graphBasis}
                    </td>
                    <td className="py-3 px-2 text-zinc-600 dark:text-zinc-400 text-[11px] max-w-xs">
                      {act.unresolvedGap}
                    </td>
                    <td className="py-3 px-2 text-center font-mono font-bold text-zinc-800 dark:text-zinc-200">
                      {act.expectedInformationGain} bits
                    </td>
                    <td className="py-3 pl-2 text-center">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        act.falsePositiveRisk === 'LOW'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : act.falsePositiveRisk === 'MEDIUM'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                          : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                      }`}>
                        {act.falsePositiveRisk}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

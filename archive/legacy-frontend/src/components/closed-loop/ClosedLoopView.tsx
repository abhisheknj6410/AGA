import React, { useState, useEffect } from 'react';
import {
  fetchClosedLoopCycles,
  fetchLatestClosedLoopCycle,
  fetchClosedLoopBenchmark,
  fetchClosedLoopVersions,
  ingestClosedLoopEvidence
} from '../../api/client';
import {
  RefreshCw,
  PlusCircle,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Zap,
  ArrowRight,
  TrendingDown,
  Layers,
  Activity,
  GitBranch,
  XCircle,
  HelpCircle,
  Check,
  Cpu
} from 'lucide-react';

interface ClosedLoopViewProps {
  caseId: string;
}

export const ClosedLoopView: React.FC<ClosedLoopViewProps> = ({ caseId }) => {
  const [cycles, setCycles] = useState<any[]>([]);
  const [latestCycle, setLatestCycle] = useState<any | null>(null);
  const [benchmark, setBenchmark] = useState<any | null>(null);
  const [versions, setVersions] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [ingesting, setIngesting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [evidenceLabel, setEvidenceLabel] = useState<string>('Corridor 4 Motion Detector Event');
  const [evidenceType, setEvidenceType] = useState<string>('LOG');
  const [targetEntity, setTargetEntity] = useState<string>('location-vault');
  const [evidenceSource, setEvidenceSource] = useState<string>('Vault Facility Alarm Subsystem');
  const [ingestSummary, setIngestSummary] = useState<string>('Ingested motion log for vault corridor');
  const [requestedActionId, setRequestedActionId] = useState<string>('');

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [cycleList, latest, bench, vers] = await Promise.all([
        fetchClosedLoopCycles(caseId),
        fetchLatestClosedLoopCycle(caseId),
        fetchClosedLoopBenchmark(caseId),
        fetchClosedLoopVersions(caseId)
      ]);
      setCycles(cycleList);
      setLatestCycle(latest);
      setBenchmark(bench);
      setVersions(vers);
    } catch (err: any) {
      setError(err.message || 'Failed to load closed-loop data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [caseId]);

  const handleIngest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!evidenceLabel.trim()) return;

    try {
      setIngesting(true);
      setError(null);

      const evidenceId = `ev-ui-${Date.now().toString(36)}`;
      const payload = {
        evidenceNode: {
          id: evidenceId,
          category: 'EVIDENCE',
          type: evidenceType,
          label: evidenceLabel,
          source: { name: evidenceSource, kind: 'SYSTEM' },
          reliability: 0.95
        },
        attachedEdges: [
          {
            id: `e-ui-${Date.now().toString(36)}`,
            source: evidenceId,
            target: targetEntity,
            type: 'SUPPORTS',
            status: 'OBSERVED',
            evidenceRefs: [evidenceId],
            cost: 0.2
          }
        ],
        summary: ingestSummary,
        requestedByActionId: requestedActionId.trim() || undefined
      };

      const newCycle = await ingestClosedLoopEvidence(caseId, payload);
      setLatestCycle(newCycle);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Evidence ingestion failed.');
    } finally {
      setIngesting(false);
    }
  };

  if (loading && !latestCycle) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex items-center gap-3 text-slate-400">
          <RefreshCw className="h-5 w-5 animate-spin text-emerald-400" />
          <span>Compiling Closed-Loop Investigation Engine...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <Zap className="h-6 w-6 text-emerald-400" />
              Closed-Loop Investigation Engine
            </h1>
            <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400 border border-emerald-500/20">
              Phase 7 Active
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-400">
            Continuous Bayesian-style graph reasoning: Evidence → Graph Mutation → Algorithms Affected → Possibility Changes → Resolution Changes → Investigation Changes.
          </p>
        </div>

        <button
          onClick={loadData}
          className="flex items-center gap-2 rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-700 hover:text-white transition-colors border border-slate-700"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh Pipeline
        </button>
      </div>

      {error && (
        <div className="rounded-xl bg-rose-500/10 p-4 border border-rose-500/20 text-rose-300 text-sm flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 shrink-0 text-rose-400" />
          <div>
            <div className="font-semibold text-rose-200">Execution Error</div>
            <div>{error}</div>
          </div>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Evidence Ingestion Card */}
        <div className="lg:col-span-1 space-y-6">
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 shadow-xl backdrop-blur-sm">
            <h3 className="text-base font-semibold text-white flex items-center gap-2 mb-4">
              <PlusCircle className="h-5 w-5 text-emerald-400" />
              Ingest New Evidence (Closed-Loop)
            </h3>

            <form onSubmit={handleIngest} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Evidence Label / Title
                </label>
                <input
                  type="text"
                  value={evidenceLabel}
                  onChange={(e) => setEvidenceLabel(e.target.value)}
                  className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                  placeholder="e.g. CCTV Recording East Gate"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Evidence Type
                  </label>
                  <select
                    value={evidenceType}
                    onChange={(e) => setEvidenceType(e.target.value)}
                    className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="LOG">LOG</option>
                    <option value="CCTV">CCTV</option>
                    <option value="DOCUMENT">DOCUMENT</option>
                    <option value="NETWORK_CAPTURE">NETWORK_CAPTURE</option>
                    <option value="SYSTEM_RECORD">SYSTEM_RECORD</option>
                    <option value="MANUAL_ENTRY">MANUAL_ENTRY</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Target Connected Node
                  </label>
                  <input
                    type="text"
                    value={targetEntity}
                    onChange={(e) => setTargetEntity(e.target.value)}
                    className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                    placeholder="e.g. location-vault"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Provenance Source Name
                </label>
                <input
                  type="text"
                  value={evidenceSource}
                  onChange={(e) => setEvidenceSource(e.target.value)}
                  className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                  placeholder="e.g. Vault Access Log Archive"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Requested By Action ID (Optional)
                </label>
                <input
                  type="text"
                  value={requestedActionId}
                  onChange={(e) => setRequestedActionId(e.target.value)}
                  className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                  placeholder="e.g. ACT-1 (resolves this inquiry)"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Mutation Summary / Reason
                </label>
                <input
                  type="text"
                  value={ingestSummary}
                  onChange={(e) => setIngestSummary(e.target.value)}
                  className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={ingesting}
                className="w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg hover:bg-emerald-500 focus:outline-none transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {ingesting ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Propagating Incremental Recalculation...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4" />
                    Submit & Recalculate Closed Loop
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Benchmark Card */}
          {benchmark && (
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 shadow-xl backdrop-blur-sm">
              <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2 mb-3">
                <Cpu className="h-4 w-4 text-sky-400" />
                Incremental vs Full Benchmark
              </h3>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-lg bg-slate-950/70 p-3 border border-slate-800">
                  <div className="text-slate-400">Incremental Runtime</div>
                  <div className="text-base font-bold text-emerald-400 mt-1">
                    {benchmark.incrementalTimeMs} ms
                  </div>
                </div>
                <div className="rounded-lg bg-slate-950/70 p-3 border border-slate-800">
                  <div className="text-slate-400">Full Recomputation</div>
                  <div className="text-base font-bold text-rose-400 mt-1">
                    {benchmark.fullRecomputeTimeMs} ms
                  </div>
                </div>
                <div className="rounded-lg bg-slate-950/70 p-3 border border-slate-800">
                  <div className="text-slate-400">Speedup Ratio</div>
                  <div className="text-base font-bold text-sky-400 mt-1">
                    {benchmark.speedupRatio}x faster
                  </div>
                </div>
                <div className="rounded-lg bg-slate-950/70 p-3 border border-slate-800">
                  <div className="text-slate-400">Cache Hits / Misses</div>
                  <div className="text-base font-bold text-amber-400 mt-1">
                    {benchmark.cacheHitCount} / {benchmark.cacheMissCount}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right 2 Columns: Impact Trace & Evolution Results */}
        <div className="lg:col-span-2 space-y-6">
          {latestCycle ? (
            <>
              {/* Unexpected Evidence Alert Banner */}
              {latestCycle.unexpectedEvidence?.isUnexpected && (
                <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-5 text-amber-200">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-6 w-6 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-amber-100">
                          {latestCycle.unexpectedEvidence.anomalyType === 'UNEXPLAINED_SUBGRAPH'
                            ? 'UNEXPLAINED SUBGRAPH DETECTED'
                            : 'MODEL REVISION REQUIRED'}
                        </span>
                        <span className="rounded bg-amber-500/20 px-2 py-0.5 text-xs text-amber-300 font-mono">
                          Zero Speculative Hypotheses Auto-Invented
                        </span>
                      </div>
                      <p className="text-sm mt-1 text-amber-200/90">
                        {latestCycle.unexpectedEvidence.anomalyReason}
                      </p>
                      <div className="mt-2 text-xs font-medium text-amber-300">
                        Investigator Guidance: {latestCycle.unexpectedEvidence.recommendation}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Counterfactual vs Actual Card */}
              {latestCycle.counterfactualVsActual && (
                <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 shadow-xl backdrop-blur-sm">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                      <TrendingDown className="h-4 w-4 text-emerald-400" />
                      Counterfactual Prediction vs Actual Outcome
                    </h3>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      latestCycle.counterfactualVsActual.predictionAccuracy === 'EXACT'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                    }`}>
                      {latestCycle.counterfactualVsActual.predictionAccuracy} PREDICTION
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mb-3">
                    {latestCycle.counterfactualVsActual.explanation}
                  </p>
                  <div className="grid grid-cols-3 gap-3 text-xs">
                    <div className="rounded bg-slate-950 p-2.5 border border-slate-800">
                      <div className="text-slate-400">Actual Survivors</div>
                      <div className="text-sm font-bold text-white mt-1">
                        {latestCycle.counterfactualVsActual.actualOutcome.actualSurvivingCount} branch(es)
                      </div>
                    </div>
                    <div className="rounded bg-slate-950 p-2.5 border border-slate-800">
                      <div className="text-slate-400">Actual Eliminated</div>
                      <div className="text-sm font-bold text-rose-400 mt-1">
                        {latestCycle.counterfactualVsActual.actualOutcome.actualEliminatedCount} branch(es)
                      </div>
                    </div>
                    <div className="rounded bg-slate-950 p-2.5 border border-slate-800">
                      <div className="text-slate-400">Entropy Reduction</div>
                      <div className="text-sm font-bold text-emerald-400 mt-1">
                        {latestCycle.counterfactualVsActual.actualOutcome.actualEntropyReduction} bits
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 6-Stage Algorithm Impact Trace */}
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 shadow-xl backdrop-blur-sm">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-4">
                  <Activity className="h-4 w-4 text-emerald-400" />
                  Algorithm Impact Trace (V{latestCycle.fromVersion} → V{latestCycle.toVersion})
                </h3>

                <div className="space-y-3">
                  {latestCycle.algorithmImpactTrace.map((stage: any, idx: number) => (
                    <div
                      key={idx}
                      className="rounded-lg bg-slate-950/70 p-3.5 border border-slate-800/80 hover:border-slate-700 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20 text-[10px] font-bold text-emerald-400 border border-emerald-500/30">
                            {idx + 1}
                          </span>
                          <span className="text-xs font-semibold text-white">
                            {stage.title}
                          </span>
                          <span className="font-mono text-[10px] text-slate-500">
                            [{stage.stage}]
                          </span>
                        </div>
                        <span className="text-[11px] font-mono text-slate-400">
                          {stage.durationMs} ms
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 pl-7">
                        {stage.summary}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Lifecycle Transitions */}
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 shadow-xl backdrop-blur-sm">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-3">
                  <CheckCircle2 className="h-4 w-4 text-sky-400" />
                  Investigation Action Lifecycle Transitions
                </h3>

                {latestCycle.actionTransitions.length === 0 ? (
                  <p className="text-xs text-slate-400">No action state transitions recorded in this cycle.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {latestCycle.actionTransitions.map((t: any, idx: number) => {
                      let badgeColor = 'bg-slate-700 text-slate-200';
                      if (t.newStatus === 'RESOLVED') badgeColor = 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30';
                      if (t.newStatus === 'OBSOLETE') badgeColor = 'bg-rose-500/20 text-rose-300 border border-rose-500/30';
                      if (t.newStatus === 'NEWLY_REQUIRED') badgeColor = 'bg-sky-500/20 text-sky-300 border border-sky-500/30';

                      return (
                        <div key={idx} className="rounded-lg bg-slate-950 p-3 border border-slate-800">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs font-semibold text-white">
                              Action {t.actionId}
                            </span>
                            <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${badgeColor}`}>
                              {t.newStatus}
                            </span>
                          </div>
                          <div className="text-xs text-slate-300 mb-1">
                            Target: {t.targetLabel}
                          </div>
                          <p className="text-[11px] text-slate-400">
                            {t.reason}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-8 text-center text-slate-400">
              <Zap className="h-8 w-8 text-slate-600 mx-auto mb-2" />
              <div className="font-semibold text-slate-300">No Closed-Loop Cycle Executed Yet</div>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Ingest evidence using the form on the left to trigger the continuous causal reasoning loop.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Version History Timeline */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 shadow-xl backdrop-blur-sm">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-4">
          <Layers className="h-4 w-4 text-emerald-400" />
          Immutable Version Timeline
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {versions.map((v) => (
            <div
              key={v.versionNumber}
              className="rounded-lg bg-slate-950 p-4 border border-slate-800 hover:border-slate-700 transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-xs font-bold text-emerald-400 border border-emerald-500/20">
                  Version {v.versionNumber}
                </span>
                <span className="text-[10px] text-slate-500 font-mono">
                  {new Date(v.createdAt).toLocaleTimeString()}
                </span>
              </div>
              <div className="text-xs font-medium text-slate-200 mb-2 truncate">
                {v.changeSummary}
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400 border-t border-slate-800/80 pt-2">
                <div>Possibilities: <span className="text-white font-semibold">{v.possibilityCount}</span></div>
                <div>Entropy: <span className="text-emerald-400 font-semibold">{v.entropy}b</span></div>
                <div>Families: <span className="text-white font-semibold">{v.familyCount}</span></div>
                <div>Actions: <span className="text-sky-400 font-semibold">{v.actionCount}</span></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

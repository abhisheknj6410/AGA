import React, { useState, useEffect } from 'react';
import {
  fetchInvestigationPlan,
  simulatePlanAction
} from '../../api/client';
import {
  InvestigationPlan,
  InvestigationAction,
  ActionOutcome
} from '../../types/graph';

interface InvestigationPlanViewProps {
  caseId: string;
}

export const InvestigationPlanView: React.FC<InvestigationPlanViewProps> = ({ caseId }) => {
  const [plan, setPlan] = useState<InvestigationPlan | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAction, setSelectedAction] = useState<InvestigationAction | null>(null);
  const [simulationResult, setSimulationResult] = useState<any | null>(null);
  const [simulating, setSimulating] = useState<boolean>(false);
  const [filterClass, setFilterClass] = useState<string>('ALL');

  const loadPlan = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchInvestigationPlan(caseId);
      setPlan(data);
      if (data.nextImmediateAction) {
        setSelectedAction(data.nextImmediateAction);
      } else if (data.actions && data.actions.length > 0) {
        setSelectedAction(data.actions[0]);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load investigation plan.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (caseId) {
      loadPlan();
    }
  }, [caseId]);

  const handleSimulate = async (actionId: string, outcome: 'CONFIRMED' | 'REFUTED') => {
    try {
      setSimulating(true);
      const res = await simulatePlanAction(caseId, actionId, outcome);
      setSimulationResult(res);
    } catch (err: any) {
      alert(`Simulation error: ${err.message}`);
    } finally {
      setSimulating(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center bg-white min-h-[500px] flex flex-col items-center justify-center">
        <div className="inline-block w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-semibold tracking-wide uppercase text-neutral-600">
          Synthesizing Graph-Driven Investigation Plan...
        </p>
      </div>
    );
  }

  if (error || !plan) {
    return (
      <div className="p-8 bg-white min-h-[500px]">
        <div className="p-4 border border-red-200 bg-red-50 text-red-700 rounded text-sm">
          {error || 'Unable to compute investigation plan.'}
        </div>
        <button
          onClick={loadPlan}
          className="mt-4 px-4 py-2 bg-neutral-900 text-white text-xs font-semibold rounded uppercase tracking-wider hover:bg-neutral-800 transition"
        >
          Retry Plan Generation
        </button>
      </div>
    );
  }

  const filteredActions = plan.actions.filter(a => {
    if (filterClass === 'ALL') return true;
    return a.evidenceClasses.includes(filterClass as any);
  });

  const topAction = plan.nextImmediateAction || plan.actions[0];

  return (
    <div className="p-6 bg-neutral-50 min-h-screen text-neutral-900 font-sans">
      {/* Top Header / Meta Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-neutral-200">
        <div>
          <div className="flex items-center gap-3">
            <span className="px-2.5 py-1 bg-teal-800 text-white text-xs font-bold uppercase tracking-wider rounded">
              Phase 5 Active
            </span>
            <h1 className="text-xl font-bold tracking-tight text-neutral-900">
              Investigation Planning Engine
            </h1>
          </div>
          <p className="text-xs text-neutral-500 mt-1">
            Deterministic, entropy-reducing action schedule derived from Yen's K-Shortest Paths, Lengauer-Tarjan Dominators, and Min-Cut Separators.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadPlan}
            className="px-3 py-1.5 border border-neutral-300 text-neutral-700 text-xs font-semibold rounded hover:bg-neutral-100 transition uppercase tracking-wider"
          >
            Re-evaluate Graph
          </button>
        </div>
      </div>

      {/* 4 Metric KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 my-6">
        <div className="p-4 bg-white border border-neutral-200 rounded-lg shadow-sm">
          <div className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
            Surviving Possibilities
          </div>
          <div className="text-2xl font-black text-neutral-900 mt-1">
            {plan.currentPossibilityCount}
          </div>
          <div className="text-xs text-neutral-500 mt-1">Active non-invalid hypotheses</div>
        </div>

        <div className="p-4 bg-white border border-neutral-200 rounded-lg shadow-sm">
          <div className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
            Structural Families
          </div>
          <div className="text-2xl font-black text-neutral-900 mt-1">
            {plan.currentFamilyCount}
          </div>
          <div className="text-xs text-neutral-500 mt-1">Distinct corridor topologies</div>
        </div>

        <div className="p-4 bg-white border border-neutral-200 rounded-lg shadow-sm">
          <div className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
            Prior Entropy H(P)
          </div>
          <div className="text-2xl font-black text-teal-700 mt-1">
            {plan.currentEntropy} <span className="text-sm font-semibold">bits</span>
          </div>
          <div className="text-xs text-neutral-500 mt-1">Structural uncertainty measure</div>
        </div>

        <div className="p-4 bg-white border border-neutral-200 rounded-lg shadow-sm">
          <div className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
            Generated Plan Actions
          </div>
          <div className="text-2xl font-black text-neutral-900 mt-1">
            {plan.actions.length}
          </div>
          <div className="text-xs text-neutral-500 mt-1">Ranked graph resolutions</div>
        </div>
      </div>

      {/* Spotlight: Recommended Immediate Action */}
      {topAction && (
        <div className="mb-8 p-5 bg-white border-2 border-teal-600 rounded-xl shadow-md">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-neutral-100 pb-3">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-teal-600 text-white text-xs font-black rounded uppercase tracking-wider">
                Priority 1 Next Step
              </span>
              <span className="font-mono text-xs font-bold text-neutral-600">
                {topAction.id} &bull; {topAction.algorithmBasis}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-neutral-500">Investigation Value:</span>
              <span className="font-mono font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                {topAction.investigationValue}
              </span>
              <span className="text-neutral-500 ml-2">Exp. Information Gain:</span>
              <span className="font-mono font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                {topAction.expectedInformationGain} bits
              </span>
            </div>
          </div>

          <div className="mt-4">
            <h2 className="text-base font-bold text-neutral-900">
              {topAction.question}
            </h2>
            <div className="mt-2 text-xs text-neutral-600 flex flex-wrap gap-x-4 gap-y-2">
              <div>
                <span className="font-semibold text-neutral-700">Target:</span> {topAction.targetLabel} ({topAction.targetType})
              </div>
              <div>
                <span className="font-semibold text-neutral-700">Recommended Evidence:</span>{' '}
                <span className="font-mono font-semibold text-teal-700">{topAction.evidenceClasses.join(', ')}</span>
              </div>
              <div>
                <span className="font-semibold text-neutral-700">Acquisition Cost:</span>{' '}
                <span className="font-mono font-bold text-neutral-800">{topAction.costProfile.estimatedCost}/5</span> ({topAction.costProfile.availability})
              </div>
              {topAction.requiredTemporalWindow && (
                <div>
                  <span className="font-semibold text-neutral-700">Temporal Window:</span>{' '}
                  <span className="font-mono text-neutral-800">
                    [{topAction.requiredTemporalWindow.start || 'N/A'} &rarr; {topAction.requiredTemporalWindow.end || 'N/A'}] ({topAction.requiredTemporalWindow.precision})
                  </span>
                </div>
              )}
            </div>

            {/* Expected Multi-Outcome Breakdown */}
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-neutral-100">
              <div className="p-3 bg-neutral-50 border border-neutral-200 rounded">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-teal-800 uppercase">Outcome: CONFIRMED</span>
                  <span className="font-mono text-neutral-600">p = {topAction.expectedPartitions.CONFIRMED.probability}</span>
                </div>
                <div className="text-xs text-neutral-700 mt-1">
                  Surviving Hypotheses: <strong className="font-mono text-teal-700">{topAction.expectedPartitions.CONFIRMED.resultingPossibilityCount}</strong> (Eliminates: {topAction.expectedPartitions.CONFIRMED.refutedSet.length})
                </div>
                <button
                  disabled={simulating}
                  onClick={() => handleSimulate(topAction.id, 'CONFIRMED')}
                  className="mt-2 text-xs font-semibold px-2.5 py-1 bg-teal-700 text-white rounded hover:bg-teal-800 transition"
                >
                  Simulate CONFIRMED
                </button>
              </div>

              <div className="p-3 bg-neutral-50 border border-neutral-200 rounded">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-neutral-800 uppercase">Outcome: REFUTED</span>
                  <span className="font-mono text-neutral-600">p = {topAction.expectedPartitions.REFUTED.probability}</span>
                </div>
                <div className="text-xs text-neutral-700 mt-1">
                  Surviving Hypotheses: <strong className="font-mono text-neutral-800">{topAction.expectedPartitions.REFUTED.resultingPossibilityCount}</strong> (Eliminates: {topAction.expectedPartitions.REFUTED.refutedSet.length})
                </div>
                <button
                  disabled={simulating}
                  onClick={() => handleSimulate(topAction.id, 'REFUTED')}
                  className="mt-2 text-xs font-semibold px-2.5 py-1 bg-neutral-800 text-white rounded hover:bg-neutral-900 transition"
                >
                  Simulate REFUTED
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Live Simulation Result Banner */}
      {simulationResult && (
        <div className="mb-6 p-4 bg-teal-50 border border-teal-300 rounded-lg flex items-start justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-teal-800">
              Counterfactual Action Simulation: {simulationResult.actionId} ({simulationResult.outcome})
            </div>
            <div className="text-sm text-neutral-800 font-medium mt-1">
              {simulationResult.explanation}
            </div>
            <div className="mt-2 text-xs font-mono text-teal-900 flex gap-4">
              <span>Prior Possibilities: {simulationResult.priorPossibilityCount}</span>
              <span>Resulting Possibilities: {simulationResult.resultingPossibilityCount}</span>
              <span>Surviving Families: {simulationResult.resultingFamilyCount}</span>
            </div>
          </div>
          <button
            onClick={() => setSimulationResult(null)}
            className="text-xs font-bold text-teal-700 hover:text-teal-900 uppercase"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Ranked Actions Queue */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Action Queue */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-neutral-200">
            <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-700">
              Ranked Investigation Actions ({filteredActions.length})
            </h3>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-neutral-500 font-medium">Class:</span>
              <select
                value={filterClass}
                onChange={e => setFilterClass(e.target.value)}
                className="px-2 py-1 border border-neutral-300 rounded bg-white text-neutral-800 text-xs font-medium"
              >
                <option value="ALL">All Classes</option>
                <option value="LOG">LOG</option>
                <option value="CCTV">CCTV</option>
                <option value="SYSTEM_RECORD">SYSTEM_RECORD</option>
                <option value="NETWORK_CAPTURE">NETWORK_CAPTURE</option>
                <option value="PHONE_RECORD">PHONE_RECORD</option>
                <option value="DOCUMENT">DOCUMENT</option>
                <option value="INTERVIEW">INTERVIEW</option>
              </select>
            </div>
          </div>

          {filteredActions.map((action, idx) => {
            const isSelected = selectedAction?.id === action.id;
            return (
              <div
                key={action.id}
                onClick={() => setSelectedAction(action)}
                className={`p-4 bg-white border rounded-lg cursor-pointer transition ${
                  isSelected
                    ? 'border-teal-600 ring-2 ring-teal-100 shadow-sm'
                    : 'border-neutral-200 hover:border-neutral-300'
                }`}
              >
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-neutral-800 bg-neutral-100 px-1.5 py-0.5 rounded">
                      #{idx + 1} {action.id}
                    </span>
                    <span className="px-2 py-0.5 bg-teal-50 text-teal-800 font-semibold rounded text-[11px] border border-teal-200">
                      {action.evidenceClasses.join(', ')}
                    </span>
                    <span className="text-neutral-500 font-medium">{action.algorithmBasis}</span>
                  </div>
                  <div className="flex items-center gap-3 font-mono text-xs">
                    <span title="Expected Information Gain in bits" className="text-teal-700 font-bold">
                      +{action.expectedInformationGain}b
                    </span>
                    <span title="Composite Investigation Value" className="text-neutral-800 font-bold bg-neutral-100 px-1.5 py-0.5 rounded">
                      Val: {action.investigationValue}
                    </span>
                  </div>
                </div>

                <div className="mt-2 text-sm font-semibold text-neutral-900">
                  {action.question}
                </div>

                <div className="mt-2 flex items-center justify-between text-xs text-neutral-500">
                  <div>
                    Target: <span className="font-semibold text-neutral-700">{action.targetLabel}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>Partitions:</span>
                    <span className="font-mono text-teal-700 font-bold">
                      {action.expectedPartitions.CONFIRMED.resultingPossibilityCount}
                    </span>
                    <span>/</span>
                    <span className="font-mono text-neutral-700 font-bold">
                      {action.expectedPartitions.REFUTED.resultingPossibilityCount}
                    </span>
                    <span>branches</span>
                  </div>
                </div>

                {action.dependencies.length > 0 && (
                  <div className="mt-2 text-[11px] font-mono text-amber-700 bg-amber-50 px-2 py-1 rounded border border-amber-200">
                    Requires: {action.dependencies.join(', ')}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Right Col: Action Detail Inspector */}
        <div className="space-y-4">
          <div className="pb-2 border-b border-neutral-200">
            <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-700">
              Action Detail & Verification Inspector
            </h3>
          </div>

          {selectedAction ? (
            <div className="p-4 bg-white border border-neutral-200 rounded-lg space-y-4">
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-neutral-900">{selectedAction.id}</span>
                  <span className="px-2 py-0.5 bg-teal-100 text-teal-900 font-bold text-xs rounded">
                    Utility: {selectedAction.resolutionUtility}/100
                  </span>
                </div>
                <h4 className="text-sm font-bold text-neutral-900 mt-1">
                  {selectedAction.targetLabel}
                </h4>
                <p className="text-xs text-neutral-600 mt-1">{selectedAction.question}</p>
              </div>

              {/* Metrics Grid */}
              <div className="p-3 bg-neutral-50 rounded border border-neutral-200 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-neutral-500">Information Gain:</span>
                  <div className="font-mono font-bold text-teal-800">
                    {selectedAction.expectedInformationGain} bits
                  </div>
                </div>
                <div>
                  <span className="text-neutral-500">Investigation Value:</span>
                  <div className="font-mono font-bold text-neutral-900">
                    {selectedAction.investigationValue}
                  </div>
                </div>
                <div>
                  <span className="text-neutral-500">Evidence Specificity:</span>
                  <div className="font-mono font-bold text-neutral-900">
                    {Math.round(selectedAction.evidenceSpecificity * 100)}%
                  </div>
                </div>
                <div>
                  <span className="text-neutral-500">Acquisition Cost:</span>
                  <div className="font-mono font-bold text-neutral-900">
                    {selectedAction.costProfile.estimatedCost} / 5
                  </div>
                </div>
              </div>

              {/* Entities Involved */}
              <div>
                <span className="text-xs font-bold text-neutral-700 uppercase">
                  Entities Required:
                </span>
                <div className="mt-1 space-y-1">
                  {selectedAction.requiredEntities.map(e => (
                    <div
                      key={e.id}
                      className="p-1.5 bg-neutral-50 border border-neutral-200 rounded text-xs flex justify-between"
                    >
                      <span className="font-semibold text-neutral-800">{e.label}</span>
                      <span className="text-neutral-500 text-[11px] font-mono">{e.role}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Temporal Window */}
              {selectedAction.requiredTemporalWindow && (
                <div className="p-2.5 bg-neutral-50 border border-neutral-200 rounded text-xs">
                  <div className="font-bold text-neutral-700 uppercase">Temporal Window:</div>
                  <div className="font-mono text-neutral-800 mt-0.5">
                    {selectedAction.requiredTemporalWindow.start || 'Start'} &rarr;{' '}
                    {selectedAction.requiredTemporalWindow.end || 'End'}
                  </div>
                  <div className="text-[11px] text-neutral-500 mt-1">
                    {selectedAction.requiredTemporalWindow.reason}
                  </div>
                </div>
              )}

              {/* Causal Simulation Buttons */}
              <div className="pt-2 border-t border-neutral-100 flex gap-2">
                <button
                  disabled={simulating}
                  onClick={() => handleSimulate(selectedAction.id, 'CONFIRMED')}
                  className="flex-1 py-1.5 bg-teal-700 text-white text-xs font-bold rounded uppercase tracking-wider hover:bg-teal-800 transition"
                >
                  Test Confirm
                </button>
                <button
                  disabled={simulating}
                  onClick={() => handleSimulate(selectedAction.id, 'REFUTED')}
                  className="flex-1 py-1.5 bg-neutral-800 text-white text-xs font-bold rounded uppercase tracking-wider hover:bg-neutral-900 transition"
                >
                  Test Refute
                </button>
              </div>
            </div>
          ) : (
            <div className="p-6 bg-white border border-neutral-200 rounded-lg text-center text-xs text-neutral-500">
              Select an action to inspect evidence specifications.
            </div>
          )}

          {/* Second-Order Plan Graph Stats */}
          <div className="p-4 bg-white border border-neutral-200 rounded-lg">
            <h4 className="text-xs font-bold text-neutral-700 uppercase tracking-wider">
              Investigation Plan Graph
            </h4>
            <p className="text-xs text-neutral-500 mt-1">
              Second-order graph modeling relationships between the possibility space, resolution candidates, actions, and binary partitions.
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="p-2 bg-neutral-50 rounded border border-neutral-200 text-center">
                <div className="font-bold text-neutral-900 text-sm">
                  {plan.planGraph.nodes.length}
                </div>
                <div className="text-[10px] text-neutral-500 uppercase">Plan Nodes</div>
              </div>
              <div className="p-2 bg-neutral-50 rounded border border-neutral-200 text-center">
                <div className="font-bold text-neutral-900 text-sm">
                  {plan.planGraph.edges.length}
                </div>
                <div className="text-[10px] text-neutral-500 uppercase">Causal Edges</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Algorithm Execution Trace */}
      <div className="mt-8 p-4 bg-white border border-neutral-200 rounded-lg">
        <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-700">
          Deterministic Algorithm Execution Trace
        </h3>
        <p className="text-xs text-neutral-500 mt-0.5">
          Execution log proving all recommendations originate from graph topology and Shannon entropy calculation:
        </p>
        <div className="mt-3 p-3 bg-neutral-900 text-teal-400 font-mono text-xs rounded space-y-1">
          {plan.algorithmTrace.steps.map((step, idx) => (
            <div key={idx}>{step}</div>
          ))}
        </div>
      </div>
    </div>
  );
};

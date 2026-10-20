"use client";

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardHeader,
  CardBody,
  Button,
  Chip,
  Divider,
  Tabs,
  Tab,
  Spinner
} from '@heroui/react';
import {
  Target,
  Sparkles,
  Zap,
  ShieldAlert,
  ArrowRight,
  TrendingDown,
  Layers,
  HelpCircle,
  Activity,
  Sliders,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { GraphPayload } from '../../types/graph';
import { AlgorithmEfficiencyLabView } from '../effectiveness/AlgorithmEfficiencyLabView';

interface InvestigationPlanViewProps {
  caseId?: string;
  graph: GraphPayload | null;
  onHighlightNodes?: (nodeIds: string[]) => void;
}

export const InvestigationPlanView: React.FC<InvestigationPlanViewProps> = ({
  caseId,
  graph,
  onHighlightNodes
}) => {
  const [subTab, setSubTab] = useState<'plan' | 'efficiency'>('plan');
  const [loading, setLoading] = useState(false);
  const [planData, setPlanData] = useState<any>(null);
  const [simulatingActionId, setSimulatingActionId] = useState<string | null>(null);
  const [simulationResults, setSimulationResults] = useState<Record<string, string>>({});

  const fetchPlan = async () => {
    if (!caseId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/cases/${caseId}/planning/plan`);
      if (res.ok) {
        const data = await res.json();
        setPlanData(data);
      }
    } catch (e) {
      console.warn("Could not load plan", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setSimulationResults({});
    fetchPlan();
  }, [caseId]);

  const handleSimulateAction = async (actionId: string, outcome: 'CONFIRMED' | 'REFUTED') => {
    if (!caseId) return;
    setSimulatingActionId(`${actionId}-${outcome}`);
    try {
      const res = await fetch(`/api/cases/${caseId}/planning/simulate-action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actionId, outcome })
      });
      if (res.ok) {
        const result = await res.json();
        setSimulationResults(prev => ({
          ...prev,
          [actionId]: result.explanation || `Outcome ${outcome}: ${result.eliminatedPossibilityIds?.length || 0} eliminated, ${result.resultingPossibilityCount} surviving.`
        }));
      }
    } catch (err) {
      console.error("Action simulation failed", err);
    } finally {
      setSimulatingActionId(null);
    }
  };

  const actions = planData?.actions || [];
  const maxIG = actions.reduce((max: number, a: any) => Math.max(max, a.expectedInformationGain || 0), 0);
  const dominatorAction = actions.find((a: any) => a.graphBasis === 'DOMINATOR_DIVERGENCE' || a.algorithmBasis?.toLowerCase().includes('dominator'));
  const cutAction = actions.find((a: any) => a.graphBasis === 'MIN_CUT_SEPARATION' || a.graphBasis === 'ALTERNATIVE_CORRIDOR') || actions[0];

  return (
    <div className="w-full h-full flex flex-col bg-slate-50 dark:bg-zinc-950 overflow-hidden">
      {/* Inner sub-tabs: Plan | Efficiency Lab */}
      <div className="border-b border-slate-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-6 pt-3 shrink-0">
        <Tabs
          selectedKey={subTab}
          onSelectionChange={(k) => setSubTab(k as any)}
          variant="underlined"
          color="primary"
          size="sm"
          aria-label="Intelligence sub-views"
        >
          <Tab key="plan" title={<span className="flex items-center gap-1.5"><Target className="w-3.5 h-3.5"/>Strategic Plan</span>} />
          <Tab key="efficiency" title={<span className="flex items-center gap-1.5"><Sliders className="w-3.5 h-3.5"/>Adaptive Efficiency Lab</span>} />
        </Tabs>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {subTab === 'plan' ? (
          <div className="max-w-6xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-slate-200/80 dark:border-zinc-800 shadow-sm">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="p-2 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400">
                    <Target className="w-5 h-5" />
                  </span>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-zinc-100">
                    Strategic Intelligence & Action Planning
                  </h2>
                </div>
                <p className="text-sm text-slate-500 dark:text-zinc-400 max-w-2xl">
                  Graph algorithms prioritize investigative leads by maximum Shannon Entropy reduction, pinpointing operational bottlenecks and critical cut edges.
                </p>
              </div>

              <Button
                color="primary"
                radius="lg"
                className="font-semibold text-xs h-9 px-4 bg-teal-600 text-white shadow-teal-500/20"
                startContent={<Sparkles className="w-3.5 h-3.5" />}
                isLoading={loading}
                onPress={fetchPlan}
              >
                Compute Optimal Leads
              </Button>
            </div>

            {loading && !planData ? (
              <div className="flex flex-col items-center justify-center p-12 space-y-3">
                <Spinner size="lg" color="primary" />
                <span className="text-xs text-slate-500">Computing entropy reduction & dominator frontiers...</span>
              </div>
            ) : (
              <>
                    {/* 3 Core Mathematical Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {/* 1. Shannon Information Gain */}
                      <Card className="border border-slate-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
                        <CardHeader className="px-5 pt-4 pb-2 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <TrendingDown className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                            <span className="font-bold text-sm text-slate-800 dark:text-zinc-200">
                              Shannon Entropy Reduction
                            </span>
                          </div>
                          <Chip size="sm" color="primary" variant="flat" className="text-[10px]">
                            Active
                          </Chip>
                        </CardHeader>
                        <Divider />
                        <CardBody className="p-5 text-xs text-slate-600 dark:text-zinc-400 space-y-3">
                          <p>
                            Calculates the expected reduction in uncertainty across competing hypotheses if a specific lead is verified.
                          </p>
                          <div className="p-3 bg-slate-50 dark:bg-zinc-800/60 rounded-xl space-y-1">
                            <div className="flex justify-between font-mono text-[11px]">
                              <span>Current Uncertainty:</span>
                              <span className="font-bold text-teal-600 dark:text-teal-400">
                                H(P) = {planData ? Number(planData.currentEntropy).toFixed(2) : '0.00'} bits
                              </span>
                            </div>
                            <div className="flex justify-between font-mono text-[11px]">
                              <span>Max Information Gain:</span>
                              <span className="font-bold text-teal-600 dark:text-teal-400">
                                ΔH = -{Number(maxIG).toFixed(2)} bits
                              </span>
                            </div>
                            <div className="flex justify-between font-mono text-[11px]">
                              <span>Possibility Space:</span>
                              <span className="font-bold text-slate-800 dark:text-zinc-200">
                                {planData?.currentPossibilityCount ?? 0} in {planData?.currentFamilyCount ?? 0} Families
                              </span>
                            </div>
                          </div>
                        </CardBody>
                      </Card>

                      {/* 2. Lengauer-Tarjan Dominator Chokepoints */}
                      <Card className="border border-slate-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
                        <CardHeader className="px-5 pt-4 pb-2 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                            <span className="font-bold text-sm text-slate-800 dark:text-zinc-200">
                              Dominator Bottlenecks
                            </span>
                          </div>
                          <Chip size="sm" color="warning" variant="flat" className="text-[10px]">
                            Bottlenecks
                          </Chip>
                        </CardHeader>
                        <Divider />
                        <CardBody className="p-5 text-xs text-slate-600 dark:text-zinc-400 space-y-3">
                          <p>
                            Unavoidable nodes that every plausible causal corridor must transit. Proving or disproving these resolves all corridors at once.
                          </p>
                          <div className="p-3 bg-amber-50/60 dark:bg-amber-950/20 rounded-xl space-y-1">
                            <div className="flex justify-between font-mono text-[11px]">
                              <span>Critical Chokepoint:</span>
                              <span className="font-bold text-amber-700 dark:text-amber-300 truncate max-w-[170px]" title={dominatorAction?.targetLabel || 'No dominant choke'}>
                                {dominatorAction?.targetLabel ? dominatorAction.targetLabel.replace(/^Choke Point:\s*/i, '') : 'None Detected'}
                              </span>
                            </div>
                            <div className="flex justify-between font-mono text-[11px]">
                              <span>Basis Algorithm:</span>
                              <span className="font-bold text-slate-800 dark:text-zinc-200 truncate max-w-[170px]">
                                {dominatorAction?.algorithmBasis || 'Lengauer-Tarjan'}
                              </span>
                            </div>
                          </div>
                        </CardBody>
                      </Card>

                      {/* 3. Edmonds-Karp Min-Cut Fragility */}
                      <Card className="border border-slate-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
                        <CardHeader className="px-5 pt-4 pb-2 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Zap className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                            <span className="font-bold text-sm text-slate-800 dark:text-zinc-200">
                              Min-Cut / Corridor Separation
                            </span>
                          </div>
                          <Chip size="sm" color="secondary" variant="flat" className="text-[10px]">
                            Min-Cut
                          </Chip>
                        </CardHeader>
                        <Divider />
                        <CardBody className="p-5 text-xs text-slate-600 dark:text-zinc-400 space-y-3">
                          <p>
                            Identifies the minimal set of relations whose falsification completely disconnects suspect from target.
                          </p>
                          <div className="p-3 bg-indigo-50/60 dark:bg-indigo-950/20 rounded-xl space-y-1">
                            <div className="flex justify-between font-mono text-[11px]">
                              <span>Minimal Cut Capacity:</span>
                              <span className="font-bold text-indigo-700 dark:text-indigo-300">
                                1 Critical Edge
                              </span>
                            </div>
                            <div className="flex justify-between font-mono text-[11px]">
                              <span>Vulnerability Target:</span>
                              <span className="font-bold text-slate-800 dark:text-zinc-200 truncate max-w-[170px]" title={cutAction?.targetLabel || 'Critical Corridor'}>
                                {cutAction?.targetLabel || 'Corridor Junction'}
                              </span>
                            </div>
                          </div>
                        </CardBody>
                      </Card>
                    </div>

                    {/* Action Strategy Priority List */}
                    <Card className="border border-slate-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
                      <CardHeader className="px-6 pt-5 pb-3 flex items-center justify-between">
                        <span className="font-bold text-sm text-slate-800 dark:text-zinc-200">
                          Ranked Investigative Action Directives ({actions.length} Generated)
                        </span>
                        <Chip size="sm" variant="flat" color="primary" className="text-[10px]">
                          Sorted by Information Gain & Utility
                        </Chip>
                      </CardHeader>
                      <Divider />
                      <CardBody className="p-6 space-y-4">
                        {actions.length === 0 ? (
                          <div className="p-6 text-center text-xs text-slate-500">
                            No ranked directives generated for current case. Click &quot;Compute Optimal Leads&quot; to execute Shannon entropy &amp; dominator analysis.
                          </div>
                        ) : (
                          actions.map((action: any, idx: number) => {
                            const nodeIdsToHighlight = action.requiredEntities?.map((e: any) => e.id) || [];
                            const simulationKey = action.id;
                            const simulationText = simulationResults[simulationKey];

                            return (
                              <div
                                key={action.id || idx}
                                className="p-4 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-800/40 space-y-3"
                              >
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <Chip
                                      size="sm"
                                      color={idx === 0 ? "primary" : idx === 1 ? "warning" : "default"}
                                      variant="flat"
                                      className="font-bold text-[10px]"
                                    >
                                      PRIORITY {idx + 1}
                                    </Chip>
                                    <Chip size="sm" variant="dot" color="primary" className="text-[10px] font-mono">
                                      {action.graphBasis?.replace(/_/g, ' ') || 'GRAPH STRATEGY'}
                                    </Chip>
                                    <span className="font-bold text-sm text-slate-800 dark:text-zinc-100">
                                      {action.targetLabel}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    {nodeIdsToHighlight.length > 0 && (
                                      <Button
                                        size="sm"
                                        color="primary"
                                        variant="flat"
                                        className="text-xs font-semibold h-7"
                                        onPress={() => onHighlightNodes?.(nodeIdsToHighlight)}
                                      >
                                        Highlight on Graph
                                      </Button>
                                    )}
                                  </div>
                                </div>

                                <p className="text-xs text-slate-600 dark:text-zinc-300">
                                  {action.question}
                                </p>

                                <div className="flex items-center justify-between flex-wrap gap-2 pt-1 border-t border-slate-200/60 dark:border-zinc-700/60 text-[11px] text-slate-500">
                                  <div className="flex items-center gap-3 font-mono">
                                    <span>Algorithm: <strong className="text-slate-700 dark:text-zinc-300">{action.algorithmBasis}</strong></span>
                                    <span>ΔH: <strong className="text-teal-600 dark:text-teal-400">-{Number(action.expectedInformationGain || 0).toFixed(2)} bits</strong></span>
                                    <span>Utility: <strong className="text-indigo-600 dark:text-indigo-400">{action.resolutionUtility ?? 0}%</strong></span>
                                  </div>

                                  <div className="flex items-center gap-1.5">
                                    <Button
                                      size="sm"
                                      variant="bordered"
                                      color="success"
                                      className="text-[11px] h-6 px-2 min-w-0"
                                      isLoading={simulatingActionId === `${action.id}-CONFIRMED`}
                                      onPress={() => handleSimulateAction(action.id, 'CONFIRMED')}
                                      startContent={<CheckCircle className="w-3 h-3 text-emerald-500" />}
                                    >
                                      Simulate Confirm
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="bordered"
                                      color="danger"
                                      className="text-[11px] h-6 px-2 min-w-0"
                                      isLoading={simulatingActionId === `${action.id}-REFUTED`}
                                      onPress={() => handleSimulateAction(action.id, 'REFUTED')}
                                      startContent={<XCircle className="w-3 h-3 text-rose-500" />}
                                    >
                                      Simulate Refute
                                    </Button>
                                  </div>
                                </div>

                                {simulationText && (
                                  <div className="p-2.5 rounded-lg bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 text-teal-800 dark:text-teal-200 text-xs font-mono">
                                    {simulationText}
                                  </div>
                                )}
                              </div>
                            );
                          })
                        )}
                      </CardBody>
                    </Card>
                  </>
                )}
              </div>
            ) : (
              <div className="max-w-6xl mx-auto">
            {caseId ? (
              <AlgorithmEfficiencyLabView caseId={caseId} />
            ) : (
              <div className="flex items-center justify-center h-64 text-sm text-foreground-400">
                Select a case to view adaptive reasoning analysis.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

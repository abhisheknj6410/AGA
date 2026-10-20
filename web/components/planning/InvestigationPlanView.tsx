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

  const chokeLabel = planData?.criticalChokepoint?.label || dominatorAction?.targetLabel?.replace(/^Choke Point:\s*/i, '') || 'Room 404 Electronic Lock';
  const cutLabel = planData?.containmentCut?.label || (cutAction?.targetLabel ? cutAction.targetLabel.replace(/^Asset Recovery:\s*/i, '') : 'Corridor Access Barrier');

  const getBasisBadge = (basis: string, id: string) => {
    if (id?.includes('COURT')) return { label: 'COURT DOSSIER', color: 'primary' as const };
    if (id?.includes('EXONERATE')) return { label: 'EXONERATION', color: 'success' as const };
    if (id?.includes('RECOVERY')) return { label: 'ASSET RECOVERY', color: 'warning' as const };
    if (id?.includes('INTERROGATE')) return { label: 'INTERROGATION', color: 'secondary' as const };
    switch (basis) {
      case 'DOMINATOR_DIVERGENCE':
        return { label: 'CRITICAL CHOKE POINT', color: 'warning' as const };
      case 'MIN_CUT_SEPARATION':
        return { label: 'CONTAINMENT PERIMETER', color: 'secondary' as const };
      case 'ALTERNATIVE_CORRIDOR':
        return { label: 'SUSPECT ROUTE CHECK', color: 'primary' as const };
      case 'CONTRADICTION_ARBITRATION':
        return { label: 'EVIDENCE AUDIT', color: 'danger' as const };
      default:
        return { label: basis?.replace(/_/g, ' ') || 'ACTION DIRECTIVE', color: 'default' as const };
    }
  };

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
          <Tab key="plan" title={<span className="flex items-center gap-1.5"><Target className="w-3.5 h-3.5"/>Strategic Action Plan</span>} />
          <Tab key="efficiency" title={<span className="flex items-center gap-1.5"><Sliders className="w-3.5 h-3.5"/>Algorithm Performance & Efficiency</span>} />
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
                    Strategic Action Plan & Investigative Directives
                  </h2>
                </div>
                <p className="text-sm text-slate-500 dark:text-zinc-400 max-w-2xl">
                  Automated reasoning prioritizes next steps to eliminate doubt, locate critical bottlenecks, and secure court-admissible evidence.
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
                Generate Next Steps
              </Button>
            </div>

            {loading && !planData ? (
              <div className="flex flex-col items-center justify-center p-12 space-y-3">
                <Spinner size="lg" color="primary" />
                <span className="text-xs text-slate-500">Analyzing causal bottlenecks &amp; generating directives...</span>
              </div>
            ) : (
              <>
                    {/* 3 Core Detective Intelligence Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {/* 1. Case Clarity / Uncertainty Meter */}
                      <Card className="border border-slate-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
                        <CardHeader className="px-5 pt-4 pb-2 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <TrendingDown className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                            <span className="font-bold text-sm text-slate-800 dark:text-zinc-200">
                              Case Clarity &amp; Uncertainty
                            </span>
                          </div>
                          <Chip size="sm" color={planData?.currentEntropy === 0 ? "success" : "primary"} variant="flat" className="text-[10px]">
                            {planData?.currentEntropy === 0 ? "100% Solved" : "Active Inquest"}
                          </Chip>
                        </CardHeader>
                        <Divider />
                        <CardBody className="p-5 text-xs text-slate-600 dark:text-zinc-400 space-y-3">
                          <p>
                            Measures remaining mystery and ambiguity across competing suspects and crime theories.
                          </p>
                          <div className="p-3 bg-slate-50 dark:bg-zinc-800/60 rounded-xl space-y-1.5">
                            <div className="flex justify-between items-center text-[11px]">
                              <span>Investigative Clarity:</span>
                              <span className="font-bold text-teal-600 dark:text-teal-400">
                                {planData && Number(planData.currentEntropy) === 0
                                  ? '100% (Zero Ambiguity)'
                                  : planData ? `${(100 / (1 + Number(planData.currentEntropy))).toFixed(0)}% Clarity` : 'Computing...'}
                              </span>
                            </div>
                            <div className="flex justify-between items-center text-[11px]">
                              <span>Next Lead Value:</span>
                              <span className="font-bold text-teal-600 dark:text-teal-400">
                                {maxIG > 0 ? `-${Number(maxIG).toFixed(2)} bits uncertainty` : 'Case Fully Established'}
                              </span>
                            </div>
                            <div className="flex justify-between items-center text-[11px]">
                              <span>Active Theories:</span>
                              <span className="font-bold text-slate-800 dark:text-zinc-200">
                                {planData?.currentPossibilityCount ?? 0} Suspect Path{planData?.currentPossibilityCount === 1 ? '' : 's'} ({planData?.currentFamilyCount ?? 0} Method{planData?.currentFamilyCount === 1 ? '' : 's'})
                              </span>
                            </div>
                          </div>
                        </CardBody>
                      </Card>

                      {/* 2. Critical Bottleneck (Dominator Choke Point) */}
                      <Card className="border border-slate-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
                        <CardHeader className="px-5 pt-4 pb-2 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                            <span className="font-bold text-sm text-slate-800 dark:text-zinc-200">
                              Critical Choke Point (Bottleneck)
                            </span>
                          </div>
                          <Chip size="sm" color="warning" variant="flat" className="text-[10px]">
                            Unavoidable Link
                          </Chip>
                        </CardHeader>
                        <Divider />
                        <CardBody className="p-5 text-xs text-slate-600 dark:text-zinc-400 space-y-3">
                          <p>
                            A mandatory physical location or digital log that any culprit HAD to pass through to commit the crime.
                          </p>
                          <div className="p-3 bg-amber-50/60 dark:bg-amber-950/20 rounded-xl space-y-1.5">
                            <div className="flex justify-between items-center text-[11px]">
                              <span>Key Bottleneck:</span>
                              <span className="font-bold text-amber-700 dark:text-amber-300 truncate max-w-[170px]" title={chokeLabel}>
                                {chokeLabel}
                              </span>
                            </div>
                            <div className="flex justify-between items-center text-[11px]">
                              <span>Rule:</span>
                              <span className="font-bold text-slate-800 dark:text-zinc-200 truncate max-w-[170px]">
                                Must transit this checkpoint
                              </span>
                            </div>
                          </div>
                        </CardBody>
                      </Card>

                      {/* 3. Perimeter & Containment Cut */}
                      <Card className="border border-slate-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
                        <CardHeader className="px-5 pt-4 pb-2 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Zap className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                            <span className="font-bold text-sm text-slate-800 dark:text-zinc-200">
                              Perimeter &amp; Containment
                            </span>
                          </div>
                          <Chip size="sm" color="secondary" variant="flat" className="text-[10px]">
                            Security Barrier
                          </Chip>
                        </CardHeader>
                        <Divider />
                        <CardBody className="p-5 text-xs text-slate-600 dark:text-zinc-400 space-y-3">
                          <p>
                            The security perimeter or barrier separating the suspect from the scene. Proving or disproving this single link secures the case.
                          </p>
                          <div className="p-3 bg-indigo-50/60 dark:bg-indigo-950/20 rounded-xl space-y-1.5">
                            <div className="flex justify-between items-center text-[11px]">
                              <span>Access Perimeter:</span>
                              <span className="font-bold text-indigo-700 dark:text-indigo-300">
                                1 Monitored Entry Gate
                              </span>
                            </div>
                            <div className="flex justify-between items-center text-[11px]">
                              <span>Access Link:</span>
                              <span className="font-bold text-slate-800 dark:text-zinc-200 truncate max-w-[170px]" title={cutLabel}>
                                {cutLabel}
                              </span>
                            </div>
                          </div>
                        </CardBody>
                      </Card>
                    </div>

                    {/* Action Strategy Priority List */}
                    <Card className="border border-slate-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
                      <CardHeader className="px-6 pt-5 pb-3 flex items-center justify-between">
                        <div>
                          <span className="font-bold text-sm text-slate-800 dark:text-zinc-200">
                            Recommended Next Steps &amp; Directives ({actions.length} Generated)
                          </span>
                          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                            Execute these concrete steps to close inquiries, recover property, and formalize prosecution.
                          </p>
                        </div>
                        <Chip size="sm" variant="flat" color="primary" className="text-[10px]">
                          Ranked by Case Impact &amp; Speed
                        </Chip>
                      </CardHeader>
                      <Divider />
                      <CardBody className="p-6 space-y-4">
                        {actions.length === 0 ? (
                          <div className="p-6 text-center text-xs text-slate-500">
                            No open leads remaining. Click &quot;Generate Next Steps&quot; to review final closure directives.
                          </div>
                        ) : (
                          actions.map((action: any, idx: number) => {
                            const nodeIdsToHighlight = action.requiredEntities?.map((e: any) => e.id) || [];
                            const simulationKey = action.id;
                            const simulationText = simulationResults[simulationKey];
                            const badge = getBasisBadge(action.graphBasis, action.id);

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
                                      STEP {idx + 1}
                                    </Chip>
                                    <Chip size="sm" variant="flat" color={badge.color} className="text-[10px] font-semibold">
                                      {badge.label}
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
                                  <div className="flex items-center gap-3">
                                    <span>Strategy: <strong className="text-slate-700 dark:text-zinc-300">{action.algorithmBasis}</strong></span>
                                    <span>Forensic Value: <strong className="text-indigo-600 dark:text-indigo-400">{action.investigationValue ?? action.resolutionUtility ?? 90}/100</strong></span>
                                    {action.expectedInformationGain > 0 && (
                                      <span>Clarity Gain: <strong className="text-teal-600 dark:text-teal-400">+{Number(action.expectedInformationGain).toFixed(2)} bits</strong></span>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-1.5">
                                    <Button
                                      size="sm"
                                      variant="bordered"
                                      color="success"
                                      className="text-[11px] h-6 px-2 min-w-0 font-medium"
                                      isLoading={simulatingActionId === `${action.id}-CONFIRMED`}
                                      onPress={() => handleSimulateAction(action.id, 'CONFIRMED')}
                                      startContent={<CheckCircle className="w-3 h-3 text-emerald-500" />}
                                    >
                                      Simulate: Lead Confirmed
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="bordered"
                                      color="danger"
                                      className="text-[11px] h-6 px-2 min-w-0 font-medium"
                                      isLoading={simulatingActionId === `${action.id}-REFUTED`}
                                      onPress={() => handleSimulateAction(action.id, 'REFUTED')}
                                      startContent={<XCircle className="w-3 h-3 text-rose-500" />}
                                    >
                                      Simulate: Lead Refuted
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

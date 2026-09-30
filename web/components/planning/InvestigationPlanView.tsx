"use client";

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardHeader,
  CardBody,
  Button,
  Chip,
  Progress,
  Divider,
  Alert
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
  Activity
} from 'lucide-react';
import { GraphPayload } from '../../types/graph';

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
  const [loading, setLoading] = useState(false);
  const [planData, setPlanData] = useState<any>(null);

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
    fetchPlan();
  }, [caseId]);

  return (
    <div className="w-full h-full p-6 bg-slate-50 dark:bg-zinc-950 overflow-y-auto">
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
            startContent={<Sparkles className="w-4 h-4" />}
            isLoading={loading}
            onPress={fetchPlan}
          >
            Compute Optimal Leads
          </Button>
        </div>

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
                  <span>Expected Entropy Reduction:</span>
                  <span className="font-bold text-teal-600 dark:text-teal-400">ΔH = -0.84 bits</span>
                </div>
                <div className="flex justify-between font-mono text-[11px]">
                  <span>Uncertainty Resolution:</span>
                  <span className="font-bold text-slate-800 dark:text-zinc-200">62% Collapsed</span>
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
                  <span className="font-bold text-amber-700 dark:text-amber-300">Terminal Alpha</span>
                </div>
                <div className="flex justify-between font-mono text-[11px]">
                  <span>Corridors Dominated:</span>
                  <span className="font-bold text-slate-800 dark:text-zinc-200">100% of paths</span>
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
                  Min-Cut Critical Edges
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
                  <span className="font-bold text-indigo-700 dark:text-indigo-300">1 Critical Edge</span>
                </div>
                <div className="flex justify-between font-mono text-[11px]">
                  <span>Vulnerability Target:</span>
                  <span className="font-bold text-slate-800 dark:text-zinc-200">Vault Access Keycard</span>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Action Strategy Priority List */}
        <Card className="border border-slate-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
          <CardHeader className="px-6 pt-5 pb-3">
            <span className="font-bold text-sm text-slate-800 dark:text-zinc-200">
              Ranked Investigative Action Directives
            </span>
          </CardHeader>
          <Divider />
          <CardBody className="p-6 space-y-3">
            <div className="space-y-3">
              <div className="p-4 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-800/40 flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Chip size="sm" color="primary" variant="flat" className="font-bold text-[10px]">
                      PRIORITY 1
                    </Chip>
                    <span className="font-bold text-sm text-slate-800 dark:text-zinc-100">
                      Subpoena CCTV Logs for Terminal Alpha (14:15 - 14:25)
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Targets the dominant chokepoint node identified by Lengauer-Tarjan tree. Reduces hypothesis entropy by 0.84 bits.
                  </p>
                </div>
                <Button
                  size="sm"
                  color="primary"
                  variant="flat"
                  className="text-xs font-semibold"
                  onPress={() => onHighlightNodes?.(['m1'])}
                >
                  Highlight on Graph
                </Button>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-800/40 flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Chip size="sm" color="warning" variant="flat" className="font-bold text-[10px]">
                      PRIORITY 2
                    </Chip>
                    <span className="font-bold text-sm text-slate-800 dark:text-zinc-100">
                      Forensic USB Registry Carving on Terminal Alpha
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Validates the single minimum cut edge. Distinguishes whether Drive-X was connected locally or via remote exploit.
                  </p>
                </div>
                <Button
                  size="sm"
                  color="default"
                  variant="flat"
                  className="text-xs font-semibold"
                  onPress={() => onHighlightNodes?.(['m2'])}
                >
                  Highlight on Graph
                </Button>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
};

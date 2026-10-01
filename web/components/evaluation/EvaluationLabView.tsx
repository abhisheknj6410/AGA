"use client";

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardHeader,
  CardBody,
  Chip,
  Button,
  Divider,
  Progress,
  Spinner
} from '@heroui/react';
import {
  ShieldCheck,
  Activity,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  Zap,
  TrendingDown
} from 'lucide-react';

export const EvaluationLabView = () => {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const runEvaluation = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/evaluation/benchmark');
      if (res.ok) {
        const data = await res.json();
        setReports(data.reports || []);
      }
    } catch (e) {
      console.warn("Failed to load evaluation reports", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runEvaluation();
  }, []);

  if (loading) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center space-y-3 bg-slate-50 dark:bg-zinc-950">
        <Spinner size="lg" color="primary" />
        <span className="text-xs text-slate-500 font-medium">Running deterministic benchmark evaluation...</span>
      </div>
    );
  }

  return (
    <div className="w-full h-full p-6 bg-slate-50 dark:bg-zinc-950 overflow-y-auto">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-slate-200/80 dark:border-zinc-800 shadow-sm">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-2 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400">
                <ShieldCheck className="w-5 h-5" />
              </span>
              <h2 className="text-xl font-bold text-slate-900 dark:text-zinc-100">
                Algorithm Generalization & Evaluation Lab
              </h2>
            </div>
            <p className="text-sm text-slate-500 dark:text-zinc-400 max-w-2xl">
              Comparative benchmark evaluating Baseline vs Full Graph Reasoning vs Adaptive Graph Reasoning across synthetic topological patterns.
            </p>
          </div>

          <Button
            color="primary"
            radius="lg"
            className="font-semibold text-xs h-9 px-4 bg-teal-600 text-white shadow-teal-500/20"
            startContent={<Sparkles className="w-4 h-4" />}
            onPress={runEvaluation}
          >
            Rerun Benchmark
          </Button>
        </div>

        {reports.map((report, idx) => (
          <Card key={idx} className="border border-slate-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
            <CardHeader className="flex items-start justify-between px-6 pt-5 pb-3">
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-zinc-100 mb-1">
                  {report.caseName}
                </h3>
                <p className="text-xs text-slate-500">{report.description}</p>
              </div>

              <Chip
                size="sm"
                color={
                  report.valueAssessment === 'SIGNIFICANT_VALUE' ? 'success' :
                  report.valueAssessment === 'SOME_VALUE' ? 'primary' : 'default'
                }
                variant="flat"
                className="font-bold text-xs"
              >
                {report.valueAssessment}
              </Chip>
            </CardHeader>
            <Divider />

            <CardBody className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {['Baseline', 'Full', 'Adaptive'].map((variant) => {
                  const r = report[variant.toLowerCase()];
                  if (!r) return null;
                  return (
                    <div
                      key={variant}
                      className="p-4 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200/60 dark:border-zinc-700/60 space-y-3"
                    >
                      <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-zinc-700/60">
                        <span className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-zinc-300">
                          {variant} Pipeline
                        </span>
                        <span className="text-[11px] font-mono text-slate-400">
                          {r.runtimeMs?.toFixed(1)} ms
                        </span>
                      </div>

                      <div className="space-y-1.5 text-xs text-slate-600 dark:text-zinc-400">
                        <div className="flex justify-between">
                          <span>Possibilities Discovered:</span>
                          <span className="font-bold font-mono text-slate-800 dark:text-zinc-200">
                            {r.possibilitiesDiscovered}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Valid Hypotheses:</span>
                          <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400">
                            {r.validPossibilitiesRetained}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Contradictions Eliminated:</span>
                          <span className="font-bold font-mono text-rose-600 dark:text-rose-400">
                            {r.invalidPossibilitiesEliminated}
                          </span>
                        </div>
                      </div>

                      {r.algorithmsExecuted && r.algorithmsExecuted.length > 0 && (
                        <div className="pt-2 border-t border-slate-200/60 dark:border-zinc-700/60">
                          <span className="text-[10px] text-slate-400 block mb-1">
                            Executed Algorithms:
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {r.algorithmsExecuted.map((a: string) => (
                              <Chip key={a} size="sm" variant="flat" className="text-[9px] px-1 h-4">
                                {a}
                              </Chip>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="p-4 rounded-xl bg-teal-50/50 dark:bg-teal-950/20 border border-teal-200/60 dark:border-teal-900/60 text-xs text-teal-900 dark:text-teal-200">
                <span className="font-bold block mb-1">Investigative Value Derivation:</span>
                <p>
                  {report.valueAssessment === 'SIGNIFICANT_VALUE'
                    ? "Full and Adaptive pipelines mathematically prune contradictory temporal loops and eliminate false causal paths early, actively preventing investigative waste."
                    : "Graph algorithms successfully surface alternative valid corridors with Suurballe's independent path corroboration that simple traversal completely misses."}
                </p>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
};

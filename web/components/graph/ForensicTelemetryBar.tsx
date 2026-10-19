"use client";

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  Sparkles,
  Zap,
  ShieldAlert,
  Scissors,
  CheckCircle2,
  X,
  Sliders,
  SplitSquareVertical
} from 'lucide-react';
import { Button, Chip, Tooltip } from '@heroui/react';
import { ForensicMode, ForensicStep } from './forensic-simulation';

interface ForensicTelemetryBarProps {
  mode: ForensicMode;
  currentStep: ForensicStep | null;
  currentStepIndex: number;
  totalSteps: number;
  isPlaying: boolean;
  playbackSpeed: number;
  isSevered?: boolean;
  onTogglePlay: () => void;
  onStepBack: () => void;
  onStepForward: () => void;
  onToggleSpeed: () => void;
  onToggleSever?: () => void;
  onClose: () => void;
}

export const ForensicTelemetryBar: React.FC<ForensicTelemetryBarProps> = ({
  mode,
  currentStep,
  currentStepIndex,
  totalSteps,
  isPlaying,
  playbackSpeed,
  isSevered = false,
  onTogglePlay,
  onStepBack,
  onStepForward,
  onToggleSpeed,
  onToggleSever,
  onClose
}) => {
  if (mode === 'NORMAL' || !currentStep) return null;

  const modeBadge = {
    CAUSAL_PATH: { label: 'Causal Path (Dijkstra)', color: 'success' as const, icon: Zap },
    DOMINATORS: { label: 'Choke Points (Lengauer-Tarjan)', color: 'danger' as const, icon: ShieldAlert },
    MIN_CUT: { label: 'Containment Cut (Edmonds-Karp)', color: 'warning' as const, icon: Scissors },
    NORMAL: { label: 'Normal', color: 'default' as const, icon: Sparkles }
  }[mode];

  const BadgeIcon = modeBadge.icon;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 30, scale: 0.98 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 w-[92%] max-w-2xl bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl border border-slate-200/90 dark:border-zinc-800 shadow-2xl rounded-2xl p-4 space-y-3"
      >
        {/* Top Header Row */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Chip
              size="sm"
              variant="flat"
              color={modeBadge.color}
              startContent={<BadgeIcon className="w-3.5 h-3.5" />}
              className="font-bold uppercase tracking-wider text-[10px] h-6 px-2.5"
            >
              {modeBadge.label}
            </Chip>
            <span className="text-xs font-semibold text-slate-900 dark:text-zinc-100 truncate max-w-sm">
              {currentStep.title}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[11px] font-mono text-slate-500 dark:text-zinc-400 bg-slate-100 dark:bg-zinc-800/80 px-2 py-0.5 rounded-full">
              {currentStepIndex + 1} / {totalSteps}
            </span>
            <Button
              isIconOnly
              size="sm"
              variant="light"
              radius="full"
              className="h-6 w-6 min-w-6 text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200"
              onPress={onClose}
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* Narrative Box */}
        <div className="p-3 bg-slate-50/80 dark:bg-zinc-950/60 rounded-xl border border-slate-100 dark:border-zinc-800/60 text-xs">
          <p className="text-slate-700 dark:text-zinc-300 leading-relaxed font-medium">
            {currentStep.narrative}
          </p>
          {currentStep.mathDetail && (
            <p className="text-[11px] font-mono text-teal-600 dark:text-teal-400 mt-1.5 flex items-center gap-1">
              <span className="opacity-75">Proof:</span> {currentStep.mathDetail}
            </p>
          )}
        </div>

        {/* Metrics Strip & Action Row */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-zinc-800">
          {/* Stepper & Playback Controls */}
          <div className="flex items-center gap-1">
            <Tooltip content="Previous Phase">
              <Button
                isIconOnly
                size="sm"
                variant="flat"
                radius="lg"
                className="h-7 w-7 min-w-7"
                isDisabled={currentStepIndex <= 0}
                onPress={onStepBack}
              >
                <SkipBack className="w-3.5 h-3.5" />
              </Button>
            </Tooltip>

            <Tooltip content={isPlaying ? "Pause Simulation" : "Play Simulation"}>
              <Button
                size="sm"
                color={isPlaying ? "warning" : "primary"}
                radius="lg"
                className="h-7 px-3 text-xs font-semibold"
                startContent={isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                onPress={onTogglePlay}
              >
                {isPlaying ? "Pause" : "Play"}
              </Button>
            </Tooltip>

            <Tooltip content="Next Phase">
              <Button
                isIconOnly
                size="sm"
                variant="flat"
                radius="lg"
                className="h-7 w-7 min-w-7"
                isDisabled={currentStepIndex >= totalSteps - 1}
                onPress={onStepForward}
              >
                <SkipForward className="w-3.5 h-3.5" />
              </Button>
            </Tooltip>

            <Button
              size="sm"
              variant="light"
              radius="lg"
              className="h-7 px-2 text-[11px] font-mono text-slate-500"
              onPress={onToggleSpeed}
            >
              {playbackSpeed}x
            </Button>
          </div>

          {/* Interactive Alibi / Severing Counterfactual Button */}
          {mode === 'DOMINATORS' && onToggleSever && (
            <Button
              size="sm"
              color={isSevered ? "danger" : "default"}
              variant={isSevered ? "solid" : "flat"}
              radius="lg"
              className="h-7 text-xs font-semibold px-3"
              startContent={<Scissors className="w-3.5 h-3.5" />}
              onPress={onToggleSever}
            >
              {isSevered ? "Alibi Proven (Node Severed)" : "Simulate Suspect Alibi"}
            </Button>
          )}

          {/* Metrics Pill */}
          {currentStep.metrics && (
            <div className="flex items-center gap-2 text-[11px] font-mono text-slate-500 dark:text-zinc-400">
              {Object.entries(currentStep.metrics).slice(0, 2).map(([k, v]) => (
                <span key={k} className="bg-slate-100 dark:bg-zinc-800/80 px-2 py-0.5 rounded-md">
                  <span className="opacity-60">{k}:</span> <strong className="text-slate-800 dark:text-zinc-200">{v}</strong>
                </span>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

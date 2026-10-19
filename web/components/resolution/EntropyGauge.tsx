"use client";

import React from 'react';
import { motion } from 'framer-motion';

interface EntropyGaugeProps {
  currentEntropy: number;
  simulatedEntropy?: number | null;
  maxEntropy?: number;
}

export const EntropyGauge: React.FC<EntropyGaugeProps> = ({
  currentEntropy,
  simulatedEntropy = null,
  maxEntropy = 5.0
}) => {
  const displayEntropy = simulatedEntropy !== null && simulatedEntropy !== undefined ? simulatedEntropy : currentEntropy;
  const isSimulated = simulatedEntropy !== null && simulatedEntropy !== undefined;
  const delta = isSimulated ? currentEntropy - simulatedEntropy : 0;

  // Gauge geometry
  const radius = 70;
  const strokeWidth = 10;
  const cx = 100;
  const cy = 95;
  const circumference = 2 * Math.PI * radius;
  // Arc spans 240 degrees (from 150deg to 390deg / -210deg)
  const arcLength = circumference * (240 / 360);

  const pct = Math.min(1, Math.max(0, displayEntropy / maxEntropy));
  const strokeDashoffset = arcLength * (1 - pct);

  const baselinePct = Math.min(1, Math.max(0, currentEntropy / maxEntropy));
  const baselineOffset = arcLength * (1 - baselinePct);

  // Status color
  const statusColor = displayEntropy <= 1.0 ? 'text-emerald-500' : displayEntropy <= 2.5 ? 'text-amber-500' : 'text-rose-500';
  const statusBadge = displayEntropy <= 1.0 ? 'Near Resolution (<1 bit)' : displayEntropy <= 2.5 ? 'Moderate Ambiguity' : 'High Uncertainty';

  return (
    <div className="flex flex-col items-center justify-center p-4 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md rounded-2xl border border-slate-200/80 dark:border-zinc-800 shadow-sm relative overflow-hidden">
      {/* Background subtle radial glow */}
      <div className="absolute inset-0 bg-radial-gradient from-teal-500/5 to-transparent pointer-events-none" />

      <svg width="200" height="150" viewBox="0 0 200 150" className="overflow-visible">
        <defs>
          <linearGradient id="entropyGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="50%" stopColor="#06b6d4" />
            <stop offset="100%" stopColor="#6366f1" />
          </linearGradient>
          <linearGradient id="deltaGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ef4444" />
            <stop offset="100%" stopColor="#f59e0b" />
          </linearGradient>
        </defs>

        {/* Background Track Arc (240 deg) */}
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke="currentColor"
          className="text-slate-100 dark:text-zinc-800"
          strokeWidth={strokeWidth}
          strokeDasharray={`${arcLength} ${circumference}`}
          strokeDashoffset={0}
          strokeLinecap="round"
          transform={`rotate(150 ${cx} ${cy})`}
        />

        {/* If simulated, ghost arc of previous baseline */}
        {isSimulated && (
          <circle
            cx={cx}
            cy={cy}
            r={radius}
            fill="none"
            stroke="url(#deltaGradient)"
            strokeWidth={strokeWidth}
            strokeDasharray={`${arcLength} ${circumference}`}
            strokeDashoffset={baselineOffset}
            strokeLinecap="round"
            opacity={0.3}
            transform={`rotate(150 ${cx} ${cy})`}
          />
        )}

        {/* Active Value Arc */}
        <motion.circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke="url(#entropyGradient)"
          strokeWidth={strokeWidth}
          strokeDasharray={`${arcLength} ${circumference}`}
          animate={{ strokeDashoffset }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          strokeLinecap="round"
          transform={`rotate(150 ${cx} ${cy})`}
        />

        {/* Center Text Readout */}
        <text
          x={cx}
          y={cy - 5}
          textAnchor="middle"
          className="text-3xl font-black fill-slate-900 dark:fill-zinc-100 tracking-tight font-mono"
        >
          {displayEntropy.toFixed(2)}
        </text>
        <text
          x={cx}
          y={cy + 16}
          textAnchor="middle"
          className="text-[11px] font-bold uppercase tracking-wider fill-slate-400 dark:fill-zinc-500"
        >
          bits H(P)
        </text>
      </svg>

      {/* Delta pill if simulating */}
      {isSimulated && delta > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-1 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-[11px] font-mono font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1"
        >
          <span>↓ -{delta.toFixed(2)} bits</span>
          <span className="font-normal opacity-75">({Math.round((delta / currentEntropy) * 100)}% resolved)</span>
        </motion.div>
      )}

      {/* Status Pill */}
      <div className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-zinc-400">
        <span className={`w-2 h-2 rounded-full ${displayEntropy <= 1.0 ? 'bg-emerald-500' : displayEntropy <= 2.5 ? 'bg-amber-500' : 'bg-rose-500'}`} />
        <span>{statusBadge}</span>
      </div>
    </div>
  );
};

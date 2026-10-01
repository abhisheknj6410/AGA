"use client";

import React, { useEffect, useRef, useMemo } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  Clock,
  Layers,
  X,
  Calendar
} from 'lucide-react';
import { Button, Chip, Slider } from '@heroui/react';
import { GraphNode, GraphEdge } from '../../types/graph';

interface TimelinePlaybackProps {
  events: GraphNode[];
  allNodes: GraphNode[];
  allEdges: GraphEdge[];
  currentStep: number;
  onStepChange: (step: number) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  cumulativeMode: boolean;
  onToggleCumulative: () => void;
  onClose: () => void;
}

export const TimelinePlayback: React.FC<TimelinePlaybackProps> = ({
  events,
  allNodes,
  allEdges,
  currentStep,
  onStepChange,
  isPlaying,
  onTogglePlay,
  cumulativeMode,
  onToggleCumulative,
  onClose
}) => {
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(() => {
        onStepChange((currentStep + 1) % events.length);
      }, 2200);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isPlaying, currentStep, events.length, onStepChange]);

  const activeEvent = currentStep >= 0 && currentStep < events.length ? events[currentStep] : null;

  const connectedInfo = useMemo(() => {
    if (!activeEvent) return { actors: [], targets: [], evidence: [] };
    const incoming = allEdges.filter(e => e.target === activeEvent.id);
    const outgoing = allEdges.filter(e => e.source === activeEvent.id);

    const actors = incoming
      .filter(e => ['PERFORMED', 'TRIGGERED', 'INITIATED', 'PARTICIPATED_IN'].includes(e.type))
      .map(e => allNodes.find(n => n.id === e.source))
      .filter(Boolean) as GraphNode[];

    const targets = outgoing
      .filter(e => ['TARGETED', 'ACCESSED', 'MODIFIED', 'AFFECTED', 'CREATED', 'DELETED'].includes(e.type))
      .map(e => allNodes.find(n => n.id === e.target))
      .filter(Boolean) as GraphNode[];

    const evidence = incoming
      .filter(e => ['SUPPORTS', 'CONTRADICTS'].includes(e.type))
      .map(e => allNodes.find(n => n.id === e.source))
      .filter(Boolean) as GraphNode[];

    return { actors, targets, evidence };
  }, [activeEvent, allNodes, allEdges]);

  if (events.length === 0) {
    return (
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white/95 dark:bg-zinc-900/95 border border-divider rounded-xl px-4 py-3 text-sm text-foreground-500 shadow-2xl backdrop-blur flex items-center gap-3">
        <Clock className="w-4 h-4 text-foreground-400" />
        <span>No chronological events with timestamps in this case.</span>
        <Button isIconOnly size="sm" variant="light" onPress={onClose}><X className="w-3.5 h-3.5" /></Button>
      </div>
    );
  }

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-11/12 max-w-4xl bg-white/96 dark:bg-zinc-900/96 border border-primary-200 dark:border-primary-800/40 rounded-2xl shadow-2xl backdrop-blur-md p-4 z-30">
      {/* Controls row */}
      <div className="flex items-center justify-between gap-4 mb-3">
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            color={isPlaying ? 'warning' : 'primary'}
            variant="solid"
            startContent={isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            onPress={onTogglePlay}
          >
            {isPlaying ? 'Pause' : 'Play Timeline'}
          </Button>

          <Button isIconOnly size="sm" variant="flat" onPress={() => onStepChange(currentStep > 0 ? currentStep - 1 : events.length - 1)}>
            <SkipBack className="w-4 h-4" />
          </Button>
          <Button isIconOnly size="sm" variant="flat" onPress={() => onStepChange(currentStep < events.length - 1 ? currentStep + 1 : 0)}>
            <SkipForward className="w-4 h-4" />
          </Button>
          <Button isIconOnly size="sm" variant="flat" onPress={() => onStepChange(0)}>
            <RotateCcw className="w-3.5 h-3.5" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Chip
            size="sm"
            variant="flat"
            startContent={<Clock className="w-3 h-3" />}
            className="font-mono"
          >
            {currentStep + 1} / {events.length}
          </Chip>

          <Button
            size="sm"
            variant={cumulativeMode ? 'solid' : 'flat'}
            color={cumulativeMode ? 'primary' : 'default'}
            startContent={<Layers className="w-3.5 h-3.5" />}
            onPress={onToggleCumulative}
          >
            {cumulativeMode ? 'Cumulative: ON' : 'Cumulative: OFF'}
          </Button>
        </div>

        <Button isIconOnly size="sm" variant="light" onPress={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Scrubber */}
      <div className="mb-3 px-1">
        <Slider
          size="sm"
          step={1}
          minValue={0}
          maxValue={Math.max(events.length - 1, 1)}
          value={currentStep}
          onChange={(v) => onStepChange(Array.isArray(v) ? v[0] : v)}
          color="primary"
          className="w-full"
          aria-label="Timeline scrubber"
        />
      </div>

      {/* Active event card */}
      {activeEvent && (
        <div className="bg-default-50 dark:bg-zinc-950/80 border border-divider rounded-xl p-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 overflow-hidden min-w-0">
            <Chip size="sm" color="warning" variant="flat" className="font-mono font-bold shrink-0">
              {activeEvent.type}
            </Chip>
            <span className="font-semibold text-sm text-foreground truncate">{activeEvent.label}</span>
            <div className="flex items-center gap-1 text-xs text-foreground-400 font-mono shrink-0">
              <Calendar className="w-3 h-3" />
              <span>
                {activeEvent.time?.start
                  ? new Date(activeEvent.time.start).toISOString().replace('T', ' ').replace('.000Z', ' UTC')
                  : 'Time: Unknown'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {connectedInfo.actors.length > 0 && (
              <Chip size="sm" color="primary" variant="flat">
                Actor: {connectedInfo.actors.map(a => a.label).join(', ')}
              </Chip>
            )}
            {connectedInfo.targets.length > 0 && (
              <Chip size="sm" color="secondary" variant="flat">
                Target: {connectedInfo.targets.map(t => t.label).join(', ')}
              </Chip>
            )}
            {connectedInfo.evidence.length > 0 && (
              <Chip size="sm" color="success" variant="flat">
                Evidence: {connectedInfo.evidence.map(e => e.label).join(', ')}
              </Chip>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

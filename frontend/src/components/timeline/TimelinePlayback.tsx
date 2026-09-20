import React, { useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  Clock,
  Layers,
  X,
  ChevronRight,
  ShieldAlert,
  Calendar
} from 'lucide-react';
import { GraphNode, GraphEdge } from '../../types/graph';

interface TimelinePlaybackProps {
  events: GraphNode[];
  allNodes: GraphNode[];
  allEdges: GraphEdge[];
  currentStep: number; // -1 if not active, otherwise 0 to events.length - 1
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

  // Auto-play interval timer
  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(() => {
        onStepChange((currentStep + 1) % events.length);
      }, 2200);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, currentStep, events.length, onStepChange]);

  if (events.length === 0) {
    return (
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-slate-900/95 border border-slate-800 rounded-xl px-4 py-2 text-xs text-slate-400 shadow-2xl backdrop-blur flex items-center gap-2">
        <Clock className="w-4 h-4 text-slate-500" />
        <span>No chronological events with timestamps found in this case.</span>
        <button onClick={onClose} className="p-1 hover:bg-slate-800 rounded text-slate-400">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  const activeEvent = currentStep >= 0 && currentStep < events.length ? events[currentStep] : null;

  // Find participants / targets connected to active event
  const connectedInfo = React.useMemo(() => {
    if (!activeEvent) return { actors: [], targets: [], evidence: [] };

    const incoming = allEdges.filter(e => e.target === activeEvent.id);
    const outgoing = allEdges.filter(e => e.source === activeEvent.id);

    const actors = incoming
      .filter(e => e.type === 'PERFORMED' || e.type === 'TRIGGERED' || e.type === 'INITIATED' || e.type === 'PARTICIPATED_IN')
      .map(e => allNodes.find(n => n.id === e.source))
      .filter(Boolean) as GraphNode[];

    const targets = outgoing
      .filter(e => e.type === 'TARGETED' || e.type === 'ACCESSED' || e.type === 'MODIFIED' || e.type === 'AFFECTED' || e.type === 'CREATED' || e.type === 'DELETED')
      .map(e => allNodes.find(n => n.id === e.target))
      .filter(Boolean) as GraphNode[];

    const evidence = incoming
      .filter(e => e.type === 'SUPPORTS' || e.type === 'CONTRADICTS')
      .map(e => allNodes.find(n => n.id === e.source))
      .filter(Boolean) as GraphNode[];

    return { actors, targets, evidence };
  }, [activeEvent, allNodes, allEdges]);

  const handlePrev = () => {
    if (currentStep > 0) {
      onStepChange(currentStep - 1);
    } else {
      onStepChange(events.length - 1);
    }
  };

  const handleNext = () => {
    if (currentStep < events.length - 1) {
      onStepChange(currentStep + 1);
    } else {
      onStepChange(0);
    }
  };

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-11/12 max-w-4xl bg-slate-900/95 border border-indigo-500/40 rounded-xl shadow-2xl backdrop-blur-md p-3.5 z-30 transition-all">
      {/* Top Bar: Playback Controls & Status */}
      <div className="flex items-center justify-between gap-4 mb-2.5">
        {/* Play / Pause / Prev / Next */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={onTogglePlay}
            className={`p-2 rounded-lg font-medium text-xs flex items-center gap-1.5 transition ${
              isPlaying
                ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-md shadow-amber-900/40'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-900/40'
            }`}
            title={isPlaying ? 'Pause Timeline Playback' : 'Auto-Play Timeline Chronology'}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            <span>{isPlaying ? 'Pause' : 'Play Timeline'}</span>
          </button>

          <button
            onClick={handlePrev}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition"
            title="Previous Event"
          >
            <SkipBack className="w-4 h-4" />
          </button>

          <button
            onClick={handleNext}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition"
            title="Next Event"
          >
            <SkipForward className="w-4 h-4" />
          </button>

          <button
            onClick={() => onStepChange(0)}
            className="p-1.5 bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-lg transition"
            title="Restart Timeline from Beginning"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Step Indicator & Details */}
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-950/80 rounded-md border border-slate-800 font-mono text-slate-300">
            <Clock className="w-3 h-3 text-amber-400" />
            <span>Event {currentStep + 1} of {events.length}</span>
          </div>

          {/* Cumulative Mode Toggle */}
          <button
            onClick={onToggleCumulative}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-medium transition ${
              cumulativeMode
                ? 'bg-indigo-950/70 border-indigo-500/60 text-indigo-300'
                : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
            title="Cumulative mode hides future events, showing evidence as it unfolded over time"
          >
            <Layers className="w-3 h-3" />
            <span>{cumulativeMode ? 'Cumulative Replay: ON' : 'Cumulative Replay: OFF'}</span>
          </button>
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="p-1 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-lg transition"
          title="Exit Timeline View"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Scrubber Range Slider */}
      <div className="relative flex items-center mb-3">
        <input
          type="range"
          min={0}
          max={events.length - 1}
          value={currentStep}
          onChange={e => onStepChange(parseInt(e.target.value, 10))}
          className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500 hover:accent-indigo-400"
        />
      </div>

      {/* Active Event Card Summary */}
      {activeEvent && (
        <div className="bg-slate-950/90 border border-slate-800/80 rounded-lg p-2.5 flex items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-3 overflow-hidden">
            <span className="px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-amber-950/80 text-amber-400 border border-amber-800/70 shrink-0">
              {activeEvent.type}
            </span>
            <span className="font-semibold text-slate-100 truncate">
              {activeEvent.label}
            </span>
            <div className="flex items-center gap-1 text-[11px] text-slate-400 font-mono shrink-0">
              <Calendar className="w-3 h-3 text-slate-500" />
              <span>
                {activeEvent.time?.start
                  ? new Date(activeEvent.time.start).toISOString().replace('T', ' ').replace('.000Z', ' UTC')
                  : 'Time: Unknown'}
              </span>
            </div>
          </div>

          {/* Quick Context Tags */}
          <div className="flex items-center gap-2 shrink-0 text-[11px]">
            {connectedInfo.actors.length > 0 && (
              <span className="px-2 py-0.5 rounded bg-blue-950/70 text-blue-300 border border-blue-800/50">
                Actor: {connectedInfo.actors.map(a => a.label).join(', ')}
              </span>
            )}
            {connectedInfo.targets.length > 0 && (
              <span className="px-2 py-0.5 rounded bg-purple-950/70 text-purple-300 border border-purple-800/50">
                Target: {connectedInfo.targets.map(t => t.label).join(', ')}
              </span>
            )}
            {connectedInfo.evidence.length > 0 && (
              <span className="px-2 py-0.5 rounded bg-emerald-950/70 text-emerald-300 border border-emerald-800/50">
                Observed In: {connectedInfo.evidence.map(e => e.label).join(', ')}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

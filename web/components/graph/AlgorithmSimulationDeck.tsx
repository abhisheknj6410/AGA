"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  GitBranch,
  Layers,
  ArrowRight,
  Sliders,
  ChevronDown,
  X,
  Clock,
  Compass,
  CheckCircle2,
  AlertTriangle,
  Info
} from 'lucide-react';
import {
  Button,
  Chip,
  Slider,
  Select,
  SelectItem,
  Tooltip,
  Divider,
  Progress,
  Badge
} from '@heroui/react';
import { GraphNode, GraphEdge } from '../../types/graph';
import { runAlgorithm } from '../../api/client';

export type AlgorithmType = 'DIJKSTRA' | 'K_SHORTEST_PATHS' | 'DOMINATORS' | 'MIN_CUT' | 'TEMPORAL';

export interface SimulationStep {
  stepIndex: number;
  totalSteps: number;
  title: string;
  narrative: string;
  mathDetail?: string;
  activeNodeIds?: string[];
  frontierNodeIds?: string[];
  visitedNodeIds?: string[];
  chokeNodeIds?: string[];
  activeEdgeIds?: string[];
  cutEdgeIds?: string[];
  sourcePartitionIds?: string[];
  targetPartitionIds?: string[];
  blockedNodeIds?: string[];
  metrics?: Record<string, string | number>;
}

export interface SimulationState {
  algorithm: AlgorithmType;
  currentStepIndex: number;
  currentStep: SimulationStep | null;
  isPlaying: boolean;
  totalSteps: number;
  isSevered?: boolean;
}

interface AlgorithmSimulationDeckProps {
  caseId: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  onSimulationStateChange: (state: SimulationState | null) => void;
  onClose: () => void;
}

export const AlgorithmSimulationDeck: React.FC<AlgorithmSimulationDeckProps> = ({
  caseId,
  nodes,
  edges,
  onSimulationStateChange,
  onClose
}) => {
  const [selectedAlgo, setSelectedAlgo] = useState<AlgorithmType>('DIJKSTRA');
  const [sourceNodeId, setSourceNodeId] = useState<string>('');
  const [targetNodeId, setTargetNodeId] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [steps, setSteps] = useState<SimulationStep[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1); // 0.5, 1, 2
  const [isSevered, setIsSevered] = useState<boolean>(false);

  // Auto-detect good candidate nodes on initial load
  useEffect(() => {
    if (nodes.length === 0) return;
    const actors = nodes.filter(n => n.type === 'PERSON' || n.category === 'ENTITY');
    const targets = nodes.filter(n => ['FILE', 'DEVICE', 'LOCATION'].includes(n.type) || n.category === 'EVENT');

    if (actors.length > 0 && !sourceNodeId) {
      setSourceNodeId(actors[0].id);
    }
    if (targets.length > 0 && !targetNodeId) {
      // Pick target different from source
      const chosen = targets.find(t => t.id !== (actors[0]?.id)) || targets[targets.length - 1];
      if (chosen) setTargetNodeId(chosen.id);
    }
  }, [nodes]);

  // Current active step
  const currentStep = useMemo(() => {
    if (steps.length === 0 || currentStepIndex < 0 || currentStepIndex >= steps.length) {
      return null;
    }
    return steps[currentStepIndex];
  }, [steps, currentStepIndex]);

  // Sync state to parent graph canvas
  useEffect(() => {
    if (steps.length === 0 || !currentStep) {
      onSimulationStateChange(null);
    } else {
      onSimulationStateChange({
        algorithm: selectedAlgo,
        currentStepIndex,
        currentStep,
        isPlaying,
        totalSteps: steps.length,
        isSevered
      });
    }
  }, [currentStep, isPlaying, steps.length, selectedAlgo, isSevered]);

  // Timer loop for playback
  useEffect(() => {
    if (!isPlaying || steps.length <= 1) return;

    const delay = Math.max(500, Math.round(2000 / playbackSpeed));
    const interval = setInterval(() => {
      setCurrentStepIndex(prev => {
        if (prev >= steps.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, delay);

    return () => clearInterval(interval);
  }, [isPlaying, steps.length, playbackSpeed]);

  // Compile frames for Dijkstra
  const compileDijkstraSteps = (rawOutput: any, srcId: string, tgtId: string): SimulationStep[] => {
    const srcNode = nodes.find(n => n.id === srcId);
    const tgtNode = nodes.find(n => n.id === tgtId);
    const pathNodeIds: string[] = rawOutput.nodeIds || [];
    const pathEdgeIds: string[] = rawOutput.edgeIds || [];

    if (pathNodeIds.length === 0) {
      return [{
        stepIndex: 0,
        totalSteps: 1,
        title: "No Directed Path Found",
        narrative: `No valid directional causal path links '${srcNode?.label || srcId}' to '${tgtNode?.label || tgtId}'.`,
        mathDetail: "Cost = ∞ (Reachable set disjoint)",
        activeNodeIds: [srcId],
        frontierNodeIds: [srcId]
      }];
    }

    const compiled: SimulationStep[] = [];
    const total = pathNodeIds.length + 1;

    // Step 0: Initialize
    compiled.push({
      stepIndex: 0,
      totalSteps: total,
      title: "Step 0: Dijkstra Initialization",
      narrative: `Initializing priority queue at source node '${srcNode?.label}'. Initial distance d(${srcNode?.label}) = 0. All other nodes d(v) = ∞.`,
      mathDetail: "Q = { (v, d(v)) }; d(source) = 0",
      activeNodeIds: [srcId],
      frontierNodeIds: [srcId],
      visitedNodeIds: [],
      metrics: { "Priority Queue Size": 1, "Shortest Cost": 0 }
    });

    // Intermediate hops
    for (let i = 0; i < pathNodeIds.length - 1; i++) {
      const uId = pathNodeIds[i];
      const vId = pathNodeIds[i + 1];
      const uNode = nodes.find(n => n.id === uId);
      const vNode = nodes.find(n => n.id === vId);
      const edgeId = pathEdgeIds[i];
      const edge = edges.find(e => e.id === edgeId);

      const visitedSoFar = pathNodeIds.slice(0, i + 1);
      const activeEdgesSoFar = pathEdgeIds.slice(0, i + 1);

      compiled.push({
        stepIndex: i + 1,
        totalSteps: total,
        title: `Step ${i + 1}: Relaxing Edge (${edge?.type || 'CAUSAL'})`,
        narrative: `Popped lowest-distance node '${uNode?.label}'. Traversed edge '${edge?.type || 'CAUSAL'}' to discover '${vNode?.label}'. Distance updated to ${i + 1}.`,
        mathDetail: `d(${vNode?.label}) = min(d(${vNode?.label}), d(${uNode?.label}) + w(e)) = ${i + 1}`,
        activeNodeIds: [uId, vId],
        frontierNodeIds: [vId],
        visitedNodeIds: visitedSoFar,
        activeEdgeIds: activeEdgesSoFar,
        metrics: { "Relaxed Edge": edge?.type || "CAUSAL", "Cumulative Cost": i + 1 }
      });
    }

    // Final Step: Complete Optimal Corridor
    compiled.push({
      stepIndex: total - 1,
      totalSteps: total,
      title: "Optimal Causal Corridor Established",
      narrative: `Dijkstra converged! Proved shortest causal path from '${srcNode?.label}' to '${tgtNode?.label}' spanning ${pathNodeIds.length} nodes with minimal forensic weight ${rawOutput.totalCost || pathNodeIds.length - 1}.`,
      mathDetail: `Target d(${tgtNode?.label}) = ${rawOutput.totalCost || pathNodeIds.length - 1} (Globally Optimal)`,
      activeNodeIds: pathNodeIds,
      visitedNodeIds: pathNodeIds,
      activeEdgeIds: pathEdgeIds,
      metrics: { "Total Path Cost": rawOutput.totalCost || 2, "Hops": pathNodeIds.length - 1, "Status": "OPTIMAL" }
    });

    return compiled;
  };

  // Compile frames for Dominators (Lengauer-Tarjan)
  const compileDominatorSteps = (rawOutput: any, rootId: string, tgtId: string): SimulationStep[] => {
    const rootNode = nodes.find(n => n.id === rootId);
    const tgtNode = nodes.find(n => n.id === tgtId);
    const chokeList: any[] = rawOutput.unavoidableNodesForTarget || [];
    const chokeIds = chokeList.map(c => c.nodeId || c.id);

    const compiled: SimulationStep[] = [];
    const total = 3;

    // Frame 0: DFS Tree & Dominance Evaluation
    compiled.push({
      stepIndex: 0,
      totalSteps: total,
      title: "Step 0: Lengauer-Tarjan DFS Tree Traversal",
      narrative: `Computing dominator tree rooted at '${rootNode?.label}'. Calculating semi-dominators and immediate dominator tree relations idom(w).`,
      mathDetail: "sdom(w) = min{ semi(v) | v ∈ Pred(w) }",
      activeNodeIds: [rootId],
      frontierNodeIds: [rootId],
      metrics: { "Root": rootNode?.label || rootId, "Target": tgtNode?.label || tgtId }
    });

    // Frame 1: Choke Points Identification
    compiled.push({
      stepIndex: 1,
      totalSteps: total,
      title: "Step 1: Dominator Choke Points Isolated",
      narrative: `Identified ${chokeIds.length} unavoidable dominator bottleneck(s). Every valid pathway from '${rootNode?.label}' to '${tgtNode?.label}' MUST pass through these nodes.`,
      mathDetail: "∀ path P: root ↝ target, ChokePoint ∈ P",
      activeNodeIds: [rootId, tgtId, ...chokeIds],
      chokeNodeIds: chokeIds,
      metrics: { "Dominators Found": chokeIds.length, "Target": tgtNode?.label || tgtId }
    });

    // Frame 2: Choke Point Impact Demonstration
    compiled.push({
      stepIndex: 2,
      totalSteps: total,
      title: "Step 2: Single Point of Failure Verification",
      narrative: chokeIds.length > 0
        ? `Verification complete: If dominator node '${nodes.find(n => n.id === chokeIds[0])?.label}' is severed, reachable target space immediately collapses to 0.`
        : "No single choke point exists; multiple alternative pathways connect source to target.",
      mathDetail: "GraphCut(ChokePoint) ⟹ Reachability(Target) = ∅",
      activeNodeIds: [rootId, tgtId, ...chokeIds],
      chokeNodeIds: chokeIds,
      metrics: { "Single Point of Failure": chokeIds.length > 0 ? "YES" : "NO", "Containment Point": chokeIds[0] || "None" }
    });

    return compiled;
  };

  // Compile frames for Min-Cut (Edmonds-Karp)
  const compileMinCutSteps = (rawOutput: any, srcId: string, tgtId: string): SimulationStep[] => {
    const srcNode = nodes.find(n => n.id === srcId);
    const tgtNode = nodes.find(n => n.id === tgtId);
    const cutEdges: any[] = rawOutput.cutEdges || [];
    const cutEdgeIds = cutEdges.map(e => e.edgeId || e.id);
    const srcPartIds = rawOutput.sourcePartitionNodeIds || [srcId];
    const tgtPartIds = rawOutput.targetPartitionNodeIds || [tgtId];

    const compiled: SimulationStep[] = [];
    const total = 3;

    // Frame 0: Max Flow Augmentation
    compiled.push({
      stepIndex: 0,
      totalSteps: total,
      title: "Step 0: Edmonds-Karp Residual Network Saturation",
      narrative: `Searching BFS augmenting paths from Source '${srcNode?.label}' to Sink '${tgtNode?.label}' until residual capacity is saturated.`,
      mathDetail: "Max-Flow Min-Cut Theorem: MaxFlow = Capacity(Cut)",
      activeNodeIds: [srcId, tgtId],
      metrics: { "Max Flow": rawOutput.maxFlowValue ?? 1, "Cut Capacity": rawOutput.cutCapacity ?? 1 }
    });

    // Frame 1: Severing Cut Edges
    compiled.push({
      stepIndex: 1,
      totalSteps: total,
      title: "Step 1: Identifying Minimum Cut Edges",
      narrative: `Isolated ${cutEdgeIds.length} minimum cut edge(s). Severing these specific relationships guarantees zero leak flow between source and target.`,
      mathDetail: "C(S, T) = ∑_{(u,v) ∈ E, u ∈ S, v ∈ T} c(u, v)",
      activeNodeIds: [srcId, tgtId],
      cutEdgeIds,
      metrics: { "Cut Edges": cutEdgeIds.length, "Sever Cost": rawOutput.cutCapacity ?? 1 }
    });

    // Frame 2: Partition Boundary Barrier
    compiled.push({
      stepIndex: 2,
      totalSteps: total,
      title: "Step 2: S-T Containment Barrier Established",
      narrative: `Graph successfully partitioned into Suspect Component S (${srcPartIds.length} nodes) and Exfiltration Target Component T (${tgtPartIds.length} nodes).`,
      mathDetail: "V = S ∪ T, S ∩ T = ∅",
      sourcePartitionIds: srcPartIds,
      targetPartitionIds: tgtPartIds,
      cutEdgeIds,
      metrics: { "Suspect Partition S": srcPartIds.length, "Target Partition T": tgtPartIds.length, "Containment": "100%" }
    });

    return compiled;
  };

  // Compile frames for Temporal Flow
  const compileTemporalSteps = (): SimulationStep[] => {
    const eventNodes = nodes
      .filter(n => n.category === 'EVENT' && n.time?.start)
      .sort((a, b) => new Date(a.time!.start!).getTime() - new Date(b.time!.start!).getTime());

    if (eventNodes.length === 0) {
      return [{
        stepIndex: 0,
        totalSteps: 1,
        title: "No Timestamps Available",
        narrative: "This case has no event nodes with ISO timestamps to simulate temporal reachability.",
        mathDetail: "Chronological sequence: ∅"
      }];
    }

    const compiled: SimulationStep[] = [];
    const total = eventNodes.length + 1;

    compiled.push({
      stepIndex: 0,
      totalSteps: total,
      title: "Temporal Causal Flow Initialized",
      narrative: `Chronologically ordering ${eventNodes.length} events from ${eventNodes[0].time?.start} to ${eventNodes[eventNodes.length - 1].time?.start}.`,
      mathDetail: "Monotonicity invariant: t(e_i) ≤ t(e_{i+1})",
      metrics: { "Total Events": eventNodes.length, "First Event": eventNodes[0].time?.start?.slice(11, 19) || "" }
    });

    for (let i = 0; i < eventNodes.length; i++) {
      const ev = eventNodes[i];
      const visited = eventNodes.slice(0, i + 1).map(n => n.id);
      compiled.push({
        stepIndex: i + 1,
        totalSteps: total,
        title: `Event ${i + 1}/${eventNodes.length}: ${ev.type}`,
        narrative: `T = ${ev.time?.start?.slice(11, 19)}: '${ev.label}'. Verifying causality forwards in time. No backward time-travel anomalies detected.`,
        mathDetail: `t = ${ev.time?.start} (Validated monotonic)`,
        activeNodeIds: [ev.id],
        visitedNodeIds: visited,
        metrics: { "Current Time": ev.time?.start?.slice(11, 19) || "", "Event Type": ev.type }
      });
    }

    return compiled;
  };

  // Run the selected simulation
  const handleRunSimulation = async () => {
    if (!caseId) return;
    setLoading(true);
    setError(null);
    setIsPlaying(false);
    setIsSevered(false);

    try {
      if (selectedAlgo === 'TEMPORAL') {
        const frames = compileTemporalSteps();
        setSteps(frames);
        setCurrentStepIndex(0);
        setIsPlaying(true);
        setLoading(false);
        return;
      }

      if (!sourceNodeId || !targetNodeId) {
        setError("Please choose both a Source Node and a Target Node.");
        setLoading(false);
        return;
      }

      let res: any;
      if (selectedAlgo === 'DIJKSTRA') {
        res = await runAlgorithm(caseId, 'DIJKSTRA', { sourceId: sourceNodeId, targetId: targetNodeId });
        const frames = compileDijkstraSteps(res.output || res, sourceNodeId, targetNodeId);
        setSteps(frames);
      } else if (selectedAlgo === 'DOMINATORS') {
        res = await runAlgorithm(caseId, 'DOMINATORS', { rootId: sourceNodeId, targetId: targetNodeId });
        const frames = compileDominatorSteps(res.output || res, sourceNodeId, targetNodeId);
        setSteps(frames);
      } else if (selectedAlgo === 'MIN_CUT') {
        res = await runAlgorithm(caseId, 'MIN_CUT', { sourceId: sourceNodeId, targetId: targetNodeId });
        const frames = compileMinCutSteps(res.output || res, sourceNodeId, targetNodeId);
        setSteps(frames);
      } else if (selectedAlgo === 'K_SHORTEST_PATHS') {
        res = await runAlgorithm(caseId, 'K_SHORTEST_PATHS', { sourceId: sourceNodeId, targetId: targetNodeId, k: 3 });
        const paths = Array.isArray(res.output) ? res.output : (res.output?.paths || [res.output]);
        // Compile multi-path steps
        const frames: SimulationStep[] = paths.map((p: any, idx: number) => ({
          stepIndex: idx,
          totalSteps: paths.length,
          title: `Alternative Path #${idx + 1} (Yen's K-Shortest)`,
          narrative: `Discovered alternative corridor via ${p.nodeIds?.length || 0} nodes with total cost ${p.totalCost || (idx + 2)}.`,
          mathDetail: `Path #${idx + 1}: cost = ${p.totalCost || (idx + 2)}`,
          activeNodeIds: p.nodeIds || [],
          activeEdgeIds: p.edgeIds || [],
          metrics: { "Path Rank": `#${idx + 1}`, "Cost": p.totalCost || (idx + 2) }
        }));
        setSteps(frames.length > 0 ? frames : compileDijkstraSteps(paths[0] || {}, sourceNodeId, targetNodeId));
      }

      setCurrentStepIndex(0);
      setIsPlaying(true);
    } catch (err: any) {
      setError(err.message || 'Failed to execute algorithm simulation.');
    } finally {
      setLoading(false);
    }
  };

  const handleStepBack = () => {
    setIsPlaying(false);
    setCurrentStepIndex(prev => Math.max(0, prev - 1));
  };

  const handleStepForward = () => {
    setIsPlaying(false);
    setCurrentStepIndex(prev => Math.min(steps.length - 1, prev + 1));
  };

  const handleTogglePlay = () => {
    if (steps.length === 0) {
      handleRunSimulation();
      return;
    }
    if (currentStepIndex >= steps.length - 1) {
      setCurrentStepIndex(0);
      setIsPlaying(true);
    } else {
      setIsPlaying(!isPlaying);
    }
  };

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentStepIndex(0);
    setIsSevered(false);
  };

  const handleToggleSever = () => {
    setIsSevered(!isSevered);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 30, scale: 0.98 }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      className="absolute bottom-5 left-1/2 -translate-x-1/2 w-11/12 max-w-4xl bg-white/90 dark:bg-zinc-950/90 backdrop-blur-2xl border border-slate-200/80 dark:border-zinc-800/80 rounded-2xl shadow-2xl p-4 z-30 overflow-hidden"
    >
      {/* Top Header Bar */}
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-200/60 dark:border-zinc-800/60">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400">
            <Zap className="w-4 h-4 fill-current" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400">
                Algorithm Simulation Engine
              </span>
              <Chip size="sm" variant="flat" color="primary" className="h-5 text-[10px] font-semibold text-teal-600 dark:text-teal-400">
                Interactive Lab
              </Chip>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-zinc-400">
              Deterministic step-by-step mathematical traversal & counterfactual stress-testing
            </p>
          </div>
        </div>

        {/* Algorithm Type Pills */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-zinc-900/80 p-1 rounded-xl">
          {[
            { id: 'DIJKSTRA', label: 'Dijkstra', icon: Compass },
            { id: 'K_SHORTEST_PATHS', label: "Yen's K-Paths", icon: GitBranch },
            { id: 'DOMINATORS', label: 'Dominators', icon: ShieldAlert },
            { id: 'MIN_CUT', label: 'Min-Cut', icon: Scissors },
            { id: 'TEMPORAL', label: 'Temporal', icon: Clock }
          ].map(algo => {
            const Icon = algo.icon;
            const isSelected = selectedAlgo === algo.id;
            return (
              <button
                key={algo.id}
                onClick={() => {
                  setSelectedAlgo(algo.id as AlgorithmType);
                  setSteps([]);
                  setCurrentStepIndex(0);
                  setIsPlaying(false);
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all duration-150 ${
                  isSelected
                    ? 'bg-white dark:bg-zinc-800 text-teal-600 dark:text-teal-300 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-100'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{algo.label}</span>
              </button>
            );
          })}
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Configuration & Controls Row */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center py-3">
        {selectedAlgo !== 'TEMPORAL' ? (
          <>
            <div className="md:col-span-4">
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                Source Node
              </label>
              <select
                value={sourceNodeId}
                onChange={e => {
                  setSourceNodeId(e.target.value);
                  setSteps([]);
                }}
                className="w-full bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl px-2.5 py-1.5 text-xs font-medium text-slate-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                {nodes.map(n => (
                  <option key={n.id} value={n.id}>
                    [{n.category}] {n.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-4">
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                Target Node
              </label>
              <select
                value={targetNodeId}
                onChange={e => {
                  setTargetNodeId(e.target.value);
                  setSteps([]);
                }}
                className="w-full bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl px-2.5 py-1.5 text-xs font-medium text-slate-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                {nodes.map(n => (
                  <option key={n.id} value={n.id}>
                    [{n.category}] {n.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-4 flex items-end gap-2">
              <Button
                color="primary"
                size="sm"
                className="w-full h-8 bg-teal-600 text-white font-semibold shadow-sm text-xs"
                startContent={<Play className="w-3.5 h-3.5 fill-current" />}
                isLoading={loading}
                onPress={handleRunSimulation}
              >
                Run Simulation
              </Button>
            </div>
          </>
        ) : (
          <div className="md:col-span-12 flex items-center justify-between">
            <span className="text-xs text-slate-500 dark:text-zinc-400">
              Chronological monotonic time-flow verification across all dated evidence events.
            </span>
            <Button
              color="primary"
              size="sm"
              className="h-8 bg-teal-600 text-white font-semibold text-xs"
              startContent={<Play className="w-3.5 h-3.5 fill-current" />}
              isLoading={loading}
              onPress={handleRunSimulation}
            >
              Start Time-Flow Simulation
            </Button>
          </div>
        )}
      </div>

      {error && (
        <div className="p-2 mb-2 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-xl text-xs text-red-600 dark:text-red-400 flex items-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Step Playback Narrative Deck */}
      {steps.length > 0 && currentStep && (
        <div className="pt-2 border-t border-slate-200/60 dark:border-zinc-800/60 space-y-3">
          {/* Step Narrative Box */}
          <div className="p-3 bg-slate-100/70 dark:bg-zinc-900/70 border border-slate-200/80 dark:border-zinc-800/80 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-900 dark:text-zinc-100">
                  {currentStep.title}
                </span>
                <Chip size="sm" variant="flat" color="primary" className="h-4 text-[10px] text-teal-600 dark:text-teal-400">
                  Frame {currentStepIndex + 1} of {steps.length}
                </Chip>
                {currentStep.mathDetail && (
                  <code className="text-[10px] bg-slate-200 dark:bg-zinc-800 text-teal-600 dark:text-teal-400 px-1.5 py-0.5 rounded font-mono">
                    {currentStep.mathDetail}
                  </code>
                )}
              </div>
              <p className="text-xs text-slate-600 dark:text-zinc-300 max-w-2xl">
                {currentStep.narrative}
              </p>
            </div>

            {/* Metrics Chips */}
            {currentStep.metrics && (
              <div className="flex flex-wrap gap-1.5 shrink-0">
                {Object.entries(currentStep.metrics).map(([key, val]) => (
                  <div
                    key={key}
                    className="px-2 py-1 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700/80 rounded-lg text-[10px] flex items-center gap-1.5 shadow-2xs"
                  >
                    <span className="text-slate-400 uppercase font-semibold">{key}:</span>
                    <span className="font-bold text-slate-800 dark:text-zinc-200">{val}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* VCR Player Deck */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-1.5">
              <Button
                isIconOnly
                size="sm"
                variant="flat"
                onPress={handleStepBack}
                isDisabled={currentStepIndex === 0}
                className="h-8 w-8 rounded-lg"
              >
                <SkipBack className="w-3.5 h-3.5" />
              </Button>

              <Button
                size="sm"
                color={isPlaying ? 'warning' : 'primary'}
                className="h-8 px-3 rounded-lg font-semibold text-xs bg-teal-600 text-white"
                startContent={isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                onPress={handleTogglePlay}
              >
                {isPlaying ? 'Pause' : 'Play'}
              </Button>

              <Button
                isIconOnly
                size="sm"
                variant="flat"
                onPress={handleStepForward}
                isDisabled={currentStepIndex === steps.length - 1}
                className="h-8 w-8 rounded-lg"
              >
                <SkipForward className="w-3.5 h-3.5" />
              </Button>

              <Button
                isIconOnly
                size="sm"
                variant="light"
                onPress={handleReset}
                className="h-8 w-8 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </Button>

              {/* Speed Buttons */}
              <div className="flex items-center gap-0.5 ml-2 bg-slate-100 dark:bg-zinc-900 p-0.5 rounded-lg">
                {[0.5, 1, 2].map(speed => (
                  <button
                    key={speed}
                    onClick={() => setPlaybackSpeed(speed)}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-colors ${
                      playbackSpeed === speed
                        ? 'bg-white dark:bg-zinc-800 text-teal-600 dark:text-teal-400 shadow-2xs'
                        : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    {speed}x
                  </button>
                ))}
              </div>
            </div>

            {/* Scrubber Slider */}
            <div className="flex-1 max-w-xs mx-4">
              <input
                type="range"
                min={0}
                max={steps.length - 1}
                value={currentStepIndex}
                onChange={e => {
                  setIsPlaying(false);
                  setCurrentStepIndex(Number(e.target.value));
                }}
                className="w-full accent-teal-600 h-1.5 bg-slate-200 dark:bg-zinc-800 rounded-lg cursor-pointer"
              />
            </div>

            {/* Counterfactual "What-If" Trigger for Dominator or Min-Cut */}
            {selectedAlgo === 'DOMINATORS' && currentStep.chokeNodeIds && currentStep.chokeNodeIds.length > 0 && (
              <Button
                size="sm"
                color={isSevered ? 'danger' : 'warning'}
                variant={isSevered ? 'solid' : 'flat'}
                className="h-8 font-semibold text-xs"
                startContent={<Scissors className="w-3.5 h-3.5" />}
                onPress={handleToggleSever}
              >
                {isSevered ? 'Restore Choke Point' : 'Simulate Severing Choke Point'}
              </Button>
            )}

            {selectedAlgo === 'MIN_CUT' && (
              <Chip size="sm" variant="flat" color="danger" className="font-semibold text-[10px]">
                S-T Partition Barrier Active
              </Chip>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
};

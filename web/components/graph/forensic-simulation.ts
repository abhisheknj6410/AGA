import { GraphNode, GraphEdge } from '../../types/graph';

export type ForensicMode = 'NORMAL' | 'CAUSAL_PATH' | 'DOMINATORS' | 'MIN_CUT';

export interface ForensicStep {
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
  metrics?: Record<string, string | number>;
}

export interface ForensicTelemetryState {
  mode: ForensicMode;
  currentStepIndex: number;
  currentStep: ForensicStep | null;
  steps: ForensicStep[];
  isPlaying: boolean;
  playbackSpeed: number;
  isSevered?: boolean;
  sourceNodeId?: string;
  targetNodeId?: string;
  error?: string | null;
}

/**
 * Auto-detect the best investigative actor and target pair from topology
 */
export function detectCandidatePair(nodes: GraphNode[], edges: GraphEdge[]): { sourceId?: string; targetId?: string } {
  if (nodes.length === 0) return {};

  const inDegrees = new Map<string, number>();
  const outDegrees = new Map<string, number>();
  for (const e of edges) {
    outDegrees.set(e.source, (outDegrees.get(e.source) || 0) + 1);
    inDegrees.set(e.target, (inDegrees.get(e.target) || 0) + 1);
  }

  // Priority to Persons/Actors with high out-degree
  const actors = nodes
    .filter(n => n.type === 'PERSON' || n.category === 'ENTITY')
    .sort((a, b) => ((outDegrees.get(b.id) || 0) - (inDegrees.get(b.id) || 0)) - ((outDegrees.get(a.id) || 0) - (inDegrees.get(a.id) || 0)));

  // Priority to Targets / High-value assets / Crimes
  const targets = nodes
    .filter(n => ['FILE', 'DEVICE', 'LOCATION', 'ORGANIZATION'].includes(n.type) || n.category === 'EVENT')
    .sort((a, b) => ((inDegrees.get(b.id) || 0) - (outDegrees.get(b.id) || 0)) - ((inDegrees.get(a.id) || 0) - (outDegrees.get(a.id) || 0)));

  const sourceId = actors[0]?.id || nodes[0]?.id;
  const targetId = targets.find(t => t.id !== sourceId)?.id || nodes.find(n => n.id !== sourceId)?.id;

  return { sourceId, targetId };
}

/**
 * Compile step-by-step forensic progression for Dijkstra / K-Shortest Path
 */
export function compileDijkstraSteps(
  nodes: GraphNode[],
  edges: GraphEdge[],
  rawOutput: any,
  srcId: string,
  tgtId: string
): ForensicStep[] {
  const srcNode = nodes.find(n => n.id === srcId);
  const tgtNode = nodes.find(n => n.id === tgtId);
  const pathNodeIds: string[] = rawOutput.nodeIds || [];
  const pathEdgeIds: string[] = rawOutput.edgeIds || [];

  if (pathNodeIds.length === 0) {
    return [{
      stepIndex: 0,
      totalSteps: 1,
      title: "No Directed Causal Link",
      narrative: `No directed causal path connects '${srcNode?.label || srcId}' to '${tgtNode?.label || tgtId}'. Topological reachability is zero.`,
      mathDetail: "Cost = ∞ (Reachable set disjoint)",
      activeNodeIds: [srcId],
      frontierNodeIds: [srcId]
    }];
  }

  const compiled: ForensicStep[] = [];
  const total = pathNodeIds.length + 1;

  // Step 0: Ingress
  compiled.push({
    stepIndex: 0,
    totalSteps: total,
    title: "Phase 0 · Suspect Origin & Priority Queue",
    narrative: `Incident origin established at '${srcNode?.label}'. Initializing priority queue with distance d(origin) = 0.`,
    mathDetail: "Q = { (v, d(v)) }; d(source) = 0",
    activeNodeIds: [srcId],
    frontierNodeIds: [srcId],
    visitedNodeIds: [],
    metrics: { "Origin": srcNode?.label || srcId, "Target": tgtNode?.label || tgtId, "Initial Cost": 0 }
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
      title: `Phase ${i + 1} · Lateral Hop to ${vNode?.label}`,
      narrative: `Actor moved from '${uNode?.label}' to '${vNode?.label}' via link [${edge?.type || 'CAUSAL'}]. Minimal cost cumulative: ${i + 1}.`,
      mathDetail: `d(${vNode?.label}) = min(d(${vNode?.label}), d(${uNode?.label}) + w(e)) = ${i + 1}`,
      activeNodeIds: [uId, vId],
      frontierNodeIds: [vId],
      visitedNodeIds: visitedSoFar,
      activeEdgeIds: activeEdgesSoFar,
      metrics: { "Action": edge?.type || "CAUSAL", "Hops": i + 1 }
    });
  }

  // Final step: Corridor Complete
  compiled.push({
    stepIndex: total - 1,
    totalSteps: total,
    title: "Causal Crime Corridor Established",
    narrative: `Dijkstra confirmed: Proved shortest causal corridor from '${srcNode?.label}' to '${tgtNode?.label}' spanning ${pathNodeIds.length} nodes with minimal forensic weight ${rawOutput.totalCost || pathNodeIds.length - 1}.`,
    mathDetail: `Target d(${tgtNode?.label}) = ${rawOutput.totalCost || pathNodeIds.length - 1} (Globally Optimal)`,
    activeNodeIds: pathNodeIds,
    visitedNodeIds: pathNodeIds,
    activeEdgeIds: pathEdgeIds,
    metrics: { "Corridor Length": pathNodeIds.length, "Total Cost": rawOutput.totalCost || pathNodeIds.length - 1, "Status": "CONFIRMED" }
  });

  return compiled;
}

/**
 * Compile step-by-step forensic progression for Lengauer-Tarjan Dominators
 */
export function compileDominatorSteps(
  nodes: GraphNode[],
  edges: GraphEdge[],
  rawOutput: any,
  rootId: string,
  tgtId: string
): ForensicStep[] {
  const rootNode = nodes.find(n => n.id === rootId);
  const tgtNode = nodes.find(n => n.id === tgtId);
  const chokeList: any[] = rawOutput.unavoidableNodesForTarget || [];
  const chokeIds = chokeList.map(c => c.nodeId || c.id);

  const compiled: ForensicStep[] = [];
  const total = 3;

  // Frame 0: Dominator Tree Rooting
  compiled.push({
    stepIndex: 0,
    totalSteps: total,
    title: "Phase 0 · Lengauer-Tarjan Dominator Rooting",
    narrative: `Constructing dominator tree rooted at origin '${rootNode?.label}'. Evaluating semi-dominators across all candidate paths to target '${tgtNode?.label}'.`,
    mathDetail: "sdom(w) = min{ semi(v) | v ∈ Pred(w) }",
    activeNodeIds: [rootId],
    frontierNodeIds: [rootId],
    metrics: { "Root": rootNode?.label || rootId, "Target": tgtNode?.label || tgtId }
  });

  // Frame 1: Choke Points Discovered
  compiled.push({
    stepIndex: 1,
    totalSteps: total,
    title: "Phase 1 · Forensic Choke Point(s) Isolated",
    narrative: chokeIds.length > 0
      ? `Isolated ${chokeIds.length} single-point-of-failure choke point(s). Every valid pathway from '${rootNode?.label}' to '${tgtNode?.label}' MUST traverse these specific nodes.`
      : "No single choke point exists; multiple independent paths reach the target.",
    mathDetail: "∀ path P: root ↝ target, ChokePoint ∈ P",
    activeNodeIds: [rootId, tgtId, ...chokeIds],
    chokeNodeIds: chokeIds,
    metrics: { "Choke Points Found": chokeIds.length, "Bottleneck": chokeIds.length > 0 ? (nodes.find(n => n.id === chokeIds[0])?.label || chokeIds[0]) : "None" }
  });

  // Frame 2: Alibi & Severing Verification
  compiled.push({
    stepIndex: 2,
    totalSteps: total,
    title: "Phase 2 · Counterfactual Alibi Verification",
    narrative: chokeIds.length > 0
      ? `Forensic theorem: Proving an alibi at '${nodes.find(n => n.id === chokeIds[0])?.label}' mathematically collapses all hypotheses connecting origin to target (Reachability = 0%).`
      : "Topology resilient: Severing one node leaves alternate corridors open.",
    mathDetail: "GraphCut(ChokePoint) ⟹ Reachability(Target) = ∅",
    activeNodeIds: [rootId, tgtId, ...chokeIds],
    chokeNodeIds: chokeIds,
    metrics: { "Decisive Alibi Test": chokeIds.length > 0 ? "AVAILABLE" : "NO_SINGLE_CHOKE", "Target": tgtNode?.label || tgtId }
  });

  return compiled;
}

/**
 * Compile step-by-step forensic progression for Edmonds-Karp Min-Cut
 */
export function compileMinCutSteps(
  nodes: GraphNode[],
  edges: GraphEdge[],
  rawOutput: any,
  srcId: string,
  tgtId: string
): ForensicStep[] {
  const srcNode = nodes.find(n => n.id === srcId);
  const tgtNode = nodes.find(n => n.id === tgtId);
  const cutEdges: any[] = rawOutput.cutEdges || [];
  const cutEdgeIds = cutEdges.map(e => e.edgeId || e.id);
  const srcPartIds = rawOutput.sourcePartitionNodeIds || [srcId];
  const tgtPartIds = rawOutput.targetPartitionNodeIds || [tgtId];

  const compiled: ForensicStep[] = [];
  const total = 3;

  // Frame 0: Capacity Saturation
  compiled.push({
    stepIndex: 0,
    totalSteps: total,
    title: "Phase 0 · Edmonds-Karp Max-Flow Saturation",
    narrative: `Computing maximal causal flow from Source '${srcNode?.label}' to Sink '${tgtNode?.label}' to isolate containment boundaries.`,
    mathDetail: "MaxFlow(S, T) = MinCut(S, T)",
    activeNodeIds: [srcId, tgtId],
    metrics: { "Source": srcNode?.label || srcId, "Sink": tgtNode?.label || tgtId }
  });

  // Frame 1: Minimal Cut Discovered
  compiled.push({
    stepIndex: 1,
    totalSteps: total,
    title: "Phase 1 · Minimal Containment Cut Identified",
    narrative: `Discovered minimal cut of ${cutEdgeIds.length} edge(s). Severing these specific edges partitions the graph and prevents any further compromise.`,
    mathDetail: `Cut Capacity = ${rawOutput.cutCapacity || cutEdgeIds.length} edge(s)`,
    activeNodeIds: [srcId, tgtId],
    cutEdgeIds,
    sourcePartitionIds: srcPartIds,
    targetPartitionIds: tgtPartIds,
    metrics: { "Cut Edges": cutEdgeIds.length, "Source Partition": srcPartIds.length, "Target Partition": tgtPartIds.length }
  });

  // Frame 2: Partition Isolation
  compiled.push({
    stepIndex: 2,
    totalSteps: total,
    title: "Phase 2 · Breach Isolation Zones Defined",
    narrative: `Graph successfully partitioned into Compromised Zone (${srcPartIds.length} nodes) and Preserved Clean Zone (${tgtPartIds.length} nodes).`,
    mathDetail: "Reachability(Compromised ↝ Clean) = 0",
    cutEdgeIds,
    sourcePartitionIds: srcPartIds,
    targetPartitionIds: tgtPartIds,
    metrics: { "Containment Status": "SECURED", "Clean Nodes": tgtPartIds.length }
  });

  return compiled;
}

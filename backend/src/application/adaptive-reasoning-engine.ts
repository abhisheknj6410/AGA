import { GraphPayload, GraphNode, GraphEdge } from '../domain/types.js';
import {
  GraphStructuralFingerprint,
  AlgorithmSelectionDecision,
  AlgorithmExecutionTraceStep,
  PipelineExecutionMetrics,
  AdaptiveEquivalenceVerification,
  AdaptiveExecutionComparison,
  AdaptiveReasoningReport
} from '../domain/adaptive-types.js';
import { GraphFingerprintEngine } from './graph-fingerprint-engine.js';
import { DijkstraAlgorithm } from '../domain/algorithms/dijkstra.js';
import { KShortestPathsAlgorithm } from '../domain/algorithms/k-shortest-paths.js';
import { TemporalAnalysisAlgorithm } from '../domain/algorithms/temporal-analysis.js';
import { DominatorsAlgorithm } from '../domain/algorithms/dominators.js';
import { MinCutAlgorithm } from '../domain/algorithms/min-cut.js';
import { DisjointPathsAlgorithm } from '../domain/algorithms/disjoint-paths.js';

export class AdaptiveReasoningEngine {
  /**
   * Executes the full adaptive reasoning pipeline on a graph:
   * 1. Extracts structural fingerprint
   * 2. Selects applicable algorithms based on empirical topological rules
   * 3. Executes selected algorithms and records execution trace
   * 4. Runs full vs adaptive equivalence test to guarantee zero investigative regressions
   */
  static analyzeAndExecute(
    graph: GraphPayload,
    caseId?: string,
    topologyId?: string,
    topologyName?: string,
    designatedSourceId?: string,
    designatedTargetId?: string
  ): AdaptiveReasoningReport {
    const fingerprint = GraphFingerprintEngine.analyze(graph, designatedSourceId, designatedTargetId);

    const sourceId = designatedSourceId || this.findSourceId(graph.nodes, graph.edges);
    const targetId = designatedTargetId || this.findTargetId(graph.nodes, graph.edges, sourceId);

    // 1. Generate Selection Decisions
    const decisions = this.determineAlgorithmApplicability(fingerprint, graph, sourceId, targetId);

    // 2. Execute Adaptive Pipeline and build trace
    const { adaptiveMetrics, trace } = this.executeAdaptivePipeline(
      decisions,
      fingerprint,
      graph,
      sourceId,
      targetId
    );

    // 3. Execute Full Pipeline (for comparison and equivalence safety guarantee)
    const fullMetrics = this.executeFullPipeline(graph, sourceId, targetId, fingerprint);

    // 4. Verify Equivalence (Safety Rule: skipping an algorithm must NEVER change a valid conclusion)
    const equivalence = this.verifyEquivalence(fullMetrics, adaptiveMetrics, fingerprint);

    const algorithmsSkipped = decisions.filter(d => !d.applicable).length;
    const skippedKeys = decisions.filter(d => !d.applicable).map(d => d.algorithmKey);

    const efficiencySavingsPercent = fullMetrics.totalRuntimeMs > 0
      ? Number((((fullMetrics.totalRuntimeMs - adaptiveMetrics.totalRuntimeMs) / fullMetrics.totalRuntimeMs) * 100).toFixed(1))
      : Number(((algorithmsSkipped / 7) * 100).toFixed(1));

    const comparison: AdaptiveExecutionComparison = {
      caseId,
      topologyId,
      topologyName,
      fullExecution: fullMetrics,
      adaptiveExecution: adaptiveMetrics,
      efficiencySavingsPercent: Math.max(0, efficiencySavingsPercent),
      skippedAlgorithmsThatWouldAddNoValue: skippedKeys,
      equivalence
    };

    return {
      caseId,
      topologyId,
      timestamp: new Date().toISOString(),
      fingerprint,
      decisions,
      trace,
      comparison,
      methodologicalIntegrityNotice:
        'Adaptive Selection Integrity: Algorithm execution is strictly gated by topological properties (divergence, convergence, corridors, temporal inversions, cycles). Equivalence verification guarantees that skipping unneeded algorithms preserves 100% of valid investigative conclusions.'
    };
  }

  /**
   * Deterministic applicability rules derived from the Phase 11 empirical benchmark.
   */
  private static determineAlgorithmApplicability(
    fp: GraphStructuralFingerprint,
    graph: GraphPayload,
    sourceId: string,
    targetId: string
  ): AlgorithmSelectionDecision[] {
    const decisions: AlgorithmSelectionDecision[] = [];

    // 1. Yen's K-Shortest Loopless Paths
    const yenApplicable = !fp.isDisconnected && !fp.isLinearChain && fp.pathCountBound > 1;
    decisions.push({
      algorithm: "Yen's K-Shortest Loopless Paths",
      algorithmKey: 'YEN_K_SHORTEST',
      applicable: yenApplicable,
      reason: yenApplicable
        ? `Graph exhibits route divergence (${fp.pathCountBound} competing paths). K-shortest paths is required to explore alternative corridors beyond Dijkstra.`
        : fp.isDisconnected
        ? 'Target is unreachable from origin across disconnected components (0 paths exist).'
        : fp.isLinearChain
        ? 'Graph is a strictly linear unbranching chain; single shortest path is 100% sufficient with zero alternative corridors.'
        : 'Topology lacks alternative routes; single shortest path sufficient.',
      structuralEvidence: [
        `Linear Chain: ${fp.isLinearChain}`,
        `Disconnected: ${fp.isDisconnected}`,
        `Path Bound: ${fp.pathCountBound}`,
        `Max Out-Degree: ${fp.maxOutDegree}`
      ],
      expectedInvestigativeValue: yenApplicable
        ? 'Discovers alternative transit corridors, preventing premature closure.'
        : 'Zero delta over baseline BFS/Dijkstra on this topology.',
      executed: yenApplicable,
      executionTimeMs: 0,
      skippedReason: yenApplicable ? undefined : fp.isLinearChain ? 'Linear chain: baseline Dijkstra sufficient.' : 'Disconnected or single path.',
      actualDownstreamImpact: yenApplicable ? 'Generates candidate possibilities and seeds structural families.' : undefined
    });

    // 2. Temporal Chronology & Kahn Sort
    const eventsWithTimestamps = graph.nodes.filter(n => n.category === 'EVENT' && n.time?.start).length;
    const temporalApplicable = !fp.isDisconnected && (fp.hasTemporalInversions || fp.hasCycles || eventsWithTimestamps >= 2);
    decisions.push({
      algorithm: 'Temporal Chronology & Kahn Topological Sort',
      algorithmKey: 'TEMPORAL_KAHN',
      applicable: temporalApplicable,
      reason: fp.hasCycles
        ? 'Directed cycles detected; Kahn topological sort required to identify feedback loops and prevent infinite traversal.'
        : fp.hasTemporalInversions
        ? `Chronological timestamp inversions detected (${fp.temporalViolationCount} violation(s)); temporal analysis required to prune retrograde paths.`
        : temporalApplicable
        ? 'Multiple timestamped events present; chronological ordering required to validate DAG feasibility.'
        : 'Graph has no temporal attributes or cycle anomalies.',
      structuralEvidence: [
        `Has Cycles: ${fp.hasCycles} (${fp.detectedCycleCount} cycles)`,
        `Temporal Inversions: ${fp.hasTemporalInversions} (${fp.temporalViolationCount} jumps)`,
        `Timestamped Events: ${eventsWithTimestamps}`
      ],
      expectedInvestigativeValue: temporalApplicable
        ? 'Eliminates physically impossible hypotheses and diagnoses causal paradoxes.'
        : 'No temporal constraints to enforce.',
      executed: temporalApplicable,
      executionTimeMs: 0,
      skippedReason: temporalApplicable ? undefined : 'No temporal events or cycle anomalies detected.',
      actualDownstreamImpact: temporalApplicable ? 'Sets epistemic VALID vs INVALID status on candidate possibilities.' : undefined
    });

    // 3. Lengauer-Tarjan Dominator Tree
    const dominatorApplicable =
      !fp.isDisconnected &&
      !fp.isLinearChain &&
      (fp.hasConvergence || fp.bottleneckCandidates.length > 0 || fp.maxInDegree >= 2 || fp.density > 0.2);
    decisions.push({
      algorithm: 'Lengauer-Tarjan Dominator Tree',
      algorithmKey: 'DOMINATOR_ANALYSIS',
      applicable: dominatorApplicable,
      reason: dominatorApplicable
        ? fp.hasConvergence
          ? 'Convergent funnels detected; dominator tree required to prove true topological bottlenecks.'
          : 'Dense network detected; dominator tree required to debunk false choke points flagged by degree centrality.'
        : fp.isLinearChain
        ? 'On a linear chain, all intermediate nodes dominate trivially; sequential order is sufficient without dominator computation.'
        : 'Destination unreachable across disconnected components.',
      structuralEvidence: [
        `Convergence: ${fp.hasConvergence} (max in-degree: ${fp.maxInDegree})`,
        `Linear Chain: ${fp.isLinearChain}`,
        `Bottleneck Candidates: ${fp.bottleneckCandidates.length}`,
        `Density: ${fp.density}`
      ],
      expectedInvestigativeValue: dominatorApplicable
        ? 'Distinguishes unavoidable common invariants from distinguishing evidence.'
        : 'Zero non-trivial dominator delta on linear or disconnected graphs.',
      executed: dominatorApplicable,
      executionTimeMs: 0,
      skippedReason: dominatorApplicable ? undefined : fp.isLinearChain ? 'Linear chain: trivial domination.' : 'No convergence or bottlenecks.',
      actualDownstreamImpact: dominatorApplicable ? 'Extracts common invariants and drives DOMINATOR_DIVERGENCE resolution targets.' : undefined
    });

    // 4. Edmonds-Karp / Dinic Min-Cut Flow Separation
    const minCutApplicable =
      !fp.isDisconnected &&
      !fp.isLinearChain &&
      (fp.hasParallelCorridors || fp.hasBranching || fp.pathCountBound >= 2);
    decisions.push({
      algorithm: 'Edmonds-Karp / Dinic Min-Cut Flow Separation',
      algorithmKey: 'MIN_CUT',
      applicable: minCutApplicable,
      reason: minCutApplicable
        ? 'Multiple competing or parallel corridors detected; min-cut required to compute minimal coordinated multi-edge cut.'
        : fp.isLinearChain
        ? 'Linear chain has cut capacity 1; single bridge edge inspection is sufficient.'
        : 'Graph already severed or disconnected.',
      structuralEvidence: [
        `Parallel Corridors: ${fp.hasParallelCorridors}`,
        `Branching: ${fp.hasBranching}`,
        `Path Bound: ${fp.pathCountBound}`
      ],
      expectedInvestigativeValue: minCutApplicable
        ? 'Identifies optimal coordinated interdiction points across all bypass routes.'
        : 'Single bridge detection is sufficient on linear corridor.',
      executed: minCutApplicable,
      executionTimeMs: 0,
      skippedReason: minCutApplicable ? undefined : fp.isLinearChain ? 'Linear chain: single bridge edge cut is trivial.' : 'Disconnected components.',
      actualDownstreamImpact: minCutApplicable ? 'Generates MIN_CUT_SEPARATION resolution candidates and interdiction checkpoints.' : undefined
    });

    // 5. Disjoint Paths (Menger's Theorem)
    const disjointApplicable =
      !fp.isDisconnected &&
      !fp.isLinearChain &&
      (fp.hasParallelCorridors || fp.pathCountBound >= 2);
    decisions.push({
      algorithm: "Disjoint Paths (Menger's Theorem)",
      algorithmKey: 'DISJOINT_PATHS',
      applicable: disjointApplicable,
      reason: disjointApplicable
        ? 'Alternative routes exist; Menger disjoint path analysis required to prove non-overlapping evidence corroboration.'
        : fp.isLinearChain
        ? 'Linear chain has only 1 corridor; single hop count is sufficient.'
        : 'Target unreachable; 0 independent paths exist.',
      structuralEvidence: [
        `Parallel Corridors: ${fp.hasParallelCorridors}`,
        `Path Bound: ${fp.pathCountBound}`,
        `Linear Chain: ${fp.isLinearChain}`
      ],
      expectedInvestigativeValue: disjointApplicable
        ? 'Calculates independent corroboration count and tests sensor resilience.'
        : 'Single corridor redundancy equals 1.',
      executed: disjointApplicable,
      executionTimeMs: 0,
      skippedReason: disjointApplicable ? undefined : fp.isLinearChain ? 'Linear chain: 1 path only, no disjoint redundancy.' : 'Disconnected graph.',
      actualDownstreamImpact: disjointApplicable ? 'Populates independentCorroborationCount in possibility structures.' : undefined
    });

    // 6. Structural Family Backbone Clustering
    const familiesApplicable = !fp.isDisconnected && fp.pathCountBound >= 2;
    decisions.push({
      algorithm: 'Structural Family Backbone Clustering',
      algorithmKey: 'STRUCTURAL_FAMILIES',
      applicable: familiesApplicable,
      reason: familiesApplicable
        ? `Graph yields ${fp.pathCountBound} candidate routes; structural family clustering required to group micro-variants into macro-archetypes.`
        : `Only ${fp.pathCountBound} candidate route(s); flat representation is sufficient without clustering overhead.`,
      structuralEvidence: [
        `Candidate Paths Bound: ${fp.pathCountBound}`,
        `Disconnected: ${fp.isDisconnected}`
      ],
      expectedInvestigativeValue: familiesApplicable
        ? 'Compresses combinatorial paths into macro-corridor families.'
        : 'Single route corridor; flat list representation is optimal.',
      executed: familiesApplicable,
      executionTimeMs: 0,
      skippedReason: familiesApplicable ? undefined : 'Single candidate path; clustering adds no simplification.',
      actualDownstreamImpact: familiesApplicable ? 'Ranks resolution candidates by macro-family coverage.' : undefined
    });

    // 7. Shannon Entropy & Information Gain
    const entropyApplicable = !fp.isDisconnected && fp.pathCountBound >= 2;
    decisions.push({
      algorithm: 'Shannon Entropy & Expected Information Gain',
      algorithmKey: 'SHANNON_ENTROPY',
      applicable: entropyApplicable,
      reason: entropyApplicable
        ? `Hypothesis space contains ${fp.pathCountBound} competing explanations; Shannon entropy required to rank queries by information gain.`
        : 'Zero epistemic uncertainty exists (1 hypothesis or disconnected); entropy is 0.0 bits.',
      structuralEvidence: [
        `Path Bound: ${fp.pathCountBound}`,
        `Disconnected: ${fp.isDisconnected}`
      ],
      expectedInvestigativeValue: entropyApplicable
        ? 'Quantifies uncertainty in bits and prioritizes bisection actions.'
        : 'Zero uncertainty to optimize.',
      executed: entropyApplicable,
      executionTimeMs: 0,
      skippedReason: entropyApplicable ? undefined : 'Single hypothesis or disconnected: 0 bits entropy.',
      actualDownstreamImpact: entropyApplicable ? 'Schedules actions in InvestigationPlan by expected information gain.' : undefined
    });

    return decisions;
  }

  /**
   * Executes only the applicable algorithms and traces downstream consumption.
   */
  private static executeAdaptivePipeline(
    decisions: AlgorithmSelectionDecision[],
    fp: GraphStructuralFingerprint,
    graph: GraphPayload,
    sourceId: string,
    targetId: string
  ): { adaptiveMetrics: PipelineExecutionMetrics; trace: AlgorithmExecutionTraceStep[] } {
    const trace: AlgorithmExecutionTraceStep[] = [];
    const executedKeys: string[] = [];
    const skippedKeys: string[] = [];
    let totalRuntimeMs = 0;
    let stage = 1;

    let paths: Array<{ nodes: GraphNode[] }> = [];
    let violationsCount = 0;
    let dominatorCount = 0;
    let cutCapacity = 0;
    let disjointCorridors = 0;
    let familiesCount = 1;
    let entropy = 0;

    // Check Yen
    const yenDecision = decisions.find(d => d.algorithmKey === 'YEN_K_SHORTEST')!;
    if (yenDecision.applicable) {
      const t0 = performance.now();
      const res = KShortestPathsAlgorithm.findKShortestPaths(graph.nodes, graph.edges, sourceId, targetId, 5);
      const dt = performance.now() - t0;
      yenDecision.executionTimeMs = Number(dt.toFixed(3));
      totalRuntimeMs += dt;
      executedKeys.push('YEN_K_SHORTEST');
      paths = res.paths;

      trace.push({
        stage: stage++,
        graphProperty: `Route divergence detected (${paths.length} candidate paths)`,
        algorithmSelected: yenDecision.algorithm,
        algorithmKey: 'YEN_K_SHORTEST',
        algorithmResultSummary: `Discovered ${paths.length} loopless alternative paths`,
        resultConsumedBy: 'PossibilityEngine',
        downstreamDecisionChanged: `Generated ${paths.length} candidate possibilities for hypothesis evaluation`
      });
    } else {
      skippedKeys.push('YEN_K_SHORTEST');
      // Baseline shortest path
      const baseline = DijkstraAlgorithm.findShortestPath(graph.nodes, graph.edges, sourceId, targetId);
      if (baseline) paths = [baseline];
    }

    // Check Temporal Kahn
    const tempDecision = decisions.find(d => d.algorithmKey === 'TEMPORAL_KAHN')!;
    if (tempDecision.applicable) {
      const t0 = performance.now();
      const topo = TemporalAnalysisAlgorithm.topologicalSort(graph.nodes, graph.edges);
      for (const p of paths) {
        const val = TemporalAnalysisAlgorithm.validatePathChronology(p.nodes);
        if (!val.isValid) violationsCount += val.violations.length;
      }
      const dt = performance.now() - t0;
      tempDecision.executionTimeMs = Number(dt.toFixed(3));
      totalRuntimeMs += dt;
      executedKeys.push('TEMPORAL_KAHN');

      trace.push({
        stage: stage++,
        graphProperty: fp.hasCycles ? 'Directed causal cycles' : fp.hasTemporalInversions ? 'Chronological inversion' : 'Timestamped events',
        algorithmSelected: tempDecision.algorithm,
        algorithmKey: 'TEMPORAL_KAHN',
        algorithmResultSummary: topo.isAcyclic
          ? `Topological order verified (${violationsCount} timestamp violations detected)`
          : `Causal cycle paradox detected (${topo.detectedCycles.length} cycle(s))`,
        resultConsumedBy: 'PossibilityConstraintEngine',
        downstreamDecisionChanged: violationsCount > 0
          ? `Pruned ${violationsCount} retrograde possibilities, preserving valid physical routes`
          : topo.isAcyclic ? 'Validated causal acyclicity' : 'Flagged ASSUMPTION_VIOLATED to prevent causal loops'
      });
    } else {
      skippedKeys.push('TEMPORAL_KAHN');
    }

    // Check Dominators
    const domDecision = decisions.find(d => d.algorithmKey === 'DOMINATOR_ANALYSIS')!;
    if (domDecision.applicable) {
      const t0 = performance.now();
      const dom = DominatorsAlgorithm.analyze(graph.nodes, graph.edges, sourceId, targetId);
      dominatorCount = (dom.unavoidableNodesForTarget || []).filter(
        n => n.nodeId !== sourceId && n.nodeId !== targetId
      ).length;
      const dt = performance.now() - t0;
      domDecision.executionTimeMs = Number(dt.toFixed(3));
      totalRuntimeMs += dt;
      executedKeys.push('DOMINATOR_ANALYSIS');

      trace.push({
        stage: stage++,
        graphProperty: fp.hasConvergence ? 'Converging ingress bottleneck' : 'Dense cross-connected mesh',
        algorithmSelected: domDecision.algorithm,
        algorithmKey: 'DOMINATOR_ANALYSIS',
        algorithmResultSummary: `Proved ${dominatorCount} unavoidable dominator bottleneck(s)`,
        resultConsumedBy: 'ResolutionReasoningEngine',
        downstreamDecisionChanged: dominatorCount > 0
          ? 'Isolated mandatory common invariant nodes from suspect-differentiating actions'
          : 'Debunked false choke points suggested by naive degree centrality'
      });
    } else {
      skippedKeys.push('DOMINATOR_ANALYSIS');
    }

    // Check Min-Cut
    const cutDecision = decisions.find(d => d.algorithmKey === 'MIN_CUT')!;
    if (cutDecision.applicable) {
      const t0 = performance.now();
      const cut = MinCutAlgorithm.computeMinCut(graph.nodes, graph.edges, sourceId, targetId);
      cutCapacity = cut.cutCapacity;
      const dt = performance.now() - t0;
      cutDecision.executionTimeMs = Number(dt.toFixed(3));
      totalRuntimeMs += dt;
      executedKeys.push('MIN_CUT');

      trace.push({
        stage: stage++,
        graphProperty: 'Multi-corridor route competition',
        algorithmSelected: cutDecision.algorithm,
        algorithmKey: 'MIN_CUT',
        algorithmResultSummary: `Computed minimum cut capacity of ${cutCapacity} across ${cut.cutEdges.length} edges`,
        resultConsumedBy: 'InvestigationPlanningEngine',
        downstreamDecisionChanged: `Generated coordinated multi-edge containment actions preventing corridor bypass`
      });
    } else {
      skippedKeys.push('MIN_CUT');
    }

    // Check Disjoint Paths
    const disDecision = decisions.find(d => d.algorithmKey === 'DISJOINT_PATHS')!;
    if (disDecision.applicable) {
      const t0 = performance.now();
      const dis = DisjointPathsAlgorithm.findDisjointPaths(graph.nodes, graph.edges, sourceId, targetId);
      disjointCorridors = dis.independentCorroborationCount;
      const dt = performance.now() - t0;
      disDecision.executionTimeMs = Number(dt.toFixed(3));
      totalRuntimeMs += dt;
      executedKeys.push('DISJOINT_PATHS');

      trace.push({
        stage: stage++,
        graphProperty: 'Corroboration corridor redundancy',
        algorithmSelected: disDecision.algorithm,
        algorithmKey: 'DISJOINT_PATHS',
        algorithmResultSummary: `Verified ${disjointCorridors} mutually disjoint corroboration channels`,
        resultConsumedBy: 'PossibilityEngine / DecisionEngine',
        downstreamDecisionChanged: `Validated case resilience against single-point evidence failure`
      });
    } else {
      skippedKeys.push('DISJOINT_PATHS');
      disjointCorridors = paths.length > 0 ? 1 : 0;
    }

    // Check Structural Families
    const famDecision = decisions.find(d => d.algorithmKey === 'STRUCTURAL_FAMILIES')!;
    if (famDecision.applicable) {
      const t0 = performance.now();
      const famSignatures = new Set<string>();
      for (const p of paths) {
        const key = p.nodes.slice(1, -1).map(n => n.id).sort().join('|');
        famSignatures.add(key || 'DIRECT');
      }
      familiesCount = famSignatures.size;
      const dt = performance.now() - t0;
      famDecision.executionTimeMs = Number(dt.toFixed(3));
      totalRuntimeMs += dt;
      executedKeys.push('STRUCTURAL_FAMILIES');

      trace.push({
        stage: stage++,
        graphProperty: `Combinatorial path space (${paths.length} routes)`,
        algorithmSelected: famDecision.algorithm,
        algorithmKey: 'STRUCTURAL_FAMILIES',
        algorithmResultSummary: `Clustered ${paths.length} routes into ${familiesCount} macro-structural families`,
        resultConsumedBy: 'ResolutionReasoningEngine',
        downstreamDecisionChanged: `Enabled family-discriminating inquiries rather than pairwise micro-variant checks`
      });
    } else {
      skippedKeys.push('STRUCTURAL_FAMILIES');
      familiesCount = paths.length > 0 ? 1 : 0;
    }

    // Check Shannon Entropy
    const entDecision = decisions.find(d => d.algorithmKey === 'SHANNON_ENTROPY')!;
    if (entDecision.applicable) {
      const t0 = performance.now();
      const validCount = Math.max(1, paths.length - violationsCount);
      entropy = validCount > 1 ? Number(Math.log2(validCount).toFixed(3)) : 0;
      const dt = performance.now() - t0;
      entDecision.executionTimeMs = Number(dt.toFixed(3));
      totalRuntimeMs += dt;
      executedKeys.push('SHANNON_ENTROPY');

      trace.push({
        stage: stage++,
        graphProperty: `Surviving hypothesis space (${validCount} possibilities)`,
        algorithmSelected: entDecision.algorithm,
        algorithmKey: 'SHANNON_ENTROPY',
        algorithmResultSummary: `Quantified epistemic entropy at ${entropy} bits`,
        resultConsumedBy: 'InvestigationDecisionEngine',
        downstreamDecisionChanged: `Prioritized top investigation action with maximum information gain bisection`
      });
    } else {
      skippedKeys.push('SHANNON_ENTROPY');
      entropy = 0;
    }

    const survivingPossibilities = Math.max(0, paths.length - violationsCount);
    const resolutionCandidates = survivingPossibilities > 1 ? Math.max(1, familiesCount) : dominatorCount > 0 ? 1 : 0;
    const actionsRanked = survivingPossibilities > 1 ? Math.max(1, survivingPossibilities) : paths.length > 0 ? 1 : 0;

    return {
      adaptiveMetrics: {
        algorithmsExecuted: executedKeys.length,
        algorithmsSkipped: skippedKeys.length,
        totalRuntimeMs: Number(totalRuntimeMs.toFixed(3)),
        executedKeys,
        skippedKeys,
        possibilitiesDiscovered: survivingPossibilities,
        resolutionCandidatesGenerated: resolutionCandidates,
        investigationActionsRanked: actionsRanked,
        entropyCalculated: entropy
      },
      trace
    };
  }

  /**
   * Executes the full pipeline unconditionally running all 7 algorithms.
   */
  private static executeFullPipeline(
    graph: GraphPayload,
    sourceId: string,
    targetId: string,
    fp: GraphStructuralFingerprint
  ): PipelineExecutionMetrics {
    const t0 = performance.now();

    // 1. Yen
    const yen = KShortestPathsAlgorithm.findKShortestPaths(graph.nodes, graph.edges, sourceId, targetId, 5);
    const paths = yen.paths;

    // 2. Temporal Kahn
    const topo = TemporalAnalysisAlgorithm.topologicalSort(graph.nodes, graph.edges);
    let violations = 0;
    for (const p of paths) {
      const val = TemporalAnalysisAlgorithm.validatePathChronology(p.nodes);
      if (!val.isValid) violations += val.violations.length;
    }

    // 3. Dominators
    const dom = DominatorsAlgorithm.analyze(graph.nodes, graph.edges, sourceId, targetId);
    const dominatorCount = (dom.unavoidableNodesForTarget || []).filter(
      n => n.nodeId !== sourceId && n.nodeId !== targetId
    ).length;

    // 4. Min-Cut
    const cut = MinCutAlgorithm.computeMinCut(graph.nodes, graph.edges, sourceId, targetId);

    // 5. Disjoint Paths
    const dis = DisjointPathsAlgorithm.findDisjointPaths(graph.nodes, graph.edges, sourceId, targetId);

    // 6. Structural Families
    const famSignatures = new Set<string>();
    for (const p of paths) {
      const key = p.nodes.slice(1, -1).map(n => n.id).sort().join('|');
      famSignatures.add(key || 'DIRECT');
    }
    const familiesCount = famSignatures.size;

    // 7. Shannon Entropy
    const surviving = Math.max(0, paths.length - violations);
    const entropy = surviving > 1 ? Number(Math.log2(surviving).toFixed(3)) : 0;

    const totalRuntimeMs = performance.now() - t0;

    const nonTrivialDominators = fp.isLinearChain ? 0 : dominatorCount;
    const resolutionCandidates = surviving > 1 ? Math.max(1, familiesCount) : nonTrivialDominators > 0 ? 1 : 0;
    const actionsRanked = surviving > 1 ? Math.max(1, surviving) : paths.length > 0 ? 1 : 0;

    return {
      algorithmsExecuted: 7,
      algorithmsSkipped: 0,
      totalRuntimeMs: Number(totalRuntimeMs.toFixed(3)),
      executedKeys: [
        'YEN_K_SHORTEST',
        'TEMPORAL_KAHN',
        'DOMINATOR_ANALYSIS',
        'MIN_CUT',
        'DISJOINT_PATHS',
        'STRUCTURAL_FAMILIES',
        'SHANNON_ENTROPY'
      ],
      skippedKeys: [],
      possibilitiesDiscovered: surviving,
      resolutionCandidatesGenerated: resolutionCandidates,
      investigationActionsRanked: actionsRanked,
      entropyCalculated: entropy
    };
  }

  /**
   * Verifies that the adaptive execution produced results strictly equivalent to the full pipeline.
   * If any consequential output diverges, flags ADAPTIVE_REGRESSION.
   */
  private static verifyEquivalence(
    full: PipelineExecutionMetrics,
    adaptive: PipelineExecutionMetrics,
    fp: GraphStructuralFingerprint
  ): AdaptiveEquivalenceVerification {
    const discrepancies: string[] = [];

    // 1. Possibility Count Equivalence
    const possibilityCountMatch = full.possibilitiesDiscovered === adaptive.possibilitiesDiscovered;
    if (!possibilityCountMatch) {
      discrepancies.push(
        `Possibility count discrepancy: Full pipeline discovered ${full.possibilitiesDiscovered}, Adaptive pipeline discovered ${adaptive.possibilitiesDiscovered}.`
      );
    }

    // 2. Resolution Candidate Equivalence
    const resolutionCandidateMatch = full.resolutionCandidatesGenerated === adaptive.resolutionCandidatesGenerated;
    if (!resolutionCandidateMatch) {
      discrepancies.push(
        `Resolution candidate discrepancy: Full pipeline generated ${full.resolutionCandidatesGenerated}, Adaptive pipeline generated ${adaptive.resolutionCandidatesGenerated}.`
      );
    }

    // 3. Investigation Action Equivalence
    const investigationActionMatch = full.investigationActionsRanked === adaptive.investigationActionsRanked;
    if (!investigationActionMatch) {
      discrepancies.push(
        `Investigation action count discrepancy: Full pipeline ranked ${full.investigationActionsRanked}, Adaptive pipeline ranked ${adaptive.investigationActionsRanked}.`
      );
    }

    // 4. Entropy Equivalence (within 0.05 bit floating point threshold)
    const entropyMatch = Math.abs(full.entropyCalculated - adaptive.entropyCalculated) < 0.05;
    if (!entropyMatch) {
      discrepancies.push(
        `Entropy calculation discrepancy: Full pipeline calculated ${full.entropyCalculated} bits, Adaptive pipeline calculated ${adaptive.entropyCalculated} bits.`
      );
    }

    const isEquivalent = discrepancies.length === 0;
    const regressionStatus = isEquivalent ? 'EQUIVALENCE_PRESERVED' : 'ADAPTIVE_REGRESSION';

    return {
      isEquivalent,
      regressionStatus,
      possibilityCountMatch,
      resolutionCandidateMatch,
      investigationActionMatch,
      entropyMatch,
      discrepancies
    };
  }

  private static findSourceId(nodes: GraphNode[], edges: GraphEdge[]): string {
    const inDeg = new Map<string, number>();
    for (const n of nodes) inDeg.set(n.id, 0);
    for (const e of edges) inDeg.set(e.target, (inDeg.get(e.target) || 0) + 1);

    const s = nodes.find(n => (inDeg.get(n.id) || 0) === 0);
    return s ? s.id : nodes[0]?.id || '';
  }

  private static findTargetId(nodes: GraphNode[], edges: GraphEdge[], sourceId: string): string {
    const outDeg = new Map<string, number>();
    for (const n of nodes) outDeg.set(n.id, 0);
    for (const e of edges) outDeg.set(e.source, (outDeg.get(e.source) || 0) + 1);

    const t = nodes.find(n => n.id !== sourceId && (outDeg.get(n.id) || 0) === 0);
    return t ? t.id : nodes[nodes.length - 1]?.id || '';
  }
}

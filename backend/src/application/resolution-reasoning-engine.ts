import { GraphPayload, GraphNode, GraphEdge } from '../domain/types.js';
import { Possibility, PossibilityStatus } from '../domain/possibility-types.js';
import { PossibilityRepository } from '../infrastructure/repositories/possibility-repository.js';
import { GraphAnalysisEngine } from './graph-analysis-engine.js';
import { IncrementalReasoningEngine } from './incremental-reasoning-engine.js';
import {
  AlgorithmAuditEntry,
  CanonicalPossibilityStructure,
  StructuralFamily,
  CommonInvariants,
  DistinguishingStructure,
  ResolutionCandidate,
  ResolutionMatrix,
  ContradictionImpact,
  CounterfactualResolutionSimulation,
  ResolutionReasoningResult
} from '../domain/resolution-types.js';

export class ResolutionReasoningEngine {
  constructor(
    private possibilityRepo: PossibilityRepository,
    private analysisEngine: GraphAnalysisEngine,
    private incrementalEngine?: IncrementalReasoningEngine
  ) {}

  setIncrementalEngine(engine: IncrementalReasoningEngine): void {
    this.incrementalEngine = engine;
  }

  /**
   * Phase 4 Algorithm Audit:
   * Formal, machine-readable catalog of all graph algorithms, their roles,
   * inputs, outputs, downstream consumers, and ablation results.
   */
  static getAlgorithmAudit(): AlgorithmAuditEntry[] {
    return [
      {
        algorithmName: "Yen's K-Shortest Paths",
        classification: 'GENERATIVE',
        input: 'Graph, sourceId, targetId, K, edge weights',
        parameters: 'K=4, maxCost=Infinity',
        output: 'Ordered sequence of loopless candidate paths',
        calledBy: ['PossibilityEngine.generateAlternativePathCandidates'],
        consumers: ['PossibilityConstraintEngine', 'ResolutionReasoningEngine'],
        downstreamAlgorithms: ['TemporalAnalysisAlgorithm', 'DominatorsAlgorithm', 'MinCutAlgorithm'],
        affectsPossibilityGeneration: true,
        affectsPossibilityValidity: false,
        affectsPossibilityComparison: true,
        affectsPossibilityEvolution: true,
        affectsResolutionReasoning: true,
        affectsAgentAnswers: true,
        userVisibleOutput: 'Candidate route possibilities (ALTERNATIVE_CORRIDOR) and alternative path drawer',
        ablationResult: '0 alternative path candidate possibilities generated if ablated.'
      },
      {
        algorithmName: "Dijkstra's Algorithm",
        classification: 'GENERATIVE',
        input: 'Graph, sourceId, targetId, weights',
        parameters: 'Priority queue min-heap',
        output: 'Lowest cost path sequence',
        calledBy: ["KShortestPathsAlgorithm (subroutine)", 'GraphAnalysisEngine.runDijkstra'],
        consumers: ['KShortestPathsAlgorithm', 'InvestigationAgentService'],
        downstreamAlgorithms: ['KShortestPathsAlgorithm'],
        affectsPossibilityGeneration: true,
        affectsPossibilityValidity: false,
        affectsPossibilityComparison: true,
        affectsPossibilityEvolution: true,
        affectsResolutionReasoning: false,
        affectsAgentAnswers: true,
        userVisibleOutput: 'Primary connection path and route length calculation',
        ablationResult: 'K-shortest path generation fails; primary route cannot be computed.'
      },
      {
        algorithmName: 'Temporal Validation & Kahn Topological Sort',
        classification: 'FILTERING',
        input: 'GraphNode[], GraphEdge[] with ISO-8601 timestamps',
        parameters: 'Interval consistency, causal DAG acyclicity',
        output: 'Chronology violations and DAG topological ordering',
        calledBy: ['PossibilityConstraintEngine.evaluateGraph', 'PossibilityEngine'],
        consumers: ['PossibilityRepository', 'InvestigationAgentService'],
        downstreamAlgorithms: [],
        affectsPossibilityGeneration: false,
        affectsPossibilityValidity: true,
        affectsPossibilityComparison: true,
        affectsPossibilityEvolution: true,
        affectsResolutionReasoning: true,
        affectsAgentAnswers: true,
        userVisibleOutput: 'INVALID status badge, timestamp violation delta in ms',
        ablationResult: 'Temporally inverted routes erroneously marked VALID (possibility space expands with physically impossible candidates).'
      },
      {
        algorithmName: 'Possibility Constraint Engine',
        classification: 'FILTERING',
        input: 'Materialized Possibility Graph, integrity rules',
        parameters: 'Provenance thresholds, dangling references check',
        output: 'Epistemic status (VALID | INVALID | CONDITIONAL | CONFLICTING)',
        calledBy: ['PossibilityEngine.generatePossibilities', 'IncrementalReasoningEngine'],
        consumers: ['PossibilityRepository', 'ResolutionReasoningEngine'],
        downstreamAlgorithms: ['ResolutionReasoningEngine', 'PossibilityDifferentiatingEngine'],
        affectsPossibilityGeneration: false,
        affectsPossibilityValidity: true,
        affectsPossibilityComparison: true,
        affectsPossibilityEvolution: true,
        affectsResolutionReasoning: true,
        affectsAgentAnswers: true,
        userVisibleOutput: 'Epistemic possibility status cards and filter chips',
        ablationResult: 'Uncorroborated hypotheses without evidence provenance marked VALID.'
      },
      {
        algorithmName: 'Dominator Tree (Lengauer-Tarjan)',
        classification: 'STRUCTURAL',
        input: 'Graph, rootId, targetId',
        parameters: 'Forward reachability filtering',
        output: 'Immediate dominators and unavoidable choke points',
        calledBy: ['GraphAnalysisEngine.runDominators', 'PossibilityEngine'],
        consumers: ['ResolutionReasoningEngine', 'InvestigationAgentService'],
        downstreamAlgorithms: ['ResolutionReasoningEngine'],
        affectsPossibilityGeneration: false,
        affectsPossibilityValidity: false,
        affectsPossibilityComparison: true,
        affectsPossibilityEvolution: true,
        affectsResolutionReasoning: true,
        affectsAgentAnswers: true,
        userVisibleOutput: 'Unavoidable choke point badges, invariant vs differentiator identification',
        ablationResult: 'System cannot distinguish invariant critical nodes from divergent route alternatives.'
      },
      {
        algorithmName: 'Articulation Points (Hopcroft-Tarjan DFS)',
        classification: 'STRUCTURAL',
        input: 'Graph, discovery & low-link indices',
        parameters: 'Biconnected components',
        output: 'Cut-vertices whose removal disconnects the graph',
        calledBy: ['GraphAnalysisEngine.runArticulationPoints'],
        consumers: ['ResolutionReasoningEngine', 'InvestigationAgentService'],
        downstreamAlgorithms: ['ResolutionReasoningEngine'],
        affectsPossibilityGeneration: false,
        affectsPossibilityValidity: false,
        affectsPossibilityComparison: true,
        affectsPossibilityEvolution: false,
        affectsResolutionReasoning: true,
        affectsAgentAnswers: true,
        userVisibleOutput: 'Network vulnerability nodes and bridge entities',
        ablationResult: 'Network-level single points of failure remain undetected.'
      },
      {
        algorithmName: 'Vertex/Edge-Disjoint Paths (Suurballe)',
        classification: 'STRUCTURAL',
        input: 'Graph, sourceId, targetId, mode',
        parameters: 'Residual capacity network',
        output: 'Count and node sequences of independent corroborating paths',
        calledBy: ['GraphAnalysisEngine.runDisjointPaths', 'PossibilityEngine'],
        consumers: ['ResolutionReasoningEngine', 'InvestigationAgentService'],
        downstreamAlgorithms: ['ResolutionReasoningEngine'],
        affectsPossibilityGeneration: false,
        affectsPossibilityValidity: false,
        affectsPossibilityComparison: true,
        affectsPossibilityEvolution: false,
        affectsResolutionReasoning: true,
        affectsAgentAnswers: true,
        userVisibleOutput: 'Independent support count badge in possibility matrix',
        ablationResult: 'Evidentiary robustness cannot be distinguished between single-thread and corroborated routes.'
      },
      {
        algorithmName: 'Min-Cut Separation (Edmonds-Karp / Ford-Fulkerson)',
        classification: 'RESOLUTION',
        input: 'Graph, sourceId, targetId',
        parameters: 'Unit edge capacities',
        output: 'Minimum separating edge cut and source/sink partitions',
        calledBy: ['GraphAnalysisEngine.runMinCut', 'PossibilityEngine'],
        consumers: ['ResolutionReasoningEngine', 'InvestigationAgentService'],
        downstreamAlgorithms: ['ResolutionReasoningEngine'],
        affectsPossibilityGeneration: false,
        affectsPossibilityValidity: false,
        affectsPossibilityComparison: true,
        affectsPossibilityEvolution: false,
        affectsResolutionReasoning: true,
        affectsAgentAnswers: true,
        userVisibleOutput: 'Critical separating cuts and high-priority resolution targets',
        ablationResult: 'Resolution engine cannot pinpoint minimal boundary edges separating competing corridors.'
      },
      {
        algorithmName: 'Possibility Differentiating Engine',
        classification: 'DIFFERENTIATING',
        input: 'BaseGraph, Possibility[]',
        parameters: 'Set intersection & symmetric difference',
        output: 'Common nodes/edges/evidence and unique distinguishing subgraphs',
        calledBy: ['PossibilityEngine.comparePossibilities', 'InvestigationAgentService'],
        consumers: ['ResolutionReasoningEngine', 'ComparisonView UI'],
        downstreamAlgorithms: ['ResolutionReasoningEngine'],
        affectsPossibilityGeneration: false,
        affectsPossibilityValidity: false,
        affectsPossibilityComparison: true,
        affectsPossibilityEvolution: true,
        affectsResolutionReasoning: true,
        affectsAgentAnswers: true,
        userVisibleOutput: 'Comparison matrix, distinguishing subgraphs, resolving recommendation cards',
        ablationResult: 'Possibilities can only be viewed in isolation; structural differences are invisible.'
      },
      {
        algorithmName: 'Affected Subgraph Engine',
        classification: 'EVOLUTIONARY',
        input: 'GraphMutation, BaseGraph, Possibility[]',
        parameters: 'k-hop bounded reachability, provenance links',
        output: 'AffectedNodes, AffectedEdges, AffectedEvidence, AffectedPossibilities',
        calledBy: ['IncrementalReasoningEngine'],
        consumers: ['AlgorithmDependencyGraph', 'AlgorithmResultCache'],
        downstreamAlgorithms: ['AlgorithmDependencyGraph'],
        affectsPossibilityGeneration: false,
        affectsPossibilityValidity: false,
        affectsPossibilityComparison: false,
        affectsPossibilityEvolution: true,
        affectsResolutionReasoning: true,
        affectsAgentAnswers: true,
        userVisibleOutput: 'Active propagation zone badge, evolution metrics',
        ablationResult: 'Incremental graph changes require full unbounded database recomputation.'
      },
      {
        algorithmName: 'Algorithm Dependency Graph & Result Cache',
        classification: 'EVOLUTIONARY',
        input: 'GraphMutationDelta, AffectedSubgraph',
        parameters: 'Selective invalidation cascade',
        output: 'Reused vs recomputed algorithm sets, cache hits',
        calledBy: ['IncrementalReasoningEngine'],
        consumers: ['PossibilityEvolutionEngine', 'InvestigationAgentService'],
        downstreamAlgorithms: ['PossibilityEvolutionEngine'],
        affectsPossibilityGeneration: false,
        affectsPossibilityValidity: false,
        affectsPossibilityComparison: false,
        affectsPossibilityEvolution: true,
        affectsResolutionReasoning: false,
        affectsAgentAnswers: true,
        userVisibleOutput: 'Cache hit rate, reused vs recomputed algorithm metrics',
        ablationResult: 'Every mutation clears all caches and recomputes all algorithms from scratch.'
      },
      {
        algorithmName: 'Possibility Evolution Engine',
        classification: 'EVOLUTIONARY',
        input: 'Possibility[] (V_n), Possibility[] (V_n+1), AffectedSubgraph',
        parameters: 'Deterministic signature matching, causal reason derivation',
        output: 'Added, Removed, Modified, and Unchanged possibility sets with causal explanations',
        calledBy: ['IncrementalReasoningEngine'],
        consumers: ['PossibilityEvolutionView UI', 'InvestigationAgentService'],
        downstreamAlgorithms: [],
        affectsPossibilityGeneration: false,
        affectsPossibilityValidity: false,
        affectsPossibilityComparison: true,
        affectsPossibilityEvolution: true,
        affectsResolutionReasoning: true,
        affectsAgentAnswers: true,
        userVisibleOutput: 'Lineage ribbon, evolution diff cards (+, -, ~, =), What-If simulation results',
        ablationResult: 'System cannot explain why a possibility appeared, changed, or disappeared across versions.'
      },
      {
        algorithmName: 'Resolution Reasoning Engine',
        classification: 'RESOLUTION',
        input: 'Surviving Possibilities[], BaseGraph',
        parameters: 'Topology backbone clustering, partition balance, resolution utility',
        output: 'Structural families, universal invariants, partitioned resolution candidates, resolution matrix, counterfactual impact',
        calledBy: ['ResolutionRoutes', 'InvestigationAgentService'],
        consumers: ['ResolutionLabView UI', 'InvestigationAgentService'],
        downstreamAlgorithms: ['IncrementalReasoningEngine (simulation)'],
        affectsPossibilityGeneration: false,
        affectsPossibilityValidity: false,
        affectsPossibilityComparison: true,
        affectsPossibilityEvolution: true,
        affectsResolutionReasoning: true,
        affectsAgentAnswers: true,
        userVisibleOutput: 'Resolution Lab UI, Resolution Candidates Table, Partition Matrix, What-If simulator',
        ablationResult: 'System generates alternative possibilities but cannot recommend what information would resolve them.'
      }
    ];
  }

  /**
   * Materializes and returns the canonical structural representation of a possibility.
   */
  canonicalizePossibilityStructure(
    possibility: Possibility,
    baseGraph: GraphPayload
  ): CanonicalPossibilityStructure {
    const matGraph = GraphAnalysisEngine.applyDelta(baseGraph, possibility.graphChanges);
    const nodeMap = new Map<string, GraphNode>(matGraph.nodes.map(n => [n.id, n]));

    const events = matGraph.nodes
      .filter(n => n.category === 'EVENT')
      .map(n => ({
        id: n.id,
        label: n.label,
        timestamp: (n.properties as any)?.timestamp || (n.properties as any)?.startTime
      }));

    // Derive pairwise temporal relations for events with valid timestamps
    const temporalRelations: CanonicalPossibilityStructure['temporalRelations'] = [];
    for (let i = 0; i < events.length; i++) {
      for (let j = i + 1; j < events.length; j++) {
        const eA = events[i];
        const eB = events[j];
        if (eA.timestamp && eB.timestamp) {
          const tA = new Date(eA.timestamp).getTime();
          const tB = new Date(eB.timestamp).getTime();
          if (!isNaN(tA) && !isNaN(tB)) {
            let relation: 'BEFORE' | 'CONCURRENT' | 'AFTER' = 'CONCURRENT';
            if (tA < tB) relation = 'BEFORE';
            else if (tA > tB) relation = 'AFTER';
            temporalRelations.push({ sourceId: eA.id, targetId: eB.id, relation });
          }
        }
      }
    }

    const identityAssumptions: CanonicalPossibilityStructure['identityAssumptions'] = [];
    if (possibility.graphChanges.entityResolutionMerges) {
      for (const m of possibility.graphChanges.entityResolutionMerges) {
        identityAssumptions.push({
          entityA: m.survivingNodeId,
          entityB: m.mergedNodeId,
          assumedSame: true
        });
      }
    }

    const criticalDominators = (possibility.criticalDependency || []).map(cd => ({
      id: cd.nodeId,
      label: cd.label
    }));

    const criticalCuts = (possibility.criticalCut || []).map(cc => ({
      source: cc.source,
      target: cc.target,
      type: 'CRITICAL_CUT'
    }));

    const traversedNodeIds = (possibility.constraints as any)?.traversedNodeIds as string[] | undefined;
    const traversedEdgeIds = (possibility.constraints as any)?.traversedEdgeIds as string[] | undefined;

    let relevantNodes = matGraph.nodes;
    let relevantEdges = matGraph.edges;

    if (traversedNodeIds && traversedNodeIds.length > 0) {
      relevantNodes = matGraph.nodes.filter(n => traversedNodeIds.includes(n.id));
    } else if (possibility.generationMethod === 'ALTERNATIVE_PATHS') {
      const seqAssumption = possibility.assumptions?.find(a => a.startsWith('Path relies on sequence:'));
      if (seqAssumption) {
        const labels = seqAssumption.replace('Path relies on sequence:', '').split('→').map(s => s.trim());
        relevantNodes = matGraph.nodes.filter(n => labels.includes(n.label));
      }
    }

    if (traversedEdgeIds && traversedEdgeIds.length > 0) {
      relevantEdges = matGraph.edges.filter(e => traversedEdgeIds.includes(e.id));
    } else if (possibility.generationMethod === 'ALTERNATIVE_PATHS') {
      const relevantNodeIdSet = new Set(relevantNodes.map(n => n.id));
      relevantEdges = matGraph.edges.filter(e => relevantNodeIdSet.has(e.source) && relevantNodeIdSet.has(e.target));
    }

    return {
      possibilityId: possibility.id,
      possibilityName: possibility.name,
      nodes: relevantNodes.map(n => ({
        id: n.id,
        label: n.label,
        type: n.type,
        category: n.category
      })),
      edges: relevantEdges.map(e => ({
        id: e.id,
        source: e.source,
        target: e.target,
        type: e.type
      })),
      events,
      temporalRelations,
      evidenceDependencies: [...possibility.supportingEvidence],
      identityAssumptions,
      criticalDominatorNodes: criticalDominators,
      criticalCutEdges: criticalCuts,
      independentPathCount: possibility.independentSupportPaths || 1,
      canonicalSignature: possibility.canonicalSignature
    };
  }

  /**
   * Deterministic Structural Family Grouping (No ML clustering).
   * Clusters possibilities by topology backbone, core corridor, or hypothesis generation method.
   */
  clusterStructuralFamilies(
    possibilities: Possibility[],
    baseGraph: GraphPayload
  ): StructuralFamily[] {
    if (possibilities.length === 0) return [];

    const familyMap = new Map<string, Possibility[]>();

    for (const p of possibilities) {
      let backboneKey = '';

      if (p.generationMethod === 'ALTERNATIVE_PATHS') {
        // Derive corridor signature from assumptions or intermediate hops
        const assumption = p.assumptions.find(a => a.startsWith('Path relies on sequence:'));
        if (assumption) {
          const hops = assumption.replace('Path relies on sequence:', '').split('→').map(s => s.trim());
          if (hops.length >= 3) {
            const intermediaries = hops.slice(1, -1);
            backboneKey = `CORRIDOR_VIA_${intermediaries.join('_TO_').toUpperCase().replace(/[^A-Z0-9_]/g, '_')}`;
          } else {
            backboneKey = `CORRIDOR_DIRECT`;
          }
        } else {
          backboneKey = `CORRIDOR_GENERIC_${p.name.slice(0, 15)}`;
        }
      } else if (p.generationMethod === 'ENTITY_RESOLUTION') {
        const isMerged = (p.graphChanges.entityResolutionMerges?.length || 0) > 0;
        backboneKey = isMerged ? 'IDENTITY_UNIFIED_HYPOTHESIS' : 'IDENTITY_SEPARATE_HYPOTHESIS';
      } else if (p.generationMethod === 'CONTRADICTION_BRANCHING') {
        backboneKey = p.name.includes('Proxy') ? 'CONTRADICTION_PROXY_BRANCH' : 'CONTRADICTION_DIRECT_BRANCH';
      } else if (p.generationMethod === 'TEMPORAL_ORDERING') {
        backboneKey = 'TEMPORAL_SEQUENCE_BRANCH';
      } else {
        backboneKey = `METHOD_${p.generationMethod}`;
      }

      if (!familyMap.has(backboneKey)) {
        familyMap.set(backboneKey, []);
      }
      familyMap.get(backboneKey)!.push(p);
    }

    const families: StructuralFamily[] = [];
    let idx = 1;

    for (const [key, pList] of familyMap.entries()) {
      const familyId = `FAM-${idx++}`;
      const rep = pList[0];

      let familyLabel = '';
      if (key.startsWith('CORRIDOR_VIA_')) {
        familyLabel = `Corridor Family: ${key.replace('CORRIDOR_VIA_', '').replace(/_/g, ' ')}`;
      } else if (key === 'IDENTITY_UNIFIED_HYPOTHESIS') {
        familyLabel = `Unified Identity Family`;
      } else if (key === 'IDENTITY_SEPARATE_HYPOTHESIS') {
        familyLabel = `Distinct Entities Family`;
      } else if (key === 'CONTRADICTION_PROXY_BRANCH') {
        familyLabel = `Proxy Execution Hypothesis Family`;
      } else if (key === 'CONTRADICTION_DIRECT_BRANCH') {
        familyLabel = `Direct Activity Hypothesis Family`;
      } else {
        familyLabel = `Hypothesis Group: ${rep.name.split(':')[0] || rep.name}`;
      }

      const sharedEvidence = pList[0].supportingEvidence.filter(eId =>
        pList.every(p => p.supportingEvidence.includes(eId))
      );

      families.push({
        familyId,
        familyLabel,
        backboneSignature: key,
        possibilityIds: pList.map(p => p.id),
        representativePossibilityId: rep.id,
        keySharedFeatures: [
          `Contains ${pList.length} possibility model(s)`,
          `Shared evidence support: ${sharedEvidence.length} item(s)`,
          `Backbone topology: ${key}`
        ],
        differentiatingFromOtherFamilies: [
          `Distinctive structural routing signature: ${key}`
        ]
      });
    }

    return families;
  }

  /**
   * Common Invariant Analysis:
   * Computes the exact structural intersection across 100% of surviving possibilities,
   * including dominator choke points that are invariant across all paths.
   */
  extractCommonInvariants(
    possibilities: Possibility[],
    baseGraph: GraphPayload
  ): CommonInvariants {
    const valid = possibilities.filter(p => p.status !== 'INVALID');
    if (valid.length === 0) {
      return {
        commonNodes: [],
        commonEdges: [],
        commonEvents: [],
        commonEvidenceRefs: [],
        commonUnavoidableDominatorNodes: [],
        commonCriticalCutEdges: [],
        universalCoveragePercentage: 0
      };
    }

    const totalCount = valid.length;
    const structures = valid.map(p => this.canonicalizePossibilityStructure(p, baseGraph));

    // 1. Common Nodes
    const nodeCounts = new Map<string, { count: number; node: CanonicalPossibilityStructure['nodes'][0] }>();
    for (const s of structures) {
      const seen = new Set<string>();
      for (const n of s.nodes) {
        if (!seen.has(n.id)) {
          seen.add(n.id);
          const curr = nodeCounts.get(n.id) || { count: 0, node: n };
          curr.count++;
          nodeCounts.set(n.id, curr);
        }
      }
    }
    const commonNodes = Array.from(nodeCounts.values())
      .filter(item => item.count === totalCount)
      .map(item => item.node);

    // 2. Common Edges
    const edgeCounts = new Map<string, { count: number; edge: CanonicalPossibilityStructure['edges'][0] }>();
    for (const s of structures) {
      const seen = new Set<string>();
      for (const e of s.edges) {
        const key = `${e.source}==${e.target}==${e.type}`;
        if (!seen.has(key)) {
          seen.add(key);
          const curr = edgeCounts.get(key) || { count: 0, edge: e };
          curr.count++;
          edgeCounts.set(key, curr);
        }
      }
    }
    const commonEdges = Array.from(edgeCounts.values())
      .filter(item => item.count === totalCount)
      .map(item => ({ source: item.edge.source, target: item.edge.target, type: item.edge.type }));

    // 3. Common Events
    const eventCounts = new Map<string, { count: number; event: CanonicalPossibilityStructure['events'][0] }>();
    for (const s of structures) {
      const seen = new Set<string>();
      for (const ev of s.events) {
        if (!seen.has(ev.id)) {
          seen.add(ev.id);
          const curr = eventCounts.get(ev.id) || { count: 0, event: ev };
          curr.count++;
          eventCounts.set(ev.id, curr);
        }
      }
    }
    const commonEvents = Array.from(eventCounts.values())
      .filter(item => item.count === totalCount)
      .map(item => item.event);

    // 4. Common Evidence
    const evidenceCounts = new Map<string, number>();
    for (const s of structures) {
      const seen = new Set<string>(s.evidenceDependencies);
      for (const evId of seen) {
        evidenceCounts.set(evId, (evidenceCounts.get(evId) || 0) + 1);
      }
    }
    const commonEvidenceRefs = Array.from(evidenceCounts.entries())
      .filter(([_, count]) => count === totalCount)
      .map(([id]) => id);

    // 5. Common Unavoidable Dominator Nodes (Choke points present in every possibility)
    const dominatorCounts = new Map<string, { count: number; label: string }>();
    for (const s of structures) {
      const seen = new Set<string>();
      for (const d of s.criticalDominatorNodes) {
        if (!seen.has(d.id)) {
          seen.add(d.id);
          const curr = dominatorCounts.get(d.id) || { count: 0, label: d.label };
          curr.count++;
          dominatorCounts.set(d.id, curr);
        }
      }
    }
    const commonUnavoidableDominatorNodes = Array.from(dominatorCounts.entries())
      .filter(([_, item]) => item.count === totalCount)
      .map(([id, item]) => ({ id, label: item.label }));

    // 6. Common Critical Cuts
    const cutCounts = new Map<string, { count: number; cut: { source: string; target: string; type: string } }>();
    for (const s of structures) {
      const seen = new Set<string>();
      for (const c of s.criticalCutEdges) {
        const key = `${c.source}==${c.target}`;
        if (!seen.has(key)) {
          seen.add(key);
          const curr = cutCounts.get(key) || { count: 0, cut: c };
          curr.count++;
          cutCounts.set(key, curr);
        }
      }
    }
    const commonCriticalCutEdges = Array.from(cutCounts.values())
      .filter(item => item.count === totalCount)
      .map(item => item.cut);

    return {
      commonNodes,
      commonEdges,
      commonEvents,
      commonEvidenceRefs,
      commonUnavoidableDominatorNodes,
      commonCriticalCutEdges,
      universalCoveragePercentage: 100
    };
  }

  /**
   * Identifies distinguishing graph elements (nodes, edges, evidence) across possibilities and families.
   */
  computeDistinguishingStructures(
    possibilities: Possibility[],
    families: StructuralFamily[],
    baseGraph: GraphPayload
  ): DistinguishingStructure[] {
    const valid = possibilities.filter(p => p.status !== 'INVALID');
    if (valid.length < 2) return [];

    const totalCount = valid.length;
    const structures = valid.map(p => this.canonicalizePossibilityStructure(p, baseGraph));
    const distMap = new Map<string, DistinguishingStructure>();

    const pToFamily = new Map<string, string>();
    for (const fam of families) {
      for (const pid of fam.possibilityIds) {
        pToFamily.set(pid, fam.familyId);
      }
    }

    // 1. Distinguishing Nodes
    for (const s of structures) {
      for (const n of s.nodes) {
        if (!distMap.has(`NODE_${n.id}`)) {
          distMap.set(`NODE_${n.id}`, {
            elementId: n.id,
            elementType: 'NODE',
            elementLabel: n.label,
            presentInPossibilityIds: [],
            absentInPossibilityIds: [],
            presentInFamilyIds: [],
            absentInFamilyIds: [],
            structuralRole: 'Distinguishing Network Entity'
          });
        }
      }
    }

    for (const [key, dist] of distMap.entries()) {
      if (dist.elementType === 'NODE') {
        const presentP = structures.filter(s => s.nodes.some(n => n.id === dist.elementId)).map(s => s.possibilityId);
        const absentP = valid.map(p => p.id).filter(pid => !presentP.includes(pid));
        if (presentP.length > 0 && presentP.length < totalCount) {
          dist.presentInPossibilityIds = presentP;
          dist.absentInPossibilityIds = absentP;
          dist.presentInFamilyIds = Array.from(new Set(presentP.map(pid => pToFamily.get(pid)).filter(Boolean) as string[]));
          dist.absentInFamilyIds = Array.from(new Set(absentP.map(pid => pToFamily.get(pid)).filter(Boolean) as string[]));
        } else {
          distMap.delete(key);
        }
      }
    }

    // 2. Distinguishing Edges
    const edgePresence = new Map<string, { edge: CanonicalPossibilityStructure['edges'][0]; pIds: string[] }>();
    for (const s of structures) {
      for (const e of s.edges) {
        const eKey = `${e.source}==${e.target}==${e.type}`;
        if (!edgePresence.has(eKey)) {
          edgePresence.set(eKey, { edge: e, pIds: [] });
        }
        edgePresence.get(eKey)!.pIds.push(s.possibilityId);
      }
    }

    const nodeLabelMap = new Map<string, string>(baseGraph.nodes.map(n => [n.id, n.label]));
    for (const [eKey, data] of edgePresence.entries()) {
      if (data.pIds.length > 0 && data.pIds.length < totalCount) {
        const srcLabel = nodeLabelMap.get(data.edge.source) || data.edge.source;
        const tgtLabel = nodeLabelMap.get(data.edge.target) || data.edge.target;
        const absentP = valid.map(p => p.id).filter(pid => !data.pIds.includes(pid));

        distMap.set(`EDGE_${eKey}`, {
          elementId: eKey,
          elementType: 'EDGE',
          elementLabel: `${srcLabel} -[${data.edge.type}]-> ${tgtLabel}`,
          presentInPossibilityIds: data.pIds,
          absentInPossibilityIds: absentP,
          presentInFamilyIds: Array.from(new Set(data.pIds.map(pid => pToFamily.get(pid)).filter(Boolean) as string[])),
          absentInFamilyIds: Array.from(new Set(absentP.map(pid => pToFamily.get(pid)).filter(Boolean) as string[])),
          structuralRole: 'Distinguishing Corridor Relationship'
        });
      }
    }

    return Array.from(distMap.values()).slice(0, 15);
  }

  /**
   * Contradiction Impact Analysis:
   * Maps conflicting evidence to affected vs unaffected possibilities with causal justification.
   */
  analyzeContradictions(
    caseId: string,
    baseGraph: GraphPayload,
    possibilities: Possibility[]
  ): ContradictionImpact[] {
    const valid = possibilities.filter(p => p.status === 'VALID' || p.status === 'CONDITIONAL' || p.status === 'CONFLICTING');
    const contradictionEdges = baseGraph.edges.filter(e => e.type === 'CONTRADICTS');
    const nodeMap = new Map<string, GraphNode>(baseGraph.nodes.map(n => [n.id, n]));
    const impacts: ContradictionImpact[] = [];

    let count = 1;
    for (const ce of contradictionEdges) {
      const srcNode = nodeMap.get(ce.source);
      const tgtNode = nodeMap.get(ce.target);

      const affected = valid.filter(p =>
        p.supportingEvidence.includes(ce.source) ||
        p.conflictingEvidence.includes(ce.target) ||
        p.supportingEvidence.includes(ce.target) ||
        p.conflictingEvidence.includes(ce.source)
      ).map(p => p.id);

      const unaffected = valid.map(p => p.id).filter(pid => !affected.includes(pid));

      impacts.push({
        contradictionId: `CONTRA-${count++}`,
        conflictingEvidence: [
          { id: ce.source, label: srcNode?.label || ce.source },
          { id: ce.target, label: tgtNode?.label || ce.target }
        ],
        affectedPossibilityIds: affected,
        unaffectedPossibilityIds: unaffected,
        temporalOverlap: true,
        reason: `Contradiction between '${srcNode?.label || ce.source}' and '${tgtNode?.label || ce.target}'. ` +
          `Possibilities [${affected.join(', ') || 'None'}] rely on the disputed state, while [${unaffected.join(', ')}] maintain independent routing.`
      });
    }

    return impacts;
  }

  /**
   * Generates deterministic Resolution Candidates prioritized by measurable Resolution Utility.
   * Connects Min-Cut, Dominators, Disjoint-Paths, and Alternative Corridors.
   */
  generateResolutionCandidates(
    possibilities: Possibility[],
    families: StructuralFamily[],
    baseGraph: GraphPayload
  ): ResolutionCandidate[] {
    const valid = possibilities.filter(p => p.status !== 'INVALID');
    if (valid.length < 2) return [];

    const totalPossibilities = valid.length;
    const totalFamilies = Math.max(1, families.length);
    const distinguishing = this.computeDistinguishingStructures(valid, families, baseGraph);
    const nodeMap = new Map<string, GraphNode>(baseGraph.nodes.map(n => [n.id, n]));

    const pToFamily = new Map<string, string>();
    for (const fam of families) {
      for (const pid of fam.possibilityIds) {
        pToFamily.set(pid, fam.familyId);
      }
    }

    const candidates: ResolutionCandidate[] = [];
    let rId = 1;

    // 1. Resolution candidates from Dominator divergence & unavoidable choke points
    for (const fam of families) {
      const rep = valid.find(p => p.id === fam.representativePossibilityId);
      if (rep && rep.criticalDependency && rep.criticalDependency.length > 0) {
        for (const cd of rep.criticalDependency) {
          const presentP = valid.filter(p => p.criticalDependency?.some(d => d.nodeId === cd.nodeId)).map(p => p.id);
          const absentP = valid.map(p => p.id).filter(pid => !presentP.includes(pid));

          if (presentP.length > 0 && !candidates.some(c => c.targetEntities.includes(cd.nodeId))) {
            const familyCoverage = 1.0;
            const balance = absentP.length > 0
              ? (1.0 - Math.abs(presentP.length - absentP.length) / totalPossibilities)
              : 0.6;
            const rawScore = 2.0 * familyCoverage + 1.5 * balance + 1.0 * 1.0 + 0.5 * 0.8;
            const utilityScore = Math.min(100, Math.round((rawScore / 5.0) * 100));

            candidates.push({
              id: `R${rId++}`,
              targetType: 'NODE',
              targetLabel: `Choke Point: ${cd.label}`,
              targetEntities: [cd.nodeId],
              why: absentP.length > 0
                ? `Node '${cd.label}' is an unavoidable dominator for family '${fam.familyLabel}'. Verification isolates or confirms this entire corridor family.`
                : `Node '${cd.label}' is an unavoidable dominator choke point across all surviving corridors. Refutation eliminates all hypotheses routing through this bottleneck.`,
              affectedPossibilityIds: [...presentP, ...absentP],
              distinguishedFamilyIds: [fam.familyId],
              graphBasis: 'DOMINATOR_DIVERGENCE',
              suggestedEvidenceClass: 'Forensic System Image / Building Entry Audit',
              resolutionUtilityScore: utilityScore,
              utilityBreakdown: {
                familyCoverage: 1.0,
                possibilityCoverage: 1.0,
                structuralSeparation: Math.round(balance * 100) / 100,
                temporalSpecificity: 0.8
              },
              partition: {
                ifPresentValidPossibilityIds: presentP,
                ifAbsentValidPossibilityIds: absentP
              }
            });
          }
        }
      }
    }

    // 2. Resolution candidates from Min-Cut separating boundaries
    for (const p of valid) {
      if (p.criticalCut && p.criticalCut.length > 0) {
        for (const cc of p.criticalCut) {
          if (!cc.source || !cc.target || !nodeMap.has(cc.source) || !nodeMap.has(cc.target)) {
            continue;
          }
          if (!candidates.some(c => c.targetEntities.includes(cc.source) && c.targetEntities.includes(cc.target))) {
            const srcNode = nodeMap.get(cc.source);
            const tgtNode = nodeMap.get(cc.target);
            const srcLabel = srcNode?.label || cc.source;
            const tgtLabel = tgtNode?.label || cc.target;

            const presentP = valid.filter(vp => vp.criticalCut?.some(c => c.source === cc.source && c.target === cc.target)).map(vp => vp.id);
            const absentP = valid.map(vp => vp.id).filter(pid => !presentP.includes(pid));

            const familyCoverage = 1.0;
            const balance = absentP.length > 0
              ? (1.0 - Math.abs(presentP.length - absentP.length) / totalPossibilities)
              : 0.6;
            const rawScore = 2.0 * familyCoverage + 1.5 * balance + 1.0 * 1.0 + 0.5 * 0.7;
            const utilityScore = Math.min(100, Math.round((rawScore / 5.0) * 100));

            candidates.push({
              id: `R${rId++}`,
              targetType: 'EDGE',
              targetLabel: `Cut Boundary: ${srcLabel} -> ${tgtLabel}`,
              targetEntities: [cc.source, cc.target],
              why: `Edge '${srcLabel} -> ${tgtLabel}' forms a critical min-cut separating barrier in the flow network. Interdicting or verifying this boundary isolates alternative transit corridors.`,
              affectedPossibilityIds: [...presentP, ...absentP],
              distinguishedFamilyIds: families.map(f => f.familyId),
              graphBasis: 'MIN_CUT_SEPARATION',
              suggestedEvidenceClass: 'Communication / Network Capture / Telemetry',
              resolutionUtilityScore: utilityScore,
              utilityBreakdown: {
                familyCoverage: 1.0,
                possibilityCoverage: 1.0,
                structuralSeparation: Math.round(balance * 100) / 100,
                temporalSpecificity: 0.7
              },
              partition: {
                ifPresentValidPossibilityIds: presentP,
                ifAbsentValidPossibilityIds: absentP
              }
            });
          }
        }
      }
    }

    // 2. Resolution candidates from distinguishing nodes / alternative corridors
    for (const dist of distinguishing) {
      if (dist.elementType === 'NODE') {
        if (candidates.some(c => c.targetEntities.includes(dist.elementId))) {
          continue;
        }
        const node = nodeMap.get(dist.elementId);
        const ifPresent = dist.presentInPossibilityIds;
        const ifAbsent = dist.absentInPossibilityIds;

        const famCovered = new Set([...dist.presentInFamilyIds, ...dist.absentInFamilyIds]).size;
        const familyCoverage = famCovered / totalFamilies;
        const possibilityCoverage = (ifPresent.length + ifAbsent.length) / totalPossibilities;
        const balance = 1.0 - Math.abs(ifPresent.length - ifAbsent.length) / totalPossibilities;
        const temporalSpecificity = node?.category === 'EVENT' ? 1.0 : 0.6;

        // Formula: Utility = 2.0*familyCoverage + 1.5*balance + 1.0*possibilityCoverage + 0.5*temporalSpecificity
        const rawScore = 2.0 * familyCoverage + 1.5 * balance + 1.0 * possibilityCoverage + 0.5 * temporalSpecificity;
        const utilityScore = Math.min(100, Math.round((rawScore / 5.0) * 100));

        candidates.push({
          id: `R${rId++}`,
          targetType: 'NODE',
          targetLabel: dist.elementLabel,
          targetEntities: [dist.elementId],
          why: `Determines whether transit/activity via '${dist.elementLabel}' occurred. ` +
            `Confirms [${ifPresent.map(p => p.slice(0, 8)).join(', ')}] while eliminating [${ifAbsent.map(p => p.slice(0, 8)).join(', ')}].`,
          affectedPossibilityIds: [...ifPresent, ...ifAbsent],
          distinguishedFamilyIds: dist.presentInFamilyIds,
          graphBasis: 'ALTERNATIVE_CORRIDOR',
          suggestedEvidenceClass: node?.category === 'EVENT' ? 'CCTV / Witness Interview' : 'Access Log / Surveillance Record',
          resolutionUtilityScore: utilityScore,
          utilityBreakdown: {
            familyCoverage: Math.round(familyCoverage * 100) / 100,
            possibilityCoverage: Math.round(possibilityCoverage * 100) / 100,
            structuralSeparation: Math.round(balance * 100) / 100,
            temporalSpecificity
          },
          partition: {
            ifPresentValidPossibilityIds: ifPresent,
            ifAbsentValidPossibilityIds: ifAbsent
          }
        });
      } else if (dist.elementType === 'EDGE') {
        const ifPresent = dist.presentInPossibilityIds;
        const ifAbsent = dist.absentInPossibilityIds;

        const famCovered = new Set([...dist.presentInFamilyIds, ...dist.absentInFamilyIds]).size;
        const familyCoverage = famCovered / totalFamilies;
        const possibilityCoverage = (ifPresent.length + ifAbsent.length) / totalPossibilities;
        const balance = 1.0 - Math.abs(ifPresent.length - ifAbsent.length) / totalPossibilities;
        const temporalSpecificity = 0.7;

        const rawScore = 2.0 * familyCoverage + 1.5 * balance + 1.0 * possibilityCoverage + 0.5 * temporalSpecificity;
        const utilityScore = Math.min(100, Math.round((rawScore / 5.0) * 100));

        const [srcId, tgtId] = dist.elementId.split('==');

        candidates.push({
          id: `R${rId++}`,
          targetType: 'EDGE',
          targetLabel: dist.elementLabel,
          targetEntities: [srcId, tgtId].filter(Boolean),
          why: `Verifies direct interaction link: ${dist.elementLabel}. Partitions the surviving space between dependent vs independent paths.`,
          affectedPossibilityIds: [...ifPresent, ...ifAbsent],
          distinguishedFamilyIds: dist.presentInFamilyIds,
          graphBasis: 'MIN_CUT_SEPARATION',
          suggestedEvidenceClass: 'Communication / Network Capture / Telemetry',
          resolutionUtilityScore: utilityScore,
          utilityBreakdown: {
            familyCoverage: Math.round(familyCoverage * 100) / 100,
            possibilityCoverage: Math.round(possibilityCoverage * 100) / 100,
            structuralSeparation: Math.round(balance * 100) / 100,
            temporalSpecificity
          },
          partition: {
            ifPresentValidPossibilityIds: ifPresent,
            ifAbsentValidPossibilityIds: ifAbsent
          }
        });
      }
    }

    // Sort descending by resolution utility score
    candidates.sort((a, b) => b.resolutionUtilityScore - a.resolutionUtilityScore);
    return candidates.slice(0, 15);
  }

  /**
   * Builds the boolean Resolution Matrix and calculates structural uncertainty (entropy).
   */
  buildResolutionMatrix(
    candidates: ResolutionCandidate[],
    possibilities: Possibility[],
    families: StructuralFamily[]
  ): ResolutionMatrix {
    const valid = possibilities.filter(p => p.status !== 'INVALID');
    const pToFamily = new Map<string, string>();
    for (const fam of families) {
      for (const pid of fam.possibilityIds) {
        pToFamily.set(pid, fam.familyId);
      }
    }

    const pMeta = valid.map(p => ({
      id: p.id,
      name: p.name,
      familyId: pToFamily.get(p.id) || 'FAM-1'
    }));

    const candMeta = candidates.map(c => ({
      id: c.id,
      label: c.targetLabel,
      utilityScore: c.resolutionUtilityScore
    }));

    const matrix: Record<string, Record<string, boolean>> = {};
    for (const c of candidates) {
      matrix[c.id] = {};
      const presentSet = new Set(c.partition.ifPresentValidPossibilityIds);
      for (const p of valid) {
        matrix[c.id][p.id] = presentSet.has(p.id);
      }
    }

    // H(P) = -sum p_i log2(p_i) under equal-weight assumption: H(P) = log2(N)
    const N = valid.length;
    const structuralEntropy = N > 0 ? Math.round(Math.log2(N) * 1000) / 1000 : 0;

    return {
      candidates: candMeta,
      possibilities: pMeta,
      matrix,
      structuralEntropy
    };
  }

  /**
   * Full Resolution Analysis Pipeline:
   * Generates structural families, universal invariants, differentiators,
   * prioritized resolution candidates, and the binary resolution matrix.
   */
  runResolutionAnalysis(
    caseId: string,
    baseGraph: GraphPayload,
    options?: {
      disableDominators?: boolean;
      disableMinCut?: boolean;
      disableFamilies?: boolean;
      customPossibilities?: Possibility[];
    }
  ): ResolutionReasoningResult {
    const possibilities = options?.customPossibilities || this.possibilityRepo.findByCaseId(caseId);
    const valid = possibilities.filter(p => p.status !== 'INVALID');

    let structuralFamilies = this.clusterStructuralFamilies(valid, baseGraph);
    if (options?.disableFamilies && valid.length > 0) {
      structuralFamilies = [
        {
          familyId: 'FAM-1',
          familyLabel: 'Monolithic Undifferentiated Family',
          backboneSignature: 'MONOLITHIC_CLUSTER',
          possibilityIds: valid.map(p => p.id),
          representativePossibilityId: valid[0].id,
          keySharedFeatures: ['All surviving possibilities in single unpartitioned cluster'],
          differentiatingFromOtherFamilies: []
        }
      ];
    }

    const commonInvariants = this.extractCommonInvariants(valid, baseGraph);
    if (options?.disableDominators) {
      commonInvariants.commonUnavoidableDominatorNodes = [];
    }
    if (options?.disableMinCut) {
      commonInvariants.commonCriticalCutEdges = [];
    }

    const distinguishingStructures = this.computeDistinguishingStructures(valid, structuralFamilies, baseGraph);
    let resolutionCandidates = this.generateResolutionCandidates(valid, structuralFamilies, baseGraph);

    if (options?.disableDominators) {
      resolutionCandidates = resolutionCandidates.filter(c => c.graphBasis !== 'DOMINATOR_DIVERGENCE');
    }
    if (options?.disableMinCut) {
      resolutionCandidates = resolutionCandidates.filter(c => c.graphBasis !== 'MIN_CUT_SEPARATION');
    }

    const resolutionMatrix = this.buildResolutionMatrix(resolutionCandidates, valid, structuralFamilies);
    const contradictionImpacts = this.analyzeContradictions(caseId, baseGraph, possibilities);

    return {
      caseId,
      timestamp: new Date().toISOString(),
      totalSurvivingPossibilities: valid.length,
      structuralFamilies,
      commonInvariants,
      distinguishingStructures,
      resolutionCandidates,
      resolutionMatrix,
      contradictionImpacts
    };
  }

  /**
   * Counterfactual Resolution Simulation:
   * Simulates confirming or refuting a resolution candidate without modifying the real database,
   * reporting the exact shrinkage of the possibility space and remaining structural families.
   */
  async simulateCounterfactualResolution(
    caseId: string,
    candidateId: string,
    baseGraph: GraphPayload,
    action: 'CONFIRM_ELEMENT' | 'REFUTE_ELEMENT' = 'CONFIRM_ELEMENT'
  ): Promise<CounterfactualResolutionSimulation> {
    const analysis = this.runResolutionAnalysis(caseId, baseGraph);
    const candidate = analysis.resolutionCandidates.find(c => c.id === candidateId) || analysis.resolutionCandidates[0];

    if (!candidate) {
      throw new Error(`Resolution candidate '${candidateId}' not found.`);
    }

    const beforeIds = candidate.affectedPossibilityIds;
    const survivingIds = action === 'CONFIRM_ELEMENT'
      ? candidate.partition.ifPresentValidPossibilityIds
      : candidate.partition.ifAbsentValidPossibilityIds;

    const eliminatedIds = beforeIds.filter(id => !survivingIds.includes(id));

    // Determine surviving and eliminated families
    const survivingFamilies = Array.from(new Set(
      survivingIds.map(pid => {
        const fam = analysis.structuralFamilies.find(f => f.possibilityIds.includes(pid));
        return fam ? fam.familyLabel : 'Family';
      })
    ));

    const eliminatedFamilies = Array.from(new Set(
      eliminatedIds.map(pid => {
        const fam = analysis.structuralFamilies.find(f => f.possibilityIds.includes(pid));
        return fam ? fam.familyLabel : 'Family';
      })
    )).filter(f => !survivingFamilies.includes(f));

    const explanation = action === 'CONFIRM_ELEMENT'
      ? `Simulated confirmation of '${candidate.targetLabel}' validates ${survivingIds.length} possibility branch(es) and eliminates ${eliminatedIds.length} alternative corridor(s). Surviving families: [${survivingFamilies.join(', ')}].`
      : `Simulated refutation of '${candidate.targetLabel}' eliminates ${eliminatedIds.length} possibility branch(es) dependent on this element. Surviving families: [${survivingFamilies.join(', ')}].`;

    return {
      candidateId: candidate.id,
      simulatedAction: action,
      beforePossibilityIds: beforeIds,
      afterPossibilityIds: survivingIds,
      eliminatedPossibilityIds: eliminatedIds,
      survivingFamilies,
      eliminatedFamilies,
      explanation
    };
  }
}

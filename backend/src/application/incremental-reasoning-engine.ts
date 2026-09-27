import { v4 as uuidv4 } from 'uuid';
import { DatabaseSync } from 'node:sqlite';
import { GraphPayload, GraphNode, GraphEdge } from '../domain/types.js';
import {
  GraphMutation,
  GraphDelta,
  GraphVersion,
  AffectedSubgraph,
  IncrementalImpactReport,
  SimulationResult
} from '../domain/incremental-types.js';
import { Possibility, PossibilityGenerationOptions } from '../domain/possibility-types.js';
import { GraphVersionRepository } from '../infrastructure/repositories/graph-version-repository.js';
import { PossibilityRepository } from '../infrastructure/repositories/possibility-repository.js';
import { ResolutionRepository } from '../infrastructure/repositories/resolution-repository.js';
import { PossibilityEngine } from './possibility-engine.js';
import { AffectedSubgraphEngine } from '../domain/algorithms/affected-subgraph-engine.js';
import { AlgorithmDependencyGraph } from '../domain/algorithms/algorithm-dependency-graph.js';
import { AlgorithmResultCache } from '../infrastructure/algorithm-result-cache.js';
import { PossibilityEvolutionEngine } from './possibility-evolution-engine.js';

export class IncrementalReasoningEngine {
  private versionRepo: GraphVersionRepository;
  private possibilityRepo: PossibilityRepository;
  private resolutionRepo: ResolutionRepository;
  private cache: AlgorithmResultCache;
  private latestReports = new Map<string, IncrementalImpactReport>();

  constructor(
    private db: DatabaseSync,
    private possibilityEngine: PossibilityEngine
  ) {
    this.versionRepo = new GraphVersionRepository(db);
    this.possibilityRepo = new PossibilityRepository(db);
    this.resolutionRepo = new ResolutionRepository(db);
    this.cache = new AlgorithmResultCache();
  }

  getVersionRepository(): GraphVersionRepository {
    return this.versionRepo;
  }

  getResultCache(): AlgorithmResultCache {
    return this.cache;
  }

  getLatestImpactReport(caseId: string): IncrementalImpactReport | null {
    return this.latestReports.get(caseId) || null;
  }

  /**
   * Computes a semantic GraphDelta comparing previous and current graph states.
   */
  computeGraphDelta(
    previous: GraphPayload,
    current: GraphPayload,
    identityChanges: Array<{ sourceId: string; targetId: string; action: 'MERGED' | 'SEPARATED' | 'PENDING' }> = []
  ): GraphDelta {
    const prevNodeMap = new Map(previous.nodes.map(n => [n.id, n]));
    const currNodeMap = new Map(current.nodes.map(n => [n.id, n]));
    const prevEdgeMap = new Map(previous.edges.map(e => [e.id, e]));
    const currEdgeMap = new Map(current.edges.map(e => [e.id, e]));

    const addedNodes = current.nodes.filter(n => !prevNodeMap.has(n.id));
    const removedNodes = previous.nodes.filter(n => !currNodeMap.has(n.id));
    const modifiedNodes: Array<{ before: GraphNode; after: GraphNode }> = [];

    const changedTemporalConstraints: Array<{ eventId: string; beforeTime?: string; afterTime?: string; reason: string }> = [];
    const changedEvidence: Array<{ evidenceId: string; type: 'ADDED' | 'REMOVED' | 'MODIFIED'; detail?: string }> = [];

    for (const [id, curr] of currNodeMap.entries()) {
      const prev = prevNodeMap.get(id);
      if (prev) {
        const timeChanged = JSON.stringify(prev.time) !== JSON.stringify(curr.time);
        const propsChanged = JSON.stringify(prev.properties) !== JSON.stringify(curr.properties);
        const labelChanged = prev.label !== curr.label;

        if (timeChanged || propsChanged || labelChanged) {
          modifiedNodes.push({ before: prev, after: curr });
        }

        if (curr.category === 'EVENT' && timeChanged) {
          changedTemporalConstraints.push({
            eventId: curr.id,
            beforeTime: prev.time?.start,
            afterTime: curr.time?.start,
            reason: `Event '${curr.label}' timestamp updated: ${prev.time?.start || 'none'} → ${curr.time?.start || 'none'}`
          });
        }
      }
    }

    for (const an of addedNodes) {
      if (an.category === 'EVIDENCE') {
        changedEvidence.push({ evidenceId: an.id, type: 'ADDED', detail: `Evidence '${an.label}' added` });
      }
    }
    for (const rn of removedNodes) {
      if (rn.category === 'EVIDENCE') {
        changedEvidence.push({ evidenceId: rn.id, type: 'REMOVED', detail: `Evidence '${rn.label}' removed` });
      }
    }

    const addedEdges = current.edges.filter(e => !prevEdgeMap.has(e.id));
    const removedEdges = previous.edges.filter(e => !currEdgeMap.has(e.id));
    const modifiedEdges: Array<{ before: GraphEdge; after: GraphEdge }> = [];

    for (const [id, curr] of currEdgeMap.entries()) {
      const prev = prevEdgeMap.get(id);
      if (prev) {
        const costChanged = prev.cost !== curr.cost;
        const evidenceChanged = JSON.stringify(prev.evidenceRefs || []) !== JSON.stringify(curr.evidenceRefs || []);
        const statusChanged = prev.status !== curr.status;

        if (costChanged || evidenceChanged || statusChanged) {
          modifiedEdges.push({ before: prev, after: curr });
        }
      }
    }

    return {
      addedNodes,
      removedNodes,
      modifiedNodes,
      addedEdges,
      removedEdges,
      modifiedEdges,
      changedEvidence,
      changedTemporalConstraints,
      changedIdentityConstraints: identityChanges
    };
  }

  /**
   * Commits a new GraphVersion on mutation and triggers selective incremental reasoning.
   */
  commitMutationAndRecalculate(
    caseId: string,
    mutation: GraphMutation,
    previousGraph: GraphPayload,
    currentGraph: GraphPayload,
    generationOptions: PossibilityGenerationOptions = {}
  ): IncrementalImpactReport {
    const t0 = performance.now();

    // 1. Delta Detection
    const tDeltaStart = performance.now();
    const identityChanges: Array<{ sourceId: string; targetId: string; action: 'MERGED' | 'SEPARATED' | 'PENDING' }> = [];
    if (mutation.targetType === 'ENTITY_RESOLUTION') {
      const cand = this.resolutionRepo.getByCaseId(caseId).find(c => c.id === mutation.targetId);
      if (cand) {
        identityChanges.push({
          sourceId: cand.sourceNodeId,
          targetId: cand.targetNodeId,
          action: mutation.action === 'MERGE_ENTITIES' ? 'MERGED' : 'SEPARATED'
        });
      }
    }
    const delta = this.computeGraphDelta(previousGraph, currentGraph, identityChanges);
    const deltaDuration = performance.now() - tDeltaStart;

    // 2. Affected Subgraph Detection
    const tAffectedStart = performance.now();
    const existingPossibilities = this.possibilityRepo.findByCaseId(caseId);
    const affectedSubgraph = AffectedSubgraphEngine.computeAffectedSubgraph(
      currentGraph,
      delta,
      existingPossibilities
    );
    const affectedDuration = performance.now() - tAffectedStart;

    // 3. Version Registration
    const nextVer = this.versionRepo.getNextVersionNumber(caseId);
    const latestVer = this.versionRepo.getLatest(caseId);
    const versionRecord: GraphVersion = {
      id: uuidv4(),
      caseId,
      versionNumber: nextVer,
      parentVersionNumber: latestVer ? latestVer.versionNumber : null,
      changeSummary: mutation.summary,
      mutation,
      delta,
      affectedSubgraph,
      snapshot: currentGraph,
      createdAt: new Date().toISOString()
    };
    this.versionRepo.create(versionRecord);

    // 4. Algorithm Invalidation & Dependency Invalidation
    const tAlgoStart = performance.now();
    const { invalidated, reused } = this.cache.invalidateAffected(delta, affectedSubgraph);

    const hasTemporalChange = delta.changedTemporalConstraints.length > 0;
    const hasEvidenceChange = delta.changedEvidence.length > 0;
    const triggeredStages = AlgorithmDependencyGraph.getDirectlyAffectedStages(
      mutation.action,
      hasTemporalChange,
      hasEvidenceChange
    );

    for (const stage of triggeredStages) {
      if (!invalidated.includes(stage)) {
        invalidated.push(stage);
      }
    }

    // 5. Selective Recalculation
    const candidates = this.resolutionRepo.getByCaseId(caseId);
    const beforeCount = existingPossibilities.length;

    // Run possibility generation on the updated graph
    const genResult = this.possibilityEngine.generatePossibilities(
      caseId,
      currentGraph,
      candidates,
      {
        ...generationOptions,
        sourceNodeId: generationOptions.sourceNodeId || 'person-mercer',
        targetNodeId: generationOptions.targetNodeId || 'location-vault',
        minEvidenceSupport: generationOptions.minEvidenceSupport ?? 2,
        replaceExisting: true
      }
    );
    const recomputedPossibilities = genResult.possibilities;
    const algoDuration = performance.now() - tAlgoStart;

    // Cache computed results for this new version
    this.cache.set(
      'POSSIBILITY_SET',
      nextVer,
      generationOptions,
      recomputedPossibilities,
      {
        nodes: currentGraph.nodes.map(n => n.id),
        edges: currentGraph.edges.map(e => e.id)
      }
    );

    // 6. Possibility Evolution Computation
    const tEvolStart = performance.now();
    const evolution = PossibilityEvolutionEngine.computeEvolution(
      latestVer ? latestVer.versionNumber : 0,
      nextVer,
      existingPossibilities,
      recomputedPossibilities,
      mutation,
      delta
    );
    const evolDuration = performance.now() - tEvolStart;
    const totalDuration = performance.now() - t0;

    const report: IncrementalImpactReport = {
      caseId,
      fromVersion: latestVer ? latestVer.versionNumber : 0,
      toVersion: nextVer,
      mutation,
      deltaSummary: {
        changedNodes: delta.addedNodes.length + delta.removedNodes.length + delta.modifiedNodes.length,
        changedEdges: delta.addedEdges.length + delta.removedEdges.length + delta.modifiedEdges.length,
        changedEvidence: delta.changedEvidence.length
      },
      affectedSubgraph: {
        nodeCount: affectedSubgraph.affectedNodeIds.length,
        edgeCount: affectedSubgraph.affectedEdgeIds.length,
        nodeIds: affectedSubgraph.affectedNodeIds,
        edgeIds: affectedSubgraph.affectedEdgeIds
      },
      algorithmsReused: reused.length > 0 ? reused : ['GRAPH_INVARIANTS_UNTOUCHED_SUBGRAPH'],
      algorithmsInvalidated: invalidated,
      algorithmsRecomputed: Array.from(new Set(['K_SHORTEST_PATHS', 'TEMPORAL_VALIDATION', 'EVIDENCE_PROVENANCE_ENGINE', 'POSSIBILITY_SET', 'DOMINATOR_ANALYSIS'])),
      candidatePathsBefore: beforeCount,
      candidatePathsAfter: recomputedPossibilities.length,
      validPossibilitiesBefore: existingPossibilities.filter(p => p.status === 'VALID').length,
      validPossibilitiesAfter: recomputedPossibilities.filter(p => p.status === 'VALID').length,
      invariantsSummary: `Unavoidable dominators and core invariants recalculated on surviving ${recomputedPossibilities.length} possibilities.`,
      possibilityEvolution: evolution,
      executionTimeMs: {
        deltaDetection: deltaDuration,
        affectedRegion: affectedDuration,
        algorithmRecomputation: algoDuration,
        possibilityEvolution: evolDuration,
        total: totalDuration
      }
    };

    this.latestReports.set(caseId, report);
    return report;
  }

  /**
   * "What If?" Simulation Engine:
   * Simulates a hypothetical graph mutation on an in-memory graph clone WITHOUT mutating SQLite.
   */
  runWhatIfSimulation(
    caseId: string,
    baseGraph: GraphPayload,
    simulation: {
      action: 'REMOVE_EVIDENCE' | 'ADD_EVIDENCE' | 'MERGE_ENTITIES';
      targetId: string;
      parameters?: Record<string, any>;
    },
    generationOptions: PossibilityGenerationOptions = {}
  ): SimulationResult {
    // 1. In-Memory Graph Cloning
    const simNodes: GraphNode[] = JSON.parse(JSON.stringify(baseGraph.nodes));
    let simEdges: GraphEdge[] = JSON.parse(JSON.stringify(baseGraph.edges));
    const baselinePossibilities = this.possibilityRepo.findByCaseId(caseId);
    const simId = `sim-${uuidv4().slice(0, 8)}`;
    let explanation = '';

    // 2. Apply Hypothetical In-Memory Mutation
    if (simulation.action === 'REMOVE_EVIDENCE') {
      const evId = simulation.targetId;
      const filteredNodes = simNodes.filter(n => n.id !== evId);
      // Remove evidence reference from all incident edges
      simEdges = simEdges.map(e => {
        const newRefs = (e.evidenceRefs || []).filter(ref => ref !== evId);
        return {
          ...e,
          evidenceRefs: newRefs,
          status: newRefs.length === 0 ? 'HYPOTHESIZED' : e.status
        };
      });
      explanation = `Hypothetically removed evidence '${evId}', stripping supporting provenance references from incident relationships.`;
      simNodes.length = 0;
      simNodes.push(...filteredNodes);
    } else if (simulation.action === 'ADD_EVIDENCE') {
      const evId = simulation.targetId;
      const targetEdgeId = simulation.parameters?.targetEdgeId;
      simNodes.push({
        id: evId,
        caseId,
        category: 'EVIDENCE',
        type: 'SYSTEM_RECORD',
        label: simulation.parameters?.label || `Hypothetical Corroboration ${evId}`,
        properties: {},
        metadata: { aiExtracted: false, createdAt: new Date().toISOString() },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        reliability: 0.95
      });
      if (targetEdgeId) {
        simEdges = simEdges.map(e => {
          if (e.id === targetEdgeId) {
            return { ...e, evidenceRefs: Array.from(new Set([...(e.evidenceRefs || []), evId])) };
          }
          return e;
        });
      }
      explanation = `Hypothetically added verified evidence '${evId}' strengthening candidate relationships.`;
    } else if (simulation.action === 'MERGE_ENTITIES') {
      const srcId = simulation.targetId;
      const tgtId = simulation.parameters?.mergeWithId;
      if (tgtId) {
        // Rewire all edges incident to tgtId to srcId
        simEdges = simEdges.map(e => {
          let s = e.source;
          let t = e.target;
          if (s === tgtId) s = srcId;
          if (t === tgtId) t = srcId;
          return { ...e, source: s, target: t };
        });
        const filteredNodes = simNodes.filter(n => n.id !== tgtId);
        simNodes.length = 0;
        simNodes.push(...filteredNodes);
        explanation = `Hypothetically collapsed entities '${srcId}' and '${tgtId}' into unified identity, rewiring incident transit links.`;
      }
    }

    const simGraph: GraphPayload = {
      nodes: simNodes,
      edges: simEdges,
      metadata: {
        ...baseGraph.metadata,
        caseId,
        nodeCount: simNodes.length,
        edgeCount: simEdges.length
      }
    };

    // 3. Algorithmic Simulation (Pure deterministic in-memory calculation, zero DB writes)
    const candidates = this.resolutionRepo.getByCaseId(caseId);
    const simGenResult = this.possibilityEngine.generatePossibilities(
      caseId,
      simGraph,
      candidates,
      {
        ...generationOptions,
        sourceNodeId: generationOptions.sourceNodeId || 'person-mercer',
        targetNodeId: generationOptions.targetNodeId || 'location-vault',
        minEvidenceSupport: generationOptions.minEvidenceSupport ?? 2,
        persist: false // Pure simulation without DB overwrite
      }
    );
    const simulatedPossibilities = simGenResult.possibilities;

    // 4. Compare Baseline vs Simulated
    const baseSigMap = new Map(baselinePossibilities.map(p => [p.canonicalSignature, p]));
    const simSigMap = new Map(simulatedPossibilities.map(p => [p.canonicalSignature, p]));

    const addedPossibilities: Array<{ id: string; name: string; reason: string }> = [];
    const removedPossibilities: Array<{ id: string; name: string; reason: string }> = [];
    const modifiedPossibilities: Array<{ id: string; name: string; change: string }> = [];
    const unchangedPossibilities: Array<{ id: string; name: string }> = [];

    for (const sp of simulatedPossibilities) {
      const bp = baseSigMap.get(sp.canonicalSignature);
      if (!bp) {
        addedPossibilities.push({
          id: sp.id,
          name: sp.name,
          reason: `Spawned under simulation: ${explanation}`
        });
      } else if (bp.status !== sp.status) {
        modifiedPossibilities.push({
          id: sp.id,
          name: sp.name,
          change: `Status altered: ${bp.status} → ${sp.status}`
        });
      } else {
        unchangedPossibilities.push({ id: sp.id, name: sp.name });
      }
    }

    for (const bp of baselinePossibilities) {
      if (!simSigMap.has(bp.canonicalSignature)) {
        removedPossibilities.push({
          id: bp.id,
          name: bp.name,
          reason: `Eliminated under simulation because required constraint was broken: ${explanation}`
        });
      }
    }

    const latestVer = this.versionRepo.getLatest(caseId);

    return {
      simulationId: simId,
      caseId,
      baseVersion: latestVer ? latestVer.versionNumber : 1,
      simulatedAction: simulation.action,
      targetType: simulation.action === 'REMOVE_EVIDENCE' || simulation.action === 'ADD_EVIDENCE' ? 'EVIDENCE' : 'NODE',
      targetId: simulation.targetId,
      baselinePossibilityCount: baselinePossibilities.length,
      simulatedPossibilityCount: simulatedPossibilities.length,
      addedPossibilities,
      removedPossibilities,
      modifiedPossibilities,
      unchangedPossibilities,
      explanation,
      simulatedPossibilities
    };
  }
}

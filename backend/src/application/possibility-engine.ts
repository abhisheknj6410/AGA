import { createHash } from 'node:crypto';
import { GraphPayload, GraphNode, GraphEdge, ResolutionCandidate } from '../domain/types.js';
import {
  Possibility,
  PossibilityStatus,
  PossibilityGenerationMethod,
  GraphDelta,
  PossibilityGenerationOptions,
  PossibilityComparison
} from '../domain/possibility-types.js';
import { PossibilityRepository } from '../infrastructure/repositories/possibility-repository.js';
import { GraphAnalysisEngine } from './graph-analysis-engine.js';
import { KShortestPathsAlgorithm } from '../domain/algorithms/k-shortest-paths.js';
import { TemporalAnalysisAlgorithm } from '../domain/algorithms/temporal-analysis.js';
import { PossibilityConstraintEngine } from './possibility-constraint-engine.js';
import { PossibilityDifferentiatingEngine } from './possibility-differentiating-engine.js';

export class PossibilityEngine {
  constructor(
    private possibilityRepo: PossibilityRepository,
    private analysisEngine: GraphAnalysisEngine
  ) {}

  /**
   * Generates bounded, deterministic graph possibilities for a case based on:
   * 1. Alternative Paths (K-Shortest Paths between suspects and targets)
   * 2. Entity Resolution Branching (Same Entity vs Different Entities)
   * 3. Contradiction Branching (Conflicting evidence resolutions)
   * 4. Temporal Ambiguity Branching (Underdetermined event sequences)
   */
  generatePossibilities(
    caseId: string,
    baseGraph: GraphPayload,
    resolutionCandidates: ResolutionCandidate[] = [],
    options: PossibilityGenerationOptions = {}
  ): {
    generatedCount: number;
    survivingCount: number;
    truncated: boolean;
    possibilities: Possibility[];
  } {
    const maxPossibilities = options.maxPossibilities ?? 20;
    const baseVersion = this.possibilityRepo.getLatestVersion(caseId);
    const existingPossibilities = this.possibilityRepo.findByCaseId(caseId);
    const seenSignatures = new Set<string>(existingPossibilities.map(p => p.canonicalSignature));

    const candidates: Array<Omit<Possibility, 'id' | 'createdAt' | 'updatedAt'>> = [];

    // Identify primary actors and targets domain-independently using graph topology
    // Sources: entities with high out-degree / low in-degree (actors, origins)
    // Sinks: entities with high in-degree / low out-degree (targets, impacts, assets)
    const entityNodes = baseGraph.nodes.filter(n => n.category === 'ENTITY');
    const inDegrees = new Map<string, number>();
    const outDegrees = new Map<string, number>();
    for (const e of baseGraph.edges) {
      outDegrees.set(e.source, (outDegrees.get(e.source) || 0) + 1);
      inDegrees.set(e.target, (inDegrees.get(e.target) || 0) + 1);
    }

    const candidateSources = [...entityNodes].sort((a, b) => {
      const aScore = (outDegrees.get(a.id) || 0) - (inDegrees.get(a.id) || 0);
      const bScore = (outDegrees.get(b.id) || 0) - (inDegrees.get(b.id) || 0);
      return bScore - aScore;
    });

    const candidateTargets = [...entityNodes].sort((a, b) => {
      const aScore = (inDegrees.get(a.id) || 0) - (outDegrees.get(a.id) || 0);
      const bScore = (inDegrees.get(b.id) || 0) - (outDegrees.get(b.id) || 0);
      return bScore - aScore;
    });

    const sourceId = options.sourceNodeId || candidateSources[0]?.id;
    const targetId = options.targetNodeId || candidateTargets.find(t => t.id !== sourceId)?.id;

    // --- 1. Alternative Graph Paths Generation ---
    if (options.includeAlternativePaths !== false && sourceId && targetId && sourceId !== targetId) {
      const kPaths = KShortestPathsAlgorithm.findKShortestPaths(baseGraph.nodes, baseGraph.edges, sourceId, targetId, 6);

      kPaths.paths.forEach((path, idx) => {
        const pathEdges = baseGraph.edges.filter(e => path.edgeIds.includes(e.id));

        // Causal Algorithm Filtering: Validate chronological order and evidence support
        const pathValidation = PossibilityConstraintEngine.isPathValid(
          path.nodes,
          pathEdges,
          options.minEvidenceSupport ?? 0
        );

        if (!pathValidation.valid) {
          // Path eliminated causally by constraint algorithm
          return;
        }

        const evidenceRefs = new Set<string>();
        for (const e of pathEdges) {
          for (const ev of e.evidenceRefs || []) {
            evidenceRefs.add(ev);
          }
        }

        const delta: GraphDelta = {
          addedNodes: [],
          removedNodeIds: [],
          modifiedNodes: [],
          addedEdges: [],
          removedEdgeIds: [],
          modifiedEdges: []
        };

        const signature = this.computeSignature('ALT_PATH', idx, path.nodeIds);
        if (!seenSignatures.has(signature)) {
          seenSignatures.add(signature);
          candidates.push({
            caseId,
            name: `Route Possibility #${idx + 1}: ${path.nodes[0]?.label} → ${path.nodes[path.nodes.length - 1]?.label}`,
            description: `Alternative evidence corridor via ${path.nodeIds.length - 2} intermediaries with total investigative cost ${path.totalCost}.`,
            baseGraphVersion: baseVersion,
            status: 'VALID',
            generationMethod: 'ALTERNATIVE_PATHS',
            assumptions: [
              `Path relies on sequence: ${path.nodes.map(n => n.label).join(' → ')}`,
              `Traverses ${path.edgeIds.length} directed relationships`
            ],
            graphChanges: delta,
            constraints: { maxCost: path.totalCost, pathLength: path.nodeIds.length },
            supportingEvidence: Array.from(evidenceRefs),
            conflictingEvidence: [],
            unresolvedQuestions: path.nodes.length > 4 ? ['Are all intermediate hops direct causal actions?'] : [],
            canonicalSignature: signature
          });
        }
      });
    }

    // --- 2. Entity Resolution Branching ---
    if (options.includeEntityResolution !== false && resolutionCandidates.length > 0) {
      for (const rc of resolutionCandidates) {
        if (rc.status === 'PENDING') {
          const sourceNode = baseGraph.nodes.find(n => n.id === rc.sourceNodeId);
          const targetNode = baseGraph.nodes.find(n => n.id === rc.targetNodeId);
          if (!sourceNode || !targetNode) continue;

          // Branch A: Entities Merged (Identical identity)
          const mergedDelta: GraphDelta = {
            addedNodes: [],
            removedNodeIds: [],
            modifiedNodes: [],
            addedEdges: [],
            removedEdgeIds: [],
            modifiedEdges: [],
            entityResolutionMerges: [
              {
                survivingNodeId: sourceNode.id,
                mergedNodeId: targetNode.id,
                rewiredEdgeCount: baseGraph.edges.filter(e => e.source === targetNode.id || e.target === targetNode.id).length
              }
            ]
          };
          const sigA = this.computeSignature('ER_MERGE', rc.id, [sourceNode.id, targetNode.id]);
          if (!seenSignatures.has(sigA)) {
            seenSignatures.add(sigA);
            candidates.push({
              caseId,
              name: `Unified Identity: '${sourceNode.label}' == '${targetNode.label}'`,
              description: `Hypothesis that ${sourceNode.label} and ${targetNode.label} represent the same physical person/principal (${rc.reason}).`,
              baseGraphVersion: baseVersion,
              status: 'CONDITIONAL',
              generationMethod: 'ENTITY_RESOLUTION',
              assumptions: [
                `Assume '${sourceNode.label}' and '${targetNode.label}' are the exact same entity.`,
                `All actions and sessions performed by '${targetNode.label}' are attributed to '${sourceNode.label}'.`
              ],
              graphChanges: mergedDelta,
              constraints: { resolutionCandidateId: rc.id, assumedMatch: true },
              supportingEvidence: [],
              conflictingEvidence: [],
              unresolvedQuestions: [`Requires formal confirmation of shared credentials or physical verification.`],
              canonicalSignature: sigA
            });
          }

          // Branch B: Entities Distinct (Different individuals)
          const distinctDelta: GraphDelta = {
            addedNodes: [],
            removedNodeIds: [],
            modifiedNodes: [],
            addedEdges: [],
            removedEdgeIds: [],
            modifiedEdges: []
          };
          const sigB = this.computeSignature('ER_DISTINCT', rc.id, [sourceNode.id, targetNode.id]);
          if (!seenSignatures.has(sigB)) {
            seenSignatures.add(sigB);
            candidates.push({
              caseId,
              name: `Separate Identities: '${sourceNode.label}' != '${targetNode.label}'`,
              description: `Hypothesis that ${sourceNode.label} and ${targetNode.label} are distinct parties with independent actions.`,
              baseGraphVersion: baseVersion,
              status: 'VALID',
              generationMethod: 'ENTITY_RESOLUTION',
              assumptions: [
                `'${sourceNode.label}' and '${targetNode.label}' operate as separate entities without shared culpability.`
              ],
              graphChanges: distinctDelta,
              constraints: { resolutionCandidateId: rc.id, assumedMatch: false },
              supportingEvidence: [],
              conflictingEvidence: [],
              unresolvedQuestions: [],
              canonicalSignature: sigB
            });
          }
        }
      }
    }

    // --- 3. Contradiction & Evidence Conflict Branching ---
    if (options.includeContradictionBranches !== false) {
      const contradictionEdges = baseGraph.edges.filter(e => e.type === 'CONTRADICTS');
      for (const ce of contradictionEdges) {
        const sourceEvidence = baseGraph.nodes.find(n => n.id === ce.source);
        const targetNode = baseGraph.nodes.find(n => n.id === ce.target);

        if (sourceEvidence && targetNode) {
          // Branch 1: Alternative Actor / Proxy Execution
          const sigC1 = this.computeSignature('CONTRADICT_PROXY', ce.id, [ce.source, ce.target]);
          if (!seenSignatures.has(sigC1)) {
            seenSignatures.add(sigC1);
            candidates.push({
              caseId,
              name: `Proxy Execution Hypothesis (${targetNode.label})`,
              description: `Primary evidence '${sourceEvidence.label}' contradicts target fact '${targetNode.label}'. Indicates proxy execution, impersonation, or secondary intermediary while primary subject was elsewhere.`,
              baseGraphVersion: baseVersion,
              status: 'VALID',
              generationMethod: 'CONTRADICTION_BRANCHING',
              assumptions: [
                `Evidence '${sourceEvidence.label}' is factually verified.`,
                `Target activity '${targetNode.label}' was executed by an unauthorized third party or automated agent.`
              ],
              graphChanges: {
                addedNodes: [],
                removedNodeIds: [],
                modifiedNodes: [],
                addedEdges: [],
                removedEdgeIds: [],
                modifiedEdges: []
              },
              constraints: { conflictingEdgeId: ce.id, privilegedEvidenceId: sourceEvidence.id },
              supportingEvidence: [sourceEvidence.id],
              conflictingEvidence: [targetNode.id],
              unresolvedQuestions: [`What intermediary had physical or operational capability at that time?`],
              canonicalSignature: sigC1
            });
          }

          // Branch 2: Direct Execution with Contradicted Record
          const sigC2 = this.computeSignature('CONTRADICT_DIRECT', ce.id, [ce.source, ce.target]);
          if (!seenSignatures.has(sigC2)) {
            seenSignatures.add(sigC2);
            candidates.push({
              caseId,
              name: `Direct Attribution with Conflicting Record`,
              description: `Attributes actions directly to primary entity while acknowledging conflicting evidence '${sourceEvidence.label}'.`,
              baseGraphVersion: baseVersion,
              status: 'CONFLICTING',
              generationMethod: 'CONTRADICTION_BRANCHING',
              assumptions: [
                `Assumes target activity was directly executed by subject entity.`,
                `Requires evidence '${sourceEvidence.label}' to be dismissed, forged, or mis-calibrated.`
              ],
              graphChanges: {
                addedNodes: [],
                removedNodeIds: [],
                modifiedNodes: [],
                addedEdges: [],
                removedEdgeIds: [],
                modifiedEdges: []
              },
              constraints: { conflictingEdgeId: ce.id, dismissedEvidenceId: sourceEvidence.id },
              supportingEvidence: [],
              conflictingEvidence: [sourceEvidence.id],
              unresolvedQuestions: [`Why does observational evidence contradict the recorded event?`],
              canonicalSignature: sigC2
            });
          }
        }
      }
    }

    // --- 4. Temporal Ambiguity Branching ---
    if (options.includeTemporalBranches !== false) {
      const ambiguities = TemporalAnalysisAlgorithm.detectAmbiguities(baseGraph.nodes, baseGraph.edges);
      for (let i = 0; i < Math.min(2, ambiguities.underdeterminedPairs.length); i++) {
        const pair = ambiguities.underdeterminedPairs[i];
        const sigT = this.computeSignature('TEMPORAL_ORDER', i, [pair.eventA.id, pair.eventB.id]);
        if (!seenSignatures.has(sigT)) {
          seenSignatures.add(sigT);
          candidates.push({
            caseId,
            name: `Temporal Sequence: '${pair.eventA.label}' precedes '${pair.eventB.label}'`,
            description: `Resolves underdetermined ordering between parallel prerequisites for '${pair.commonSuccessor.label}'.`,
            baseGraphVersion: baseVersion,
            status: 'VALID',
            generationMethod: 'TEMPORAL_ORDERING',
            assumptions: [
              `Assumes '${pair.eventA.label}' completed before '${pair.eventB.label}' initiated.`
            ],
            graphChanges: {
              addedNodes: [],
              removedNodeIds: [],
              modifiedNodes: [],
              addedEdges: [
                {
                  id: `temporal-hyp-${pair.eventA.id}-${pair.eventB.id}`,
                  caseId,
                  source: pair.eventA.id,
                  target: pair.eventB.id,
                  type: 'PRECEDED',
                  status: 'HYPOTHESIZED',
                  cost: 1.0,
                  confidence: 0.5,
                  evidenceRefs: [],
                  properties: { inferred: true },
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString()
                }
              ],
              removedEdgeIds: [],
              modifiedEdges: []
            },
            constraints: { successorId: pair.commonSuccessor.id },
            supportingEvidence: [],
            conflictingEvidence: [],
            unresolvedQuestions: [`Can network logs establish millisecond sequencing between these two events?`],
            canonicalSignature: sigT
          });
        }
      }
    }

    // Bounded search check
    const truncated = candidates.length > maxPossibilities;
    const boundedCandidates = candidates.slice(0, maxPossibilities);

    // Persist and run analytical evaluation on each surviving possibility
    const createdPossibilities: Possibility[] = [];
    for (const c of boundedCandidates) {
      // Apply delta to base graph to evaluate possibility validity
      const possibilityGraph = GraphAnalysisEngine.applyDelta(baseGraph, c.graphChanges);

      // Central Constraint Engine evaluation: checks causality, cycles, evidence, and directions
      const constraintEval = PossibilityConstraintEngine.evaluateGraph(possibilityGraph);

      const analysisResults = this.analysisEngine.runFullPossibilityAnalysis(
        possibilityGraph,
        caseId,
        undefined,
        sourceId,
        targetId
      );

      // Status is deterministically assigned by the constraint engine
      const status: PossibilityStatus = constraintEval.status;

      const p = this.possibilityRepo.createPossibility({
        ...c,
        status,
        algorithmResults: {
          ...analysisResults,
          constraintEvaluation: constraintEval
        }
      });
      createdPossibilities.push(p);
    }

    return {
      generatedCount: candidates.length,
      survivingCount: createdPossibilities.length,
      truncated,
      possibilities: [...existingPossibilities, ...createdPossibilities]
    };
  }

  /**
   * Compares 2 to 5 possibilities side-by-side.
   * Produces deterministic factual metrics without AI hallucinations.
   */
  comparePossibilities(
    caseId: string,
    possibilityIds: string[],
    baseGraph: GraphPayload
  ): PossibilityComparison {
    const allPossibilities = this.possibilityRepo.findByCaseId(caseId);
    const selected = allPossibilities.filter(p => possibilityIds.includes(p.id));

    const comparedPossibilities: PossibilityComparison['possibilities'] = [];
    const nodeOccurrences = new Map<string, Set<string>>();
    const edgeOccurrences = new Map<string, Set<string>>();
    const evidenceOccurrences = new Map<string, Set<string>>();

    for (const p of selected) {
      const pGraph = GraphAnalysisEngine.applyDelta(baseGraph, p.graphChanges);
      const results = (p.algorithmResults as any) || {};

      for (const n of pGraph.nodes) {
        if (!nodeOccurrences.has(n.id)) nodeOccurrences.set(n.id, new Set());
        nodeOccurrences.get(n.id)!.add(p.id);
      }

      for (const e of pGraph.edges) {
        const key = `${e.source}==${e.target}==${e.type}`;
        if (!edgeOccurrences.has(key)) edgeOccurrences.set(key, new Set());
        edgeOccurrences.get(key)!.add(p.id);
      }

      for (const ev of p.supportingEvidence) {
        if (!evidenceOccurrences.has(ev)) evidenceOccurrences.set(ev, new Set());
        evidenceOccurrences.get(ev)!.add(p.id);
      }

      comparedPossibilities.push({
        id: p.id,
        name: p.name,
        status: p.status,
        generationMethod: p.generationMethod,
        temporalValidity: (results.temporalValidity as any) || 'VALID',
        evidenceSupportCount: p.supportingEvidence.length,
        conflictingEvidenceCount: p.conflictingEvidence.length,
        assumptionCount: p.assumptions.length,
        independentPathCount: results.independentCorroboration?.independentCorroborationCount,
        criticalNodeCount: results.criticalNodes?.length,
        pathCost: results.shortestPath?.totalCost,
        unresolvedQuestionsCount: p.unresolvedQuestions.length
      });
    }

    const totalSelected = selected.length;
    const commonNodes: string[] = [];
    const distinguishingNodes: Record<string, string[]> = {};

    for (const [nid, pSet] of nodeOccurrences.entries()) {
      if (pSet.size === totalSelected) {
        commonNodes.push(nid);
      } else {
        for (const pid of pSet) {
          if (!distinguishingNodes[pid]) distinguishingNodes[pid] = [];
          distinguishingNodes[pid].push(nid);
        }
      }
    }

    const commonEdges: Array<{ source: string; target: string; type: string }> = [];
    const distinguishingEdges: Record<string, Array<{ source: string; target: string; type: string }>> = {};

    for (const [key, pSet] of edgeOccurrences.entries()) {
      const [source, target, type] = key.split('==');
      if (pSet.size === totalSelected) {
        commonEdges.push({ source, target, type });
      } else {
        for (const pid of pSet) {
          if (!distinguishingEdges[pid]) distinguishingEdges[pid] = [];
          distinguishingEdges[pid].push({ source, target, type });
        }
      }
    }

    const commonEvidence: string[] = [];
    const distinguishingEvidence: Record<string, string[]> = {};

    for (const [ev, pSet] of evidenceOccurrences.entries()) {
      if (pSet.size === totalSelected) {
        commonEvidence.push(ev);
      } else {
        for (const pid of pSet) {
          if (!distinguishingEvidence[pid]) distinguishingEvidence[pid] = [];
          distinguishingEvidence[pid].push(ev);
        }
      }
    }

    const comparison: PossibilityComparison = {
      caseId,
      comparedAt: new Date().toISOString(),
      possibilities: comparedPossibilities,
      structuralDiff: {
        commonNodes,
        distinguishingNodes,
        commonEdges,
        distinguishingEdges,
        commonEvidence,
        distinguishingEvidence
      }
    };

    comparison.resolvingRecommendations = PossibilityDifferentiatingEngine.identifyResolvingEvidence(
      comparison,
      baseGraph
    );

    return comparison;
  }

  private computeSignature(prefix: string, identifier: string | number, items: string[]): string {
    const raw = `${prefix}:${identifier}:${items.sort().join(',')}`;
    return createHash('sha256').update(raw).digest('hex').slice(0, 16);
  }
}

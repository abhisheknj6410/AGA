import { GraphPayload, GraphNode } from '../domain/types.js';
import { PossibilityRepository } from '../infrastructure/repositories/possibility-repository.js';
import { GraphAnalysisEngine } from './graph-analysis-engine.js';
import { PossibilityEngine } from './possibility-engine.js';
import { PossibilityDifferentiatingEngine } from './possibility-differentiating-engine.js';

export interface AgentQueryResult {
  query: string;
  intent: string;
  matchedEntityIds?: string[];
  matchedPossibilityIds?: string[];
  algorithmUsed?: string;
  factualAnswer: string;
  structuredData: Record<string, unknown>;
  suggestedFollowUps: string[];
}

export class InvestigationAgentService {
  constructor(
    private possibilityRepo: PossibilityRepository,
    private analysisEngine: GraphAnalysisEngine,
    private possibilityEngine: PossibilityEngine
  ) {}

  /**
   * Processes natural language investigative inquiries deterministically against the graph & possibility space.
   */
  async processQuery(
    caseId: string,
    baseGraph: GraphPayload,
    query: string
  ): Promise<AgentQueryResult> {
    const q = query.trim().toLowerCase();
    const possibilities = this.possibilityRepo.findByCaseId(caseId);
    const nodeMap = new Map<string, GraphNode>(baseGraph.nodes.map(n => [n.id, n]));

    // Find mentioned nodes in query
    const mentionedNodes = baseGraph.nodes.filter(n =>
      q.includes(n.label.toLowerCase()) || q.includes(n.id.toLowerCase())
    );

    // Find mentioned possibilities in query
    const mentionedPossibilities = possibilities.filter(p => {
      const pName = p.name.toLowerCase();
      const pId = p.id.toLowerCase();
      return q.includes(pId) || q.includes(pName) || (q.includes('p1') && pName.includes('#1')) || (q.includes('p2') && pName.includes('#2')) || (q.includes('p3') && pName.includes('#3'));
    });

    // 1. "Why does P exist?" / Possibility Provenance
    if (q.includes('why') && q.includes('exist')) {
      const p = mentionedPossibilities[0] || possibilities[0];
      if (!p) {
        return this.fallbackAnswer(query, 'No possibilities have been generated yet for this case.');
      }

      return {
        query,
        intent: 'POSSIBILITY_PROVENANCE',
        matchedPossibilityIds: [p.id],
        factualAnswer: `Possibility '${p.name}' was deterministically generated via method: ${p.generationMethod}.\n\n` +
          `• Assumptions: ${p.assumptions.join('; ') || 'None'}\n` +
          `• Supporting Evidence: ${p.supportingEvidence.map(id => nodeMap.get(id)?.label || id).join(', ') || 'None'}\n` +
          `• Conflicting Evidence: ${p.conflictingEvidence.map(id => nodeMap.get(id)?.label || id).join(', ') || 'None'}\n` +
          `• Status: ${p.status}`,
        structuredData: { possibility: p },
        suggestedFollowUps: [
          'What do all surviving possibilities have in common?',
          'What structurally distinguishes the possibilities?'
        ]
      };
    }

    // 2. "Which possibilities are temporally invalid?" / Temporal filter
    if (q.includes('temporally invalid') || q.includes('invalid possibilities')) {
      const invalid = possibilities.filter(p => p.status === 'INVALID' || (p.algorithmResults as any)?.temporalValidity === 'INVALID');
      return {
        query,
        intent: 'TEMPORAL_VALIDITY_FILTER',
        algorithmUsed: 'TOPOLOGICAL_SORT_&_TEMPORAL_VALIDATION',
        factualAnswer: invalid.length > 0
          ? `Found ${invalid.length} temporally invalid possibility branch(es):\n` +
            invalid.map(p => `• ${p.name}: Contains causal cycles or chronological timestamp inversions.`).join('\n')
          : `All ${possibilities.length} current possibilities satisfy temporal monotonicity and acyclic event execution flows.`,
        structuredData: { invalidPossibilityIds: invalid.map(p => p.id) },
        suggestedFollowUps: [
          'Show all valid connections between entities',
          'What do all surviving possibilities have in common?'
        ]
      };
    }

    // 3. "What makes P invalid?" / "Why is P invalid?"
    if ((q.includes('invalid') || q.includes('why')) && (q.includes('fail') || q.includes('violate') || q.includes('what makes') || q.includes('why is'))) {
      const targetP = mentionedPossibilities[0] || possibilities.find(p => p.status === 'INVALID');
      if (targetP) {
        const evalData = (targetP.algorithmResults as any)?.constraintEvaluation;
        const violations = evalData?.violations || [];
        const temporalViolations = evalData?.temporalViolations || [];

        const violationText = violations.length > 0
          ? violations.map((v: string) => `• ${v}`).join('\n')
          : `• Temporal causality violation: Path chronology or acyclic ordering failed.`;

        return {
          query,
          intent: 'EXPLAIN_INVALID_POSSIBILITY',
          matchedPossibilityIds: [targetP.id],
          algorithmUsed: 'POSSIBILITY_CONSTRAINT_ENGINE & TEMPORAL_ANALYSIS',
          factualAnswer: `Possibility '${targetP.name}' is marked INVALID due to ${violations.length || 1} structural constraint violation(s):\n\n${violationText}`,
          structuredData: { possibilityId: targetP.id, violations, temporalViolations },
          suggestedFollowUps: [
            'What do all surviving possibilities have in common?',
            'Show all valid paths between source and target.'
          ]
        };
      }
    }

    // 2. "What do all surviving possibilities have in common?" / Common Invariants
    if (q.includes('common') || q.includes('in common') || q.includes('invariant') || q.includes('universal')) {
      const validPossibilities = possibilities.filter(p => p.status === 'VALID' || p.status === 'CONDITIONAL');
      if (validPossibilities.length === 0) {
        return this.fallbackAnswer(query, 'No valid surviving possibilities exist.');
      }

      const invariants = PossibilityDifferentiatingEngine.extractCommonInvariants(baseGraph, validPossibilities);
      const commonNodeNames = invariants.commonNodes.map(n => `• ${n.label} (${n.type})`).join('\n');
      const commonEdgeText = invariants.commonEdges.map(e => `• ${nodeMap.get(e.source)?.label || e.source} -[${e.type}]-> ${nodeMap.get(e.target)?.label || e.target}`).join('\n');

      return {
        query,
        intent: 'COMMON_INVARIANTS_ANALYSIS',
        algorithmUsed: 'GRAPH_INTERSECTION_OVER_POSSIBILITY_SPACE',
        factualAnswer: `Structural intersection across all ${validPossibilities.length} surviving possibilities reveals universal invariants:\n\n` +
          `Common Nodes (${invariants.commonNodes.length}):\n${commonNodeNames || 'None'}\n\n` +
          `Common Directed Links (${invariants.commonEdges.length}):\n${commonEdgeText || 'None'}\n\n` +
          `Common Evidence Items: ${invariants.commonEvidenceRefs.length} item(s) shared across all branches.`,
        structuredData: { invariants },
        suggestedFollowUps: [
          'What structurally distinguishes the possibilities?',
          'Which nodes are unavoidable across all valid paths?'
        ]
      };
    }

    // 3. "What structurally distinguishes P1 and P2?" / Distinguishing differences
    if (q.includes('distinguish') || q.includes('different') || q.includes('versus') || q.includes('vs')) {
      const pToCompare = mentionedPossibilities.length >= 2 ? mentionedPossibilities.slice(0, 5) : possibilities.slice(0, 3);
      if (pToCompare.length < 2) {
        return this.fallbackAnswer(query, 'At least 2 possibilities are required to compute distinguishing differences.');
      }

      const comparison = this.possibilityEngine.comparePossibilities(
        caseId,
        pToCompare.map(p => p.id),
        baseGraph
      );

      const diffText = pToCompare.map(p => {
        const uniqueEdges = comparison.structuralDiff.distinguishingEdges[p.id] || [];
        const uniqueEv = comparison.structuralDiff.distinguishingEvidence[p.id] || [];
        return `• ${p.name}:\n  - ${uniqueEdges.length} unique relationship(s)\n  - ${uniqueEv.length} unique supporting evidence item(s)`;
      }).join('\n\n');

      const recText = comparison.resolvingRecommendations && comparison.resolvingRecommendations.length > 0
        ? `\n\nKey Resolving Evidence Recommendation:\n• ${comparison.resolvingRecommendations[0].recommendedAction} (${comparison.resolvingRecommendations[0].rationale})`
        : '';

      return {
        query,
        intent: 'DISTINGUISHING_SUBGRAPH_ANALYSIS',
        matchedPossibilityIds: pToCompare.map(p => p.id),
        algorithmUsed: 'SYMMETRIC_DIFFERENCE_&_RESOLVING_ENGINE',
        factualAnswer: `Structural differentiation across ${pToCompare.length} models:\n\n${diffText}${recText}`,
        structuredData: { comparison },
        suggestedFollowUps: [
          'What do all surviving possibilities have in common?',
          'Which possibilities depend on uncertain identity?'
        ]
      };
    }

    // 4. "Which possibilities depend on uncertain identity?" / Entity resolution
    if (q.includes('identity') || q.includes('resolution') || q.includes('same entity') || q.includes('merged')) {
      const identityBranches = possibilities.filter(p => p.generationMethod === 'ENTITY_RESOLUTION');
      const branchSummary = identityBranches.map(p => `• ${p.name} (Status: ${p.status}): ${p.description}`).join('\n');

      return {
        query,
        intent: 'IDENTITY_UNCERTAINTY_BRANCHES',
        algorithmUsed: 'ENTITY_RESOLUTION_GRAPH_BRANCHING',
        factualAnswer: identityBranches.length > 0
          ? `Discovered ${identityBranches.length} possibility branch(es) dependent on identity resolution:\n\n${branchSummary}`
          : `No current possibilities depend on unresolved entity identities.`,
        structuredData: { identityPossibilities: identityBranches },
        suggestedFollowUps: [
          'What do all surviving possibilities have in common?',
          'Show all valid paths between entities.'
        ]
      };
    }

    // 5. "Which evidence conflicts with P?"
    if (q.includes('conflict') || q.includes('contradict')) {
      const targetP = mentionedPossibilities[0] || possibilities.find(p => p.conflictingEvidence.length > 0);
      if (targetP) {
        const conflictLabels = targetP.conflictingEvidence.map(id => nodeMap.get(id)?.label || id);
        return {
          query,
          intent: 'CONTRADICTION_EVIDENCE_INQUIRY',
          matchedPossibilityIds: [targetP.id],
          algorithmUsed: 'CONTRADICTION_PROPAGATION',
          factualAnswer: `Possibility '${targetP.name}' directly conflicts with ${conflictLabels.length} evidence item(s):\n` +
            conflictLabels.map(l => `• ${l}`).join('\n') +
            `\n\nAssumptions required: ${targetP.assumptions.join('; ')}`,
          structuredData: { possibilityId: targetP.id, conflictingEvidence: targetP.conflictingEvidence },
          suggestedFollowUps: [
            'What do all surviving possibilities have in common?',
            'What structurally distinguishes the possibilities?'
          ]
        };
      }
    }

    // 6. "How many independent paths exist in P?" / Corroboration
    if (q.includes('independent') || q.includes('disjoint') || q.includes('corroborat')) {
      const targetP = mentionedPossibilities[0] || possibilities[0];
      const count = (targetP?.algorithmResults as any)?.independentCorroboration?.independentCorroborationCount ?? 1;

      return {
        query,
        intent: 'INDEPENDENT_PATHS_INQUIRY',
        matchedPossibilityIds: targetP ? [targetP.id] : [],
        algorithmUsed: 'SUURBALLE_VERTEX_DISJOINT_PATHS',
        factualAnswer: targetP
          ? `Possibility '${targetP.name}' has ${count} structurally independent (vertex-disjoint) access corridor(s). This means there are ${count} non-overlapping routes providing structural corroboration.`
          : `No possibility branches selected for disjoint path evaluation.`,
        structuredData: { independentPathsCount: count },
        suggestedFollowUps: [
          'Which nodes are unavoidable across all valid paths?',
          'What do all surviving possibilities have in common?'
        ]
      };
    }

    // 7. "Show all valid connections between X and Y"
    if ((q.includes('connect') || q.includes('path') || q.includes('route')) && mentionedNodes.length >= 2) {
      const src = mentionedNodes[0];
      const tgt = mentionedNodes[1];
      const kPaths = this.analysisEngine.runKShortestPaths(baseGraph, src.id, tgt.id, 4, caseId);
      const disjoint = this.analysisEngine.runDisjointPaths(baseGraph, src.id, tgt.id, 'VERTEX_DISJOINT', caseId);

      const pathsSummary = kPaths.paths.map((p, idx) =>
        `Path ${idx + 1} (Cost: ${p.totalCost}): ${p.nodes.map(n => n.label).join(' → ')}`
      ).join('\n');

      return {
        query,
        intent: 'FIND_PATHS_AND_CORRIDORS',
        matchedEntityIds: [src.id, tgt.id],
        algorithmUsed: 'K_SHORTEST_PATHS & DISJOINT_PATHS',
        factualAnswer: kPaths.paths.length > 0
          ? `Discovered ${kPaths.paths.length} directed evidence path(s) between '${src.label}' and '${tgt.label}'. There are ${disjoint.independentCorroborationCount} structurally independent corridor(s).\n\n${pathsSummary}`
          : `No directed path exists between '${src.label}' and '${tgt.label}' under observed graph constraints.`,
        structuredData: { paths: kPaths.paths, independentCorroborationCount: disjoint.independentCorroborationCount },
        suggestedFollowUps: [
          `Which nodes are unavoidable between ${src.label} and ${tgt.label}?`,
          `What is the minimum cut separating ${src.label} and ${tgt.label}?`
        ]
      };
    }

    // 8. "Which nodes are unavoidable / critical / bottlenecks?" / Dominators
    if (q.includes('unavoidable') || q.includes('choke') || q.includes('critical') || q.includes('bottleneck') || q.includes('articulation')) {
      const articulation = this.analysisEngine.runArticulationPoints(baseGraph, caseId);

      let dominatorAnswer = '';
      let dominatorData: any = null;
      if (mentionedNodes.length >= 2) {
        const dom = this.analysisEngine.runDominators(baseGraph, mentionedNodes[0].id, mentionedNodes[1].id, caseId);
        dominatorData = dom;
        if (dom.unavoidableNodesForTarget && dom.unavoidableNodesForTarget.length > 0) {
          dominatorAnswer = ` Dominator analysis confirms ${dom.unavoidableNodesForTarget.length} unavoidable choke point(s) traversing from '${mentionedNodes[0].label}' to '${mentionedNodes[1].label}': ${dom.unavoidableNodesForTarget.map(n => n.label).join(', ')}.`;
        }
      }

      const criticalSummary = articulation.articulationPoints.map(ap => `• ${ap.label} (${ap.type}): ${ap.impactExplanation}`).join('\n');

      return {
        query,
        intent: 'STRUCTURAL_BOTTLENECK_ANALYSIS',
        algorithmUsed: 'ARTICULATION_POINTS & DOMINATORS',
        factualAnswer: `Identified ${articulation.articulationPoints.length} structural articulation point(s) in the graph.${dominatorAnswer}\n\n${criticalSummary}`,
        structuredData: { articulationPoints: articulation.articulationPoints, dominatorTree: dominatorData },
        suggestedFollowUps: [
          'What do all surviving possibilities have in common?',
          'What is the minimum cut separating entities?'
        ]
      };
    }

    // Fallback general graph summary
    return this.fallbackAnswer(
      query,
      `Graph contains ${baseGraph.nodes.length} nodes and ${baseGraph.edges.length} edges across ${possibilities.length} possibility branches. Try asking: "What do all surviving possibilities have in common?", "Which nodes are unavoidable?", or "What structurally distinguishes the possibilities?"`
    );
  }

  private fallbackAnswer(query: string, message: string): AgentQueryResult {
    return {
      query,
      intent: 'GENERAL_INQUIRY',
      factualAnswer: message,
      structuredData: {},
      suggestedFollowUps: [
        'What do all surviving possibilities have in common?',
        'Which nodes are unavoidable across all valid paths?',
        'What structurally distinguishes the possibilities?'
      ]
    };
  }
}

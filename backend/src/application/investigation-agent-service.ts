import { GraphPayload, GraphNode } from '../domain/types.js';
import { PossibilityRepository } from '../infrastructure/repositories/possibility-repository.js';
import { GraphAnalysisEngine } from './graph-analysis-engine.js';
import { PossibilityEngine } from './possibility-engine.js';

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

    // Find mentioned possibilities in query (e.g. "p01", "possibility #1", etc.)
    const mentionedPossibilities = possibilities.filter(p => {
      const pNum = p.name.toLowerCase();
      return q.includes(p.id.toLowerCase()) || q.includes(pNum) || (q.includes('p01') && p.name.includes('#1'));
    });

    // 1. "Show all valid connections between X and Y" / "How does X connect to Y"
    if ((q.includes('connect') || q.includes('path') || q.includes('route') || q.includes('how')) && mentionedNodes.length >= 2) {
      const src = mentionedNodes[0];
      const tgt = mentionedNodes[1];
      const kPaths = this.analysisEngine.runKShortestPaths(baseGraph, src.id, tgt.id, 3, caseId);
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
          ? `Discovered ${kPaths.paths.length} directed evidence path(s) between '${src.label}' and '${tgt.label}'. There are ${disjoint.independentCorroborationCount} structurally independent (vertex-disjoint) corridor(s).\n\n${pathsSummary}`
          : `No directed path exists between '${src.label}' and '${tgt.label}' under observed graph constraints.`,
        structuredData: { paths: kPaths.paths, independentCorroborationCount: disjoint.independentCorroborationCount },
        suggestedFollowUps: [
          `Which nodes are unavoidable between ${src.label} and ${tgt.label}?`,
          `What is the minimum cut separating ${src.label} and ${tgt.label}?`
        ]
      };
    }

    // 2. "Which nodes are unavoidable / critical / bottlenecks?" / Dominators / Articulation
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
          `What is the minimum cut separating the suspect from the target?`,
          `Show all independent paths between entities.`
        ]
      };
    }

    // 3. "Why does P exist?" / Possibility Provenance
    if (q.includes('why') && (mentionedPossibilities.length > 0 || q.includes('exist'))) {
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
          `What is different between possibilities?`,
          `Which possibilities are temporally invalid?`
        ]
      };
    }

    // 4. "What is different between P1 and P2?" / Possibility Comparison
    if (q.includes('different') || q.includes('compare') || q.includes('versus') || q.includes('vs')) {
      const pToCompare = mentionedPossibilities.length >= 2 ? mentionedPossibilities.slice(0, 5) : possibilities.slice(0, 3);
      if (pToCompare.length < 2) {
        return this.fallbackAnswer(query, 'At least 2 possibilities are required for structural comparison.');
      }

      const comparison = this.possibilityEngine.comparePossibilities(
        caseId,
        pToCompare.map(p => p.id),
        baseGraph
      );

      const compText = comparison.possibilities.map(p =>
        `• ${p.name}: Status=${p.status}, Temporal=${p.temporalValidity}, Supporting Evidence=${p.evidenceSupportCount}, Conflicts=${p.conflictingEvidenceCount}, Assumptions=${p.assumptionCount}`
      ).join('\n');

      return {
        query,
        intent: 'COMPARE_POSSIBILITIES',
        matchedPossibilityIds: pToCompare.map(p => p.id),
        algorithmUsed: 'GRAPH_DELTA_COMPARISON',
        factualAnswer: `Comparison across ${comparison.possibilities.length} possibilities:\n\n${compText}\n\nCommon evidence items across all compared branches: ${comparison.structuralDiff.commonEvidence.length} item(s).`,
        structuredData: { comparison },
        suggestedFollowUps: [
          `What evidence is common to all surviving possibilities?`,
          `Which possibilities are temporally invalid?`
        ]
      };
    }

    // 5. "Which possibilities are temporally invalid?"
    if (q.includes('temporally invalid') || q.includes('temporal conflict') || q.includes('invalid possibilities')) {
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
          `Show all valid connections between entities`,
          `What evidence is common to all surviving possibilities?`
        ]
      };
    }

    // 6. "What evidence is common to all surviving possibilities?"
    if (q.includes('common') && q.includes('evidence')) {
      const validPossibilities = possibilities.filter(p => p.status === 'VALID' || p.status === 'CONDITIONAL');
      if (validPossibilities.length === 0) {
        return this.fallbackAnswer(query, 'No valid surviving possibilities exist.');
      }

      let common = new Set<string>(validPossibilities[0].supportingEvidence);
      for (let i = 1; i < validPossibilities.length; i++) {
        const currentSet = new Set(validPossibilities[i].supportingEvidence);
        for (const ev of common) {
          if (!currentSet.has(ev)) {
            common.delete(ev);
          }
        }
      }

      const commonEvidenceLabels = Array.from(common).map(id => nodeMap.get(id)?.label || id);
      return {
        query,
        intent: 'COMMON_EVIDENCE_INTERSECTION',
        algorithmUsed: 'SET_INTERSECTION_OVER_POSSIBILITY_SPACE',
        factualAnswer: commonEvidenceLabels.length > 0
          ? `The following evidence item(s) are structurally indispensable and common to all ${validPossibilities.length} surviving possibilities:\n` +
            commonEvidenceLabels.map(l => `• ${l}`).join('\n')
          : `There is no single evidence item shared by all surviving possibilities (possibilities rely on distinct corroborating evidence paths).`,
        structuredData: { commonEvidenceIds: Array.from(common) },
        suggestedFollowUps: [
          `Why does the first possibility exist?`,
          `Compare surviving possibilities.`
        ]
      };
    }

    // 7. Attack patterns
    if (q.includes('attack') || q.includes('stage') || q.includes('pattern') || q.includes('exfiltration')) {
      const patterns = this.analysisEngine.runPatternMatching(baseGraph, caseId);
      const patternText = patterns.map(p =>
        `• ${p.patternName} (${p.matchPercentage}% match): ${p.matchedStages.map(s => s.stageName).join(' → ')}`
      ).join('\n');

      return {
        query,
        intent: 'ATTACK_PATTERN_MATCHING',
        algorithmUsed: 'SUBGRAPH_PATTERN_MATCHING',
        factualAnswer: `Evaluated ${patterns.length} attack pattern template(s):\n\n${patternText}`,
        structuredData: { patterns },
        suggestedFollowUps: [
          `Show all valid connections between suspect and database.`,
          `Which nodes are critical intermediaries?`
        ]
      };
    }

    // Fallback general graph summary
    return this.fallbackAnswer(
      query,
      `Graph contains ${baseGraph.nodes.length} nodes and ${baseGraph.edges.length} edges across ${possibilities.length} possibility branches. Try asking: "Show all connections between Rahul and Prod-DB-01", "Which nodes are critical?", or "What is different between possibilities?"`
    );
  }

  private fallbackAnswer(query: string, message: string): AgentQueryResult {
    return {
      query,
      intent: 'GENERAL_INQUIRY',
      factualAnswer: message,
      structuredData: {},
      suggestedFollowUps: [
        'Which nodes are critical intermediaries in this graph?',
        'Show all connections between Rahul Kumar and Prod-DB-01.',
        'Which possibilities are temporally invalid?'
      ]
    };
  }
}

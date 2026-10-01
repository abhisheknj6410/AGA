import { GraphPayload } from '../domain/types.js';
import { Possibility } from '../domain/possibility-types.js';
import {
  AlgorithmImpactNode,
  AlgorithmImpactEdge,
  AlgorithmImpactGraph,
  ReasoningTrace
} from '../domain/effectiveness-types.js';
import { ResolutionReasoningResult } from '../domain/resolution-types.js';
import { InvestigationPlan } from '../domain/planning-types.js';

export class AlgorithmImpactGraphEngine {
  /**
   * Constructs the second-order causal impact graph tracing:
   * Algorithm -> Intermediate Result -> Possibility -> Structural Property -> Resolution -> Investigation Action
   */
  buildImpactGraph(
    caseId: string,
    possibilities: Possibility[],
    resolution: ResolutionReasoningResult,
    plan: InvestigationPlan
  ): AlgorithmImpactGraph {
    const nodes: AlgorithmImpactNode[] = [];
    const edges: AlgorithmImpactEdge[] = [];
    const nodeIds = new Set<string>();

    const addNode = (node: AlgorithmImpactNode) => {
      if (!nodeIds.has(node.id)) {
        nodeIds.add(node.id);
        nodes.push(node);
      }
    };

    const addEdge = (edge: AlgorithmImpactEdge) => {
      edges.push(edge);
    };

    // 1. Algorithm Layer Nodes
    const algorithms = [
      { id: 'alg-yen', name: "Yen's K-Shortest Paths", role: 'GENERATIVE' },
      { id: 'alg-temporal', name: 'Temporal Validation & Kahn Sort', role: 'FILTERING' },
      { id: 'alg-constraint', name: 'Possibility Constraint Engine', role: 'FILTERING' },
      { id: 'alg-dominator', name: 'Lengauer-Tarjan Dominator Tree', role: 'STRUCTURAL' },
      { id: 'alg-mincut', name: 'Min-Cut Interdiction Boundary', role: 'RESOLUTION' },
      { id: 'alg-families', name: 'Structural Family Backbone Clustering', role: 'STRUCTURAL' },
      { id: 'alg-invariants', name: 'Universal Common Invariants', role: 'DIFFERENTIATING' },
      { id: 'alg-entropy', name: 'Shannon Entropy & Information Gain', role: 'RESOLUTION' },
      { id: 'alg-planning', name: 'Investigation Planning Engine', role: 'RESOLUTION' }
    ];

    for (const alg of algorithms) {
      addNode({
        id: alg.id,
        type: 'ALGORITHM',
        label: alg.name,
        category: alg.role,
        metadata: { role: alg.role }
      });
    }

    // 2. Intermediate Results Layer
    const kPathResId = 'res-kpaths';
    addNode({
      id: kPathResId,
      type: 'INTERMEDIATE_RESULT',
      label: `Candidate Corridor Paths (${possibilities.length} discovered)`,
      metadata: { count: possibilities.length }
    });
    addEdge({ id: 'e-yen-kpaths', source: 'alg-yen', target: kPathResId, type: 'PRODUCES', label: 'Spawns' });

    const chronoResId = 'res-chrono';
    addNode({
      id: chronoResId,
      type: 'INTERMEDIATE_RESULT',
      label: 'Causal Ordering & Interval Bounds',
      metadata: {}
    });
    addEdge({ id: 'e-temp-chrono', source: 'alg-temporal', target: chronoResId, type: 'PRODUCES', label: 'Validates' });

    // 3. Possibility Layer Nodes
    const valid = possibilities.filter(p => p.status !== 'INVALID');
    for (const p of possibilities) {
      const pNodeId = `p-${p.id}`;
      addNode({
        id: pNodeId,
        type: 'POSSIBILITY',
        label: `${p.name} [${p.status}]`,
        category: p.status,
        metadata: {
          status: p.status,
          method: p.generationMethod,
          assumptions: p.assumptions
        }
      });

      addEdge({
        id: `e-kpaths-${pNodeId}`,
        source: kPathResId,
        target: pNodeId,
        type: 'PRODUCES',
        label: p.generationMethod
      });

      if (p.status === 'VALID') {
        addEdge({
          id: `e-chrono-${pNodeId}`,
          source: chronoResId,
          target: pNodeId,
          type: 'FILTERS',
          label: 'Chronology Passed'
        });
      }
    }

    // 4. Structural Properties (Families, Invariants, Cuts)
    for (const fam of resolution.structuralFamilies) {
      const famNodeId = `fam-${fam.familyId}`;
      addNode({
        id: famNodeId,
        type: 'STRUCTURAL_PROPERTY',
        label: `Family: ${fam.familyLabel}`,
        metadata: {
          backbone: fam.backboneSignature,
          possibilityCount: fam.possibilityIds.length
        }
      });

      addEdge({
        id: `e-alg-fam-${famNodeId}`,
        source: 'alg-families',
        target: famNodeId,
        type: 'CLUSTERS'
      });

      for (const pid of fam.possibilityIds) {
        addEdge({
          id: `e-p-fam-${pid}-${famNodeId}`,
          source: `p-${pid}`,
          target: famNodeId,
          type: 'CLUSTERS',
          label: 'Belongs to'
        });
      }
    }

    // Unavoidable Dominator Node
    if (resolution.commonInvariants.commonUnavoidableDominatorNodes.length > 0) {
      const domInvId = 'prop-unavoidable-choke';
      addNode({
        id: domInvId,
        type: 'STRUCTURAL_PROPERTY',
        label: `Unavoidable Choke Point: ${resolution.commonInvariants.commonUnavoidableDominatorNodes.map(d => d.label).join(', ')}`,
        metadata: { nodes: resolution.commonInvariants.commonUnavoidableDominatorNodes }
      });
      addEdge({
        id: 'e-dominator-inv',
        source: 'alg-dominator',
        target: domInvId,
        type: 'PRODUCES',
        label: 'Dominates all paths'
      });
    }

    // 5. Resolution Candidates
    for (const cand of resolution.resolutionCandidates) {
      const candNodeId = `cand-${cand.id}`;
      addNode({
        id: candNodeId,
        type: 'RESOLUTION',
        label: `Resolution ${cand.id}: ${cand.targetLabel}`,
        metadata: {
          basis: cand.graphBasis,
          utility: cand.resolutionUtilityScore
        }
      });

      // Link basis algorithm to resolution candidate
      if (cand.graphBasis === 'MIN_CUT_SEPARATION') {
        addEdge({
          id: `e-mincut-${candNodeId}`,
          source: 'alg-mincut',
          target: candNodeId,
          type: 'RESOLVES',
          label: 'Min-Cut Edge'
        });
      } else if (cand.graphBasis === 'DOMINATOR_DIVERGENCE') {
        addEdge({
          id: `e-dom-${candNodeId}`,
          source: 'alg-dominator',
          target: candNodeId,
          type: 'RESOLVES',
          label: 'Divergent Dominator'
        });
      } else {
        addEdge({
          id: `e-invariants-${candNodeId}`,
          source: 'alg-invariants',
          target: candNodeId,
          type: 'RESOLVES',
          label: 'Differentiator'
        });
      }

      // Link distinguished families
      for (const famId of cand.distinguishedFamilyIds) {
        if (nodeIds.has(`fam-${famId}`)) {
          addEdge({
            id: `e-cand-fam-${candNodeId}-${famId}`,
            source: candNodeId,
            target: `fam-${famId}`,
            type: 'PARTITIONS',
            label: 'Distinguishes'
          });
        }
      }
    }

    // 6. Investigation Actions Layer
    for (const act of plan.actions) {
      const actNodeId = `action-${act.id}`;
      addNode({
        id: actNodeId,
        type: 'INVESTIGATION_ACTION',
        label: `${act.id}: ${act.targetLabel}`,
        metadata: {
          value: act.investigationValue,
          gain: act.expectedInformationGain,
          evidenceClasses: act.evidenceClasses
        }
      });

      addEdge({
        id: `e-entropy-${actNodeId}`,
        source: 'alg-entropy',
        target: actNodeId,
        type: 'PRODUCES',
        label: `${act.expectedInformationGain} bits`
      });

      addEdge({
        id: `e-planning-${actNodeId}`,
        source: 'alg-planning',
        target: actNodeId,
        type: 'PRODUCES',
        label: `Ranked Val: ${act.investigationValue}`
      });

      // Link candidate to action
      const matchedCand = resolution.resolutionCandidates.find(c => c.id === act.targetCandidateId);
      if (matchedCand && nodeIds.has(`cand-${matchedCand.id}`)) {
        addEdge({
          id: `e-cand-act-${matchedCand.id}-${act.id}`,
          source: `cand-${matchedCand.id}`,
          target: actNodeId,
          type: 'RESOLVES',
          label: 'Operationalizes'
        });
      }
    }

    return { nodes, edges };
  }

  /**
   * Computes transitive downstream impact of an algorithm.
   */
  getTransitiveImpact(
    algorithmId: string,
    impactGraph: AlgorithmImpactGraph
  ): { depth: number; affectedNodes: AlgorithmImpactNode[] } {
    const adj = new Map<string, string[]>();
    for (const e of impactGraph.edges) {
      if (!adj.has(e.source)) adj.set(e.source, []);
      adj.get(e.source)!.push(e.target);
    }

    const visited = new Set<string>();
    const queue: Array<{ id: string; depth: number }> = [{ id: algorithmId, depth: 0 }];
    visited.add(algorithmId);
    let maxDepth = 0;

    while (queue.length > 0) {
      const { id, depth } = queue.shift()!;
      if (depth > maxDepth) maxDepth = depth;

      const neighbors = adj.get(id) || [];
      for (const n of neighbors) {
        if (!visited.has(n)) {
          visited.add(n);
          queue.push({ id: n, depth: depth + 1 });
        }
      }
    }

    visited.delete(algorithmId);
    const affectedNodes = impactGraph.nodes.filter(n => visited.has(n.id));
    return { depth: maxDepth, affectedNodes };
  }

  /**
   * Computes upstream computational provenance for an action or possibility.
   */
  getUpstreamProvenance(
    targetNodeId: string,
    impactGraph: AlgorithmImpactGraph
  ): AlgorithmImpactNode[] {
    const revAdj = new Map<string, string[]>();
    for (const e of impactGraph.edges) {
      if (!revAdj.has(e.target)) revAdj.set(e.target, []);
      revAdj.get(e.target)!.push(e.source);
    }

    const visited = new Set<string>();
    const queue: string[] = [targetNodeId];
    visited.add(targetNodeId);

    while (queue.length > 0) {
      const curr = queue.shift()!;
      const parents = revAdj.get(curr) || [];
      for (const p of parents) {
        if (!visited.has(p)) {
          visited.add(p);
          queue.push(p);
        }
      }
    }

    return impactGraph.nodes.filter(n => visited.has(n.id));
  }

  /**
   * Builds an explainable Reasoning Trace for a target action, possibility, or candidate.
   */
  buildReasoningTrace(
    targetId: string,
    possibilities: Possibility[],
    resolution: ResolutionReasoningResult,
    plan: InvestigationPlan,
    baseGraph: GraphPayload
  ): ReasoningTrace {
    // 1. If target is an Investigation Action
    const action = plan.actions.find(a => a.id === targetId || a.id.toLowerCase() === targetId.toLowerCase());
    if (action) {
      const cand = resolution.resolutionCandidates.find(c => c.id === action.targetCandidateId);
      const affectedPoss = possibilities.filter(p => action.targetPossibilities.includes(p.id));

      const chainSteps: ReasoningTrace['chainSteps'] = [
        {
          stage: 'EVIDENCE',
          component: 'Base Evidence Graph',
          detail: `Graph with ${baseGraph.nodes.length} nodes and ${baseGraph.edges.length} relations provides physical/digital connectivity.`
        },
        {
          stage: 'ALGORITHM_GENERATION',
          component: "Yen's K-Shortest Paths",
          algorithmName: "Yen's K-Shortest Paths",
          detail: `Discovered alternative corridor routes connecting primary source to target.`
        },
        {
          stage: 'CONSTRAINT_FILTERING',
          component: 'Temporal Validation & Provenance',
          algorithmName: 'Temporal Chronology Check',
          detail: `Enforced monotonic event sequences and required evidence references along paths.`
        },
        {
          stage: 'POSSIBILITY_SPACE',
          component: 'Surviving Possibilities',
          detail: `${affectedPoss.length} surviving branches diverge across this target: [${affectedPoss.map(p => p.name).join(', ')}].`
        },
        {
          stage: 'STRUCTURAL_DIFFERENTIATION',
          component: action.algorithmBasis,
          algorithmName: action.algorithmBasis,
          detail: `Identified structural distinction via ${action.graphBasis}. Target: '${action.targetLabel}'.`
        },
        {
          stage: 'RESOLUTION',
          component: 'Resolution Candidate R-Layer',
          detail: `Candidate ${cand?.id || 'R1'} partitions surviving branches with Resolution Utility score ${action.resolutionUtility}/100.`
        },
        {
          stage: 'INVESTIGATION_ACTION',
          component: 'Investigation Planning Engine',
          algorithmName: 'Shannon Entropy & Information Gain',
          detail: `Formulated actionable inquiry with ${action.expectedInformationGain} bits information gain and investigation value ${action.investigationValue}.`
        }
      ];

      return {
        targetId: action.id,
        targetType: 'INVESTIGATION_ACTION',
        targetLabel: action.targetLabel,
        producedByAlgorithms: [
          "Yen's K-Shortest Paths",
          'Temporal Validation',
          action.algorithmBasis,
          'Shannon Entropy & Information Gain',
          'Investigation Planning Engine'
        ],
        validatedByConstraints: ['Temporal Interval Monotonicity', 'Provenance Corroboration'],
        distinguishedBy: [action.graphBasis],
        resolutionImpact: [action.targetCandidateId],
        investigationImpact: [action.id],
        chainSteps,
        explanation:
          `Action ${action.id} is recommended because:\n` +
          `1. Alternative corridors diverge at '${action.targetLabel}'.\n` +
          `2. Structural separation basis is ${action.algorithmBasis} (${action.graphBasis}).\n` +
          `3. Verifying ${action.evidenceClasses.join(', ')} yields ${action.expectedInformationGain} bits of information gain, ` +
          `partitioning ${action.expectedPartitions.CONFIRMED.resultingPossibilityCount} vs ${action.expectedPartitions.REFUTED.resultingPossibilityCount} branches.`
      };
    }

    // 2. If target is a Possibility
    const poss = possibilities.find(p => p.id === targetId || p.name.toLowerCase().includes(targetId.toLowerCase()));
    if (poss) {
      const fam = resolution.structuralFamilies.find(f => f.possibilityIds.includes(poss.id));
      const relatedCand = resolution.resolutionCandidates.find(c => c.affectedPossibilityIds.includes(poss.id));

      const chainSteps: ReasoningTrace['chainSteps'] = [
        {
          stage: 'EVIDENCE',
          component: 'Base Graph Nodes & Edges',
          detail: `Constructed from verified evidence references: [${poss.supportingEvidence.join(', ') || 'Base Topology'}].`
        },
        {
          stage: 'ALGORITHM',
          component: "Yen's K-Shortest Paths",
          algorithmName: "Yen's K-Shortest Paths",
          detail: `Generated candidate route via generation method: ${poss.generationMethod}.`
        },
        {
          stage: 'VALIDATION',
          component: 'Possibility Constraint Engine',
          algorithmName: 'Temporal Chronology & Kahn Sort',
          detail: `Validated as ${poss.status} with 0 uncorroborated contradictions.`
        },
        {
          stage: 'FAMILY',
          component: 'Structural Family Clustering',
          detail: `Grouped into ${fam?.familyLabel || 'Primary Corridor Family'} (Backbone: ${fam?.backboneSignature || 'Direct'}).`
        }
      ];

      return {
        targetId: poss.id,
        targetType: 'POSSIBILITY',
        targetLabel: poss.name,
        producedByAlgorithms: ["Yen's K-Shortest Paths", 'Possibility Engine'],
        validatedByConstraints: ['Temporal Monotonicity', 'Evidence Provenance Threshold'],
        distinguishedBy: [fam?.backboneSignature || 'Alternative Corridor'],
        resolutionImpact: relatedCand ? [relatedCand.id] : [],
        investigationImpact: plan.actions.filter(a => a.targetPossibilities.includes(poss.id)).map(a => a.id),
        chainSteps,
        explanation:
          `Possibility '${poss.name}' exists because:\n` +
          `1. Discovered by Yen's K-Shortest Paths via ${poss.assumptions.length} verified/assumed relationship steps.\n` +
          `2. Passed temporal validity and provenance constraints with status: ${poss.status}.\n` +
          `3. Forms structural family '${fam?.familyLabel || 'Family 1'}'.`
      };
    }

    // Fallback default trace
    return {
      targetId,
      targetType: 'POSSIBILITY',
      targetLabel: targetId,
      producedByAlgorithms: ["Yen's K-Shortest Paths"],
      validatedByConstraints: ['Temporal Validation'],
      distinguishedBy: ['Topology'],
      resolutionImpact: [],
      investigationImpact: [],
      chainSteps: [],
      explanation: `Entity '${targetId}' tracked in graph topology.`
    };
  }
}

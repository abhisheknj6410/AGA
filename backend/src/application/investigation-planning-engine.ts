import { GraphPayload, GraphNode, GraphEdge } from '../domain/types.js';
import { Possibility } from '../domain/possibility-types.js';
import { PossibilityRepository } from '../infrastructure/repositories/possibility-repository.js';
import { ResolutionReasoningEngine } from './resolution-reasoning-engine.js';
import {
  EvidenceClass,
  AvailabilityLevel,
  TemporalPrecision,
  EvidenceAcquisitionProfile,
  ExpectedPartition,
  ActionTemporalWindow,
  ActionEntityRef,
  InvestigationAction,
  InvestigationActionStatus,
  PlanningGraphBasis,
  PlanGraphNode,
  PlanGraphEdge,
  InvestigationPlanGraph,
  InvestigationPlan
} from '../domain/planning-types.js';
import { ResolutionCandidate, StructuralFamily, ContradictionImpact } from '../domain/resolution-types.js';

export class InvestigationPlanningEngine {
  constructor(
    private possibilityRepo: PossibilityRepository,
    private resolutionEngine: ResolutionReasoningEngine
  ) {}

  /**
   * Acquisition cost and specificity profiles for all schema evidence classes.
   */
  static readonly EVIDENCE_PROFILES: Record<EvidenceClass, EvidenceAcquisitionProfile> = {
    LOG: {
      evidenceClass: 'LOG',
      estimatedCost: 1,
      availability: 'IMMEDIATE',
      temporalCoverage: { precision: 'SECOND', windowCapability: 'System timestamped automated logs' },
      structuralSpecificity: 0.95
    },
    SYSTEM_RECORD: {
      evidenceClass: 'SYSTEM_RECORD',
      estimatedCost: 1,
      availability: 'IMMEDIATE',
      temporalCoverage: { precision: 'SECOND', windowCapability: 'OS & service level audit records' },
      structuralSpecificity: 0.90
    },
    NETWORK_CAPTURE: {
      evidenceClass: 'NETWORK_CAPTURE',
      estimatedCost: 2,
      availability: 'IMMEDIATE',
      temporalCoverage: { precision: 'SECOND', windowCapability: 'Packet capture and flow records' },
      structuralSpecificity: 0.90
    },
    DATABASE_RECORD: {
      evidenceClass: 'DATABASE_RECORD',
      estimatedCost: 2,
      availability: 'MODERATE',
      temporalCoverage: { precision: 'SECOND', windowCapability: 'Database transaction commit history' },
      structuralSpecificity: 0.88
    },
    TRANSACTION_RECORD: {
      evidenceClass: 'TRANSACTION_RECORD',
      estimatedCost: 2,
      availability: 'MODERATE',
      temporalCoverage: { precision: 'MINUTE', windowCapability: 'Financial ledger & transfer receipts' },
      structuralSpecificity: 0.85
    },
    CCTV: {
      evidenceClass: 'CCTV',
      estimatedCost: 3,
      availability: 'MODERATE',
      temporalCoverage: { precision: 'SECOND', windowCapability: 'Surveillance video streams with camera clock' },
      structuralSpecificity: 0.85
    },
    PHONE_RECORD: {
      evidenceClass: 'PHONE_RECORD',
      estimatedCost: 3,
      availability: 'RESTRICTED',
      temporalCoverage: { precision: 'SECOND', windowCapability: 'Telco CDR and cell tower connection logs' },
      structuralSpecificity: 0.80
    },
    DOCUMENT: {
      evidenceClass: 'DOCUMENT',
      estimatedCost: 2,
      availability: 'MODERATE',
      temporalCoverage: { precision: 'DAY', windowCapability: 'Formal paper trails, warrants, signed manifests' },
      structuralSpecificity: 0.75
    },
    IMAGE: {
      evidenceClass: 'IMAGE',
      estimatedCost: 2,
      availability: 'MODERATE',
      temporalCoverage: { precision: 'MINUTE', windowCapability: 'Photographs with EXIF metadata' },
      structuralSpecificity: 0.75
    },
    INTERVIEW: {
      evidenceClass: 'INTERVIEW',
      estimatedCost: 4,
      availability: 'DELAYED',
      temporalCoverage: { precision: 'HOUR', windowCapability: 'Witness statements and depositions' },
      structuralSpecificity: 0.60
    }
  };

  /**
   * Generates a fully deterministic, graph-grounded Investigation Plan.
   */
  async generatePlan(
    caseId: string,
    baseGraph: GraphPayload,
    options?: {
      disableEntropy?: boolean;
      customResolution?: ResolutionReasoningResult;
      customPossibilities?: Possibility[];
    }
  ): Promise<InvestigationPlan> {
    const traceSteps: string[] = [];
    const basisMap: Record<string, string> = {};
    const timestamp = new Date().toISOString();

    traceSteps.push(`[T0] Initializing Investigation Planning for case ${caseId}`);

    // Step 1: Run Resolution Reasoning to get candidates, structural families, invariants, contradictions
    const resolution = options?.customResolution || this.resolutionEngine.runResolutionAnalysis(caseId, baseGraph);
    const validPossibilities = options?.customPossibilities || this.possibilityRepo.findByCaseId(caseId);
    const survivingPossibilities = validPossibilities.filter(p => p.status !== 'INVALID');

    traceSteps.push(
      `[T1] Resolution analysis complete: ${survivingPossibilities.length} surviving possibilities, ` +
      `${resolution.structuralFamilies.length} structural families, ${resolution.resolutionCandidates.length} resolution candidates.`
    );

    const totalCount = survivingPossibilities.length;
    const currentEntropy = totalCount > 1 ? Number(Math.log2(totalCount).toFixed(4)) : 0;

    if (totalCount <= 1 || resolution.resolutionCandidates.length === 0) {
      traceSteps.push(`[T2] Possibility space already resolved or no candidates available.`);
      return {
        planId: `PLAN-${caseId.slice(0, 8)}`,
        caseId,
        timestamp,
        currentPossibilityCount: totalCount,
        currentFamilyCount: resolution.structuralFamilies.length,
        currentEntropy,
        actions: [],
        planGraph: { nodes: [], edges: [] },
        algorithmTrace: {
          executionTimestamp: timestamp,
          steps: traceSteps,
          basisMap
        },
        nextImmediateAction: null
      };
    }

    const pToFamily = new Map<string, string>();
    for (const fam of resolution.structuralFamilies) {
      for (const pid of fam.possibilityIds) {
        pToFamily.set(pid, fam.familyId);
      }
    }

    const nodeMap = new Map<string, GraphNode>(baseGraph.nodes.map(n => [n.id, n]));
    const actions: InvestigationAction[] = [];
    let actIdSeq = 1;

    // Step 2: Transform Resolution Candidates into Actionable Investigation Actions
    for (const cand of resolution.resolutionCandidates) {
      const actId = `ACT-${actIdSeq++}`;
      basisMap[actId] = cand.graphBasis;

      // Classify evidence & profile
      const evClass = this.determineEvidenceClass(cand, baseGraph);
      const costProfile = InvestigationPlanningEngine.EVIDENCE_PROFILES[evClass] || InvestigationPlanningEngine.EVIDENCE_PROFILES.LOG;

      // Temporal investigation window extraction
      const temporalWindow = this.extractTemporalWindow(cand, baseGraph);

      // Required entity identification
      const requiredEntities = this.extractRequiredEntities(cand, baseGraph);

      // Multi-outcome partition computation
      const expectedPartitions = this.computePartitions(
        cand,
        survivingPossibilities,
        resolution.structuralFamilies,
        pToFamily
      );

      // Information Gain calculation: H(before) - E[H(after)]
      const pConf = expectedPartitions.CONFIRMED.probability;
      const pRef = expectedPartitions.REFUTED.probability;
      const nConf = expectedPartitions.CONFIRMED.resultingPossibilityCount;
      const nRef = expectedPartitions.REFUTED.resultingPossibilityCount;

      const hConf = nConf > 1 ? Math.log2(nConf) : 0;
      const hRef = nRef > 1 ? Math.log2(nRef) : 0;
      const expectedHAfter = pConf * hConf + pRef * hRef;
      const informationGain = options?.disableEntropy ? 0 : Math.max(0, Number((currentEntropy - expectedHAfter).toFixed(4)));

      // Investigation Value calculation
      // Combines information gain, utility, evidence specificity, and penalizes high acquisition cost
      const investigationValue = Number(
        (
          ((informationGain * 50 + cand.resolutionUtilityScore * 0.5) * costProfile.structuralSpecificity) /
          costProfile.estimatedCost
        ).toFixed(2)
      );

      // Action Question construction
      const question = this.formulateInvestigativeQuestion(cand, evClass, temporalWindow);

      actions.push({
        id: actId,
        targetCandidateId: cand.id,
        targetType: cand.targetType,
        targetLabel: cand.targetLabel,
        targetPossibilities: cand.affectedPossibilityIds,
        targetFamilies: cand.distinguishedFamilyIds,
        question,
        evidenceClasses: [evClass],
        requiredTemporalWindow: temporalWindow,
        requiredEntities,
        graphBasis: cand.graphBasis,
        algorithmBasis: this.formatAlgorithmBasis(cand.graphBasis),
        expectedPartitions,
        resolutionUtility: cand.resolutionUtilityScore,
        expectedInformationGain: informationGain,
        evidenceSpecificity: costProfile.structuralSpecificity,
        costProfile,
        investigationValue,
        dependencies: [],
        status: 'RECOMMENDED'
      });
    }

    // Step 3: Handle contradiction-arbitration actions if unresolved contradictions exist
    if (resolution.contradictionImpacts.length > 0) {
      for (const contra of resolution.contradictionImpacts) {
        const contraActId = `ACT-CONTRA-${actIdSeq++}`;
        basisMap[contraActId] = 'CONTRADICTION_ARBITRATION';

        const evClass: EvidenceClass = 'LOG';
        const costProfile = InvestigationPlanningEngine.EVIDENCE_PROFILES[evClass];

        const affected = contra.affectedPossibilityIds;
        const unaffected = contra.unaffectedPossibilityIds;
        const probAffected = Math.max(0.01, affected.length / totalCount);
        const probUnaffected = Math.max(0.01, unaffected.length / totalCount);

        const hAff = affected.length > 1 ? Math.log2(affected.length) : 0;
        const hUnaff = unaffected.length > 1 ? Math.log2(unaffected.length) : 0;
        const expectedHAfter = probAffected * hAff + probUnaffected * hUnaff;
        const infoGain = Math.max(0, Number((currentEntropy - expectedHAfter).toFixed(4)));

        actions.push({
          id: contraActId,
          targetCandidateId: contra.contradictionId,
          targetType: 'EVIDENCE',
          targetLabel: `Contradiction: ${contra.conflictingEvidence.map(e => e.label).join(' vs ')}`,
          targetPossibilities: affected,
          targetFamilies: Array.from(new Set(affected.map(pid => pToFamily.get(pid)).filter(Boolean) as string[])),
          question: `Arbitrate contradiction between '${contra.conflictingEvidence[0]?.label}' and '${contra.conflictingEvidence[1]?.label}' via authoritative audit records.`,
          evidenceClasses: ['LOG', 'SYSTEM_RECORD'],
          requiredEntities: contra.conflictingEvidence.map(e => ({ id: e.id, label: e.label, role: 'Disputed Evidence Node' })),
          graphBasis: 'CONTRADICTION_ARBITRATION',
          algorithmBasis: 'Contradiction Subgraph Arbitration',
          expectedPartitions: {
            CONFIRMED: {
              outcome: 'CONFIRMED',
              confirmedSet: affected,
              refutedSet: unaffected,
              conflictingSet: [],
              unknownSet: [],
              probability: probAffected,
              resultingPossibilityCount: affected.length,
              resultingFamilyCount: new Set(affected.map(pid => pToFamily.get(pid)).filter(Boolean)).size
            },
            REFUTED: {
              outcome: 'REFUTED',
              confirmedSet: unaffected,
              refutedSet: affected,
              conflictingSet: [],
              unknownSet: [],
              probability: probUnaffected,
              resultingPossibilityCount: unaffected.length,
              resultingFamilyCount: new Set(unaffected.map(pid => pToFamily.get(pid)).filter(Boolean)).size
            },
            CONFLICTING: {
              outcome: 'CONFLICTING',
              confirmedSet: [],
              refutedSet: [],
              conflictingSet: affected,
              unknownSet: unaffected,
              probability: 0.1,
              resultingPossibilityCount: unaffected.length,
              resultingFamilyCount: 1
            }
          },
          resolutionUtility: 80,
          expectedInformationGain: infoGain,
          evidenceSpecificity: 0.92,
          costProfile,
          investigationValue: Number((((infoGain * 50 + 40) * 0.92) / costProfile.estimatedCost).toFixed(2)),
          dependencies: [],
          status: 'RECOMMENDED'
        });
      }
    }

    // Step 4: Infer dependencies between actions
    this.inferActionDependencies(actions, baseGraph);

    // Step 5: Sort actions deterministically by Investigation Value (descending)
    actions.sort((a, b) => {
      if (b.investigationValue !== a.investigationValue) {
        return b.investigationValue - a.investigationValue;
      }
      if (b.expectedInformationGain !== a.expectedInformationGain) {
        return b.expectedInformationGain - a.expectedInformationGain;
      }
      return b.resolutionUtility - a.resolutionUtility;
    });

    traceSteps.push(`[T3] Generated ${actions.length} prioritized investigation actions.`);

    // Step 6: Construct Second-Order Investigation Plan Graph
    const planGraph = this.buildInvestigationPlanGraph(caseId, actions, survivingPossibilities, resolution.resolutionCandidates);

    traceSteps.push(`[T4] Constructed second-order plan graph with ${planGraph.nodes.length} nodes and ${planGraph.edges.length} edges.`);

    // Identify immediate next action: top ranked action whose dependencies are all satisfied
    const nextImmediateAction = actions.find(a => a.dependencies.length === 0) || actions[0] || null;

    return {
      planId: `PLAN-${caseId.slice(0, 8)}`,
      caseId,
      timestamp,
      currentPossibilityCount: totalCount,
      currentFamilyCount: resolution.structuralFamilies.length,
      currentEntropy,
      actions,
      planGraph,
      algorithmTrace: {
        executionTimestamp: timestamp,
        steps: traceSteps,
        basisMap
      },
      nextImmediateAction
    };
  }

  private determineEvidenceClass(cand: ResolutionCandidate, baseGraph: GraphPayload): EvidenceClass {
    // If candidate already specifies a valid class
    if (cand.suggestedEvidenceClass && cand.suggestedEvidenceClass in InvestigationPlanningEngine.EVIDENCE_PROFILES) {
      return cand.suggestedEvidenceClass as EvidenceClass;
    }

    const labelUpper = cand.targetLabel.toUpperCase();
    if (labelUpper.includes('CCTV') || labelUpper.includes('CAMERA') || labelUpper.includes('SURVEILLANCE') || labelUpper.includes('GATE') || labelUpper.includes('CORRIDOR')) {
      return 'CCTV';
    }
    if (labelUpper.includes('LOG') || labelUpper.includes('AUTH') || labelUpper.includes('EVENT') || labelUpper.includes('BADGE')) {
      return 'LOG';
    }
    if (labelUpper.includes('SERVER') || labelUpper.includes('HOST') || labelUpper.includes('PROCESS')) {
      return 'SYSTEM_RECORD';
    }
    if (labelUpper.includes('TRANSFER') || labelUpper.includes('PAYMENT') || labelUpper.includes('ACCOUNT') || labelUpper.includes('VAULT')) {
      return 'TRANSACTION_RECORD';
    }
    if (labelUpper.includes('PHONE') || labelUpper.includes('CALL') || labelUpper.includes('SMS') || labelUpper.includes('TOWER')) {
      return 'PHONE_RECORD';
    }
    if (labelUpper.includes('NETWORK') || labelUpper.includes('ROUTER') || labelUpper.includes('IP') || labelUpper.includes('PORT')) {
      return 'NETWORK_CAPTURE';
    }
    if (labelUpper.includes('DOCUMENT') || labelUpper.includes('MANIFEST') || labelUpper.includes('CONTRACT')) {
      return 'DOCUMENT';
    }

    // Inspect target node in baseGraph if available
    const node = baseGraph.nodes.find(n => n.id === cand.targetEntities[0]);
    if (node) {
      if (node.category === 'LOCATION') return 'CCTV';
      if (node.category === 'EVENT') return 'LOG';
      if (node.category === 'PERSON') return 'PHONE_RECORD';
    }

    return 'LOG';
  }

  private extractTemporalWindow(cand: ResolutionCandidate, baseGraph: GraphPayload): ActionTemporalWindow | undefined {
    // Check if target entity has interval
    for (const entId of cand.targetEntities) {
      const node = baseGraph.nodes.find(n => n.id === entId);
      if (node?.metadata?.temporalInterval) {
        const ti = node.metadata.temporalInterval;
        return {
          start: ti.startTime,
          end: ti.endTime,
          precision: (ti.precision as TemporalPrecision) || 'MINUTE',
          reason: `Constrained by event '${node.label}' documented timestamp bounds.`
        };
      }
    }

    // Check incident edges for temporal intervals
    for (const entId of cand.targetEntities) {
      const incidentEdges = baseGraph.edges.filter(e => e.source === entId || e.target === entId);
      for (const edge of incidentEdges) {
        const otherId = edge.source === entId ? edge.target : edge.source;
        const otherNode = baseGraph.nodes.find(n => n.id === otherId);
        if (otherNode?.metadata?.temporalInterval) {
          const ti = otherNode.metadata.temporalInterval;
          return {
            start: ti.startTime,
            end: ti.endTime,
            precision: (ti.precision as TemporalPrecision) || 'MINUTE',
            reason: `Constrained by adjacent event '${otherNode.label}'.`
          };
        }
      }
    }

    return undefined;
  }

  private extractRequiredEntities(cand: ResolutionCandidate, baseGraph: GraphPayload): ActionEntityRef[] {
    const refs: ActionEntityRef[] = [];
    const nodeMap = new Map<string, GraphNode>(baseGraph.nodes.map(n => [n.id, n]));

    for (const id of cand.targetEntities) {
      if (!id) continue;
      const node = nodeMap.get(id);
      if (node) {
        refs.push({
          id: node.id,
          label: node.label || node.id,
          role: node.category || cand.targetType || 'ENTITY'
        });
      } else {
        refs.push({
          id,
          label: id,
          role: cand.targetType || 'ENTITY'
        });
      }
    }

    return refs;
  }

  private computePartitions(
    cand: ResolutionCandidate,
    survivingPossibilities: Possibility[],
    families: StructuralFamily[],
    pToFamily: Map<string, string>
  ): Record<'CONFIRMED' | 'REFUTED' | 'CONFLICTING', ExpectedPartition> {
    const totalCount = survivingPossibilities.length;
    const ifPres = cand.partition.ifPresentValidPossibilityIds.filter(pid =>
      survivingPossibilities.some(p => p.id === pid)
    );
    const ifAbs = cand.partition.ifAbsentValidPossibilityIds.filter(pid =>
      survivingPossibilities.some(p => p.id === pid)
    );

    const probPres = Math.max(0.01, ifPres.length / totalCount);
    const probAbs = Math.max(0.01, ifAbs.length / totalCount);

    const presFamilies = new Set(ifPres.map(pid => pToFamily.get(pid)).filter(Boolean));
    const absFamilies = new Set(ifAbs.map(pid => pToFamily.get(pid)).filter(Boolean));

    const confirmedPartition: ExpectedPartition = {
      outcome: 'CONFIRMED',
      confirmedSet: ifPres,
      refutedSet: ifAbs,
      conflictingSet: [],
      unknownSet: [],
      probability: Number(probPres.toFixed(4)),
      resultingPossibilityCount: ifPres.length,
      resultingFamilyCount: presFamilies.size
    };

    const refutedPartition: ExpectedPartition = {
      outcome: 'REFUTED',
      confirmedSet: ifAbs,
      refutedSet: ifPres,
      conflictingSet: [],
      unknownSet: [],
      probability: Number(probAbs.toFixed(4)),
      resultingPossibilityCount: ifAbs.length,
      resultingFamilyCount: absFamilies.size
    };

    const conflictingPartition: ExpectedPartition = {
      outcome: 'CONFLICTING',
      confirmedSet: [],
      refutedSet: [],
      conflictingSet: ifPres,
      unknownSet: ifAbs,
      probability: 0.05,
      resultingPossibilityCount: ifAbs.length,
      resultingFamilyCount: absFamilies.size
    };

    return {
      CONFIRMED: confirmedPartition,
      REFUTED: refutedPartition,
      CONFLICTING: conflictingPartition
    };
  }

  private formulateInvestigativeQuestion(
    cand: ResolutionCandidate,
    evClass: EvidenceClass,
    window?: ActionTemporalWindow
  ): string {
    const basisPrefix =
      cand.graphBasis === 'MIN_CUT_SEPARATION' ? 'Inspect cut barrier' :
      cand.graphBasis === 'DOMINATOR_DIVERGENCE' ? 'Validate branch point' :
      cand.graphBasis === 'ALTERNATIVE_CORRIDOR' ? 'Verify transit corridor' :
      cand.graphBasis === 'TEMPORAL_DISCRIMINATION' ? 'Verify chronological sequence' :
      'Investigate independent link';

    const timeStr = window?.start ? ` during window [${window.start} - ${window.end || 'ongoing'}]` : '';

    return `${basisPrefix}: Acquire ${evClass} records for '${cand.targetLabel}'${timeStr} to partition ${cand.affectedPossibilityIds.length} candidate possibilities.`;
  }

  private formatAlgorithmBasis(basis: PlanningGraphBasis): string {
    switch (basis) {
      case 'MIN_CUT_SEPARATION':
        return 'Min-Cut Network Disconnection';
      case 'DOMINATOR_DIVERGENCE':
        return 'Dominator Tree Reachability Divergence';
      case 'ALTERNATIVE_CORRIDOR':
        return "Yen's K-Shortest Path Divergence";
      case 'DISJOINT_SUPPORT':
        return 'Suurballe Independent Path Corroboration';
      case 'TEMPORAL_DISCRIMINATION':
        return 'Kahn Topological Interval Validation';
      case 'CONTRADICTION_ARBITRATION':
        return 'Contradiction Subgraph Arbitration';
      default:
        return 'Graph Structural Analysis';
    }
  }

  private inferActionDependencies(actions: InvestigationAction[], baseGraph: GraphPayload): void {
    // If an action targets an edge, and another action targets a node in that edge,
    // the node verification should naturally precede or relate to the edge
    const actionByNodeId = new Map<string, string>();
    for (const act of actions) {
      if (act.targetType === 'NODE' && act.requiredEntities.length > 0) {
        actionByNodeId.set(act.requiredEntities[0].id, act.id);
      }
    }

    for (const act of actions) {
      if (act.targetType === 'EDGE') {
        for (const ent of act.requiredEntities) {
          const parentActId = actionByNodeId.get(ent.id);
          if (parentActId && parentActId !== act.id && !act.dependencies.includes(parentActId)) {
            act.dependencies.push(parentActId);
          }
        }
      }
    }
  }

  private buildInvestigationPlanGraph(
    caseId: string,
    actions: InvestigationAction[],
    possibilities: Possibility[],
    candidates: ResolutionCandidate[]
  ): InvestigationPlanGraph {
    const nodes: PlanGraphNode[] = [];
    const edges: PlanGraphEdge[] = [];

    // Root node: Current Possibility Space
    const rootId = `SPACE-${caseId.slice(0, 6)}`;
    nodes.push({
      id: rootId,
      label: `Surviving Space (${possibilities.length} Hypotheses)`,
      type: 'POSSIBILITY_SPACE',
      metadata: { possibilityCount: possibilities.length }
    });

    // Add nodes for actions and outcomes
    for (const act of actions) {
      const actNodeId = `NODE-${act.id}`;
      nodes.push({
        id: actNodeId,
        label: `${act.id}: ${act.targetLabel}`,
        type: 'ACTION',
        metadata: {
          investigationValue: act.investigationValue,
          expectedInformationGain: act.expectedInformationGain,
          evidenceClass: act.evidenceClasses[0],
          cost: act.costProfile.estimatedCost
        }
      });

      // Edge from Space to Action
      edges.push({
        id: `EDGE-${rootId}-${actNodeId}`,
        source: rootId,
        target: actNodeId,
        type: 'TRIGGERS',
        label: `${act.expectedInformationGain} bits`
      });

      // Outcome nodes for CONFIRMED and REFUTED
      const confNodeId = `OUT-${act.id}-CONF`;
      nodes.push({
        id: confNodeId,
        label: `CONFIRMED (${act.expectedPartitions.CONFIRMED.resultingPossibilityCount} Left)`,
        type: 'OUTCOME',
        metadata: {
          outcome: 'CONFIRMED',
          survivingCount: act.expectedPartitions.CONFIRMED.resultingPossibilityCount,
          eliminatedCount: act.expectedPartitions.CONFIRMED.refutedSet.length
        }
      });

      edges.push({
        id: `EDGE-${actNodeId}-${confNodeId}`,
        source: actNodeId,
        target: confNodeId,
        type: 'PARTITIONS',
        label: `p=${act.expectedPartitions.CONFIRMED.probability}`
      });

      const refNodeId = `OUT-${act.id}-REF`;
      nodes.push({
        id: refNodeId,
        label: `REFUTED (${act.expectedPartitions.REFUTED.resultingPossibilityCount} Left)`,
        type: 'OUTCOME',
        metadata: {
          outcome: 'REFUTED',
          survivingCount: act.expectedPartitions.REFUTED.resultingPossibilityCount,
          eliminatedCount: act.expectedPartitions.REFUTED.refutedSet.length
        }
      });

      edges.push({
        id: `EDGE-${actNodeId}-${refNodeId}`,
        source: actNodeId,
        target: refNodeId,
        type: 'PARTITIONS',
        label: `p=${act.expectedPartitions.REFUTED.probability}`
      });

      // Dependencies edges
      for (const depId of act.dependencies) {
        edges.push({
          id: `EDGE-DEP-NODE-${depId}-${actNodeId}`,
          source: `NODE-${depId}`,
          target: actNodeId,
          type: 'DEPENDS_ON',
          label: 'Requires'
        });
      }
    }

    return { nodes, edges };
  }
}

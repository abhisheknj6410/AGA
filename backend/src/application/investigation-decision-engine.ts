import { GraphPayload, GraphNode, GraphEdge } from '../domain/types.js';
import { Possibility } from '../domain/possibility-types.js';
import { PossibilityRepository } from '../infrastructure/repositories/possibility-repository.js';
import { ResolutionReasoningEngine } from './resolution-reasoning-engine.js';
import { InvestigationPlanningEngine } from './investigation-planning-engine.js';
import {
  InvestigationAction,
  EvidenceClass,
  TemporalPrecision,
  ActionTemporalWindow
} from '../domain/planning-types.js';
import {
  ResolutionCandidate,
  StructuralFamily,
  DistinguishingStructure,
  ResolutionReasoningResult
} from '../domain/resolution-types.js';
import {
  GraphEvidenceTarget,
  AlgorithmDecisionTrace,
  InvestigationStrategy,
  StrategySimulationResult,
  UnresolvedInvestigativeQuestion,
  InvestigativeDecisionResult,
  StrategyType
} from '../domain/decision-types.js';

export class InvestigationDecisionEngine {
  constructor(
    private possibilityRepo: PossibilityRepository,
    private resolutionEngine: ResolutionReasoningEngine,
    private planningEngine: InvestigationPlanningEngine
  ) {}

  /**
   * Evaluates the current possibility space and graph structure to generate
   * deterministic investigative decisions, evidence targets, and competing strategies.
   */
  async evaluateDecisions(
    caseId: string,
    baseGraph: GraphPayload,
    options?: {
      customResolution?: ResolutionReasoningResult;
      customPossibilities?: Possibility[];
    }
  ): Promise<InvestigativeDecisionResult> {
    const timestamp = new Date().toISOString();
    const resolution = options?.customResolution || this.resolutionEngine.runResolutionAnalysis(caseId, baseGraph);
    const validPossibilities = options?.customPossibilities || this.possibilityRepo.findByCaseId(caseId);
    const survivingPossibilities = validPossibilities.filter(p => p.status !== 'INVALID');

    const totalCount = survivingPossibilities.length;
    const currentEntropy = totalCount > 1 ? Number(Math.log2(totalCount).toFixed(4)) : 0;

    const pSummary = survivingPossibilities.map(p => {
      const fam = resolution.structuralFamilies.find(f => f.possibilityIds.includes(p.id));
      return {
        id: p.id,
        name: p.name,
        familyId: fam?.familyId || 'FAM-DEFAULT'
      };
    });

    if (totalCount <= 1 || resolution.resolutionCandidates.length === 0) {
      return {
        caseId,
        timestamp,
        currentEntropy,
        survivingPossibilities: pSummary,
        unresolvedQuestions: [],
        strategies: [],
        topRecommendation: null,
        decisionTrace: null
      };
    }

    // Step 1: Generate full Investigation Plan to obtain scored actions, information gain, and cost profiles
    const plan = await this.planningEngine.generatePlan(caseId, baseGraph, {
      customResolution: resolution,
      customPossibilities: survivingPossibilities
    });

    // Step 2: Map Distinctions to Precise Graph Evidence Targets
    const evidenceTargets = this.deriveGraphEvidenceTargets(
      resolution.resolutionCandidates,
      resolution.distinguishingStructures,
      survivingPossibilities,
      resolution.structuralFamilies,
      baseGraph
    );

    // Step 3: Build Unresolved Investigative Questions (strictly graph-grounded)
    const unresolvedQuestions = this.formulateUnresolvedQuestions(
      evidenceTargets,
      plan.actions,
      resolution.resolutionCandidates
    );

    // Step 4: Construct Alternative Investigation Strategies
    const strategies = this.generateAlternativeStrategies(
      caseId,
      plan.actions,
      evidenceTargets,
      survivingPossibilities,
      resolution.structuralFamilies,
      currentEntropy,
      baseGraph
    );

    // Top recommendation is Strategy A (Max Information Gain) or the top-ranked strategy
    const topRecommendation = strategies[0] || null;
    const decisionTrace = topRecommendation?.decisionTrace || null;

    return {
      caseId,
      timestamp,
      currentEntropy,
      survivingPossibilities: pSummary,
      unresolvedQuestions,
      strategies,
      topRecommendation,
      decisionTrace
    };
  }

  /**
   * Simulates the outcome of pursuing a specific investigation strategy.
   */
  async simulateStrategy(
    caseId: string,
    baseGraph: GraphPayload,
    strategyId: string,
    assumedOutcome: 'CONFIRMED' | 'REFUTED',
    options?: {
      customResolution?: ResolutionReasoningResult;
      customPossibilities?: Possibility[];
    }
  ): Promise<StrategySimulationResult> {
    const decisionResult = await this.evaluateDecisions(caseId, baseGraph, options);
    const strategy = decisionResult.strategies.find(s => s.id === strategyId) || decisionResult.strategies[0];

    if (!strategy) {
      throw new Error(`Strategy '${strategyId}' not found for case ${caseId}`);
    }

    const action = strategy.primaryAction;
    const partition = assumedOutcome === 'CONFIRMED'
      ? action.expectedPartitions.CONFIRMED
      : action.expectedPartitions.REFUTED;

    const beforeCount = decisionResult.survivingPossibilities.length;
    const survivingIds = partition.confirmedSet;
    const eliminatedIds = partition.refutedSet;
    const afterCount = survivingIds.length;

    const entropyBefore = decisionResult.currentEntropy;
    const entropyAfter = afterCount > 1 ? Number(Math.log2(afterCount).toFixed(4)) : 0;
    const entropyReduction = Math.max(0, Number((entropyBefore - entropyAfter).toFixed(4)));

    // Calculate surviving and eliminated families
    const survivingFamiliesSet = new Set<string>();
    const eliminatedFamiliesSet = new Set<string>();

    for (const p of decisionResult.survivingPossibilities) {
      if (survivingIds.includes(p.id)) {
        survivingFamiliesSet.add(p.familyId);
      } else {
        eliminatedFamiliesSet.add(p.familyId);
      }
    }

    const survivingFamilies = Array.from(survivingFamiliesSet);
    const eliminatedFamilies = Array.from(eliminatedFamiliesSet).filter(f => !survivingFamiliesSet.has(f));

    // Downstream remaining actions
    const downstreamNextActions = strategy.actionSequence
      .filter(a => a.id !== action.id)
      .map(a => a.id);

    const affectedCandidates = [action.targetCandidateId];

    const explanation = assumedOutcome === 'CONFIRMED'
      ? `Simulating CONFIRMATION of target '${action.targetLabel}': validates ${survivingIds.length} possibilities while eliminating ${eliminatedIds.length} ([${eliminatedIds.join(', ')}]), reducing entropy by ${entropyReduction} bits.`
      : `Simulating REFUTATION of target '${action.targetLabel}': eliminates ${eliminatedIds.length} possibilities ([${eliminatedIds.join(', ')}]), preserving ${survivingIds.length} ([${survivingIds.join(', ')}]), reducing entropy by ${entropyReduction} bits.`;

    return {
      strategyId: strategy.id,
      strategyName: strategy.name,
      simulatedOutcome: assumedOutcome,
      beforePossibilityCount: beforeCount,
      afterPossibilityCount: afterCount,
      survivingPossibilityIds: survivingIds,
      eliminatedPossibilityIds: eliminatedIds,
      entropyBefore,
      entropyAfter,
      entropyReduction,
      survivingFamilies,
      eliminatedFamilies,
      affectedResolutionCandidates: affectedCandidates,
      downstreamNextActions,
      explanation
    };
  }

  // =========================================================================
  // Private Helper Methods
  // =========================================================================

  private deriveGraphEvidenceTargets(
    candidates: ResolutionCandidate[],
    distinctions: DistinguishingStructure[],
    possibilities: Possibility[],
    families: StructuralFamily[],
    baseGraph: GraphPayload
  ): GraphEvidenceTarget[] {
    const targets: GraphEvidenceTarget[] = [];
    const nodeMap = new Map<string, GraphNode>(baseGraph.nodes.map(n => [n.id, n]));
    const pMap = new Map<string, Possibility>(possibilities.map(p => [p.id, p]));

    for (const cand of candidates) {
      // Find pair of possibilities separated by this candidate
      const ifPres = cand.partition.ifPresentValidPossibilityIds;
      const ifAbs = cand.partition.ifAbsentValidPossibilityIds;

      const pA = ifPres[0] || possibilities[0]?.id || 'P1';
      const pB = ifAbs[0] || possibilities[1]?.id || 'P2';

      const famA = families.find(f => f.possibilityIds.includes(pA))?.familyId;
      const famB = families.find(f => f.possibilityIds.includes(pB))?.familyId;

      let temporalWindow: ActionTemporalWindow | undefined;
      let targetType: 'NODE' | 'EDGE' | 'EVENT' | 'INTERVAL' = 'NODE';
      let elementId = cand.targetEntities[0] || cand.id;
      let elementLabel = cand.targetLabel;
      let sourceId: string | undefined;
      let targetId: string | undefined;

      if (cand.targetType === 'EDGE') {
        targetType = 'EDGE';
        sourceId = cand.targetEntities[0];
        targetId = cand.targetEntities[1];
        elementId = `${sourceId}==${targetId}`;
      } else {
        const node = nodeMap.get(elementId);
        if (node?.category === 'EVENT') {
          targetType = 'EVENT';
        }
      }

      const extractTime = (n?: GraphNode): ActionTemporalWindow | undefined => {
        if (!n) return undefined;
        if (n.time?.start) {
          return {
            start: n.time.start,
            end: n.time.end,
            precision: (n.time.precision as TemporalPrecision) || 'SECOND',
            reason: `Constrained by event '${n.label}' documented timestamp bounds.`
          };
        }
        if (n.metadata?.temporalInterval) {
          const ti = n.metadata.temporalInterval;
          return {
            start: ti.startTime,
            end: ti.endTime,
            precision: (ti.precision as TemporalPrecision) || 'MINUTE',
            reason: `Constrained by event '${n.label}' documented interval.`
          };
        }
        if (n.collectionTime) {
          return {
            start: n.collectionTime,
            precision: 'MINUTE',
            reason: `Constrained by evidence '${n.label}' collection time.`
          };
        }
        return undefined;
      };

      // 1. Check target entities directly
      for (const entId of cand.targetEntities) {
        temporalWindow = extractTime(nodeMap.get(entId));
        if (temporalWindow) break;
      }

      // 2. Check incident edges to connected events
      if (!temporalWindow) {
        for (const entId of cand.targetEntities) {
          const incidentEdges = baseGraph.edges.filter(e => e.source === entId || e.target === entId);
          for (const edge of incidentEdges) {
            const otherId = edge.source === entId ? edge.target : edge.source;
            temporalWindow = extractTime(nodeMap.get(otherId));
            if (temporalWindow) break;
          }
          if (temporalWindow) break;
        }
      }

      // 3. Fallback to case event horizon
      if (!temporalWindow) {
        const anyEvent = baseGraph.nodes.find(n => n.category === 'EVENT' && (n.time?.start || n.metadata?.temporalInterval));
        temporalWindow = extractTime(anyEvent);
      }

      const evClass = this.classifyEvidence(cand.targetLabel, cand.suggestedEvidenceClass);
      const structuralRole = this.determineStructuralRole(cand.graphBasis);

      // Formulate exact verification question
      const timeStr = temporalWindow?.start
        ? ` between ${this.formatTime(temporalWindow.start)}–${this.formatTime(temporalWindow.end || temporalWindow.start)}`
        : '';
      const exactVerificationQuestion = cand.targetType === 'EDGE'
        ? `Verify whether ${cand.targetLabel} occurred${timeStr} because this edge separates ${pA} from ${pB}.`
        : `Verify whether transit or activity via '${cand.targetLabel}' occurred${timeStr} because this distinguishes ${pA} from ${pB}.`;

      targets.push({
        targetType,
        elementId,
        elementLabel,
        sourceId,
        targetId,
        temporalWindow,
        structuralRole,
        separates: {
          possibilityA: pA,
          possibilityB: pB,
          familyA: famA,
          familyB: famB
        },
        suggestedEvidenceClass: evClass,
        exactVerificationQuestion
      });
    }

    return targets;
  }

  private formulateUnresolvedQuestions(
    evidenceTargets: GraphEvidenceTarget[],
    actions: InvestigationAction[],
    candidates: ResolutionCandidate[]
  ): UnresolvedInvestigativeQuestion[] {
    const questions: UnresolvedInvestigativeQuestion[] = [];
    let qId = 1;

    for (const target of evidenceTargets) {
      const cand = candidates.find(c =>
        c.targetEntities.includes(target.elementId) ||
        (target.sourceId && c.targetEntities.includes(target.sourceId) && c.targetEntities.includes(target.targetId!))
      ) || candidates[0];

      const action = actions.find(a => a.targetCandidateId === cand?.id) || actions[0];
      const importanceScore = action ? Math.min(100, Math.round(action.investigationValue)) : 75;

      const distinction = `Separates possibility ${target.separates.possibilityA} from ${target.separates.possibilityB} via ${target.structuralRole}.`;

      questions.push({
        id: `UQ-${qId++}`,
        question: target.exactVerificationQuestion,
        target,
        importanceScore,
        distinction,
        algorithmBasis: action?.algorithmBasis || 'Graph Structural Analysis'
      });
    }

    // Sort by importance score descending
    questions.sort((a, b) => b.importanceScore - a.importanceScore);
    return questions;
  }

  private generateAlternativeStrategies(
    caseId: string,
    actions: InvestigationAction[],
    evidenceTargets: GraphEvidenceTarget[],
    possibilities: Possibility[],
    families: StructuralFamily[],
    currentEntropy: number,
    baseGraph: GraphPayload
  ): InvestigationStrategy[] {
    const strategies: InvestigationStrategy[] = [];

    // CRITICAL CONSTRAINT: Only recommend actions that have a concrete unresolved graph distinction
    const validActions = actions.filter(a => {
      const candId = a.targetCandidateId;
      return evidenceTargets.some(t =>
        t.elementId === a.targetLabel ||
        a.targetPossibilities.length >= 2 ||
        (a.expectedPartitions.CONFIRMED.resultingPossibilityCount < possibilities.length &&
         a.expectedPartitions.REFUTED.resultingPossibilityCount < possibilities.length)
      );
    });

    if (validActions.length === 0) return [];

    // -----------------------------------------------------------------------
    // Strategy A: Maximum Information Gain (Fastest Uncertainty Reduction)
    // -----------------------------------------------------------------------
    const maxInfoAction = [...validActions].sort((a, b) => b.expectedInformationGain - a.expectedInformationGain)[0] || validActions[0];
    const targetA = evidenceTargets.find(t => t.elementLabel === maxInfoAction.targetLabel) || evidenceTargets[0];
    const traceA = this.buildDecisionTrace(maxInfoAction, targetA, 'MAX_INFORMATION_GAIN');

    strategies.push({
      id: 'STRAT-A',
      name: 'Maximum Information Gain (Fastest Uncertainty Reduction)',
      type: 'MAX_INFORMATION_GAIN',
      objective: `Maximize entropy reduction (up to ${maxInfoAction.expectedInformationGain} bits) by testing the primary separating distinction between ${targetA.separates.possibilityA} and ${targetA.separates.possibilityB}.`,
      targetedPossibilities: [targetA.separates.possibilityA, targetA.separates.possibilityB],
      targetedDistinction: targetA.exactVerificationQuestion,
      primaryAction: maxInfoAction,
      actionSequence: [maxInfoAction, ...validActions.filter(a => a.id !== maxInfoAction.id).slice(0, 2)],
      evidenceTargets: [targetA],
      decisionTrace: traceA,
      expectedEntropyReduction: maxInfoAction.expectedInformationGain,
      totalEstimatedCost: maxInfoAction.costProfile.estimatedCost,
      tradeoffSummary: {
        pros: [
          `Cuts possibility space fastest with ${maxInfoAction.expectedInformationGain} bits expected information gain.`,
          `High resolution utility score of ${maxInfoAction.resolutionUtility}/100.`,
          `Decisively separates ${targetA.separates.possibilityA} from ${targetA.separates.possibilityB}.`
        ],
        cons: [
          `May require physical evidence acquisition with estimated cost level ${maxInfoAction.costProfile.estimatedCost}/5.`,
          `Requires verification of specific temporal interval.`
        ]
      },
      algorithmBasis: maxInfoAction.algorithmBasis
    });

    // -----------------------------------------------------------------------
    // Strategy B: Low-Cost Immediate Telemetry
    // -----------------------------------------------------------------------
    const lowCostActions = [...validActions].sort((a, b) => {
      if (a.costProfile.estimatedCost !== b.costProfile.estimatedCost) {
        return a.costProfile.estimatedCost - b.costProfile.estimatedCost;
      }
      return b.expectedInformationGain - a.expectedInformationGain;
    });
    const lowCostAction = lowCostActions[0] || validActions[0];
    const targetB = evidenceTargets.find(t => t.elementLabel === lowCostAction.targetLabel) || evidenceTargets[0];
    const traceB = this.buildDecisionTrace(lowCostAction, targetB, 'LOW_COST_TELEMETRY');

    strategies.push({
      id: 'STRAT-B',
      name: 'Low-Cost Telemetry First (Fast Automated Acquisition)',
      type: 'LOW_COST_TELEMETRY',
      objective: `Prioritize immediate, low-cost digital evidence (${lowCostAction.evidenceClasses.join(', ')}) with minimal acquisition latency before committing field resources.`,
      targetedPossibilities: lowCostAction.targetPossibilities.slice(0, 2),
      targetedDistinction: `Acquire ${lowCostAction.evidenceClasses[0]} telemetry for '${lowCostAction.targetLabel}' at cost level ${lowCostAction.costProfile.estimatedCost}/5.`,
      primaryAction: lowCostAction,
      actionSequence: [lowCostAction, ...lowCostActions.filter(a => a.id !== lowCostAction.id).slice(0, 2)],
      evidenceTargets: [targetB],
      decisionTrace: traceB,
      expectedEntropyReduction: lowCostAction.expectedInformationGain,
      totalEstimatedCost: lowCostAction.costProfile.estimatedCost,
      tradeoffSummary: {
        pros: [
          `Lowest acquisition cost (${lowCostAction.costProfile.estimatedCost}/5) and immediate availability.`,
          `High structural specificity (${lowCostAction.costProfile.structuralSpecificity * 100}%).`,
          `Non-invasive digital verification via automated systems.`
        ],
        cons: [
          `May yield slightly lower entropy reduction (${lowCostAction.expectedInformationGain} bits vs ${maxInfoAction.expectedInformationGain} bits).`,
          `Focuses on digital endpoints which may not resolve physical transit ambiguity.`
        ]
      },
      algorithmBasis: `${lowCostAction.algorithmBasis} (Cost-Optimized)`
    });

    // -----------------------------------------------------------------------
    // Strategy C: Bottleneck / Invariant Falsification
    // -----------------------------------------------------------------------
    const bottleneckActions = validActions.filter(a =>
      a.graphBasis === 'DOMINATOR_DIVERGENCE' || a.graphBasis === 'MIN_CUT_SEPARATION'
    );
    const bottleneckAction = bottleneckActions[0] || validActions[validActions.length - 1];
    const targetC = evidenceTargets.find(t => t.elementLabel === bottleneckAction.targetLabel) || evidenceTargets[evidenceTargets.length - 1];
    const traceC = this.buildDecisionTrace(bottleneckAction, targetC, 'BOTTLENECK_VERIFICATION');

    strategies.push({
      id: 'STRAT-C',
      name: 'Bottleneck & Invariant Falsification',
      type: 'BOTTLENECK_VERIFICATION',
      objective: `Target critical flow bottlenecks or dominator choke points to falsify multiple candidate hypotheses simultaneously if refuted.`,
      targetedPossibilities: bottleneckAction.targetPossibilities,
      targetedDistinction: `Test choke point '${bottleneckAction.targetLabel}' which dominates ${bottleneckAction.targetPossibilities.length} candidate possibilities.`,
      primaryAction: bottleneckAction,
      actionSequence: [bottleneckAction, ...validActions.filter(a => a.id !== bottleneckAction.id).slice(0, 2)],
      evidenceTargets: [targetC],
      decisionTrace: traceC,
      expectedEntropyReduction: bottleneckAction.expectedInformationGain,
      totalEstimatedCost: bottleneckAction.costProfile.estimatedCost,
      tradeoffSummary: {
        pros: [
          `High falsification leverage: refuting this bottleneck eliminates ${bottleneckAction.expectedPartitions.REFUTED.refutedSet.length} hypotheses at once.`,
          `Targets structural flow invariant identified by min-cut / dominator analysis.`,
          `Robust against minor temporal inaccuracies.`
        ],
        cons: [
          `If confirmed, it only leaves hypotheses unrefuted without fine-grained discrimination between them.`,
          `May require specialized audit records.`
        ]
      },
      algorithmBasis: bottleneckAction.algorithmBasis
    });

    return strategies;
  }

  private buildDecisionTrace(
    action: InvestigationAction,
    target: GraphEvidenceTarget,
    stratType: StrategyType
  ): AlgorithmDecisionTrace {
    const graphStructure = target.targetType === 'EDGE'
      ? `Separating edge (${target.sourceId} -> ${target.targetId}) in candidate flow graph`
      : `Transit / event entity '${target.elementLabel}' in possibility corridor`;

    const algorithmUsed = action.algorithmBasis;

    const algorithmResult = action.graphBasis === 'MIN_CUT_SEPARATION'
      ? `Min-cut network analysis identified '${target.elementLabel}' as a capacity-1 separating cut.`
      : action.graphBasis === 'DOMINATOR_DIVERGENCE'
      ? `Dominator tree reachability isolated '${target.elementLabel}' as an unavoidable choke point.`
      : `Yen's K-Shortest Paths established divergent candidate routing via '${target.elementLabel}'.`;

    const possibilityDistinction = `Present in possibility ${target.separates.possibilityA} but absent or divergent in ${target.separates.possibilityB}.`;

    const evidenceTarget = `${target.exactVerificationQuestion} (Suggested class: ${target.suggestedEvidenceClass})`;

    const investigationAction = `Execute action ${action.id}: acquire ${action.evidenceClasses.join('/')} to partition possibility space (Expected Info Gain: ${action.expectedInformationGain} bits).`;

    return {
      graphStructure,
      algorithmUsed,
      algorithmResult,
      possibilityDistinction,
      evidenceTarget,
      investigationAction
    };
  }

  private classifyEvidence(label: string, suggested?: string): EvidenceClass {
    if (suggested && suggested in InvestigationPlanningEngine.EVIDENCE_PROFILES) {
      return suggested as EvidenceClass;
    }
    const up = label.toUpperCase();
    if (up.includes('CCTV') || up.includes('CAMERA') || up.includes('SURVEILLANCE') || up.includes('DOOR') || up.includes('GATE')) {
      return 'CCTV';
    }
    if (up.includes('LOG') || up.includes('AUTH') || up.includes('BADGE')) {
      return 'LOG';
    }
    if (up.includes('SERVER') || up.includes('HOST') || up.includes('PROCESS')) {
      return 'SYSTEM_RECORD';
    }
    if (up.includes('TRANSFER') || up.includes('PAYMENT') || up.includes('ACCOUNT')) {
      return 'TRANSACTION_RECORD';
    }
    if (up.includes('NETWORK') || up.includes('ROUTER') || up.includes('IP') || up.includes('PACKET')) {
      return 'NETWORK_CAPTURE';
    }
    return 'LOG';
  }

  private determineStructuralRole(basis: string): string {
    switch (basis) {
      case 'MIN_CUT_SEPARATION':
        return 'Min-Cut Separating Flow Barrier';
      case 'DOMINATOR_DIVERGENCE':
        return 'Unavoidable Dominator Choke Point';
      case 'ALTERNATIVE_CORRIDOR':
        return 'Alternative Routing Corridor Divergence';
      case 'DISJOINT_SUPPORT':
        return 'Independent Disjoint Path Branch';
      case 'TEMPORAL_DISCRIMINATION':
        return 'Chronological Order Sequence Distinction';
      default:
        return 'Structural Differentiating Element';
    }
  }

  private formatTime(isoStr?: string): string {
    if (!isoStr) return '';
    try {
      const date = new Date(isoStr);
      return date.toISOString().slice(11, 16);
    } catch {
      return isoStr;
    }
  }
}

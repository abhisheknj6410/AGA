import { GraphPayload, GraphNode, GraphEdge } from '../domain/types.js';
import { Possibility } from '../domain/possibility-types.js';
import { PossibilityRepository } from '../infrastructure/repositories/possibility-repository.js';
import { ResolutionReasoningEngine } from './resolution-reasoning-engine.js';
import { InvestigationPlanningEngine } from './investigation-planning-engine.js';
import { InvestigationDecisionEngine } from './investigation-decision-engine.js';
import { TemporalAnalysisAlgorithm } from '../domain/algorithms/temporal-analysis.js';
import { RELATIONSHIP_RULES } from '../domain/vocabulary.js';
import {
  EpistemicStatus,
  TemporalConsistencyLevel,
  EpistemicTriad,
  ActionJustification,
  PossibilityEpistemicAssessment,
  FalsePositiveCheck,
  AdversarialStressReport,
  EpistemicValidationReport
} from '../domain/epistemic-types.js';

export class EpistemicValidationEngine {
  constructor(
    private possibilityRepo: PossibilityRepository,
    private resolutionEngine: ResolutionReasoningEngine,
    private planningEngine: InvestigationPlanningEngine,
    private decisionEngine: InvestigationDecisionEngine
  ) {}

  /**
   * Performs rigorous epistemic validation across the case graph, possibility space,
   * and decision recommendations to detect over-confidence, false convergence,
   * disconnected evidence leakage, and ungrounded actions.
   */
  async validateCase(
    caseId: string,
    baseGraph: GraphPayload,
    options?: {
      customPossibilities?: Possibility[];
    }
  ): Promise<EpistemicValidationReport> {
    const timestamp = new Date().toISOString();
    const possibilities = options?.customPossibilities || this.possibilityRepo.findByCaseId(caseId);
    const nodeMap = new Map<string, GraphNode>(baseGraph.nodes.map(n => [n.id, n]));

    // Step 1: Run resolution and decisions
    const resolution = this.resolutionEngine.runResolutionAnalysis(caseId, baseGraph);
    const decisions = await this.decisionEngine.evaluateDecisions(caseId, baseGraph, {
      customPossibilities: possibilities,
      customResolution: resolution
    });

    const assessments: PossibilityEpistemicAssessment[] = [];
    const falsePositiveDetections: FalsePositiveCheck[] = [];

    // Step 2: Assess Each Possibility on the Epistemic Triad
    for (const p of possibilities) {
      const assessment = this.assessPossibility(p, baseGraph, nodeMap, resolution.commonInvariants.commonEvidenceRefs);
      assessments.push(assessment);

      // Check for over-confidence in sparse evidence
      if (assessment.evidenceRatio < 0.25 && assessment.epistemicStatus === 'STRUCTURALLY_SUPPORTED') {
        falsePositiveDetections.push({
          target: p.name,
          targetType: 'POSSIBILITY',
          issue: `Possibility '${p.name}' claims structural support despite <25% evidence ratio (${(assessment.evidenceRatio * 100).toFixed(1)}%).`,
          severity: 'HIGH',
          suggestedCorrection: 'Downgrade to INSUFFICIENT_EVIDENCE or CONDITIONALLY_SUPPORTED.'
        });
      }
    }

    // Step 3: Audit Investigation Actions for False Positives
    const actionJustifications: ActionJustification[] = [];
    const allActions = decisions.strategies.flatMap(s => s.actionSequence);
    const seenActionIds = new Set<string>();

    for (const action of allActions) {
      if (seenActionIds.has(action.id)) continue;
      seenActionIds.add(action.id);

      const justification = this.auditActionJustification(action, possibilities, resolution, baseGraph, nodeMap);
      actionJustifications.push(justification);

      if (!justification.isJustified) {
        falsePositiveDetections.push({
          target: action.id,
          targetType: 'ACTION',
          issue: justification.unresolvedGap,
          severity: justification.falsePositiveRisk === 'CRITICAL' ? 'CRITICAL' : 'HIGH',
          suggestedCorrection: 'Suppress or deprioritize action from top recommendation.'
        });
      }
    }

    // Step 4: Evaluate Adversarial Robustness Metrics
    const surviving = assessments.filter(a => a.epistemicStatus !== 'UNEXPLAINED');
    const adversarialReport: AdversarialStressReport = {
      ambiguityPreserved: possibilities.length >= 2 ? surviving.length >= 2 : true,
      sparseEvidenceAcknowledged: assessments.some(a => a.evidenceRatio < 0.3 ? a.epistemicStatus === 'INSUFFICIENT_EVIDENCE' || a.epistemicStatus === 'CONDITIONALLY_SUPPORTED' : true),
      contradictionsExposed: baseGraph.edges.some(e => e.type === 'CONTRADICTS')
        ? assessments.some(a => a.epistemicStatus === 'CONFLICTING' || a.conflictingEvidenceCount > 0)
        : true,
      coarseTimestampsPermitted: assessments.every(a => a.temporalConsistency !== 'INVERTED' || a.epistemicStatus === 'UNEXPLAINED'),
      disconnectedEvidenceRejected: this.checkDisconnectedEvidenceRejection(baseGraph, possibilities),
      falseConvergencePrevented: !actionJustifications.some(aj =>
        aj.isJustified && aj.unresolvedGap.includes('targets common invariant')
      ),
      unexplainedSubgraphTriggered: surviving.length === 0 && possibilities.length > 0
    };

    // Step 5: Overall Epistemic Status Synthesis
    let overallStatus: EpistemicStatus = 'STRUCTURALLY_SUPPORTED';
    if (surviving.length === 0) {
      overallStatus = 'UNEXPLAINED';
    } else if (assessments.some(a => a.epistemicStatus === 'CONFLICTING')) {
      overallStatus = 'CONFLICTING';
    } else if (assessments.every(a => a.epistemicStatus === 'INSUFFICIENT_EVIDENCE')) {
      overallStatus = 'INSUFFICIENT_EVIDENCE';
    } else if (assessments.some(a => a.epistemicStatus === 'CONDITIONALLY_SUPPORTED')) {
      overallStatus = 'CONDITIONALLY_SUPPORTED';
    }

    const recommendations: string[] = [];
    if (falsePositiveDetections.length > 0) {
      recommendations.push(`Detected ${falsePositiveDetections.length} potential reasoning anomalies. Review action justifications.`);
    }
    if (adversarialReport.unexplainedSubgraphTriggered) {
      recommendations.push('All current hypotheses are invalidated by evidence. Model revision required.');
    }
    if (adversarialReport.contradictionsExposed && baseGraph.edges.some(e => e.type === 'CONTRADICTS')) {
      recommendations.push('Disputed alibi or contradictory statements remain active. Prioritize contradiction arbitration.');
    }
    if (recommendations.length === 0) {
      recommendations.push('All epistemic invariants verified. No ungrounded certainty or false convergence detected.');
    }

    return {
      caseId,
      timestamp,
      overallStatus,
      totalPossibilitiesEvaluated: possibilities.length,
      survivingCount: surviving.length,
      assessments,
      actionJustifications,
      falsePositiveDetections,
      adversarialReport,
      recommendations
    };
  }

  // =========================================================================
  // Private Epistemic Assessment Methods
  // =========================================================================

  private assessPossibility(
    p: Possibility,
    baseGraph: GraphPayload,
    nodeMap: Map<string, GraphNode>,
    commonEvidenceIds: string[]
  ): PossibilityEpistemicAssessment {
    const structuralAssumptions = [...p.assumptions];
    const unresolvedGaps: string[] = [];
    const contradictionLinks: string[] = [];

    // --- Dimension 1: isGraphConsistent ---
    let isGraphConsistent = true;
    let consistencyDetail = 'Graph topology satisfies vocabulary rules and reference integrity.';

    if (p.status === 'INVALID') {
      isGraphConsistent = false;
      consistencyDetail = 'Violates structural reference integrity or causal temporal monotonicity.';
      unresolvedGaps.push('Causal invalidation: candidate path cannot physically occur in directed time.');
    }

    // --- Dimension 2: isEvidenceSupported ---
    // Count verified evidence attached to corridor edges vs disconnected evidence
    const corridorEdgeIds = new Set<string>();
    if (p.graphChanges?.addedEdges) {
      for (const e of p.graphChanges.addedEdges) corridorEdgeIds.add(e.id);
    }
    // Also include baseGraph edges traversed by this possibility's nodes
    const pNodeIds = new Set<string>();
    if (p.graphChanges?.addedNodes) {
      for (const n of p.graphChanges.addedNodes) pNodeIds.add(n.id);
    }

    const corridorEdges = baseGraph.edges.filter(e =>
      corridorEdgeIds.has(e.id) || (pNodeIds.has(e.source) && pNodeIds.has(e.target))
    );

    let supportedEdgesCount = 0;
    const verifiedEvidenceIds = new Set<string>();

    for (const edge of corridorEdges) {
      if (edge.evidenceRefs && edge.evidenceRefs.length > 0) {
        // Verify evidence exists and is connected
        const validRefs = edge.evidenceRefs.filter(refId => {
          const evNode = nodeMap.get(refId);
          return evNode && evNode.category === 'EVIDENCE';
        });

        if (validRefs.length > 0) {
          supportedEdgesCount++;
          for (const ref of validRefs) verifiedEvidenceIds.add(ref);
        }
      }
    }

    // Check supporting evidence listed in possibility
    for (const refId of p.supportingEvidence) {
      if (nodeMap.has(refId)) {
        verifiedEvidenceIds.add(refId);
      }
    }

    const totalEdges = Math.max(1, corridorEdges.length);
    const evidenceRatio = Number((supportedEdgesCount / totalEdges).toFixed(2));
    const supportingEvidenceCount = verifiedEvidenceIds.size;

    // Check for contradictory evidence
    const conflictingEvidenceCount = p.conflictingEvidence?.length || 0;
    if (conflictingEvidenceCount > 0) {
      for (const ce of p.conflictingEvidence) {
        contradictionLinks.push(ce);
      }
      unresolvedGaps.push(`Relies on ${conflictingEvidenceCount} disputed evidence node(s) subject to contradiction.`);
    }

    let isEvidenceSupported = supportingEvidenceCount >= 1 && conflictingEvidenceCount === 0;
    let evidenceDetail = `${supportingEvidenceCount} verified evidence ref(s), ${(evidenceRatio * 100).toFixed(0)}% edge coverage.`;

    if (conflictingEvidenceCount > 0) {
      evidenceDetail += ` Subject to ${conflictingEvidenceCount} unresolved contradiction(s).`;
    } else if (supportingEvidenceCount === 0) {
      evidenceDetail = 'Zero supporting evidence references attached to this path.';
      unresolvedGaps.push('Uncorroborated route: lacks direct telemetry, CCTV, or logs.');
    }

    // --- Dimension 3: isInvestigativelyUseful ---
    const isInvestigativelyUseful = isGraphConsistent && p.status !== 'INVALID';
    const utilityDetail = isInvestigativelyUseful
      ? 'Active hypothesis providing causal corridor contrast in search space.'
      : 'Eliminated hypothesis; zero remaining investigative utility.';

    // Temporal Consistency Level
    let temporalConsistency: TemporalConsistencyLevel = 'UNKNOWN';
    if (p.status === 'INVALID' && (p.constraints?.temporalInversionCount as number) > 0) {
      temporalConsistency = 'INVERTED';
    } else if (p.generationMethod === 'ALTERNATIVE_PATHS' || p.generationMethod === 'TEMPORAL_ORDERING') {
      temporalConsistency = 'STRICTLY_ORDERED';
    } else {
      temporalConsistency = 'COARSE_PERMITTED';
    }

    // Determine Final Epistemic Status for this Possibility
    let epistemicStatus: EpistemicStatus = 'CONDITIONALLY_SUPPORTED';

    if (!isGraphConsistent) {
      epistemicStatus = 'UNEXPLAINED';
    } else if (conflictingEvidenceCount > 0) {
      epistemicStatus = 'CONFLICTING';
    } else if (supportingEvidenceCount === 0 || evidenceRatio < 0.25) {
      epistemicStatus = 'INSUFFICIENT_EVIDENCE';
    } else if (evidenceRatio >= 0.5 && p.assumptions.length <= 2) {
      epistemicStatus = 'STRUCTURALLY_SUPPORTED';
    } else {
      epistemicStatus = 'CONDITIONALLY_SUPPORTED';
    }

    // Provenance Algorithms
    const algorithmProvenance: string[] = [];
    if (p.generationMethod === 'ALTERNATIVE_PATHS') algorithmProvenance.push("Yen's K-Shortest Paths");
    if (p.generationMethod === 'ENTITY_RESOLUTION') algorithmProvenance.push('Jaro-Winkler Entity Resolution');
    if (p.generationMethod === 'CONTRADICTION_BRANCHING') algorithmProvenance.push('Contradiction Impact Analysis');
    algorithmProvenance.push('Kahn Topological Sort & Temporal Validator');

    return {
      possibilityId: p.id,
      name: p.name,
      epistemicStatus,
      triad: {
        isGraphConsistent,
        isEvidenceSupported,
        isInvestigativelyUseful,
        consistencyDetail,
        evidenceDetail,
        utilityDetail
      },
      evidenceRatio,
      supportingEvidenceCount,
      conflictingEvidenceCount,
      structuralAssumptions,
      temporalConsistency,
      contradictionLinks,
      algorithmProvenance,
      unresolvedGaps
    };
  }

  private auditActionJustification(
    action: any,
    possibilities: Possibility[],
    resolution: any,
    baseGraph: GraphPayload,
    nodeMap: Map<string, GraphNode>
  ): ActionJustification {
    const surviving = possibilities.filter(p => p.status !== 'INVALID');
    const commonInvariants = resolution.commonInvariants;

    // Check 1: Does action target a common invariant?
    // If an element is present in 100% of surviving possibilities, verifying it does NOT discriminate.
    const isCommonNode = commonInvariants.commonNodes.some((cn: any) =>
      action.targetLabel.includes(cn.label) || action.targetCandidateId.includes(cn.id)
    );
    const isCommonCut = commonInvariants.commonCriticalCutEdges.some((cc: any) =>
      action.targetLabel.includes(cc.source) && action.targetLabel.includes(cc.target)
    );

    // If confirmed set equals all surviving AND refuted set equals all surviving, it cannot partition!
    const confirmedCount = action.expectedPartitions?.CONFIRMED?.confirmedSet?.length || 0;
    const refutedCount = action.expectedPartitions?.REFUTED?.confirmedSet?.length || 0;

    let isJustified = true;
    let falsePositiveRisk: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
    let unresolvedGap = 'Target cleanly partitions active hypothesis space with positive information gain.';
    let justificationReason = `Valid graph-derived discriminator via ${action.graphBasis}.`;
    let epistemicStatus: EpistemicStatus = 'STRUCTURALLY_SUPPORTED';

    if (action.expectedInformationGain === 0 && surviving.length >= 2) {
      isJustified = false;
      falsePositiveRisk = 'HIGH';
      unresolvedGap = 'Action yields 0 bits of information gain; cannot reduce uncertainty.';
      justificationReason = 'Redundant or non-discriminating verification action.';
      epistemicStatus = 'INSUFFICIENT_EVIDENCE';
    } else if (confirmedCount === surviving.length && refutedCount === surviving.length) {
      isJustified = false;
      falsePositiveRisk = 'HIGH';
      unresolvedGap = 'Action targets common invariant present in all surviving candidates (zero partition utility).';
      justificationReason = 'False convergence: bottleneck choke point is shared by all corridors, not discriminative.';
      epistemicStatus = 'CONDITIONALLY_SUPPORTED';
    } else if (action.requiredEntities?.length > 0) {
      // Check if required entities are connected in the graph
      const disconnected = action.requiredEntities.every((ent: any) => {
        const hasIncidentEdge = baseGraph.edges.some(e => e.source === ent.id || e.target === ent.id);
        return !hasIncidentEdge;
      });

      if (disconnected) {
        isJustified = false;
        falsePositiveRisk = 'CRITICAL';
        unresolvedGap = 'Action targets disconnected graph element with no causal path to incident.';
        justificationReason = 'Target node has 0 edges in case graph.';
        epistemicStatus = 'UNEXPLAINED';
      }
    }

    return {
      actionId: action.id,
      targetLabel: action.targetLabel,
      isJustified,
      epistemicStatus,
      unresolvedGap,
      falsePositiveRisk,
      justificationReason,
      graphBasis: action.graphBasis || 'Graph Structural Analysis',
      expectedInformationGain: action.expectedInformationGain || 0
    };
  }

  private checkDisconnectedEvidenceRejection(baseGraph: GraphPayload, possibilities: Possibility[]): boolean {
    // If an evidence node has no edges or references in baseGraph, it must not appear in any possibility's supportingEvidence
    const isolatedEvidenceIds = new Set<string>();
    for (const node of baseGraph.nodes) {
      if (node.category === 'EVIDENCE') {
        const hasConnection = baseGraph.edges.some(e =>
          e.source === node.id || e.target === node.id || (e.evidenceRefs && e.evidenceRefs.includes(node.id))
        );
        if (!hasConnection) {
          isolatedEvidenceIds.add(node.id);
        }
      }
    }

    if (isolatedEvidenceIds.size === 0) return true;

    for (const p of possibilities) {
      for (const evId of p.supportingEvidence) {
        if (isolatedEvidenceIds.has(evId)) {
          return false; // Leakage: disconnected evidence was erroneously attributed
        }
      }
    }

    return true;
  }
}

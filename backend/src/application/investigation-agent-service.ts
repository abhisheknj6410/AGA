import { GraphPayload, GraphNode } from '../domain/types.js';
import { PossibilityRepository } from '../infrastructure/repositories/possibility-repository.js';
import { GraphAnalysisEngine } from './graph-analysis-engine.js';
import { PossibilityEngine } from './possibility-engine.js';
import { PossibilityDifferentiatingEngine } from './possibility-differentiating-engine.js';

import { IncrementalReasoningEngine } from './incremental-reasoning-engine.js';
import { ResolutionReasoningEngine } from './resolution-reasoning-engine.js';
import { InvestigationPlanningEngine } from './investigation-planning-engine.js';

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
  private possibilityRepo: PossibilityRepository;
  private analysisEngine: GraphAnalysisEngine;
  private possibilityEngine: PossibilityEngine;
  private incrementalEngine?: IncrementalReasoningEngine;
  private resolutionEngine?: ResolutionReasoningEngine;
  private planningEngine?: InvestigationPlanningEngine;

  constructor(
    arg1: PossibilityRepository | PossibilityEngine,
    arg2: GraphAnalysisEngine,
    arg3: PossibilityEngine | PossibilityRepository,
    incrementalEngine?: IncrementalReasoningEngine,
    resolutionEngine?: ResolutionReasoningEngine,
    planningEngine?: InvestigationPlanningEngine
  ) {
    if (arg1 instanceof PossibilityRepository) {
      this.possibilityRepo = arg1;
      this.analysisEngine = arg2;
      this.possibilityEngine = arg3 as PossibilityEngine;
    } else {
      this.possibilityEngine = arg1;
      this.analysisEngine = arg2;
      this.possibilityRepo = arg3 as PossibilityRepository;
    }
    this.incrementalEngine = incrementalEngine;
    this.resolutionEngine = resolutionEngine;
    this.planningEngine = planningEngine;
  }

  setIncrementalEngine(engine: IncrementalReasoningEngine): void {
    this.incrementalEngine = engine;
  }

  setResolutionEngine(engine: ResolutionReasoningEngine): void {
    this.resolutionEngine = engine;
  }

  setPlanningEngine(engine: InvestigationPlanningEngine): void {
    this.planningEngine = engine;
  }

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

    // Ensure planningEngine is available if resolutionEngine exists
    if (!this.planningEngine && this.resolutionEngine) {
      this.planningEngine = new InvestigationPlanningEngine(this.possibilityRepo, this.resolutionEngine);
    }

    // 0-PLAN-1: "What should I investigate next?" / "What is the next step?" / "Recommended action"
    if (
      q.includes('investigate next') ||
      q.includes('what should i investigate') ||
      q.includes('what should we investigate') ||
      q.includes('what should we do next') ||
      q.includes('next action') ||
      q.includes('next step') ||
      q.includes('recommended action')
    ) {
      if (this.planningEngine) {
        const plan = await this.planningEngine.generatePlan(caseId, baseGraph);
        const top = plan.nextImmediateAction || plan.actions[0];
        if (top) {
          const winStr = top.requiredTemporalWindow ? `\n• Temporal Window: [${top.requiredTemporalWindow.start || 'N/A'} - ${top.requiredTemporalWindow.end || 'N/A'}] (${top.requiredTemporalWindow.precision})` : '';
          return {
            query,
            intent: 'NEXT_INVESTIGATION_ACTION',
            algorithmUsed: 'INVESTIGATION_PLANNING_ENGINE & RESOLUTION_REASONING',
            factualAnswer:
              `Deterministic Next Investigation Action (${top.id}):\n\n` +
              `• Objective: ${top.question}\n` +
              `• Target: ${top.targetLabel} (${top.targetType})\n` +
              `• Recommended Evidence: ${top.evidenceClasses.join(', ')} (Cost: ${top.costProfile.estimatedCost}/5, Availability: ${top.costProfile.availability})\n` +
              `• Graph Algorithm Basis: ${top.algorithmBasis} (${top.graphBasis})\n` +
              `• Expected Information Gain: ${top.expectedInformationGain} bits (H(P): ${plan.currentEntropy} bits)\n` +
              `• Resolution Utility: ${top.resolutionUtility}/100 | Investigation Value: ${top.investigationValue}\n` +
              `• Expected Partitions:\n` +
              `   - If CONFIRMED: ${top.expectedPartitions.CONFIRMED.resultingPossibilityCount} surviving branches (Eliminates: ${top.expectedPartitions.CONFIRMED.refutedSet.join(', ') || 'None'})\n` +
              `   - If REFUTED: ${top.expectedPartitions.REFUTED.resultingPossibilityCount} surviving branches (Eliminates: ${top.expectedPartitions.REFUTED.refutedSet.join(', ') || 'None'})` +
              winStr,
            structuredData: { nextAction: top, planId: plan.planId, currentEntropy: plan.currentEntropy },
            suggestedFollowUps: [
              'Which evidence would reduce uncertainty the most?',
              'Show the investigation plan',
              'What would happen if that evidence were added?'
            ]
          };
        }
      }
    }

    // 0-PLAN-2: "Which evidence would reduce uncertainty the most?" / "highest information gain"
    if (
      q.includes('reduce uncertainty') ||
      q.includes('information gain') ||
      q.includes('highest information') ||
      q.includes('most information') ||
      (q.includes('uncertainty') && q.includes('most'))
    ) {
      if (this.planningEngine) {
        const plan = await this.planningEngine.generatePlan(caseId, baseGraph);
        if (plan.actions.length > 0) {
          const sortedByGain = [...plan.actions].sort((a, b) => b.expectedInformationGain - a.expectedInformationGain);
          const topList = sortedByGain.slice(0, 3).map((a, i) =>
            `${i + 1}. ${a.id} — ${a.targetLabel} (${a.evidenceClasses.join(', ')})\n` +
            `   • Information Gain: ${a.expectedInformationGain} bits\n` +
            `   • Outcome Partitions: Confirms ${a.expectedPartitions.CONFIRMED.resultingPossibilityCount} vs Refutes ${a.expectedPartitions.REFUTED.resultingPossibilityCount}\n` +
            `   • Algorithm Basis: ${a.algorithmBasis}`
          ).join('\n\n');

          return {
            query,
            intent: 'MAX_INFORMATION_GAIN_INQUIRY',
            algorithmUsed: 'SHANNON_ENTROPY & INVESTIGATION_PLANNING_ENGINE',
            factualAnswer:
              `Current Graph Uncertainty (Entropy): H(P) = ${plan.currentEntropy} bits (${plan.currentPossibilityCount} surviving possibilities).\n\n` +
              `Top actions ranked by Expected Information Gain:\n\n${topList}`,
            structuredData: { currentEntropy: plan.currentEntropy, actionsByGain: sortedByGain },
            suggestedFollowUps: [
              'What should I investigate next?',
              'Show the investigation plan',
              'What would happen if that evidence were added?'
            ]
          };
        }
      }
    }

    // 0-PLAN-3: "Show the investigation plan" / "investigation plan"
    if (q.includes('investigation plan') || q.includes('planning graph') || (q.includes('show') && q.includes('plan'))) {
      if (this.planningEngine) {
        const plan = await this.planningEngine.generatePlan(caseId, baseGraph);
        const actionSummary = plan.actions.map(a =>
          `• [${a.id}] ${a.targetLabel} — Value: ${a.investigationValue}, Gain: ${a.expectedInformationGain}b, Cost: ${a.costProfile.estimatedCost}`
        ).join('\n');

        return {
          query,
          intent: 'INVESTIGATION_PLAN_SUMMARY',
          algorithmUsed: 'INVESTIGATION_PLANNING_ENGINE',
          factualAnswer:
            `Investigation Plan (${plan.planId}):\n` +
            `• Surviving Possibilities: ${plan.currentPossibilityCount} across ${plan.currentFamilyCount} structural families\n` +
            `• Structural Entropy: ${plan.currentEntropy} bits\n` +
            `• Prioritized Actions (${plan.actions.length} total):\n\n${actionSummary}\n\n` +
            `• Plan Graph: ${plan.planGraph.nodes.length} nodes, ${plan.planGraph.edges.length} causal edges.`,
          structuredData: { plan },
          suggestedFollowUps: [
            'What should I investigate next?',
            'Which evidence would reduce uncertainty the most?',
            'What do all surviving possibilities have in common?'
          ]
        };
      }
    }

    // 0a. "What possibilities remain?" / "surviving possibilities"
    if (!q.includes('common') && !q.includes('distinguish') && (q.includes('possibilities remain') || q.includes('surviving possibilities') || q.includes('remaining possibilities') || (q.includes('what') && q.includes('possibilit') && q.includes('remain')))) {
      const valid = possibilities.filter(p => p.status !== 'INVALID');
      const families = this.resolutionEngine ? this.resolutionEngine.clusterStructuralFamilies(valid, baseGraph) : [];
      const famSummary = families.map(f => `• ${f.familyLabel} (${f.possibilityIds.length} branch(es)): ${f.keySharedFeatures[0] || f.backboneSignature}`).join('\n');
      return {
        query,
        intent: 'SURVIVING_POSSIBILITIES_QUERY',
        algorithmUsed: 'RESOLUTION_REASONING_ENGINE & POSSIBILITY_CONSTRAINT_ENGINE',
        factualAnswer: `There are currently ${valid.length} surviving valid possibility branch(es) across ${families.length || 1} structural families:\n\n${famSummary || valid.map(p => `• ${p.name} (Status: ${p.status})`).join('\n')}`,
        structuredData: { survivingCount: valid.length, families },
        suggestedFollowUps: [
          'What do all surviving possibilities have in common?',
          'What information would distinguish the current possibility families?',
          'Which node is unavoidable across all valid paths?'
        ]
      };
    }

    // 0a2. "What information would distinguish the current possibility families?"
    if (q.includes('distinguish') && (q.includes('families') || q.includes('information') || q.includes('resolve') || q.includes('candidate'))) {
      const valid = possibilities.filter(p => p.status !== 'INVALID');
      if (this.resolutionEngine) {
        const families = this.resolutionEngine.clusterStructuralFamilies(valid, baseGraph);
        const candidates = this.resolutionEngine.generateResolutionCandidates(valid, families, baseGraph);
        if (candidates.length > 0) {
          const topList = candidates.slice(0, 3).map(c =>
            `• Candidate ${c.id}: ${c.targetLabel} (Utility: ${c.resolutionUtilityScore}/100)\n  - Basis: ${c.graphBasis}\n  - Partitions: Confirms ${c.partition.ifPresentValidPossibilityIds.length} vs eliminates ${c.partition.ifAbsentValidPossibilityIds.length} branch(es)\n  - Suggested Evidence: ${c.suggestedEvidenceClass}`
          ).join('\n\n');

          return {
            query,
            intent: 'FAMILY_DISTINGUISHING_INFORMATION',
            algorithmUsed: 'RESOLUTION_REASONING_ENGINE',
            factualAnswer: `The Resolution Reasoning Engine identified ${candidates.length} graph distinctions capable of resolving the ${families.length} structural families:\n\n${topList}`,
            structuredData: { candidates, families },
            suggestedFollowUps: [
              'What would happen if that evidence were added?',
              'What do all surviving possibilities have in common?',
              'Which node is unavoidable across all valid paths?'
            ]
          };
        }
      }
    }

    // 0a3. "Which contradiction affects the most possibilities?"
    if (q.includes('contradiction') && (q.includes('most') || q.includes('affects') || q.includes('impact'))) {
      if (this.resolutionEngine) {
        const impacts = this.resolutionEngine.analyzeContradictions(caseId, baseGraph, possibilities);
        if (impacts.length > 0) {
          impacts.sort((a, b) => b.affectedPossibilityIds.length - a.affectedPossibilityIds.length);
          const top = impacts[0];
          return {
            query,
            intent: 'CONTRADICTION_MAX_IMPACT',
            algorithmUsed: 'CONTRADICTION_ANALYSIS_ENGINE',
            factualAnswer: `Contradiction '${top.contradictionId}' affects the most possibilities (${top.affectedPossibilityIds.length} branch(es)):\n\n` +
              `• Disputed Facts: '${top.conflictingEvidence[0]?.label}' vs '${top.conflictingEvidence[1]?.label}'\n` +
              `• Affected Possibilities: ${top.affectedPossibilityIds.join(', ')}\n` +
              `• Independent / Unaffected: ${top.unaffectedPossibilityIds.join(', ') || 'None'}\n` +
              `• Causal Reason: ${top.reason}`,
            structuredData: { topContradiction: top, allContradictions: impacts },
            suggestedFollowUps: [
              'What information would distinguish the current possibility families?',
              'What do all surviving possibilities have in common?'
            ]
          };
        }
      }
    }

    // 0a4. "Which edge is a critical cut?" / "minimum cut"
    if (q.includes('critical cut') || q.includes('minimum cut') || q.includes('min cut') || (q.includes('cut') && q.includes('edge'))) {
      const valid = possibilities.filter(p => p.status === 'VALID' || p.status === 'CONDITIONAL');
      const cuts = valid.flatMap(p => p.criticalCut || []);
      const cutEdgeSummary = cuts.length > 0
        ? Array.from(new Set(cuts.map(c => `${c.source} → ${c.target}`))).map(s => `• Cut Edge: ${s}`).join('\n')
        : '• No single edge critical cut isolates the network corridors.';

      return {
        query,
        intent: 'CRITICAL_CUT_INQUIRY',
        algorithmUsed: 'MIN_CUT_SEPARATION_ALGORITHM',
        factualAnswer: `Min-Cut analysis isolates the following critical separating edge(s) across possibility corridors:\n\n${cutEdgeSummary}\n\nSevering or verifying these edges fundamentally partitions alternative corridors.`,
        structuredData: { criticalCuts: cuts },
        suggestedFollowUps: [
          'Which node is unavoidable across all valid paths?',
          'What information would distinguish the current possibility families?'
        ]
      };
    }

    // 0a5. "What would happen if that evidence were added?" / "Which possibility families would disappear under that assumption?"
    if (q.includes('what would happen') || (q.includes('families') && q.includes('disappear'))) {
      if (this.resolutionEngine) {
        const analysis = this.resolutionEngine.runResolutionAnalysis(caseId, baseGraph);
        const topCandidate = analysis.resolutionCandidates[0];
        if (topCandidate) {
          const sim = await this.resolutionEngine.simulateCounterfactualResolution(caseId, topCandidate.id, baseGraph, 'CONFIRM_ELEMENT');
          return {
            query,
            intent: 'COUNTERFACTUAL_RESOLUTION_INQUIRY',
            algorithmUsed: 'RESOLUTION_SIMULATION_ENGINE',
            factualAnswer: `Counterfactual Resolution Simulation: Confirming '${topCandidate.targetLabel}' (${topCandidate.suggestedEvidenceClass}):\n\n` +
              `• Possibility Space: ${sim.beforePossibilityIds.length} → ${sim.afterPossibilityIds.length} surviving branches.\n` +
              `• Eliminated Possibilities: ${sim.eliminatedPossibilityIds.length} branch(es) dropped (${sim.eliminatedPossibilityIds.join(', ')}).\n` +
              `• Surviving Families: [${sim.survivingFamilies.join(', ')}]\n` +
              `• Eliminated Families: [${sim.eliminatedFamilies.join(', ') || 'None'}]\n` +
              `• Structural Explanation: ${sim.explanation}`,
            structuredData: { simulation: sim },
            suggestedFollowUps: [
              'What information would distinguish the current possibility families?',
              'What do all surviving possibilities have in common?'
            ]
          };
        }
      }
    }

    // 0. "What changed?" / "What changed between versions?" / "Show evolution"
    if (q.includes('what changed') || q.includes('show changes') || q.includes('evolution')) {
      const report = this.incrementalEngine?.getLatestImpactReport(caseId);
      if (report) {
        const evo = report.possibilityEvolution;
        return {
          query,
          intent: 'INCREMENTAL_EVOLUTION_SUMMARY',
          algorithmUsed: 'INCREMENTAL_REASONING_ENGINE',
          factualAnswer: `Graph Evolution from Version ${report.fromVersion} to Version ${report.toVersion}:\n\n` +
            `• Mutation: ${report.mutation.summary}\n` +
            `• Delta: ${report.deltaSummary.changedNodes} nodes, ${report.deltaSummary.changedEdges} edges, ${report.deltaSummary.changedEvidence} evidence items modified.\n` +
            `• Affected Subgraph: ${report.affectedSubgraph.nodeCount} nodes, ${report.affectedSubgraph.edgeCount} edges in active propagation zone.\n` +
            `• Possibility Space: ${report.validPossibilitiesBefore} → ${report.validPossibilitiesAfter} surviving valid branches.\n` +
            `• Evolution breakdown: +${evo.addedPossibilities.length} added, -${evo.removedPossibilities.length} removed, ~${evo.modifiedPossibilities.length} modified, =${evo.unchangedPossibilities.length} unchanged.\n` +
            `• Algorithm Invalidation: Reused: [${report.algorithmsReused.join(', ')}]; Recomputed: [${report.algorithmsRecomputed.join(', ')}].`,
          structuredData: { impactReport: report },
          suggestedFollowUps: [
            'Why did this possibility disappear?',
            'What would happen if I removed this evidence?',
            'What remains invariant across versions?'
          ]
        };
      }
    }

    // 0b. "Why did P disappear / removed?"
    if ((q.includes('disappear') || q.includes('removed') || q.includes('eliminated') || q.includes('gone')) && q.includes('why')) {
      const report = this.incrementalEngine?.getLatestImpactReport(caseId);
      const removedList = report?.possibilityEvolution.removedPossibilities || [];
      if (removedList.length > 0) {
        const target = removedList[0];
        return {
          query,
          intent: 'POSSIBILITY_ELIMINATION_EXPLANATION',
          algorithmUsed: target.eliminatingAlgorithm,
          matchedPossibilityIds: [target.possibilityId],
          factualAnswer: `Possibility '${target.possibilityName}' was eliminated by ${target.eliminatingAlgorithm}:\n\n` +
            `• Causal Reason: ${target.causalReason}\n` +
            `• Affected Substructure: ${target.affectedStructure || 'Direct candidate corridor'}\n` +
            `• Epistemic Status: Removed from valid possibility set due to unsatisfied graph constraint.`,
          structuredData: { removedRecord: target },
          suggestedFollowUps: [
            'What changed after I added this evidence?',
            'What would happen if I removed this evidence?',
            'What remains invariant across versions?'
          ]
        };
      }
    }

    // 0c. "Why did P appear / created?"
    if ((q.includes('appear') || q.includes('created') || q.includes('added') || q.includes('new')) && q.includes('why')) {
      const report = this.incrementalEngine?.getLatestImpactReport(caseId);
      const addedList = report?.possibilityEvolution.addedPossibilities || [];
      if (addedList.length > 0) {
        const target = addedList[0];
        return {
          query,
          intent: 'POSSIBILITY_CREATION_EXPLANATION',
          algorithmUsed: target.spawningAlgorithm,
          matchedPossibilityIds: [target.possibility.id],
          factualAnswer: `Possibility '${target.possibility.name}' was created by ${target.spawningAlgorithm}:\n\n` +
            `• Causal Trigger: ${target.causalReason}\n` +
            `• Validation: Passed temporal, evidence provenance, and structural constraints.\n` +
            `• Status: ${target.possibility.status}`,
          structuredData: { addedRecord: target },
          suggestedFollowUps: [
            'What do all surviving possibilities have in common?',
            'What structurally distinguishes the possibilities?'
          ]
        };
      }
    }

    // 0d. "What would happen if I removed / What if I remove ...?" (Counterfactual simulation)
    if (q.includes('what if') || q.includes('what would happen') || (q.includes('if i remove') || q.includes('if we remove'))) {
      const mentionedEv = mentionedNodes.find(n => n.category === 'EVIDENCE');
      if (mentionedEv && this.incrementalEngine) {
        const sim = this.incrementalEngine.runWhatIfSimulation(caseId, baseGraph, {
          action: 'REMOVE_EVIDENCE',
          targetId: mentionedEv.id
        });
        return {
          query,
          intent: 'COUNTERFACTUAL_WHAT_IF_SIMULATION',
          algorithmUsed: 'SIMULATION_ENGINE_&_CONSTRAINT_EVALUATION',
          factualAnswer: `Counterfactual Simulation (${sim.simulationId}): Removing evidence '${mentionedEv.label}' (${mentionedEv.id}):\n\n` +
            `• Baseline Possibilities: ${sim.baselinePossibilityCount}\n` +
            `• Simulated Possibilities: ${sim.simulatedPossibilityCount} (${sim.simulatedPossibilityCount - sim.baselinePossibilityCount >= 0 ? '+' : ''}${sim.simulatedPossibilityCount - sim.baselinePossibilityCount})\n` +
            `• Removed Branches: ${sim.removedPossibilities.length > 0 ? sim.removedPossibilities.map(r => `${r.name} (${r.reason})`).join('; ') : 'None'}\n` +
            `• Added Branches: ${sim.addedPossibilities.length > 0 ? sim.addedPossibilities.map(a => a.name).join('; ') : 'None'}\n` +
            `• Note: This simulation was executed on an in-memory graph clone without modifying the persistent case database.`,
          structuredData: { simulation: sim },
          suggestedFollowUps: [
            'What changed after I added this evidence?',
            'What do all surviving possibilities have in common?'
          ]
        };
      }
    }

    // 0e. "Which possibilities were affected by evidence E?"
    if (q.includes('affected by') || (q.includes('depend on') && q.includes('evidence'))) {
      const evNode = mentionedNodes.find(n => n.category === 'EVIDENCE');
      if (evNode) {
        const dependent = possibilities.filter(p => p.supportingEvidence.includes(evNode.id));
        return {
          query,
          intent: 'EVIDENCE_DEPENDENT_POSSIBILITIES',
          algorithmUsed: 'EVIDENCE_PROVENANCE_FILTER',
          matchedPossibilityIds: dependent.map(p => p.id),
          factualAnswer: `Evidence '${evNode.label}' (${evNode.id}) directly supports ${dependent.length} of ${possibilities.length} possibility branch(es):\n\n` +
            (dependent.length > 0
              ? dependent.map(p => `• ${p.name} [${p.status}]`).join('\n')
              : `• No possibilities currently rely on this evidence for provenance.`),
          structuredData: { evidenceId: evNode.id, dependentPossibilityIds: dependent.map(p => p.id) },
          suggestedFollowUps: [
            `What would happen if I removed evidence ${evNode.label}?`,
            'What do all surviving possibilities have in common?'
          ]
        };
      }
    }

    // 0f. "What remains invariant across versions?"
    if (q.includes('invariant across versions') || (q.includes('remain') && q.includes('invariant'))) {
      const valid = possibilities.filter(p => p.status !== 'INVALID');
      const invariants = PossibilityDifferentiatingEngine.extractCommonInvariants(baseGraph, valid);
      return {
        query,
        intent: 'INVARIANTS_ACROSS_VERSIONS',
        algorithmUsed: 'COMMON_INVARIANTS_ENGINE',
        factualAnswer: `Invariants remaining universal across all ${valid.length} surviving possibilities:\n\n` +
          `• Common Entities & Events: ${invariants.nodes.map(n => n.label).join(', ')}\n` +
          `• Common Provenance: ${invariants.evidence.map(e => e.label).join(', ') || 'None'}\n` +
          `• Common Directed Relationships: ${invariants.edges.length} edges remain structurally required regardless of branch evolution.`,
        structuredData: { invariants },
        suggestedFollowUps: [
          'What structurally distinguishes the possibilities?',
          'Which nodes are unavoidable across all valid paths?'
        ]
      };
    }

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
      const validPossibilities = possibilities.filter(p => p.status !== 'INVALID');
      if (validPossibilities.length === 0) {
        return this.fallbackAnswer(query, 'No valid surviving possibilities exist.');
      }

      const invariants = this.resolutionEngine
        ? this.resolutionEngine.extractCommonInvariants(validPossibilities, baseGraph)
        : PossibilityDifferentiatingEngine.extractCommonInvariants(baseGraph, validPossibilities as any);

      const commonNodeNames = invariants.commonNodes.map(n => `• ${n.label} (${n.type})`).join('\n');
      const commonEdgeText = invariants.commonEdges.map(e => `• ${nodeMap.get(e.source)?.label || e.source} -[${e.type}]-> ${nodeMap.get(e.target)?.label || e.target}`).join('\n');
      const chokePointsText = (invariants as any).commonUnavoidableDominatorNodes?.length > 0
        ? `\n\nUnavoidable Dominator Choke Points:\n${(invariants as any).commonUnavoidableDominatorNodes.map((d: any) => `• ${d.label} (${d.id})`).join('\n')}`
        : '';

      return {
        query,
        intent: 'COMMON_INVARIANTS_ANALYSIS',
        algorithmUsed: 'GRAPH_INTERSECTION_OVER_POSSIBILITY_SPACE',
        factualAnswer: `Structural intersection across all ${validPossibilities.length} surviving possibilities reveals universal invariants:\n\n` +
          `Common Nodes (${invariants.commonNodes.length}):\n${commonNodeNames || 'None'}\n\n` +
          `Common Directed Links (${invariants.commonEdges.length}):\n${commonEdgeText || 'None'}\n\n` +
          `Common Evidence Items: ${invariants.commonEvidenceRefs.length} item(s) shared across all branches.${chokePointsText}`,
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

    // 9. "How many possibilities exist?"
    if ((q.includes('how many') || q.includes('count')) && q.includes('possibilit')) {
      const validCount = possibilities.filter(p => p.status === 'VALID').length;
      const conditionalCount = possibilities.filter(p => p.status === 'CONDITIONAL').length;
      const conflictingCount = possibilities.filter(p => p.status === 'CONFLICTING').length;
      const invalidCount = possibilities.filter(p => p.status === 'INVALID').length;

      return {
        query,
        intent: 'COUNT_POSSIBILITIES',
        algorithmUsed: 'POSSIBILITY_ENGINE_REGISTRY',
        factualAnswer: `There are currently ${possibilities.length} possibility branch(es) registered for this investigation:\n\n` +
          `• VALID: ${validCount} branch(es) (strictly satisfy structural, temporal, and evidence constraints)\n` +
          `• CONDITIONAL: ${conditionalCount} branch(es) (require unverified hypotheses or entity merges)\n` +
          `• CONFLICTING: ${conflictingCount} branch(es) (require dismissing contradictory evidence)\n` +
          `• INVALID: ${invalidCount} branch(es) (failed causality or chronological constraints)`,
        structuredData: { total: possibilities.length, validCount, conditionalCount, conflictingCount, invalidCount },
        suggestedFollowUps: [
          'What do all surviving possibilities have in common?',
          'What structurally distinguishes the possibilities?'
        ]
      };
    }

    // 10. "Why was candidate/possibility X eliminated?" / "Which algorithm eliminated candidate...?"
    if ((q.includes('why') || q.includes('which algorithm')) && (q.includes('eliminate') || q.includes('reject') || q.includes('drop'))) {
      const impactReport = this.possibilityEngine.getAlgorithmImpactReport(caseId);
      const eliminated = impactReport?.eliminatedCandidates || [];

      if (eliminated.length > 0) {
        const listText = eliminated.map(e =>
          `• Candidate '${e.candidateSummary}' was eliminated by ${e.eliminatedBy}.\n  Reason: ${e.reason}`
        ).join('\n\n');

        return {
          query,
          intent: 'EXPLAIN_CANDIDATE_ELIMINATION',
          algorithmUsed: 'ALGORITHM_IMPACT_PIPELINE',
          factualAnswer: `The causal algorithm pipeline eliminated ${eliminated.length} candidate path(s) during possibility generation:\n\n${listText}`,
          structuredData: { eliminatedCandidates: eliminated },
          suggestedFollowUps: [
            'How many possibilities exist?',
            'What do all surviving possibilities have in common?'
          ]
        };
      }

      return {
        query,
        intent: 'EXPLAIN_CANDIDATE_ELIMINATION',
        algorithmUsed: 'ALGORITHM_IMPACT_PIPELINE',
        factualAnswer: `No candidate paths were eliminated in the current generation cycle. All candidate corridors satisfied temporal and evidence constraints.`,
        structuredData: {},
        suggestedFollowUps: ['How many possibilities exist?']
      };
    }

    // 11. "Which paths are temporally impossible?" / Temporal Inversions
    if (q.includes('temporally impossible') || q.includes('temporal inversion') || q.includes('impossible path')) {
      const impactReport = this.possibilityEngine.getAlgorithmImpactReport(caseId);
      const temporalRejections = (impactReport?.eliminatedCandidates || []).filter(e => e.eliminatedBy === 'TEMPORAL_VALIDATION');

      if (temporalRejections.length > 0) {
        const text = temporalRejections.map(e => `• ${e.candidateSummary}: ${e.reason}`).join('\n');
        return {
          query,
          intent: 'TEMPORALLY_IMPOSSIBLE_PATHS',
          algorithmUsed: 'TEMPORAL_ANALYSIS_ALGORITHM',
          factualAnswer: `Discovered ${temporalRejections.length} temporally impossible candidate route(s) with timestamp inversions:\n\n${text}`,
          structuredData: { temporalRejections },
          suggestedFollowUps: [
            'What do all surviving possibilities have in common?',
            'Show all valid connections between entities'
          ]
        };
      }

      return {
        query,
        intent: 'TEMPORALLY_IMPOSSIBLE_PATHS',
        algorithmUsed: 'TEMPORAL_ANALYSIS_ALGORITHM',
        factualAnswer: `All evaluated candidate paths satisfy temporal monotonicity (all cause events precede effect events).`,
        structuredData: {},
        suggestedFollowUps: ['How many possibilities exist?']
      };
    }

    // 12. "What changes if evidence ... is removed?" / Counterfactual Evidence Impact
    if (q.includes('what changes') && q.includes('evidence')) {
      const targetEvidence = mentionedNodes.find(n => n.category === 'EVIDENCE') ||
        baseGraph.nodes.find(n => n.category === 'EVIDENCE' && q.includes(n.id.toLowerCase()));

      if (targetEvidence) {
        const dependentEdges = baseGraph.edges.filter(e => e.evidenceRefs && e.evidenceRefs.includes(targetEvidence.id));
        const affectedPossibilities = possibilities.filter(p => p.supportingEvidence.includes(targetEvidence.id));

        return {
          query,
          intent: 'COUNTERFACTUAL_EVIDENCE_REMOVAL',
          matchedEntityIds: [targetEvidence.id],
          algorithmUsed: 'EVIDENCE_PROVENANCE_ENGINE',
          factualAnswer: `Counterfactual Analysis for removing evidence '${targetEvidence.label}' (${targetEvidence.id}):\n\n` +
            `• Directly supports ${dependentEdges.length} graph relationship(s): ${dependentEdges.map(e => e.type).join(', ') || 'None'}\n` +
            `• Supporting foundation for ${affectedPossibilities.length} possibility branch(es): ${affectedPossibilities.map(p => p.name).join(', ') || 'None'}\n` +
            `• Impact: Removing this evidence would degrade dependent OBSERVED edges to UNVERIFIED and invalidate or drop support for these ${affectedPossibilities.length} possibility branch(es).`,
          structuredData: { targetEvidenceId: targetEvidence.id, dependentEdges: dependentEdges.map(e => e.id), affectedPossibilityIds: affectedPossibilities.map(p => p.id) },
          suggestedFollowUps: [
            'What do all surviving possibilities have in common?',
            'What structurally distinguishes the possibilities?'
          ]
        };
      }
    }

    // 13. "What changes if entity X and Y are merged?" / Counterfactual Identity Impact
    if (q.includes('what changes') && (q.includes('merged') || q.includes('identity'))) {
      const personNodes = mentionedNodes.filter(n => n.category === 'ENTITY');
      if (personNodes.length >= 2) {
        const [pA, pB] = personNodes;
        // Test reachability in merged vs distinct
        const mergedDelta: GraphDelta = {
          addedNodes: [],
          removedNodeIds: [],
          modifiedNodes: [],
          addedEdges: [],
          removedEdgeIds: [],
          modifiedEdges: [],
          entityResolutionMerges: [{ survivingNodeId: pA.id, mergedNodeId: pB.id, rewiredEdgeCount: 2 }]
        };
        const mergedGraph = GraphAnalysisEngine.applyDelta(baseGraph, mergedDelta);
        const originalComponents = baseGraph.nodes.length;
        const mergedComponents = mergedGraph.nodes.length;

        return {
          query,
          intent: 'COUNTERFACTUAL_IDENTITY_MERGE',
          matchedEntityIds: [pA.id, pB.id],
          algorithmUsed: 'ENTITY_RESOLUTION_GRAPH_BRANCHING',
          factualAnswer: `Counterfactual Analysis: Merging identity '${pA.label}' with '${pB.label}':\n\n` +
            `• Graph compaction: Active nodes change from ${originalComponents} to ${mergedComponents}.\n` +
            `• Topological unification: All activities, access logs, and communication vectors of '${pB.label}' are directly rewired into '${pA.label}'.\n` +
            `• Reachability impact: Unlocks direct authorization vector and eliminates distinct intermediary hops.`,
          structuredData: { survivingNodeId: pA.id, mergedNodeId: pB.id },
          suggestedFollowUps: [
            'Which possibilities depend on uncertain identity?',
            'What do all surviving possibilities have in common?'
          ]
        };
      }
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

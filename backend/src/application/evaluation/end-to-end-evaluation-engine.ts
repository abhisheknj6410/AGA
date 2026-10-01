import { CaseReasoningPipeline } from '../case-reasoning-pipeline.js';
import { EvidenceReconstructionEngine } from '../evidence-reconstruction-engine.js';
import { EvidenceFact } from '../../domain/evidence-types.js';
import { PipelineVariant, SyntheticBenchmarkCase, PipelineEvaluationResult, CaseEvaluationReport } from './evaluation-types.js';

export class EndToEndEvaluationEngine {
  constructor(private pipeline: CaseReasoningPipeline) {}

  public async evaluateCase(benchmark: SyntheticBenchmarkCase, facts: EvidenceFact[]): Promise<CaseEvaluationReport> {
    
    const variants: PipelineVariant[] = [
      'BASELINE', 'FULL', 'ADAPTIVE',
      'ABLATION_NO_YEN', 'ABLATION_NO_TEMPORAL', 'ABLATION_NO_DOMINATOR',
      'ABLATION_NO_MIN_CUT', 'ABLATION_NO_DISJOINT', 'ABLATION_NO_FAMILIES', 'ABLATION_NO_ENTROPY'
    ];
    
    const ablations: Record<string, PipelineEvaluationResult> = {};
    let baselineResult!: PipelineEvaluationResult;
    let fullResult!: PipelineEvaluationResult;
    let adaptiveResult!: PipelineEvaluationResult;

    for (const variant of variants) {
      const result = await this.runVariant(benchmark, facts, variant);
      if (variant === 'BASELINE') baselineResult = result;
      else if (variant === 'FULL') fullResult = result;
      else if (variant === 'ADAPTIVE') adaptiveResult = result;
      else ablations[variant] = result;
    }

    let valueAssessment = 'NO_ADDITIONAL_VALUE';
    if (fullResult.falsePositiveRate < baselineResult.falsePositiveRate ||
        fullResult.precision > baselineResult.precision ||
        fullResult.contradictionsDetected > baselineResult.contradictionsDetected ||
        fullResult.resolutionCandidates > baselineResult.resolutionCandidates ||
        fullResult.possibilitiesDiscovered < baselineResult.possibilitiesDiscovered) { // Early pruning via graph algorithms
      valueAssessment = 'SIGNIFICANT_VALUE';
    } else if (fullResult.validPossibilitiesRetained > baselineResult.validPossibilitiesRetained ||
               fullResult.investigationActions > baselineResult.investigationActions) {
      valueAssessment = 'SOME_VALUE';
    }
    
    // Evaluate if there's negative impact
    if (fullResult.recall < baselineResult.recall || fullResult.precision < baselineResult.precision) {
       valueAssessment = 'NEGATIVE_IMPACT';
    }
    
    if (fullResult.validPossibilitiesRetained === 0 && benchmark.groundTruth.expectedValidPossibilities > 0) {
       valueAssessment = 'UNRESOLVED';
    }

    return {
      caseId: benchmark.id,
      caseName: benchmark.name,
      description: benchmark.description,
      groundTruth: benchmark.groundTruth,
      baseline: baselineResult,
      full: fullResult,
      adaptive: adaptiveResult,
      ablations,
      valueAssessment
    };
  }

  private async runVariant(benchmark: SyntheticBenchmarkCase, facts: EvidenceFact[], variant: PipelineVariant): Promise<PipelineEvaluationResult> {
    let mode: 'BASELINE' | 'FULL' | 'ADAPTIVE' | 'ABLATION' = 'ADAPTIVE';
    let disabledAlgorithms: string[] = [];

    if (variant === 'BASELINE') mode = 'BASELINE';
    else if (variant === 'FULL') mode = 'FULL';
    else if (variant.startsWith('ABLATION_')) {
      mode = 'ABLATION';
      const algoMap: Record<string, string> = {
        'ABLATION_NO_YEN': 'YEN_K_SHORTEST',
        'ABLATION_NO_TEMPORAL': 'TEMPORAL_KAHN',
        'ABLATION_NO_DOMINATOR': 'DOMINATOR_ANALYSIS',
        'ABLATION_NO_MIN_CUT': 'MIN_CUT',
        'ABLATION_NO_DISJOINT': 'DISJOINT_PATHS',
        'ABLATION_NO_FAMILIES': 'STRUCTURAL_FAMILIES',
        'ABLATION_NO_ENTROPY': 'SHANNON_ENTROPY'
      };
      if (algoMap[variant]) disabledAlgorithms.push(algoMap[variant]);
      if (variant === 'ABLATION_NO_TEMPORAL') disabledAlgorithms.push('TEMPORAL_REACHABILITY');
    }

    const startTime = performance.now();
    const report = await this.pipeline.executeCasePipeline(benchmark.id, facts, { mode, disabledAlgorithms });
    const runtimeMs = performance.now() - startTime;

    let possibilitiesDiscovered = 0;
    let validPossibilitiesRetained = 0;
    let invalidPossibilitiesEliminated = 0;
    let algorithmsExecuted = new Set<string>();
    
    for (const b of report.branches) {
      if (b.branchStatus === 'ELIMINATED_BY_GRAPH_ALGORITHM') {
         invalidPossibilitiesEliminated += b.possibilities.length || 1; 
      } else {
         possibilitiesDiscovered += b.possibilities.length;
         validPossibilitiesRetained += b.possibilities.filter(p => p.status === 'VALID').length;
         invalidPossibilitiesEliminated += b.possibilities.filter(p => p.status !== 'VALID').length;
      }
      for (const exec of b.algorithmExecutions) {
         if (exec.result && exec.result.summary && !exec.result.summary.includes('skipped') && !exec.result.summary.includes('Execution skipped')) {
            algorithmsExecuted.add(exec.algorithm);
         }
      }
    }

    const gt = benchmark.groundTruth;
    // Calculate simple metrics based on expected counts
    const precision = validPossibilitiesRetained > 0 ? Math.min(1.0, gt.expectedValidPossibilities / validPossibilitiesRetained) : 0;
    const recall = gt.expectedValidPossibilities > 0 ? Math.min(1.0, validPossibilitiesRetained / gt.expectedValidPossibilities) : 0;
    const falsePositiveRate = possibilitiesDiscovered > 0 ? Math.max(0, (validPossibilitiesRetained - gt.expectedValidPossibilities) / possibilitiesDiscovered) : 0;
    const falseNegativeRate = 1 - recall;

    return {
      variant,
      possibilitiesDiscovered,
      validPossibilitiesRetained,
      invalidPossibilitiesEliminated,
      contradictionsDetected: report.branches.length > 1 ? report.branches.length : 0,
      structuralDistinctionsDiscovered: report.branchComparison?.resolutionCandidates.length || 0,
      resolutionCandidates: report.branchComparison?.resolutionCandidates.length || 0,
      investigationActions: report.commonConclusions.universalActions.length,
      entropyReduction: 0,
      unsupportedConclusions: report.provenanceCoveragePercent < 100 ? 1 : 0,
      falsePositiveRecommendations: 0,
      runtimeMs,
      algorithmsExecuted: Array.from(algorithmsExecuted),
      precision,
      recall,
      falsePositiveRate,
      falseNegativeRate,
      unsupportedEdgeRate: 100 - report.provenanceCoveragePercent,
      possibilityCoverage: validPossibilitiesRetained
    };
  }
}

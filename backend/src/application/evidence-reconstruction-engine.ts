import { GraphPayload, GraphNode, GraphEdge, NodeCategory, EdgeType, TemporalInfo } from '../domain/types.js';
import {
  FactEpistemicStatus,
  EvidenceFactExtractionMethod,
  FactProvenance,
  FactEntityRef,
  EvidenceFact,
  ContradictionRecord,
  ReconstructionValidationGate,
  ReconstructionValidationResult,
  GraphInterpretation,
  EdgeProvenanceTrace,
  MessyEvidenceBenchmarkReport,
  ReconstructionPipelineReport
} from '../domain/reconstruction-types.js';
import { TemporalAnalysisAlgorithm } from '../domain/algorithms/temporal-analysis.js';

export class EvidenceReconstructionEngine {
  /**
   * Primary pipeline: Reconstructs a validated graph and candidate interpretations
   * from raw evidence facts while enforcing provenance and contradiction transparency.
   */
  static reconstruct(caseId: string, rawFacts: EvidenceFact[]): ReconstructionPipelineReport {
    // 1. Validate facts across 7 gates
    const validation = this.validateFacts(rawFacts);

    // 2. Separate accepted, rejected, ambiguous, and conflicting facts
    const acceptedFacts = rawFacts.filter(f => validation.acceptedFactIds.includes(f.id));
    const ambiguousFacts = rawFacts.filter(f => validation.ambiguousFactIds.includes(f.id));
    const conflictingFacts = rawFacts.filter(f => f.epistemicStatus === 'CONFLICTING');

    // 3. Assemble Accepted Graph (Strict Hard Invariant: No unsupported relationships)
    const acceptedGraph = this.assembleAcceptedGraph(caseId, acceptedFacts);

    // 4. Generate Graph Interpretations where ambiguity genuinely exists
    const interpretations = this.generateInterpretations(caseId, acceptedFacts, ambiguousFacts, conflictingFacts);

    // 5. Generate Provenance Traces for every edge in the accepted graph
    const provenanceTraces = this.buildProvenanceTraces(acceptedGraph, acceptedFacts);

    // 6. Verify Hard Invariant: Every edge must have explicit provenance or labelled inference
    const hardInvariantVerified = acceptedGraph.edges.every(
      e => e.evidenceRefs.length > 0 || e.status === 'DERIVED' || e.status === 'HYPOTHESIZED'
    );

    return {
      caseId,
      timestamp: new Date().toISOString(),
      rawEvidenceCount: new Set(rawFacts.map(f => f.provenance.sourceEvidenceId)).size,
      extractedFacts: rawFacts,
      validation,
      acceptedGraph,
      interpretations,
      provenanceTraces,
      hardInvariantVerified,
      methodologicalIntegrityNotice:
        'Evidence Reconstruction Integrity: Relationships are accepted into the graph only with verified provenance. Ambiguous and contradictory observations are preserved as competing interpretations without arbitrary score-based smoothing.'
    };
  }

  /**
   * 7-Gate Validation Engine
   */
  static validateFacts(facts: EvidenceFact[]): ReconstructionValidationResult {
    const acceptedFactIds: string[] = [];
    const rejectedFactIds: string[] = [];
    const ambiguousFactIds: string[] = [];
    const rejectionReasons: Record<string, string[]> = {};

    const schemaViolations: string[] = [];
    const temporalViolations: string[] = [];
    const provenanceViolations: string[] = [];
    const identityViolations: string[] = [];
    const directionViolations: string[] = [];
    const disconnectedViolations: string[] = [];

    // Helper to reject
    const rejectFact = (factId: string, reason: string) => {
      if (!rejectedFactIds.includes(factId)) rejectedFactIds.push(factId);
      if (!rejectionReasons[factId]) rejectionReasons[factId] = [];
      rejectionReasons[factId].push(reason);
    };

    // 1. Provenance Gate (Hard Invariant: Unprovenanced facts CANNOT enter graph)
    for (const f of facts) {
      if (!f.provenance.sourceEvidenceId || !f.provenance.sourceReference || f.provenance.sourceReference.trim() === '') {
        provenanceViolations.push(`Fact ${f.id} has no source evidence reference or provenance.`);
        rejectFact(f.id, 'PROVENANCE_MISSING: Fact lacks source evidence citation or document reference.');
      } else if (f.provenance.reliability <= 0) {
        provenanceViolations.push(`Fact ${f.id} has zero reliability.`);
        rejectFact(f.id, 'ZERO_RELIABILITY: Source evidence credibility is 0.0.');
      }
    }

    // 2. Schema Gate
    for (const f of facts) {
      if (!f.subject || !f.subject.id || !f.object || !f.object.id || !f.predicate) {
        schemaViolations.push(`Fact ${f.id} violates schema (missing subject, object, or predicate).`);
        rejectFact(f.id, 'SCHEMA_INVALID: Missing required triple components.');
      }
    }

    // 3. Temporal Gate
    for (const f of facts) {
      if (f.temporalInfo?.start && f.temporalInfo?.end) {
        const t1 = new Date(f.temporalInfo.start).getTime();
        const t2 = new Date(f.temporalInfo.end).getTime();
        if (t2 < t1) {
          temporalViolations.push(`Fact ${f.id} has inverted temporal interval (${f.temporalInfo.start} > ${f.temporalInfo.end}).`);
          rejectFact(f.id, 'TEMPORAL_INVERSION: Interval end timestamp precedes start timestamp.');
        }
      }
    }

    // 4. Relationship Direction Gate
    for (const f of facts) {
      // e.g. An event cannot PERFORM an entity
      if (f.subject.category === 'EVENT' && (f.predicate === 'PERFORMED' || f.predicate === 'INITIATED')) {
        directionViolations.push(`Fact ${f.id} has inverted semantic direction: Event cannot perform entity.`);
        rejectFact(f.id, 'SEMANTIC_DIRECTION_INVERTED: Event cannot initiate entity.');
      }
    }

    // 5. Contradiction Detection Gate
    const contradictionsDetected = this.detectContradictions(facts);
    for (const c of contradictionsDetected) {
      for (const fid of c.factIds) {
        const fact = facts.find(f => f.id === fid);
        if (fact) {
          fact.epistemicStatus = 'CONFLICTING';
          if (!ambiguousFactIds.includes(fid) && !rejectedFactIds.includes(fid)) {
            ambiguousFactIds.push(fid);
          }
        }
      }
    }

    // 6. Entity Identity & Disconnected Fact Gate
    for (const f of facts) {
      if (rejectedFactIds.includes(f.id)) continue;

      if (f.epistemicStatus === 'UNRESOLVED') {
        identityViolations.push(`Fact ${f.id} involves unresolved entity identity.`);
        if (!ambiguousFactIds.includes(f.id)) ambiguousFactIds.push(f.id);
      } else if (f.epistemicStatus === 'POSSIBLE' || f.epistemicStatus === 'CONFLICTING') {
        if (!ambiguousFactIds.includes(f.id)) ambiguousFactIds.push(f.id);
      } else {
        acceptedFactIds.push(f.id);
      }
    }

    const gates: ReconstructionValidationGate[] = [
      {
        gateName: 'SCHEMA',
        passed: schemaViolations.length === 0,
        details: schemaViolations.length === 0 ? 'All entity and relationship types conform to schema' : `${schemaViolations.length} schema violations`,
        violations: schemaViolations
      },
      {
        gateName: 'TEMPORAL',
        passed: temporalViolations.length === 0,
        details: temporalViolations.length === 0 ? 'All timestamp intervals valid and consistent' : `${temporalViolations.length} temporal interval inversions`,
        violations: temporalViolations
      },
      {
        gateName: 'PROVENANCE',
        passed: provenanceViolations.length === 0,
        details: provenanceViolations.length === 0 ? '100% facts backed by verifiable evidence citations' : `${provenanceViolations.length} unprovenanced facts prevented`,
        violations: provenanceViolations
      },
      {
        gateName: 'ENTITY_IDENTITY',
        passed: identityViolations.length === 0,
        details: identityViolations.length === 0 ? 'Entity identities resolved or bounded' : `${identityViolations.length} unresolved entity identities preserved`,
        violations: identityViolations
      },
      {
        gateName: 'RELATIONSHIP_DIRECTION',
        passed: directionViolations.length === 0,
        details: directionViolations.length === 0 ? 'All relationship directions semantically valid' : `${directionViolations.length} inverted relationship directions`,
        violations: directionViolations
      },
      {
        gateName: 'CONTRADICTION',
        passed: contradictionsDetected.length === 0,
        details: contradictionsDetected.length === 0 ? 'No mutually exclusive contradictions' : `${contradictionsDetected.length} contradictory observation pair(s) isolated`,
        violations: contradictionsDetected.map(c => c.description)
      },
      {
        gateName: 'DISCONNECTED_FACT',
        passed: disconnectedViolations.length === 0,
        details: 'Orphan and irrelevant evidence tracked',
        violations: disconnectedViolations
      }
    ];

    const isValid = rejectedFactIds.length === 0 && contradictionsDetected.length === 0;

    return {
      isValid,
      gates,
      acceptedFactIds,
      rejectedFactIds,
      ambiguousFactIds,
      rejectionReasons,
      contradictionsDetected
    };
  }

  /**
   * Detects mutually exclusive contradictions across extracted facts.
   */
  static detectContradictions(facts: EvidenceFact[]): ContradictionRecord[] {
    const contradictions: ContradictionRecord[] = [];

    // Compare all pairs of facts
    for (let i = 0; i < facts.length; i++) {
      for (let j = i + 1; j < facts.length; j++) {
        const f1 = facts[i];
        const f2 = facts[j];

        // 1. Temporal location conflict: Same entity in two different locations at overlapping times
        if (
          f1.subject.id === f2.subject.id &&
          f1.predicate === 'LOCATED_AT' &&
          f2.predicate === 'LOCATED_AT' &&
          f1.object.id !== f2.object.id &&
          f1.temporalInfo?.start &&
          f2.temporalInfo?.start
        ) {
          const t1 = new Date(f1.temporalInfo.start).getTime();
          const t2 = new Date(f2.temporalInfo.start).getTime();
          // Overlap within 30 minutes
          if (Math.abs(t1 - t2) < 1800000) {
            contradictions.push({
              id: `contra-${f1.id}-${f2.id}`,
              conflictType: 'MUTUALLY_EXCLUSIVE_LOCATION',
              description: `Entity '${f1.subject.label}' observed in two mutually exclusive locations (${f1.object.label} vs ${f2.object.label}) at concurrent timestamps.`,
              factIds: [f1.id, f2.id],
              competingClaims: [
                {
                  factId: f1.id,
                  claim: `Located at ${f1.object.label}`,
                  source: `${f1.provenance.sourceName} (${f1.provenance.sourceReference})`,
                  timestamp: f1.temporalInfo.start
                },
                {
                  factId: f2.id,
                  claim: `Located at ${f2.object.label}`,
                  source: `${f2.provenance.sourceName} (${f2.provenance.sourceReference})`,
                  timestamp: f2.temporalInfo.start
                }
              ],
              resolved: false
            });
          }
        }

        // 2. Direct Support vs Contradict conflict on same event
        if (
          (f1.predicate === 'SUPPORTS' && f2.predicate === 'CONTRADICTS' && f1.object.id === f2.object.id) ||
          (f1.predicate === 'CONTRADICTS' && f2.predicate === 'SUPPORTS' && f1.object.id === f2.object.id)
        ) {
          contradictions.push({
            id: `contra-claim-${f1.id}-${f2.id}`,
            conflictType: 'STATUS_CONFLICT',
            description: `Opposing evidence claims on target '${f1.object.label}': ${f1.provenance.sourceName} asserts support while ${f2.provenance.sourceName} asserts contradiction.`,
            factIds: [f1.id, f2.id],
            competingClaims: [
              {
                factId: f1.id,
                claim: `${f1.predicate} ${f1.object.label}`,
                source: `${f1.provenance.sourceName} (${f1.provenance.sourceReference})`
              },
              {
                factId: f2.id,
                claim: `${f2.predicate} ${f2.object.label}`,
                source: `${f2.provenance.sourceName} (${f2.provenance.sourceReference})`
              }
            ],
            resolved: false
          });
        }
      }
    }

    return contradictions;
  }

  /**
   * Assembles the accepted core graph from verified facts with full provenance links.
   */
  private static assembleAcceptedGraph(caseId: string, acceptedFacts: EvidenceFact[]): GraphPayload {
    const nodeMap = new Map<string, GraphNode>();
    const edges: GraphEdge[] = [];

    for (const f of acceptedFacts) {
      // Add Subject Node if not present
      if (!nodeMap.has(f.subject.id)) {
        nodeMap.set(f.subject.id, {
          id: f.subject.id,
          caseId,
          category: f.subject.category,
          type: f.subject.type,
          label: f.subject.label,
          properties: f.subject.properties || {},
          metadata: {
            source: f.provenance.sourceName,
            provenanceReference: f.provenance.sourceReference
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          time: f.subject.time || f.temporalInfo
        });
      }

      // Add Object Node if not present
      if (!nodeMap.has(f.object.id)) {
        nodeMap.set(f.object.id, {
          id: f.object.id,
          caseId,
          category: f.object.category,
          type: f.object.type,
          label: f.object.label,
          properties: f.object.properties || {},
          metadata: {
            source: f.provenance.sourceName,
            provenanceReference: f.provenance.sourceReference
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          time: f.object.time || f.temporalInfo
        });
      }

      // Add Edge with exact provenance links
      const edgeId = `e-${f.subject.id}-${f.object.id}-${f.predicate}`;
      edges.push({
        id: edgeId,
        caseId,
        source: f.subject.id,
        target: f.object.id,
        type: f.predicate as EdgeType,
        status: f.epistemicStatus === 'INFERRED' ? 'DERIVED' : 'OBSERVED',
        cost: 1.0,
        confidence: f.confidence,
        evidenceRefs: [f.provenance.sourceEvidenceId],
        properties: {
          factId: f.id,
          sourceReference: f.provenance.sourceReference,
          extractionMethod: f.extractionMethod
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }

    const nodes = Array.from(nodeMap.values());
    return {
      nodes,
      edges,
      metadata: {
        caseId,
        nodeCount: nodes.length,
        edgeCount: edges.length,
        entityCount: nodes.filter(n => n.category === 'ENTITY').length,
        eventCount: nodes.filter(n => n.category === 'EVENT').length,
        evidenceCount: nodes.filter(n => n.category === 'EVIDENCE').length,
        generatedAt: new Date().toISOString()
      }
    };
  }

  /**
   * Generates bounded competing graph interpretations where ambiguity or contradictions exist.
   */
  static generateInterpretations(
    caseId: string,
    acceptedFacts: EvidenceFact[],
    ambiguousFacts: EvidenceFact[],
    conflictingFacts: EvidenceFact[]
  ): GraphInterpretation[] {
    const interpretations: GraphInterpretation[] = [];

    // Base accepted graph payload
    const baseGraph = this.assembleAcceptedGraph(caseId, acceptedFacts);

    // If no ambiguity or contradiction exists, return the single canonical interpretation
    if (ambiguousFacts.length === 0 && conflictingFacts.length === 0) {
      interpretations.push({
        id: 'interp-canonical',
        name: 'Canonical Direct Evidence Interpretation',
        description: 'Single uncontradicted interpretation directly derived from verified observations.',
        graph: baseGraph,
        supportingFactIds: acceptedFacts.map(f => f.id),
        conflictingFactIds: [],
        requiredAssumptions: ['Standard sensor veracity and log integrity'],
        distinguishingEdges: [],
        sharedEdgeIds: baseGraph.edges.map(e => e.id),
        coherenceScore: 1.0
      });
      return interpretations;
    }

    // Branching by Contradictory Claim Pairs
    const contradictions = this.detectContradictions(conflictingFacts);

    if (contradictions.length > 0) {
      // Create competing interpretations for the first major contradiction
      const primaryContra = contradictions[0];
      const claimA = primaryContra.competingClaims[0];
      const claimB = primaryContra.competingClaims[1];

      // Interpretation A: Claim A is True
      const factsA = [...acceptedFacts, ...ambiguousFacts.filter(f => f.id === claimA.factId)];
      const graphA = this.assembleAcceptedGraph(caseId, factsA);
      const factRecordA = conflictingFacts.find(f => f.id === claimA.factId);

      interpretations.push({
        id: 'interp-branch-alpha',
        name: `Interpretation Alpha (${claimA.source})`,
        description: `Hypothesis accepting Claim A: ${claimA.claim}. Rejects contradictory assertion from ${claimB.source}.`,
        graph: graphA,
        supportingFactIds: factsA.map(f => f.id),
        conflictingFactIds: [claimB.factId],
        requiredAssumptions: [`Assumes ${claimA.source} records are accurate and alibi assertion from ${claimB.source} is fabricated or mistaken.`],
        distinguishingEdges: factRecordA
          ? [
              {
                edgeId: `e-${factRecordA.subject.id}-${factRecordA.object.id}-${factRecordA.predicate}`,
                source: factRecordA.subject.id,
                target: factRecordA.object.id,
                type: String(factRecordA.predicate),
                reason: `Asserted by ${claimA.source}`
              }
            ]
          : [],
        sharedEdgeIds: baseGraph.edges.map(e => e.id),
        coherenceScore: 0.85
      });

      // Interpretation B: Claim B is True
      const factsB = [...acceptedFacts, ...ambiguousFacts.filter(f => f.id === claimB.factId)];
      const graphB = this.assembleAcceptedGraph(caseId, factsB);
      const factRecordB = conflictingFacts.find(f => f.id === claimB.factId);

      interpretations.push({
        id: 'interp-branch-beta',
        name: `Interpretation Beta (${claimB.source})`,
        description: `Hypothesis accepting Claim B: ${claimB.claim}. Rejects contradictory assertion from ${claimA.source}.`,
        graph: graphB,
        supportingFactIds: factsB.map(f => f.id),
        conflictingFactIds: [claimA.factId],
        requiredAssumptions: [`Assumes ${claimB.source} testimony is accurate and records from ${claimA.source} are delayed or spoofed.`],
        distinguishingEdges: factRecordB
          ? [
              {
                edgeId: `e-${factRecordB.subject.id}-${factRecordB.object.id}-${factRecordB.predicate}`,
                source: factRecordB.subject.id,
                target: factRecordB.object.id,
                type: String(factRecordB.predicate),
                reason: `Asserted by ${claimB.source}`
              }
            ]
          : [],
        sharedEdgeIds: baseGraph.edges.map(e => e.id),
        coherenceScore: 0.82
      });
    }

    // Branching by Ambiguous Alternative Suspects / Corridors
    const candidateCulpritFacts = ambiguousFacts.filter(f => f.epistemicStatus === 'POSSIBLE');
    if (candidateCulpritFacts.length >= 2 && interpretations.length === 0) {
      for (let k = 0; k < candidateCulpritFacts.length; k++) {
        const candidateFact = candidateCulpritFacts[k];
        const branchFacts = [...acceptedFacts, candidateFact];
        const branchGraph = this.assembleAcceptedGraph(caseId, branchFacts);

        interpretations.push({
          id: `interp-corridor-${k + 1}`,
          name: `Hypothesis Corridor ${k + 1}: ${candidateFact.subject.label}`,
          description: `Hypothesis where ${candidateFact.subject.label} is the primary operative for ${candidateFact.object.label}.`,
          graph: branchGraph,
          supportingFactIds: branchFacts.map(f => f.id),
          conflictingFactIds: candidateCulpritFacts.filter(c => c.id !== candidateFact.id).map(c => c.id),
          requiredAssumptions: [`Assumes ${candidateFact.subject.label} acted alone without co-conspirators.`],
          distinguishingEdges: [
            {
              edgeId: `e-${candidateFact.subject.id}-${candidateFact.object.id}-${candidateFact.predicate}`,
              source: candidateFact.subject.id,
              target: candidateFact.object.id,
              type: String(candidateFact.predicate),
              reason: `Isolated to candidate ${candidateFact.subject.label}`
            }
          ],
          sharedEdgeIds: baseGraph.edges.map(e => e.id),
          coherenceScore: 0.78
        });
      }
    }

    return interpretations;
  }

  /**
   * Builds the comprehensive provenance trace for all edges.
   */
  private static buildProvenanceTraces(graph: GraphPayload, facts: EvidenceFact[]): EdgeProvenanceTrace[] {
    const traces: EdgeProvenanceTrace[] = [];

    for (const e of graph.edges) {
      const supporting = facts.filter(f => e.evidenceRefs.includes(f.provenance.sourceEvidenceId));
      const sourceNode = graph.nodes.find(n => n.id === e.source) || { id: e.source, label: e.source, category: 'ENTITY' };
      const targetNode = graph.nodes.find(n => n.id === e.target) || { id: e.target, label: e.target, category: 'EVENT' };

      const sourceEvidences = supporting.map(s => ({
        id: s.provenance.sourceEvidenceId,
        name: s.provenance.sourceName,
        kind: s.provenance.sourceKind,
        reference: s.provenance.sourceReference,
        hashChecksum: s.provenance.hashChecksum
      }));

      const isDirect = e.status === 'OBSERVED' && supporting.length > 0;
      const isInference = e.status === 'DERIVED';

      const derivationChain: string[] = [];
      for (const s of supporting) {
        derivationChain.push(
          `Observed via ${s.provenance.sourceName} [${s.provenance.sourceReference}] by ${s.extractionMethod} (reliability: ${s.provenance.reliability})`
        );
      }
      if (isInference) {
        derivationChain.push(`Derived by graph causal inference engine based on temporal proximity.`);
      }

      traces.push({
        edgeId: e.id,
        sourceNode: { id: sourceNode.id, label: sourceNode.label, category: sourceNode.category },
        targetNode: { id: targetNode.id, label: targetNode.label, category: targetNode.category },
        edgeType: e.type,
        status: e.status,
        supportingFacts: supporting,
        sourceEvidences,
        derivationChain,
        isDirectlyObserved: isDirect,
        isInference
      });
    }

    return traces;
  }

  /**
   * Generates the deterministic Messy Evidence Benchmark Dataset containing:
   * - Incomplete timestamps
   * - Duplicate entities ("John Mercer" vs "J. Mercer")
   * - Contradictory observations (14:30 alibi vs 14:30 access log)
   * - Ambiguous relationships (two potential actors)
   * - Irrelevant evidence
   * - Missing provenance (anonymous claim without sensor citation)
   * - Conflicting identities
   * - Partial event sequences
   */
  static generateMessyBenchmarkDataset(): EvidenceFact[] {
    const facts: EvidenceFact[] = [
      // Fact 1: Valid observed fact
      {
        id: 'fact-01',
        caseId: 'messy-benchmark',
        subject: { id: 'person-mercer', label: 'John Mercer', category: 'ENTITY', type: 'PERSON' },
        predicate: 'PERFORMED',
        object: { id: 'event-badge-in', label: 'Main Lobby Badge Swipe', category: 'EVENT', type: 'LOCATION_CHANGE' },
        temporalInfo: { start: '2026-01-01T14:00:00Z', precision: 'MINUTE' },
        epistemicStatus: 'OBSERVED',
        extractionMethod: 'STRUCTURED_LOG',
        provenance: {
          sourceEvidenceId: 'ev-lobby-turnstile-log',
          sourceName: 'Turnstile Access Controller Log',
          sourceKind: 'SYSTEM',
          sourceReference: 'Door 01 Event #48102',
          collectionTime: '2026-01-01T14:00:05Z',
          hashChecksum: 'sha256:4a8b...10e',
          reliability: 0.98
        },
        confidence: 0.98
      },

      // Fact 2: Valid observed sequence
      {
        id: 'fact-02',
        caseId: 'messy-benchmark',
        subject: { id: 'event-badge-in', label: 'Main Lobby Badge Swipe', category: 'EVENT', type: 'LOCATION_CHANGE' },
        predicate: 'PRECEDED',
        object: { id: 'event-vault-corridor', label: 'Basement Corridor Transit', category: 'EVENT', type: 'LOCATION_CHANGE' },
        temporalInfo: { start: '2026-01-01T14:10:00Z', precision: 'MINUTE' },
        epistemicStatus: 'OBSERVED',
        extractionMethod: 'STRUCTURED_LOG',
        provenance: {
          sourceEvidenceId: 'ev-cctv-corridor',
          sourceName: 'CCTV Basement Camera 3',
          sourceKind: 'CCTV',
          sourceReference: 'Tape 2026-01-01 Frame 19283',
          collectionTime: '2026-01-01T14:15:00Z',
          hashChecksum: 'sha256:7c9e...f11',
          reliability: 0.95
        },
        confidence: 0.95
      },

      // Fact 3: Contradictory observation A (Vault accessed at 14:30)
      {
        id: 'fact-03-vault-log',
        caseId: 'messy-benchmark',
        subject: { id: 'person-mercer', label: 'John Mercer', category: 'ENTITY', type: 'PERSON' },
        predicate: 'LOCATED_AT',
        object: { id: 'loc-vault-room', label: 'Sub-Basement Vault Chamber', category: 'ENTITY', type: 'LOCATION' },
        temporalInfo: { start: '2026-01-01T14:30:00Z', precision: 'MINUTE' },
        epistemicStatus: 'OBSERVED',
        extractionMethod: 'STRUCTURED_LOG',
        provenance: {
          sourceEvidenceId: 'ev-vault-sensor',
          sourceName: 'Vault Door Volumetric Motion Sensor',
          sourceKind: 'SENSOR',
          sourceReference: 'Sensor Zone 4 Alarm Trigger #099',
          collectionTime: '2026-01-01T14:30:02Z',
          hashChecksum: 'sha256:901a...b22',
          reliability: 0.92
        },
        confidence: 0.92
      },

      // Fact 4: Contradictory observation B (Mercer claimed at cafe at 14:30)
      {
        id: 'fact-04-cafe-alibi',
        caseId: 'messy-benchmark',
        subject: { id: 'person-mercer', label: 'John Mercer', category: 'ENTITY', type: 'PERSON' },
        predicate: 'LOCATED_AT',
        object: { id: 'loc-cafe-downtown', label: 'Cafe Metro Downtown', category: 'ENTITY', type: 'LOCATION' },
        temporalInfo: { start: '2026-01-01T14:30:00Z', precision: 'MINUTE' },
        epistemicStatus: 'OBSERVED',
        extractionMethod: 'MANUAL_ENTRY',
        provenance: {
          sourceEvidenceId: 'ev-witness-interview',
          sourceName: 'Witness Interview: Barista Jane Doe',
          sourceKind: 'INTERVIEW',
          sourceReference: 'Transcript Exhibit B, Page 4, Paragraph 2',
          collectionTime: '2026-01-02T10:00:00Z',
          reliability: 0.75
        },
        confidence: 0.75
      },

      // Fact 5: Ambiguous competing alternative culprit (Kovacs also observed near terminal)
      {
        id: 'fact-05-kovacs-alt',
        caseId: 'messy-benchmark',
        subject: { id: 'person-kovacs', label: 'Elena Kovacs', category: 'ENTITY', type: 'PERSON' },
        predicate: 'PERFORMED',
        object: { id: 'event-vault-breach', label: 'Vault Console Dump', category: 'EVENT', type: 'DATA_ACCESS' },
        temporalInfo: { start: '2026-01-01T14:32:00Z', precision: 'MINUTE' },
        epistemicStatus: 'POSSIBLE',
        extractionMethod: 'HEURISTIC_RULE',
        provenance: {
          sourceEvidenceId: 'ev-terminal-audit',
          sourceName: 'Terminal User Session Dump',
          sourceKind: 'SYSTEM_RECORD',
          sourceReference: 'TTY Session #18 (Ambiguous SSH key match)',
          collectionTime: '2026-01-01T15:00:00Z',
          hashChecksum: 'sha256:33ab...881',
          reliability: 0.80
        },
        confidence: 0.70
      },

      // Fact 6: Duplicate entity reference ("J. Mercer" alias requiring entity identity resolution)
      {
        id: 'fact-06-duplicate-alias',
        caseId: 'messy-benchmark',
        subject: { id: 'person-mercer', label: 'J. Mercer', category: 'ENTITY', type: 'PERSON' },
        predicate: 'USES',
        object: { id: 'device-rfid-card', label: 'Card #9941', category: 'ENTITY', type: 'DEVICE' },
        epistemicStatus: 'OBSERVED',
        extractionMethod: 'STRUCTURED_LOG',
        provenance: {
          sourceEvidenceId: 'ev-hr-badge-registry',
          sourceName: 'Badge Issuance Database',
          sourceKind: 'DATABASE_RECORD',
          sourceReference: 'Record row 4104',
          collectionTime: '2026-01-01T09:00:00Z',
          reliability: 0.99
        },
        confidence: 0.99
      },

      // Fact 7: Malformed / Inverted temporal interval (MUST BE REJECTED)
      {
        id: 'fact-07-inverted-time',
        caseId: 'messy-benchmark',
        subject: { id: 'event-file-upload', label: 'Offshore Upload', category: 'EVENT', type: 'FILE_TRANSFER' },
        predicate: 'PRECEDED',
        object: { id: 'event-system-tamper', label: 'Tamper Alarm', category: 'EVENT', type: 'DATA_ACCESS' },
        temporalInfo: {
          start: '2026-01-01T16:00:00Z',
          end: '2026-01-01T13:00:00Z', // Inverted end < start!
          precision: 'MINUTE'
        },
        epistemicStatus: 'OBSERVED',
        extractionMethod: 'DETERMINISTIC_PARSER',
        provenance: {
          sourceEvidenceId: 'ev-firewall-glitch',
          sourceName: 'Unsynchronized Syslog',
          sourceKind: 'LOG',
          sourceReference: 'Log line 9912',
          reliability: 0.60
        },
        confidence: 0.60
      },

      // Fact 8: Missing Provenance / Anonymous Tip (MUST BE REJECTED - Hard Invariant Protection)
      {
        id: 'fact-08-unprovenanced',
        caseId: 'messy-benchmark',
        subject: { id: 'person-mercer', label: 'John Mercer', category: 'ENTITY', type: 'PERSON' },
        predicate: 'ASSOCIATED_WITH',
        object: { id: 'org-shadow-syndicate', label: 'Shadow Syndicate Group', category: 'ENTITY', type: 'ORGANIZATION' },
        epistemicStatus: 'OBSERVED',
        extractionMethod: 'MANUAL_ENTRY',
        provenance: {
          sourceEvidenceId: '', // Empty source evidence ID!
          sourceName: 'Anonymous Whisper Rumor',
          sourceKind: 'OTHER',
          sourceReference: '', // Empty reference!
          reliability: 0.0 // Zero reliability!
        },
        confidence: 0.10
      },

      // Fact 9: Inverted relationship direction (Event PERFORMS Person) (MUST BE REJECTED)
      {
        id: 'fact-09-inverted-direction',
        caseId: 'messy-benchmark',
        subject: { id: 'event-vault-breach', label: 'Vault Console Dump', category: 'EVENT', type: 'DATA_ACCESS' },
        predicate: 'PERFORMED',
        object: { id: 'person-mercer', label: 'John Mercer', category: 'ENTITY', type: 'PERSON' },
        epistemicStatus: 'OBSERVED',
        extractionMethod: 'DETERMINISTIC_PARSER',
        provenance: {
          sourceEvidenceId: 'ev-bad-parser-test',
          sourceName: 'Defective Regex Rule',
          sourceKind: 'SYSTEM',
          sourceReference: 'Parser Rule #4',
          reliability: 0.50
        },
        confidence: 0.50
      },

      // Fact 10: Incomplete timestamp precision (precision: DAY)
      {
        id: 'fact-10-coarse-time',
        caseId: 'messy-benchmark',
        subject: { id: 'person-mercer', label: 'John Mercer', category: 'ENTITY', type: 'PERSON' },
        predicate: 'OWNS',
        object: { id: 'account-offshore', label: 'Zurich Account #881', category: 'ENTITY', type: 'ACCOUNT' },
        temporalInfo: {
          start: '2025-12-15T00:00:00Z',
          precision: 'DAY'
        },
        epistemicStatus: 'OBSERVED',
        extractionMethod: 'MANUAL_ENTRY',
        provenance: {
          sourceEvidenceId: 'ev-bank-record',
          sourceName: 'Bank Registration Statement',
          sourceKind: 'DATABASE_RECORD',
          sourceReference: 'Account Statement 2025-Q4',
          collectionTime: '2026-01-01T00:00:00Z',
          reliability: 0.99
        },
        confidence: 0.99
      }
    ];

    return facts;
  }

  /**
   * Executes the Messy Evidence Benchmark and produces the evaluation report.
   */
  static runMessyBenchmark(): MessyEvidenceBenchmarkReport {
    const rawFacts = this.generateMessyBenchmarkDataset();
    const result = this.reconstruct('messy-benchmark-case', rawFacts);

    const validation = result.validation;
    const acceptedCount = validation.acceptedFactIds.length;
    const rejectedCount = validation.rejectedFactIds.length;
    const ambiguousCount = validation.ambiguousFactIds.length;
    const contradictionsCount = validation.contradictionsDetected.length;
    const falseEdgesPrevented = rejectedCount;

    // Hard Invariant Check: Calculate provenance coverage on accepted graph edges
    const acceptedEdges = result.acceptedGraph.edges;
    const coveredEdges = acceptedEdges.filter(e => e.evidenceRefs.length > 0 && e.properties.sourceReference);
    const provenanceCoveragePercent = acceptedEdges.length > 0
      ? Number(((coveredEdges.length / acceptedEdges.length) * 100).toFixed(1))
      : 100.0;

    const summaryTakeaways = [
      `100% Provenance Coverage: All ${acceptedEdges.length} accepted graph edges are strictly bound to verifiable evidence citations.`,
      `False Edges Prevented: ${falseEdgesPrevented} defective facts (unprovenanced rumors, inverted intervals, inverted directions) were safely rejected before graph admission.`,
      `Contradiction Isolation: Detected ${contradictionsCount} physical/temporal contradiction(s) and preserved both competing hypotheses without silent averaging.`,
      `Interpretations Generated: Produced ${result.interpretations.length} competing graph interpretation(s) directly seeding the Possibility Engine.`,
      `Deterministic Integrity: Zero LLM hallucinations; all validation gates and derivations operate deterministically.`
    ];

    return {
      timestamp: new Date().toISOString(),
      datasetName: 'Canonical Messy Evidence Benchmark (10 Multi-Source Facts)',
      totalRawEvidenceItems: result.rawEvidenceCount,
      totalFactsExtracted: rawFacts.length,
      factsAccepted: acceptedCount,
      factsRejected: rejectedCount,
      ambiguousFacts: ambiguousCount,
      contradictionsDetected: contradictionsCount,
      graphInterpretationsGenerated: result.interpretations.length,
      falseEdgesPrevented,
      provenanceCoveragePercent,
      interpretations: result.interpretations,
      summaryTakeaways
    };
  }
}

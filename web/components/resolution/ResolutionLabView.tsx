"use client";

import React, { useState, useEffect } from 'react';
import {
  ResolutionReasoningResult,
  GraphResolutionCandidate,
  AlgorithmAuditEntry,
  CounterfactualResolutionSimulation,
  Case
} from '../../types/graph';
import {
  fetchResolutionAnalysis,
  fetchAlgorithmAudit,
  runCounterfactualResolutionSimulation
} from '../../api/client';
import {
  Button,
  Chip,
  Card,
  CardBody,
  CardHeader,
  Divider,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  Spinner,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Tooltip,
  Progress
} from '@heroui/react';
import {
  GitFork,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Sparkles,
  Layers,
  ArrowRight,
  RefreshCw,
  Cpu,
  BarChart3,
  Microscope,
  Play
} from 'lucide-react';

interface Props {
  currentCase: Case;
}

const classificationColor: Record<string, 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger'> = {
  GENERATIVE: 'primary',
  FILTERING: 'danger',
  STRUCTURAL: 'secondary',
  DIFFERENTIATING: 'warning',
  EVOLUTIONARY: 'success',
  RESOLUTION: 'default',
};

export const ResolutionLabView: React.FC<Props> = ({ currentCase }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ResolutionReasoningResult | null>(null);
  const [audit, setAudit] = useState<AlgorithmAuditEntry[]>([]);
  const [simulating, setSimulating] = useState(false);
  const [simResult, setSimResult] = useState<CounterfactualResolutionSimulation | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<GraphResolutionCandidate | null>(null);
  const { isOpen: isAuditOpen, onOpen: onAuditOpen, onClose: onAuditClose } = useDisclosure();

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [resData, auditData] = await Promise.all([
        fetchResolutionAnalysis(currentCase.id),
        fetchAlgorithmAudit(currentCase.id)
      ]);
      setData(resData);
      setAudit(auditData);
      if (resData.resolutionCandidates.length > 0) {
        setSelectedCandidate(resData.resolutionCandidates[0]);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load resolution reasoning data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [currentCase.id]);

  const handleSimulate = async (candidate: GraphResolutionCandidate, action: 'CONFIRM_ELEMENT' | 'REFUTE_ELEMENT' = 'CONFIRM_ELEMENT') => {
    try {
      setSimulating(true);
      const res = await runCounterfactualResolutionSimulation(currentCase.id, candidate.id, action);
      setSimResult(res);
      setSelectedCandidate(candidate);
    } catch (err: any) {
      alert(`Simulation failed: ${err.message}`);
    } finally {
      setSimulating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-24 gap-4">
        <Spinner size="lg" color="primary" />
        <p className="text-sm text-foreground-500">Computing graph resolution candidates & structural families…</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <Card className="border border-danger-200 bg-danger-50">
          <CardBody className="flex flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-danger" />
              <span className="text-sm text-danger">{error || 'No resolution data. Generate possibilities first.'}</span>
            </div>
            <Button size="sm" color="danger" variant="flat" onPress={loadData}>Retry</Button>
          </CardBody>
        </Card>
      </div>
    );
  }

  const { totalSurvivingPossibilities, structuralFamilies, commonInvariants, resolutionCandidates, resolutionMatrix, contradictionImpacts } = data;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 overflow-y-auto h-full">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Chip size="sm" variant="flat" color="primary" className="font-mono font-bold uppercase tracking-wider">
              Phase 4 · Deterministic Layer
            </Chip>
            <span className="text-xs text-foreground-500 font-mono">
              H(P) = {resolutionMatrix.structuralEntropy} bits
            </span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">Graph Resolution Lab</h1>
          <p className="text-sm text-foreground-500 mt-0.5">
            Observable graph distinctions that most effectively partition the surviving possibility space.
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="flat" startContent={<Cpu className="w-3.5 h-3.5" />} onPress={onAuditOpen}>
            Algorithm Audit ({audit.length})
          </Button>
          <Button size="sm" color="primary" startContent={<RefreshCw className="w-3.5 h-3.5" />} onPress={loadData}>
            Re-evaluate
          </Button>
        </div>
      </div>

      {/* Stats Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Surviving Possibilities', value: totalSurvivingPossibilities, sub: '100% physically valid', icon: <GitFork className="w-4 h-4" />, color: 'text-foreground' },
          { label: 'Structural Families', value: structuralFamilies.length, sub: 'Topological clusters', icon: <Layers className="w-4 h-4" />, color: 'text-primary' },
          { label: 'Universal Invariants', value: `${commonInvariants.commonNodes.length}N / ${commonInvariants.commonEdges.length}E`, sub: `${commonInvariants.commonUnavoidableDominatorNodes.length} dominator choke points`, icon: <CheckCircle2 className="w-4 h-4" />, color: 'text-success' },
          { label: 'Resolution Candidates', value: resolutionCandidates.length, sub: 'Ranked by utility', icon: <Sparkles className="w-4 h-4" />, color: 'text-warning' },
        ].map(s => (
          <Card key={s.label} className="shadow-sm">
            <CardBody className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-foreground-500 font-semibold uppercase tracking-wider">{s.label}</span>
                <span className={s.color}>{s.icon}</span>
              </div>
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-foreground-400 mt-1">{s.sub}</div>
            </CardBody>
          </Card>
        ))}
      </div>

      {/* Structural Families */}
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground-500 flex items-center gap-2 mb-3">
          <Layers className="w-4 h-4 text-primary" />
          Structural Possibility Families ({structuralFamilies.length})
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {structuralFamilies.map(fam => (
            <Card key={fam.familyId} className="shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="pb-2 flex items-center justify-between">
                <Chip size="sm" variant="flat" color="primary" className="font-mono font-bold">{fam.familyId}</Chip>
                <span className="text-xs text-foreground-500">{fam.possibilityIds.length} branch(es)</span>
              </CardHeader>
              <Divider />
              <CardBody className="pt-3 space-y-2">
                <div className="font-semibold text-sm text-foreground">{fam.familyLabel}</div>
                <div className="text-xs text-foreground-400 font-mono truncate">Backbone: {fam.backboneSignature}</div>
                <ul className="space-y-1">
                  {fam.keySharedFeatures.slice(0, 3).map((feat, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-xs text-foreground-600">
                      <span className="text-primary font-bold mt-0.5">•</span>
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
                <div className="text-[11px] text-foreground-400 font-mono pt-1 border-t border-divider">
                  Rep: {fam.representativePossibilityId.slice(0, 16)}…
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      </div>

      {/* Universal Invariants */}
      <Card className="shadow-sm">
        <CardHeader className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-success" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground-600">
              Universal Invariants — Common Across 100% of Paths
            </h2>
          </div>
          <Chip size="sm" color="success" variant="flat">Invariant Certainty: 100%</Chip>
        </CardHeader>
        <Divider />
        <CardBody className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <div className="text-xs font-bold text-primary uppercase tracking-wider mb-2">Dominator Choke Points</div>
            {commonInvariants.commonUnavoidableDominatorNodes.length > 0 ? (
              <ul className="space-y-1">
                {commonInvariants.commonUnavoidableDominatorNodes.map(dom => (
                  <li key={dom.id} className="flex items-center gap-1.5 text-xs text-foreground-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                    <span className="font-medium">{dom.label}</span>
                    <span className="text-foreground-400 font-mono">({dom.id})</span>
                  </li>
                ))}
              </ul>
            ) : (
              <span className="text-xs text-foreground-400 italic">No global dominators</span>
            )}
          </div>
          <div>
            <div className="text-xs font-bold text-foreground-500 uppercase tracking-wider mb-2">
              Common Entities &amp; Events ({commonInvariants.commonNodes.length})
            </div>
            <div className="flex flex-wrap gap-1.5">
              {commonInvariants.commonNodes.slice(0, 8).map(n => (
                <Chip key={n.id} size="sm" variant="flat">{n.label}</Chip>
              ))}
              {commonInvariants.commonNodes.length > 8 && (
                <span className="text-xs text-foreground-400 self-center">+{commonInvariants.commonNodes.length - 8} more</span>
              )}
            </div>
          </div>
          <div>
            <div className="text-xs font-bold text-foreground-500 uppercase tracking-wider mb-2">
              Common Evidence ({commonInvariants.commonEvidenceRefs.length})
            </div>
            <div className="flex flex-wrap gap-1.5">
              {commonInvariants.commonEvidenceRefs.slice(0, 6).map(evId => (
                <Chip key={evId} size="sm" variant="bordered" className="font-mono">{evId}</Chip>
              ))}
              {commonInvariants.commonEvidenceRefs.length === 0 && (
                <span className="text-xs text-foreground-400 italic">None universal</span>
              )}
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Resolution Candidates Table */}
      <Card className="shadow-sm">
        <CardHeader className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-warning" />
              <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground-600">Prioritized Resolution Candidates</h2>
            </div>
            <p className="text-xs text-foreground-400 mt-0.5">
              Ranked by Resolution Utility — how effectively obtaining this evidence partitions the possibility space.
            </p>
          </div>
        </CardHeader>
        <Divider />
        <CardBody className="p-0">
          <Table removeWrapper aria-label="Resolution candidates">
            <TableHeader>
              <TableColumn>Rank / ID</TableColumn>
              <TableColumn>Target Element</TableColumn>
              <TableColumn>Graph Basis</TableColumn>
              <TableColumn>Partition Effect</TableColumn>
              <TableColumn>Suggested Evidence</TableColumn>
              <TableColumn>Utility</TableColumn>
              <TableColumn className="text-right">Action</TableColumn>
            </TableHeader>
            <TableBody>
              {resolutionCandidates.map(cand => (
                <TableRow key={cand.id} className={selectedCandidate?.id === cand.id ? 'bg-primary-50' : ''}>
                  <TableCell className="font-mono font-bold text-primary">{cand.id}</TableCell>
                  <TableCell>
                    <div className="font-semibold text-sm text-foreground">{cand.targetLabel}</div>
                    <div className="text-xs text-foreground-400 truncate max-w-48">{cand.why}</div>
                  </TableCell>
                  <TableCell>
                    <Chip size="sm" variant="bordered" className="font-mono">{cand.graphBasis}</Chip>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-success font-medium">+{cand.partition.ifPresentValidPossibilityIds.length}</span>
                      <span className="text-foreground-400">/</span>
                      <span className="text-danger font-medium">-{cand.partition.ifAbsentValidPossibilityIds.length}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-foreground-600">{cand.suggestedEvidenceClass}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress size="sm" value={cand.resolutionUtilityScore} color="primary" className="w-16" />
                      <span className="font-bold text-primary font-mono text-xs">{cand.resolutionUtilityScore}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      color="primary"
                      variant="flat"
                      isLoading={simulating && selectedCandidate?.id === cand.id}
                      startContent={<Play className="w-3 h-3" />}
                      onPress={() => handleSimulate(cand)}
                    >
                      Simulate
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardBody>
      </Card>

      {/* Simulation Result */}
      {simResult && (
        <Card className="border border-primary-200 bg-primary-50 shadow-sm">
          <CardHeader className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-bold text-foreground">
                Counterfactual Simulation: {selectedCandidate?.targetLabel}
              </h3>
            </div>
            <Button size="sm" variant="light" onPress={() => setSimResult(null)}>Dismiss</Button>
          </CardHeader>
          <Divider />
          <CardBody className="p-4 space-y-4">
            <p className="text-sm text-foreground-600">{simResult.explanation}</p>
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'Before', value: simResult.beforePossibilityIds.length, color: 'default' as const, sub: 'possibilities' },
                { label: 'After Confirm', value: simResult.afterPossibilityIds.length, color: 'success' as const, sub: 'surviving' },
                { label: 'Pruned', value: simResult.eliminatedPossibilityIds.length, color: 'danger' as const, sub: 'eliminated' },
              ].map(s => (
                <Card key={s.label} shadow="none" className="bg-background border border-divider">
                  <CardBody className="p-3 text-center">
                    <div className="text-xs text-foreground-500 font-semibold mb-1">{s.label}</div>
                    <div className={`text-2xl font-bold text-${s.color}`}>{s.value}</div>
                    <div className="text-xs text-foreground-400">{s.sub}</div>
                  </CardBody>
                </Card>
              ))}
            </div>
          </CardBody>
        </Card>
      )}

      {/* Contradiction Impacts */}
      {contradictionImpacts.length > 0 && (
        <Card className="shadow-sm">
          <CardHeader className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-warning" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground-600">
              Contradiction Impact Analysis ({contradictionImpacts.length})
            </h2>
          </CardHeader>
          <Divider />
          <CardBody className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            {contradictionImpacts.map(ci => (
              <Card key={ci.contradictionId} shadow="none" className="border border-warning-200 bg-warning-50">
                <CardBody className="p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <Chip size="sm" color="warning" variant="flat" className="font-mono font-bold">{ci.contradictionId}</Chip>
                    <span className="text-xs text-foreground-500">{ci.affectedPossibilityIds.length} branch(es)</span>
                  </div>
                  <div className="text-sm font-semibold text-foreground">
                    &lsquo;{ci.conflictingEvidence[0]?.label}&rsquo; vs &lsquo;{ci.conflictingEvidence[1]?.label}&rsquo;
                  </div>
                  <p className="text-xs text-foreground-500">{ci.reason}</p>
                </CardBody>
              </Card>
            ))}
          </CardBody>
        </Card>
      )}

      {/* Algorithm Audit Modal */}
      <Modal isOpen={isAuditOpen} onClose={onAuditClose} size="5xl" scrollBehavior="inside">
        <ModalContent>
          <ModalHeader className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-primary" />
            Phase 4 Algorithm Audit &amp; Ablation Catalog
          </ModalHeader>
          <ModalBody>
            <p className="text-sm text-foreground-500 mb-4">
              Formal classification of all graph algorithms into GENERATIVE, FILTERING, STRUCTURAL, DIFFERENTIATING, EVOLUTIONARY, or RESOLUTION roles with verified ablation effects.
            </p>
            <Table removeWrapper aria-label="Algorithm audit">
              <TableHeader>
                <TableColumn>Algorithm</TableColumn>
                <TableColumn>Classification</TableColumn>
                <TableColumn>Downstream Consumer</TableColumn>
                <TableColumn>Ablation Result</TableColumn>
              </TableHeader>
              <TableBody>
                {audit.map((entry, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-bold text-foreground">{entry.algorithmName}</TableCell>
                    <TableCell>
                      <Chip
                        size="sm"
                        color={classificationColor[entry.classification] || 'default'}
                        variant="flat"
                        className="font-mono font-bold"
                      >
                        {entry.classification}
                      </Chip>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-foreground-500">
                      {entry.consumers.join(', ')}
                    </TableCell>
                    <TableCell className="text-sm text-foreground-600">{entry.ablationResult}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ModalBody>
          <ModalFooter>
            <Button onPress={onAuditClose}>Close</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
};

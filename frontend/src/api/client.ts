import { Case, GraphPayload, GraphNode, GraphEdge, AuditLog, ResolutionCandidate } from '../types/graph';

const API_BASE = '/api';

export async function fetchCases(): Promise<Case[]> {
  const res = await fetch(`${API_BASE}/cases`);
  if (!res.ok) throw new Error('Failed to fetch cases.');
  return res.json();
}

export async function createCase(name: string, description: string): Promise<Case> {
  const res = await fetch(`${API_BASE}/cases`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, description })
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to create case.');
  }
  return res.json();
}

export async function fetchCaseGraph(caseId: string): Promise<GraphPayload> {
  const res = await fetch(`${API_BASE}/cases/${caseId}/graph`);
  if (!res.ok) throw new Error('Failed to fetch graph payload.');
  return res.json();
}

export async function createNode(caseId: string, node: Partial<GraphNode>): Promise<GraphNode> {
  const res = await fetch(`${API_BASE}/cases/${caseId}/nodes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(node)
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to create node.');
  }
  return res.json();
}

export async function updateNode(caseId: string, nodeId: string, updates: Partial<GraphNode>): Promise<GraphNode> {
  const res = await fetch(`${API_BASE}/cases/${caseId}/nodes/${nodeId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates)
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to update node.');
  }
  return res.json();
}

export async function deleteNode(caseId: string, nodeId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/cases/${caseId}/nodes/${nodeId}`, {
    method: 'DELETE'
  });
  if (!res.ok) throw new Error('Failed to delete node.');
}

export async function createEdge(caseId: string, edge: Partial<GraphEdge>): Promise<GraphEdge> {
  const res = await fetch(`${API_BASE}/cases/${caseId}/edges`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(edge)
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to create edge.');
  }
  return res.json();
}

export async function updateEdge(caseId: string, edgeId: string, updates: Partial<GraphEdge>): Promise<GraphEdge> {
  const res = await fetch(`${API_BASE}/cases/${caseId}/edges/${edgeId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates)
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to update edge.');
  }
  return res.json();
}

export async function deleteEdge(caseId: string, edgeId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/cases/${caseId}/edges/${edgeId}`, {
    method: 'DELETE'
  });
  if (!res.ok) throw new Error('Failed to delete edge.');
}

export async function validateGraph(caseId: string): Promise<{ valid: boolean; errors: string[] }> {
  const res = await fetch(`${API_BASE}/cases/${caseId}/graph/validate`);
  if (!res.ok) throw new Error('Failed to validate graph.');
  return res.json();
}

export async function fetchGraphDiagnostics(caseId: string): Promise<any> {
  const res = await fetch(`${API_BASE}/cases/${caseId}/graph/diagnostics`);
  if (!res.ok) throw new Error('Failed to fetch graph diagnostics.');
  return res.json();
}

export async function importJsonDataset(caseId: string, payload: any): Promise<any> {
  const res = await fetch(`${API_BASE}/cases/${caseId}/import/json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Import failed validation.');
  }
  return data;
}

export async function importCsvDataset(caseId: string, csv: string, format: 'NODES' | 'EDGES'): Promise<any> {
  const res = await fetch(`${API_BASE}/cases/${caseId}/import/csv`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ csv, format })
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'CSV import failed validation.');
  }
  return data;
}

export async function fetchResolutionCandidates(caseId: string): Promise<ResolutionCandidate[]> {
  const res = await fetch(`${API_BASE}/cases/${caseId}/resolution/candidates`);
  if (!res.ok) throw new Error('Failed to fetch resolution candidates.');
  return res.json();
}

export async function mergeCandidates(caseId: string, candidateId: string, reason?: string): Promise<void> {
  const res = await fetch(`${API_BASE}/cases/${caseId}/resolution/merge`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ candidateId, reason })
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to merge entities.');
  }
}

export async function rejectCandidate(caseId: string, candidateId: string, reason?: string): Promise<void> {
  const res = await fetch(`${API_BASE}/cases/${caseId}/resolution/reject`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ candidateId, reason })
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to reject candidate.');
  }
}

export async function fetchAuditLogs(caseId: string): Promise<AuditLog[]> {
  const res = await fetch(`${API_BASE}/cases/${caseId}/audit?limit=100`);
  if (!res.ok) throw new Error('Failed to fetch audit logs.');
  return res.json();
}

export async function extractCandidates(
  caseId: string,
  rawText: string,
  sourceName: string,
  evidenceType: string
): Promise<any> {
  const res = await fetch(`${API_BASE}/cases/${caseId}/extract`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rawText, sourceName, evidenceType })
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to extract structured candidates.');
  }
  return data.untrustedCandidates;
}

export function getExportSnapshotUrl(caseId: string): string {
  return `${API_BASE}/cases/${caseId}/export`;
}

// --- Possibility & Analysis APIs ---

export async function fetchPossibilities(caseId: string): Promise<any[]> {
  const res = await fetch(`${API_BASE}/cases/${caseId}/possibilities`);
  if (!res.ok) throw new Error('Failed to fetch possibilities.');
  const data = await res.json();
  return data.possibilities || [];
}

export async function generatePossibilities(caseId: string, options: Record<string, any> = {}): Promise<any> {
  const res = await fetch(`${API_BASE}/cases/${caseId}/possibilities/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(options)
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to generate possibilities.');
  }
  return res.json();
}

export async function comparePossibilities(caseId: string, possibilityIds: string[]): Promise<any> {
  const res = await fetch(`${API_BASE}/cases/${caseId}/possibilities/compare`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ possibilityIds })
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to compare possibilities.');
  }
  return res.json();
}

export async function deletePossibility(caseId: string, id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/cases/${caseId}/possibilities/${id}`, {
    method: 'DELETE'
  });
  if (!res.ok) throw new Error('Failed to delete possibility.');
}

export async function runAlgorithm(
  caseId: string,
  algorithm: string,
  parameters: Record<string, any> = {},
  possibilityId?: string
): Promise<any> {
  const res = await fetch(`${API_BASE}/cases/${caseId}/analysis/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ algorithm, parameters, possibilityId })
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to run algorithm.');
  }
  return res.json();
}

export async function queryAgent(caseId: string, query: string): Promise<any> {
  const res = await fetch(`${API_BASE}/cases/${caseId}/agent/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query })
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to query agent.');
  }
  return res.json();
}

export async function fetchAlgorithmImpact(caseId: string): Promise<any> {
  const res = await fetch(`${API_BASE}/cases/${caseId}/possibilities/impact`);
  if (!res.ok) return null;
  return res.json();
}

export async function fetchGraphVersions(caseId: string): Promise<any[]> {
  const res = await fetch(`${API_BASE}/cases/${caseId}/incremental/versions`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.versions || [];
}

export async function fetchLatestIncrementalImpact(caseId: string): Promise<any> {
  const res = await fetch(`${API_BASE}/cases/${caseId}/incremental/versions/latest/impact`);
  if (!res.ok) return null;
  const data = await res.json();
  return data.report || null;
}

export async function runWhatIfSimulation(
  caseId: string,
  simulation: {
    action: string;
    targetId: string;
    parameters?: Record<string, any>;
  }
): Promise<any> {
  const res = await fetch(`${API_BASE}/cases/${caseId}/incremental/simulation/what-if`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(simulation)
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Simulation failed.');
  }
  return res.json();
}

// --- Phase 4 Resolution Reasoning APIs ---

export async function fetchResolutionAnalysis(caseId: string): Promise<any> {
  const res = await fetch(`${API_BASE}/cases/${caseId}/resolution/analysis`);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to fetch resolution analysis.');
  }
  return res.json();
}

export async function fetchAlgorithmAudit(caseId: string): Promise<any[]> {
  const res = await fetch(`${API_BASE}/cases/${caseId}/resolution/audit`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.audit || [];
}

export async function fetchResolutionMatrix(caseId: string): Promise<any> {
  const res = await fetch(`${API_BASE}/cases/${caseId}/resolution/matrix`);
  if (!res.ok) return null;
  return res.json();
}

export async function runCounterfactualResolutionSimulation(
  caseId: string,
  candidateId: string,
  action: 'CONFIRM_ELEMENT' | 'REFUTE_ELEMENT' = 'CONFIRM_ELEMENT'
): Promise<any> {
  const res = await fetch(`${API_BASE}/cases/${caseId}/resolution/simulate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ candidateId, action })
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Counterfactual resolution simulation failed.');
  }
  return res.json();
}

// --- Phase 5 Investigation Planning APIs ---

export async function fetchInvestigationPlan(caseId: string): Promise<any> {
  const res = await fetch(`${API_BASE}/cases/${caseId}/planning/plan`);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to fetch investigation plan.');
  }
  return res.json();
}

export async function fetchInvestigationActions(caseId: string): Promise<any> {
  const res = await fetch(`${API_BASE}/cases/${caseId}/planning/actions`);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to fetch investigation actions.');
  }
  return res.json();
}

export async function simulatePlanAction(
  caseId: string,
  actionId: string,
  outcome: 'CONFIRMED' | 'REFUTED' = 'CONFIRMED'
): Promise<any> {
  const res = await fetch(`${API_BASE}/cases/${caseId}/planning/simulate-action`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ actionId, outcome })
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Action simulation failed.');
  }
  return res.json();
}

// --- Phase 6: Algorithm Effectiveness & Ablation APIs ---

export async function fetchAlgorithmEffectivenessAudit(caseId: string): Promise<any[]> {
  const res = await fetch(`${API_BASE}/cases/${caseId}/effectiveness/audit`);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to fetch algorithm effectiveness audit.');
  }
  const data = await res.json();
  return data.algorithms || [];
}

export async function runAlgorithmAblation(caseId: string, algorithm: string): Promise<any> {
  const res = await fetch(`${API_BASE}/cases/${caseId}/effectiveness/ablation/${encodeURIComponent(algorithm)}`);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Algorithm ablation failed.');
  }
  return res.json();
}

export async function fetchAlgorithmImpactGraph(caseId: string): Promise<any> {
  const res = await fetch(`${API_BASE}/cases/${caseId}/effectiveness/impact-graph`);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to fetch algorithm impact graph.');
  }
  return res.json();
}

export async function fetchReasoningTrace(caseId: string, targetId: string): Promise<any> {
  const res = await fetch(`${API_BASE}/cases/${caseId}/effectiveness/reasoning-trace/${encodeURIComponent(targetId)}`);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to fetch reasoning trace.');
  }
  return res.json();
}

export async function fetchMultiDomainCases(caseId: string): Promise<any[]> {
  const res = await fetch(`${API_BASE}/cases/${caseId}/effectiveness/cases`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.cases || [];
}

export async function fetchSyntheticBenchmarks(caseId: string): Promise<any[]> {
  const res = await fetch(`${API_BASE}/cases/${caseId}/effectiveness/benchmarks`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.benchmarks || [];
}

// --- Phase 7: Closed-Loop Investigation APIs ---

export async function ingestClosedLoopEvidence(caseId: string, payload: {
  evidenceNode: any;
  attachedEdges: any[];
  summary?: string;
  requestedByActionId?: string;
  reason?: string;
}): Promise<any> {
  const res = await fetch(`${API_BASE}/cases/${caseId}/evidence/ingest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to ingest evidence.');
  }
  return res.json();
}

export async function fetchClosedLoopCycles(caseId: string): Promise<any[]> {
  const res = await fetch(`${API_BASE}/cases/${caseId}/closed-loop/cycles`);
  if (!res.ok) return [];
  return res.json();
}

export async function fetchLatestClosedLoopCycle(caseId: string): Promise<any | null> {
  const res = await fetch(`${API_BASE}/cases/${caseId}/closed-loop/latest`);
  if (!res.ok) return null;
  return res.json();
}

export async function fetchClosedLoopBenchmark(caseId: string): Promise<any> {
  const res = await fetch(`${API_BASE}/cases/${caseId}/closed-loop/benchmark`);
  if (!res.ok) return null;
  return res.json();
}

export async function fetchClosedLoopVersions(caseId: string): Promise<any[]> {
  const res = await fetch(`${API_BASE}/cases/${caseId}/closed-loop/versions`);
  if (!res.ok) return [];
  return res.json();
}

export async function fetchInvestigativeDecisions(caseId: string): Promise<any> {
  const res = await fetch(`${API_BASE}/cases/${caseId}/decision`);
  if (!res.ok) throw new Error('Failed to fetch investigative decisions');
  return res.json();
}

export async function simulateInvestigativeStrategy(
  caseId: string,
  strategyId: string,
  outcome: 'CONFIRMED' | 'REFUTED'
): Promise<any> {
  const res = await fetch(`${API_BASE}/cases/${caseId}/decision/simulate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ strategyId, outcome })
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to simulate strategy');
  }
  return res.json();
}

export async function fetchEpistemicValidation(caseId: string): Promise<any> {
  const res = await fetch(`${API_BASE}/cases/${caseId}/validation/epistemic`);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to fetch epistemic validation');
  }
  return res.json();
}

export async function fetchAlgorithmComparative(caseId: string): Promise<any> {
  const res = await fetch(`${API_BASE}/cases/${caseId}/algorithms/comparative`);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to fetch algorithm comparative evaluation');
  }
  return res.json();
}

export async function fetchAlgorithmBenchmark(): Promise<any> {
  const res = await fetch(`${API_BASE}/algorithms/benchmark`);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to fetch algorithm benchmark');
  }
  return res.json();
}

export async function fetchCaseGeneralization(caseId: string): Promise<any> {
  const res = await fetch(`${API_BASE}/cases/${caseId}/algorithms/generalization`);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to fetch case generalization report');
  }
  return res.json();
}

export async function fetchAdaptiveReport(caseId: string): Promise<any> {
  const res = await fetch(`${API_BASE}/cases/${caseId}/adaptive`);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to fetch adaptive reasoning report');
  }
  return res.json();
}

export async function fetchAdaptiveTopology(topoId: string): Promise<any> {
  const res = await fetch(`${API_BASE}/adaptive/topologies/${topoId}`);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Failed to fetch adaptive analysis for topology ${topoId}`);
  }
  return res.json();
}

export async function fetchAdaptiveBenchmark(): Promise<any> {
  const res = await fetch(`${API_BASE}/adaptive/benchmark`);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to fetch adaptive benchmark');
  }
  return res.json();
}




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



import { DatabaseSync } from 'node:sqlite';
import { GraphVersion, GraphMutation, GraphDelta, AffectedSubgraph } from '../../domain/incremental-types.js';

export class GraphVersionRepository {
  constructor(private db: DatabaseSync) {}

  create(version: GraphVersion): void {
    const stmt = this.db.prepare(`
      INSERT INTO case_graph_versions (
        id, case_id, version_number, parent_version_number,
        change_summary, mutation_json, delta_json, affected_subgraph_json,
        snapshot_json, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      version.id,
      version.caseId,
      version.versionNumber,
      version.parentVersionNumber ?? null,
      version.changeSummary,
      JSON.stringify(version.mutation),
      JSON.stringify(version.delta),
      JSON.stringify(version.affectedSubgraph),
      version.snapshot ? JSON.stringify(version.snapshot) : null,
      version.createdAt
    );
  }

  getByCaseId(caseId: string): GraphVersion[] {
    const stmt = this.db.prepare(`
      SELECT
        id, case_id as caseId, version_number as versionNumber,
        parent_version_number as parentVersionNumber,
        change_summary as changeSummary,
        mutation_json as mutationJson,
        delta_json as deltaJson,
        affected_subgraph_json as affectedSubgraphJson,
        snapshot_json as snapshotJson,
        created_at as createdAt
      FROM case_graph_versions
      WHERE case_id = ?
      ORDER BY version_number ASC
    `);

    const rows = stmt.all(caseId) as any[];
    return rows.map(r => this.mapRow(r));
  }

  getByVersion(caseId: string, versionNumber: number): GraphVersion | null {
    const stmt = this.db.prepare(`
      SELECT
        id, case_id as caseId, version_number as versionNumber,
        parent_version_number as parentVersionNumber,
        change_summary as changeSummary,
        mutation_json as mutationJson,
        delta_json as deltaJson,
        affected_subgraph_json as affectedSubgraphJson,
        snapshot_json as snapshotJson,
        created_at as createdAt
      FROM case_graph_versions
      WHERE case_id = ? AND version_number = ?
    `);

    const row = stmt.get(caseId, versionNumber) as any;
    if (!row) return null;
    return this.mapRow(row);
  }

  getLatest(caseId: string): GraphVersion | null {
    const stmt = this.db.prepare(`
      SELECT
        id, case_id as caseId, version_number as versionNumber,
        parent_version_number as parentVersionNumber,
        change_summary as changeSummary,
        mutation_json as mutationJson,
        delta_json as deltaJson,
        affected_subgraph_json as affectedSubgraphJson,
        snapshot_json as snapshotJson,
        created_at as createdAt
      FROM case_graph_versions
      WHERE case_id = ?
      ORDER BY version_number DESC
      LIMIT 1
    `);

    const row = stmt.get(caseId) as any;
    if (!row) return null;
    return this.mapRow(row);
  }

  getNextVersionNumber(caseId: string): number {
    const latest = this.getLatest(caseId);
    return latest ? latest.versionNumber + 1 : 1;
  }

  private mapRow(r: any): GraphVersion {
    let mutation: GraphMutation = {
      action: 'INITIAL_GRAPH',
      targetType: 'SYSTEM',
      targetId: 'root',
      summary: r.changeSummary || 'Initial version',
      timestamp: r.createdAt
    };
    if (r.mutationJson) {
      try { mutation = JSON.parse(r.mutationJson); } catch {}
    }

    let delta: GraphDelta = {
      addedNodes: [],
      removedNodes: [],
      modifiedNodes: [],
      addedEdges: [],
      removedEdges: [],
      modifiedEdges: [],
      changedEvidence: [],
      changedTemporalConstraints: [],
      changedIdentityConstraints: []
    };
    if (r.deltaJson) {
      try { delta = JSON.parse(r.deltaJson); } catch {}
    }

    let affectedSubgraph: AffectedSubgraph = {
      affectedNodeIds: [],
      affectedEdgeIds: [],
      affectedEvidenceIds: [],
      propagationReason: 'Initial graph'
    };
    if (r.affectedSubgraphJson) {
      try { affectedSubgraph = JSON.parse(r.affectedSubgraphJson); } catch {}
    }

    let snapshot = undefined;
    if (r.snapshotJson) {
      try { snapshot = JSON.parse(r.snapshotJson); } catch {}
    }

    return {
      id: r.id,
      caseId: r.caseId,
      versionNumber: r.versionNumber,
      parentVersionNumber: r.parentVersionNumber ?? null,
      changeSummary: r.changeSummary,
      mutation,
      delta,
      affectedSubgraph,
      snapshot,
      createdAt: r.createdAt
    };
  }
}

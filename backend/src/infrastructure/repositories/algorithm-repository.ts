import { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
import { AlgorithmRun, AlgorithmResult } from '../../domain/possibility-types.js';

export class AlgorithmRepository {
  constructor(private db: DatabaseSync) {}

  createRun(run: Omit<AlgorithmRun, 'id' | 'createdAt'>): AlgorithmRun {
    const id = randomUUID();
    const now = new Date().toISOString();

    this.db.prepare(`
      INSERT INTO algorithm_runs (
        id, case_id, possibility_id, algorithm, algorithm_version,
        parameters_json, graph_version, input_node_count, input_edge_count,
        execution_time_ms, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      run.caseId,
      run.possibilityId || null,
      run.algorithm,
      run.algorithmVersion || '1.0.0',
      JSON.stringify(run.parameters || {}),
      run.graphVersion || 1,
      run.inputNodeCount || 0,
      run.inputEdgeCount || 0,
      run.executionTimeMs || 0,
      now
    );

    return {
      ...run,
      id,
      createdAt: now
    };
  }

  saveResult(result: Omit<AlgorithmResult, 'id' | 'createdAt'>): AlgorithmResult {
    const id = randomUUID();
    const now = new Date().toISOString();

    this.db.prepare(`
      INSERT INTO algorithm_results (
        id, run_id, algorithm, result_type, summary, payload_json, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      result.runId,
      result.algorithm,
      result.resultType,
      result.summary,
      JSON.stringify(result.payload || {}),
      now
    );

    return {
      ...result,
      id,
      createdAt: now
    };
  }

  getRecentRuns(caseId: string, limit = 20): Array<AlgorithmRun & { results: AlgorithmResult[] }> {
    const rows = this.db.prepare(`
      SELECT * FROM algorithm_runs WHERE case_id = ? ORDER BY created_at DESC LIMIT ?
    `).all(caseId, limit) as Array<Record<string, unknown>>;

    return rows.map(r => {
      const runId = r.id as string;
      const resRows = this.db.prepare(`
        SELECT * FROM algorithm_results WHERE run_id = ?
      `).all(runId) as Array<Record<string, unknown>>;

      const results: AlgorithmResult[] = resRows.map(rr => ({
        id: rr.id as string,
        runId: rr.run_id as string,
        algorithm: rr.algorithm as string,
        resultType: rr.result_type as string,
        summary: rr.summary as string,
        payload: JSON.parse((rr.payload_json as string) || '{}'),
        createdAt: rr.created_at as string
      }));

      return {
        id: runId,
        caseId: r.case_id as string,
        possibilityId: (r.possibility_id as string) || undefined,
        algorithm: r.algorithm as string,
        algorithmVersion: r.algorithm_version as string,
        parameters: JSON.parse((r.parameters_json as string) || '{}'),
        graphVersion: r.graph_version as number,
        inputNodeCount: r.input_node_count as number,
        inputEdgeCount: r.input_edge_count as number,
        executionTimeMs: r.execution_time_ms as number,
        createdAt: r.created_at as string,
        results
      };
    });
  }
}

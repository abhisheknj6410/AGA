import { DatabaseSync } from 'node:sqlite';

export function runMigrations(db: DatabaseSync): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS cases (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS nodes (
      id TEXT PRIMARY KEY,
      case_id TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
      category TEXT NOT NULL,
      type TEXT NOT NULL,
      label TEXT NOT NULL,
      properties_json TEXT,
      metadata_json TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS events (
      node_id TEXT PRIMARY KEY REFERENCES nodes(id) ON DELETE CASCADE,
      event_type TEXT NOT NULL,
      time_start TEXT,
      time_end TEXT,
      time_precision TEXT NOT NULL DEFAULT 'SECOND'
    );

    CREATE TABLE IF NOT EXISTS evidence (
      node_id TEXT PRIMARY KEY REFERENCES nodes(id) ON DELETE CASCADE,
      evidence_type TEXT NOT NULL,
      source_name TEXT NOT NULL,
      source_kind TEXT NOT NULL,
      source_reference TEXT,
      reliability REAL NOT NULL DEFAULT 1.0,
      collection_time TEXT,
      hash_checksum TEXT
    );

    CREATE TABLE IF NOT EXISTS edges (
      id TEXT PRIMARY KEY,
      case_id TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
      source_id TEXT NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
      target_id TEXT NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'OBSERVED',
      cost REAL NOT NULL DEFAULT 1.0,
      confidence REAL,
      properties_json TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS edge_evidence (
      edge_id TEXT NOT NULL REFERENCES edges(id) ON DELETE CASCADE,
      evidence_id TEXT NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
      PRIMARY KEY (edge_id, evidence_id)
    );

    CREATE TABLE IF NOT EXISTS node_evidence (
      node_id TEXT NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
      evidence_id TEXT NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
      relationship TEXT NOT NULL DEFAULT 'SUPPORTS',
      PRIMARY KEY (node_id, evidence_id)
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      case_id TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
      who TEXT NOT NULL,
      action TEXT NOT NULL,
      object_type TEXT NOT NULL,
      object_id TEXT NOT NULL,
      old_value_json TEXT,
      new_value_json TEXT,
      timestamp TEXT NOT NULL,
      reason TEXT
    );

    CREATE TABLE IF NOT EXISTS resolution_candidates (
      id TEXT PRIMARY KEY,
      case_id TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
      source_node_id TEXT NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
      target_node_id TEXT NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
      match_type TEXT NOT NULL,
      similarity_score REAL NOT NULL,
      reason TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'PENDING',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS case_graph_versions (
      id TEXT PRIMARY KEY,
      case_id TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
      version_number INTEGER NOT NULL,
      snapshot_json TEXT,
      change_summary TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS possibilities (
      id TEXT PRIMARY KEY,
      case_id TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT,
      base_graph_version INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'VALID',
      generation_method TEXT NOT NULL,
      assumptions_json TEXT NOT NULL DEFAULT '[]',
      graph_changes_json TEXT NOT NULL DEFAULT '{}',
      constraints_json TEXT NOT NULL DEFAULT '{}',
      supporting_evidence_json TEXT NOT NULL DEFAULT '[]',
      conflicting_evidence_json TEXT NOT NULL DEFAULT '[]',
      unresolved_questions_json TEXT NOT NULL DEFAULT '[]',
      canonical_signature TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS algorithm_runs (
      id TEXT PRIMARY KEY,
      case_id TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
      possibility_id TEXT REFERENCES possibilities(id) ON DELETE CASCADE,
      algorithm TEXT NOT NULL,
      algorithm_version TEXT NOT NULL DEFAULT '1.0.0',
      parameters_json TEXT NOT NULL DEFAULT '{}',
      graph_version INTEGER NOT NULL DEFAULT 1,
      input_node_count INTEGER NOT NULL DEFAULT 0,
      input_edge_count INTEGER NOT NULL DEFAULT 0,
      execution_time_ms REAL NOT NULL DEFAULT 0.0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS algorithm_results (
      id TEXT PRIMARY KEY,
      run_id TEXT NOT NULL REFERENCES algorithm_runs(id) ON DELETE CASCADE,
      algorithm TEXT NOT NULL,
      result_type TEXT NOT NULL,
      summary TEXT NOT NULL,
      payload_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL
    );

    -- Performance and Integrity Indexes
    CREATE INDEX IF NOT EXISTS idx_nodes_case_id ON nodes(case_id);
    CREATE INDEX IF NOT EXISTS idx_nodes_category_type ON nodes(category, type);
    CREATE INDEX IF NOT EXISTS idx_nodes_label ON nodes(label);
    CREATE INDEX IF NOT EXISTS idx_edges_case_id ON edges(case_id);
    CREATE INDEX IF NOT EXISTS idx_edges_source ON edges(source_id);
    CREATE INDEX IF NOT EXISTS idx_edges_target ON edges(target_id);
    CREATE INDEX IF NOT EXISTS idx_edges_type ON edges(type);
    CREATE INDEX IF NOT EXISTS idx_events_time_start ON events(time_start);
    CREATE INDEX IF NOT EXISTS idx_edge_evidence_edge ON edge_evidence(edge_id);
    CREATE INDEX IF NOT EXISTS idx_edge_evidence_evidence ON edge_evidence(evidence_id);
    CREATE INDEX IF NOT EXISTS idx_audit_case ON audit_logs(case_id);
    CREATE INDEX IF NOT EXISTS idx_resolution_case ON resolution_candidates(case_id);
    CREATE INDEX IF NOT EXISTS idx_graph_versions_case ON case_graph_versions(case_id, version_number);
    CREATE INDEX IF NOT EXISTS idx_possibilities_case ON possibilities(case_id);
    CREATE INDEX IF NOT EXISTS idx_possibilities_signature ON possibilities(case_id, canonical_signature);
    CREATE INDEX IF NOT EXISTS idx_algorithm_runs_case ON algorithm_runs(case_id);
    CREATE INDEX IF NOT EXISTS idx_algorithm_runs_possibility ON algorithm_runs(possibility_id);
    CREATE INDEX IF NOT EXISTS idx_algorithm_results_run ON algorithm_results(run_id);
  `);
}

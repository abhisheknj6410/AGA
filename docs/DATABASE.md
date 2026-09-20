# Relational Database Schema & Data Layer

The persistence layer uses a normalized relational model implemented in SQLite with `PRAGMA foreign_keys = ON;` and WAL (Write-Ahead Logging) journal mode.

---

## 1. Relational Schema Architecture

```
┌──────────────┐         ┌────────────────────────┐
│    cases     │ 1 ────* │         nodes          │
│──────────────│         │────────────────────────│
│ id (PK)      │         │ id (PK)                │
│ name         │         │ case_id (FK -> cases)  │
│ status       │         │ category, type, label  │
└──────────────┘         └───────────┬────────────┘
                                     │ 1
                         ┌───────────┴───────────┐
                         ▼ 1                     ▼ 1
                 ┌───────────────┐       ┌───────────────┐
                 │    events     │       │   evidence    │
                 │───────────────│       │───────────────│
                 │ node_id (PK)  │       │ node_id (PK)  │
                 │ time_start    │       │ source_name   │
                 │ time_end      │       │ reliability   │
                 │ precision     │       │ hash_checksum │
                 └───────────────┘       └───────────────┘

┌────────────────────────┐         ┌────────────────────────┐
│         edges          │ 1 ────* │     edge_evidence      │ * ──── 1 evidence
│────────────────────────│         │────────────────────────│
│ id (PK)                │         │ edge_id (PK, FK)       │
│ case_id (FK -> cases)  │         │ evidence_id (PK, FK)   │
│ source_id (FK -> nodes)│         └────────────────────────┘
│ target_id (FK -> nodes)│
│ type, status, cost     │
└────────────────────────┘

┌────────────────────────┐         ┌────────────────────────┐
│       audit_logs       │         │ resolution_candidates  │
│────────────────────────│         │────────────────────────│
│ id (PK)                │         │ id (PK)                │
│ case_id (FK -> cases)  │         │ case_id (FK -> cases)  │
│ who, action, timestamp │         │ source_node_id (FK)    │
│ old_value, new_value   │         │ target_node_id (FK)    │
│ reason                 │         │ match_type, score      │
└────────────────────────┘         └────────────────────────┘
```

---

## 2. Table Definitions

### `cases`
| Column | Type | Constraints | Description |
|:---|:---|:---|:---|
| `id` | TEXT | PRIMARY KEY | Unique UUID |
| `name` | TEXT | NOT NULL | Title of investigation |
| `description`| TEXT | | Background context |
| `status` | TEXT | NOT NULL | `ACTIVE`, `CLOSED`, `ARCHIVED` |
| `created_at` | TEXT | NOT NULL | ISO 8601 creation time |
| `updated_at` | TEXT | NOT NULL | ISO 8601 update time |

### `nodes`
| Column | Type | Constraints | Description |
|:---|:---|:---|:---|
| `id` | TEXT | PRIMARY KEY | Unique Node ID |
| `case_id` | TEXT | NOT NULL, REFERENCES `cases(id)` ON DELETE CASCADE | Scoped case |
| `category` | TEXT | NOT NULL | `ENTITY`, `EVENT`, `EVIDENCE` |
| `type` | TEXT | NOT NULL | Controlled type enum |
| `label` | TEXT | NOT NULL | Human-readable title |
| `properties_json` | TEXT | | JSON key-value properties |
| `metadata_json` | TEXT | | Provenance & import metadata |
| `created_at` | TEXT | NOT NULL | Timestamp |
| `updated_at` | TEXT | NOT NULL | Timestamp |

### `events` (Extension of `nodes`)
| Column | Type | Constraints | Description |
|:---|:---|:---|:---|
| `node_id` | TEXT | PRIMARY KEY, REFERENCES `nodes(id)` ON DELETE CASCADE | Foreign key to node |
| `event_type` | TEXT | NOT NULL | Specific event type |
| `time_start` | TEXT | | ISO 8601 start timestamp |
| `time_end` | TEXT | | ISO 8601 end timestamp |
| `time_precision` | TEXT | NOT NULL DEFAULT `'SECOND'` | `SECOND`, `MINUTE`, `HOUR`, `DAY`, `UNKNOWN` |

### `evidence` (Extension of `nodes`)
| Column | Type | Constraints | Description |
|:---|:---|:---|:---|
| `node_id` | TEXT | PRIMARY KEY, REFERENCES `nodes(id)` ON DELETE CASCADE | Foreign key to node |
| `evidence_type` | TEXT | NOT NULL | Specific evidence type |
| `source_name` | TEXT | NOT NULL | File or sensor identifier |
| `source_kind` | TEXT | NOT NULL | `SYSTEM`, `HUMAN`, `DEVICE`, etc. |
| `source_reference` | TEXT | | External docket or file path |
| `reliability` | REAL | NOT NULL DEFAULT 1.0 | Float between 0.0 and 1.0 |
| `collection_time` | TEXT | | ISO 8601 acquisition time |
| `hash_checksum` | TEXT | | SHA-256 cryptographic hash |

### `edges`
| Column | Type | Constraints | Description |
|:---|:---|:---|:---|
| `id` | TEXT | PRIMARY KEY | Unique Edge UUID |
| `case_id` | TEXT | NOT NULL, REFERENCES `cases(id)` ON DELETE CASCADE | Scoped case |
| `source_id` | TEXT | NOT NULL, REFERENCES `nodes(id)` ON DELETE CASCADE | Tail node |
| `target_id` | TEXT | NOT NULL, REFERENCES `nodes(id)` ON DELETE CASCADE | Head node |
| `type` | TEXT | NOT NULL | Controlled relationship type |
| `status` | TEXT | NOT NULL DEFAULT `'OBSERVED'` | `OBSERVED`, `DERIVED`, `HYPOTHESIZED` |
| `cost` | REAL | NOT NULL DEFAULT 1.0 | Traversal cost ($\ge 0$) |
| `confidence` | REAL | | Nullable confidence score (0.0 to 1.0) |
| `properties_json` | TEXT | | Custom edge attributes |
| `created_at` | TEXT | NOT NULL | Timestamp |
| `updated_at` | TEXT | NOT NULL | Timestamp |

### Junction Table: `edge_evidence`
- `edge_id` TEXT REFERENCES `edges(id)` ON DELETE CASCADE
- `evidence_id` TEXT REFERENCES `nodes(id)` ON DELETE CASCADE
- PRIMARY KEY (`edge_id`, `evidence_id`)

---

## 3. Database Indexes

To support sub-millisecond query performance on graph exploration, filtering, and neighborhood inspection:
- `idx_nodes_case_id` ON `nodes(case_id)`
- `idx_nodes_category_type` ON `nodes(category, type)`
- `idx_nodes_label` ON `nodes(label)`
- `idx_edges_case_id` ON `edges(case_id)`
- `idx_edges_source` ON `edges(source_id)`
- `idx_edges_target` ON `edges(target_id)`
- `idx_edges_type` ON `edges(type)`
- `idx_events_time_start` ON `events(time_start)`
- `idx_edge_evidence_edge` ON `edge_evidence(edge_id)`
- `idx_edge_evidence_evidence` ON `edge_evidence(evidence_id)`
- `idx_audit_case` ON `audit_logs(case_id)`
- `idx_resolution_case` ON `resolution_candidates(case_id)`

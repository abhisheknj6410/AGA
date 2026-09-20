# Architecture & Design Specifications

## 1. Core Architectural Principle

> **The graph is the primary source of computational truth.**
> AI is NOT the primary reasoning engine.

In forensic and graph investigations:
- Facts must be grounded in primary evidence.
- Hypotheses must remain visually and logically distinct from observed facts.
- Graph relationships must never be silently fabricated.
- If AI extraction is used, it operates as an untrusted input generator producing raw structured candidates. All candidates pass through the exact same schema, temporal, relationship-matrix, and provenance validators before persistence.

---

## 2. Graph Construction Pipeline

```
Raw Evidence (Logs, PCAP, CCTV, Interviews)
    │
    ▼
Evidence Registration (Generates UUID, hash, source metadata, reliability score)
    │
    ▼
Normalization & Parsing
    │
    ▼
Entity & Event Extraction (First-class typed nodes with temporal intervals)
    │
    ▼
Relationship Extraction (Direction validation against vocabulary matrix)
    │
    ▼
Validation Engine (Structural, Temporal, Provenance, Isolation checks)
    │
    ▼
Entity Resolution (Exact auto-match vs Possible duplicate staging for human review)
    │
    ▼
Persistence (SQLite WAL mode, Foreign keys, Junction tables, Transactions)
    │
    ▼
Interactive Cytoscape.js Explorer & Provenance Navigation
```

---

## 3. Entity Resolution Architecture

Incorrect automated entity collapsing can distort graph paths, shortest routes, articulation points, and min-cut analysis. Therefore, the system implements a **multi-tier safe resolution model**:

```
                       Input Candidates
                              │
               ┌──────────────┴──────────────┐
               ▼                             ▼
       Shared Ext ID or            String Similarity &
      Exact Normalized Name         Nickname/Initial Heuristics
               │                             │
       [EXACT_MATCH]                 ┌───────┴───────┐
               │                     ▼               ▼
          Auto-Merge            >= 70% match      < 70% match
                                     │               │
                             [POSSIBLE_MATCH]    [NO_MATCH]
                                     │
                             Stage for Human
                           Investigator Review
                                     │
                        ┌────────────┴────────────┐
                        ▼                         ▼
                  Confirm Merge             Mark Distinct
```

### Safe Merge Execution:
1. **Preserve Aliases**: Canonical entity updates its `aliases` property with the duplicate's label and aliases.
2. **Rewire Edges**: In a single atomic database transaction, all incoming and outgoing edges linked to the duplicate node are redirected to the canonical node. Self-loops are pruned.
3. **Audit Log**: An append-only audit record captures the merge action, original node definitions, and investigator reason.
4. **Prune Duplicate**: The duplicate node is removed from the active graph.

---

## 4. Case Isolation Architecture

Multiple investigations exist independently within the system:
- Every node, event, evidence object, edge, resolution candidate, and audit log is keyed by `case_id`.
- Foreign key cascading deletes (`ON DELETE CASCADE`) ensure complete clean-up without dangling elements.
- The validation engine strictly rejects cross-case references: an edge cannot connect a node in Case A to a node in Case B.

---

## 5. Auditability & Snapshot Design

Forensic defensibility requires tracking every mutation. The `audit_logs` table records:
- `id`: Unique event ID
- `case_id`: Scope of investigation
- `who`: Author/investigator principal
- `action`: `CREATE`, `UPDATE`, `DELETE`, `MERGE`, `IMPORT`
- `object_type`: `CASE`, `NODE`, `EDGE`, `EVIDENCE`, `RESOLUTION`
- `object_id`: Target entity
- `old_value_json` & `new_value_json`: State snapshot before and after mutation
- `timestamp`: Server-controlled ISO 8601 time
- `reason`: Justification provided by investigator

# Phase 3 — Incremental Graph Reasoning Architecture

This document specifies the architecture and implementation of **Incremental Graph Reasoning** in the Graphical Investigation System. Under this paradigm, graph mutations (evidence additions, removals, timestamp shifts, relationship alterations, entity resolutions) trigger selective, versioned, dependency-aware graph recomputation and causal explanation rather than full black-box regeneration.

---

## 1. Graph Version Model

Every meaningful topological or epistemic change to an investigation produces an immutable, linearly ordered `GraphVersion`:

```text
Graph Version 1 (V1)
        ↓  Evidence E12 Added (Wiretap Corroboration)
Graph Version 2 (V2)
        ↓  Evidence E07 Revoked (Satellite Telemetry)
Graph Version 3 (V3)
        ↓  Timestamp Shift (Turnpike Transit: 14:20 → 16:00)
Graph Version 4 (V4)
```

Each version record stores:
- `versionNumber`: Incremental sequence number ($1, 2, 3, \dots$).
- `parentVersionNumber`: Immediate predecessor version.
- `mutation`: Semantic operation descriptor (`action`, `targetType`, `targetId`, `summary`, `timestamp`, `author`).
- `delta`: The precise `GraphMutationDelta` computed between parent and current graph snapshots.
- `affectedSubgraph`: The calculated propagation zone.
- `snapshot`: Complete serializable graph state at this version.

---

## 2. Graph Delta Model (`GraphMutationDelta`)

Graph changes are represented as semantically typed differences:

```typescript
export interface GraphMutationDelta {
  addedNodes: GraphNode[];
  removedNodes: GraphNode[];
  modifiedNodes: Array<{ before: GraphNode; after: GraphNode }>;
  addedEdges: GraphEdge[];
  removedEdges: GraphEdge[];
  modifiedEdges: Array<{ before: GraphEdge; after: GraphEdge }>;
  changedEvidence: Array<{ evidenceId: string; type: 'ADDED' | 'REMOVED' | 'MODIFIED'; detail?: string }>;
  changedTemporalConstraints: Array<{ eventId: string; beforeTime?: string; afterTime?: string; reason: string }>;
  changedIdentityConstraints: Array<{ sourceId: string; targetId: string; action: 'MERGED' | 'SEPARATED' | 'PENDING' }>;
}
```

This prevents raw object equality ambiguities and captures semantic investigative operations (e.g. "Event E7 shifted 14:20 → 16:00; chronological inversion introduced").

---

## 3. Affected-Subgraph Detection Engine

Implemented in [`backend/src/domain/algorithms/affected-subgraph-engine.ts`](file:///home/zius/Projects/Graphical-Investigation-system/backend/src/domain/algorithms/affected-subgraph-engine.ts).

Given a delta, the engine computes the bounded propagation region:
1. **Direct Seed Collection**: Direct node/edge additions, removals, modifications, and incident edges to changed evidence.
2. **Neighborhood Reachability Expansion**: 1-hop forward and backward directed closures from seed nodes.
3. **Possibility Path Membership Cross-Check**: Any active possibility path whose vertices, edges, or supporting evidence intersect the seed set is marked affected.
4. **Safety Rule**: If propagation boundary is ambiguous, the engine conservatively includes incident components. Stale cached results are never retained.

---

## 4. Algorithm Dependency Graph

Implemented in [`backend/src/domain/algorithms/algorithm-dependency-graph.ts`](file:///home/zius/Projects/Graphical-Investigation-system/backend/src/domain/algorithms/algorithm-dependency-graph.ts).

Formal dependency cascade:

```text
               GRAPH_TOPOLOGY
              ┌───────┴───────┐
              ↓               ↓
      K_SHORTEST_PATHS    ENTITY_RESOLUTION
       ┌──────┴──────┐        │
       ↓             ↓        │
TEMPORAL_VALIDATION  EVIDENCE_PROVENANCE
       └──────┬──────┘        │
              └───────┬───────┘
                      ↓
               POSSIBILITY_SET
       ┌──────────────┼──────────────┐
       ↓              ↓              ↓
DOMINATOR_ANALYSIS  DISJOINT_PATHS  COMMON_INVARIANTS
```

Downstream Invalidation Rules:
- If `GRAPH_TOPOLOGY` or `K_SHORTEST_PATHS` changes, all downstream path validations, possibility sets, dominators, and common invariants are invalidated.
- If only an unrelated peripheral node or metadata changes, unaffected algorithm results are safely reused.

---

## 5. Result Caching & Invalidation Engine

Implemented in [`backend/src/infrastructure/algorithm-result-cache.ts`](file:///home/zius/Projects/Graphical-Investigation-system/backend/src/infrastructure/algorithm-result-cache.ts).

- Cache entries record: `key`, `algorithm`, `graphVersion`, `dependentNodes`, `dependentEdges`, `dependentEvidence`.
- When `invalidateAffected(delta, affectedSubgraph)` executes:
  - Cache entries whose dependencies intersect `affectedSubgraph` are pruned.
  - Unaffected entries are retained and recorded as computational savings.
  - Metrics tracked: `reusedCount`, `invalidatedCount`, `recomputedCount`.

---

## 6. Possibility Evolution Engine (`PossibilityEvolutionEngine`)

Implemented in [`backend/src/application/possibility-evolution-engine.ts`](file:///home/zius/Projects/Graphical-Investigation-system/backend/src/application/possibility-evolution-engine.ts).

Compares $\text{PossibilitySpace}(V_n)$ against $\text{PossibilitySpace}(V_{n+1})$ to classify branches:
- **`+ Added`**: Possibility spawned by a new edge, evidence satisfaction, or entity merge.
- **`- Removed`**: Possibility eliminated because required evidence was removed, an edge was severed, or a timestamp shifted into chronological inversion.
- **`~ Modified`**: Possibility whose epistemic status transitioned (`VALID → INVALID`, `VALID → CONFLICTING`) or whose supporting evidence changed.
- **`= Unchanged`**: Structurally invariant possibility preserved across mutations.

Every transition includes an explicit **causal explanation** derived from the constraint engine.

---

## 7. Counterfactual Simulation Laboratory ("What-If?")

Implemented in [`backend/src/application/incremental-reasoning-engine.ts`](file:///home/zius/Projects/Graphical-Investigation-system/backend/src/application/incremental-reasoning-engine.ts).

Investigators can evaluate hypothetical operations without modifying the persistent case database:
1. Clones the graph payload in-memory.
2. Applies the hypothetical mutation (e.g. `REMOVE_EVIDENCE`, `ADD_EVIDENCE`, `MERGE_ENTITIES`).
3. Executes deterministic graph algorithms with `persist: false`.
4. Compares baseline possibilities against simulated possibilities.
5. Emits a `SimulationResult` showing spawned, eliminated, and surviving branches.

---

## 8. Investigation Agent Integration

The Query Agent ([`backend/src/application/investigation-agent-service.ts`](file:///home/zius/Projects/Graphical-Investigation-system/backend/src/application/investigation-agent-service.ts)) answers evolution inquiries deterministically:
- *"What changed between versions?"* → Reports delta summary, affected subgraph, and possibility evolution breakdown.
- *"Why did this possibility disappear?"* → Returns exact eliminating algorithm and constraint violation.
- *"Why was this possibility created?"* → Returns spawning algorithm and topological trigger.
- *"What would happen if I removed this evidence?"* → Triggers in-memory counterfactual simulation and reports the resulting possibility space diff.
- *"What remains invariant across versions?"* → Extracts universal entities, events, and relationships true across all surviving branches.

---

## 9. Automated Verification Suite

All 12 incremental reasoning requirements are verified in [`backend/src/tests/incremental-reasoning.test.ts`](file:///home/zius/Projects/Graphical-Investigation-system/backend/src/tests/incremental-reasoning.test.ts) (82/82 total backend tests passing):
- Test 1: Evidence addition creates new possibility
- Test 2: Evidence removal eliminates dependent possibility with provenance reason
- Test 3: Timestamp modification invalidates affected paths
- Test 4: Edge addition creates candidate path
- Test 5: Edge removal eliminates candidate path
- Test 6: Entity merge alters reachability and possibility space
- Test 7: Entity separation rejects merge hypothesis
- Test 8: Incremental invalidation leaves unrelated results valid
- Test 9: Version comparison accurately reports added/removed/modified/unchanged
- Test 10: Algorithm dependency invalidates downstream analyses
- Test 11: Cache reuse saves computational work on unaffected subgraphs
- Test 12: What-if simulation evaluates counterfactuals without mutating real database

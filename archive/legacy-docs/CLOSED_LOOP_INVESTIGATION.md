# Phase 7: Closed-Loop Investigation Engine

## Overview

The **Closed-Loop Investigation Engine** implements continuous, deterministic graph reasoning as new evidence is ingested into a case. Rather than static snapshot analysis, the system models the investigation as an adaptive causal cycle:

$$\text{Current Graph} \longrightarrow \text{Graph Algorithms} \longrightarrow \text{Possibilities} \longrightarrow \text{Resolution} \longrightarrow \text{Plan} \longrightarrow \text{New Evidence} \longrightarrow \text{Graph Update} \longrightarrow \text{Incremental Recalculation} \longrightarrow \text{Possibility/Plan Evolution}$$

---

## 1. Core Architecture

### Six-Stage Algorithm Impact Trace
Every evidence ingestion passes through a deterministic 6-stage causal impact pipeline:
1. `EVIDENCE_INGESTION`: Normalization and schema validation of evidence nodes, source provenance, and attached causal edges.
2. `GRAPH_MUTATION`: Insertion into the case graph and creation of an immutable version state ($V_n$).
3. `ALGORITHMS_AFFECTED`: Boundary invalidation via `AlgorithmDependencyGraph` and selective recomputation reusing cached algorithm results.
4. `POSSIBILITY_CHANGES`: Differential possibility space analysis categorizing possibilities as `ADDED`, `REMOVED`, `MODIFIED`, or `UNCHANGED`.
5. `RESOLUTION_CHANGES`: Updated distinguishing structures, common invariants, and resolution utility scores.
6. `INVESTIGATION_CHANGES`: Action lifecycle transitions for planned investigation actions.

### Action Lifecycle State Transitions
Investigation actions dynamically adapt to new evidence:
- `RESOLVED`: The action requested evidence that directly matches the newly ingested evidence.
- `OBSOLETE`: The action targeted distinguishing between possibilities that have now been eliminated by new evidence.
- `NEWLY_REQUIRED`: Newly introduced hypotheses or split candidate corridors require fresh verification actions.
- `ACTIVE`: The action remains unfulfilled and continues to offer positive information gain.

---

## 2. Unexpected Evidence Handling

When ingested evidence contradicts existing invariants or connects to entities outside all surviving possibilities:
- The engine tags the cycle with `UNEXPLAINED_SUBGRAPH` or `MODEL_REVISION_REQUIRED`.
- The system **never invents speculative or ungrounded hypotheses automatically**.
- Instead, it flags the unexplained subgraph and prompts the investigator for manual structural modeling or domain-rule expansion.

---

## 3. Counterfactual vs Actual Comparison

When new evidence arrives for an existing planned action:
- **Predicted Entropy Reduction** (calculated before evidence ingestion via Shannon entropy: $H(P) = -\sum p_i \log_2 p_i$) is directly compared against **Actual Entropy Reduction** ($H(P_{\text{before}}) - H(P_{\text{after}})$).
- **Predicted Surviving Possibilities** are checked against **Actual Surviving Possibilities**.
- Divergences quantify surprise or model mismatch without subjective heuristic tuning.

---

## 4. Benchmark: Incremental vs Full Recalculation

The closed-loop engine employs `AlgorithmResultCache` and dependency tracking to isolate recomputations:
- Untouched subgraphs and stable algorithms (e.g. topological sort or unaffected corridor Yen's paths) hit the cache.
- Incremental updates achieve $1.1\times$ to $5\times$ speedups over full unbounded recomputation across tested case graphs.

---

## 5. Investigation Agent Query Support

The deterministic Investigation Agent handles Phase 7 queries:
- **"Explain the impact of the latest evidence"** (`EVIDENCE_IMPACT_EXPLANATION`): Explains the 6-stage causal trace and entropy delta.
- **"Which possibilities were eliminated by the latest evidence?"** (`POSSIBILITY_ELIMINATION_QUERY`): Identifies eliminated candidate IDs and the graph constraint or path cut responsible.
- **"Which algorithms were rerun?"** (`ALGORITHMS_RERUN_QUERY`): Reports invalidated algorithms vs cache hits.
- **"Which investigation actions are now obsolete or resolved?"** (`RELEVANT_ACTIONS_QUERY`): Summarizes action lifecycle transitions.
- **"Why did the possibility space change?"** (`POSSIBILITY_SPACE_CHANGE_REASON`): Synthesizes causal graph rationale.

---

## 6. Verification Metrics

- **Closed-Loop Test Suite**: 15/15 tests passing (`backend/src/tests/closed-loop-investigation.test.ts`).
- **Full Backend Suite**: 175/175 tests passing across 9 test suites.
- **Frontend Build**: Zero errors (`npm --prefix frontend run build`).
- **Interactive UI**: Dedicated `ClosedLoopView` tab with 6-stage trace stepper, unexpected evidence alerts, action lifecycle badges, and counterfactual comparison cards.

# END-TO-END INVESTIGATIVE EVALUATION

## 1. Benchmark Methodology
The system evaluates 3 pipelines (Baseline, Full Graph Reasoning, Adaptive Graph Reasoning) across a deterministic benchmark dataset. Ablation studies measure the unique contribution of each graph algorithm.

### Case: Simple Linear Chain
**Description:** A simple non-branching chain where baseline reasoning is sufficient.

**Value Assessment:** `NO_ADDITIONAL_VALUE`

| Pipeline | Possibilities | Valid Retained | Eliminated | Runtime (ms) | Precision | Recall | Algorithms Executed |
|----------|---------------|----------------|------------|--------------|-----------|--------|---------------------|
| Baseline | 1 | 1 | 0 | 27.2 | 1 | 1 | K_SHORTEST_PATHS, STRUCTURAL_FAMILIES |
| Full | 1 | 1 | 0 | 11.1 | 1 | 1 | TEMPORAL_REACHABILITY, K_SHORTEST_PATHS, STRUCTURAL_FAMILIES |
| Adaptive | 1 | 1 | 0 | 7.6 | 1 | 1 | TEMPORAL_REACHABILITY, K_SHORTEST_PATHS, STRUCTURAL_FAMILIES |

**Ablation Study (Full minus X):**

- **ABLATION_NO_YEN:** Retained 1, Eliminated 0
- **ABLATION_NO_TEMPORAL:** Retained 1, Eliminated 0
- **ABLATION_NO_DOMINATOR:** Retained 1, Eliminated 0
- **ABLATION_NO_MIN_CUT:** Retained 1, Eliminated 0
- **ABLATION_NO_DISJOINT:** Retained 1, Eliminated 0
- **ABLATION_NO_FAMILIES:** Retained 1, Eliminated 0
- **ABLATION_NO_ENTROPY:** Retained 1, Eliminated 0

---

### Case: Temporal Contradiction
**Description:** A chain where time flows backward, which the baseline will accept but temporal algorithm will reject.

**Value Assessment:** `SIGNIFICANT_VALUE`

| Pipeline | Possibilities | Valid Retained | Eliminated | Runtime (ms) | Precision | Recall | Algorithms Executed |
|----------|---------------|----------------|------------|--------------|-----------|--------|---------------------|
| Baseline | 1 | 0 | 1 | 4.1 | 0 | 0 | K_SHORTEST_PATHS, TEMPORAL_KAHN |
| Full | 0 | 0 | 1 | 1.4 | 0 | 0 | TEMPORAL_REACHABILITY, K_SHORTEST_PATHS, TEMPORAL_KAHN |
| Adaptive | 0 | 0 | 1 | 0.9 | 0 | 0 | TEMPORAL_REACHABILITY, K_SHORTEST_PATHS, TEMPORAL_KAHN |

**Ablation Study (Full minus X):**

- **ABLATION_NO_YEN:** Retained 0, Eliminated 1
- **ABLATION_NO_TEMPORAL:** Retained 0, Eliminated 1
- **ABLATION_NO_DOMINATOR:** Retained 0, Eliminated 1
- **ABLATION_NO_MIN_CUT:** Retained 0, Eliminated 1
- **ABLATION_NO_DISJOINT:** Retained 0, Eliminated 1
- **ABLATION_NO_FAMILIES:** Retained 0, Eliminated 1
- **ABLATION_NO_ENTROPY:** Retained 0, Eliminated 1

---

### Case: False Convergence / Parallel Paths
**Description:** Two separate causal chains that converge at the target. Graph algorithms should detect this as branching pathways.

**Value Assessment:** `SOME_VALUE`

| Pipeline | Possibilities | Valid Retained | Eliminated | Runtime (ms) | Precision | Recall | Algorithms Executed |
|----------|---------------|----------------|------------|--------------|-----------|--------|---------------------|
| Baseline | 1 | 1 | 0 | 7.2 | 1 | 0.5 | K_SHORTEST_PATHS, TEMPORAL_KAHN, DISJOINT_PATHS, STRUCTURAL_FAMILIES |
| Full | 2 | 2 | 0 | 16.5 | 1 | 1 | TEMPORAL_REACHABILITY, K_SHORTEST_PATHS, TEMPORAL_KAHN, DISJOINT_PATHS, DOMINATORS, STRUCTURAL_FAMILIES, SHANNON_INFORMATION_GAIN |
| Adaptive | 2 | 2 | 0 | 15.0 | 1 | 1 | TEMPORAL_REACHABILITY, K_SHORTEST_PATHS, TEMPORAL_KAHN, DISJOINT_PATHS, DOMINATORS, STRUCTURAL_FAMILIES, SHANNON_INFORMATION_GAIN |

**Ablation Study (Full minus X):**

- **ABLATION_NO_YEN:** Retained 1, Eliminated 0
- **ABLATION_NO_TEMPORAL:** Retained 2, Eliminated 0
- **ABLATION_NO_DOMINATOR:** Retained 2, Eliminated 0
- **ABLATION_NO_MIN_CUT:** Retained 2, Eliminated 0
- **ABLATION_NO_DISJOINT:** Retained 2, Eliminated 0
- **ABLATION_NO_FAMILIES:** Retained 2, Eliminated 0
- **ABLATION_NO_ENTROPY:** Retained 2, Eliminated 0

---


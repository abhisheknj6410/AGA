# Graph-First Architecture Audit & Refactoring Specification
**Commit Baseline**: `62cd6ae`  
**Status**: Comprehensive Engineering Audit & Causal Graph Refactoring Plan  

---

## 16.A Architecture Audit

### 1. Executive Evaluation
The codebase at commit `62cd6ae` contains genuine, sophisticated graph algorithms implemented in TypeScript:
- **Yen's K-Shortest Loopless Paths** (`k-shortest-paths.ts`)
- **Dijkstra Min-Heap Shortest Path** (`dijkstra.ts`)
- **Lengauer-Tarjan Dominator Tree** (`dominators.ts`)
- **Edmonds-Karp / Ford-Fulkerson Min-Cut** (`min-cut.ts`)
- **Suurballe Vertex/Edge Disjoint Paths** (`disjoint-paths.ts`)
- **Hopcroft-Tarjan Articulation Points** (`articulation-points.ts`)
- **Kahn Topological Sort & Chronology Verification** (`temporal-analysis.ts`)
- **Shannon Information Gain & Entropy Partitioning** (`investigation-decision-engine.ts`)

However, an audit of how these algorithms interact with the 10-stage `CaseReasoningPipeline` reveals an architectural tension:

1. **Where Graph Algorithms are Genuinely Upstream**:
   - `EvidenceReconstructionEngine` applies 7 deterministic validation gates (`SCHEMA`, `TEMPORAL`, `PROVENANCE`, `ENTITY_IDENTITY`, `RELATIONSHIP_DIRECTION`, `CONTRADICTION`, `DISCONNECTED_FACT`). No AI decides edge admission.
   - Contradiction detection (`detectContradictions`) identifies physical impossibility (e.g. concurrent location of the same entity), cleanly splitting the graph into candidate interpretations (e.g. `Interpretation Alpha` vs `Interpretation Beta`).
   - `PossibilityEngine` executes Yen's K-Shortest Paths to find alternative corridors and uses `TemporalAnalysisAlgorithm.validatePathChronology` and `PossibilityConstraintEngine` to prune paths with temporal inversions or missing evidence.

2. **Where the Risk of "Graph as Bookkeeping / Decorative" Exists**:
   - In `AdaptiveReasoningEngine`, 7 algorithms are executed or skipped based on graph fingerprints. While equivalence verification tests were built (Phase 11-12), the outputs of `MinCut`, `Dominators`, and `DisjointPaths` were stored as metadata on possibilities and summarized in narrative text rather than being **hard causal gates that actively prune or validate possibility branches**.
   - `InvestigationDecisionEngine` derives recommendations using Shannon Entropy reduction and Min-Cut boundaries, but prior to this audit, if an investigator asked *"Why is Mercer at the Vault impossible on Branch Beta?"*, the explanation leaned on textual synthesis rather than a direct execution trace of a graph reachability algorithm.
   - There is no formal `AlgorithmExecution` audit record connecting the exact input graph slice, algorithm parameters, and derived mathematical proof to the resulting branch elimination.

### 2. End-to-End Pipeline Stage Table

| Stage | Input | Output | Graph-dependent? | Algorithm | Deterministic? | Influences reasoning? |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **1. Raw Evidence Ingestion** | Unstructured / semi-structured records | Normalized `EvidenceFact[]` triples | No (lexical normalization) | Pattern Matching / Lexical Parser | Yes | Yes (provides input facts) |
| **2. Fact Admission (7 Gates)** | `EvidenceFact[]` | Accepted / Rejected fact partitions | Partially (schema, categories, timestamps) | 7-Gate Validation Engine | Yes | Yes (rejects invalid edges before graph construction) |
| **3. Competing Interpretations** | Contradictory facts | Branching `GraphInterpretation[]` | Yes (entity-location concurrence) | Contradiction Forking Engine | Yes | Yes (preserves multi-hypothesis graph states) |
| **4. Structural Fingerprint** | `GraphPayload` | `GraphStructuralFingerprint` | Yes (in/out degree, cycles, components) | Topological Feature Extractor | Yes | Yes (selects applicable algorithms) |
| **5. Adaptive Selection** | Fingerprint + Graph | Selected / Skipped algorithm decisions | Yes (corridors, bottlenecks, cycles) | Empirical Decision Rules | Yes | Yes (gates downstream execution) |
| **6. Algorithm Execution** | Graph + Parameters | Structural metrics (paths, dominators, cuts) | Yes (full graph topology) | Yen, Kahn, Lengauer-Tarjan, Ford-Fulkerson | Yes | **Partially upstream** (informs metadata, but must actively prune branches) |
| **7. Possibility Generation** | Graph + Structural paths | `Possibility[]` candidate space | Yes (K-paths, constraint evaluation) | Yen K-Shortest + Constraint Engine | Yes | Yes (produces hypothesis set) |
| **8. Epistemic Validation** | Graph + Possibilities | Epistemic report (leakage, false bottlenecks) | Yes (bottleneck uniqueness, disconnected subgraphs) | Structural Epistemic Validator | Yes | Yes (detects over-confidence) |
| **9. Structural Resolution** | Possibility set + Graph | Distinguishing structures, entropy | Yes (symmetric difference of edge sets) | Possibility Differentiator + Shannon Entropy | Yes | Yes (computes information gain) |
| **10. Investigation Decisions** | Distinctions + Entropy | Ranked actions & evidence targets | Yes (min-cut edges, distinguishing targets) | Decision Heuristic Ranker | Yes | Yes (guides next investigative step) |

---

## 16.B Current Algorithm Inventory

Every existing algorithm is classified into `CORE`, `SUPPORTING`, or `DECORATIVE` based on the operational test:
> **"Does removing or ablating this algorithm change the surviving possibility space or structural conclusions?"**

### 1. Yen's K-Shortest Paths (`k-shortest-paths.ts`)
- **Mathematical Problem**: Enumeration of the top $K$ simple (loopless) paths between $s$ and $t$ ordered by ascending cost.
- **Graph Input**: Directed weighted graph $G=(V, E)$, source $s$, target $t$, integer $K$.
- **Exact Output**: Array of $K$ loopless paths with node sequences, edge IDs, and total costs.
- **Mathematically Determined?**: Yes (deterministic Yen algorithm with Dijkstra subroutine).
- **Independently Verifiable?**: Yes (verifiable against standard Yen implementations).
- **Downstream Effect**: Directly populates the alternative route candidates in `PossibilityEngine`.
- **Ablation Effect**: Removing it collapses all alternative corridors into 0 or 1 route; alternative route hypotheses vanish.
- **Classification**: **`CORE`**

### 2. Temporal Analysis & Kahn Topological Sort (`temporal-analysis.ts`)
- **Mathematical Problem**: Directed acyclic graph verification via topological ordering; interval chronology verification ($t_u \le t_v$).
- **Graph Input**: Directed graph with event nodes possessing ISO-8601 timestamps.
- **Exact Output**: Boolean `isAcyclic`, sorted topological order, list of detected cycles, and list of timestamp inversions.
- **Mathematically Determined?**: Yes (standard Kahn linear-time algorithm).
- **Independently Verifiable?**: Yes.
- **Downstream Effect**: Eliminates candidate paths that violate monotonic time; marks cyclic causal hypotheses `INVALID`.
- **Ablation Effect**: Physically impossible paths (event at 14:00 causing event at 13:00) survive into the possibility space.
- **Classification**: **`CORE`**

### 3. Possibility Constraint Engine (`possibility-constraint-engine.ts`)
- **Mathematical Problem**: Subgraph constraint satisfaction (category vocabulary adherence, dangling edge check, evidence support threshold).
- **Graph Input**: Possibility graph overlay $G' = (V \cup \Delta V, E \cup \Delta E)$.
- **Exact Output**: Epistemic status (`VALID`, `INVALID`, `CONDITIONAL`, `CONFLICTING`) and violation list.
- **Mathematically Determined?**: Yes.
- **Independently Verifiable?**: Yes.
- **Downstream Effect**: Hard pruning of invalid candidate graphs before investigator review.
- **Ablation Effect**: Fabricated or disconnected edges become valid possibilities.
- **Classification**: **`CORE`**

### 4. Lengauer-Tarjan Dominators (`dominators.ts`)
- **Mathematical Problem**: Dominance tree calculation in directed graphs; computation of all vertices $d$ such that every path from root $r$ to $w$ contains $d$.
- **Graph Input**: Directed graph $G=(V, E)$, root $r$.
- **Exact Output**: Dominator tree mapping, immediate dominators `idom(v)`, and unavoidable choke points.
- **Mathematically Determined?**: Yes (Lengauer-Tarjan DFS with semidominators).
- **Independently Verifiable?**: Yes.
- **Downstream Effect**: Identifies critical invariant nodes across all paths; used in decision engine to identify mandatory choke points.
- **Ablation Effect**: System loses ability to prove that an entity *must* have passed through a specific checkpoint regardless of corridor chosen.
- **Classification**: **`CORE`**

### 5. Edmonds-Karp / Ford-Fulkerson Min-Cut (`min-cut.ts`)
- **Mathematical Problem**: Maximum flow / minimum $(s, t)$-cut in directed networks with unit or scalar capacities.
- **Graph Input**: Directed network $G=(V, E, c)$, source $s$, sink $t$.
- **Exact Output**: Cut capacity value, source partition $S$, sink partition $T$, and minimum cut edge set $E_{cut}$.
- **Mathematically Determined?**: Yes (deterministic augmenting path BFS).
- **Independently Verifiable?**: Yes.
- **Downstream Effect**: Maps directly to critical separating evidence targets in `deriveGraphEvidenceTargets`.
- **Ablation Effect**: System cannot compute minimal boundary edges to separate competing possibility corridors.
- **Classification**: **`CORE`**

### 6. Suurballe Vertex/Edge Disjoint Paths (`disjoint-paths.ts`)
- **Mathematical Problem**: Finding the maximum number of paths between $s$ and $t$ that share no intermediate vertices (or edges).
- **Graph Input**: Directed graph $G=(V, E)$, source $s$, target $t$.
- **Exact Output**: Count of mutually disjoint paths and the specific path node sequences.
- **Mathematically Determined?**: Yes.
- **Independently Verifiable?**: Yes.
- **Downstream Effect**: Quantifies independent corroboration (1 path = single point of failure; $\ge 2$ = independent corroboration).
- **Ablation Effect**: Possibility robustness score collapses to simple edge counts without structural independence guarantees.
- **Classification**: **`SUPPORTING`**

### 7. Hopcroft-Tarjan Articulation Points (`articulation-points.ts`)
- **Mathematical Problem**: Identification of cut-vertices in an undirected/biconnected representation whose removal increases the number of connected components.
- **Graph Input**: Graph $G=(V, E)$.
- **Exact Output**: Array of articulation node IDs and biconnected component partitions.
- **Mathematically Determined?**: Yes (DFS discovery and low-link numbers).
- **Independently Verifiable?**: Yes.
- **Downstream Effect**: Flags single points of evidentiary failure in the global evidence graph.
- **Ablation Effect**: Structural bottlenecks outside the designated $(s, t)$ flow are missed.
- **Classification**: **`SUPPORTING`**

### 8. Shannon Information Gain & Entropy (`investigation-decision-engine.ts`)
- **Mathematical Problem**: Information entropy $H(S) = -\sum p_i \log_2 p_i$ and expected information gain from structural branch partitioning.
- **Graph Input**: Discrete partition sizes of surviving graph possibilities $P$.
- **Exact Output**: Floating point entropy value (in bits) and expected entropy reduction $\Delta H$.
- **Mathematically Determined?**: Yes.
- **Independently Verifiable?**: Yes.
- **Downstream Effect**: Ranks investigation actions by efficiency in resolving branch ambiguity.
- **Ablation Effect**: Investigation strategies ranked arbitrarily rather than by uncertainty reduction.
- **Classification**: **`SUPPORTING`**

### 9. Graph Density & Heuristic Metrics
- **Mathematical Problem**: Simple algebraic ratios $|E| / (|V|(|V|-1))$.
- **Downstream Effect**: Used for display and descriptive badges in the UI.
- **Ablation Effect**: Zero impact on possibility survival or causal conclusions.
- **Classification**: **`DECORATIVE`**

---

## 16.C Graph Dependency Map

```text
[Raw Evidence Facts]
       │
       ▼
[7-Gate Admission Engine] ──(Rejects corrupted facts)
       │
       ▼
[Accepted Evidence Graph G = (V, E)]
       │
       ├────────────────────────────────────────┐
       ▼                                        ▼
[Contradiction Detection]             [Structural Fingerprint]
(Locates concurrent spatio-temporal)          │
       │                                        ▼
       ▼                               [Adaptive Algorithm Rules]
[Branch Forking]                                │
Interpretation Alpha / Beta                     ▼
       │                               [Selected Graph Algorithms]
       │                               (Yen, Dominator, Min-Cut,
       │                                Temporal Reachability)
       └──────────────────┬─────────────────────┘
                          │
                          ▼
            [AlgorithmExecution Record]
             (Exact Graph Slice, Mathematical Result,
              Deterministic Proof, Evidence Citations)
                          │
                          ▼
         [Branch Elimination / Possibility Pruning]
         (If Reachability = false, eliminate branch)
                          │
                          ▼
         [Cross-Branch Structural Comparison]
         (Common Backbone vs Branch-Specific Distinctions)
                          │
                          ▼
         [Deterministic "Why?" Inspector]
         (Directly inspects AlgorithmExecution record)
```

---

## 16.D AI Dependency Map

The system maintains a **strict boundary between AI and Graph Reasoning**:
- **Where AI is Permitted**:
  - `AiExtractionService` (`backend/src/application/ai-extraction-service.ts`): Text extraction only. Parses raw unstructured text logs or interviews into candidate triples.
  - All outputs from `AiExtractionService` are explicitly stamped with `{ aiExtracted: true, untrusted: true }`.
  - AI is **completely quarantined** from graph reasoning.
- **Where AI is Prohibited (Zero AI Involvement)**:
  - Fact admission (handled 100% by deterministic 7 gates).
  - Branch generation (handled 100% by topological contradiction detection).
  - Possibility generation (handled 100% by Yen K-Shortest Paths & constraint overlays).
  - Branch elimination (handled 100% by graph reachability and temporal validity).
  - Decision ranking (handled 100% by Shannon entropy and min-cut graph partitions).
  - "Why?" explanation generation (handled 100% by templated derivation from `AlgorithmExecution` outputs).

---

## 16.E Gap Analysis

| Area | Current Behavior | Required Graph-First Behavior | Gap Severity |
| :--- | :--- | :--- | :--- |
| **Temporal Reachability** | Chronology checked on isolated path nodes in `PossibilityEngine`, but global time-respecting reachability $t_{e1} \le t_{e2}$ not evaluated as an upfront graph algorithm. | A standalone, formal `TemporalReachabilityAlgorithm` that computes time-respecting reachability across the directed graph and proves whether target $T$ is causally reachable from $S$. | **High** |
| **Branch Elimination** | Both Interpretation Alpha and Beta survived messy benchmark even when one branch contained a route that was structurally or temporally disconnected. | If graph algorithms prove a branch violates temporal reachability or contains zero valid paths from source to target, that branch is **formally eliminated** with an explicit elimination record. | **Critical** |
| **Algorithm Execution Record** | Trace steps recorded as loose strings (`GenerationTraceStep`). | First-class `AlgorithmExecution` domain entity tracking algorithm, graph version, inputs, outputs, derived nodes/edges, and evidence references. | **Critical** |
| **"Why?" Inspector Grounding** | Explanations combined static templates with report data. | Explanations must directly cite the `AlgorithmExecution` record ID, the graph nodes/edges involved, and the mathematical result. | **High** |

---

## 16.F Refactoring Plan

### 1. Files to Create
- `backend/src/domain/algorithms/temporal-reachability.ts`: Dedicated graph algorithm for time-respecting reachability ($t_{u} \le t_{v}$) across directed event/entity graphs.
- `backend/src/domain/algorithm-execution-types.ts`: Formal schema for `AlgorithmExecution` records.
- `backend/src/tests/temporal-reachability-causal.test.ts`: Concrete acceptance test proving that temporal reachability eliminates impossible branches and alters cross-branch comparison.

### 2. Files to Refactor
- `backend/src/domain/algorithms/index.ts`: Export `TemporalReachabilityAlgorithm`.
- `backend/src/domain/case-pipeline-types.ts`: Include `AlgorithmExecution[]` on `InterpretationReasoningBranch` and `EndToEndCaseReasoningReport`.
- `backend/src/application/case-reasoning-pipeline.ts`:
  - Run `TemporalReachabilityAlgorithm` on each candidate graph interpretation.
  - If reachability fails ($S \leadsto T$ is impossible), formally eliminate the branch or mark its possibilities `INVALID`.
  - Update `extractCommonConclusions` and `buildBranchComparison` to reflect surviving vs eliminated branches.
  - Ground `answerWhyQuery` in the `AlgorithmExecution` record.
- `backend/src/application/possibility-engine.ts`: Record `AlgorithmExecution` for Yen K-Shortest Paths and Temporal validation.

### 3. Components to Preserve
- `EvidenceReconstructionEngine` (7 gates, 100% provenance verification).
- `AdaptiveReasoningEngine` (topological fingerprinting and equivalence verification).
- `EpistemicValidationEngine` (adversarial detection of false convergence and disconnected subgraphs).
- `ResolutionReasoningEngine` and `InvestigationDecisionEngine` (Shannon entropy & min-cut targets).

---

## 16.G Prioritized Algorithm Roadmap

| Rank | Algorithm | Mathematical Problem | Investigative Significance | Determinism | Implementation Complexity | Demonstrability |
| :---: | :--- | :--- | :--- | :---: | :---: | :---: |
| **1** | **Temporal Reachability** | Time-respecting path existence ($t_u \le t_v$) | **Highest**: Proves or disproves physical causality | 100% | Low-Medium (BFS/Dijkstra with time filter) | **Instant**: Eliminates impossible alibis or access claims |
| **2** | **Lengauer-Tarjan Dominators** | Immediate dominators in directed graph | **Critical**: Proves unavoidable choke points (mandatory checkpoints) | 100% | Medium-High (DFS, semidominators) | **High**: Shows every path must traverse node X |
| **3** | **Edmonds-Karp Min-Cut** | Minimum $(s, t)$-cut capacity and edges | **Critical**: Pinpoints exact boundary edges separating competing branches | 100% | Medium (Augmenting paths BFS) | **High**: Directly targets evidence collection |
| **4** | **Yen K-Shortest Paths** | $K$ loopless simple paths by cost | **High**: Discovers alternative corridors without AI hallucination | 100% | Medium (Repeated Dijkstra with node spurring) | **High**: Populates distinct route possibilities |
| **5** | **Suurballe Disjoint Paths** | Vertex/edge disjoint paths | **Medium-High**: Validates independent corroboration | 100% | Medium (Residual graph transformations) | **Medium**: Proves single vs multi-thread robustness |

---

## 16.H Test Plan

1. **Test 1: Temporal Reachability Algorithm Verification**:
   - Monotonic valid path ($A(10:00) \to B(10:05) \to C(10:10)$) returns `reachable: true`.
   - Retrograde path ($A(10:00) \to B(10:05) \to C(10:02)$) returns `reachable: false` with exact violating edge and timestamps.
2. **Test 2: Causal Branch Elimination in Pipeline**:
   - Ingest evidence where Branch Alpha has a valid forward time path and Branch Beta has a temporal inversion ($T_{exit} < T_{entry}$).
   - Verify `TemporalReachabilityAlgorithm` executes and records an `AlgorithmExecution`.
   - Verify Branch Beta is marked `ELIMINATED_BY_GRAPH_ALGORITHM`.
   - Verify cross-branch comparison updates: single surviving branch, zero ambiguity remaining.
3. **Test 3: Algorithmic Grounding of "Why?" Inspector**:
   - Query: *"Why was Branch Beta eliminated?"*
   - Verify output exposes: Algorithm (`TEMPORAL_REACHABILITY`), source, target, result (`reachable: false`), exact chronological inversion, and cited evidence IDs.
4. **Test 4: Ablation Proof (Negative Control)**:
   - If temporal reachability is ablated, Branch Beta erroneously survives, proving the graph algorithm is **causally upstream of the reasoning result**.

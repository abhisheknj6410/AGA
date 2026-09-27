# Investigation Graph Algorithms: Effect & Causality Map

This document defines every graph algorithm implemented in the Graphical Investigation System. Under the core architectural requirement, **graph algorithms are not display cosmetics**; they causally generate, filter, prune, rewire, or distinguish the possibility space and answer investigator queries deterministically.

---

## 1. Yen's K-Shortest Loopless Paths

- **Source Code**: [`backend/src/domain/algorithms/k-shortest-paths.ts`](file:///home/zius/Projects/Graphical-Investigation-system/backend/src/domain/algorithms/k-shortest-paths.ts)
- **Question Answered**: *"What are the primary and alternative plausible corridors connecting an actor/origin to an impacted asset/target?"*
- **Inputs**:
  - `nodes: GraphNode[]`
  - `edges: GraphEdge[]`
  - `sourceId: string`, `targetId: string`
  - `k: number` (maximum alternative paths to compute)
  - `options: { maxCost?: number; allowedStatuses?: string[] }`
- **Output**: `KPathsResult` containing up to $K$ loopless ordered path sequences with accumulated investigative edge costs.
- **Asymptotic Complexity**: $\mathcal{O}(K \cdot |V| \cdot (|E| + |V| \log |V|))$ using Dijkstra with priority queue.
- **Causal Effect on Possibility Generation**:
  - Automatically spawns candidate investigative branches (`ALTERNATIVE_CORRIDOR`).
  - Candidate paths are piped directly into the `PossibilityConstraintEngine.isPathValid`.
  - Inverted event sequences or uncorroborated paths are eliminated before becoming possibilities.
- **Effect on Investigation**: Prevents tunnel vision by surfacing non-obvious alternative routes with their exact accumulated costs.
- **Verification Tests**:
  - [`backend/src/tests/advanced-algorithms.test.ts`](file:///home/zius/Projects/Graphical-Investigation-system/backend/src/tests/advanced-algorithms.test.ts)
  - [`backend/src/tests/causal-algorithm-pipeline.test.ts`](file:///home/zius/Projects/Graphical-Investigation-system/backend/src/tests/causal-algorithm-pipeline.test.ts)
- **UI Representation**:
  - Visualized as distinct possibility cards labeled `ALTERNATIVE_CORRIDOR`.
  - Traversal cost listed in `ComparisonView` matrix.
  - Active path nodes highlighted on the Cytoscape canvas overlay.

---

## 2. Dijkstra's Shortest Path Algorithm

- **Source Code**: [`backend/src/domain/algorithms/dijkstra.ts`](file:///home/zius/Projects/Graphical-Investigation-system/backend/src/domain/algorithms/dijkstra.ts)
- **Question Answered**: *"What is the most evidenced / lowest-friction investigative route between two nodes?"*
- **Inputs**: `nodes: GraphNode[]`, `edges: GraphEdge[]`, `sourceId: string`, `targetId: string`, `options`.
- **Output**: `PathResult | null` containing path cost, sequence of nodes, and sequence of edges.
- **Asymptotic Complexity**: $\mathcal{O}(|E| + |V| \log |V|)$ using min-heap priority queue.
- **Causal Effect on Possibility Generation**: Serves as the base spine for primary corridor generation and bounds-checking.
- **Effect on Investigation**: Answers agent queries regarding direct connections between suspects, assets, and intermediaries with zero hallucinations.
- **Verification Tests**: [`backend/src/tests/advanced-algorithms.test.ts`](file:///home/zius/Projects/Graphical-Investigation-system/backend/src/tests/advanced-algorithms.test.ts)
- **UI Representation**: Connection Path inspector drawer and deterministic agent query answers.

---

## 3. Temporal Validation, Interval Consistency & Kahn's Topological Sort

- **Source Code**:
  - [`backend/src/domain/algorithms/temporal-analysis.ts`](file:///home/zius/Projects/Graphical-Investigation-system/backend/src/domain/algorithms/temporal-analysis.ts)
  - [`backend/src/application/possibility-constraint-engine.ts`](file:///home/zius/Projects/Graphical-Investigation-system/backend/src/application/possibility-constraint-engine.ts)
- **Question Answered**: *"Is this event sequence physically and chronologically possible, or does it violate causality or form a temporal paradox cycle?"*
- **Inputs**: `GraphNode[]`, `GraphEdge[]` with ISO-8601 timestamps and precision bounds.
- **Outputs**:
  - `ChronologyResult` (flags timestamp inversions where $t_{\text{prev}} > t_{\text{next}}$).
  - `TopologicalSortResult` (validates DAG acyclicity and detects paradox loops).
- **Asymptotic Complexity**: $\mathcal{O}(|V| + |E|)$ via Kahn's in-degree zero algorithm.
- **Causal Effect on Possibility Generation**:
  - **Prunes the possibility space**: Marks candidate branches containing inverted timestamps or causal loops as `INVALID`.
  - Filters out inverted K-shortest candidate paths prior to possibility instantiation.
- **Effect on Investigation**: Immediately disproves false alibis or invalid incident reconstructions.
- **Verification Tests**:
  - [`backend/src/tests/temporal-validation.test.ts`](file:///home/zius/Projects/Graphical-Investigation-system/backend/src/tests/temporal-validation.test.ts)
  - [`backend/src/tests/causal-algorithm-pipeline.test.ts`](file:///home/zius/Projects/Graphical-Investigation-system/backend/src/tests/causal-algorithm-pipeline.test.ts)
- **UI Representation**: `Temporal Causality` status badge in possibility cards and `ComparisonView`, with exact violation delta in milliseconds.

---

## 4. Dominator Tree (Lengauer-Tarjan / Tree Transitivity)

- **Source Code**: [`backend/src/domain/algorithms/dominators.ts`](file:///home/zius/Projects/Graphical-Investigation-system/backend/src/domain/algorithms/dominators.ts)
- **Question Answered**: *"Which mandatory choke points must EVERY route pass through to reach the target from the origin?"*
- **Inputs**: `nodes: GraphNode[]`, `edges: GraphEdge[]`, `rootId: string`, `targetId: string`.
- **Output**: `DominatorResult` (immediate dominators, full dominator set, and ordered path dominators).
- **Asymptotic Complexity**: $\mathcal{O}(|V| \cdot (|V| + |E|))$ reachable path filtering.
- **Causal Effect on Possibility Generation**:
  - Discovers **Universal Choke Points** across all branches.
  - If a possibility bypasses a proven dominator without an alternative recorded vector, its epistemic status degrades to `CONDITIONAL`.
- **Effect on Investigation**: Identifies critical assets or infrastructure where surveillance or forensic imaging yields 100% interception coverage.
- **Verification Tests**:
  - [`backend/src/tests/advanced-algorithms.test.ts`](file:///home/zius/Projects/Graphical-Investigation-system/backend/src/tests/advanced-algorithms.test.ts)
  - [`backend/src/tests/causal-algorithm-pipeline.test.ts`](file:///home/zius/Projects/Graphical-Investigation-system/backend/src/tests/causal-algorithm-pipeline.test.ts)
- **UI Representation**: Critical Node indicators and Agent Bottleneck queries.

---

## 5. Articulation Points (Hopcroft-Tarjan DFS)

- **Source Code**: [`backend/src/domain/algorithms/articulation-points.ts`](file:///home/zius/Projects/Graphical-Investigation-system/backend/src/domain/algorithms/articulation-points.ts)
- **Question Answered**: *"Which single entities or accounts, if removed, completely disconnect the evidence network?"*
- **Inputs**: `nodes: GraphNode[]`, `edges: GraphEdge[]`.
- **Output**: `ArticulationPointsResult` with list of cut-vertices and component count delta.
- **Asymptotic Complexity**: $\mathcal{O}(|V| + |E|)$ single-pass DFS with discovery and low-link numbers.
- **Causal Effect on Possibility Generation**: Identifies structural single-points-of-failure in investigative hypotheses.
- **Effect on Investigation**: Prioritizes subpoenas or evidence preservation orders on intermediary nodes that bridge disjoint rings.
- **Verification Tests**: [`backend/src/tests/advanced-algorithms.test.ts`](file:///home/zius/Projects/Graphical-Investigation-system/backend/src/tests/advanced-algorithms.test.ts)
- **UI Representation**: `Articulation Bottlenecks` column in `ComparisonView`.

---

## 6. Vertex-Disjoint Paths (Network Augmenting Paths)

- **Source Code**: [`backend/src/domain/algorithms/disjoint-paths.ts`](file:///home/zius/Projects/Graphical-Investigation-system/backend/src/domain/algorithms/disjoint-paths.ts)
- **Question Answered**: *"How many completely independent, non-overlapping channels exist between the suspect and the asset?"*
- **Inputs**: `nodes: GraphNode[]`, `edges: GraphEdge[]`, `sourceId: string`, `targetId: string`.
- **Output**: `DisjointPathsResult` (count of disjoint paths and sets of internal node IDs).
- **Asymptotic Complexity**: $\mathcal{O}(k \cdot (|V| + |E|))$ via successive vertex-split residual augmentations.
- **Causal Effect on Possibility Generation**: Quantifies hypothesis resilience; multi-channel possibilities have higher corroboration scores.
- **Effect on Investigation**: Informs investigators whether closing one communication or financial vector stops the operation or if independent parallel vectors exist.
- **Verification Tests**: [`backend/src/tests/advanced-algorithms.test.ts`](file:///home/zius/Projects/Graphical-Investigation-system/backend/src/tests/advanced-algorithms.test.ts)
- **UI Representation**: `Corroboration Paths` metric in `ComparisonView`.

---

## 7. Minimum Cut (Edmonds-Karp / Stoer-Wagner Cut)

- **Source Code**: [`backend/src/domain/algorithms/min-cut.ts`](file:///home/zius/Projects/Graphical-Investigation-system/backend/src/domain/algorithms/min-cut.ts)
- **Question Answered**: *"What is the minimum set of links or relations that must be disrupted to completely sever suspect access?"*
- **Inputs**: `nodes: GraphNode[]`, `edges: GraphEdge[]`, `sourceId: string`, `targetId: string`.
- **Output**: `MinCutResult` with cut capacity and exact cut edge IDs.
- **Asymptotic Complexity**: $\mathcal{O}(|V| \cdot |E|^2)$ max-flow min-cut theorem.
- **Causal Effect on Possibility Generation**: Identifies critical dependencies whose removal would render a possibility topologically impossible.
- **Effect on Investigation**: Provides concrete interdiction boundaries for operational teams.
- **Verification Tests**: [`backend/src/tests/advanced-algorithms.test.ts`](file:///home/zius/Projects/Graphical-Investigation-system/backend/src/tests/advanced-algorithms.test.ts)
- **UI Representation**: Interdiction boundary visualizations and containment recommendations.

---

## 8. Steiner Minimal Connecting Subgraph

- **Source Code**: [`backend/src/domain/algorithms/steiner-subgraph.ts`](file:///home/zius/Projects/Graphical-Investigation-system/backend/src/domain/algorithms/steiner-subgraph.ts)
- **Question Answered**: *"What is the minimal connecting chain of evidence tying together a disparate set of terminal clues?"*
- **Inputs**: `nodes: GraphNode[]`, `edges: GraphEdge[]`, `terminalNodeIds: string[]`.
- **Output**: `SteinerResult` with extracted subgraph connecting all terminals.
- **Asymptotic Complexity**: 2-approximation metric closure heuristic $\mathcal{O}(|T| \cdot (|E| + |V| \log |V|))$.
- **Causal Effect on Possibility Generation**: Extracts minimal plausible sub-hypotheses for complex multi-party conspiracies.
- **Effect on Investigation**: Strips away irrelevant background noise and focuses attention strictly on connecting evidence.
- **Verification Tests**: [`backend/src/tests/advanced-algorithms.test.ts`](file:///home/zius/Projects/Graphical-Investigation-system/backend/src/tests/advanced-algorithms.test.ts)
- **UI Representation**: Focused evidence chain overlays.

---

## 9. Possibility Constraint & Epistemic Evaluation Engine

- **Source Code**: [`backend/src/application/possibility-constraint-engine.ts`](file:///home/zius/Projects/Graphical-Investigation-system/backend/src/application/possibility-constraint-engine.ts)
- **Question Answered**: *"Does a generated hypothesis satisfy all structural, temporal, and evidence provenance constraints?"*
- **Inputs**: `GraphPayload`, validation options.
- **Output**: `ConstraintEvaluationResult` (`isValid: boolean`, `status: VALID | INVALID | CONDITIONAL | CONFLICTING`, `violations: string[]`, `temporalViolations: any[]`).
- **Causal Effect on Possibility Generation**:
  - Deterministically sets the epistemic status of every candidate possibility.
  - Rejects invalid candidate paths before they pollute the possibility workspace.
  - Prunes the possibility space to bounded thresholds (`maxPossibilities: 20`).
- **Effect on Investigation**: Prevents the investigator from relying on physically impossible theories.
- **Verification Tests**: [`backend/src/tests/causal-algorithm-pipeline.test.ts`](file:///home/zius/Projects/Graphical-Investigation-system/backend/src/tests/causal-algorithm-pipeline.test.ts)
- **UI Representation**: Status badges, violation alerts, and invalidity explanations.

---

## 10. Possibility Differentiating Engine

- **Source Code**: [`backend/src/application/possibility-differentiating-engine.ts`](file:///home/zius/Projects/Graphical-Investigation-system/backend/src/application/possibility-differentiating-engine.ts)
- **Question Answered**: *"What are the universal invariants true in ALL possibilities, and what exact new evidence would definitively distinguish P_i from P_j?"*
- **Inputs**: `Possibility[]`, `baseGraph: GraphPayload`.
- **Outputs**:
  - `commonInvariants` (nodes, edges, evidence present across all branches).
  - `distinguishingDifferences` ($P_i \setminus P_j$).
  - `resolvingRecommendations` (actionable next steps to test distinguishing elements).
- **Causal Effect on Possibility Generation**: Synthesizes the possibility space into high-leverage investigative vectors.
- **Effect on Investigation**: Guides the investigator directly on what warrant, log, or interview to pursue next to collapse multiple branches into one definitive conclusion.
- **Verification Tests**: [`backend/src/tests/causal-algorithm-pipeline.test.ts`](file:///home/zius/Projects/Graphical-Investigation-system/backend/src/tests/causal-algorithm-pipeline.test.ts)
- **UI Representation**: "Common Invariants" panel and "Recommended Investigative Actions" card grid in `ComparisonView`.

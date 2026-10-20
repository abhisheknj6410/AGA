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

---

## 11. End-to-End Demonstration Case & Causal Verification

- **Demonstration Dataset**: "Metropolitan Logistics & Vault Incident" ([`backend/src/infrastructure/seed-demo-case.ts`](file:///home/zius/Projects/Graphical-Investigation-system/backend/src/infrastructure/seed-demo-case.ts))
- **Domain Independence**: Multi-modal physical/digital crime involving physical transit corridors, satellite intercepts, contradictory alibi evidence, and alias ambiguity.
- **Ambiguity & Corridors**:
  1. *Highway Ground Corridor (Route 1)*: Mercer → Safehouse → Turnpike → Warehouse → Vault Entry (Valid, 4 supporting evidence items).
  2. *Satellite Uplink Corridor (Route 2)*: Mercer → Satellite Uplink → Remote Override → Vault Entry (Valid, 3 supporting evidence items).
  3. *Inverted Voice Corridor (Route 3)*: Mercer → Voice Call (15:45) → Keycard Staging (14:30) → Vault Entry (**Eliminated by Temporal Validation** due to inverted timestamps: $15:45 > 14:30$).
  4. *Ghost Courier Corridor (Route 4)*: Mercer → Informant Rumor → Vault Entry (**Eliminated by Evidence Provenance Engine** due to insufficient corroboration: 1 item vs minimum 2 required).
  5. *Identity Resolution Candidate*: Jordan Vale vs J. Vale (spawns 2 topological branches: Unified Merged Identity with edge rewiring vs Distinct Identities).
  6. *Witness Alibi Contradiction*: Witness testifies Mercer was at North Pier Diner during Warehouse Rendezvous (spawns Direct Attribution [CONFLICTING] vs Proxy Execution [CONDITIONAL]).

### Algorithm Execution & Pipeline Impact Metrics
- **K-Shortest Paths Discovered**: 4 raw corridors connecting Mercer to Vault.
- **Temporal Validation Eliminations**: 1 candidate corridor eliminated (`TEMPORAL_INVERSION`).
- **Evidence Provenance Eliminations**: 1 candidate corridor eliminated (`INSUFFICIENT_EVIDENCE`).
- **Surviving Valid Corridors**: 2 distinct routes (Highway and Satellite).
- **Consequential Properties Computed**:
  - *Dominator Chokepoint*: `evt-vault-entry` is an unavoidable dominator before `location-vault` across all surviving routes.
  - *Independent Corridors*: 2 node-disjoint routes verified via maximum network flow.
  - *Critical Edge Cut*: Min-cut interdiction identifies bottleneck edges required to disrupt the operation.
- **Algorithm Ablation Verification**:
  - When `disableTemporalValidation: true` is passed, Route 3 survives into the possibility space, proving that Temporal Validation causally prunes the candidate set.
  - When `minEvidenceSupport` is raised from 1 to 3, lower-evidenced corridors are eliminated, proving that Evidence Constraints causally shape the surviving space.
- **Verification Suite**: [`backend/src/tests/end-to-end-causal-algorithms.test.ts`](file:///home/zius/Projects/Graphical-Investigation-system/backend/src/tests/end-to-end-causal-algorithms.test.ts) (12/12 passing).

---

## 12. Incremental Algorithm Invalidation & Dependency Matrix

| Algorithm | Depends On | Invalidated When | Downstream Results Invalidated | Behavior on Unrelated Mutation |
|:---|:---|:---|:---|:---|
| **Yen's K-Shortest Paths** | Base graph vertices & edges | Incident edges added, removed, or costs modified; nodes added or deleted | `TEMPORAL_VALIDATION`, `EVIDENCE_PROVENANCE`, `POSSIBILITY_SET`, `DOMINATOR_ANALYSIS`, `COMMON_INVARIANTS` | Reused via `AlgorithmResultCache` |
| **Temporal Monotonicity Check** | Ordered candidate paths, event timestamps | Any traversed event timestamp is edited, or interval precision altered | `POSSIBILITY_SET`, `DOMINATOR_ANALYSIS`, `COMMON_INVARIANTS` | Reused if event times are untouched |
| **Evidence Provenance Engine** | Path edges, evidence nodes | Supporting evidence items added, revoked, or reliability scores altered | `POSSIBILITY_SET`, `DOMINATOR_ANALYSIS`, `COMMON_INVARIANTS` | Reused if edge evidence references remain constant |
| **Safe Entity Resolution** | Entity node labels, types, properties | New entity node added, label edited, or candidate match accepted/rejected | `GRAPH_TOPOLOGY`, `POSSIBILITY_SET` | Reused across non-matching entity types |
| **Dominator Analysis** | Surviving possibility paths | Possibility set changed (routes added, removed, or rerouted) | `INSPECTOR_VIEWS`, `AGENT_BOTTLENECK_QUERIES` | Recomputed only for modified possibilities |
| **Min-Cut Interdiction** | Directed edge capacities / weights | Possibility set changed, or edge cost/confidence modified | `CRITICAL_INTERDICTION_CARDS` | Recomputed only for modified possibilities |
| **Common Invariants Engine** | All valid possibilities in space | Any possibility added, removed, or modified | `COMMON_INVARIANTS_PANEL`, `AGENT_QUERIES` | Recomputed globally on surviving possibility space |

---

## 13. Phase 4 Algorithm Audit, Primary Classification & Resolution Reasoning Layer

### 13.1 Algorithm Execution Map

```text
                  Case Evidence & Graph Topology
                               ↓
                 [GENERATIVE] Yen's K-Shortest Paths
                               ↓
                       Candidate Corridors
                               ↓
                 [FILTERING] Temporal Validation & Kahn DAG
                               ↓
                 [FILTERING] Evidence Provenance Engine
                               ↓
                    Surviving Possibility Set
            (VALID, CONDITIONAL, CONFLICTING; INVALID pruned)
                               ↓
                 [STRUCTURAL] Dominator Analysis (Choke Points)
                 [STRUCTURAL] Disjoint Paths (Corroboration)
                 [RESOLUTION] Min-Cut Analysis (Separating Edges)
                               ↓
                 [DIFFERENTIATING] Common Invariants & Structural Diff
                               ↓
                 [RESOLUTION] Resolution Reasoning Engine
                 ├── Topology Backbone Clustering (Structural Families)
                 ├── Universal Invariant Extraction (100% Shared Intersection)
                 ├── Candidate Partitioning (Confirmed vs Pruned Sets)
                 └── Resolution Utility Scoring (0-100 Multi-Factor Formula)
                               ↓
          ┌────────────────────┴────────────────────┐
          ↓                                         ↓
 [RESOLUTION LAB UI]                      [INVESTIGATION AGENT]
 • Structural Family Cards                • Deterministic Query Answers
 • Invariant Choke Point Badges           • Unavoidable Dominator Explanations
 • Partition Matrix (Candidates vs P_j)   • Family Distinguishing Evidence
 • Interactive Counterfactual Simulation  • Counterfactual Impact Summaries
```

### 13.2 Formal Algorithm Classification & Impact Table

| Algorithm | Primary Role | Input | Output | Direct Effect | Downstream Effect | Ablation Result | User-Visible Value | Complexity |
|:---|:---|:---|:---|:---|:---|:---|:---|:---|
| **Yen's K-Shortest Paths** | `GENERATIVE` | Graph, source, target, K, edge costs | Up to $K$ ordered loopless paths | Spawns alternative candidate corridors | Fed into temporal and provenance filters | 0 alternative candidates generated | Card `ALTERNATIVE_CORRIDOR` in Possibilities & Evolution | $\mathcal{O}(K \cdot \|V\| (\|E\| + \|V\|\log\|V\|))$ |
| **Dijkstra's Algorithm** | `GENERATIVE` | Graph, source, target, edge weights | Lowest cost path sequence | Routing spine for Yen's algorithm and shortest paths | Subroutine for candidate generation | K-shortest path generation fails | Connection path inspector & agent routing | $\mathcal{O}(\|E\| + \|V\|\log\|V\|)$ |
| **Temporal Monotonicity & Kahn Sort** | `FILTERING` | GraphNode[], GraphEdge[] with timestamps | Chronology violations & topological order | Prunes candidate paths with inverted causality | Assigns `INVALID` status | Inverted false routes survive as VALID | `INVALID` badge with timestamp delta | $\mathcal{O}(\|V\| + \|E\|)$ |
| **Possibility Constraint Engine** | `FILTERING` | Materialized graph, provenance rules | Epistemic status evaluation | Enforces evidence coverage thresholds | Gates entry into surviving possibility set | Uncorroborated paths marked VALID | Epistemic status badges (VALID, CONDITIONAL) | $\mathcal{O}(\|V\| + \|E\|)$ |
| **Dominator Tree (Lengauer-Tarjan)** | `STRUCTURAL` | Graph, source root, target sink | Immediate dominators & unavoidable nodes | Identifies universal choke points | Supplies invariant choke points to Resolution Engine | Invariant critical nodes confused with differentiators | Unavoidable choke point badges in Resolution Lab | $\mathcal{O}(\|V\| (\|V\| + \|E\|))$ |
| **Articulation Points (DFS)** | `STRUCTURAL` | Graph with discovery/low-link indices | Cut-vertices / bridge entities | Pinpoints structural vulnerabilities | Informs risk and failure analysis | Network single-points-of-failure undetected | Topology diagnostics & agent bottleneck answers | $\mathcal{O}(\|V\| + \|E\|)$ |
| **Disjoint Paths (Suurballe)** | `STRUCTURAL` | Graph, source, target, mode | Count & paths of vertex-disjoint routes | Evaluates multi-route corroboration | Records independent support count on possibilities | Single-thread vs corroborated paths indistinguishable | Independent support count badge | $\mathcal{O}(\|V\| (\|E\| + \|V\|\log\|V\|))$ |
| **Min-Cut Separation** | `RESOLUTION` | Graph, source, sink, edge capacities | Minimum separating edge cut | Finds bottleneck interdiction boundary | Supplies separating edge resolution candidates | Cannot identify minimal boundary edges separating corridors | Critical separating edge candidates in Resolution Lab | $\mathcal{O}(\|V\| \cdot \|E\|^2)$ |
| **Possibility Differentiating Engine** | `DIFFERENTIATING` | BaseGraph, Possibility[] | Invariants & pairwise structural diffs | Computes symmetric graph differences | Feeds comparison matrix & candidate generator | Possibilities viewable only in complete isolation | Side-by-side comparison matrix | $\mathcal{O}(P \cdot (\|V\| + \|E\|))$ |
| **Affected Subgraph Engine** | `EVOLUTIONARY` | GraphMutation, BaseGraph, Possibility[] | Active propagation zone | Limits recomputation to affected $k$-hop subgraph | Drives selective algorithm cache invalidation | Every change forces global recomputation | Lineage ribbon active propagation zone badge | $\mathcal{O}(k \cdot (\|V\| + \|E\|))$ |
| **Algorithm Dependency Graph** | `EVOLUTIONARY` | GraphMutationDelta, AffectedSubgraph | Invalidation cascade & reused list | Selectively clears dependent algorithm caches | Preserves valid results on unaffected regions | All caches wiped on every mutation | Cache hit rate & invalidation metrics | $\mathcal{O}(\|V_{\text{dep}}\| + \|E_{\text{dep}}\|)$ |
| **Possibility Evolution Engine** | `EVOLUTIONARY` | $V_n$ vs $V_{n+1}$ possibilities | Added, Removed, Modified, Unchanged diff | Categorizes possibility space transitions | Explains causes behind possibility shifts | Evolution between versions unexplained | Evolution cards (+, -, ~, =) & What-If lab | $\mathcal{O}(P_{n} + P_{n+1})$ |
| **Resolution Reasoning Engine** | `RESOLUTION` | Surviving Possibilities, BaseGraph | Families, Invariants, Candidates, Matrix | Partitions space & computes Resolution Utility | Drives counterfactual simulation & agent answers | No guidance on what evidence distinguishes theories | Resolution Lab UI, Partition Matrix, Simulate What-If | $\mathcal{O}(P \cdot (\|V\| + \|E\|))$ |

### 13.3 Audit of Previously Decorative Algorithms & Connection to Resolution

1. **Dominators Algorithm**:
   - *Previous state*: Computed unavoidable nodes and displayed them on cards, but had no causal role in distinguishing theories.
   - *Phase 4 connection*: Integrated directly into `ResolutionReasoningEngine`. The engine separates **universal dominator invariants** (nodes that dominate in 100% of paths, which need no further investigation) from **divergent dominators** (nodes that dominate in Family 1 but are bypassed in Family 2, forming top-tier resolution targets).
2. **Min-Cut Algorithm**:
   - *Previous state*: Computed min-cut capacity and displayed a number.
   - *Phase 4 connection*: Converted into `MIN_CUT_SEPARATION` resolution candidates. The cut edges represent the minimal graph boundary separating alternative corridors.
3. **Disjoint Paths Algorithm**:
   - *Previous state*: Stored a number (`independentCorroborationCount`).
   - *Phase 4 connection*: Quantifies evidentiary robustness in canonical possibility structures and weights candidate evidence classes.

---

## 14. Phase 5: Investigation Planning Engine & Shannon Entropy

- **Source Code**:
  - [`backend/src/domain/planning-types.ts`](file:///home/zius/Projects/Graphical-Investigation-system/backend/src/domain/planning-types.ts)
  - [`backend/src/application/investigation-planning-engine.ts`](file:///home/zius/Projects/Graphical-Investigation-system/backend/src/application/investigation-planning-engine.ts)
- **Question Answered**: *"What information or evidence would most effectively reduce the remaining possibility space, what is its cost and information gain, and what should be investigated next?"*
- **Inputs**:
  - `survivingPossibilities: Possibility[]`
  - `structuralFamilies: StructuralFamily[]`
  - `resolutionCandidates: ResolutionCandidate[]`
  - `baseGraph: GraphPayload`
- **Output**: `InvestigationPlan` containing prioritized `InvestigationAction[]`, second-order `InvestigationPlanGraph`, prior entropy $H(P)$, expected information gain $IG$, and `nextImmediateAction`.
- **Asymptotic Complexity**: $\mathcal{O}(|C| \cdot |P|)$ where $|C|$ is candidate count and $|P|$ is surviving possibility count.
- **Causal Effect on Possibility Space**:
  - Grounding resolution candidates in 10 schema evidence classes with realistic acquisition profiles (costs 1-5, availability, temporal precision).
  - Computing multi-outcome partitions (`CONFIRMED`, `REFUTED`, `CONFLICTING`) and calculating mathematical information gain via Shannon entropy: $IG = H(\text{before}) - \mathbb{E}[H(\text{after})]$.
  - Creating a second-order plan graph and inferring prerequisite dependencies between entity verification and corridor links.
  - Feeding the Investigation Agent to answer *"What should I investigate next?"*, *"Which evidence would reduce uncertainty the most?"*, and *"Show the investigation plan"* with 100% mathematical consistency.
- **Verification Tests**: [`backend/src/tests/investigation-planning.test.ts`](file:///home/zius/Projects/Graphical-Investigation-system/backend/src/tests/investigation-planning.test.ts) (24 tests).
- **UI Representation**: `InvestigationPlanView` (PLAN tab) featuring summary KPI cards, Priority 1 action spotlight, ranked action queue, multi-outcome breakdown, and interactive What-If action simulation.



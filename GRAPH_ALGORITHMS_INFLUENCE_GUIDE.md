# Graph Algorithms as the Core Influential Engines of Investigation

> **Core Principle**: In this system, graph algorithms are **NOT cosmetic visualizations or post-hoc illustrations**. They are the **deterministic, computational spine** that generates possibilities, detects contradictions, prunes invalid hypotheses, guides evidence collection, and validates findings. 

---

## 1. Executive Architecture: How Graph Algorithms Drive Reasoning

```
Raw Evidence & Facts
        │
        ▼ (Provenance & Temporal Gates)
   Evidence Graph (Nodes & Directed Edges)
        │
        ▼
   ┌─────────────────────────────────────────────────────────────────┐
   │       GRAPH TOPOLOGICAL FINGERPRINT & ADAPTIVE SELECTION        │
   │  - Analyzes density, bottlenecks, cycles, and parallel paths    │
   └─────────────────────────────────────────────────────────────────┘
        │
        ├─────────────────────────────┬──────────────────────────────┤
        ▼                             ▼                              ▼
  PATH DISCOVERY             STRUCTURAL BOTTLENECK           EPISTEMIC VALIDATION
┌────────────────────┐     ┌───────────────────────┐      ┌─────────────────────────┐
│ • Yen's K-Shortest │     │ • Lengauer-Tarjan     │      │ • Kahn's Topological    │
│ • Dijkstra         │     │   Dominator Tree      │      │ • Temporal Reachability │
│ • Suurballe's      │     │ • Edmonds-Karp        │      │ • Cycle Detection       │
│   Disjoint Paths   │     │   Min-Cut Capacity    │      │ • Shannon Entropy Gain  │
└────────────────────┘     └───────────────────────┘      └─────────────────────────┘
        │                             │                              │
        └─────────────────────────────┼──────────────────────────────┘
                                      │
                                      ▼
                      DOWNSTREAM INVESTIGATIVE IMPACTS
        ┌─────────────────────────────────────────────────────────────┐
        │ 1. Possibility Space Generation: Discovers corridors        │
        │ 2. Causal Elimination: Prunes impossible branches early    │
        │ 3. Critical Chokepoints: Identifies single points of failure│
        │ 4. Independent Corroboration: Measures multi-path certainty │
        │ 5. Targeted Action Planning: Prioritizes next evidence leads│
        └─────────────────────────────────────────────────────────────┘
```

---

## 2. Key Graph Algorithms and Their Direct Investigative Influences

### 1. Yen's K-Shortest Loopless Paths
* **Domain Algorithm**: `backend/src/domain/algorithms/k-shortest-paths.ts`
* **Direct Influence**: 
  - Prevents investigative "tunnel vision" (anchoring on a single obvious explanation).
  - Automatically identifies secondary and tertiary causal corridors connecting a suspect to a crime or an attack source to an exfiltrated asset.
  - Generates distinct `ALTERNATIVE_CORRIDOR` possibilities with exact path costs and hop distances.
* **Without this algorithm**: Investigators would only ever examine the single shortest route, blinding them to evasive or detour routes taken by actors.

### 2. Lengauer-Tarjan Dominator Trees
* **Domain Algorithm**: `backend/src/domain/algorithms/dominator-tree.ts`
* **Direct Influence**:
  - Finds **unavoidable chokepoints** ($v \text{ dom } w$). If an event $w$ occurred, node $v$ *must* have been transited regardless of which alternative corridor was used.
  - Determines absolute operational bottlenecks.
  - Automatically sets high-priority leads: *"If you can verify or disprove this single dominator node with forensic evidence, you validate or eliminate all downstream paths simultaneously."*

### 3. Edmonds-Karp Minimum Cut / Max-Flow
* **Domain Algorithm**: `backend/src/domain/algorithms/min-cut.ts`
* **Direct Influence**:
  - Identifies the minimum set of critical edges or communications that, if severed or uncorroborated, isolate the target.
  - Provides the mathematical foundation for "Containment Strategy" and "Structural Fragility".
  - Pinpoints which pieces of evidence the entire case rests upon.

### 4. Suurballe's Edge- and Vertex-Disjoint Paths
* **Domain Algorithm**: `backend/src/domain/algorithms/disjoint-paths.ts`
* **Direct Influence**:
  - Measures true **epistemic corroboration**. Two pieces of evidence sharing an intermediate node are dependent; disjoint paths prove completely independent corroborating chains of causality.
  - If a possibility is supported by 2 vertex-disjoint paths, its confidence score increases without AI heuristic guessing.

### 5. Kahn's Topological Sort & Temporal Reachability
* **Domain Algorithm**: `backend/src/domain/algorithms/temporal-analysis.ts` & `backend/src/domain/algorithms/temporal-reachability.ts`
* **Direct Influence**:
  - Enforces physical arrow-of-time causality ($t_{\text{source}} \le t_{\text{target}}$).
  - Detects paradoxes and impossible temporal loops across conflicting witnesses or forged logs.
  - Eliminates candidate hypotheses **deterministically before compute is wasted** generating invalid possibilities.

### 6. Shannon Information Gain & Graph Entropy Reduction
* **Domain Algorithm**: `backend/src/domain/algorithms/information-entropy.ts`
* **Direct Influence**:
  - Given $M$ competing possibilities, which new piece of evidence will maximally collapse uncertainty?
  - Calculates $H(S) = - \sum p_i \log_2(p_i)$ and scores potential investigation questions by their expected entropy reduction $\Delta H$.
  - Dictates the top 3 recommended investigative actions in the Decision Engine.

---

## 3. Why This Beats Pure Generative AI / LLMs

| Feature | LLM-Only Reasoning | Graph Algorithm-First (Our System) |
|---|---|---|
| **Determinism** | Non-deterministic, changes on temperature / prompt | 100% deterministic mathematical execution |
| **Hallucination** | Can fabricate connections that never existed in the logs | Strict hard invariant: zero edges without verified provenance |
| **Bottleneck Detection** | Guesses importance based on narrative vocabulary | Exact Lengauer-Tarjan dominator computation |
| **Path Corroboration** | Conflates correlation with independence | Suurballe disjoint path isolation |
| **Temporal Auditing** | Easily confused by non-linear narrative timestamps | Strict topological sort and reachability graph constraints |
| **Traceability** | Black-box token probabilities | Every conclusion links to exact nodes, edges, and algorithm trace |

---

## 4. How the UI Manifests Algorithm Influence

1. **Why Inspector**: Shows the exact algorithm that retained or eliminated any candidate (`ELIMINATED_BY_GRAPH_ALGORITHM: TEMPORAL_REACHABILITY`).
2. **Interactive Highlighting**: Clicking any algorithm decision highlights the specific sub-graph, cut edges, or dominators on the Cytoscape canvas.
3. **Adaptive Engine Status**: Real-time display showing which topological properties triggered the selection of Yen, Dominators, or Min-Cut.
4. **Investigation Planning**: Generates actions ordered strictly by entropy reduction score, pointing the investigator directly to high-leverage bottlenecks.

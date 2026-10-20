# Graphical Investigation System (GIS)
## Second Review Project Presentation Slide Deck & Content Document

---

### Slide 1: Title Slide
- **Title**: Graphical Investigation System (GIS)
- **Subtitle**: Graph-Theoretic Forensic Reasoning, Causal Elimination, and Information-Theoretic Resolution
- **Review Type**: Second Project Review / Technical Milestone
- **Date**: October 2026
- **Department**: Department of Computer Science & Engineering / AI & Data Science
- **Team Details**:
  - Member 1: [Team Member Name] (Roll No: [Roll Number])
  - Member 2: [Team Member Name] (Roll No: [Roll Number])
  - Member 3: [Team Member Name] (Roll No: [Roll Number])
- **Project Guide**: [Guide Name / Designation]

---

### Slide 2: Table of Contents
1. **Introduction & Motivation**
2. **Why Graph Algorithms vs. Human Intuition? (The Executive Pitch)**
3. **Problem Statement & Cognitive Biases**
4. **Project Objectives**
5. **Existing Systems & Literature Gaps**
6. **Proposed Graphical Investigation System**
7. **Hardware & Software Stack Specifications**
8. **System Architecture & Data Pipeline**
9. **Functional Modules Breakdown**
10. **Core Algorithms & Formal Graph Formulations**
11. **Case Study: "The Stolen Laptop" — Finding the Key Influencer**
12. **System Work Progress & Milestone Achievements**
13. **Implementation Screenshots & Verification**
14. **UN Sustainable Development Goal (SDG 16)**
15. **Conclusion & Key Takeaways**
16. **Future Scope & Extensions**
17. **Academic References**

---

### Slide 3: Introduction & Motivation
- **Context**: Modern digital, corporate, and physical criminal investigations produce complex, high-velocity evidence streams (badge access swipes, CCTV timestamps, financial wire logs, and witness statements).
- **Human Cognitive Bottleneck**: Investigating officers manually compile timeline boards using spreadsheets or unweighted link charts, leading to tunnel vision and investigative confirmation bias.
- **Our Solution**: A deterministic, graph-first forensic decision engine that maps evidence into directed acyclic graphs (DAGs), models competing crime theories as topological corridors, and applies formal graph algorithms to mathematically prove or refute suspect hypotheses.
- **Core Philosophy**: Zero probabilistic guesswork—every conclusion is backed by 100% computational provenance and reproducible graph proofs.

---

### Slide 4: Why Graph Algorithms vs. Human Intuition? (The Executive Pitch)
- **The Core Question**: *"Can't an experienced detective just spot the culprit manually?"*
- **The Benchmark Philosophy**:
  - In a simple 6-node case, a human spots the answer in 5 seconds. The 6-node case exists **not because a computer is needed**, but to prove that the algorithm produces 100% mathematically sound results that match human common sense.
  - Just as Google Maps isn't built to navigate from your bedroom to your kitchen, GIS isn't built for 2-suspect cases—it is built for enterprise incidents where human intuition completely collapses.
- **Where Human Investigation Breaks Down**:
  1. **Tunnel Vision & Confirmation Bias**: Human detectives latch onto intuitive suspects (e.g., interrogating Bob for days because he was on the floor). The graph engine evaluates all competing paths simultaneously and exonerates Bob in 2 milliseconds via verified CCTV alibis.
  2. **Cognitive Overload (Miller's Law)**: Human working memory caps at $7 \pm 2$ discrete variables. When a case involves 5,000 door swipes, 20 camera feeds, and 50 employees, manual spreadsheet reviews take months and miss circular conspiracies.
  3. **Shannon Information Optimization**: Rather than randomly interviewing witnesses, the engine calculates Shannon Entropy ($H(P)$) to pinpoint the **single lead** that yields maximum Information Gain ($\Delta H$), cutting investigation time by up to 80%.
  4. **Courtroom Admissibility & Legal Proof**: In court, a defense attorney asks: *"Could someone else have entered?"* A human says: *"I don't think so."* GIS presents a formal **Ford-Fulkerson Min-Cut Proof**: proving zero alternative corridors existed and Alice was the sole topological possibility.

---

### Slide 5: Problem Statement
- **Fragmented Evidence Topologies**: Modern investigations lack automated systems that synthesize temporal intervals, causal links, and contradictions into a single unified mathematical structure.
- **Investigative Confirmation Bias**: Detectives disproportionately pursue initial suspect theories while overlooking mathematically viable alternative corridors or alibis.
- **Topological Inconsistencies**: Existing forensic visualization tools do not enforce physical or temporal monotonicity ($t_{\text{cause}} \le t_{\text{effect}}$), permitting impossible "backward time-travel" narratives.
- **Resource Exhaustion**: Police and forensic teams waste critical hours verifying redundant leads without an information-theoretic priority ranking indicating which single piece of missing evidence will break the case open.

---

### Slide 5: Project Objectives
1. **Automated Evidence-to-Graph Reconstruction**: Automatically parse unstructured incident text, access logs, and forensic records into bi-temporal graph nodes (Entities, Events, Evidence) and causal relationships.
2. **Topological Feasibility & Monotonicity Enforcement**: Eliminate invalid investigative theories using Kahn's topological sorting and temporal reachability bounds.
3. **Deterministic Hypothesis Generation**: Generate $K$-alternative causal corridors without subjective bias using Yen’s K-Shortest Paths algorithm over weighted evidentiary graphs.
4. **Choke Point & Bottleneck Identification**: Isolate single-point-of-failure dominator nodes using Lengauer-Tarjan trees, proving where an alibi mathematically collapses all theories.
5. **Shannon Entropy Resolution**: Measure uncertainty across competing hypotheses using Shannon entropy ($H(P)$) and rank future investigation leads by maximum Information Gain.

---

### Slide 6: Existing Systems & Limitations
- **IBM i2 Analyst's Notebook**:
  - *Strengths*: Industry standard link-analysis and chart generation.
  - *Limitations*: Static visualization tool; no automated algorithmic elimination; cannot prove counterfactual graph cuts or measure entropy reduction.
- **Palantir Gotham / Foundry**:
  - *Strengths*: Enterprise-scale multi-source data fusion.
  - *Limitations*: Heavyweight proprietary black-box; high infrastructure cost; lacks deterministic counterfactual simulation deck for courtroom proof.
- **Maltego**:
  - *Strengths*: OSINT network footprinting and relationship mining.
  - *Limitations*: Lacks temporal interval validation; does not compute minimal cut capacities or dominator trees for forensic alibi analysis.
- **Neo4j Bloom / Cypher**:
  - *Strengths*: Flexible property graph queries.
  - *Limitations*: Query-only environment; requires manual query writing; lacks automated forensic possibility synthesis and Shannon entropy optimization.

---

### Slide 7: Proposed System
- **Bi-Temporal Property Graph Layer**: Distinguishes valid event occurrence time from evidence recording timestamp, enforcing physical causality.
- **Deterministic Algorithmic Pipeline**: Operates 7 formal graph algorithms to parse, validate, prune, partition, and resolve forensic cases.
- **Live Algorithm Simulation Deck**: Interactive forensic canvas featuring step-by-step playback of Dijkstra traversals, dominator choke-point severing, and Edmonds-Karp containment cuts.
- **Counterfactual Alibi Sandbox**: Allows detectives to toggle hypothetical alibis (e.g., "Suspect verified at Cafeteria at 14:20") and immediately observe downstream graph reachability collapse.
- **Information-Theoretic Decision Support**: Computes Resolution Utility for uncollected evidence, directing detectives to the exact next warrant, camera angle, or interview to execute.

---

### Slide 8: Software & Hardware Requirements

#### Software Architecture
- **Frontend / Client UI**: Next.js 15 (React 19), Tailwind CSS v4, HeroUI component framework, Lucide Iconography (Zero Emojis).
- **Graph Visualization**: Cytoscape.js with Dagre hierarchical layout and custom GPU-accelerated styling canvas.
- **Backend Application Core**: Node.js runtime, TypeScript (ES2024), Express REST API architecture.
- **Storage & Engine**: Embedded SQLite relational store with in-memory transaction savepoints and recursive graph queries.
- **Testing & Verification**: Native Node.js Test Runner (`node:test`, `node:assert`) executing 239 deterministic unit and integration test assertions.

#### Hardware Specifications
- **Development & Target Environment**: Modern Multi-core x86_64 / ARM64 workstation (minimum 8 GB RAM, dual-core 2.0 GHz CPU).
- **Execution Profile**: Sub-50ms graph algorithmic execution for topologies up to 10,000 nodes.
- **Deployment**: Lightweight containerizable microservice; zero external cloud or GPU hardware dependency required.

---

### Slide 9: System Architecture & Data Flow
```
┌────────────────────────────────────────────────────────────────────────┐
│                        EVIDENCE INGESTION AGENT                        │
│   Raw Narrative Text / Door Access Logs / CCTV Feeds / Forensic Files  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Automated Entity-Event Extraction
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                     BI-TEMPORAL KNOWLEDGE GRAPH                        │
│   Nodes: Entity (Actor/Asset) | Event (Action/Time) | Evidence (Proof)  │
│   Edges: CAUSAL | INVOLVED | PERMITS | SUPPORTS | CONTRADICTS          │
└─────────────────┬──────────────────────────────────┬───────────────────┘
                  │                                  │
                  ▼                                  ▼
┌──────────────────────────────────┐ ┌───────────────────────────────────┐
│     TOPOLOGICAL PRUNING ENGINE   │ │     HYPOTHESIS GENERATION         │
│  - Temporal Monotonicity Check   │ │  - Yen's K-Shortest Paths         │
│  - Contradiction Severing        │ │  - Structural Family Clustering   │
└─────────────────┬────────────────┘ └─────────────────┬─────────────────┘
                  │                                    │
                  └─────────────────┬──────────────────┘
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                 GRAPH-THEORETIC ALGORITHM REASONER                     │
│  - Dijkstra: Minimal Causal Path Distance                              │
│  - Lengauer-Tarjan: Dominator Tree & Single-Point Choke Points         │
│  - Edmonds-Karp: Max-Flow Min-Cut Network Containment                  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                RESOLUTION & DECISION OPTIMIZATION LAB                  │
│  - Shannon Entropy H(P) Calculation                                    │
│  - Resolution Utility Ranking for Missing Evidence Collection          │
│  - Counterfactual Simulation Sandbox                                   │
└────────────────────────────────────────────────────────────────────────┘
```

---

### Slide 10: Functional Modules
1. **Evidence Ingestion & Entity Normalization Module**:
   - Parses multi-source incident text and access credentials.
   - Normalizes ISO-8601 timestamps and assigns provenance reliability weights ($0.0 \le w \le 1.0$).
2. **Graph Reasoning & Topology Management Module**:
   - Maintains directed graph state in SQLite with full transactional rollback.
   - Enforces temporal validation rules ($t_{\text{start}} \le t_{\text{end}}$) and flags physical impossibilities.
3. **Hypothesis Synthesis & Corridor Engine**:
   - Enumerates alternative suspect traversal pathways.
   - Extracts common invariant nodes across competing theories.
4. **Interactive Forensic Simulation Module**:
   - Visualizes live algorithm steps (frontier discovery, edge relaxation, cut frontiers).
   - Enables interactive node severing to simulate verified alibis.
5. **Resolution Strategy & Information Gain Module**:
   - Computes probability distribution over surviving hypotheses.
   - Recommends the highest-utility investigative action to minimize case entropy.

---

### Slide 11: Core Algorithms & Formulations (Part 1)

#### 1. Dijkstra’s Shortest Causal Corridor
- **Purpose**: Computes the least-effort, highest-confidence causal pathway connecting origin entry to breach target.
- **Formulation**:
  $$\text{dist}(v) = \min_{(u,v) \in E} \left( \text{dist}(u) + w(u,v) \right)$$
- **Weight Function**: $w(e) = \frac{1}{\text{Reliability}(e)}$; penalizes uncorroborated leads.

#### 2. Temporal Reachability & Kahn's Topological Sort
- **Purpose**: Validates chronological monotonicity and eliminates backward time-travel loops.
- **Invariant**: For every directed causal edge $(u \to v)$:
  $$t(u) \le t(v)$$
  If $t(u) > t(v)$, the edge is flagged as topologically contradictory and severed.

#### 3. Yen’s K-Shortest Paths
- **Purpose**: Enumerates top-$K$ alternative investigative routes without subjective bias.
- **Execution**: Iteratively computes deviation paths from the shortest path using Dijkstra, generating rank-ordered hypothesis corridors ($P_1, P_2, \dots, P_k$).

---

### Slide 12: Core Algorithms & Formulations (Part 2)

#### 4. Lengauer-Tarjan Dominator Tree (Choke Points)
- **Purpose**: Identifies single points of failure in an incident scenario.
- **Definition**: Node $d$ dominates node $n$ ($d \text{ dom } n$) if every path from source $s$ to $n$ must pass through $d$.
  $$\text{sdom}(w) = \min \left( \{ \text{semi}(v) \mid (v,w) \in E, v < w \} \cup \{ \text{sdom}(u) \mid (u,w) \in E, u > w \} \right)$$
- **Forensic Theorem**: Proving a valid alibi for an immediate dominator node $\text{idom}(t)$ mathematically proves the target was unreachable, refuting the suspect.

#### 5. Edmonds-Karp Minimum Cut (Containment)
- **Purpose**: Identifies the minimal set of relationships that, if cut, partition the network into isolated components.
- **Max-Flow Min-Cut Theorem**:
  $$C(S, T) = \sum_{u \in S, v \in T, (u,v) \in E} c(u,v)$$
- **Forensic Utility**: Determines the exact security boundaries or credentials to revoke to quarantine ongoing unauthorized exfiltration.

---

### Slide 13: Core Algorithms & Formulations (Part 3)

#### 6. Shannon Information Entropy & Resolution Utility
- **Possibility Probability**: Normalized by path reliability weight $W(P_i)$:
  $$p(P_i) = \frac{W(P_i)}{\sum_j W(P_j)}$$
- **Case Uncertainty (Entropy)**:
  $$H(P) = -\sum_{i=1}^{M} p(P_i) \log_2 p(P_i) \quad [\text{bits}]$$
- **Resolution Utility of Evidence $E_k$**:
  $$U(E_k) = H(P) - \mathbb{E}\left[ H(P \mid E_k) \right]$$
  Directs investigators to collect the evidence item that yields the steepest drop in case entropy.

#### 7. Computational Complexity Comparison
| Algorithm | Forensic Role | Time Complexity | Space Complexity |
|:---|:---|:---|:---|
| **Dijkstra** | Shortest Causal Corridor | $O(E + V \log V)$ | $O(V)$ |
| **Yen's K-Shortest** | Hypothesis Enumeration | $O(K \cdot V (E + V \log V))$ | $O(K \cdot V)$ |
| **Kahn's Sort** | Chronological Ordering | $O(V + E)$ | $O(V)$ |
| **Lengauer-Tarjan** | Dominator Choke Points | $O(E \cdot \alpha(E, V))$ | $O(V + E)$ |
| **Edmonds-Karp** | Containment Min-Cut | $O(V \cdot E^2)$ | $O(V + E)$ |
| **Shannon Utility** | Evidence Prioritization | $O(M \cdot \log M)$ | $O(M)$ |

---

### Slide 14: Case Study: "The Stolen CEO Laptop" — Finding the Key Influencer
```
[Suspect: Alice] ──(swipes badge)──> [10:02 AM Keycard Lock] ──(enters)──> [Room 404] ──> [Stolen Laptop]
                                              ▲
                                              │
                                   CRITICAL CHOKE POINT
                               (Lengauer-Tarjan Dominator)
```
- **The Scenario**: A ThinkPad X1 is stolen from Room 404. Two suspects exist: Alice (Accountant) and Bob (Janitor).
- **The Graph Topological Discovery**:
  1. **Immediate Dominator Identified**: `event-alice-unlocks` ("10:02 AM - Alice swipes badge into Room 404"). 100% of directed paths connecting the suspect to the crime scene pass through this single bottleneck ($idom(\text{Room 404}) = \text{Door 404 Lock}$).
  2. **Automated Alibi Pruning**: Bob is seen on cafeteria CCTV at 10:00 AM on the 1st floor. The topological monotonicity engine detects that $t_{\text{alibi}} + \Delta t_{\text{travel}} > t_{\text{incident}}$, mechanically severing Bob's reachability corridor.
  3. **Information-Theoretic Impact**: With Bob eliminated, $H(P)$ drops from $1.00\text{ bit} \rightarrow 0.00\text{ bits}$ (100% resolution, zero ambiguity).
- **Why This Matters to the Investigator**:
  - The detective doesn't waste hours checking Alice's home or interviewing her colleagues.
  - The system outputs a targeted prosecutorial action plan:
    - `STEP 1`: Execute immediate search warrant on Alice's assigned locker to recover the laptop.
    - `STEP 2`: Issue official formal exoneration notice for Bob backed by the CCTV exhibit.
    - `STEP 3`: Export court-ready SHA-256 sealed forensic dossier to the District Attorney.

---

### Slide 15: System Work Progress & Milestone Achievements
- **Backend Architecture Complete**:
  - Full implementation of all 7 graph algorithms in TypeScript without external solver dependencies.
  - SQLite bi-temporal knowledge graph schema with foreign key integrity and savepoints.
- **End-to-End Verification**:
  - 239 automated tests passing across 9 test suites covering synthetic benchmarks, scaling from 100 to 10,000 nodes.
  - Zero-drift guarantee: Adaptive reasoning pipeline matches 100% full-pipeline equivalence with an average 62% speedup.
- **Frontend & Visualization Polish**:
  - Full Cytoscape.js interactive forensic canvas with Dagre, CoSE, and Concentric layouts.
  - Executive Cyber-Cyan telemetry palette with legible midground dimming (0.45 opacity).
  - Complete emoji purge: 100% clean, professional Lucide SVG iconography.
  - Live Counterfactual Simulation Deck with playback speed controls (0.5x to 2x) and instant Alibi Severing.

---

### Slide 15: Implementation Screenshots & Verification
*(Include screenshots of the live system running at `http://localhost:3000`)*

1. **Graph Canvas & Forensic Telemetry Bar**:
   - Interactive visualization showing live Causal Corridor (Dijkstra), Choke Point indicators (Lengauer-Tarjan), and Containment Cut boundaries.
2. **Timeline Monotonicity Engine**:
   - Step-by-step chronological event player filtering events forwards in time and detecting retroactive contradictions.
3. **Hypotheses & Structural Families View**:
   - Competing hypotheses ranked by cost, showing shared structural invariant nodes and critical dependencies.
4. **Resolution Lab & Shannon Entropy Gauge**:
   - Circular gauge displaying $H(P)$ in bits, counterfactual simulation cards, and priority-ranked investigative actions.
5. **Algorithm Efficiency & Evaluation Lab**:
   - Multi-pipeline comparative benchmarks (Baseline vs. Full Graph vs. Adaptive Graph) with runtime execution tables.

---

### Slide 16: UN Sustainable Development Goal (SDG)

#### SDG 16: Peace, Justice, and Strong Institutions
- **Target 16.3**: *"Promote the rule of law at the national and international levels and ensure equal access to justice for all."*
- **Direct Project Alignment**:
  - **Eliminating Confirmation Bias**: By mathematically generating all viable corridors and eliminating false theories via formal graph proofs, the system prevents wrongful accusations based on investigator conjecture.
  - **100% Provenance & Courtroom Explainability**: Every conclusion links directly to verifiable physical evidence and mathematical theorems rather than black-box statistical hallucinations.
  - **Institutional Transparency**: Provides law enforcement and oversight agencies with a deterministic audit log of why specific leads were pursued or discarded.

---

### Slide 17: Conclusion & Key Takeaways
- **Paradigm Shift in Investigation**: Transforms forensic analysis from speculative whiteboard diagrams into a formal, verifiable graph science.
- **Deterministic Rigor**: Combines classic computer science algorithms (Dijkstra, Tarjan, Edmonds-Karp) with information theory (Shannon Entropy) to automate investigative reasoning.
- **Efficiency & Objective Precision**: Reduces case resolution time while ensuring no plausible investigative theory is prematurely discarded.
- **Production-Ready Implementation**: Verified across 239 test assertions with real-time UI execution, proving the feasibility of graph-driven criminal justice tooling.

---

### Slide 18: Future Scope
1. **Multi-Modal Video & Audio Fact Extraction**: Integrate computer vision models (YOLO / CLIP) to extract timestamped bounding-box graph events directly from surveillance footage.
2. **Federated Cross-Jurisdictional Graphs**: Enable privacy-preserving graph reconciliation across separate law enforcement databases without sharing raw entity PII.
3. **Probabilistic Soft Evidence Modeling**: Extend deterministic cuts with Dempster-Shafer belief functions to handle witness reliability under uncertainty.
4. **Mobile Field Investigator Terminal**: Develop a lightweight PWA/tablet interface for crime scene investigators to input initial facts directly from the field.
5. **Automated Courtroom Dossier Generation**: Export cryptographically verifiable PDF evidentiary packages complete with mathematical proofs for judicial presentation.

---

### Slide 19: References
1. **Dijkstra, E. W.** (1959). *A note on two problems in connexion with graphs.* Numerische Mathematik, 1(1), 269–271.
2. **Lengauer, T., & Tarjan, R. E.** (1979). *A fast algorithm for finding dominators in a flowgraph.* ACM Transactions on Programming Languages and Systems (TOPLAS), 1(1), 121–141.
3. **Yen, J. Y.** (1971). *Finding the K shortest loopless paths in a network.* Management Science, 17(11), 712–716.
4. **Edmonds, J., & Karp, R. M.** (1972). *Theoretical improvements in algorithmic efficiency for network flow problems.* Journal of the ACM (JACM), 19(2), 248–264.
5. **Shannon, C. E.** (1948). *A mathematical theory of communication.* The Bell System Technical Journal, 27(3), 379–423.
6. **Kahn, A. B.** (1962). *Topological sorting of large networks.* Communications of the ACM, 5(11), 558–562.
7. **Pearl, J.** (2009). *Causality: Models, Reasoning, and Inference.* Cambridge University Press.

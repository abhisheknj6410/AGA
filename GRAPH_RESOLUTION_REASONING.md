# Graph-Based Resolution Reasoning Engine

## 1. Problem Definition & Core Principle

In complex investigations, generating alternative hypotheses is only half the battle. Presenting an investigator with ten competing possibilities without structural differentiation leads to cognitive overload and tunnel vision.

The central question answered by the **Resolution Reasoning Engine** is:

> **"What graph-observable information would most effectively distinguish, partition, and resolve the surviving possibilities?"**

The system does NOT guess real-world truth or invent probabilities. Instead, it extracts **deterministic graph distinctions** (unavoidable dominators, minimal separating cuts, candidate corridors, disjoint support routes, and contradiction boundaries), groups possibilities into **structural families**, and computes a measurable **Resolution Utility** score for each candidate piece of resolving evidence.

---

## 2. Surviving Possibility Space

Candidate possibilities are produced by generative algorithms (Yen's K-Shortest Paths, Entity Resolution, Contradiction Branching, Temporal Sequencing) and filtered by the Possibility Constraint Engine:
- **`VALID`**: Satisfies all temporal chronology and verified evidence provenance constraints.
- **`CONDITIONAL`**: Depends on an unverified identity merge or pending hypothesis.
- **`CONFLICTING`**: Depends on disputed facts or contradictory evidence links.
- **`INVALID`**: Causally impossible or temporally inverted event sequences (strictly pruned from the possibility space).

The Resolution Reasoning Layer operates exclusively over the **surviving valid, conditional, and conflicting possibilities**.

---

## 3. Structural Families

Rather than treating every possibility as an isolated model, the engine clusters them deterministically into **Structural Families** based on their topological routing backbone:
- **Corridor Backbone Clustering**: Groups routes sharing the primary intermediate transit gateway (e.g., `CORRIDOR_VIA_NORTH_DISTRICT_ALLEY` vs `CORRIDOR_VIA_COMMERCIAL_BOULEVARD`).
- **Identity Hypothesis Families**: Groups branches based on identity merge assumptions (`IDENTITY_UNIFIED_HYPOTHESIS` vs `IDENTITY_SEPARATE_HYPOTHESIS`).
- **Contradiction Families**: Groups models by physical execution mechanism (`PROXY_EXECUTION_HYPOTHESIS` vs `DIRECT_ATTRIBUTION_HYPOTHESIS`).

This clustering prevents redundant comparison of minor variants and focuses investigation on foundational branch divergences.

---

## 4. Common Invariants (Universal Structural Intersection)

For all surviving possibilities $P_1, P_2, \dots, P_n$, the engine computes the exact mathematical intersection:
$$\text{Invariants} = \bigcap_{i=1}^n \mathcal{G}(P_i)$$

Components computed:
1. **Common Nodes & Entities**: Present in 100% of surviving possibilities.
2. **Common Directed Edges**: Mandatory relationships required by all branches.
3. **Common Events**: Timestamped actions that occurred regardless of the chosen hypothesis.
4. **Common Provenance**: Physical/digital evidence items underpinning all branches.
5. **Common Unavoidable Dominator Choke Points**: Intermediate infrastructure or checkpoints that dominate the target across all corridors.

**Investigative Value**: Invariants represent **structural ground truth** across all valid theories. Investigators never need to waste resources proving invariant elements.

---

## 5. Distinguishing Structures

Any graph entity, directed edge, supporting evidence item, or identity assertion present in a proper non-empty subset of possibilities ($0 < \text{count} < N$) is a **Distinguishing Structure**:
- Recorded with `presentInPossibilityIds` and `absentInPossibilityIds`.
- Mapped to `presentInFamilyIds` and `absentInFamilyIds`.
- Assigned a structural role (e.g., *"Alternative Corridor Intermediate"*, *"Unique Supporting Evidence"*, *"Identity Hypothesis"*).

---

## 6. Resolution Candidates & Graph Basis

A **Resolution Candidate** specifies concrete, schema-grounded information that would eliminate one or more competing branches. Candidates originate directly from graph algorithms:
1. **Dominator Divergence (`DOMINATORS_ALGORITHM`)**:
   - If node $X$ is an unavoidable dominator for Family 1 but is bypassed in Family 2, verifying or refuting activity at $X$ isolates that entire structural family.
2. **Min-Cut Separation (`MIN_CUT_ALGORITHM`)**:
   - The minimum cut identifies separating boundary edges between competing paths. Verifying telemetry or access across these edges cleanly bisects the space.
3. **Alternative Corridors (`K_SHORTEST_PATHS`)**:
   - Distinguishing intermediate nodes and transit segments between source and target.
4. **Disjoint Support Routes (`DISJOINT_PATHS`)**:
   - Independent corroborating corridors evaluate evidentiary robustness.

---

## 7. Deterministic Resolution Utility Formula

Resolution candidates are prioritized without AI or subjective ranking. The **Resolution Utility Score** ($0 - 100$) is computed via:

$$\text{Utility} = \min\left(100, \text{round}\left(\frac{\text{RawScore}}{5.0} \times 100\right)\right)$$

Where:
$$\text{RawScore} = 2.0 \cdot C_{\text{fam}} + 1.5 \cdot S_{\text{sep}} + 1.0 \cdot C_{\text{poss}} + 0.5 \cdot T_{\text{spec}}$$

- **$C_{\text{fam}}$ (Family Coverage, $0.0 - 1.0$)**: Fraction of structural families distinguished: $\frac{|\mathcal{F}_{\text{covered}}|}{|\mathcal{F}_{\text{total}}|}$.
- **$S_{\text{sep}}$ (Structural Separation / Partition Balance, $0.0 - 1.0$)**: Penalizes lopsided splits and rewards balanced bisections:
  $$S_{\text{sep}} = 1.0 - \frac{|P_{\text{valid}} - P_{\text{pruned}}|}{P_{\text{total}}}$$
- **$C_{\text{poss}}$ (Possibility Coverage, $0.0 - 1.0$)**: Total possibilities partitioned: $\frac{|P_{\text{affected}}|}{P_{\text{total}}}$.
- **$T_{\text{spec}}$ (Temporal Specificity, $0.5 - 1.0$)**: Boost for event nodes anchored by precise timestamps.

---

## 8. Resolution Matrix & Structural Entropy

The **Resolution Matrix** is a binary truth table:
$$\mathbf{M}[R_i, P_j] = \begin{cases} \mathbf{true} & \text{if } P_j \text{ requires target of } R_i \\ \mathbf{false} & \text{if } P_j \text{ is independent of } R_i \end{cases}$$

### Structural Uncertainty (Entropy)
Under an equal-weight baseline across $N$ surviving possibilities, structural uncertainty is given by:
$$H(P) = -\sum_{i=1}^N \frac{1}{N} \log_2\left(\frac{1}{N}\right) = \log_2(N) \text{ bits}$$
*Explicit Note: This measures topological ambiguity across candidate models, not a Bayesian probability of real-world guilt.*

---

## 9. Contradiction Analysis

When two pieces of evidence contradict each other (e.g., CCTV alibi vs cellular tower ping), the engine maps:
- `affectedPossibilityIds`: Possibilities directly dependent on the contested fact.
- `unaffectedPossibilityIds`: Independent possibilities that bypass the disputed event.
- `reason`: Explicit graph-based explanation of why certain corridors are immune to the contradiction.

---

## 10. Counterfactual Resolution Simulation ("What-If")

Integrated directly with the in-memory simulation engine:
1. Investigator selects a candidate $R_i$ and clicks **"Simulate Confirmation"** or **"Simulate Refutation"**.
2. The engine executes a counterfactual pass on an in-memory graph clone (zero database writes).
3. The possibility space immediately recalculates:
   - **Before**: $N$ possibilities.
   - **After**: $M$ possibilities.
   - **Eliminated**: List of pruned possibility branches and eliminated structural families with causal explanations.

---

## 11. Investigation Agent Query Integration

The Investigation Agent answers all resolution inquiries deterministically:
- *"What possibilities remain?"* $\rightarrow$ Returns surviving branches grouped by structural family.
- *"What do all surviving possibilities have in common?"* $\rightarrow$ Returns common entities, edges, evidence, and unavoidable dominator choke points.
- *"What information would distinguish the current possibility families?"* $\rightarrow$ Returns top-ranked resolution candidates with utility scores and suggested evidence classes.
- *"Which contradiction affects the most possibilities?"* $\rightarrow$ Identifies the conflict impacting the largest possibility subset.
- *"Which edge is a critical cut?"* $\rightarrow$ Reports minimal separating cut edges.
- *"What would happen if that evidence were added?"* $\rightarrow$ Runs counterfactual simulation and reports the exact reduction in possibilities.

---

## 12. Verification & Test Suite Summary

- **Total Backend Tests**: **106 / 106 passing** (0 failures, 2.30s).
- **Ablation Suite**: Covers removal of K-shortest paths, temporal validation, evidence constraints, structural differentiation, and simulation.
- **Frontend Production Build**: **PASS** (`tsc -b && vite build` in 825ms).

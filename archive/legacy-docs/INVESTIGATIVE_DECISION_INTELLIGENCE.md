# Phase 8: Investigative Decision Intelligence

## 1. Overview

**Investigative Decision Intelligence** elevates the graphical investigation system from passive graph visualization to an active decision intelligence pipeline. It directly answers the investigator's core question:

> **"Given everything currently known, what specific uncertainty in the graph should I resolve next, and exactly why?"**

Every recommendation is mathematically derived from the graph topology and surviving possibility space. The system enforces a strict invariant:
> **The system never recommends an investigation action unless it can identify a concrete, unresolved graph distinction that the action addresses.**

---

## 2. Five-Stage Algorithm $\to$ Decision Provenance Trace

Every investigative recommendation produces an auditable 5-stage causal chain:

```text
1. Graph Structure
      ↓
2. Algorithm Result
      ↓
3. Possibility Distinction
      ↓
4. Evidence Target
      ↓
5. Investigation Action
```

### Complete End-to-End Example
From the Metropolitan Logistics & Vault Incident:
1. **Graph Structure**: Candidate ingress corridors between `Harbor Warehouse 12` and `Downtown Security Vault` bifurcating into a ground-level access route vs an overhead roof service route.
2. **Algorithm Execution**: Min-Cut flow analysis and Yen's K-Shortest Paths identify edge `(Harbor Warehouse 12 -> Downtown Security Vault)` as a separating min-cut flow boundary.
3. **Possibility Distinction**: Edge is present in Possibility #1 (`Direct Ground Transport Route`) but absent in Possibility #2 (`Alibi Divergence Route`).
4. **Evidence Target**: `Verify whether Harbor Warehouse 12 -> Downtown Security Vault occurred between 14:50–15:35 because this edge separates Possibility #1 from Possibility #2.` (Suggested Class: `CCTV / Physical Access Log`).
5. **Investigation Action**: Execute Action `ACT-1`: Acquire Electronic Keycard / CCTV telemetry to partition the candidate possibility space, achieving **0.693 bits** of Shannon entropy reduction.

---

## 3. Graph-Derived Evidence Targets

Unlike generic evidence recommendations (e.g. simply suggesting "acquire CCTV"), the engine derives:
- **Target Element**: Precise graph node ID, edge tuple `(u, v)`, or temporal interval.
- **Structural Role**: Identifies whether the element is a `Min-Cut Flow Boundary`, `Unavoidable Dominator Choke Point`, or `Alternative Corridor Branch`.
- **Temporal Window**: Strict timestamp bounds extracted from event interval metadata (e.g. `2026-03-01T14:20:00Z` to `14:50:00Z`).
- **Exact Verification Question**: Formulated to explain what is being verified and which specific hypotheses are separated.

---

## 4. Alternative Investigation Strategies

Rather than forcing a single action, the engine constructs competing strategies to address different operational constraints:

| Strategy | Objective | Focus | Tradeoff |
| :--- | :--- | :--- | :--- |
| **Strategy A: Max Information Gain** | Fastest uncertainty reduction | Maximum Shannon entropy reduction ($H(P) - E[H]$) | High discriminatory power; may require physical surveillance (Cost 3-4/5). |
| **Strategy B: Low-Cost Telemetry** | Rapid digital acquisition | Lowest acquisition cost (LOG, SYSTEM_RECORD, cost 1-2) | Immediate automated verification; focused on digital endpoints. |
| **Strategy C: Bottleneck / Invariant Falsification** | Multi-hypothesis refutation | Dominator choke points & flow bottlenecks | If refuted, eliminates multiple candidate hypotheses simultaneously. |

---

## 5. Counterfactual Strategy Simulation

The investigator can simulate each strategy interactively before expending investigative resources:
- **Confirmed Outcome**: Evaluates surviving vs eliminated hypotheses and new entropy $H(P_{\text{confirmed}})$.
- **Refuted Outcome**: Evaluates inverted hypothesis survival and new entropy $H(P_{\text{refuted}})$.
- **Surviving Structural Families**: Tracks which topological corridors remain viable.
- **Downstream Actions**: Previews which subsequent investigation actions become unlocked.

---

## 6. Verification Status

- **Investigative Decision Test Suite**: 18/18 tests passing (`backend/src/tests/investigative-decision.test.ts`).
- **Total Backend Test Suite**: 193/193 tests passing across 9 test suites (0 failures).
- **Frontend Production Build**: Zero compilation or lint errors (`npm --prefix frontend run build`).
- **Decision UI**: Dedicated `InvestigationDecisionView` accessible via the **Decisions** tab.

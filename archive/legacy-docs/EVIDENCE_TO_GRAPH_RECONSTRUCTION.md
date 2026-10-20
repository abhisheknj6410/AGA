# Evidence-to-Graph Reconstruction & Provenance Reasoning (Phase 13)

## 1. Executive Summary & Epistemic Core

Investigative graphs cannot rely on optimistic assumptions or probabilistic hallucinations. In real-world investigations, incoming evidence is messy, incomplete, contradictory, and occasionally fabricated or unverified.

**Core Epistemic Invariant:**
> *"Every accepted causal relationship in the investigation graph must be explainable from explicit evidence or an explicitly labelled graph inference. Nothing silently becomes fact."*

Phase 13 builds a deterministic evidence-to-graph reconstruction pipeline that transforms raw multi-source evidence into validated, provenance-traced graph structures without inventing relationships.

---

## 2. Epistemic Fact Taxonomy

Every extracted fact is tagged with an immutable epistemic status:

| Epistemic Status | Definition | Admission Rule |
| :--- | :--- | :--- |
| **`OBSERVED`** | Directly attested by high-integrity physical evidence (e.g. tamper-evident sensor, CCTV, cryptographic log). | Admitted directly to graph backbone. |
| **`INFERRED`** | Derived deterministically from transitive graph operations or explicit physical constraints. | Admitted with explicit `INFERENCE` flag and derivation chain. |
| **`POSSIBLE`** | Supported by one coherent hypothesis or corridor, but lacking corroboration or competing with another corridor. | Kept in hypothesis branches; not universal fact. |
| **`CONFLICTING`** | Mutually exclusive with another observation (e.g. suspect simultaneously at Location A and Location B). | Isolated into competing graph interpretations. Never smoothed away. |
| **`UNRESOLVED`** | Lacks critical temporal or entity bounds needed for causal ordering. | Retained as open question target for investigative action. |

---

## 3. The 5-Stage Reconstruction Pipeline

```mermaid
flowchart TD
  R[Raw Multi-Source Evidence] --> E[Deterministic Fact Extraction]
  E --> G{7-Gate Validation Engine}
  G -- "Violates Gate" --> X[Rejected Fact Store & Explanations]
  G -- "Passes Gates" --> C{Contradiction Detector}
  C -- "Contradiction Found" --> B[Competing Graph Interpretations (Alpha / Beta)]
  C -- "No Conflict" --> A[Accepted Graph Backbone]
  A --> T[Cryptographic Provenance Linker]
  B --> T
  T --> P[100% Provenance Coverage Guaranteed]
```

### The 7 Strict Validation Gates

1. **`SCHEMA` Gate**: Verifies subject, predicate, object types and entity categories (`ENTITY`, `EVENT`, `EVIDENCE`).
2. **`TEMPORAL` Gate**: Verifies valid ISO-8601 formatting and ensures interval non-inversion ($T_{\text{start}} \le T_{\text{end}}$).
3. **`PROVENANCE` Gate**: Enforces non-empty source evidence ID, citation/reference, and reliability score $\ge 0.1$. Unprovenanced rumors are rejected outright.
4. **`ENTITY_IDENTITY` Gate**: Verifies entity existence and prevents fuzzy accidental merging of distinct entities.
5. **`RELATIONSHIP_DIRECTION` Gate**: Checks temporal and physical causality ($T(\text{subject}) \le T(\text{object})$). Inverted causal directions are rejected.
6. **`CONTRADICTION` Gate**: Detects temporal inversions, mutually exclusive locations, and alibi conflicts.
7. **`DISCONNECTED_FACT` Gate**: Prevents floating assertions unconnected to known investigation anchors.

---

## 4. Contradiction Isolation & Competing Interpretations

When two facts conflict (e.g., *Fact-03: Suspect at Vault at 14:22* vs *Fact-04: Suspect at Subway 10km away at 14:23*), traditional systems often:
- Pick the one with the higher arbitrary confidence score.
- Blend them into a fuzzy compromise.

**Our Approach:**
1. Record a formal `ContradictionRecord` documenting the mutually exclusive claims.
2. Branch the possibility space into distinct **`GraphInterpretations`**:
   - **Interpretation Alpha**: Corroborates the Vault intrusion path (supporting Fact-03, conflicting with Fact-04).
   - **Interpretation Beta**: Corroborates the Transit alibi path (supporting Fact-04, conflicting with Fact-03).
3. Compute explicit **Distinguishing Edges**, **Shared Backbone Edges**, and **Required Assumptions** for each interpretation.

---

## 5. Edge Provenance Inspector & Cryptographic Verification

Every edge in the accepted graph maintains an `EdgeProvenanceTrace`:
- **Source Evidences**: ID, human-readable name, kind, reference (e.g., *"Security Log Line 142"* or *"CCTV Cam-04 Frame 902"*).
- **Cryptographic Hashes**: SHA-256 checksum of source material.
- **Derivation Chain**: Step-by-step audit record from raw bytes to graph edge.
- **Epistemic Classification**: Directly Observed vs. Graph Inference.

---

## 6. Canonical Messy Evidence Benchmark

We evaluated the engine against a deterministic benchmark dataset consisting of 10 multi-source facts reflecting real investigative defects:

| Metric | Result | Benchmark Verification |
| :--- | :--- | :--- |
| **Total Facts Evaluated** | 10 | Complete coverage of heterogeneous inputs |
| **Facts Accepted** | 4 | Corroborated backbone facts admitted |
| **Facts Rejected** | 3 | Blocked by gates (Rumor, Inverted Interval, Inverted Direction) |
| **Ambiguous / Conflicting** | 3 | Preserved without premature pruning |
| **Contradictions Isolated** | 1 | Vault vs Subway alibi contradiction cleanly branched |
| **False Edges Prevented** | 3 | 100% of invalid edges blocked from graph |
| **Graph Interpretations** | 2 | Distinct Alpha and Beta causal worlds constructed |
| **Provenance Coverage** | **100.0%** | **Every accepted edge has cryptographic provenance** |

### Defect Handling Case Studies

1. **Fact-05 (Unprovenanced Rumor)**:
   - *Input*: "Anonymous forum post claims suspect was seen near Harbor at 14:00".
   - *Gate Action*: Rejected by `PROVENANCE` gate. Zero edges created.
2. **Fact-07 (Inverted Interval)**:
   - *Input*: "Sensor log indicates event started at 14:30 and ended at 14:15".
   - *Gate Action*: Rejected by `TEMPORAL` gate (`startTime > endTime`).
3. **Fact-08 (Inverted Causal Direction)**:
   - *Input*: "Event at 14:40 caused Event at 14:20".
   - *Gate Action*: Rejected by `RELATIONSHIP_DIRECTION` gate.
4. **Fact-03 vs Fact-04 (Alibi Conflict)**:
   - *Input*: Telemetry places suspect in Vault at 14:22; witness statement places suspect at Subway at 14:23.
   - *Engine Action*: Detected `MUTUALLY_EXCLUSIVE_LOCATION`. Created Interpretation Alpha (Vault) and Interpretation Beta (Subway).

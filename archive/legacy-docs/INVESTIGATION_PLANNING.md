# Phase 5: Investigation Planning Engine

The **Investigation Planning Engine** transforms graph reasoning, structural invariants, and resolution candidates into a deterministic, entropy-reducing action schedule. It answers the fundamental investigative question:

> *"Given everything currently known, what information or evidence would most effectively reduce the remaining possibility space?"*

---

## 1. Core Architecture & Pipeline

```text
Evidence Graph (Version N)
       ↓
Yen's K-Shortest Paths & Entity Hypotheses
       ↓
Possibility Constraint Engine (Prunes INVALID)
       ↓
Surviving Possibility Space (N Hypotheses)
       ↓
Structural Family Clustering & Distinguishing Elements
       ↓
Resolution Reasoning Engine (Candidates R1..Rk)
       ↓
INVESTIGATION PLANNING ENGINE
  ├── 1. Schema Evidence Grounding (Profiles: Cost 1-5, Specificity, Availability)
  ├── 2. Temporal Window Bounds Extraction (Precision: SECOND, MINUTE, HOUR, DAY)
  ├── 3. Multi-Outcome Expected Partitions (CONFIRMED, REFUTED, CONFLICTING)
  ├── 4. Shannon Entropy Reduction: IG = H(before) - E[H(after)]
  ├── 5. Second-Order Plan Graph DAG (Space → Candidates → Actions → Outcomes)
  └── 6. Deterministic Value Ranking & Dependency Inference
       ↓
Deterministic Investigation Plan + Next Immediate Action
```

---

## 2. Mathematical Formalization

### 2.1 Prior Structural Entropy
Under an equal-weight structural assumption across $N$ surviving non-invalid possibilities:
$$H(P) = \log_2(N) \quad (\text{bits})$$
If $N \le 1$, $H(P) = 0$ bits (uncertainty completely resolved).

### 2.2 Multi-Outcome Expected Partition
For an action $A$ targeting candidate distinction $C$:
- **Outcome `CONFIRMED`**: Element is verified present. The surviving possibility set is $P_{\text{pres}}$, eliminating $P_{\text{abs}}$.
  $$p(\text{CONFIRMED}) = \frac{|P_{\text{pres}}|}{N}$$
- **Outcome `REFUTED`**: Element is proven absent. The surviving possibility set is $P_{\text{abs}}$, eliminating $P_{\text{pres}}$.
  $$p(\text{REFUTED}) = \frac{|P_{\text{abs}}|}{N}$$
- **Outcome `CONFLICTING`**: Evidence contradicts existing facts, isolating branches into dispute.

### 2.3 Expected Information Gain
$$\mathbb{E}[H(\text{after})] = p(\text{CONFIRMED}) \cdot H(P_{\text{pres}}) + p(\text{REFUTED}) \cdot H(P_{\text{abs}})$$
$$\text{InformationGain} = \max\left(0,\, H(P) - \mathbb{E}[H(\text{after})]\right) \quad (\text{bits})$$
*Example*: If 4 candidate possibilities are split symmetrically ($2 \text{ vs } 2$), prior entropy is $\log_2(4) = 2.0$ bits, and expected after entropy is $1.0$ bit, yielding an exact $\mathbf{1.0\text{ bit}}$ of information gain.

### 2.4 Composite Investigation Value
$$\text{InvestigationValue} = \frac{(\text{InformationGain} \times 50 + \text{ResolutionUtility} \times 0.5) \times \text{StructuralSpecificity}}{\text{EstimatedCost}}$$
- **Separation of Concerns**:
  - `resolutionUtility` ($0-100$): Breadth across families and corridors.
  - `expectedInformationGain` ($\text{bits}$): Mathematical uncertainty reduction.
  - `evidenceSpecificity` ($0.0-1.0$): Forensic precision of the evidence class.
  - `estimatedCost` ($1-5$): Operational friction / acquisition difficulty.

---

## 3. Evidence Acquisition Profiles

All proposed investigation actions are grounded strictly in the 10 schema evidence classes:

| Evidence Class | Est. Cost | Availability | Temporal Precision | Structural Specificity | Focus / Capability |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **LOG** | 1 | IMMEDIATE | SECOND | 0.95 | System timestamped automated access logs |
| **SYSTEM_RECORD** | 1 | IMMEDIATE | SECOND | 0.90 | OS & service audit records |
| **NETWORK_CAPTURE** | 2 | IMMEDIATE | SECOND | 0.90 | Packet capture, telemetry, flow records |
| **DATABASE_RECORD** | 2 | MODERATE | SECOND | 0.88 | Commit logs, row history |
| **TRANSACTION_RECORD**| 2 | MODERATE | MINUTE | 0.85 | Financial ledger, transfer receipts |
| **CCTV** | 3 | MODERATE | SECOND | 0.85 | Surveillance video with camera clock |
| **PHONE_RECORD** | 3 | RESTRICTED | SECOND | 0.80 | Telco CDR, cell tower records |
| **DOCUMENT** | 2 | MODERATE | DAY | 0.75 | Signed manifests, paper filings |
| **IMAGE** | 2 | MODERATE | MINUTE | 0.75 | Photos with EXIF metadata |
| **INTERVIEW** | 4 | DELAYED | HOUR | 0.60 | Witness depositions, statements |

---

## 4. Second-Order Plan Graph

The system generates a distinct second-order plan graph representing the causal structure of investigative discovery:
- **Node Types**:
  - `POSSIBILITY_SPACE`: Current state of hypotheses ($N$ surviving branches).
  - `ACTION`: Prioritized investigative step (`ACT-1`, `ACT-2`, etc.).
  - `OUTCOME`: Deterministic branch state (`CONFIRMED`, `REFUTED`).
- **Edge Types**:
  - `TRIGGERS`: Possibility space activates an action ($H(P)$ reduction).
  - `PARTITIONS`: Action branches into outcomes with probability $p$.
  - `DEPENDS_ON`: Action requires antecedent entity verification.

---

## 5. Agent Deterministic Query Routing

The Investigation Agent deterministically answers planning questions without hallucination:
- *"What should I investigate next?"* $\rightarrow$ `NEXT_INVESTIGATION_ACTION`
  - Returns highest-ranked action with satisfied dependencies, temporal window, evidence profile, and expected partition.
- *"Which evidence would reduce uncertainty the most?"* $\rightarrow$ `MAX_INFORMATION_GAIN_INQUIRY`
  - Ranks actions strictly by Shannon Information Gain in bits.
- *"Show the investigation plan"* $\rightarrow$ `INVESTIGATION_PLAN_SUMMARY`
  - Summarizes total actions, immediate next step, entropy, and plan graph topology.

---

## 6. Verification & Test Baseline

- **Phase 5 Test Suite**: [`backend/src/tests/investigation-planning.test.ts`](file:///home/zius/Projects/Graphical-Investigation-system/backend/src/tests/investigation-planning.test.ts) (24/24 passing).
- **Total Backend Tests**: **130/130 passing** across 9 test suites in 4.1s.
- **Frontend Production Build**: Clean `vite build` completed in 1.75s.

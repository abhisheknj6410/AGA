# Real-World Crime Scenario: End-to-End Investigation Workflow

This test guide walks through an end-to-end investigation of a real-world corporate sabotage and data exfiltration crime using the **Graphical Investigation System (GIS)**.

---

## Scenario Overview: "Operation Shadow Ledger"

- **Case Name**: `Operation Shadow Ledger: Vault B-04 Exfiltration`
- **Incident Summary**: On October 14, 2026, an air-gapped workstation inside Secure Vault B-04 was accessed out-of-hours. Proprietary ledger data (`financial_export_2026.csv`) was exfiltrated to an unauthorized external flash drive (`Drive-X`). The primary corridor camera feed was briefly looped.
- **Suspects**:
  1. **Rahul Kumar** — Contractor Systems Administrator. Badge swipe recorded at Corridor B; credential `rkumar-adm` used.
  2. **Vikram Rao** — Lead Architect with legitimate elevated access. Claimed remote access from home.
  3. **Elena Vance** — Visiting Security Auditor. Disputed physical whereabouts during the anomaly.

---

## Step-by-Step Test Workflow

### Step 1: Start the System

Run the unified startup script from the repository root:

```bash
node scripts/start-all.js
```
- **Backend API**: `http://localhost:4000` (Healthcheck: `http://localhost:4000/health`)
- **Web Interface**: `http://localhost:3000`

---

### Step 2: Create the Investigation Case

1. Open your browser to `http://localhost:3000`.
2. In the top navigation bar, ensure you are connected (green dot indicator).
3. If creating a new case, click the case dropdown and create:
   - **Name**: `Operation Shadow Ledger`
   - **Description**: `Unsanctioned access to Vault B-04 and exfiltration of financial_export_2026.csv`

---

### Step 3: Ingest Raw Evidence Narrative via Evidence Agent (Eve AI)

1. Click on the **Evidence Agent** tab.
2. Under **Incident Narrative & Raw Logs**, paste the following raw forensic dispatch:

```text
At 2026-10-14 22:45:00, Rahul Kumar entered the secure corridor leading to Vault B-04.
Building B Cafeteria CCTV observed Rahul Kumar in corridor adjacent to Vault B-04 at 2026-10-14 22:47:15.
Terminal Alpha was accessed under credential rkumar-adm at 2026-10-14 22:50:30.
financial_export_2026.csv was transferred to external Drive-X at 2026-10-14 22:58:10.
```

3. Click **Extract Candidate Facts**.
4. **Verification Points in Preview Diff**:
   - **Evidence Item**: 1 raw forensic dispatch node created with source type `FORENSIC_DISPATCH`.
   - **Extracted Entities (6-7)**:
     - `Rahul Kumar` (`PERSON`)
     - `secure corridor` (`LOCATION`)
     - `Terminal Alpha` (`DEVICE`)
     - `rkumar-adm` (`ACCOUNT`)
     - `financial_export_2026.csv` (`FILE`)
     - `Drive-X` (`DEVICE`)
     - `Building B Cafeteria CCTV` (`DEVICE`)
   - **Chronological Events (4)** with exact timestamps:
     - `2026-10-14T22:45:00.000Z` — `LOCATION_CHANGE` (`Rahul Kumar enters secure corridor`)
     - `2026-10-14T22:47:15.000Z` — `COMMUNICATION` (`Building B Cafeteria CCTV sightings`)
     - `2026-10-14T22:50:30.000Z` — `LOGIN` (`Terminal Alpha accessed under rkumar-adm`)
     - `2026-10-14T22:58:10.000Z` — `TRANSFER` (`financial_export_2026.csv transferred to Drive-X`)
   - **Provenanced Edges (8)**: Each relationship links entities to events, and carries valid references to the primary evidence node.
5. Click **Commit to Graph**.
   - Notice the green confirmation alert: `"Successfully committed facts to graph"`.

---

### Step 4: Explore the Graph Canvas

1. Click on the **Graph Canvas** tab.
2. **Visual Inspection**:
   - Entities render with distinct colored glyphs (People = Blue, Devices = Purple, Files = Amber, Locations = Emerald).
   - Event nodes show ordered flow badges.
   - Click on any edge to inspect its **Confidence Score**, **Relationship Type**, and **Evidence Provenance Backlinks** in the right-side detail drawer.
3. Test interactive graph controls:
   - **Layout switch**: Toggle between `Dagre Hierarchical (DAG)` and `Cose Force-Directed`.
   - **Filtering**: Filter graph view by Category (`ENTITY`, `EVENT`, `EVIDENCE`).

---

### Step 5: Run Graph Algorithms

1. Click on the **Algorithms** tab.
2. Run each algorithm to compute forensic conclusions:
   - **Dijkstra Shortest Path**:
     - *Source*: `Rahul Kumar`
     - *Target*: `Drive-X`
     - *Result*: Traces the exact causal chain: `Rahul Kumar -> enters corridor -> accesses Terminal Alpha -> transfers financial_export_2026.csv -> Drive-X`.
   - **Yen's K-Shortest Paths (k=3)**:
     - Discovers alternative routes through Vikram Rao vs Rahul Kumar credentials.
   - **Lengauer-Tarjan Dominator Tree**:
     - Identifies **Critical Bottlenecks** / **Chokepoints**: Workstation `Terminal Alpha` strictly dominates access to `financial_export_2026.csv`.
   - **Edmonds-Karp Min-Cut**:
     - Calculates minimal isolation barrier needed to prevent further exfiltration.
   - **Temporal Reachability Algorithm**:
     - Validates causality direction; prunes impossible backward time travel trajectories.

---

### Step 6: Entity Resolution

1. Click on the **Entity Resolution** tab.
2. The engine analyzes identifiers, email patterns, usernames, and behavioral overlaps.
3. Observe suggested cluster:
   - `Rahul Kumar` ↔ `rkumar-adm` (Confidence: 0.92 based on string distance and credential naming conventions).
4. Click **Merge Entities** or **Link with Alias** to consolidate graph identity.

---

### Step 7: Multi-Hypothesis Reasoning & Audit Log

1. Click on the **Hypotheses & Possibilities** tab.
2. Click **Run Possibility Engine**:
   - **Branch Alpha (Primary)**: Insider physical access by Rahul Kumar (Likelihood calculated via Bayes/Dempster-Shafer & Shannon entropy).
   - **Branch Beta (Alternative)**: Credential theft / remote relay via compromised terminal.
3. View **Audit Log**:
   - Open the **Audit & Chain of Custody** viewer.
   - Verify every graph mutation (Add, Update, Merge, Import) has a cryptographically hashed, immutable log record with timestamp, user ID, and reason.

---

## Automated Verification Script

To execute this exact crime workflow automatically against the backend API via script:

```bash
node -e '
async function testWorkflow() {
  const base = "http://localhost:4000/api";
  
  // 1. Create Case
  const caseRes = await fetch(`${base}/cases`, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({ name: "Auto-Test Crime Case", description: "Automated real-world crime workflow" })
  }).then(r => r.json());
  const caseId = caseRes.id;
  console.log("✓ Created Case:", caseId);

  // 2. Extract Facts via Eve AI
  const text = "At 2026-10-14 22:45:00, Rahul Kumar entered the secure corridor. Terminal Alpha was accessed under credential rkumar-adm at 2026-10-14 22:50:30. financial_export_2026.csv was transferred to external Drive-X at 2026-10-14 22:58:10.";
  const ext = await fetch(`${base}/cases/${caseId}/ai/extract`, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({ text, sourceName: "Auto Test Dispatch" })
  }).then(r => r.json());
  console.log(`✓ Extracted: ${ext.candidates.nodes.length} entities, ${ext.candidates.events.length} events, ${ext.candidates.edges.length} edges`);

  // 3. Commit Facts to Graph
  const imp = await fetch(`${base}/cases/${caseId}/import/json`, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({
      nodes: c.nodes,
      events: c.events,
      evidence: c.evidence,
      edges: c.edges
    })
  }).then(r => r.json());
  console.log(`✓ 3. Committed to Graph: ${imp.success ? "SUCCESS" : "FAILED"}`);
  console.log("   Imported counts:", imp.imported);

  // 4. Run Possibility Engine
  const poss = await fetch(`${base}/cases/${caseId}/possibilities/generate`, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({})
  }).then(r => r.json());
  const branchCount = Array.isArray(poss) ? poss.length : (poss.possibilities?.length || poss.count || 0);
  console.log(`✓ 4. Possibility Engine Executed: generated ${branchCount} possibility branches`);

  // 5. Query Graph
  const graph = await fetch(`${base}/cases/${caseId}/graph`).then(r => r.json());
  console.log(`✓ 5. Final Case Graph: ${graph.nodes.length} nodes, ${graph.edges.length} edges`);
}
testWorkflow().catch(console.error);
'
```

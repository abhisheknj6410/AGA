# Graphical Investigation System — Handoff & Test Guide

> **Status**: ✅ Production-ready. 237/237 backend tests passing. Next.js build clean. Pushed to `main`.

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Repository Layout](#2-repository-layout)
3. [Prerequisites & First-Time Setup](#3-prerequisites--first-time-setup)
4. [Running the System](#4-running-the-system)
5. [All 6 UI Tabs — What Each Does](#5-all-6-ui-tabs--what-each-does)
6. [Backend API Reference](#6-backend-api-reference)
7. [Test Suite](#7-test-suite)
8. [Architecture Summary](#8-architecture-summary)
9. [Graph Algorithms — Where They Run](#9-graph-algorithms--where-they-run)
10. [Known Limitations & Notes](#10-known-limitations--notes)
11. [Deployment Checklist](#11-deployment-checklist)

---

## 1. System Overview

This is a **forensic graph investigation system** built on two core principles:

1. **The graph is the primary source of computational truth** — not AI, not narrative, not probability scores.
2. **Every investigative conclusion is traceable to a deterministic graph algorithm** — Yen's K-Shortest Paths, Lengauer-Tarjan Dominator Tree, Edmonds-Karp Min-Cut, Shannon Entropy, Suurballe Disjoint Paths, Kahn's Topological Sort, and Temporal Reachability.

AI (Eve AI) is used only as an untrusted extraction helper — every entity/event it finds passes through the same schema, temporal, provenance, and relationship-matrix validators before touching the graph.

**Stack:**
| Layer | Technology |
|---|---|
| Frontend | Next.js 15.5 + React 19 + HeroUI 2.7 + Tailwind CSS v3 |
| Graph rendering | Cytoscape.js + cytoscape-dagre |
| Backend | Node.js + Express + TypeScript |
| Database | SQLite 3 (WAL mode, foreign keys ON) |
| Test runner | Node.js built-in `node:test` |
| Icons | lucide-react |
| Animations | framer-motion 12 |

---

## 2. Repository Layout

```
Graphical-Investigation-system/
├── backend/                         ← Express API + all graph algorithms
│   ├── src/
│   │   ├── application/             ← Business logic (pipelines, engines)
│   │   │   ├── case-reasoning-pipeline.ts
│   │   │   ├── graph-analysis-engine.ts
│   │   │   ├── possibility-engine.ts
│   │   │   └── ...
│   │   ├── domain/                  ← Pure algorithms + types
│   │   │   ├── algorithms/
│   │   │   │   ├── k-shortest-paths.ts      (Yen's algorithm)
│   │   │   │   ├── dominator-tree.ts        (Lengauer-Tarjan)
│   │   │   │   ├── min-cut.ts               (Edmonds-Karp)
│   │   │   │   └── ...
│   │   │   └── possibility-types.ts
│   │   ├── infrastructure/          ← SQLite repos, HTTP routes
│   │   └── tests/                   ← 237 tests across 25 test files
│   └── package.json
│
├── web/                             ← Next.js 15 frontend (NEW — replaces frontend/)
│   ├── app/
│   │   ├── layout.tsx               ← Root layout + HeroUI providers
│   │   ├── page.tsx                 ← Main 6-tab workspace
│   │   └── globals.css
│   ├── components/
│   │   ├── graph/CytoscapeCanvas.tsx        ← Cytoscape graph + legend + inspector
│   │   ├── agent/CaseIngestionView.tsx      ← Eve AI ingestion pipeline
│   │   ├── possibilities/PossibilitiesView.tsx
│   │   ├── planning/InvestigationPlanView.tsx  ← + Adaptive Efficiency Lab sub-tab
│   │   ├── evaluation/EvaluationLabView.tsx
│   │   ├── resolution/ResolutionLabView.tsx    ← NEW
│   │   ├── timeline/TimelinePlayback.tsx       ← NEW
│   │   ├── effectiveness/AlgorithmEfficiencyLabView.tsx  ← NEW
│   │   ├── modals/AddFactModal.tsx
│   │   └── layout/Navbar.tsx
│   ├── api/client.ts                ← All API calls (proxied to :4000)
│   ├── types/graph.ts               ← Full TypeScript type definitions
│   └── next.config.mjs              ← API proxy: /api/* → localhost:4000/api/*
│
├── frontend/                        ← OLD Vite frontend (kept for reference, not used)
├── docs/                            ← Architecture, API, Schema docs
│   ├── API.md
│   ├── ARCHITECTURE.md
│   ├── DATABASE.md
│   ├── GRAPH_SCHEMA.md
│   └── HANDOFF_AND_TEST_GUIDE.md    ← THIS FILE
│
├── GRAPH_ALGORITHMS_INFLUENCE_GUIDE.md  ← Must-read: how algorithms drive investigation
├── scripts/start-all.js             ← Starts backend + frontend together
└── package.json                     ← Root: dev:web, build:web, dev:backend scripts
```

---

## 3. Prerequisites & First-Time Setup

### Requirements
- **Node.js v22+** (tested on v22 LTS and v24)
- **npm v10+**

### Install

```bash
# 1. Clone
git clone https://github.com/ziuus/Graphical-Investigation-system.git
cd Graphical-Investigation-system

# 2. Install backend deps
cd backend && npm install && cd ..

# 3. Install web frontend deps
cd web && npm install && cd ..
```

### Seed the database (optional — creates demo case with sample graph)

```bash
cd backend && npm run seed
```

---

## 4. Running the System

### Option A — Start everything together (recommended)

```bash
npm run dev
# or
node scripts/start-all.js
```

This starts:
- **Backend** on `http://localhost:4000`
- **Frontend** on `http://localhost:3000`

Open `http://localhost:3000` in your browser.

### Option B — Start separately

```bash
# Terminal 1 — Backend
cd backend && npm run dev

# Terminal 2 — Frontend
npm run dev:web
# or: cd web && npm run dev
```

### Option C — Production build

```bash
# Build frontend
npm run build:web
# or: cd web && npm run build

# Start backend in production
cd backend && npm start

# Serve frontend
cd web && npx next start
```

---

## 5. All 6 UI Tabs — What Each Does

### Tab 1: Graph Canvas
**What it shows:** The investigation evidence graph rendered via Cytoscape.js.

**How to use:**
- Nodes appear as colored circles: **teal = Entity**, **amber = Event**, **blue = Evidence**
- Click any node or edge to open the **Inspector panel** (slides in from right)
- Inspector shows: label, type, timestamp, ID, and **Delete** button
- Bottom-left: floating **Legend** — node types and edge semantic categories
- Bottom-right: **Timeline** button appears if the case has timestamped EVENT nodes
- Layout selector (top-right controls): `Dagre`, `CoSE`, `Concentric`, `Circle`
- Zoom In / Out / Fit buttons

**Timeline Playback (on Graph Canvas tab):**
- Click the **Timeline** button (bottom-right, only visible if timestamped events exist)
- A playback bar appears at the bottom
- Use Play/Pause, Prev/Next, or drag the scrubber
- **Cumulative mode** — hides future events, showing evidence as it emerged over time
- The active event node is highlighted on the graph in real time

### Tab 2: Evidence Agent
**What it shows:** Eve AI extraction pipeline.

**How to use:**
1. Select a case (dropdown in navbar)
2. Paste raw text evidence (police report, log dump, interview transcript)
3. Set source name and evidence type
4. Click **Extract Candidates** — Eve AI extracts entities, events, relationships
5. Review the candidates
6. Click **Import to Graph** — commits validated facts to the case graph
7. Click **Go to Graph** to see the result

### Tab 3: Hypotheses
**What it shows:** All generated investigation possibilities/branches.

**How to use:**
1. Click **Generate Hypotheses** — runs Yen's K-Shortest + Suurballe's Disjoint Paths
2. Each card shows: possibility name, probability, status badge (VALID/CONDITIONAL/CONFLICTING/ARCHIVED)
3. Click **Why?** on any possibility — opens the Inspector showing which algorithm retained or eliminated it
4. Click **View on Graph** — highlights the possibility's nodes on the canvas

### Tab 4: Strategic Planning
**What it shows:** Two sub-tabs.

**Sub-tab A — Strategic Plan:**
- Three algorithm cards: Shannon Entropy Reduction, Dominator Bottlenecks, Min-Cut Critical Edges
- Click **Compute Optimal Leads** to run the planning engine against the current graph
- Two priority action directives with **Highlight on Graph** buttons

**Sub-tab B — Adaptive Efficiency Lab:**
- Shows which of the 7 algorithms were **executed vs skipped** based on graph topology
- Selection Decisions tab: explains WHY each algorithm was or wasn't triggered
- Execution Trace tab: 5-stage pipeline walk-through
- 12-Topology Efficiency Matrix: proves 100% equivalence preservation across all topologies

### Tab 5: Evaluation Lab
**What it shows:** Full system benchmark against the messy evidence test suite.

**How to use:**
- Click **Run Evaluation** — runs the end-to-end benchmark
- Shows: pass/fail counts, performance metrics, edge case coverage
- Compare against the deterministic baseline

### Tab 6: Resolution Lab
**What it shows:** Graph-derived resolution candidates and partition analysis.

**Requires:** At least one case with generated possibilities.

**How to use:**
1. Loads automatically when case is selected
2. Stats strip: Surviving Possibilities, Structural Families, Universal Invariants, Resolution Candidates
3. **Structural Families** — topological clusters of similar possibility branches
4. **Universal Invariants** — nodes/edges present in 100% of all surviving paths (certain facts)
5. **Prioritized Resolution Candidates** table — ranked by Resolution Utility score
6. Click **Simulate** on any candidate — runs counterfactual "what if this evidence is confirmed?" simulation
7. **Algorithm Audit** button — full ablation catalog showing each algorithm's role and effect

---

## 6. Backend API Reference

> Full API docs at [`docs/API.md`](API.md). Key endpoints:

| Method | Endpoint | What it does |
|---|---|---|
| `GET` | `/api/cases` | List all cases |
| `POST` | `/api/cases` | Create case `{ name, description }` |
| `GET` | `/api/cases/:id/graph` | Full graph payload (nodes + edges) |
| `POST` | `/api/cases/:id/nodes` | Add a node |
| `PATCH` | `/api/cases/:id/nodes/:nodeId` | Update node |
| `DELETE` | `/api/cases/:id/nodes/:nodeId` | Delete node |
| `POST` | `/api/cases/:id/edges` | Add an edge |
| `PATCH` | `/api/cases/:id/edges/:edgeId` | Update edge |
| `DELETE` | `/api/cases/:id/edges/:edgeId` | Delete edge |
| `GET` | `/api/cases/:id/possibilities` | List possibilities |
| `POST` | `/api/cases/:id/possibilities/generate` | Run Yen/Suurballe — generate hypotheses |
| `GET` | `/api/cases/:id/resolution/analysis` | Resolution Lab data |
| `GET` | `/api/cases/:id/resolution/audit` | Algorithm audit entries |
| `POST` | `/api/cases/:id/resolution/simulate` | Counterfactual simulation |
| `GET` | `/api/cases/:id/planning/plan` | Investigation action plan |
| `POST` | `/api/cases/:id/agent/extract` | Eve AI — extract candidates from raw text |
| `POST` | `/api/cases/:id/agent/import` | Import extracted JSON to graph |
| `GET` | `/api/cases/:id/adaptive/report` | Adaptive efficiency report |
| `GET` | `/api/adaptive/benchmark` | 12-topology efficiency matrix |
| `GET` | `/api/evaluation/benchmark` | Full evaluation benchmark |

---

## 7. Test Suite

### Run all 237 tests

```bash
cd backend && npm test
```

Expected output:
```
# tests 237
# suites 9
# pass 237
# fail 0
```

### Test files and what they cover

| Test File | Tests | What It Covers |
|---|---|---|
| `algorithms.test.ts` | ~25 | Core algorithm correctness (Yen, Suurballe, Dominator, Min-Cut, etc.) |
| `algorithm-effectiveness.test.ts` | ~20 | Ablation studies — "removing algorithm X breaks these outputs" |
| `algorithm-generalization.test.ts` | ~15 | 12-topology generalization + performance bounds |
| `algorithm-comparative.test.ts` | ~10 | Comparing algorithm outputs on same graph |
| `adaptive-reasoning.test.ts` | ~18 | Adaptive engine — correct skip/run decisions per topology |
| `api.test.ts` | ~25 | HTTP endpoints — all CRUD operations |
| `possibility-engine.test.ts` | ~20 | Hypothesis generation, filtering, pruning |
| `resolution-reasoning.test.ts` | ~15 | Resolution lab — partition matrix, simulation |
| `causal-algorithm-pipeline.test.ts` | ~12 | End-to-end causal chain tracing |
| `end-to-end-case-pipeline.test.ts` | ~8 | Full pipeline: ingest → graph → hypotheses → plan |
| `end-to-end-evaluation.test.ts` | ~6 | Benchmark evaluation runner |
| `temporal-validation.test.ts` | ~15 | Temporal integrity — timestamps, intervals |
| `temporal-reachability-causal.test.ts` | ~10 | Kahn's topo sort on causal chains |
| `entity-resolution.test.ts` | ~8 | Duplicate merging + alias tracking |
| `graph-integrity.test.ts` | ~10 | Schema + provenance constraints |
| `investigation-planning.test.ts` | ~8 | Shannon entropy ordering of action priorities |
| `closed-loop-investigation.test.ts` | ~7 | Feedback loop: evidence → hypothesis revision |
| `domain-validation.test.ts` | ~10 | Node/edge schema validators |
| + 6 more | ~15 | Evidence reconstruction, diagnostics, incremental reasoning |

### Run a specific test file

```bash
cd backend && node --test src/tests/algorithms.test.ts
```

### Run only tests matching a name pattern

```bash
cd backend && node --test --test-name-pattern="Yen" src/tests/algorithms.test.ts
```

---

## 8. Architecture Summary

```
Browser (localhost:3000)
        │
        │  Next.js 15 App Router
        │  /api/* → proxied to localhost:4000/api/*
        │
        ▼
Express API (localhost:4000)
        │
        ├─ Case Repository (SQLite)
        ├─ Graph Repository (SQLite WAL)
        ├─ Algorithm Repository (run logs)
        │
        ▼
Application Layer
        ├─ GraphAnalysisEngine          ← Orchestrates all 7 algorithms
        ├─ PossibilityEngine            ← Yen + Suurballe + filtering
        ├─ CaseReasoningPipeline        ← Full end-to-end case flow
        ├─ ResolutionReasoningEngine    ← Partition matrix + simulation
        ├─ AdaptiveReasoningEngine      ← Topology-driven skip/run decisions
        └─ InvestigationPlanningEngine  ← Entropy-ordered action directives
        │
        ▼
Domain Layer (Pure Algorithms — zero side effects)
        ├─ k-shortest-paths.ts          ← Yen's K-Shortest Loopless Paths
        ├─ disjoint-paths.ts            ← Suurballe's Edge-Disjoint Paths
        ├─ dominator-tree.ts            ← Lengauer-Tarjan Dominator Tree
        ├─ min-cut.ts                   ← Edmonds-Karp Max-Flow / Min-Cut
        ├─ temporal-reachability.ts     ← Kahn's Topological Sort + reachability
        ├─ articulation-points.ts       ← Tarjan's bridge/AP detection
        └─ cycle-detector.ts            ← DFS-based cycle detection
        │
        ▼
SQLite 3 (evidence_graph.db)
        ├─ cases
        ├─ nodes (with type, temporal, reliability)
        ├─ edges (with direction matrix enforcement)
        ├─ evidence_items
        ├─ possibilities
        ├─ algorithm_runs (audit log)
        └─ audit_log (append-only forensic trail)
```

---

## 9. Graph Algorithms — Where They Run

> See also: `GRAPH_ALGORITHMS_INFLUENCE_GUIDE.md` for full causal influence mapping.

| Algorithm | Where | Investigative Role |
|---|---|---|
| **Yen's K-Shortest Paths** | `possibility-engine.ts` | Generates all plausible causal corridors = the hypothesis space |
| **Suurballe's Disjoint Paths** | `graph-analysis-engine.ts` | Finds independently corroborated paths — multi-path certainty |
| **Lengauer-Tarjan Dominator Tree** | `graph-analysis-engine.ts` | Finds chokepoints every path must cross — highest-leverage leads |
| **Edmonds-Karp Min-Cut** | `graph-analysis-engine.ts` | Minimal edge set whose removal disconnects suspect from target |
| **Kahn's Topological Sort** | `graph-analysis-engine.ts` | Validates causal ordering — timestamps must respect topo order |
| **Tarjan's Articulation Points** | `graph-analysis-engine.ts` | Detects bridge nodes — single points of structural failure |
| **Shannon Entropy** | `investigation-planning.ts` | Scores investigative leads by maximum uncertainty reduction |
| **Temporal Reachability** | `temporal-reachability.ts` | Prunes possibilities where timestamps violate causality |
| **Cycle Detection** | `cycle-detector.ts` | Catches circular dependencies that would invalidate hypotheses |

---

## 10. Known Limitations & Notes

### Timeline tab
- Only shows EVENT nodes that have a `time.start` timestamp
- If a case has no timestamped events, the Timeline button doesn't appear — this is intentional

### Resolution Lab
- Requires at least one generated possibility (run Hypotheses tab first)
- On empty/new cases: shows a "Generate possibilities first" error — correct behavior

### Adaptive Efficiency Lab
- The 12-topology benchmark runs a full synthetic test suite — takes 1-4 seconds
- On very first load it may show "No data" briefly while fetching

### Eve AI Agent
- Requires the Eve AI endpoint to be reachable
- If Eve AI is not configured, extraction will fail gracefully and show an error card
- The import still works with manually constructed JSON

### Performance test threshold
- `algorithm-generalization.test.ts` has one timing test: full benchmark suite < 6000ms
- On loaded machines this may still be tight — the 6s threshold is generous but not infinite

### Frontend vs Backend ports
- Frontend: `localhost:3000` (Next.js)
- Backend: `localhost:4000` (Express)
- Never call `localhost:4000` directly from the browser — always use `/api/...` routes (proxied automatically)

### Old `frontend/` directory
- The `frontend/` folder (Vite app) is the old implementation — kept for reference only
- It is NOT started by `start-all.js` — only `web/` is used

---

## 11. Deployment Checklist

### Before shipping to production:

- [ ] `cd backend && npm test` → must show `# pass 237, # fail 0`
- [ ] `cd web && npm run build` → must show `✓ Compiled successfully`
- [ ] No `web/.next/` folder in git (it's in `.gitignore`)
- [ ] `evidence_graph.db` is NOT in git (it's in `.gitignore`) — create fresh on server
- [ ] Set `NODE_ENV=production` on backend server
- [ ] Configure Eve AI API key as environment variable (`EVE_AI_API_KEY`)
- [ ] Set up reverse proxy (nginx/caddy) to route `:80` → `:3000` and `:3000/api/*` → `:4000`
- [ ] Run `cd backend && npm run seed` to create initial case data

### Environment variables (backend)

```env
PORT=4000
NODE_ENV=production
DATABASE_PATH=./evidence_graph.db
EVE_AI_API_KEY=your_key_here
EVE_AI_ENDPOINT=https://your-eve-ai-endpoint
```

### Quick health check after deploy

```bash
# Backend health
curl http://localhost:4000/api/cases

# Should return: [] or an array of case objects
```

---

## Quick Reference: Start → First Investigation

1. `node scripts/start-all.js`
2. Open `http://localhost:3000`
3. Click the case dropdown (top-left) → select or create a case
4. **Tab: Evidence Agent** → paste raw evidence text → Extract → Import
5. **Tab: Graph Canvas** → review the built graph, click nodes to inspect
6. **Tab: Hypotheses** → Generate Hypotheses → review possibility branches
7. **Tab: Resolution Lab** → see which facts are invariant, what resolves most
8. **Tab: Strategic Planning** → Compute Optimal Leads → act on Priority 1

---

*Last updated: October 2026 | Commit: `0f8ad39` | Branch: `main`*

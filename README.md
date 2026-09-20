# Evidence-Constrained Graph Investigation System (Phase 1)

A production-ready **Heterogeneous Directed Provenance Graph System** for high-integrity cyber forensic and data-backed investigations.

This system treats the **graph as the primary source of computational truth**. Every fact is traceable to raw evidence, distinguishing observed facts from derived graph assertions and hypothetical scenarios. Events are first-class nodes with exact temporal intervals, designed directly to power downstream graph algorithms (Dijkstra, K-shortest paths, articulation points, min-cut/max-flow, dominator trees, Steiner subgraphs, temporal path analysis, and pattern matching).

---

## Key Features

- **Events as First-Class Nodes**: Logins, process executions, and file transfers are discrete graph vertices with start/end timestamps, temporal precision (`SECOND`, `MINUTE`, `HOUR`, `DAY`, `UNKNOWN`), and reliability metrics.
- **Strict Controlled Relationship Vocabulary**: Enforces a strict direction matrix (e.g. `PERSON -> PERFORMED -> LOGIN` is valid; `LOGIN -> PERFORMED -> PERSON` is strictly rejected).
- **Forensic Provenance Trail**: Observed relationships must link to supporting evidence objects. Investigators can click any edge or node to immediately inspect primary evidence sources.
- **Evidence Contradiction Detection**: Explicitly tracks conflicting evidence items (e.g. CCTV camera recording showing suspect in cafeteria while a login session is logged simultaneously).
- **Safe Entity Resolution**: Multi-tier duplicate identity matching (`EXACT_MATCH`, `CONFIRMED_MATCH`, `POSSIBLE_MATCH`, `NO_MATCH`). Possible matches are held for human investigator review and can be merged with automatic edge rewiring and alias tracking.
- **Interactive Graph Explorer**: Built with Cytoscape.js, featuring Dagre hierarchical and CoSE layouts, multi-facet filtering (Entity, Event, Evidence, Status, Temporal time-window), neighborhood 1-hop focus, and global search.
- **Structured JSON & CSV Import**: Atomic import pipeline with dry-run pre-validation preventing graph corruption.
- **Append-Only Audit Trail**: Full forensic accountability recording who made every mutation, when, the old and new state, and the stated justification.

---

## Getting Started

### Prerequisites
- Node.js v22+ (tested on Node v24 LTS)
- npm v10+

### 1. Install & Build
```bash
# In backend
cd backend
npm install
npm run build

# In frontend
cd ../frontend
npm install
npm run build
```

### 2. Run Automated Test Suite
```bash
npm --prefix backend test
```
*All 26 automated tests verify schema validation, temporal intervals, graph integrity, entity resolution, and API CRUD.*

### 3. Launch Application
```bash
# Terminal 1: Backend API (Port 4000)
npm --prefix backend run dev

# Terminal 2: Frontend Explorer (Port 5173)
npm --prefix frontend run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## Seed Case: Unauthorized Database Access

The database automatically initializes with a synthetic demonstration case:
- **Entities**: 3 persons (Rahul Kumar, Priya Sharma, Alex Chen), 3 accounts (`rkumar-adm`, `psharma-dev`, `svc-dbbackup`), 4 devices (`Laptop-RK-01`, `Workstation-Dev-04`, `Bastion-Host-01`, `Unknown-External-Mac`), 2 servers (`Prod-DB-01`, `Backup-Storage-02`), 2 IP addresses, 3 files, 1 organization.
- **First-Class Events**: SSH Login (14:15 UTC), pg_dump process execution (14:20 UTC), SQL dump file access (14:22 UTC), Encrypted SCP transfer (14:25 UTC), and session logout (14:31 UTC).
- **Primary Evidence**: Auth logs, PCAP perimeter packet captures, Linux auditd logs, Cafeteria CCTV footage, and witness interview transcript.
- **Contradiction**: CCTV footage shows Rahul Kumar in cafeteria at 14:15 UTC, contradicting the interview statement and establishing remote compromise / credential spoofing.
- **Duplicate Identity**: "R. Kumar" candidate staged in the Entity Resolution reviewer.

---

## Documentation

- [GRAPH_SCHEMA.md](docs/GRAPH_SCHEMA.md): Complete vocabulary tables, direction matrix, schemas, and future algorithm compatibility.
- [ARCHITECTURE.md](docs/ARCHITECTURE.md): Data pipeline, AI boundary, and entity resolution design.
- [API.md](docs/API.md): Full REST API endpoint reference.
- [DATABASE.md](docs/DATABASE.md): Relational tables, constraints, foreign keys, and indexes.
- [CONTRIBUTING.md](docs/CONTRIBUTING.md): Code guidelines and developer instructions.

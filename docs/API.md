# REST API Documentation

Base URL: `http://localhost:4000/api`

---

## 1. Case Management

### `POST /cases`
Creates a new investigation case.
- **Request Body**:
  ```json
  {
    "name": "Unauthorized Database Access",
    "description": "Production database incident",
    "who": "lead-investigator"
  }
  ```
- **Response (201 Created)**: Returns the `Case` object.

### `GET /cases`
Lists all cases ordered by creation timestamp.

### `GET /cases/:id`
Retrieves a single case by UUID.

### `PATCH /cases/:id`
Updates case metadata (`name`, `description`, `status`).

### `DELETE /cases/:id`
Cascades and removes all graph nodes, edges, evidence, and audit logs for the case.

---

## 2. Node & Evidence Endpoints

### `POST /cases/:caseId/nodes`
Creates an Entity, Event, or Evidence node.
- **Entity Example Body**:
  ```json
  {
    "category": "ENTITY",
    "type": "PERSON",
    "label": "Rahul Kumar",
    "properties": { "role": "DBA", "employeeId": "EMP-1092" }
  }
  ```
- **Event Example Body**:
  ```json
  {
    "category": "EVENT",
    "type": "LOGIN",
    "label": "SSH Interactive Session",
    "time": {
      "start": "2026-09-10T14:15:00Z",
      "end": "2026-09-10T14:31:00Z",
      "precision": "SECOND"
    },
    "properties": { "port": 22 }
  }
  ```
- **Evidence Example Body**:
  ```json
  {
    "category": "EVIDENCE",
    "type": "LOG",
    "label": "Prod-DB Auth Log",
    "source": { "name": "/var/log/auth.log", "kind": "SYSTEM" },
    "reliability": 0.98,
    "hashChecksum": "7f83b1657ff1fc53b92dc..."
  }
  ```
- **Response (201 Created)**: Returns created node object.

### `GET /cases/:caseId/nodes`
Lists all nodes in the case. Optional filter: `?category=ENTITY|EVENT|EVIDENCE`.

### `GET /cases/:caseId/nodes/:nodeId`
Retrieves a specific node.

### `PATCH /cases/:caseId/nodes/:nodeId`
Updates node properties or labels.

### `DELETE /cases/:caseId/nodes/:nodeId`
Deletes a node and any connected edges.

---

## 3. Relationship (Edge) Endpoints

### `POST /cases/:caseId/edges`
Creates a directed relationship between two nodes in the same case.
- **Request Body**:
  ```json
  {
    "source": "ent-person-rahul",
    "target": "event-login-01",
    "type": "PERFORMED",
    "status": "OBSERVED",
    "cost": 1.0,
    "evidenceRefs": ["ev-auth-001"]
  }
  ```
- **Validation**: Enforces controlled vocabulary direction and provenance for `OBSERVED` status.
- **Response (201 Created)**: Returns created edge.

### `GET /cases/:caseId/edges`
Lists all relationships in the case.

### `DELETE /cases/:caseId/edges/:edgeId`
Deletes a relationship.

---

## 4. Graph & Integrity

### `GET /cases/:caseId/graph`
Returns the complete visualization-ready payload:
```json
{
  "nodes": [ ... ],
  "edges": [ ... ],
  "metadata": {
    "caseId": "...",
    "nodeCount": 31,
    "edgeCount": 27,
    "entityCount": 18,
    "eventCount": 7,
    "evidenceCount": 5,
    "generatedAt": "2026-09-20T14:00:00Z"
  }
}
```

### `GET /cases/:caseId/graph/validate`
Executes full integrity validation and returns `{ "valid": true, "errors": [] }`.

---

## 5. Import & Resolution

### `POST /cases/:caseId/import/json`
Atomic structured import for batch evidence, entities, events, and edges.

### `POST /cases/:caseId/import/csv`
CSV import for tabular nodes or edges.

### `GET /cases/:caseId/resolution/candidates`
Lists pending duplicate entity candidates flagged by the identity matching engine.

### `POST /cases/:caseId/resolution/merge`
Confirms merge of candidate nodes.

### `POST /cases/:caseId/resolution/reject`
Marks candidate nodes as distinct entities.

### `GET /cases/:caseId/audit`
Returns the append-only audit trail for the case.

---

## 6. AI Extraction Boundary & Snapshot Export

### `POST /cases/:caseId/extract`
Extracts untrusted structured candidates (entities, events, relationships, evidence) from raw text/log lines.
- **Request Body**:
  ```json
  {
    "rawText": "Accepted publickey for rkumar-adm from 10.0.4.15 port 22 ssh2",
    "sourceName": "server-auth.log",
    "evidenceType": "LOG"
  }
  ```
- **Response (200 OK)**:
  Returns candidate items with `metadata.aiExtracted = true`.
  *All candidates must subsequently pass the strict schema, direction, and provenance validation before persistence via `/cases/:caseId/import/json`.*

### `GET /cases/:caseId/export?format=json|graphml|dot`
Exports the investigation case in one of three industry-standard formats:
- `json` (default): Complete investigation snapshot with case metadata, full graph, audit logs, and resolution candidates.
- `graphml`: GraphML XML format for Gephi, NetworkX, and Cytoscape Desktop.
- `dot`: DOT graph format for Graphviz visualization and rendering.

### `POST /cases/import-snapshot`
Restores a complete exported JSON snapshot into a new or restored investigation case.

# Evidence Graph Schema Specification (Phase 1)

This document provides the formal, definitive specification for the **Evidence-Constrained Heterogeneous Directed Provenance Graph** $G = (V, E)$.

---

## 1. Mathematical & Structural Definition

$$G = (V, E)$$

where:
- $V = V_{\text{entities}} \cup V_{\text{events}} \cup V_{\text{evidence}}$
- $E = \{ (u, v, \tau, s, c, w, R) \mid u, v \in V, \tau \in \mathcal{T}_{\text{rel}}, s \in \mathcal{S}, c \in [0, 1] \cup \{\text{null}\}, w \in \mathbb{R}_{\ge 0}, R \subseteq V_{\text{evidence}} \}$

### Core Invariant: Events are First-Class Nodes
Events (logins, executions, transfers) are **explicit nodes** in $V_{\text{events}}$, **never simple edges**. This allows events to preserve:
- Start and end timestamps
- Temporal precision (`SECOND`, `MINUTE`, `HOUR`, `DAY`, `UNKNOWN`)
- Event-specific properties, duration, and execution context
- Independent provenance and reliability

**Example:**
Instead of a simple edge `Rahul --logged_into--> Server`, the graph models:
```
Rahul (PERSON) 
   │
   │ PERFORMED [OBSERVED, evidence: ev-auth-001]
   ▼
SSH Login (LOGIN Event, 2026-09-10T14:15:00Z)
   │
   │ TARGETED [OBSERVED, evidence: ev-auth-001]
   ▼
Prod-DB-01 (SERVER)
```

---

## 2. Node Categories and Types

### 2.1 Entity Types ($V_{\text{entities}}$)
Represents physical, digital, logical, or organizational objects involved in the investigation.

| Entity Type | Description | Representative Properties |
|:---|:---|:---|
| `PERSON` | Human individual | `role`, `employeeId`, `department`, `aliases` |
| `ORGANIZATION` | Corporate, government, or group entity | `industry`, `jurisdiction`, `headquarters` |
| `ACCOUNT` | Identity principal or credential set | `privilegeLevel`, `uid`, `status` |
| `DEVICE` | Physical computing hardware or endpoint | `os`, `serial`, `mac`, `hostname` |
| `IP_ADDRESS` | Network protocol address | `subnet`, `vlan`, `asn`, `country` |
| `LOCATION` | Physical or geographical coordinate/facility | `building`, `room`, `coordinates` |
| `PHONE_NUMBER` | Telecommunication endpoint | `carrier`, `countryCode`, `lineType` |
| `EMAIL` | Electronic mail address | `mailboxSizeMb`, `domain`, `isInternal` |
| `VEHICLE` | Motor vehicle or transit entity | `licensePlate`, `vin`, `makeModel` |
| `FILE` | Filesystem object or digital artifact | `path`, `sizeBytes`, `hashSha256`, `mime` |
| `SERVER` | Infrastructure host or cloud node | `cluster`, `datacenter`, `osVersion` |
| `DOMAIN` | DNS domain name or FQDN | `registrar`, `nameservers`, `createdDate` |
| `PROCESS` | Operating system running process | `pid`, `ppid`, `binaryPath`, `cmdline` |
| `APPLICATION` | Software package or service | `version`, `vendor`, `port` |

### 2.2 Event Types ($V_{\text{events}}$)
Represents state transitions, actions, interactions, or temporal occurrences.

| Event Type | Description | Temporal Model |
|:---|:---|:---|
| `LOGIN` | Authentication session initiation | Instant or short duration |
| `LOGOUT` | Session termination | Instant |
| `FILE_ACCESS` | Reading or querying a file | Instant or interval |
| `FILE_CREATION` | New file generated or written | Instant |
| `FILE_DELETION` | File unlinked or shredded | Instant |
| `FILE_TRANSFER` | Exfiltration or transmission of data | Duration interval (`start`, `end`) |
| `PROCESS_EXECUTION` | Command or binary launched | Duration interval |
| `ACCOUNT_CREATION` | User/service identity provisioned | Instant |
| `ACCOUNT_MODIFICATION` | Permissions or groups altered | Instant |
| `PASSWORD_CHANGE` | Credential rotation | Instant |
| `COMMUNICATION` | Phone call, message, email sent | Duration interval |
| `TRANSACTION` | Financial or database commit | Instant |
| `LOCATION_CHANGE` | Physical transit of person or asset | Duration interval |
| `DEVICE_CONNECTION` | USB mount, peripheral plugged | Duration interval |
| `NETWORK_CONNECTION` | TCP/UDP socket established | Duration interval (`start`, `end`) |
| `DATA_ACCESS` | Database query or API invocation | Instant or interval |

### 2.3 Evidence Types ($V_{\text{evidence}}$)
Represents primary sources of truth collected during forensic acquisition.

| Evidence Type | Description | Source Kind |
|:---|:---|:---|
| `LOG` | System or application log file | `SYSTEM` |
| `DOCUMENT` | Text document, policy, or formal file | `SYSTEM` / `HUMAN` |
| `IMAGE` | Still photograph or screenshot | `DEVICE` / `SENSOR` |
| `VIDEO` | Video recording | `DEVICE` / `SENSOR` |
| `CCTV` | Closed-circuit surveillance footage | `DEVICE` / `SENSOR` |
| `PHONE_RECORD` | Call detail record (CDR) | `THIRD_PARTY` |
| `TRANSACTION_RECORD` | Ledger or bank statement | `SYSTEM` |
| `EMAIL` | EML/MSG raw mail record | `SYSTEM` |
| `CHAT` | Messaging log or conversation export | `SYSTEM` |
| `INTERVIEW` | Witness or suspect interview statement | `HUMAN` |
| `DATABASE_RECORD` | Table snapshot or binlog record | `SYSTEM` |
| `NETWORK_CAPTURE` | PCAP packet capture file | `NETWORK` |
| `SYSTEM_RECORD` | Kernel, auditd, or registry record | `SYSTEM` |
| `MANUAL_ENTRY` | Investigator manual observation | `HUMAN` |

---

## 3. Controlled Relationship Vocabulary & Direction Matrix

Arbitrary edge combinations are strictly rejected at the schema validation boundary. Every relationship type enforces permitted source and target categories:

| Relationship Type | Allowed Source | Allowed Target | Semantic Meaning |
|:---|:---|:---|:---|
| `OWNS` | `ENTITY` | `ENTITY` | Legal or assigned ownership |
| `USES` | `ENTITY` | `ENTITY` | Entity operates or utilizes another entity |
| `LOCATED_AT` | `ENTITY` | `ENTITY` | Physical or logical host location |
| `MEMBER_OF` | `ENTITY` | `ENTITY` | Organizational or group membership |
| `ASSOCIATED_WITH` | `ENTITY` | `ENTITY` | Peer or logical correlation |
| `CONTACTED` | `ENTITY` | `ENTITY` | Direct communication between entities |
| `CONNECTED_TO` | `ENTITY`, `EVENT` | `ENTITY` | Network, physical, or protocol connection |
| `PERFORMED` | `ENTITY` | `EVENT` | Entity directly executed the event |
| `INITIATED` | `ENTITY` | `EVENT` | Entity triggered or scheduled the event |
| `PARTICIPATED_IN` | `ENTITY` | `EVENT` | Entity was present or passive participant |
| `TARGETED` | `EVENT` | `ENTITY` | Event was directed against an entity |
| `AFFECTED` | `EVENT` | `ENTITY` | Event modified state of an entity |
| `ACCESSED` | `EVENT` | `ENTITY` | Event read or queried an entity |
| `CREATED` | `EVENT` | `ENTITY` | Event generated a new entity |
| `MODIFIED` | `EVENT` | `ENTITY` | Event updated existing entity data |
| `DELETED` | `EVENT` | `ENTITY` | Event destroyed or removed an entity |
| `USED` | `EVENT` | `ENTITY` | Event used entity as an instrument/medium |
| `PRECEDED` | `EVENT` | `EVENT` | Chronological ordering between events |
| `CAUSED` | `EVENT` | `EVENT` | Direct causal dependency |
| `DEPENDS_ON` | `EVENT` | `EVENT` | Prerequisite condition |
| `TRIGGERED` | `EVENT` | `EVENT` | Reactive or automated downstream event |
| `SUPPORTS` | `EVIDENCE` | `ENTITY`, `EVENT`, `EVIDENCE` | Evidence substantiates a node/fact |
| `CONTRADICTS` | `EVIDENCE` | `ENTITY`, `EVENT`, `EVIDENCE` | Evidence disproves or conflicts with a fact |
| `DERIVED_FROM` | Any Node | Any Node | Derivation lineage |

---

## 4. Relationship Statuses

| Status | Definition | Provenance Requirement |
|:---|:---|:---|
| `OBSERVED` | Directly recorded and corroborated by collected evidence | **Must reference at least one valid Evidence ID** in `evidenceRefs`. |
| `DERIVED` | Established by deterministic graph algorithms (reachability, flow) | References algorithm derivation source; `confidence` score (0.0 to 1.0). |
| `HYPOTHESIZED` | Proposed investigation scenario or lead | Evidence references optional; `confidence` score represents working hypothesis weight. |

---

## 5. Temporal Model & Precision

Events store a structured `time` object:
```json
{
  "start": "2026-09-10T14:15:00Z",
  "end": "2026-09-10T14:28:30Z",
  "precision": "SECOND"
}
```

### Precision Values
- `SECOND`: Exact timestamp to the second or sub-second.
- `MINUTE`: Known within a minute.
- `HOUR`: Known within an hour.
- `DAY`: Known to the date only.
- `UNKNOWN`: Timestamp unknown; temporal position inferred via `PRECEDED` / `CAUSED` event chains.

### Validation Constraints
- `start` and `end` must be valid ISO 8601 strings if present.
- If both `start` and `end` exist, validation enforces: $\text{Date}(end) \ge \text{Date}(start)$. Missing timestamps are **never fabricated**.

---

## 6. Future Algorithm Compatibility Matrix

Phase 1 provides the exact properties required by downstream graph algorithms in future phases:

| Future Algorithm | Required Node Fields | Required Edge Fields | Purpose in Forensics |
|:---|:---|:---|:---|
| **Dijkstra / Shortest Path** | `id`, `category` | `source`, `target`, `cost` | Minimal-friction path between actor and exfiltration target |
| **K-Shortest Paths** | `id`, `type` | `source`, `target`, `cost` | Primary and alternative access corridors |
| **Articulation Points (Biconnected)** | `id`, `category` | `source`, `target`, directed/undirected | Critical intermediate nodes (e.g. single bastion or single account) whose removal severs reachability |
| **Min-Cut / Max-Flow** | `id`, `category` | `source`, `target`, `cost` (or capacity = $1/\text{cost}$) | Bottlenecks and minimal edge sets to isolate compromised components |
| **Dominator Trees** | `id` | `source`, `target` (directed DAG) | Identifies nodes that all paths to target must traverse |
| **Steiner Tree / Connecting Subgraph** | `id` (terminal set: e.g. Person + File) | `source`, `target`, `cost` | Minimum cost subgraph linking all key suspect entities |
| **Temporal Path Analysis** | `time.start`, `time.end`, `time.precision` | `PRECEDED`, `CAUSED`, `TRIGGERED` | Validates that cause preceded effect chronologically |
| **Topological Sort / Partial Order** | `id`, `time` | `PRECEDED`, `CAUSED`, `DEPENDS_ON` | Linear execution sequence reconstruction |
| **Vertex-Disjoint / Edge-Disjoint Paths** | `id` | `source`, `target` | Proof of independent exfiltration routes |
| **Graph Pattern Matching (Subgraph Isomorphism)** | `category`, `type`, `properties` | `type`, `status` | Detecting known attack patterns (e.g. Pass-the-Hash, Exfiltration) |
| **Contradiction Analysis** | `id`, `reliability` | `type = 'CONTRADICTS'`, `evidenceRefs` | Pinpointing conflicting witness statements and spoofed logs |

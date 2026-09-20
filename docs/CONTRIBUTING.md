# Contributing & Developer Guidelines

## 1. Development Environment Setup

### Prerequisites
- Node.js v22+ (tested on Node.js v24 LTS)
- npm v10+

### Installation
From the repository root:
```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

---

## 2. Running the Application

### Start Backend API Server
```bash
cd backend
npm run dev
# Server listens on http://localhost:4000
```

### Start Frontend Vite Dev Server
```bash
cd frontend
npm run dev
# Web application available at http://localhost:5173
```

---

## 3. Running Automated Tests & Builds

```bash
# Run backend test suite (26 unit & integration tests)
cd backend
npm test

# Build backend and frontend
npm run build
cd ../frontend
npm run build
```

---

## 4. Code Organization & Architecture Rules

1. **Keep Domain Independent**: Domain validation (`backend/src/domain`) must never depend on Express, HTTP routers, or UI components.
2. **Strict Controlled Vocabulary**: Always update `GRAPH_SCHEMA.md` and `RELATIONSHIP_RULES` whenever introducing a new relationship type.
3. **No Unchecked AI Insertion**: AI must only emit untrusted intermediate JSON which must pass the exact same domain validator before hitting the database.
4. **Preserve Case Isolation**: Every query must verify `case_id`. Cross-case references must be rejected.

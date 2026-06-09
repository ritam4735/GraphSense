# GraphSense – Local Setup Guide (VS Code)

## Prerequisites

| Tool | Version | Download |
|------|---------|----------|
| Node.js | ≥ 18 | https://nodejs.org |
| Neo4j | 4.x or 5.x | Docker, Desktop, or AuraDB |
| VS Code | Latest | https://code.visualstudio.com |

---

## Step 1 – Open in VS Code

```bash
code graphsense/graphsense.code-workspace
```

---

## Step 2 – Start Neo4j Database

The easiest way to run Neo4j locally is via Docker:

```bash
docker run -d --name neo4j -p 7474:7474 -p 7687:7687 -e NEO4J_AUTH=neo4j/password neo4j:latest
```
*Wait ~15 seconds for the database to start.*

---

## Step 3 – Install dependencies

Open the VS Code integrated terminal (Ctrl+` ).

```bash
cd server && npm install
cd ../client && npm install
```

---

## Step 4 – Environment files

Copy the `.env.example` files to `.env`.

**`server/.env`:**
```env
NEO4J_URI=neo4j://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=password
PORT=4000
```

**`client/.env`:**
```env
REACT_APP_API_URL=http://localhost:4000
```

---

## Step 5 – Seed Neo4j Data (ONCE)

```bash
cd server
npm run seed
```

This script will automatically:
1. Connect to Neo4j.
2. Create UNIQUE constraints for `userId`, `productId`, and `categoryId`.
3. Read all CSVs from `data/`.
4. Use Cypher `UNWIND` and `MERGE` to idempotently load all nodes and relationships.

---

## Step 6 – Run the Application (Two Terminals)

**Terminal 1 (Backend):**
```bash
cd server && npm run dev
```
→ API running on http://localhost:4000

**Terminal 2 (Frontend):**
```bash
cd client && npm start
```
→ UI running on http://localhost:3000

---

## Step 7 – Verify

Visit `http://localhost:4000/health` in your browser.
It should return:
```json
{ "status": "ok", "database": "connected", "driver": "neo4j" }
```

---

## Troubleshooting

| Error | Fix |
|-------|-----|
| `Neo4jError: Failed to connect` | Ensure your Docker container is running and ports are mapped. |
| `Validation Error` | The new Zod middleware requires specific parameters. Check your API request. |
| React blank / CORS | Check `client/.env` has `REACT_APP_API_URL=http://localhost:4000` |
| `Cannot find module` | Run `npm install` inside `server/` and `client/` |

---

## API Reference

* `GET /health`          – Neo4j driver connectivity check
* `GET /recommend/:uid`  – Top-10 recommendations (multi-hop Cypher)
* `GET /similar/:uid`    – Similar users (Jaccard approximation)
* `GET /trending`        – Trending items
* `GET /graph/:uid`      – Graph vis data (Nodes + Edges)

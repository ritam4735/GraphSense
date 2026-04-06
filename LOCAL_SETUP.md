# GraphSense – Local Setup Guide (VS Code)

## Prerequisites

| Tool | Version | Download |
|------|---------|----------|
| Node.js | ≥ 18 | https://nodejs.org |
| VS Code | Latest | https://code.visualstudio.com |

---

## Step 1 – Open in VS Code

```bash
code graphsense/graphsense.code-workspace
```

---

## Step 2 – Install dependencies

Open the VS Code integrated terminal (Ctrl+` ).

```bash
cd server && npm install
cd ../client && npm install
```

---

## Step 3 – Environment files (already pre-filled)

Both .env files are already configured with your TigerGraph Savanna credentials.

server/.env is set to your cluster URL, graph name, and token.
client/.env points the React app at http://localhost:4000.

---

## Step 4 – Set up TigerGraph Schema & Queries (ONCE)

1. Go to https://tgcloud.io → open GSQL Studio
2. Paste the entire contents of tigergraph/schema_and_queries.gsql
3. Click Run

This creates vertices (User, Product, Category), edges, the GraphSense graph,
and installs all 4 queries: recommendProducts, similarUsers, trendingProducts, userGraph.

---

## Step 5 – Test connection

```bash
cd server
node test-connection.js
```

All checks should be green. If you see 401, regenerate your token in TG Cloud > Admin > Token Management.

---

## Step 6 – Seed sample data (ONCE)

```bash
cd server
node seed.js
```

Loads all CSVs from data/ into TigerGraph. Safe to re-run (upserts).

---

## Step 7 – Run (two terminals)

Terminal 1:
```bash
cd server && npm run dev
```
→ API on http://localhost:4000

Terminal 2:
```bash
cd client && npm start
```
→ UI on http://localhost:3000

---

## Step 8 – Verify

http://localhost:4000/health should return { "status": "ok", "tigergraph": "connected" }

---

## Troubleshooting

| Error | Fix |
|-------|-----|
| 401 Unauthorized | Token expired — regenerate in TG Cloud |
| Graph or queries not found | Run schema_and_queries.gsql in GSQL Studio |
| ECONNREFUSED 4000 | Server not started |
| React blank / CORS | Check client/.env has REACT_APP_API_URL=http://localhost:4000 |
| Cannot find module | Run npm install inside server/ and client/ |

---

## API Reference

GET /health          – TigerGraph connectivity check
GET /users           – List all users
GET /products        – List all products
GET /recommend/:uid  – Top-10 recommendations
GET /similar/:uid    – Similar users
GET /trending        – Trending products
GET /graph/:uid      – Graph vis data

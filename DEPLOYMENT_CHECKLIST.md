# GraphSense — Deployment Checklist

Use this as your go-to reference. Check each item off before submitting.

---

## Phase 1 — Neo4j AuraDB (Cloud)

- [ ] Created a free instance on https://neo4j.com/cloud/aura/
- [ ] Noted the connection URI (e.g. `neo4j+s://abc1234.databases.neo4j.io`)
- [ ] Downloaded and saved the generated `.txt` file containing the password.
- [ ] Tested connection via Neo4j Workspace (browser).

---

## Phase 2 — Local Backend & Seeding

- [ ] Copied `server/.env.example` → `server/.env`
- [ ] Set `NEO4J_URI` (the AuraDB connection string)
- [ ] Set `NEO4J_USER=neo4j`
- [ ] Set `NEO4J_PASSWORD`
- [ ] Ran `npm install` in `server/`
- [ ] Ran `npm run seed` — constraints created and all nodes/edges seeded.
- [ ] Ran `npm run dev` — server started on port 4000.
- [ ] Tested `/health` → `{ "status": "ok", "database": "connected", "driver": "neo4j" }`
- [ ] Tested `/recommend/u1` → returns array with `"source": "neo4j"`
- [ ] Tested `/graph/u1` → returns nodes + edges arrays.

---

## Phase 3 — Local Frontend

- [ ] Copied `client/.env.example` → `client/.env`
- [ ] Set `REACT_APP_API_URL=http://localhost:4000`
- [ ] Ran `npm install` in `client/`
- [ ] Ran `npm start` — app opens at http://localhost:3000
- [ ] Header shows "● Live" green badge (Neo4j connected)
- [ ] Typed `u1` and clicked Get Recommendations — results appeared
- [ ] Switched to Graph View — vis-network renders with real nodes

---

## Phase 4 — Deploy Backend to Render

- [ ] Pushed `server/` to a GitHub repository
- [ ] Created a new **Web Service** on https://render.com
- [ ] Connected the GitHub repo
- [ ] Set Root Directory: `server`
- [ ] Set Build Command: `npm install`
- [ ] Set Start Command: `npm start`
- [ ] Added environment variables in Render dashboard:
  - [ ] `NEO4J_URI`
  - [ ] `NEO4J_USER=neo4j`
  - [ ] `NEO4J_PASSWORD`
  - [ ] `PORT=4000`
- [ ] Deploy succeeded — green checkmark in Render
- [ ] Tested public URL: `https://graphsense-api.onrender.com/health` → connected

---

## Phase 5 — Deploy Frontend to Vercel

- [ ] Pushed `client/` to a GitHub repository
- [ ] Created a new **Project** on https://vercel.com
- [ ] Connected the GitHub repo
- [ ] Framework preset: **Create React App**
- [ ] Build Command: `npm run build`
- [ ] Output Directory: `build`
- [ ] Added environment variable in Vercel:
  - [ ] `REACT_APP_API_URL=https://graphsense-api.onrender.com`
- [ ] Deploy succeeded
- [ ] Opened the Vercel URL — header shows "● Live"
- [ ] Ran a recommendation query — data comes from Neo4j.

---

## Phase 6 — Final Validation

- [ ] All API responses include `"source": "neo4j"`
- [ ] Graph visualization shows real nodes from AuraDB.
- [ ] Recommendation queries execute quickly (under 500ms).
- [ ] Zod validation blocks invalid `userId` inputs.
- [ ] Rate limiter headers are present in the network tab.

---

## Submission Checklist

- [ ] GitHub repo is public
- [ ] README includes: architecture, Neo4j schema, Cypher query explanation
- [ ] Live demo URL is working at time of submission
- [ ] Neo4j AuraDB instance is active (they pause automatically after a few days of inactivity on the free tier — unpause before demo!)
- [ ] Video demo shows data coming from Neo4j.

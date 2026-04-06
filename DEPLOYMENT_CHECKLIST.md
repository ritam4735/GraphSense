# GraphSense — Deployment Checklist

Use this as your go-to reference. Check each item off before submitting.

---

## Phase 1 — TigerGraph Cloud

- [ ] Created a cluster on https://tgcloud.io (Free tier is fine)
- [ ] Noted the cluster hostname (e.g. `https://abc123.i.tgcloud.io`)
- [ ] Ran `schema_and_queries.gsql` in GSQL Studio — all blocks
- [ ] Confirmed 3 vertex types visible in schema: User, Product, Category
- [ ] Confirmed 5 edge types visible: follows, bought, viewed, similar_to, belongs_to
- [ ] Ran `INSTALL QUERY` for all 4 queries
- [ ] Confirmed all 4 queries appear under Queries panel in GSQL Studio
- [ ] Generated a bearer token via `CREATE SECRET` + `/requesttoken`
- [ ] Tested token manually with curl against `/echo/GraphSense` — got 200

---

## Phase 2 — Local Backend

- [ ] Copied `server/.env.example` → `server/.env`
- [ ] Set `TG_HOST` (no trailing slash, no port)
- [ ] Set `TG_GRAPH=GraphSense`
- [ ] Set `TG_TOKEN` (the bearer token from Phase 1)
- [ ] Ran `npm run test:connection` — all checks green
- [ ] Ran `npm run seed` — all 8 entities seeded, counts verified
- [ ] Ran `npm run dev` — server started on port 4000
- [ ] Tested `/health` → `{ "tigergraph": "connected" }`
- [ ] Tested `/recommend/u1` → returns array with `"source": "tigergraph"`
- [ ] Tested `/trending` → returns array with `"source": "tigergraph"`
- [ ] Tested `/graph/u1` → returns nodes + edges arrays

---

## Phase 3 — Local Frontend

- [ ] Copied `client/.env.example` → `client/.env`
- [ ] Set `REACT_APP_API_URL=http://localhost:4000`
- [ ] Ran `npm install` in `client/`
- [ ] Ran `npm start` — app opens at http://localhost:3000
- [ ] Header shows "● Live" green badge (TigerGraph connected)
- [ ] Typed `u1` and clicked Get Recommendations — results appeared
- [ ] Recommendations show `reason` tags (not generic text)
- [ ] Switched to Graph View — vis-network renders with real nodes
- [ ] Switched to Trending — products shown from TigerGraph
- [ ] Tested with `u2`, `u3` — different results each time
- [ ] No browser console errors

---

## Phase 4 — Deploy Backend to Render

- [ ] Pushed `server/` to a GitHub repository
- [ ] Created a new **Web Service** on https://render.com
- [ ] Connected the GitHub repo
- [ ] Set Root Directory: `server`
- [ ] Set Build Command: `npm install`
- [ ] Set Start Command: `node index.js`
- [ ] Added environment variables in Render dashboard:
  - [ ] `TG_HOST`
  - [ ] `TG_GRAPH=GraphSense`
  - [ ] `TG_TOKEN`
  - [ ] `PORT=4000`
- [ ] Deploy succeeded — green checkmark in Render
- [ ] Tested public URL: `https://graphsense-api.onrender.com/health` → connected
- [ ] Tested public URL: `https://graphsense-api.onrender.com/recommend/u1` → live data

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
- [ ] Ran a recommendation query — data comes from TigerGraph

---

## Phase 6 — Final Validation

- [ ] All API responses include `"source": "tigergraph"`
- [ ] Graph visualization shows real nodes from TigerGraph (not placeholder data)
- [ ] Trending products match the data seeded via `seed.js`
- [ ] No mock data, no hardcoded fallbacks in production code
- [ ] TigerGraph GSQL Studio shows query execution logs when UI is used

---

## Submission Checklist

- [ ] GitHub repo is public
- [ ] README includes: architecture, TigerGraph schema, GSQL query explanation
- [ ] Live demo URL is working at time of submission
- [ ] TigerGraph Cloud cluster is running (not paused/deleted)
- [ ] Video demo shows data coming from TigerGraph (show `/health` endpoint response)
- [ ] PPT content covers Why TigerGraph slide specifically

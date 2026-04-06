# TigerGraph Setup — Step-by-Step

This guide takes you from a blank TigerGraph Cloud account to a
fully seeded, query-ready GraphSense instance.

---

## Step 1 — Create a Free TigerGraph Cloud Cluster

1. Go to **https://tgcloud.io** and sign up (free tier is enough)
2. Click **Create a New Cluster** → choose any region → Free tier
3. Wait ~3 minutes for provisioning
4. Note your **Hostname**, e.g. `https://abc123.i.tgcloud.io`

---

## Step 2 — Open GSQL Studio

From the TigerGraph Cloud dashboard:
- Click your cluster → **Tools** → **GSQL Studio** (or GraphStudio)
- In the left panel, make sure you're in the **Global View** initially

---

## Step 3 — Run the Schema File

Open `tigergraph/schema_and_queries.gsql` in a text editor, then copy
and paste each block into the GSQL Studio editor in order:

### Block 1 — Create the graph
```gsql
CREATE GRAPH GraphSense()
```

### Block 2 — Create vertex types
Copy all `CREATE VERTEX` statements and run them.

### Block 3 — Create edge types
Copy all `CREATE DIRECTED/UNDIRECTED EDGE` statements and run them.

### Block 4 — Add schema to graph
```gsql
USE GRAPH GraphSense
ADD VERTEX User, Product, Category TO GRAPH GraphSense
ADD EDGE follows, bought, viewed, similar_to, belongs_to TO GRAPH GraphSense
```

### Block 5 — Install all 4 queries
Copy and run each `CREATE QUERY` block, then run the `INSTALL QUERY` commands:
```gsql
INSTALL QUERY recommendProducts
INSTALL QUERY similarUsers
INSTALL QUERY trendingProducts
INSTALL QUERY userGraph
```

✅ You should see all 4 queries listed under **Queries** in the left sidebar.

---

## Step 4 — Generate an API Bearer Token

In GSQL Studio → **Admin** → **Management** → **Users**:

```gsql
USE GRAPH GraphSense
CREATE SECRET graphsense_secret
```

Then call the token endpoint:
```bash
curl -X POST "https://YOUR_HOST.i.tgcloud.io:9000/requesttoken" \
  -H "Content-Type: application/json" \
  -d '{"secret":"graphsense_secret","lifetime":"2592000"}'
```

Copy the returned `token` value — this goes into your `.env` as `TG_TOKEN`.

---

## Step 5 — Configure Server Environment

```bash
cd server
cp .env.example .env
```

Edit `.env`:
```
TG_HOST=https://YOUR_CLUSTER.i.tgcloud.io
TG_GRAPH=GraphSense
TG_TOKEN=paste_your_token_here
PORT=4000
```

---

## Step 6 — Test the Connection

```bash
cd server
npm install
npm run test:connection
```

Expected output:
```
✅  TG_HOST  : https://abc123.i.tgcloud.io
✅  TG_TOKEN  : [set]
✅  Echo OK
✅  User        : accessible
✅  Product     : accessible
✅  Category    : accessible
✅  recommendProducts : installed
✅  similarUsers      : installed
✅  trendingProducts  : installed
✅  userGraph         : installed
```

---

## Step 7 — Seed the Graph Data

This command reads all 8 CSV files from `/data` and pushes them to TigerGraph
via the REST++ upsert API:

```bash
cd server
npm run seed
```

Expected output:
```
✅  TigerGraph connection OK

✅  Users      : 10 upserted
✅  Products   : 15 upserted
✅  Categories : 3 upserted
✅  follows    : 13 edges upserted
✅  bought     : 21 edges upserted
✅  viewed     : 20 edges upserted
✅  similar_to : 14 edges upserted
✅  belongs_to : 15 edges upserted

── Verifying graph stats ──
   User       vertices: 10
   Product    vertices: 15
   Category   vertices: 3
   follows    edges: 13
   bought     edges: 21
   ...

🎉  Seed complete. TigerGraph is ready.
```

---

## Step 8 — Start the Server

```bash
npm run dev
```

Test it:
```bash
curl http://localhost:4000/health
# → {"status":"ok","tigergraph":"connected", ...}

curl http://localhost:4000/recommend/u1
# → {"userId":"u1","recommendations":[...], "source":"tigergraph"}

curl http://localhost:4000/trending
# → {"trending":[...], "source":"tigergraph"}
```

---

## Useful TigerGraph REST++ Endpoints

All require `Authorization: Bearer YOUR_TOKEN` header.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/echo/GraphSense` | Connectivity test |
| GET | `/query/GraphSense/recommendProducts?userId=u1` | Run recommendations query |
| GET | `/query/GraphSense/similarUsers?userId=u1&topK=5` | Run similar users query |
| GET | `/query/GraphSense/trendingProducts?days=30` | Run trending query |
| GET | `/query/GraphSense/userGraph?userId=u1` | Run graph viz query |
| GET | `/graph/GraphSense/vertices/User` | List all User vertices |
| GET | `/graph/GraphSense/vertices/Product` | List all Product vertices |
| POST | `/graph/GraphSense` | Upsert vertices/edges |

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `Echo failed: 401` | Token is wrong or expired — regenerate it |
| `Query not found: 404` | Run `INSTALL QUERY queryName` in GSQL Studio |
| `Vertex type not found: 404` | Re-run the schema blocks in GSQL Studio |
| Seed script hangs | Check TigerGraph cluster is running (not paused) |
| `CORS error` in browser | Add your frontend URL to TigerGraph allowed origins |
| Empty recommendations | Confirm seed ran successfully; check query with curl |

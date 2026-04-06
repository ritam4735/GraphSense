# GraphSense 🕸️
### Multi-Hop Recommendation Engine — Powered by TigerGraph

> Personalized product recommendations driven by real-time GSQL graph traversal on TigerGraph Cloud.
> Every result is read live from the graph — not cached, not mocked, not pre-computed.

---

## What GraphSense Does

GraphSense connects to a live **TigerGraph** instance and runs multi-hop GSQL queries
to generate product recommendations by following real relationship paths in the graph:

- Who you follow → what they bought → score +3.0
- What you viewed → similar products → score +(similarity × 2.0)
- Friends of friends who bought something → score +1.0
- Category affinity boost → score +0.5
- Rating quality bonus per product

All of this runs as **a single GSQL query** (`recommendProducts`) inside TigerGraph,
with no intermediate storage, no batch jobs, and no pre-computation.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Graph Database | TigerGraph Cloud |
| Query Language | GSQL (multi-hop, accumulators) |
| Backend | Node.js + Express |
| Frontend | React 18 + vis-network |
| HTTP Client | Axios |
| Deployment: API | Render |
| Deployment: UI | Vercel |

---

## Graph Schema

```
Vertices
  User      — userId, name, age, location
  Product   — productId, name, price, category, rating
  Category  — categoryId, name

Edges
  follows    User     → User      (social graph)
  bought     User     → Product   (purchase history)
  viewed     User     → Product   (behavioural signal)
  similar_to Product  ↔ Product   (content similarity score)
  belongs_to Product  → Category  (taxonomy)
```

---

## Folder Structure

```
graphsense/
├── client/                   # React frontend
│   ├── src/
│   │   ├── App.js            # UI: recommendations, graph viz, trending
│   │   └── App.css
│   └── package.json
│
├── server/
│   ├── index.js              # Express API — all routes call TigerGraph
│   ├── seed.js               # Pushes CSV data into TigerGraph via REST++
│   ├── test-connection.js    # Verifies TigerGraph credentials + queries
│   └── package.json
│
├── data/                     # Sample dataset (8 CSV files)
│   ├── users.csv
│   ├── products.csv
│   ├── categories.csv
│   ├── follows.csv
│   ├── bought.csv
│   ├── viewed.csv
│   ├── similar.csv
│   └── belongs_to.csv
│
├── tigergraph/
│   ├── schema_and_queries.gsql   # Full schema + 4 GSQL queries
│   ├── load_data.gsql            # Alternative: GSQL loading jobs
│   └── SETUP.md                  # Step-by-step TigerGraph setup
│
└── README.md
```

---

## Local Setup

### Prerequisites
- Node.js 18+
- A TigerGraph Cloud account (free at tgcloud.io)

### 1 — Set up TigerGraph

Follow `tigergraph/SETUP.md` completely:
1. Create cluster on TigerGraph Cloud
2. Run `schema_and_queries.gsql` in GSQL Studio
3. Generate a bearer token

### 2 — Configure the server

```bash
cd server
cp .env.example .env
# Fill in TG_HOST, TG_TOKEN, TG_GRAPH
```

### 3 — Verify TigerGraph connection

```bash
npm install
npm run test:connection
```

All checks must pass before continuing.

### 4 — Seed the graph

```bash
npm run seed
```

Reads all CSV files and upserts 10 users, 15 products, 3 categories,
and all relationship edges directly into TigerGraph via REST++.

### 5 — Start the backend

```bash
npm run dev
# API running at http://localhost:4000
```

### 6 — Start the frontend

```bash
cd ../client
cp .env.example .env
# Set REACT_APP_API_URL=http://localhost:4000
npm install
npm start
# UI running at http://localhost:3000
```

---

## API Endpoints

All endpoints call TigerGraph in real time. `source: "tigergraph"` is always present in responses.

| Method | Endpoint | TigerGraph Query |
|--------|----------|-----------------|
| GET | `/health` | Echo ping |
| GET | `/recommend/:userId` | `recommendProducts` |
| GET | `/similar/:userId` | `similarUsers` |
| GET | `/trending` | `trendingProducts` |
| GET | `/graph/:userId` | `userGraph` |
| GET | `/users` | REST++ vertices/User |
| GET | `/products` | REST++ vertices/Product |

Example:
```bash
curl http://localhost:4000/recommend/u1
```
```json
{
  "userId": "u1",
  "count": 9,
  "recommendations": [
    { "productId": "p2", "name": "Mechanical Keyboard", "price": 129.99,
      "score": 9.84, "reason": "Bought by users you follow" },
    ...
  ],
  "source": "tigergraph"
}
```

---

## GSQL Query: recommendProducts (core logic)

```gsql
CREATE QUERY recommendProducts(STRING userId) FOR GRAPH GraphSense {
  -- Hop 1: seed user → follows → followed users
  followedUsers = SELECT f FROM start:u -(follows)-> User:f;

  -- Hop 2a: followed users → bought → candidate products   (+3.0 per hit)
  recFromFollows = SELECT p
    FROM followedUsers:f -(bought)-> Product:p
    WHERE p NOT IN start.@alreadyBought
    ACCUM @@scoreMap += (p -> 3.0);

  -- Hop 2b: viewed products → similar_to → candidate products  (+similarity×2)
  recFromViewed = SELECT s
    FROM viewedByUser:p -(similar_to:e)-> Product:s
    ACCUM @@scoreMap += (s -> e.similarity_score * 2.0);

  -- Friends-of-friends boost  (+1.0)
  recFromFoF = SELECT p
    FROM followedFollowers:f2 -(bought)-> Product:p
    ACCUM @@scoreMap += (p -> 1.0);

  -- Rating quality bonus  (±0.3 per star above/below 3.0)
  -- Top-10 ranked by final score
  PRINT @@topRecs AS recommendations;
}
```

---

## Deployment

### Backend → Render

1. Push `server/` to GitHub
2. Render → New Web Service → connect repo
3. Build: `npm install` · Start: `node index.js`
4. Environment variables:
   ```
   TG_HOST=https://YOUR_CLUSTER.i.tgcloud.io
   TG_GRAPH=GraphSense
   TG_TOKEN=your_token
   PORT=4000
   ```

### Frontend → Vercel

1. Push `client/` to GitHub
2. Vercel → New Project → connect repo
3. Framework: Create React App · Output: `build`
4. Environment variables:
   ```
   REACT_APP_API_URL=https://your-graphsense-api.onrender.com
   ```

---

## Screenshots

> Add screenshots after deployment

| Screen | File |
|--------|------|
| Recommendations view | `screenshots/recs.png` |
| Graph visualization | `screenshots/graph.png` |
| Trending products | `screenshots/trending.png` |
| TigerGraph Studio — queries | `screenshots/gsql-studio.png` |

---

## License

MIT

# GraphSense 🕸️
### Multi-Hop Recommendation Engine — Powered by Neo4j

> A generalized, domain-agnostic recommendation platform driven by real-time Cypher graph traversal on Neo4j. Every result is computed live from the graph using orthogonal relationship paths.

---

## What GraphSense Does

GraphSense connects to a live **Neo4j** instance and runs highly optimized multi-hop Cypher queries to generate personalized recommendations by following real relationship paths in the graph. 

Because the architecture is domain-agnostic, it can recommend **Products**, **Coding Problems (like KodeChirp)**, or **Content**.

Example Product Scoring Logic:
- Who you follow → what they interacted with → base score 3.0
- What you interacted with → similar entities → base score (similarity × 2.0)
- Friends of friends who interacted → base score 1.0
- Quality modifier (e.g., rating bonus)

All of this runs as **a single Cypher query** using `UNION ALL` inside Neo4j, with no intermediate storage, no batch jobs, and no pre-computation.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Graph Database | Neo4j (AuraDB or Local) |
| Query Language | Cypher (UNION ALL, OPTIONAL MATCH) |
| Backend | Node.js + Express (Domain-Driven Architecture) |
| Security | Zod (Validation), express-rate-limit |
| Frontend | React 18 + vis-network |
| Driver | neo4j-driver |

---

## Graph Schema

The core schema is decoupled via a `GraphRepository` interface. For the default demo, it uses:

```
Nodes
  User      — userId [UNIQUE], name, age, location
  Product   — productId [UNIQUE], name, price, category, rating
  Category  — categoryId [UNIQUE], name

Relationships
  FOLLOWS    User     → User      (social graph)
  BOUGHT     User     → Product   (strong interaction)
  VIEWED     User     → Product   (weak interaction)
  SIMILAR_TO Product  ↔ Product   (content similarity score)
  BELONGS_TO Product  → Category  (taxonomy)
```

---

## Architecture

```
graphsense/
├── client/                   # React frontend
│   ├── src/App.js            # UI: recommendations, graph viz, trending
│   └── package.json
│
├── server/                   # Clean Domain-Driven Backend
│   ├── src/
│   │   ├── app.js            # Express config & security middleware
│   │   ├── server.js         # Entry point
│   │   ├── controllers/      # Route handlers
│   │   ├── services/         # Business logic
│   │   ├── repositories/     # GraphRepository interface & Neo4j implementation
│   │   ├── database/         # Neo4j Driver pool & Seed scripts
│   │   └── middleware/       # Zod validation & Global error handlers
│   └── package.json
│
├── data/                     # Sample dataset (8 CSV files)
└── README.md
```

---

## Local Setup

### 1 — Start Neo4j

You can use Neo4j Desktop, Neo4j AuraDB (free tier), or Docker:
```bash
docker run -d --name neo4j -p 7474:7474 -p 7687:7687 -e NEO4J_AUTH=neo4j/password neo4j:latest
```

### 2 — Configure the backend

```bash
cd server
cp .env.example .env
# Set NEO4J_URI=neo4j://localhost:7687
# Set NEO4J_USER=neo4j
# Set NEO4J_PASSWORD=password
```

### 3 — Install & Seed Data

```bash
npm install
npm run seed
```
*This will create all UNIQUE constraints and load the CSV data using optimized Cypher `MERGE` and `UNWIND` statements.*

### 4 — Start the backend

```bash
npm run dev
# API running at http://localhost:4000
```

### 5 — Start the frontend

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

All endpoints use the `Neo4jRepository` in real time.

| Method | Endpoint | Cypher Query Logic |
|--------|----------|-----------------|
| GET | `/health` | Driver `verifyConnectivity()` |
| GET | `/recommend/:userId` | `recommendEntities` (Multi-hop UNION ALL) |
| GET | `/similar/:userId` | `getSimilarEntities` (Jaccard approximation) |
| GET | `/trending` | `getTrendingEntities` (Relationship counts) |
| GET | `/graph/:userId` | `getEntityGraph` (Local neighborhood paths) |

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
      "score": 9.84, "reason": "Bought by friends" }
  ],
  "source": "neo4j"
}
```

---

## License

MIT

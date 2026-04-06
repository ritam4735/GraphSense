/**
 * GraphSense – LOCAL MOCK SERVER
 * Runs 100% offline. Loads data from /data CSV files.
 * Implements the same GSQL graph logic in JavaScript.
 * Exposes identical API as the TigerGraph-backed server.
 */

const express = require("express");
const cors    = require("cors");
const fs      = require("fs");
const path    = require("path");

const app  = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 4000;

// ── Load CSV helper ────────────────────────────────────────────
function loadCSV(filename) {
  const filePath = path.join(__dirname, "..", "data", filename);
  const raw = fs.readFileSync(filePath, "utf-8").trim().split("\n");
  const headers = raw[0].split(",");
  return raw.slice(1).map(line => {
    const values = line.split(",");
    const obj = {};
    headers.forEach((h, i) => { obj[h.trim()] = values[i]?.trim(); });
    return obj;
  });
}

// ── Load all data at startup ───────────────────────────────────
console.log("\n📂  Loading graph data from /data CSVs...");

const users      = loadCSV("users.csv");
const products   = loadCSV("products.csv");
const categories = loadCSV("categories.csv");
const follows    = loadCSV("follows.csv");
const bought     = loadCSV("bought.csv");
const viewed     = loadCSV("viewed.csv");
const similar    = loadCSV("similar.csv");
const belongsTo  = loadCSV("belongs_to.csv");

// ── Build lookup maps ──────────────────────────────────────────
const userMap    = Object.fromEntries(users.map(u => [u.userId, u]));
const productMap = Object.fromEntries(products.map(p => [p.productId, p]));
const catMap     = Object.fromEntries(categories.map(c => [c.categoryId, c]));

// Adjacency helpers
const followsMap   = {};  // userId → Set<userId>
const boughtMap    = {};  // userId → Set<productId>
const viewedMap    = {};  // userId → Set<productId>
const similarMap   = {};  // productId → [{other, score}]
const belongsMap   = {};  // productId → categoryId
const boughtByProd = {};  // productId → Set<userId>

follows.forEach(({ fromUserId, toUserId }) => {
  followsMap[fromUserId] = followsMap[fromUserId] || new Set();
  followsMap[fromUserId].add(toUserId);
});

bought.forEach(({ userId, productId, purchase_date, quantity }) => {
  boughtMap[userId] = boughtMap[userId] || new Set();
  boughtMap[userId].add(productId);
  boughtByProd[productId] = boughtByProd[productId] || new Set();
  boughtByProd[productId].add(userId);
});

viewed.forEach(({ userId, productId }) => {
  viewedMap[userId] = viewedMap[userId] || new Set();
  viewedMap[userId].add(productId);
});

similar.forEach(({ productId1, productId2, similarity_score }) => {
  const score = parseFloat(similarity_score);
  similarMap[productId1] = similarMap[productId1] || [];
  similarMap[productId1].push({ other: productId2, score });
  similarMap[productId2] = similarMap[productId2] || [];
  similarMap[productId2].push({ other: productId1, score });
});

belongsTo.forEach(({ productId, categoryId }) => {
  belongsMap[productId] = categoryId;
});

console.log(`✅  Users: ${users.length}, Products: ${products.length}, Categories: ${categories.length}`);
console.log(`✅  Edges: follows(${follows.length}) bought(${bought.length}) viewed(${viewed.length}) similar(${similar.length})\n`);

// ─────────────────────────────────────────────────────────────
// ROUTE: Health
// ─────────────────────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    tigergraph: "mock (local data)",
    graph: "GraphSense",
    host: "localhost (in-memory)",
    users: users.length,
    products: products.length,
    timestamp: new Date().toISOString(),
  });
});

// ─────────────────────────────────────────────────────────────
// ROUTE: GET /recommend/:userId
// Mirrors: recommendProducts GSQL query
// Multi-hop: follows→bought (+3), viewed→similar_to (+score×2), FoF (+1), rating bonus
// ─────────────────────────────────────────────────────────────
app.get("/recommend/:userId", (req, res) => {
  const { userId } = req.params;
  if (!userMap[userId]) return res.status(404).json({ error: `User ${userId} not found` });

  const alreadyBought = boughtMap[userId] || new Set();
  const alreadyViewed = viewedMap[userId] || new Set();
  const scoreMap  = {};
  const reasonMap = {};

  function addScore(productId, delta, reason) {
    if (!productMap[productId]) return;
    scoreMap[productId]  = (scoreMap[productId]  || 0) + delta;
    reasonMap[productId] = reasonMap[productId] || reason;
  }

  const friends = [...(followsMap[userId] || [])];

  // Hop 1: friends who bought products not already bought by user
  friends.forEach(friendId => {
    (boughtMap[friendId] || new Set()).forEach(productId => {
      if (!alreadyBought.has(productId)) addScore(productId, 3.0, "Bought by friends");
    });
  });

  // Hop 2: viewed → similar_to (content-based)
  alreadyViewed.forEach(productId => {
    (similarMap[productId] || []).forEach(({ other, score }) => {
      if (!alreadyBought.has(other) && !alreadyViewed.has(other)) {
        addScore(other, score * 2.0, "Similar to viewed");
      }
    });
  });

  // Hop 3: friends-of-friends (+1)
  friends.forEach(friendId => {
    (followsMap[friendId] || new Set()).forEach(fof => {
      if (fof === userId) return;
      (boughtMap[fof] || new Set()).forEach(productId => {
        if (!alreadyBought.has(productId)) addScore(productId, 1.0, "Extended network");
      });
    });
  });

  // Rating bonus: ±0.3 per star above/below 3.0
  Object.keys(scoreMap).forEach(productId => {
    const rating = parseFloat(productMap[productId]?.rating || 3);
    scoreMap[productId] += (rating - 3.0) * 0.3;
  });

  const recommendations = Object.entries(scoreMap)
    .map(([productId, score]) => ({
      productId,
      name:   productMap[productId].name,
      price:  parseFloat(productMap[productId].price),
      rating: parseFloat(productMap[productId].rating),
      score:  Math.round(score * 100) / 100,
      reason: reasonMap[productId] || "Recommended",
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  res.json({ userId, count: recommendations.length, recommendations, source: "mock" });
});

// ─────────────────────────────────────────────────────────────
// ROUTE: GET /similar/:userId
// Mirrors: similarUsers (Jaccard similarity via shared purchases)
// ─────────────────────────────────────────────────────────────
app.get("/similar/:userId", (req, res) => {
  const { userId } = req.params;
  const topK = parseInt(req.query.topK) || 5;
  if (!userMap[userId]) return res.status(404).json({ error: `User ${userId} not found` });

  const myProducts = boughtMap[userId] || new Set();
  const sharedMap  = {};

  myProducts.forEach(productId => {
    (boughtByProd[productId] || new Set()).forEach(otherUserId => {
      if (otherUserId !== userId) sharedMap[otherUserId] = (sharedMap[otherUserId] || 0) + 1;
    });
  });

  const similarUsers = Object.entries(sharedMap)
    .map(([uid, score]) => ({ userId: uid, name: userMap[uid]?.name || uid, score }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  res.json({ userId, similarUsers, source: "mock" });
});

// ─────────────────────────────────────────────────────────────
// ROUTE: GET /trending
// Mirrors: trendingProducts (purchase count)
// ─────────────────────────────────────────────────────────────
app.get("/trending", (req, res) => {
  const topK = parseInt(req.query.topK) || 10;
  const countMap = {};
  bought.forEach(({ productId }) => { countMap[productId] = (countMap[productId] || 0) + 1; });

  const trending = Object.entries(countMap)
    .map(([productId, count]) => ({
      productId,
      name:  productMap[productId]?.name || productId,
      price: parseFloat(productMap[productId]?.price || 0),
      count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, topK);

  res.json({ trending, days: 30, source: "mock" });
});

// ─────────────────────────────────────────────────────────────
// ROUTE: GET /graph/:userId
// Mirrors: userGraph (nodes + edges for vis-network)
// ─────────────────────────────────────────────────────────────
app.get("/graph/:userId", (req, res) => {
  const { userId } = req.params;
  if (!userMap[userId]) return res.status(404).json({ error: `User ${userId} not found` });

  const nodes = [];
  const edges = [];
  const seen  = new Set();

  function addNode(id, label, type) {
    if (!seen.has(id)) { seen.add(id); nodes.push({ id, label, type }); }
  }

  const user = userMap[userId];
  addNode(userId, user.name, "User");

  // Follows edges
  (followsMap[userId] || new Set()).forEach(fId => {
    const f = userMap[fId];
    if (f) {
      addNode(fId, f.name, "User");
      edges.push({ id: edges.length, from: userId, to: fId, label: "follows" });
    }
  });

  // Bought edges
  (boughtMap[userId] || new Set()).forEach(pId => {
    const p = productMap[pId];
    if (p) {
      addNode(pId, p.name, "Product");
      edges.push({ id: edges.length, from: userId, to: pId, label: "bought" });
      // belongs_to
      const catId = belongsMap[pId];
      if (catId && catMap[catId]) {
        addNode(catId, catMap[catId].name, "Category");
        edges.push({ id: edges.length, from: pId, to: catId, label: "belongs_to" });
      }
    }
  });

  // Viewed edges (up to 3 to keep graph readable)
  let viewCount = 0;
  (viewedMap[userId] || new Set()).forEach(pId => {
    if (viewCount >= 3) return;
    const p = productMap[pId];
    if (p && !seen.has(pId)) {
      addNode(pId, p.name, "Product");
      edges.push({ id: edges.length, from: userId, to: pId, label: "viewed" });
      viewCount++;
    }
  });

  res.json({ userId, nodes, edges, source: "mock" });
});

// ─────────────────────────────────────────────────────────────
// ROUTE: GET /users
// ─────────────────────────────────────────────────────────────
app.get("/users", (_req, res) => {
  res.json({ users: users.map(u => ({ userId: u.userId, name: u.name, age: parseInt(u.age), location: u.location })), count: users.length, source: "mock" });
});

// ─────────────────────────────────────────────────────────────
// ROUTE: GET /products
// ─────────────────────────────────────────────────────────────
app.get("/products", (_req, res) => {
  res.json({
    products: products.map(p => ({
      productId: p.productId, name: p.name,
      price: parseFloat(p.price), category: p.category, rating: parseFloat(p.rating),
    })),
    count: products.length, source: "mock",
  });
});

// ─────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅  GraphSense MOCK API running on http://localhost:${PORT}`);
  console.log(`   Mode: In-memory data from /data CSVs (no TigerGraph needed)`);
  console.log(`   Health : http://localhost:${PORT}/health`);
  console.log(`   Recs   : http://localhost:${PORT}/recommend/u1`);
  console.log(`   Trend  : http://localhost:${PORT}/trending\n`);
});

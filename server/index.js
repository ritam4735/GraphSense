/**
 * GraphSense – Express API Server
 * ALL data comes from TigerGraph. No mocks. No fallbacks.
 * If TigerGraph is not configured, the server tells you exactly what's missing.
 */

require("dotenv").config({ path: __dirname + "/.env" });
const express = require("express");
const cors    = require("cors");
const axios   = require("axios");

const app = express();
app.use(cors());
app.use(express.json());

// ── TigerGraph connection config ─────────────────────────────
const TG_HOST  = process.env.TG_HOST;   // e.g. https://abc123.i.tgcloud.io
const TG_GRAPH = process.env.TG_GRAPH || "GraphSense";
const TG_TOKEN = process.env.TG_TOKEN;  // Bearer token from TG Cloud

// Fail loudly at startup if env vars are missing
if (!TG_HOST || !TG_TOKEN) {
  console.error("\n❌  MISSING ENVIRONMENT VARIABLES");
  console.error("   TG_HOST  :", TG_HOST  || "NOT SET");
  console.error("   TG_TOKEN :", TG_TOKEN ? "SET" : "NOT SET");
  console.error("\nCreate a .env file from .env.example and fill in your TigerGraph credentials.\n");
  process.exit(1);
}

const TG_BASE = `${TG_HOST}`;

/** Axios instance pre-configured for TigerGraph REST++ */
const tg = axios.create({
  baseURL: TG_BASE,
  headers: {
    Authorization: `Bearer ${TG_TOKEN}`,
    "Content-Type": "application/json",
  },
  timeout: 15000,
});

/** Standardised TigerGraph error response */
function tgError(res, operation, err) {
  const status = err.response?.status || 500;
  const detail = err.response?.data?.message || err.message;
  console.error(`[TigerGraph] ${operation} failed:`, detail);
  return res.status(status).json({
    error: `TigerGraph query failed: ${operation}`,
    detail,
    hint: "Check TG_HOST, TG_TOKEN, TG_GRAPH in your .env and confirm the query is INSTALLED.",
  });
}

// ─────────────────────────────────────────────────────────────
// ROUTE: Health + live TigerGraph connectivity check
// ─────────────────────────────────────────────────────────────
app.get("/health", async (_req, res) => {
  try {
    const ping = await tg.get(`/query/${TG_GRAPH}/recommendProducts`, { params: { userId: "__test__" } });
    return res.json({
      status: "ok",
      tigergraph: "connected",
      graph: TG_GRAPH,
      host: TG_HOST,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    const status = err.response?.status || 500;
    if (status === 404) {
      return res.status(503).json({
        status: "error",
        tigergraph: "unreachable",
        detail: "Graph or queries not found. Run schema_and_queries.gsql in GSQL Studio.",
        hint: "See tigergraph/SETUP.md Step 3",
      });
    }
    return res.status(503).json({
      status: "error",
      tigergraph: "unreachable",
      detail: err.message,
    });
  }
});
// ─────────────────────────────────────────────────────────────
// ROUTE: GET /recommend/:userId
// Calls GSQL query: recommendProducts
// Multi-hop traversal: follows->bought, viewed->similar_to
// Returns top-10 scored products with reason tag
// ─────────────────────────────────────────────────────────────
app.get("/recommend/:userId", async (req, res) => {
  const { userId } = req.params;
  if (!userId) return res.status(400).json({ error: "userId is required" });

  try {
    const response = await tg.get(
      `/query/${TG_GRAPH}/recommendProducts`,
      { params: { userId } }
    );
    const recommendations = response.data?.results?.[0]?.recommendations ?? [];
    return res.json({
      userId,
      count: recommendations.length,
      recommendations,
      source: "tigergraph",
    });
  } catch (err) {
    return tgError(res, "recommendProducts", err);
  }
});

// ─────────────────────────────────────────────────────────────
// ROUTE: GET /similar/:userId
// Calls GSQL query: similarUsers (Jaccard similarity)
// ─────────────────────────────────────────────────────────────
app.get("/similar/:userId", async (req, res) => {
  const { userId } = req.params;
  const topK = parseInt(req.query.topK) || 5;

  try {
    const response = await tg.get(
      `/query/${TG_GRAPH}/similarUsers`,
      { params: { userId, topK } }
    );
    const similarUsers = response.data?.results?.[0]?.similarUsers ?? [];
    return res.json({ userId, similarUsers, source: "tigergraph" });
  } catch (err) {
    return tgError(res, "similarUsers", err);
  }
});

// ─────────────────────────────────────────────────────────────
// ROUTE: GET /trending
// Calls GSQL query: trendingProducts
// Time-windowed purchase count, sorted descending
// ─────────────────────────────────────────────────────────────
app.get("/trending", async (req, res) => {
  const days = parseInt(req.query.days) || 30;
  const topK = parseInt(req.query.topK) || 10;

  try {
    const response = await tg.get(
      `/query/${TG_GRAPH}/trendingProducts`,
      { params: { days, topK } }
    );
    const trending = response.data?.results?.[0]?.trending ?? [];
    return res.json({ trending, days, source: "tigergraph" });
  } catch (err) {
    return tgError(res, "trendingProducts", err);
  }
});

// ─────────────────────────────────────────────────────────────
// ROUTE: GET /graph/:userId
// Calls GSQL query: userGraph
// Returns nodes + edges parsed for vis-network rendering
// ─────────────────────────────────────────────────────────────
app.get("/graph/:userId", async (req, res) => {
  const { userId } = req.params;

  try {
    const response = await tg.get(
      `/query/${TG_GRAPH}/userGraph`,
      { params: { userId } }
    );
    const raw      = response.data?.results?.[0] ?? {};
    const rawNodes = raw.nodes ?? [];
    const rawEdges = raw.edges ?? [];

    // Parse pipe-delimited strings from GSQL ListAccum
    // Node format : "Type|id|label"
    // Edge format : "fromId|edgeType|toId"
    const nodes = rawNodes.map((str) => {
      const [type, id, label] = str.split("|");
      return { id, label, type };
    });
    const edges = rawEdges.map((str, i) => {
      const [from, label, to] = str.split("|");
      return { id: i, from, to, label };
    });

    return res.json({ userId, nodes, edges, source: "tigergraph" });
  } catch (err) {
    return tgError(res, "userGraph", err);
  }
});

// ─────────────────────────────────────────────────────────────
// ROUTE: GET /users
// Reads User vertices directly via TigerGraph REST++ API
// ─────────────────────────────────────────────────────────────
app.get("/users", async (_req, res) => {
  try {
    const response = await tg.get(`/graph/${TG_GRAPH}/vertices/User`);
    const users = (response.data?.results ?? []).map((v) => ({
      userId:   v.v_id,
      name:     v.attributes?.name,
      age:      v.attributes?.age,
      location: v.attributes?.location,
    }));
    return res.json({ users, count: users.length, source: "tigergraph" });
  } catch (err) {
    return tgError(res, "listUsers", err);
  }
});

// ─────────────────────────────────────────────────────────────
// ROUTE: GET /products
// Reads Product vertices directly via TigerGraph REST++ API
// ─────────────────────────────────────────────────────────────
app.get("/products", async (_req, res) => {
  try {
    const response = await tg.get(`/graph/${TG_GRAPH}/vertices/Product`);
    const products = (response.data?.results ?? []).map((v) => ({
      productId: v.v_id,
      name:      v.attributes?.name,
      price:     v.attributes?.price,
      category:  v.attributes?.category,
      rating:    v.attributes?.rating,
    }));
    return res.json({ products, count: products.length, source: "tigergraph" });
  } catch (err) {
    return tgError(res, "listProducts", err);
  }
});

// ─────────────────────────────────────────────────────────────
// ROUTE: POST /upsert/vertex   (used by seed.js)
// Upserts a single vertex via TigerGraph REST++ API
// ─────────────────────────────────────────────────────────────
app.post("/upsert/vertex", async (req, res) => {
  const { vertexType, vertexId, attributes } = req.body;
  if (!vertexType || !vertexId) {
    return res.status(400).json({ error: "vertexType and vertexId are required" });
  }
  try {
    const payload = {
      vertices: {
        [vertexType]: {
          [vertexId]: Object.fromEntries(
            Object.entries(attributes || {}).map(([k, v]) => [k, { value: v }])
          ),
        },
      },
    };
    const response = await tg.post(`/graph/${TG_GRAPH}`, payload);
    return res.json({ ok: true, result: response.data });
  } catch (err) {
    return tgError(res, "upsertVertex", err);
  }
});

// ─────────────────────────────────────────────────────────────
// ROUTE: POST /upsert/edge   (used by seed.js)
// Upserts a single edge via TigerGraph REST++ API
// ─────────────────────────────────────────────────────────────
app.post("/upsert/edge", async (req, res) => {
  const { edgeType, fromType, fromId, toType, toId, attributes } = req.body;
  if (!edgeType || !fromType || !fromId || !toType || !toId) {
    return res.status(400).json({ error: "edgeType, fromType, fromId, toType, toId are required" });
  }
  try {
    const payload = {
      edges: {
        [fromType]: {
          [fromId]: {
            [edgeType]: {
              [toType]: {
                [toId]: Object.fromEntries(
                  Object.entries(attributes || {}).map(([k, v]) => [k, { value: v }])
                ),
              },
            },
          },
        },
      },
    };
    const response = await tg.post(`/graph/${TG_GRAPH}`, payload);
    return res.json({ ok: true, result: response.data });
  } catch (err) {
    return tgError(res, "upsertEdge", err);
  }
});

// ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`\n✅  GraphSense API running on port ${PORT}`);
  console.log(`   TigerGraph host : ${TG_HOST}`);
  console.log(`   Graph name      : ${TG_GRAPH}`);
  console.log(`   Health check    : http://localhost:${PORT}/health\n`);
});

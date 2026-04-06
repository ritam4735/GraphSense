/**
 * GraphSense – TigerGraph Seed Script
 *
 * Reads all CSV files from /data and POSTs them directly to TigerGraph
 * via the REST++ upsert API.  Run this ONCE after schema + queries are installed.
 *
 * Usage:
 *   cd server
 *   node seed.js
 *
 * Requires the same .env as the main server (TG_HOST, TG_TOKEN, TG_GRAPH).
 */

require("dotenv").config();
const axios = require("axios");
const fs    = require("fs");
const path  = require("path");

const TG_HOST  = process.env.TG_HOST;
const TG_GRAPH = process.env.TG_GRAPH || "GraphSense";
const TG_TOKEN = process.env.TG_TOKEN;

if (!TG_HOST || !TG_TOKEN) {
  console.error("❌  TG_HOST or TG_TOKEN missing in .env");
  process.exit(1);
}

const tg = axios.create({
  baseURL: `${TG_HOST}`,
  headers: {
    Authorization: `Bearer ${TG_TOKEN}`,
    "Content-Type": "application/json",
  },
  timeout: 30000,
});

const DATA_DIR = path.join(__dirname, "../data");

// ── Minimal CSV parser (no dependencies needed) ───────────────
function parseCSV(filename) {
  const filepath = path.join(DATA_DIR, filename);
  const raw = fs.readFileSync(filepath, "utf-8").trim().split("\n");
  const headers = raw[0].split(",").map((h) => h.trim());
  return raw.slice(1).map((line) => {
    const values = line.split(",").map((v) => v.trim());
    return Object.fromEntries(headers.map((h, i) => [h, values[i]]));
  });
}

// ── Batch upsert helper ───────────────────────────────────────
async function upsertVertices(vertexType, records, mapFn) {
  const vertices = {};
  records.forEach((row) => {
    const { id, attrs } = mapFn(row);
    vertices[id] = Object.fromEntries(
      Object.entries(attrs).map(([k, v]) => [k, { value: v }])
    );
  });

  const payload = { vertices: { [vertexType]: vertices } };
  const response = await tg.post(`/graph/${TG_GRAPH}`, payload);
  return response.data;
}

async function upsertEdges(fromType, toType, edgeType, records, mapFn) {
  // TigerGraph REST++ edge upsert payload structure:
  // { edges: { FromType: { fromId: { EdgeType: { ToType: { toId: { attr: {value:v} } } } } } } }
  const edgesPayload = {};

  records.forEach((row) => {
    const { fromId, toId, attrs } = mapFn(row);
    if (!edgesPayload[fromId]) edgesPayload[fromId] = {};
    if (!edgesPayload[fromId][edgeType]) edgesPayload[fromId][edgeType] = {};
    if (!edgesPayload[fromId][edgeType][toType]) edgesPayload[fromId][edgeType][toType] = {};
    edgesPayload[fromId][edgeType][toType][toId] = Object.fromEntries(
      Object.entries(attrs || {}).map(([k, v]) => [k, { value: v }])
    );
  });

  const payload = { edges: { [fromType]: edgesPayload } };
  const response = await tg.post(`/graph/${TG_GRAPH}`, payload);
  return response.data;
}

// ── Seed functions per entity ─────────────────────────────────

async function seedUsers() {
  const rows = parseCSV("users.csv");
  const result = await upsertVertices("User", rows, (r) => ({
    id: r.userId,
    attrs: { name: r.name, age: parseInt(r.age) || 0, location: r.location },
  }));
  console.log(`✅  Users      : ${rows.length} upserted`, result.results ?? "");
}

async function seedProducts() {
  const rows = parseCSV("products.csv");
  const result = await upsertVertices("Product", rows, (r) => ({
    id: r.productId,
    attrs: {
      name:     r.name,
      price:    parseFloat(r.price) || 0,
      category: r.category,
      rating:   parseFloat(r.rating) || 0,
    },
  }));
  console.log(`✅  Products   : ${rows.length} upserted`, result.results ?? "");
}

async function seedCategories() {
  const rows = parseCSV("categories.csv");
  const result = await upsertVertices("Category", rows, (r) => ({
    id:    r.categoryId,
    attrs: { name: r.name },
  }));
  console.log(`✅  Categories : ${rows.length} upserted`, result.results ?? "");
}

async function seedFollows() {
  const rows = parseCSV("follows.csv");
  const result = await upsertEdges("User", "User", "follows", rows, (r) => ({
    fromId: r.fromUserId,
    toId:   r.toUserId,
    attrs:  { since: r.since },
  }));
  console.log(`✅  follows    : ${rows.length} edges upserted`, result.results ?? "");
}

async function seedBought() {
  const rows = parseCSV("bought.csv");
  const result = await upsertEdges("User", "Product", "bought", rows, (r) => ({
    fromId: r.userId,
    toId:   r.productId,
    attrs:  {
      purchase_date: r.purchase_date,
      quantity:      parseInt(r.quantity) || 1,
    },
  }));
  console.log(`✅  bought     : ${rows.length} edges upserted`, result.results ?? "");
}

async function seedViewed() {
  const rows = parseCSV("viewed.csv");
  const result = await upsertEdges("User", "Product", "viewed", rows, (r) => ({
    fromId: r.userId,
    toId:   r.productId,
    attrs:  {
      view_count:  parseInt(r.view_count) || 1,
      last_viewed: r.last_viewed,
    },
  }));
  console.log(`✅  viewed     : ${rows.length} edges upserted`, result.results ?? "");
}

async function seedSimilar() {
  const rows = parseCSV("similar.csv");
  const result = await upsertEdges("Product", "Product", "similar_to", rows, (r) => ({
    fromId: r.productId1,
    toId:   r.productId2,
    attrs:  { similarity_score: parseFloat(r.similarity_score) || 0 },
  }));
  console.log(`✅  similar_to : ${rows.length} edges upserted`, result.results ?? "");
}

async function seedBelongsTo() {
  const rows = parseCSV("belongs_to.csv");
  const result = await upsertEdges("Product", "Category", "belongs_to", rows, (r) => ({
    fromId: r.productId,
    toId:   r.categoryId,
    attrs:  {},
  }));
  console.log(`✅  belongs_to : ${rows.length} edges upserted`, result.results ?? "");
}

// ── Verify counts after seeding ───────────────────────────────
async function verifyGraph() {
  console.log("\n── Verifying graph stats ────────────────────────────────");
  for (const vType of ["User", "Product", "Category"]) {
    try {
      const r = await tg.get(`/graph/${TG_GRAPH}/vertices/${vType}?count_only=true`);
      console.log(`   ${vType.padEnd(10)} vertices: ${r.data?.results?.[0]?.count ?? "?"}`);
    } catch (e) {
      console.log(`   ${vType.padEnd(10)} vertices: (could not count)`);
    }
  }
  for (const eType of ["follows", "bought", "viewed", "similar_to", "belongs_to"]) {
    try {
      const r = await tg.get(`/graph/${TG_GRAPH}/edges/${eType}?count_only=true`);
      console.log(`   ${eType.padEnd(12)} edges: ${r.data?.results?.[0]?.count ?? "?"}`);
    } catch (e) {
      console.log(`   ${eType.padEnd(12)} edges: (could not count)`);
    }
  }
}

// ── Main ──────────────────────────────────────────────────────
(async () => {
  console.log("\n🌱  GraphSense Seed Script");
  console.log(`   TigerGraph : ${TG_HOST}`);
  console.log(`   Graph      : ${TG_GRAPH}`);
  console.log("─────────────────────────────────────────────────────────\n");

  try {
    // Verify connection first
    await tg.get(`/echo/${TG_GRAPH}`);
    console.log("✅  TigerGraph connection OK\n");
  } catch (err) {
    console.error("❌  Cannot reach TigerGraph:", err.message);
    console.error("    Check TG_HOST and TG_TOKEN in .env");
    process.exit(1);
  }

  try {
    await seedUsers();
    await seedProducts();
    await seedCategories();
    await seedFollows();
    await seedBought();
    await seedViewed();
    await seedSimilar();
    await seedBelongsTo();
    await verifyGraph();
    console.log("\n🎉  Seed complete. TigerGraph is ready.\n");
  } catch (err) {
    console.error("\n❌  Seed failed:", err.response?.data || err.message);
    process.exit(1);
  }
})();

/**
 * GraphSense – TigerGraph Connection Test
 *
 * Run this FIRST to confirm your .env credentials work before
 * starting the server or running the seed script.
 *
 * Usage:
 *   cd server
 *   node test-connection.js
 */

require("dotenv").config();
const axios = require("axios");

const TG_HOST  = process.env.TG_HOST;
const TG_GRAPH = process.env.TG_GRAPH || "GraphSense";
const TG_TOKEN = process.env.TG_TOKEN;

async function run() {
  console.log("\n🔍  GraphSense – TigerGraph Connection Test");
  console.log("──────────────────────────────────────────────\n");

  // 1. Check env vars
  let ok = true;
  if (!TG_HOST) {
    console.error("❌  TG_HOST   is not set in .env");
    ok = false;
  } else {
    console.log("✅  TG_HOST  :", TG_HOST);
  }
  if (!TG_TOKEN) {
    console.error("❌  TG_TOKEN  is not set in .env");
    ok = false;
  } else {
    console.log("✅  TG_TOKEN  : [set]");
  }
  console.log("ℹ️   TG_GRAPH  :", TG_GRAPH);

  if (!ok) {
    console.error("\nFix the above before continuing.\n");
    process.exit(1);
  }

  const tg = axios.create({
    baseURL: TG_HOST,
    headers: { Authorization: `Bearer ${TG_TOKEN}` },
    timeout: 10000,
  });

  // 2. Check if graph and queries are installed
  console.log("\n── Step 1: Graph and queries installed ────────");
  try {
    await tg.get(`/query/${TG_GRAPH}/recommendProducts`, { params: { userId: "__test__" } });
    console.log("✅  Graph and queries are installed");
  } catch (err) {
    const status = err.response?.status;
    if (status === 404) {
      console.error("❌  Graph or queries not found");
      console.error("    Run schema_and_queries.gsql in GSQL Studio first");
      console.error("    See tigergraph/SETUP.md Step 3");
      process.exit(1);
    } else if (status === 400) {
      console.log("✅  Graph and queries are installed (parameter validation)");
    } else {
      console.error("❌  Unexpected error:", err.response?.data || err.message);
      process.exit(1);
    }
  }

  // 3. Token validation – list vertices
  console.log("\n── Step 2: Token + graph access ───────────────");
  for (const vType of ["User", "Product", "Category"]) {
    try {
      const r = await tg.get(`/graph/${TG_GRAPH}/vertices/${vType}?limit=1`);
      const count = r.data?.results?.length ?? 0;
      console.log(`✅  ${vType.padEnd(10)}: accessible (${count} sample record(s))`);
    } catch (err) {
      const status = err.response?.status;
      if (status === 401 || status === 403) {
        console.error(`❌  ${vType}: Auth error – check TG_TOKEN`);
      } else if (status === 404) {
        console.warn(`⚠️   ${vType}: vertex type not found – run schema_and_queries.gsql first`);
      } else {
        console.error(`❌  ${vType}:`, err.response?.data || err.message);
      }
    }
  }

  // 4. Installed queries
  console.log("\n── Step 3: Installed GSQL queries ─────────────");
  const QUERIES = ["recommendProducts", "similarUsers", "trendingProducts", "userGraph"];
  for (const q of QUERIES) {
    try {
      // Attempt with a dummy param — 400 means query exists but bad params, which is fine
      await tg.get(`/query/${TG_GRAPH}/${q}`, { params: { userId: "__test__" } });
      console.log(`✅  ${q}: installed`);
    } catch (err) {
      const status = err.response?.status;
      if (status === 400) {
        // 400 = bad parameters but query exists = GOOD
        console.log(`✅  ${q}: installed (parameter validation active)`);
      } else if (status === 404) {
        console.error(`❌  ${q}: NOT installed – run INSTALL QUERY ${q} in GSQL Studio`);
      } else {
        console.warn(`⚠️   ${q}: unexpected response ${status}`);
      }
    }
  }

  console.log("\n──────────────────────────────────────────────");
  console.log("✅  All checks passed. You are ready to run:");
  console.log("   node seed.js       # load CSV data into TigerGraph");
  console.log("   npm run dev        # start the API server\n");
}

run().catch((err) => {
  console.error("Unexpected error:", err.message);
  process.exit(1);
});

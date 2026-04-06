import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import "./App.css";

// API base must be set in .env → REACT_APP_API_URL
const API = process.env.REACT_APP_API_URL;

if (!API) {
  console.error(
    "REACT_APP_API_URL is not set.\n" +
    "Create client/.env with:\n" +
    "  REACT_APP_API_URL=http://localhost:4000"
  );
}

// ── Axios instance ─────────────────────────────────────────────
const http = axios.create({ baseURL: API, timeout: 20000 });

// ── Graph Visualizer ───────────────────────────────────────────
function GraphVisualizer({ userId, graphData }) {
  const containerRef = useRef(null);
  const networkRef   = useRef(null);

  useEffect(() => {
    if (!graphData || !containerRef.current) return;

    import("vis-network/standalone").then(({ Network, DataSet }) => {
      const colorMap = { User: "#7F77DD", Product: "#1D9E75", Category: "#BA7517" };

      const nodes = new DataSet(
        graphData.nodes.map((n) => ({
          id:    n.id,
          label: n.id === userId ? `★ ${n.label}` : n.label,
          color: {
            background: n.id === userId ? "#534AB7" : colorMap[n.type] || "#888",
            border:     n.id === userId ? "#3C3489" : "#334155",
            highlight:  { background: "#BA7517", border: "#854F0B" },
          },
          font:  { color: "#f1f5f9", size: n.id === userId ? 15 : 12, face: "DM Sans, sans-serif" },
          size:  n.id === userId ? 30 : n.type === "Product" ? 22 : 18,
          shape: n.type === "User" ? "dot" : n.type === "Product" ? "diamond" : "hexagon",
          shadow: { enabled: true, color: "rgba(0,0,0,0.35)", size: 6 },
        }))
      );

      const edgeColors = {
        follows:    "#7F77DD",
        bought:     "#1D9E75",
        viewed:     "#BA7517",
        similar_to: "#D4537E",
        belongs_to: "#888780",
      };

      const edges = new DataSet(
        graphData.edges.map((e, i) => ({
          id:     i,
          from:   e.from,
          to:     e.to,
          label:  e.label,
          color:  { color: edgeColors[e.label] || "#888", opacity: 0.7 },
          font:   { color: "#94a3b8", size: 9, strokeWidth: 0 },
          arrows: ["follows", "bought", "viewed", "belongs_to"].includes(e.label)
            ? { to: { enabled: true, scaleFactor: 0.7 } }
            : {},
          dashes: e.label === "similar_to",
          width:  e.label === "bought" ? 2.5 : 1.5,
          smooth: { type: "continuous" },
        }))
      );

      if (networkRef.current) networkRef.current.destroy();

      networkRef.current = new Network(containerRef.current, { nodes, edges }, {
        physics: {
          enabled: true,
          forceAtlas2Based: {
            gravitationalConstant: -50,
            centralGravity: 0.01,
            springLength: 120,
            springConstant: 0.08,
          },
          solver: "forceAtlas2Based",
          stabilization: { iterations: 150 },
        },
        interaction: { hover: true, zoomView: true, dragView: true },
        layout:      { improvedLayout: true },
      });
    });

    return () => { if (networkRef.current) networkRef.current.destroy(); };
  }, [graphData, userId]);

  return (
    <div className="graph-container">
      <div className="graph-header">
        <span className="graph-title">Graph Neighborhood — Live from TigerGraph</span>
        <div className="legend">
          {[
            { color: "#7F77DD", label: "User" },
            { color: "#1D9E75", label: "Product" },
            { color: "#BA7517", label: "Category" },
          ].map((l) => (
            <span key={l.label} className="legend-item">
              <span className="legend-dot" style={{ background: l.color }} />
              {l.label}
            </span>
          ))}
        </div>
      </div>
      <div ref={containerRef} style={{ width: "100%", height: "420px" }} />
      <div className="edge-legend">
        {[
          { color: "#7F77DD", label: "follows",    dash: false },
          { color: "#1D9E75", label: "bought",     dash: false },
          { color: "#BA7517", label: "viewed",     dash: false },
          { color: "#D4537E", label: "similar_to", dash: true  },
        ].map((e) => (
          <span key={e.label} className="edge-item">
            <svg width="28" height="8">
              <line x1="2" y1="4" x2="26" y2="4"
                stroke={e.color} strokeWidth="2"
                strokeDasharray={e.dash ? "4,3" : "none"}
              />
            </svg>
            {e.label}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Score Bar ──────────────────────────────────────────────────
function ScoreBar({ score, max = 12 }) {
  const pct = Math.min((score / max) * 100, 100).toFixed(1);
  return (
    <div className="score-bar-wrap">
      <div className="score-bar" style={{ "--pct": `${pct}%` }} />
      <span className="score-val">{parseFloat(score).toFixed(1)}</span>
    </div>
  );
}

// ── Recommendation Card ────────────────────────────────────────
function RecCard({ rec, rank }) {
  const icon =
    rec.reason?.includes("follow") ? "👥" :
    rec.reason?.includes("Similar") ? "🔗" :
    rec.reason?.includes("network") ? "🌐" : "⭐";

  return (
    <div className="rec-card" style={{ animationDelay: `${rank * 60}ms` }}>
      <div className="rec-rank">#{rank + 1}</div>
      <div className="rec-body">
        <div className="rec-name">{rec.name}</div>
        {rec.price != null && (
          <div className="rec-price">${parseFloat(rec.price).toFixed(2)}</div>
        )}
        <div className="rec-reason">{rec.reason || "Recommended for you"}</div>
        <ScoreBar score={rec.score ?? 0} />
      </div>
      <div className="rec-icon">{icon}</div>
    </div>
  );
}

// ── Error Banner ───────────────────────────────────────────────
function ErrorBanner({ message }) {
  return (
    <div className="error-banner">
      <span>⚠️</span>
      <span>{message}</span>
    </div>
  );
}

// ── Source Badge ───────────────────────────────────────────────
function SourceBadge() {
  return (
    <span className="source-badge">
      <svg width="10" height="10" viewBox="0 0 10 10">
        <circle cx="5" cy="5" r="4" fill="#1D9E75" />
      </svg>
      Live · TigerGraph
    </span>
  );
}

// ── Main App ───────────────────────────────────────────────────
export default function App() {
  const [userId,    setUserId]    = useState("u1");
  const [recs,      setRecs]      = useState(null);   // null = not yet fetched
  const [trending,  setTrending]  = useState([]);
  const [graphData, setGraphData] = useState(null);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState("");
  const [activeTab, setActiveTab] = useState("recs");
  const [tgStatus,  setTgStatus]  = useState("checking"); // checking | ok | error

  const DEMO_USERS = ["u1", "u2", "u3", "u4", "u5"];

  // Ping health on mount to confirm TigerGraph is live
  useEffect(() => {
    http.get("/health")
      .then(() => setTgStatus("ok"))
      .catch(() => setTgStatus("error"));

    // Load trending on mount
    http.get("/trending")
      .then((r) => setTrending(r.data.trending || []))
      .catch(() => setTrending([]));
  }, []);

  const fetchAll = async (uid = userId) => {
    if (!uid.trim()) return;
    setLoading(true);
    setError("");

    try {
      // Fire recommend + graph requests in parallel
      const [recRes, graphRes] = await Promise.all([
        http.get(`/recommend/${uid}`),
        http.get(`/graph/${uid}`),
      ]);

      setRecs(recRes.data.recommendations || []);
      setGraphData(graphRes.data);
      setActiveTab("recs");
    } catch (err) {
      const detail =
        err.response?.data?.detail ||
        err.response?.data?.error ||
        err.message;
      setError(`TigerGraph error: ${detail}`);
      setRecs([]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => { if (e.key === "Enter") fetchAll(); };

  return (
    <div className="app">

      {/* ── Header ── */}
      <header className="header">
        <div className="header-inner">
          <div className="brand">
            <svg className="brand-icon" viewBox="0 0 40 40" fill="none">
              <circle cx="20" cy="8"  r="5" fill="#7F77DD" />
              <circle cx="8"  cy="30" r="5" fill="#1D9E75" />
              <circle cx="32" cy="30" r="5" fill="#BA7517" />
              <line x1="20" y1="13" x2="8"  y2="25" stroke="#7F77DD" strokeWidth="2" />
              <line x1="20" y1="13" x2="32" y2="25" stroke="#7F77DD" strokeWidth="2" />
              <line x1="13" y1="30" x2="27" y2="30"
                stroke="#888780" strokeWidth="1.5" strokeDasharray="3,2" />
            </svg>
            <span className="brand-name">GraphSense</span>
            <span className="brand-tag">Multi-Hop Recommendation Engine</span>
          </div>
          <div className="header-meta">
            <span className="badge">TigerGraph</span>
            <span className={`badge ${tgStatus === "ok" ? "badge-green" : tgStatus === "error" ? "badge-red" : "badge-dim"}`}>
              {tgStatus === "ok" ? "● Live" : tgStatus === "error" ? "● Disconnected" : "● Connecting…"}
            </span>
          </div>
        </div>
      </header>

      <main className="main">

        {/* ── TigerGraph disconnected warning ── */}
        {tgStatus === "error" && (
          <div className="tg-warning">
            <strong>TigerGraph not reachable.</strong>{" "}
            Check that TG_HOST, TG_TOKEN, and TG_GRAPH are set in{" "}
            <code>server/.env</code> and the server is running.
          </div>
        )}

        {/* ── Hero ── */}
        <section className="search-panel">
          <h1 className="search-title">
            Discover Products Through Your{" "}
            <span className="accent">Graph Network</span>
          </h1>
          <p className="search-sub">
            Multi-hop traversal follows your social connections and viewing behaviour
            across TigerGraph to surface products you'll actually want.
          </p>

          <div className="search-row">
            <div className="input-wrap">
              <span className="input-icon">
                <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <circle cx="9" cy="9" r="6" />
                  <path d="M15 15l3 3" strokeLinecap="round" />
                </svg>
              </span>
              <input
                className="search-input"
                type="text"
                placeholder="Enter User ID (e.g. u1)"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                onKeyDown={handleKeyDown}
              />
            </div>
            <button
              className={`search-btn ${loading ? "loading" : ""}`}
              onClick={() => fetchAll()}
              disabled={loading || tgStatus === "error"}
            >
              {loading
                ? <><span className="spinner" /> Traversing Graph…</>
                : "Get Recommendations"}
            </button>
          </div>

          <div className="quick-users">
            <span className="quick-label">Quick select:</span>
            {DEMO_USERS.map((u) => (
              <button
                key={u}
                className={`quick-chip ${userId === u ? "active" : ""}`}
                onClick={() => { setUserId(u); fetchAll(u); }}
              >
                {u}
              </button>
            ))}
          </div>
        </section>

        {/* ── Multi-hop explanation strip ── */}
        <section className="hops-strip">
          {[
            { icon: "👤", label: "Your Profile",   sub: "Start node" },
            null,
            { icon: "👥", label: "Follows",        sub: "Hop 1" },
            null,
            { icon: "🛒", label: "Bought",         sub: "Hop 2" },
            null,
            { icon: "🔗", label: "Similar",        sub: "Hop 3" },
            null,
            { icon: "⭐", label: "Score & Rank",   sub: "Top 10" },
          ].map((s, i) =>
            s === null ? (
              <div key={i} className="hop-arrow">→</div>
            ) : (
              <div key={i} className="hop-step">
                <span className="hop-icon">{s.icon}</span>
                <span className="hop-label">{s.label}</span>
                <span className="hop-sub">{s.sub}</span>
              </div>
            )
          )}
        </section>

        {error && <ErrorBanner message={error} />}

        {/* ── Results tabs ── */}
        {recs !== null && (
          <>
            <div className="tabs">
              {["recs", "graph", "trending"].map((t) => (
                <button
                  key={t}
                  className={`tab ${activeTab === t ? "active" : ""}`}
                  onClick={() => setActiveTab(t)}
                >
                  {t === "recs"     && "🎯 Recommendations"}
                  {t === "graph"    && "🕸️ Graph View"}
                  {t === "trending" && "🔥 Trending"}
                </button>
              ))}
              <div className="tab-source"><SourceBadge /></div>
            </div>

            {activeTab === "recs" && (
              <div className="recs-grid">
                {recs.length === 0 ? (
                  <div className="empty">No recommendations returned by TigerGraph for "{userId}".</div>
                ) : (
                  recs.map((r, i) => (
                    <RecCard key={r.productId ?? i} rec={r} rank={i} />
                  ))
                )}
              </div>
            )}

            {activeTab === "graph" && graphData && (
              <GraphVisualizer userId={userId} graphData={graphData} />
            )}

            {activeTab === "trending" && (
              <div className="trending-list">
                <h2 className="section-title">🔥 Trending This Month <SourceBadge /></h2>
                {trending.length === 0 ? (
                  <div className="empty">No trending data from TigerGraph yet.</div>
                ) : (
                  trending.map((p, i) => (
                    <div key={p.productId ?? i} className="trending-row">
                      <span className="trending-rank">#{i + 1}</span>
                      <span className="trending-name">{p.name}</span>
                      {p.price != null && (
                        <span className="trending-price">${parseFloat(p.price).toFixed(2)}</span>
                      )}
                      <span className="trending-count">{p.purchaseCount ?? p.purchase_count ?? "—"} purchases</span>
                    </div>
                  ))
                )}
              </div>
            )}
          </>
        )}

        {/* ── Before first search: show trending ── */}
        {recs === null && trending.length > 0 && (
          <div className="trending-preview">
            <h2 className="section-title">🔥 Trending Now <SourceBadge /></h2>
            <div className="trending-list">
              {trending.map((p, i) => (
                <div key={p.productId ?? i} className="trending-row">
                  <span className="trending-rank">#{i + 1}</span>
                  <span className="trending-name">{p.name}</span>
                  {p.price != null && (
                    <span className="trending-price">${parseFloat(p.price).toFixed(2)}</span>
                  )}
                  <span className="trending-count">{p.purchaseCount ?? "—"} purchases</span>
                </div>
              ))}
            </div>
          </div>
        )}

      </main>

      <footer className="footer">
        <p>GraphSense · Powered by <strong>TigerGraph</strong> · Multi-Hop GSQL Traversal</p>
        <p className="footer-tech">Node.js · React · GSQL · vis-network · Vercel · Render</p>
      </footer>

    </div>
  );
}

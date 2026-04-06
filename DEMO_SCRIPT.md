# GraphSense — 2-Minute Demo Script

---

## [0:00 – 0:20] — Hook & Introduction

*[Open browser to the app. Pause on the landing page.]*

"Every time you shop online, a recommendation engine decides what you see next.
Most of them are wrong — because they treat you as a row in a spreadsheet.

GraphSense takes a completely different approach.
Instead of a matrix, we use a **graph** — and instead of statistics, we follow **actual relationships**.

This is GraphSense — a multi-hop recommendation engine built on TigerGraph."

---

## [0:20 – 0:45] — Live Demo: Get Recommendations

*[Type 'u1' in the search box. Click 'Get Recommendations'.]*

"Let's say I'm user u1 — Jordan Lee, from San Francisco.

I click Get Recommendations — and watch what happens under the hood:

The backend calls TigerGraph with a single GSQL query.
TigerGraph traverses the graph in real-time:

- First, it finds everyone Jordan follows — Alice and Bob.
- Then it hops to products Alice and Bob have *bought*.
- Simultaneously, it looks at products Jordan *viewed*, and finds similar ones.
- Everything gets scored and ranked."

*[Results appear on screen.]*

"In under a second, we have 10 personalized recommendations — each with a reason.
'Bought by users you follow.' 'Similar to items you viewed.'
These aren't guesses. They're paths through a graph."

---

## [0:45 – 1:10] — Graph Visualization

*[Click 'Graph View' tab.]*

"Now here's what makes graph-native systems special — you can actually **see** the reasoning.

This is Jordan's graph neighborhood — rendered live using vis-network.
Purple nodes are users. Green diamonds are products.
You can see the follows edges in indigo, bought edges in green, similar_to edges in pink.

Every recommendation maps to a path you can trace visually.
That's the power of graph — not just accuracy, but **explainability**."

---

## [1:10 – 1:35] — Why TigerGraph

*[Switch to a slide or just narrate while showing the app.]*

"We chose TigerGraph for one core reason: multi-hop traversal is a **first-class citizen**.

In a SQL database, three hops means three JOINs — slow, expensive, hard to maintain.
In TigerGraph, we write one GSQL query using accumulators to score products *as we traverse*.

No intermediate tables. No batch jobs. No pre-computation.
The entire recommendation logic — social proof, behavioral similarity, category affinity, rating boost — runs in a single query, in real time."

---

## [1:35 – 2:00] — Close & Impact

*[Click through to Trending tab briefly, then back to the home.]*

"GraphSense also surfaces trending products platform-wide, and can find similar users using Jaccard similarity — all powered by the same graph.

The full stack: React frontend deployed on Vercel, Node.js backend on Render, TigerGraph Cloud for the graph.

The code is clean, fully deployable, and open source.

GraphSense proves that when your data has relationships, your database should too.
Graph-native recommendations: faster, smarter, and actually explainable.

Thank you."

---

## DELIVERY TIPS

- **Practice the TigerGraph explanation** (the JOIN vs traversal argument) — judges care most about this
- **Keep the browser tab ready** — pre-run the app so there's no cold start
- **If TigerGraph is slow**, use the demo mode endpoints and explain it's a live connection
- **Point at the graph visualization** — it's your strongest visual moment
- **Smile when results appear** — the "under a second" moment is a genuine wow
- **Time check:** aim for exactly 1:55 to leave 5 seconds buffer

---

## BACKUP TALKING POINTS (if asked questions)

**Q: How does the scoring work?**
A: Every hop adds weighted evidence. Followed-user purchases score +3.0, viewed-product similarity scores +similarity×2, friends-of-friends add +1.0, and a rating bonus of ±0.3 per star above 3.0. Products appearing in multiple paths accumulate scores from all of them.

**Q: Why not just use a recommendation library like Surprise or LightFM?**
A: Those are matrix-factorization approaches — they can't natively model the *reason* behind a recommendation. They also can't do real-time traversal. GraphSense returns a human-readable reason for every recommendation because the path in the graph *is* the reason.

**Q: Does this scale?**
A: TigerGraph is designed for distributed multi-hop traversal at scale. The architecture doesn't change — just the cluster size on TigerGraph Cloud.

**Q: What about cold start?**
A: New users can still get recommendations via the trending endpoint and category affinities as soon as they view one product. The graph model degrades more gracefully than matrix factorization.

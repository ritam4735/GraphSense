# GraphSense — 2-Minute Demo Script

---

## [0:00 – 0:20] — Hook & Introduction

*[Open browser to the app. Pause on the landing page.]*

"Every time you interact with an application, a recommendation engine decides what you see next.
Most of them are wrong — because they treat you as an isolated row in a spreadsheet.

GraphSense takes a completely different approach.
Instead of a flat matrix, we use a **native graph** — and instead of simple statistics, we follow **actual relationships**.

This is GraphSense — a domain-agnostic, multi-hop recommendation engine built on Neo4j."

---

## [0:20 – 0:45] — Live Demo: Get Recommendations

*[Type 'u1' in the search box. Click 'Get Recommendations'.]*

"Let's say I'm user u1.

I click Get Recommendations — and watch what happens under the hood:

The backend calls Neo4j with a single, highly optimized Cypher query.
Neo4j traverses the graph in real-time using parallel paths:

- First, it finds everyone I follow.
- Then it hops to items my network has interacted with.
- Simultaneously, it looks at items I've interacted with, and finds similar ones.
- Everything is merged, scored, and ranked."

*[Results appear on screen.]*

"In milliseconds, we have 10 personalized recommendations — each with a reason.
'Bought by friends.' 'Similar to viewed.'
These aren't guesses. They're deterministic paths through a graph."

---

## [0:45 – 1:10] — Graph Visualization

*[Click 'Graph View' tab.]*

"Now here's what makes graph-native systems special — you can actually **see** the reasoning.

This is the user's graph neighborhood.
You can see the follows edges, the interaction edges, and the similarity edges.

Every recommendation maps to a path you can trace visually.
That's the power of graph — not just accuracy, but **explainability**. We don't just tell you what to consume; we tell you *why*."

---

## [1:10 – 1:35] — Why Neo4j & Architecture

*[Switch to a slide or just narrate while showing the app.]*

"We chose Neo4j because multi-hop traversal is its core strength.

In a SQL database, three hops means three JOINs — slow, expensive, and a nightmare to maintain.
In Neo4j, we write one Cypher query using `UNION ALL` to evaluate entirely different scoring paths simultaneously, without Cartesian products.

Furthermore, our architecture is **domain-agnostic**. The Node.js backend uses a generic `GraphRepository` interface. Today it recommends products. Tomorrow, without changing the core engine, it can recommend Coding Problems, Courses, or Jobs."

---

## [1:35 – 2:00] — Close & Impact

*[Click through to Trending tab briefly, then back to the home.]*

"GraphSense is built for production. It features Zod validation, express rate-limiting, native connection pooling, and structured logging. 
The React frontend is deployed on Vercel, the Node.js backend on Render, and the graph lives on Neo4j AuraDB.

GraphSense proves that when your data has relationships, your database should too.
Graph-native recommendations: faster, smarter, and actually explainable.

Thank you."

---

## DELIVERY TIPS

- **Keep the browser tab ready** — pre-run the app so there's no cold start.
- **Point at the graph visualization** — it's your strongest visual moment.
- **Emphasize 'Domain-Agnostic'** — investors love platforms, not just single-use products.
- **Time check:** aim for exactly 1:55 to leave 5 seconds buffer.

---

## BACKUP TALKING POINTS (if asked questions)

**Q: How does the scoring work?**
A: Every hop adds weighted evidence via Cypher `UNION ALL` subqueries. For example, friend interactions score +3.0, similarity scores add a multiplier, and extended networks (friends of friends) add +1.0. The scores are aggregated and ranked.

**Q: Why Neo4j instead of TigerGraph or SQL?**
A: Neo4j's Cypher language is the industry standard and incredibly expressive for path-finding. SQL requires expensive JOINs for multi-hop. Neo4j offers a superior developer experience, excellent Node.js drivers, and a great managed cloud offering (AuraDB).

**Q: Does this scale?**
A: Yes. We've optimized the Cypher queries with `LIMIT` clauses on deep traversals (like friends-of-friends) to prevent super-node combinatorial explosions. We also enforce `UNIQUE` constraints acting as B-Tree indexes for `O(log N)` lookups.

**Q: What about cold start?**
A: New users can still get recommendations via the trending endpoint. As soon as they interact with a single item, the similarity graph kicks in immediately.

# GraphSense — Presentation Slide Content
## 8–10 Slides | TigerGraph Multi-Hop Recommendation Engine

---

## SLIDE 1 — TITLE

**Title:**
GraphSense
Multi-Hop Recommendation Engine

**Subtitle:**
Personalized product discovery powered by TigerGraph's native graph traversal

**Footer:**
Built with TigerGraph · GSQL · Node.js · React
[Your Name] | [Event/Hackathon Name] | [Date]

**Visual Suggestion:**
Animated graph network with glowing edges — user node at center, product nodes radiating outward, path highlighted in indigo/green.

---

## SLIDE 2 — THE PROBLEM

**Headline:**
Traditional Recommenders Are Blind to Relationships

**3 Pain Points:**

🔴 **Flat Data Models**
Collaborative filtering treats users as rows in a matrix — completely ignoring *why* someone bought something or *who* influenced them.

🔴 **No Social Context**
"People like you also bought" is statistical noise. Real influence comes from people you actually follow and trust.

🔴 **Cold Start Problem**
New users with sparse history get generic recommendations. Graph models can leverage social connections even for new users.

**Key Stat:**
> 91% of consumers are more likely to shop with brands that provide relevant recommendations — but most systems are wrong more than 60% of the time.

---

## SLIDE 3 — THE SOLUTION

**Headline:**
GraphSense: Follow the Graph, Not the Matrix

**What we built:**
A full-stack recommendation engine that uses **multi-hop graph traversal** on TigerGraph to surface products through:

- ✅ Who you follow → what they bought
- ✅ What you viewed → what's similar to it
- ✅ Extended network reach (friends of friends)
- ✅ Category affinity + rating signals

**Result:**
Recommendations that feel *earned*, not guessed — backed by real relationships in the data.

**Visual Suggestion:**
Split screen: left = flat matrix table (crossed out), right = glowing graph with traversal path highlighted.

---

## SLIDE 4 — WHY TIGERGRAPH

**Headline:**
TigerGraph is the Only Logical Choice for This Problem

| Feature | Traditional DB | TigerGraph |
|---------|---------------|------------|
| Multi-hop queries | N JOINs (slow) | Native graph traversal |
| Real-time traversal | ❌ | ✅ Milliseconds |
| GSQL expressiveness | ❌ | ✅ Full Turing-complete |
| Scalability | Limited | Billions of edges |
| Pattern matching | Workarounds | Built-in |

**Key advantages used in this project:**
- **GSQL accumulators** — score products across hops without materializing intermediate results
- **Distributed traversal** — all hops execute in a single query, not multiple round trips
- **Schema flexibility** — adding a new edge type (e.g. `wishlist`) requires zero backend change

---

## SLIDE 5 — ARCHITECTURE

**Headline:**
Clean 3-Tier Architecture, Deployed on Modern Cloud

```
┌─────────────────┐     REST API      ┌──────────────────┐     GSQL      ┌──────────────────┐
│   React Client  │ ──────────────►   │  Express Server  │ ──────────►   │  TigerGraph Cloud│
│   (Vercel)      │ ◄──────────────   │  (Render)        │ ◄──────────   │  (TG Cloud Free) │
└─────────────────┘   JSON Results    └──────────────────┘  Graph Data   └──────────────────┘
       │                                      │
  vis-network                          .env config
  graph viz                        TG_URL / TG_TOKEN
```

**Data Flow:**
1. User enters ID in React UI
2. React calls `GET /recommend/:userId` on Express
3. Express calls TigerGraph REST API with GSQL query
4. TigerGraph traverses graph, scores products, returns top 10
5. React displays results + renders graph neighborhood

---

## SLIDE 6 — GRAPH SCHEMA

**Headline:**
Rich Schema Capturing Social + Behavioral Signals

**Vertices:**
| Vertex | Key Attributes |
|--------|---------------|
| User | userId, name, age, location |
| Product | productId, name, price, category, rating |
| Category | categoryId, name |

**Edges:**
| Edge | Type | Signal |
|------|------|--------|
| follows | User → User | Social trust |
| bought | User → Product | Strong purchase signal |
| viewed | User → Product | Interest signal |
| similar_to | Product ↔ Product | Content similarity score |
| belongs_to | Product → Category | Category membership |

**Visual Suggestion:**
Clean graph diagram with 3 colored vertex types, 5 labeled edge types, showing a sample path: u1 → follows → u2 → bought → p3 → similar_to → p7.

---

## SLIDE 7 — HOW IT WORKS (MULTI-HOP)

**Headline:**
3-Hop Traversal + Weighted Scoring in One GSQL Query

**Traversal Paths:**

```
Path 1 (Social Proof):
  You ──[follows]──► Friend ──[bought]──► Product   → Score +3.0

Path 2 (Behavioral Similarity):
  You ──[viewed]──► Product A ──[similar_to]──► Product B  → Score +(similarity × 2.0)

Path 3 (Extended Network):
  You ──[follows×2]──► FoF ──[bought]──► Product   → Score +1.0

Path 4 (Category Affinity):
  Your viewed products → Category → Other products  → Score +0.5

Bonus:
  Product rating > 3.0  → Score +(rating - 3.0) × 0.3
```

**Output:** Top 10 products, sorted by score DESC, with reason tag

**Why this works:**
Each hop adds evidence. Products appearing in multiple paths get scores from all paths — naturally surfacing items with broad relevance across your network.

---

## SLIDE 8 — FEATURES

**Headline:**
Production-Grade System, Not a Demo Prototype

**Frontend:**
- 🎨 Modern dark UI with Syne + DM Sans typography
- 🕸️ Interactive graph visualization (vis-network)
- ⚡ Instant user switching with quick-select chips
- 📊 Score bars showing recommendation confidence
- 💬 Reason tags explaining why each product was recommended
- 📈 Trending products panel (real-time from TigerGraph)

**Backend:**
- 🔒 Bearer token auth to TigerGraph
- 🔄 Demo mode fallback (works without live TigerGraph)
- 🛡️ Full error handling + CORS
- 🌐 5 REST endpoints including graph viz data

**TigerGraph:**
- 4 GSQL queries (recommend, similar users, trending, graph viz)
- Full data loading jobs for all 8 CSV files
- Multi-hop traversal with GSQL accumulators

---

## SLIDE 9 — DEMO WALKTHROUGH

**Headline:**
Let's Walk Through a Live Example

**Step-by-step:**

1. **Enter User ID** → type `u1` (Jordan Lee, San Francisco)

2. **Click "Get Recommendations"** → Express calls TigerGraph
   
3. **TigerGraph traverses the graph:**
   - u1 follows u2 (Alice) and u3 (Bob)
   - Alice bought: Mechanical Keyboard, USB-C Hub
   - Bob bought: Standing Desk, Monitor Arm
   - u1 viewed: Wireless Headphones → similar to Earbuds
   - Score computed, top 10 ranked

4. **Results appear** with:
   - Product name + price
   - Reason: "Bought by users you follow"
   - Score bar showing confidence

5. **Switch to Graph View** → see u1's neighborhood visualized:
   - Purple nodes = Users
   - Green diamonds = Products
   - Indigo edges = follows, Green edges = bought

6. **Switch to Trending** → see platform-wide hot products

---

## SLIDE 10 — IMPACT & FUTURE

**Headline:**
GraphSense Proves Graph > Matrix for Recommendations

**Impact:**
- 📌 Explainable recommendations — users know *why* a product was shown
- 🔗 Trust signals — recommendations backed by people you follow
- ⚡ Real-time — single GSQL query, no batch jobs, no precomputation
- 📈 Scalable — TigerGraph handles billions of edges natively

**Future Roadmap:**
| Feature | Approach |
|---------|----------|
| Real-time edge updates | TigerGraph streaming ingestion |
| A/B testing scoring weights | Environment variable tuning |
| Product images + metadata | Extended Product vertex |
| Category drill-down filters | GSQL filter parameters |
| User login + persistent graph | Auth layer + persistent data |
| Mobile app | React Native + same backend |

**Bottom Line:**
> GraphSense demonstrates that graph-native thinking produces recommendations that are faster, more explainable, and more human — because real influence flows through relationships, not statistics.

---

## SLIDE DESIGN NOTES

**Recommended Tools:** Canva, Pitch.com, or Google Slides
**Color Palette:**
- Background: #080c14 (deep navy)
- Primary: #6366f1 (indigo)
- Accent 1: #10b981 (emerald)
- Accent 2: #f59e0b (amber)
- Text: #f1f5f9 (off-white)

**Fonts:**
- Headings: Syne Bold (free on Google Fonts)
- Body: DM Sans Regular

**Consistent elements per slide:**
- Top-left: GraphSense logo (small)
- Bottom: slide number + "Powered by TigerGraph"
- Section label badge (top-right, e.g. "Architecture")

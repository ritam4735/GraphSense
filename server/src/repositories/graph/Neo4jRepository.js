const GraphRepository = require('./GraphRepository');
const neo4jConnection = require('../../database/neo4j/connection');
const logger = require('../../utils/logger');

class Neo4jRepository extends GraphRepository {
  /**
   * Helper to run queries
   */
  async _runQuery(query, params = {}) {
    const driver = neo4jConnection.getDriver();
    const session = driver.session();
    try {
      const result = await session.run(query, params);
      return result.records;
    } catch (error) {
      logger.error('Neo4j Query Error:', { error: error.message, query });
      throw error;
    } finally {
      await session.close();
    }
  }

  /**
   * Domain-agnostic multi-hop recommendation query.
   * Currently maps to User -> Product for GraphSense demo compatibility,
   * but uses generic Cypher UNION ALL for flexibility.
   */
  async recommendEntities(entityId, limit = 10) {
    const query = `
      MATCH (u:User {userId: $entityId})
      
      // Get set of already interacted items to exclude
      OPTIONAL MATCH (u)-[:BOUGHT|VIEWED]->(exclude:Product)
      WITH u, collect(DISTINCT exclude.productId) as excludedIds

      // Subquery to evaluate different scoring paths
      CALL {
        WITH u, excludedIds
        // Hop 1: Friends bought (+3.0)
        MATCH (u)-[:FOLLOWS]->(:User)-[:BOUGHT]->(p:Product)
        WHERE NOT p.productId IN excludedIds
        RETURN p, 3.0 AS baseScore, "Bought by friends" AS reason
        
        UNION ALL
        
        WITH u, excludedIds
        // Hop 2: Similar to viewed (+2.0 * similarity)
        MATCH (u)-[:VIEWED]->(:Product)-[sim:SIMILAR_TO]-(p:Product)
        WHERE NOT p.productId IN excludedIds
        RETURN p, 2.0 * coalesce(sim.similarity_score, 1.0) AS baseScore, "Similar to viewed" AS reason
        
        UNION ALL
        
        WITH u, excludedIds
        // Hop 3: Friends of friends bought (+1.0)
        // LIMIT applied inside subquery to prevent super-node explosion
        MATCH (u)-[:FOLLOWS]->(:User)-[:FOLLOWS]->(fof:User)
        WHERE u <> fof
        WITH fof, excludedIds LIMIT 50
        MATCH (fof)-[:BOUGHT]->(p:Product)
        WHERE NOT p.productId IN excludedIds
        RETURN p, 1.0 AS baseScore, "Extended network" AS reason
      }

      // Aggregate scores per product
      WITH p, sum(baseScore) + ((coalesce(p.rating, 3.0) - 3.0) * 0.3) AS finalScore, collect(reason)[0] as topReason
      RETURN 
        p.productId AS productId, 
        p.name AS name, 
        p.price AS price, 
        p.rating AS rating, 
        round(finalScore * 100) / 100.0 AS score, 
        topReason AS reason
      ORDER BY score DESC
      LIMIT toInteger($limit)
    `;

    const records = await this._runQuery(query, { entityId, limit });
    return records.map(r => ({
      productId: r.get('productId'),
      name: r.get('name'),
      price: r.get('price'),
      rating: r.get('rating'),
      score: r.get('score'),
      reason: r.get('reason')
    }));
  }

  async getSimilarEntities(entityId, limit = 5) {
    const query = `
      MATCH (u:User {userId: $entityId})-[:BOUGHT]->(p:Product)<-[:BOUGHT]-(other:User)
      WHERE u <> other
      WITH other, count(p) AS sharedProducts
      RETURN other.userId AS userId, other.name AS name, sharedProducts AS score
      ORDER BY score DESC
      LIMIT toInteger($limit)
    `;
    const records = await this._runQuery(query, { entityId, limit });
    return records.map(r => ({
      userId: r.get('userId'),
      name: r.get('name'),
      score: r.get('score').toNumber()
    }));
  }

  async getTrendingEntities(limit = 10) {
    const query = `
      MATCH ()-[b:BOUGHT]->(p:Product)
      WITH p, count(b) AS count
      RETURN p.productId AS productId, p.name AS name, p.price AS price, count
      ORDER BY count DESC
      LIMIT toInteger($limit)
    `;
    const records = await this._runQuery(query, { limit });
    return records.map(r => ({
      productId: r.get('productId'),
      name: r.get('name'),
      price: r.get('price'),
      count: r.get('count').toNumber()
    }));
  }

  async getEntityGraph(entityId) {
    const query = `
      MATCH (start:User {userId: $entityId})
      
      // Get immediate follows
      OPTIONAL MATCH (start)-[f:FOLLOWS]->(friend:User)
      WITH start, collect({from: start.userId, to: friend.userId, type: "follows"}) AS followEdges, collect(friend) AS friends
      
      // Get purchases
      OPTIONAL MATCH (start)-[b:BOUGHT]->(prod:Product)
      OPTIONAL MATCH (prod)-[bt:BELONGS_TO]->(cat:Category)
      WITH start, followEdges, friends, 
           collect({from: start.userId, to: prod.productId, type: "bought"}) AS buyEdges, 
           collect(prod) AS products,
           collect({from: prod.productId, to: cat.categoryId, type: "belongs_to"}) AS catEdges,
           collect(cat) AS categories
      
      // Get views (limit to 3 for viz readability)
      OPTIONAL MATCH (start)-[v:VIEWED]->(viewedProd:Product)
      WITH start, followEdges, friends, buyEdges, products, catEdges, categories,
           collect(viewedProd)[0..3] AS viewedProducts
      
      RETURN start, friends, products, categories, viewedProducts, followEdges, buyEdges, catEdges
    `;

    const records = await this._runQuery(query, { entityId });
    if (records.length === 0) return { nodes: [], edges: [] };

    const r = records[0];
    const nodesMap = new Map();
    const edgesMap = new Map();
    let edgeCounter = 0;

    const addNode = (id, label, type) => {
      if (id && label && !nodesMap.has(id)) {
        nodesMap.set(id, { id, label, type });
      }
    };

    const addEdge = (from, to, label) => {
      if (from && to) {
        edgesMap.set(`${from}-${to}-${label}`, { id: edgeCounter++, from, to, label });
      }
    };

    // Parse start node
    const startNode = r.get('start').properties;
    addNode(startNode.userId, startNode.name, 'User');

    // Parse friends
    r.get('friends').forEach(f => { if(f) addNode(f.properties.userId, f.properties.name, 'User'); });
    r.get('followEdges').forEach(e => { if(e.from) addEdge(e.from, e.to, 'follows'); });

    // Parse products
    r.get('products').forEach(p => { if(p) addNode(p.properties.productId, p.properties.name, 'Product'); });
    r.get('buyEdges').forEach(e => { if(e.from) addEdge(e.from, e.to, 'bought'); });

    // Parse categories
    r.get('categories').forEach(c => { if(c) addNode(c.properties.categoryId, c.properties.name, 'Category'); });
    r.get('catEdges').forEach(e => { if(e.from) addEdge(e.from, e.to, 'belongs_to'); });

    // Parse viewed
    r.get('viewedProducts').forEach(p => {
      if(p) {
        addNode(p.properties.productId, p.properties.name, 'Product');
        addEdge(startNode.userId, p.properties.productId, 'viewed');
      }
    });

    return {
      nodes: Array.from(nodesMap.values()),
      edges: Array.from(edgesMap.values())
    };
  }
}

module.exports = new Neo4jRepository();

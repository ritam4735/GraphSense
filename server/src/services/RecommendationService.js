const neo4jRepo = require('../repositories/graph/Neo4jRepository');

class RecommendationService {
  constructor(graphRepository) {
    this.repo = graphRepository;
  }

  async getRecommendations(entityId, limit = 10) {
    return this.repo.recommendEntities(entityId, limit);
  }

  async getSimilar(entityId, limit = 5) {
    return this.repo.getSimilarEntities(entityId, limit);
  }

  async getTrending(limit = 10) {
    return this.repo.getTrendingEntities(limit);
  }

  async getGraph(entityId) {
    return this.repo.getEntityGraph(entityId);
  }
}

// Injecting Neo4j dependency. Could be swapped with TigerGraphRepository later.
module.exports = new RecommendationService(neo4jRepo);

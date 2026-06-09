const recommendationService = require('../services/RecommendationService');
const logger = require('../utils/logger');

class RecommendationController {
  async getRecommendations(req, res) {
    const { userId } = req.params;
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : 10;
    
    logger.info(`Fetching recommendations for ${userId}`);
    const recommendations = await recommendationService.getRecommendations(userId, limit);
    
    res.json({
      userId,
      count: recommendations.length,
      recommendations,
      source: "neo4j"
    });
  }

  async getSimilar(req, res) {
    const { userId } = req.params;
    const topK = req.query.topK ? parseInt(req.query.topK, 10) : 5;
    
    const similarUsers = await recommendationService.getSimilar(userId, topK);
    res.json({ userId, similarUsers, source: "neo4j" });
  }

  async getTrending(req, res) {
    const topK = req.query.topK ? parseInt(req.query.topK, 10) : 10;
    const trending = await recommendationService.getTrending(topK);
    res.json({ trending, days: 30, source: "neo4j" });
  }

  async getGraph(req, res) {
    const { userId } = req.params;
    const graphData = await recommendationService.getGraph(userId);
    res.json({ userId, ...graphData, source: "neo4j" });
  }
}

module.exports = new RecommendationController();

/**
 * @interface
 * GraphRepository defines the standard interface for graph operations,
 * completely decoupling the recommendation engine from specific databases
 * (e.g. Neo4j, TigerGraph, Memgraph).
 */
class GraphRepository {
  /**
   * Retrieves a multi-hop recommendation for a specific entity.
   * @param {string} entityId - The starting node ID.
   * @param {number} limit - Max number of recommendations to return.
   * @returns {Promise<Array<{entityId: string, name: string, score: number, reason: string}>>}
   */
  async recommendEntities(entityId, limit = 10) {
    throw new Error('Method not implemented.');
  }

  /**
   * Finds similar entities based on structural similarity (e.g. shared relationships).
   * @param {string} entityId - The target entity ID.
   * @param {number} limit - Max results.
   * @returns {Promise<Array<{entityId: string, name: string, score: number}>>}
   */
  async getSimilarEntities(entityId, limit = 5) {
    throw new Error('Method not implemented.');
  }

  /**
   * Retrieves the top globally trending entities.
   * @param {number} limit - Max results.
   * @returns {Promise<Array<{entityId: string, name: string, count: number}>>}
   */
  async getTrendingEntities(limit = 10) {
    throw new Error('Method not implemented.');
  }

  /**
   * Fetches the local graph neighborhood around an entity for visualization.
   * @param {string} entityId - Target entity.
   * @returns {Promise<{nodes: Array, edges: Array}>}
   */
  async getEntityGraph(entityId) {
    throw new Error('Method not implemented.');
  }
}

module.exports = GraphRepository;

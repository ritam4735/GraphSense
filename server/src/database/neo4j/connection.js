const neo4j = require('neo4j-driver');
const logger = require('../../utils/logger');

class Neo4jConnection {
  constructor() {
    this.driver = null;
  }

  /**
   * Initializes the Neo4j driver as a singleton.
   */
  async connect() {
    if (this.driver) return this.driver;

    const uri = process.env.NEO4J_URI || 'neo4j+s://localhost:7687';
    const user = process.env.NEO4J_USER || 'neo4j';
    const password = process.env.NEO4J_PASSWORD || 'password';

    try {
      this.driver = neo4j.driver(uri, neo4j.auth.basic(user, password), {
        maxConnectionPoolSize: parseInt(process.env.NEO4J_POOL_SIZE || '50', 10),
        connectionAcquisitionTimeout: parseInt(process.env.NEO4J_TIMEOUT || '20000', 10),
      });

      // Verify connection
      const serverInfo = await this.driver.getServerInfo();
      logger.info(`✅ Connected to Neo4j at ${serverInfo.address}`);
      return this.driver;
    } catch (error) {
      logger.error('❌ Failed to connect to Neo4j:', error.message);
      throw error;
    }
  }

  /**
   * Returns the initialized driver.
   * @returns {import('neo4j-driver').Driver}
   */
  getDriver() {
    if (!this.driver) {
      throw new Error('Neo4j driver is not initialized. Call connect() first.');
    }
    return this.driver;
  }

  /**
   * Graceful shutdown of the Neo4j driver.
   */
  async close() {
    if (this.driver) {
      await this.driver.close();
      logger.info('Neo4j connection closed gracefully.');
      this.driver = null;
    }
  }

  /**
   * Checks database connectivity for health endpoints.
   */
  async checkHealth() {
    try {
      if (!this.driver) return false;
      await this.driver.verifyConnectivity();
      return true;
    } catch (error) {
      logger.error('Health check failed:', error.message);
      return false;
    }
  }
}

// Export singleton instance
module.exports = new Neo4jConnection();

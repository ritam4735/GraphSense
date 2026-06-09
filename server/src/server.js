require('dotenv').config();
const app = require('./app');
const neo4jConnection = require('./database/neo4j/connection');
const logger = require('./utils/logger');

const PORT = process.env.PORT || 4000;

async function startServer() {
  try {
    await neo4jConnection.connect();
    
    const server = app.listen(PORT, () => {
      logger.info(`✅ GraphSense Neo4j API running on port ${PORT}`);
    });

    // Graceful shutdown
    const gracefulShutdown = async () => {
      logger.info('Shutting down server...');
      server.close(async () => {
        await neo4jConnection.close();
        logger.info('Server closed.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);

  } catch (error) {
    logger.error('Failed to start server', error);
    process.exit(1);
  }
}

startServer();

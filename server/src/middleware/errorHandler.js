const logger = require('../utils/logger');
const { ZodError } = require('zod');

function errorHandler(err, req, res, next) {
  if (err instanceof ZodError) {
    logger.warn('Validation error', { path: req.path, errors: err.errors });
    return res.status(400).json({
      error: 'Validation Error',
      details: err.errors.map(e => `${e.path.join('.')}: ${e.message}`)
    });
  }

  logger.error('Unhandled Server Error', { error: err.message, stack: err.stack, path: req.path });
  
  const status = err.status || 500;
  const message = process.env.NODE_ENV === 'production' 
    ? 'Internal Server Error' 
    : err.message;

  res.status(status).json({
    error: message,
    source: 'neo4j'
  });
}

module.exports = errorHandler;

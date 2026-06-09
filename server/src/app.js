require('express-async-errors'); // Patch express to handle async errors natively
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const neo4jConnection = require('./database/neo4j/connection');
const recommendationController = require('./controllers/RecommendationController');
const { validate, userIdSchema, topKSchema } = require('./middleware/validation');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST']
}));
app.use(express.json());

// Rate Limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(apiLimiter);

// Health Check
app.get('/health', async (req, res) => {
  const dbHealth = await neo4jConnection.checkHealth();
  if (dbHealth) {
    res.json({ status: 'ok', database: 'connected', driver: 'neo4j' });
  } else {
    res.status(503).json({ status: 'error', database: 'disconnected', driver: 'neo4j' });
  }
});

// Routes
app.get('/recommend/:userId', validate(userIdSchema), (req, res) => recommendationController.getRecommendations(req, res));
app.get('/similar/:userId', validate(userIdSchema), (req, res) => recommendationController.getSimilar(req, res));
app.get('/trending', validate(topKSchema), (req, res) => recommendationController.getTrending(req, res));
app.get('/graph/:userId', validate(userIdSchema), (req, res) => recommendationController.getGraph(req, res));

// Global Error Handler
app.use(errorHandler);

module.exports = app;

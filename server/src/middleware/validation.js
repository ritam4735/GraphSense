const { z } = require('zod');

// Middleware factory
const validate = (schema) => (req, res, next) => {
  try {
    schema.parse({
      body: req.body,
      query: req.query,
      params: req.params,
    });
    next();
  } catch (error) {
    next(error); // Pass to global error handler
  }
};

// Schemas
const userIdSchema = z.object({
  params: z.object({
    userId: z.string().min(1).max(100)
  }),
  query: z.object({
    limit: z.string().regex(/^\\d+$/).optional(),
    topK: z.string().regex(/^\\d+$/).optional()
  }).optional()
});

const topKSchema = z.object({
  query: z.object({
    topK: z.string().regex(/^\\d+$/).optional(),
    days: z.string().regex(/^\\d+$/).optional()
  }).optional()
});

module.exports = {
  validate,
  userIdSchema,
  topKSchema
};

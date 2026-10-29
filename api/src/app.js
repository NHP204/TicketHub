import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { readFileSync } from 'node:fs';
import swaggerUi from 'swagger-ui-express';
import { parse } from 'yaml';
import { createLogger } from './utils/logger.js';
import { notFound } from './middlewares/not-found.js';
import { errorHandler } from './middlewares/error-handler.js';

const openApiSpec = parse(readFileSync(new URL('../docs/openapi.yaml', import.meta.url), 'utf8'));

// routers: mảng express.Router, gắn dưới /api/v1.
export function createApp(deps = {}) {
  const { corsOrigin, logger = createLogger(process.env.NODE_ENV), routers = [] } = deps;
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: corsOrigin, credentials: true }));
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());

  app.get('/api/v1/health', (_req, res) => {
    res.status(200).json({ success: true, data: { status: 'ok' } });
  });

  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openApiSpec));

  for (const router of routers) {
    app.use('/api/v1', router);
  }

  app.use(notFound);
  app.use(errorHandler(logger));

  return app;
}

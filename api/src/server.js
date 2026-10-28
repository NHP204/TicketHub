import { loadEnv } from './config/env.js';
import { createPool } from './config/db.js';
import { buildContainer } from './container.js';
import { createApp } from './app.js';

const env = loadEnv();
const pool = createPool(env.DATABASE_URL);
const { logger, routers } = buildContainer({ env, pool });
const app = createApp({ corsOrigin: env.CORS_ORIGIN, logger, routers });

app.listen(env.PORT, () => {
  console.log(`TicketHub API (${env.NODE_ENV}) listening on port ${env.PORT}`);
});

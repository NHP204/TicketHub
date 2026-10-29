import { schedule } from 'node-cron';
import { loadEnv } from './config/env.js';
import { createPool } from './config/db.js';
import { buildContainer } from './container.js';
import { createApp } from './app.js';
import { releaseExpired } from './jobs/release-expired.job.js';

const env = loadEnv();
const pool = createPool(env.DATABASE_URL);
const { logger, routers } = buildContainer({ env, pool });
const app = createApp({ corsOrigin: env.CORS_ORIGIN, logger, routers });

// Mỗi phút trả ghế của booking hết hạn. Lỗi chỉ được log, không làm sập server.
schedule('* * * * *', async () => {
  try {
    const result = await releaseExpired(pool);
    if (result.bookings > 0) {
      logger.info('Released expired bookings', result);
    }
  } catch (err) {
    logger.error(`Release expired bookings failed: ${err.message}`, { stack: err.stack });
  }
});

app.listen(env.PORT, () => {
  console.log(`TicketHub API (${env.NODE_ENV}) listening on port ${env.PORT}`);
});

import { loadEnv } from './config/env.js';
import { createApp } from './app.js';

const env = loadEnv();
const app = createApp({ corsOrigin: env.CORS_ORIGIN });

app.listen(env.PORT, () => {
  console.log(`TicketHub API (${env.NODE_ENV}) listening on port ${env.PORT}`);
});

import { createLogger } from './utils/logger.js';

// Nơi duy nhất khởi tạo và nối dependency. `pool` sẽ được dùng khi có repository/service.
export function buildContainer({ env, pool: _pool }) {
  const logger = createLogger(env.NODE_ENV);
  return { logger };
}

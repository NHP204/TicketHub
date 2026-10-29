import { Router } from 'express';
import { authorize } from '../../middlewares/authorize.js';
import { validate } from '../../middlewares/validate.js';
import { eventIdParamsSchema } from '../events/events.schemas.js';

// requireAuth: middleware authenticate đã cấu hình secret, nhận từ container.
// Quyền chủ sự kiện của /organizer/events/:id/stats do StatsService kiểm tra.
export function createStatsRouter(statsController, requireAuth) {
  const router = Router();

  router.get(
    '/organizer/stats',
    requireAuth,
    authorize('ORGANIZER'),
    statsController.listOrganizerStats,
  );
  router.get(
    '/organizer/events/:id/stats',
    requireAuth,
    validate({ params: eventIdParamsSchema }),
    statsController.getEventStats,
  );
  router.get('/admin/stats', requireAuth, authorize('ADMIN'), statsController.getAdminStats);
  return router;
}

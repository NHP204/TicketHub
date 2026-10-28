import { Router } from 'express';
import { authorize } from '../../middlewares/authorize.js';
import { validate } from '../../middlewares/validate.js';
import {
  createEventSchema,
  eventIdParamsSchema,
  listEventsQuerySchema,
  updateEventSchema,
} from './events.schemas.js';

// Có header Authorization thì xác thực như bình thường (token sai → 401);
// không có thì đi tiếp với req.user undefined.
function optionalAuth(requireAuth) {
  return (req, res, next) => {
    if (req.headers.authorization === undefined) return next();
    return requireAuth(req, res, next);
  };
}

// requireAuth: middleware authenticate đã cấu hình secret, nhận từ container.
// Quyền sở hữu sự kiện do EventService kiểm tra, route chỉ kiểm tra role.
export function createEventsRouter(eventsController, requireAuth) {
  const router = Router();
  const requireOrganizer = [requireAuth, authorize('ORGANIZER')];
  const params = validate({ params: eventIdParamsSchema });

  router.get('/events', validate({ query: listEventsQuerySchema }), eventsController.listPublished);
  router.get('/events/:id', optionalAuth(requireAuth), params, eventsController.getById);
  router.get('/events/:id/seats', optionalAuth(requireAuth), params, eventsController.getSeatMap);
  router.get('/organizer/events', requireOrganizer, eventsController.listMine);

  router.post(
    '/events',
    requireOrganizer,
    validate({ body: createEventSchema }),
    eventsController.create,
  );
  router.patch(
    '/events/:id',
    requireAuth,
    validate({ params: eventIdParamsSchema, body: updateEventSchema }),
    eventsController.update,
  );
  router.post('/events/:id/publish', requireAuth, params, eventsController.publish);
  router.post('/events/:id/cancel', requireAuth, params, eventsController.cancel);
  return router;
}

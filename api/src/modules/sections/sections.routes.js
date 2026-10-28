import { Router } from 'express';
import { validate } from '../../middlewares/validate.js';
import { eventIdParamsSchema } from '../events/events.schemas.js';
import {
  createSectionSchema,
  sectionIdParamsSchema,
  updateSectionSchema,
} from './sections.schemas.js';

// requireAuth: middleware authenticate đã cấu hình secret, nhận từ container.
// Quyền chủ sự kiện do SectionService kiểm tra.
export function createSectionsRouter(sectionsController, requireAuth) {
  const router = Router();

  router.post(
    '/events/:id/sections',
    requireAuth,
    validate({ params: eventIdParamsSchema, body: createSectionSchema }),
    sectionsController.create,
  );
  router.patch(
    '/sections/:id',
    requireAuth,
    validate({ params: sectionIdParamsSchema, body: updateSectionSchema }),
    sectionsController.update,
  );
  router.delete(
    '/sections/:id',
    requireAuth,
    validate({ params: sectionIdParamsSchema }),
    sectionsController.remove,
  );
  return router;
}

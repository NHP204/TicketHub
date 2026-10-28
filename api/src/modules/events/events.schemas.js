import { z } from 'zod';

const MAX_PAGE_SIZE = 50;

// Quy tắc thời gian (startTime ở tương lai, endTime > startTime) nằm ở EventService,
// vì khi PATCH một phần phải so với giá trị đang lưu.
const eventFields = {
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().min(1).max(5000),
  venue: z.string().trim().min(1).max(200),
  startTime: z.iso.datetime({ offset: true }),
  endTime: z.iso.datetime({ offset: true }),
};

function hasAnyField(value) {
  return Object.values(value).some((v) => v !== undefined);
}

export const createEventSchema = z.object(eventFields);

export const updateEventSchema = z
  .object(Object.fromEntries(Object.entries(eventFields).map(([k, s]) => [k, s.optional()])))
  .refine(hasAnyField, { message: 'Cần ít nhất một trường để cập nhật' });

export const listEventsQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  from: z.iso.datetime({ offset: true }).optional(),
  to: z.iso.datetime({ offset: true }).optional(),
  sort: z.enum(['startTime', 'createdAt', 'title']).default('startTime'),
  order: z.enum(['asc', 'desc']).default('asc'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(10),
});

// Loại ảnh banner được nhận → đuôi file trong storage key.
export const BANNER_IMAGE_TYPES = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export const BANNER_MAX_BYTES = 2 * 1024 * 1024;

export const eventIdParamsSchema = z.object({
  id: z.uuid(),
});
